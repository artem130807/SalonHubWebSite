import type { INotifier, NotificationPayload } from "@/server/application/ports";

type UserSocket = { userId: string; send: (data: string) => void };
type ChatSocket = { userId: string; conversationId: string | null; send: (data: string) => void };

export class RealtimeHub implements INotifier {
  private readonly users = new Set<UserSocket>();
  private readonly chats = new Set<ChatSocket>();

  addUser(socket: UserSocket) {
    this.users.add(socket);
    return () => this.users.delete(socket);
  }

  addChat(socket: ChatSocket) {
    this.chats.add(socket);
    return () => this.chats.delete(socket);
  }

  notifyUser(userId: string, payload: NotificationPayload) {
    const body = JSON.stringify({ target: "ReceiveNotification", arguments: [payload] });
    for (const socket of this.users) {
      if (socket.userId === userId) socket.send(body);
    }
  }

  notifyConversation(conversationId: string, target: string, payload: unknown) {
    const body = JSON.stringify({ target, arguments: [payload] });
    for (const socket of this.chats) {
      if (socket.conversationId === conversationId) socket.send(body);
    }
  }
}

export const realtimeHub = new RealtimeHub();
