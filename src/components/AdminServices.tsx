"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/client-api";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
};

export function AdminServices({ name, salonId }: { name: string; salonId: string }) {
  const [items, setItems] = useState<Service[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const response = await apiFetch(`/api/salons/${salonId}/services`);
    const payload = await response.json();
    if (response.ok) setItems(payload);
  }

  useEffect(() => {
    void load();
  }, [salonId]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await apiFetch(`/api/salons/${salonId}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        durationMinutes: Number(form.get("durationMinutes")),
        price: Number(form.get("price")),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? "Ошибка");
    else {
      event.currentTarget.reset();
      await load();
    }
  }

  return (
    <DashboardLayout role="admin" name={name}>
      <div className="max-w-3xl space-y-6">
        <h1 className="text-3xl font-serif font-bold">Услуги</h1>
        {error && <p className="text-error text-sm">{error}</p>}
        <form className="grid grid-cols-1 sm:grid-cols-4 gap-3" onSubmit={create}>
          <input name="name" required placeholder="Название" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          <input name="durationMinutes" type="number" required placeholder="Минуты" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          <input name="price" type="number" required placeholder="Цена" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          <button className="bg-primary text-onPrimary rounded-xl px-4 py-2">Добавить</button>
        </form>
        {items.map((item) => (
          <div key={item.id} className="bg-card border border-outline rounded-2xl p-4 flex justify-between">
            <div>
              <p className="font-bold">{item.name}</p>
              <p className="text-sm text-onSurfaceVariant">
                {item.durationMinutes} мин · {item.price} ₽
              </p>
            </div>
            <span className="text-sm">{item.isActive ? "Активна" : "Скрыта"}</span>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
