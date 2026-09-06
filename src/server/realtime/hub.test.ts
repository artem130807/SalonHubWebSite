import { describe, expect, it, vi } from "vitest";
import { RealtimeHub } from "@/server/realtime/hub";

describe("RealtimeHub", () => {
  it("delivers ReceiveNotification only to the target user", () => {
    const hub = new RealtimeHub();
    const alice = vi.fn();
    const bob = vi.fn();
    hub.addUser({ userId: "a", send: alice });
    hub.addUser({ userId: "b", send: bob });
    hub.notifyUser("a", { Id: "1", Message: "hi", Timestamp: "2026-09-03T08:00:00.000Z" });
    expect(alice).toHaveBeenCalledTimes(1);
    expect(bob).not.toHaveBeenCalled();
    expect(JSON.parse(alice.mock.calls[0][0]).target).toBe("ReceiveNotification");
  });

  it("stops delivering after unsubscribe", () => {
    const hub = new RealtimeHub();
    const send = vi.fn();
    const remove = hub.addUser({ userId: "a", send });
    remove();
    hub.notifyUser("a", { Id: "1", Message: "hi", Timestamp: "t" });
    expect(send).not.toHaveBeenCalled();
  });

  it("delivers chat events only to sockets joined to that conversation", () => {
    const hub = new RealtimeHub();
    const inChat = vi.fn();
    const other = vi.fn();
    hub.addChat({ userId: "a", conversationId: "c1", send: inChat });
    hub.addChat({ userId: "b", conversationId: "c2", send: other });
    hub.notifyConversation("c1", "ReceiveMessage", { body: "ping" });
    expect(inChat).toHaveBeenCalledTimes(1);
    expect(other).not.toHaveBeenCalled();
  });
});
