"use client";

import { useEffect } from "react";

export function NotificationListener() {
  useEffect(() => {
    let socket: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${window.location.host}/notificationHub`);
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as {
            target?: string;
            arguments?: { Message?: string }[];
          };
          if (payload.target === "ReceiveNotification") {
            const text = payload.arguments?.[0]?.Message;
            if (text) window.dispatchEvent(new CustomEvent("salonhub:notice", { detail: text }));
          }
        } catch {
          /* ignore malformed frames */
        }
      };
    } catch {
      /* websocket optional in environments without custom server */
    }
    return () => socket?.close();
  }, []);
  return null;
}
