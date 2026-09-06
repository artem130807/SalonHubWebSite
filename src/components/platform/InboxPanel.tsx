"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

type InboxItem = {
  id: string;
  content: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

export function InboxPanel() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const response = await apiFetch("/api/inbox");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Не удалось загрузить сообщения");
      return;
    }
    setItems(payload);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markRead(id: string) {
    await apiFetch(`/api/inbox/${id}`, { method: "PATCH" });
    await load();
  }

  async function remove(id: string) {
    await apiFetch(`/api/inbox/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-error">{error}</p>}
      {items.length === 0 && <p className="text-onSurfaceVariant">Сообщений нет</p>}
      {items.map((item) => (
        <div key={item.id} className="bg-card border border-outline rounded-2xl p-4">
          <p className={item.readAt ? "text-onSurfaceVariant" : "font-semibold"}>{item.content}</p>
          <p className="text-xs text-onSurfaceVariant mt-1">
            {new Date(item.createdAt).toLocaleString("ru-RU")} · {item.type}
          </p>
          <div className="flex gap-3 mt-2">
            {!item.readAt && (
              <button type="button" className="text-sm text-primary" onClick={() => markRead(item.id)}>
                Прочитано
              </button>
            )}
            <button type="button" className="text-sm text-error" onClick={() => remove(item.id)}>
              Удалить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
