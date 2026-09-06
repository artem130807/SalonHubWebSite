"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/client-api";

type Service = { id: string; name: string; durationMinutes: number };
type Slot = { timeSlotId: string; startTime: string; endTime: string };

export function WalkInForm({
  name,
  salonId,
  masterId,
}: {
  name: string;
  salonId: string;
  masterId: string;
}) {
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    void apiFetch(`/api/masters/${masterId}/services`)
      .then((r) => r.json())
      .then((payload) => {
        if (Array.isArray(payload)) setServices(payload);
      });
  }, [masterId]);

  async function loadSlots(serviceId: string, date: string) {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;
    const response = await apiFetch(
      `/api/masters/${masterId}/available-slots?date=${date}&durationMinutes=${service.durationMinutes}`,
    );
    const payload = await response.json();
    if (response.ok) setSlots(payload);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setOk("");
    const form = new FormData(event.currentTarget);
    const slot = slots.find((s) => s.startTime === String(form.get("startTime")));
    const response = await apiFetch("/api/appointments/walk-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salonId,
        masterId,
        serviceId: form.get("serviceId"),
        timeSlotId: slot?.timeSlotId,
        startTime: form.get("startTime"),
        appointmentDate: form.get("appointmentDate"),
        guestName: form.get("guestName"),
        clientNotes: form.get("clientNotes"),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать запись");
      return;
    }
    setOk("Гость записан");
  }

  return (
    <DashboardLayout role="barber" name={name}>
      <form className="max-w-lg space-y-4" onSubmit={onSubmit}>
        <h1 className="text-3xl font-serif font-bold">Запись гостя</h1>
        {error && <p className="text-error text-sm">{error}</p>}
        {ok && <p className="text-primary text-sm">{ok}</p>}
        <input name="guestName" required placeholder="Имя гостя" className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3" />
        <input
          name="appointmentDate"
          type="date"
          required
          className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3"
          onChange={(e) => {
            const form = e.currentTarget.form;
            const serviceId = String(form?.elements.namedItem("serviceId") instanceof HTMLSelectElement ? (form.elements.namedItem("serviceId") as HTMLSelectElement).value : "");
            if (serviceId) void loadSlots(serviceId, e.target.value);
          }}
        />
        <select
          name="serviceId"
          required
          className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3"
          onChange={(e) => {
            const form = e.currentTarget.form;
            const date = String(form?.elements.namedItem("appointmentDate") instanceof HTMLInputElement ? (form.elements.namedItem("appointmentDate") as HTMLInputElement).value : "");
            if (date) void loadSlots(e.target.value, date);
          }}
        >
          <option value="">Услуга</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
        <select name="startTime" required className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3">
          <option value="">Время</option>
          {slots.map((slot) => (
            <option key={`${slot.timeSlotId}-${slot.startTime}`} value={slot.startTime}>
              {slot.startTime}–{slot.endTime}
            </option>
          ))}
        </select>
        <textarea name="clientNotes" placeholder="Комментарий" className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3" />
        <button className="w-full bg-primary text-onPrimary font-bold py-3 rounded-xl">Записать</button>
      </form>
    </DashboardLayout>
  );
}
