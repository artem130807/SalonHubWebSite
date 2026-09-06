"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/client-api";
import { CheckCircle2, Clock, User, Scissors, Users } from "lucide-react";

type AppointmentView = {
  id: string;
  startTime: string;
  endTime: string;
  clientName: string;
  serviceName: string;
  status: string;
  price: number;
};

export function BarberDashboard({
  name,
  appointments,
  today,
}: {
  name: string;
  appointments: AppointmentView[];
  today: string;
}) {
  const router = useRouter();
  const confirmed = appointments.filter((a) => a.status === "Confirmed");
  const next = confirmed[0];
  const [error, setError] = useState("");

  async function complete(id: string) {
    setError("");
    const response = await apiFetch(`/api/appointments/${id}/complete`, { method: "POST" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Не удалось завершить запись");
      return;
    }
    router.refresh();
  }

  return (
    <DashboardLayout role="barber" name={name}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2">Привет, {name}!</h1>
          <p className="text-onSurfaceVariant">Расписание на сегодня</p>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-outline p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-onSurfaceVariant mb-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-medium">Клиентов сегодня</h3>
            </div>
            <p className="text-3xl font-bold">{appointments.length}</p>
          </div>
          <div className="bg-card border border-outline p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-onSurfaceVariant mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-medium">Ближайшая запись</h3>
            </div>
            <p className="text-3xl font-bold">{next?.startTime ?? "—"}</p>
          </div>
          <div className="bg-card border border-outline p-6 rounded-2xl">
            <h3 className="font-medium text-onSurfaceVariant mb-2">Подтверждено</h3>
            <p className="text-3xl font-bold">{confirmed.length}</p>
          </div>
        </div>
        <div className="bg-card border border-outline rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-outline">
            <h2 className="text-xl font-bold">Записи</h2>
          </div>
          <div className="divide-y divide-outline">
            {appointments.length === 0 && (
              <p className="p-6 text-onSurfaceVariant">На сегодня записей нет. Откройте рабочее окно ниже.</p>
            )}
            {appointments.map((apt) => (
              <div key={apt.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-surfaceVariant flex items-center justify-center border border-outline">
                    <span className="text-lg font-bold text-primary">{apt.startTime}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <User className="w-4 h-4" /> {apt.clientName}
                    </h4>
                    <p className="text-onSurfaceVariant flex items-center gap-2 mt-1">
                      <Scissors className="w-4 h-4" /> {apt.serviceName}
                    </p>
                    <p className="text-primary text-sm mt-1">{apt.price} ₽</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {apt.status === "Completed" && (
                    <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Завершено
                    </span>
                  )}
                  {apt.status === "Confirmed" && (
                    <button
                      type="button"
                      onClick={() => complete(apt.id)}
                      className="bg-primary text-onPrimary text-sm font-medium px-4 py-2 rounded-lg"
                    >
                      Завершить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <OpenWindowForm today={today} />
      </div>
    </DashboardLayout>
  );
}

function OpenWindowForm({ today }: { today: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await apiFetch("/api/time-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduleDate: form.get("scheduleDate"),
        startTime: form.get("startTime"),
        endTime: form.get("endTime"),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(payload.error ?? "Не удалось открыть окно");
      return;
    }
    router.refresh();
  }

  return (
    <div className="bg-card border border-outline rounded-2xl p-6 space-y-4">
      <h2 className="text-xl font-bold">Рабочее окно</h2>
      {error && <p className="text-sm text-error">{error}</p>}
      <form className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end" onSubmit={onSubmit}>
        <label className="text-sm space-y-1">
          <span>Дата</span>
          <input name="scheduleDate" type="date" defaultValue={today} required className="w-full bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
        </label>
        <label className="text-sm space-y-1">
          <span>Начало</span>
          <input name="startTime" type="time" defaultValue="10:00" required className="w-full bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
        </label>
        <label className="text-sm space-y-1">
          <span>Конец</span>
          <input name="endTime" type="time" defaultValue="18:00" required className="w-full bg-surfaceVariant border border-outline rounded-xl px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="bg-primary text-onPrimary font-semibold py-2.5 rounded-xl">
          {pending ? "Сохранение..." : "Открыть"}
        </button>
      </form>
    </div>
  );
}
