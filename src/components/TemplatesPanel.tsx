"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/client-api";

type Template = {
  id: string;
  name: string;
  days: { id: string; weekday: number; startTime: string; endTime: string }[];
};

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function TemplatesPanel({ name }: { name: string }) {
  const [items, setItems] = useState<Template[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const response = await apiFetch("/api/templates");
    const payload = await response.json();
    if (response.ok) setItems(payload);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const days = Array.from({ length: 7 }, (_, weekday) => {
      const startTime = String(form.get(`start-${weekday}`) ?? "");
      const endTime = String(form.get(`end-${weekday}`) ?? "");
      if (!startTime || !endTime) return null;
      return { weekday, startTime, endTime };
    }).filter(Boolean);
    const response = await apiFetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), days }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Не удалось сохранить шаблон");
      return;
    }
    event.currentTarget.reset();
    await load();
  }

  async function apply(id: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await apiFetch(`/api/templates/${id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: form.get("from"), to: form.get("to") }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? "Не удалось применить шаблон");
    else setError("");
  }

  return (
    <DashboardLayout role="barber" name={name}>
      <div className="max-w-4xl space-y-6">
        <h1 className="text-3xl font-serif font-bold">Недельные шаблоны</h1>
        {error && <p className="text-error text-sm">{error}</p>}
        <form className="bg-card border border-outline rounded-2xl p-5 space-y-3" onSubmit={create}>
          <input name="name" required placeholder="Название" className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WEEKDAYS.map((label, weekday) => (
              <div key={weekday} className="flex items-center gap-2 text-sm">
                <span className="w-8">{label}</span>
                <input name={`start-${weekday}`} type="time" className="bg-surfaceVariant border border-outline rounded-xl px-2 py-1" />
                <input name={`end-${weekday}`} type="time" className="bg-surfaceVariant border border-outline rounded-xl px-2 py-1" />
              </div>
            ))}
          </div>
          <button className="bg-primary text-onPrimary rounded-xl px-4 py-2">Создать</button>
        </form>
        {items.map((item) => (
          <div key={item.id} className="bg-card border border-outline rounded-2xl p-5 space-y-3">
            <p className="font-bold">{item.name}</p>
            <p className="text-sm text-onSurfaceVariant">
              {item.days.map((day) => `${WEEKDAYS[day.weekday]} ${day.startTime}–${day.endTime}`).join(" · ")}
            </p>
            <form className="flex flex-wrap gap-2 items-end" onSubmit={(e) => apply(item.id, e)}>
              <input name="from" type="date" required className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
              <input name="to" type="date" required className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
              <button className="bg-primary text-onPrimary rounded-xl px-4 py-2">Открыть окна</button>
            </form>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
