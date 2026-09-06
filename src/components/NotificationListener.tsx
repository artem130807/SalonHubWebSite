"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

export function NotificationListener() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/notificationHub`);
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data)) as {
          target?: string;
          arguments?: { Message?: string }[];
        };
        if (payload.target === "ReceiveNotification") {
          setToast(payload.arguments?.[0]?.Message ?? "Новое уведомление");
        }
      } catch {
        /* ignore */
      }
    };
    return () => socket.close();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    void apiFetch("/api/inbox/unread");
  }, [toast]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 max-w-sm rounded-2xl border border-outline bg-card px-4 py-3 shadow-lg">
      <p className="text-sm font-medium">{toast}</p>
    </div>
  );
}
