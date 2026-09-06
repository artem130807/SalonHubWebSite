"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { removeById, upsertById } from "@/lib/chat-messages";

type Conversation = {
  id: string;
  participant1Id: string;
  participant2Id: string;
  participant1Name: string;
  participant2Name: string;
};

type ChatMessage = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  createdAt: string;
};

export function ChatPanel({ userId }: { userId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [peerId, setPeerId] = useState("");
  const [error, setError] = useState("");

  async function loadConversations() {
    const response = await apiFetch("/api/conversations");
    const payload = await response.json();
    if (response.ok) setConversations(payload);
  }

  async function loadMessages(id: string) {
    const response = await apiFetch(`/api/conversations/${id}/messages`);
    const payload = await response.json();
    if (response.ok) setMessages(payload);
  }

  useEffect(() => {
    void loadConversations();
  }, []);

  useEffect(() => {
    if (!active) return;
    void loadMessages(active);
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/chatHub`);
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "JoinToChat", chatName: `conversation_${active}` }));
    };
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as {
          target?: string;
          arguments?: Array<ChatMessage & { id?: string }>;
        };
        if (payload.target === "ReceiveMessage" && payload.arguments?.[0]) {
          const incoming = payload.arguments[0];
          setMessages((current) => upsertById(current, incoming));
        }
        if (payload.target === "MessageDeleted") {
          const deletedId = payload.arguments?.[0]?.id;
          if (deletedId) setMessages((current) => removeById(current, deletedId));
        }
      } catch {
        /* ignore */
      }
    };
    return () => socket.close();
  }, [active]);

  async function createConversation() {
    setError("");
    const response = await apiFetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant2Id: peerId }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать диалог");
      return;
    }
    setPeerId("");
    await loadConversations();
    setActive(payload.id);
  }

  async function send() {
    if (!active || !draft.trim()) return;
    const response = await apiFetch(`/api/conversations/${active}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Не удалось отправить");
      return;
    }
    setDraft("");
    if (payload.id) {
      setMessages((current) => upsertById(current, payload));
    }
  }

  function otherName(item: Conversation) {
    return item.participant1Id === userId ? item.participant2Name : item.participant1Name;
  }

  return (
    <div className="max-w-5xl grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 min-h-[480px]">
      <aside className="bg-card border border-outline rounded-2xl p-4 space-y-3">
        <h2 className="font-bold">Диалоги</h2>
        <div className="flex gap-2">
          <input
            value={peerId}
            onChange={(e) => setPeerId(e.target.value)}
            placeholder="ID собеседника"
            className="w-full bg-surfaceVariant border border-outline rounded-xl px-3 py-2 text-sm"
          />
          <button type="button" onClick={createConversation} className="bg-primary text-onPrimary rounded-xl px-3 text-sm">
            +
          </button>
        </div>
        {conversations.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item.id)}
            className={`block w-full text-left px-3 py-2 rounded-xl ${active === item.id ? "bg-primary/10 text-primary" : "hover:bg-surfaceVariant"}`}
          >
            {otherName(item)}
          </button>
        ))}
      </aside>
      <section className="bg-card border border-outline rounded-2xl p-4 flex flex-col">
        <h1 className="text-2xl font-serif font-bold mb-3">Чат</h1>
        {error && <p className="text-error text-sm mb-2">{error}</p>}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {!active && <p className="text-onSurfaceVariant">Выберите диалог</p>}
          {messages.map((message) => (
            <div key={message.id} className={message.senderId === userId ? "text-right" : ""}>
              <p className="text-xs text-onSurfaceVariant">{message.senderName}</p>
              <p className="inline-block bg-surfaceVariant rounded-xl px-3 py-2">{message.body}</p>
            </div>
          ))}
        </div>
        {active && (
          <div className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 bg-surfaceVariant border border-outline rounded-xl px-3 py-2"
              placeholder="Сообщение"
            />
            <button type="button" onClick={send} className="bg-primary text-onPrimary rounded-xl px-4">
              Отправить
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
