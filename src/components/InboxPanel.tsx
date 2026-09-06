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
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Не удалось загрузить уведомления");
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
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-2">Уведомления</h1>
      </div>
      {error && <p className="text-sm font-medium text-error bg-error/10 px-4 py-3 rounded-xl">{error}</p>}
      
      {items.length === 0 && (
        <div className="bg-surface/50 border border-outline/50 rounded-3xl p-8 text-center">
          <p className="text-lg text-onSurfaceVariant">У вас пока нет уведомлений.</p>
        </div>
      )}
      
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className={`border rounded-3xl p-6 shadow-sm transition-colors ${!item.readAt ? "bg-surface border-primary/30" : "bg-surface/50 border-outline"}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className={`text-lg ${!item.readAt ? "font-bold text-onBackground" : "text-onSurface"}`}>{item.content}</p>
                <p className="text-sm text-onSurfaceVariant mt-2">{new Date(item.createdAt).toLocaleString("ru-RU")}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                {!item.readAt && (
                  <button type="button" className="px-4 py-2 rounded-xl text-sm font-bold bg-primary/10 text-primary hover:bg-primary hover:text-onPrimary transition-colors" onClick={() => markRead(item.id)}>
                    Прочитано
                  </button>
                )}
                <button type="button" className="px-4 py-2 rounded-xl text-sm font-bold bg-error/10 text-error hover:bg-error hover:text-white transition-colors" onClick={() => remove(item.id)}>
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
