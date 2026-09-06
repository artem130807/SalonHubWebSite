"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiFetch } from "@/lib/client-api";

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  appointmentDate: string;
  clientName: string;
  masterName: string;
  serviceName: string;
  status: string;
};

export function AdminAppointments({ name }: { name: string }) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [date, setDate] = useState("");

  async function load(nextDate?: string) {
    const query = nextDate ? `?date=${nextDate}` : "";
    const response = await apiFetch(`/api/appointments/salon${query}`);
    const payload = await response.json();
    if (response.ok) setItems(payload);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <DashboardLayout role="admin" name={name}>
      <div className="max-w-5xl space-y-4">
        <h1 className="text-3xl font-serif font-bold">Записи салона</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            void load(e.target.value);
          }}
          className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2"
        />
        <div className="bg-card border border-outline rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surfaceVariant/50 text-onSurfaceVariant text-sm">
                <th className="p-4">Дата</th>
                <th className="p-4">Время</th>
                <th className="p-4">Клиент</th>
                <th className="p-4">Мастер</th>
                <th className="p-4">Статус</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-outline">
                  <td className="p-4">{String(item.appointmentDate).slice(0, 10)}</td>
                  <td className="p-4">
                    {item.startTime}–{item.endTime}
                  </td>
                  <td className="p-4">
                    {item.clientName}
                    <p className="text-xs text-onSurfaceVariant">{item.serviceName}</p>
                  </td>
                  <td className="p-4">{item.masterName}</td>
                  <td className="p-4">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
