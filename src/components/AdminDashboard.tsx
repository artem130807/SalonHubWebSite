"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/client-api";
import { CalendarCheck, Users, Scissors } from "lucide-react";

type AppointmentView = {
  id: string;
  startTime: string;
  clientName: string;
  masterName: string;
  serviceName: string;
  status: string;
};

export function AdminDashboard({
  name,
  appointments,
  mastersCount,
  needsSalon = false,
}: {
  name: string;
  appointments: AppointmentView[];
  mastersCount: number;
  needsSalon?: boolean;
}) {
  return (
    <DashboardLayout role="admin" name={name}>
      {needsSalon ? (
        <CreateSalonForm />
      ) : (
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2">Сводка салона</h1>
            <p className="text-onSurfaceVariant">{name}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-outline p-6 rounded-2xl">
              <CalendarCheck className="w-5 h-5 text-primary mb-3" />
              <p className="text-onSurfaceVariant text-sm">Записей сегодня</p>
              <p className="text-2xl font-bold">{appointments.length}</p>
            </div>
            <div className="bg-card border border-outline p-6 rounded-2xl">
              <Scissors className="w-5 h-5 text-primary mb-3" />
              <p className="text-onSurfaceVariant text-sm">Мастеров</p>
              <p className="text-2xl font-bold">{mastersCount}</p>
            </div>
            <div className="bg-card border border-outline p-6 rounded-2xl">
              <Users className="w-5 h-5 text-primary mb-3" />
              <p className="text-onSurfaceVariant text-sm">Подтверждено</p>
              <p className="text-2xl font-bold">
                {appointments.filter((a) => a.status === "Confirmed").length}
              </p>
            </div>
          </div>
          <div className="bg-card border border-outline rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-outline">
              <h2 className="text-xl font-bold">Записи сегодня</h2>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surfaceVariant/50 text-onSurfaceVariant text-sm">
                  <th className="p-4">Время</th>
                  <th className="p-4">Клиент</th>
                  <th className="p-4">Мастер</th>
                  <th className="p-4">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {appointments.length === 0 && (
                  <tr>
                    <td className="p-4 text-onSurfaceVariant" colSpan={4}>
                      На сегодня записей нет
                    </td>
                  </tr>
                )}
                {appointments.map((b) => (
                  <tr key={b.id}>
                    <td className="p-4 font-medium">{b.startTime}</td>
                    <td className="p-4">
                      <p className="font-bold">{b.clientName}</p>
                      <p className="text-xs text-onSurfaceVariant">{b.serviceName}</p>
                    </td>
                    <td className="p-4">{b.masterName}</td>
                    <td className="p-4">{b.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function CreateSalonForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await apiFetch("/api/salons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        city: form.get("city"),
        street: form.get("street"),
        building: form.get("building"),
        phone: form.get("phone") || undefined,
        openingTime: "10:00",
        closingTime: "20:00",
      }),
    });
    const payload = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(payload.error ?? "Не удалось создать салон");
      return;
    }
    router.refresh();
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-serif mb-2">Создайте салон</h1>
        <p className="text-onSurfaceVariant">После регистрации нужно добавить карточку салона.</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        {error && <p className="text-sm text-error">{error}</p>}
        <input name="name" required placeholder="Название" className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3" />
        <input name="city" required placeholder="Город" className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3" />
        <input name="street" required placeholder="Улица" className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3" />
        <input name="building" required placeholder="Дом" className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3" />
        <input name="phone" placeholder="Телефон" className="w-full bg-surfaceVariant border border-outline rounded-xl px-4 py-3" />
        <button type="submit" disabled={pending} className="w-full bg-primary text-onPrimary font-bold py-3.5 rounded-xl">
          {pending ? "Сохранение..." : "Создать салон"}
        </button>
      </form>
    </div>
  );
}
