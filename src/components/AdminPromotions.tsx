"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/client-api";

type Service = { id: string; name: string };
type Promotion = {
  id: string;
  title: string;
  description: string | null;
  discountPercent: number;
  serviceId: string | null;
  serviceName?: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

function dateInput(value: string | null) {
  return value ? String(value).slice(0, 10) : "";
}

export function AdminPromotions({ name, salonId }: { name: string; salonId: string }) {
  const [items, setItems] = useState<Promotion[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const [promos, salonServices] = await Promise.all([
      apiFetch("/api/promotions"),
      apiFetch(`/api/salons/${salonId}/services`),
    ]);
    const promoPayload = await promos.json();
    const servicePayload = await salonServices.json();
    if (promos.ok) setItems(promoPayload);
    if (salonServices.ok) setServices(servicePayload);
  }

  useEffect(() => {
    void load();
  }, [salonId]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await apiFetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        discountPercent: Number(form.get("discountPercent")),
        serviceId: form.get("serviceId") || null,
        startsOn: form.get("startsOn") || null,
        endsOn: form.get("endsOn") || null,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? "Не удалось создать акцию");
    else {
      event.currentTarget.reset();
      await load();
    }
  }

  async function toggle(item: Promotion) {
    const response = await apiFetch(`/api/promotions/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: item.title,
        description: item.description,
        discountPercent: item.discountPercent,
        serviceId: item.serviceId,
        startsOn: dateInput(item.startsAt),
        endsOn: dateInput(item.endsAt),
        isActive: !item.isActive,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? "Не удалось обновить акцию");
    else await load();
  }

  async function remove(id: string) {
    await apiFetch(`/api/promotions/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <DashboardLayout role="admin" name={name}>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Акции салона</h1>
          <p className="text-onSurfaceVariant mt-2">Скидки появляются на главной странице салона, пока действуют.</p>
        </div>
        {error && <p className="text-error text-sm">{error}</p>}
        <form className="bg-card border border-outline rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={create}>
          <input name="title" required placeholder="Название" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2 sm:col-span-2" />
          <textarea name="description" placeholder="Описание" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2 sm:col-span-2 min-h-24" />
          <input name="discountPercent" type="number" min={1} max={90} required placeholder="Скидка %" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          <select name="serviceId" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2">
            <option value="">На все услуги</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <label className="text-sm space-y-1">
            <span>Начало</span>
            <input name="startsOn" type="date" className="w-full bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          </label>
          <label className="text-sm space-y-1">
            <span>Конец</span>
            <input name="endsOn" type="date" className="w-full bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          </label>
          <button className="bg-primary text-onPrimary rounded-xl px-4 py-2 sm:col-span-2">Добавить акцию</button>
        </form>
        {items.map((item) => (
          <div key={item.id} className="bg-card border border-outline rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-lg">
                {item.title} <span className="text-primary">−{item.discountPercent}%</span>
              </p>
              <p className="text-sm text-onSurfaceVariant mt-1">
                {item.serviceName ?? "Все услуги"}
                {item.startsAt || item.endsAt
                  ? ` · ${dateInput(item.startsAt) || "без начала"} — ${dateInput(item.endsAt) || "без срока"}`
                  : " · бессрочно"}
              </p>
              {item.description && <p className="mt-2 text-onSurface">{item.description}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <button type="button" className="px-4 py-2 rounded-xl text-sm font-bold bg-surface border border-outline" onClick={() => toggle(item)}>
                {item.isActive ? "Скрыть" : "Показать"}
              </button>
              <button type="button" className="px-4 py-2 rounded-xl text-sm font-bold bg-error/10 text-error" onClick={() => remove(item.id)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
