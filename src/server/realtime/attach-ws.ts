import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { ACCESS_COOKIE } from "@/lib/constants";
import { getApp } from "@/server/infrastructure/get-app";
import { realtimeHub } from "@/server/realtime/hub";

function readCookie(header: string | undefined, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function tokenFromRequest(request: IncomingMessage) {
  const url = new URL(request.url ?? "/", "http://localhost");
  return (
    url.searchParams.get("access_token") ??
    readCookie(request.headers.cookie, ACCESS_COOKIE) ??
    readCookie(request.headers.cookie, "session")
  );
}

async function userIdFromRequest(request: IncomingMessage) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  const payload = await getApp().tokens.verify(token);
  return payload?.userId ?? null;
}

export function attachRealtime(server: import("node:http").Server) {
  const notifications = new WebSocketServer({ noServer: true });
  const chats = new WebSocketServer({ noServer: true });

  notifications.on("connection", (socket, userId: string) => {
    const remove = realtimeHub.addUser({
      userId,
      send: (data) => socket.readyState === socket.OPEN && socket.send(data),
    });
    socket.on("close", remove);
  });

  chats.on("connection", (socket: WebSocket, userId: string) => {
    const state = { userId, conversationId: null as string | null, send: (data: string) => socket.readyState === socket.OPEN && socket.send(data) };
    const remove = realtimeHub.addChat(state);

    socket.on("message", async (raw) => {
      try {
        const payload = JSON.parse(String(raw)) as {
          type?: string;
          chatName?: string;
          message?: string;
        };
        if (payload.type === "JoinToChat") {
          const id = parseConversation(payload.chatName);
          if (!id) return socket.send(JSON.stringify({ error: "Invalid chat name" }));
          const result = await getApp().chat.get(userId, id);
          if (!result.ok) return socket.send(JSON.stringify({ error: result.error }));
          state.conversationId = id;
          socket.send(JSON.stringify({ target: "Joined", arguments: [id] }));
          return;
        }
        if (payload.type === "SendMessage") {
          const id = parseConversation(payload.chatName) ?? state.conversationId;
          if (!id) return socket.send(JSON.stringify({ error: "Chat name is required" }));
          const result = await getApp().chat.send(userId, id, payload.message ?? "");
          if (!result.ok) return socket.send(JSON.stringify({ error: result.error }));
        }
      } catch {
        socket.send(JSON.stringify({ error: "Invalid payload" }));
      }
    });
    socket.on("close", remove);
  });

  const emit = server.emit.bind(server);
  server.emit = ((event: string, ...args: unknown[]) => {
    if (event === "upgrade") {
      const request = args[0] as IncomingMessage;
      const socket = args[1] as Duplex;
      const head = (args[2] as Buffer) ?? Buffer.alloc(0);
      const path = new URL(request.url ?? "/", "http://localhost").pathname;
      if (path === "/notificationHub" || path === "/chatHub") {
        void upgradeHub(request, socket, head, path === "/notificationHub" ? notifications : chats);
        return true;
      }
    }
    return emit(event, ...args);
  }) as typeof server.emit;
}

async function upgradeHub(
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  target: WebSocketServer,
) {
  const userId = await userIdFromRequest(request);
  if (!userId) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  target.handleUpgrade(request, socket, head, (ws) => {
    target.emit("connection", ws, userId);
  });
}

function parseConversation(chatName?: string) {
  const name = chatName?.trim() ?? "";
  const prefix = "conversation_";
  if (!name.startsWith(prefix)) return null;
  return name.slice(prefix.length) || null;
}
