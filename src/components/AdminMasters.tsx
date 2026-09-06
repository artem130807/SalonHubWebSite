"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/client-api";

type Master = { id: string; userName: string; specialization: string | null };
type Service = { id: string; name: string };

export function AdminMasters({ name, salonId }: { name: string; salonId: string }) {
  const [masters, setMasters] = useState<Master[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const [m, s] = await Promise.all([
      apiFetch(`/api/salons/${salonId}/masters`),
      apiFetch(`/api/salons/${salonId}/services`),
    ]);
    const mastersPayload = await m.json();
    const servicesPayload = await s.json();
    if (m.ok) setMasters(mastersPayload);
    if (s.ok) setServices(servicesPayload);
  }

  useEffect(() => {
    void load();
  }, [salonId]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await apiFetch(`/api/salons/${salonId}/masters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        password: form.get("password"),
        specialization: form.get("specialization"),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setError(payload.error ?? "Ошибка");
    else {
      event.currentTarget.reset();
      await load();
    }
  }

  async function assign(masterId: string, serviceId: string) {
    await apiFetch(`/api/masters/${masterId}/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId }),
    });
  }

  return (
    <DashboardLayout role="admin" name={name}>
      <div className="max-w-3xl space-y-6">
        <h1 className="text-3xl font-serif font-bold">Мастера</h1>
        {error && <p className="text-error text-sm">{error}</p>}
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-3" onSubmit={create}>
          <input name="name" required placeholder="Имя" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          <input name="email" type="email" required placeholder="Email" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          <input name="phone" required placeholder="Телефон" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          <input name="password" required placeholder="Пароль" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          <input name="specialization" placeholder="Специализация" className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
          <button className="bg-primary text-onPrimary rounded-xl px-4 py-2">Добавить мастера</button>
        </form>
        {masters.map((master) => (
          <div key={master.id} className="bg-card border border-outline rounded-2xl p-4 space-y-2">
            <p className="font-bold">{master.userName}</p>
            <p className="text-sm text-onSurfaceVariant">{master.specialization}</p>
            <select
              className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) void assign(master.id, e.target.value);
              }}
            >
              <option value="">Назначить услугу</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
