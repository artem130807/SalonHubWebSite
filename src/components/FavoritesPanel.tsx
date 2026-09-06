"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

type Fav = { id: string; masterId: string; masterName: string; salonName: string };

export function FavoritesPanel({ name }: { name: string }) {
  const [items, setItems] = useState<Fav[]>([]);

  async function load() {
    const response = await apiFetch("/api/subscriptions");
    const payload = await response.json();
    if (response.ok) setItems(payload);
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    await apiFetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-2">Избранные мастера</h1>
        <p className="text-lg text-onSurfaceVariant">{name}</p>
      </div>
      <div className="space-y-4">
        {items.length === 0 && (
          <div className="bg-surface/50 border border-outline/50 rounded-3xl p-8 text-center">
            <p className="text-lg text-onSurfaceVariant">Пока нет избранных мастеров.</p>
            <p className="text-sm text-onSurfaceVariant mt-2">Откройте карточку салона и добавьте мастера в избранное при записи.</p>
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="bg-surface border border-outline rounded-3xl p-6 shadow-sm hover:border-primary/30 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-serif text-lg font-bold shrink-0">
                {item.masterName.slice(0, 1)}
              </div>
              <div>
                <p className="font-bold text-lg">{item.masterName}</p>
                <p className="text-onSurfaceVariant text-sm mt-0.5">{item.salonName}</p>
              </div>
            </div>
            <button type="button" className="px-4 py-2 rounded-xl text-sm font-bold bg-error/10 text-error hover:bg-error hover:text-white transition-colors" onClick={() => remove(item.id)}>
              Удалить
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
