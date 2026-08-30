"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { CheckCircle2, Clock, User, Scissors, Users, Wallet } from "lucide-react";

const todayAppointments = [
  {
    id: 1,
    time: "10:00",
    client: "Анна С.",
    service: "Женская стрижка + Укладка",
    status: "completed",
    price: "3 500 ₽",
  },
  {
    id: 2,
    time: "12:30",
    client: "Мария В.",
    service: "Окрашивание волос",
    status: "in_progress",
    price: "5 000 ₽",
  },
  {
    id: 3,
    time: "15:00",
    client: "Елена Д.",
    service: "Укладка вечерняя",
    status: "pending",
    price: "2 500 ₽",
  },
  {
    id: 4,
    time: "17:00",
    client: "Михаил К.",
    service: "Мужская стрижка",
    status: "pending",
    price: "1 500 ₽",
  },
];

export function BarberDashboard() {
  return (
    <DashboardLayout role="barber">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-serif mb-2">
            Привет, Александр!
          </h1>
          <p className="text-onSurfaceVariant">
            Твое расписание на сегодня
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-outline p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-onSurfaceVariant mb-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-medium">Клиентов сегодня</h3>
            </div>
            <p className="text-3xl font-bold">4</p>
          </div>

          <div className="bg-card border border-outline p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-onSurfaceVariant mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-medium">Ближайшая запись</h3>
            </div>
            <p className="text-3xl font-bold">15:00</p>
            <p className="text-sm text-primary mt-1">через 1ч 30м</p>
          </div>

          <div className="bg-card border border-outline p-6 rounded-2xl">
            <div className="flex items-center gap-3 text-onSurfaceVariant mb-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h3 className="font-medium">Выручка (расчет)</h3>
            </div>
            <p className="text-3xl font-bold">12 500 ₽</p>
          </div>
        </div>

        <div className="bg-card border border-outline rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-outline">
            <h2 className="text-xl font-bold">Расписание записей</h2>
          </div>

          <div className="divide-y divide-outline">
            {todayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surfaceVariant/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-surfaceVariant flex flex-col items-center justify-center shrink-0 border border-outline">
                    <span className="text-lg font-bold text-primary">
                      {apt.time}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <User className="w-4 h-4 text-onSurfaceVariant" />
                      {apt.client}
                    </h4>
                    <p className="text-onSurfaceVariant flex items-center gap-2 mt-1">
                      <Scissors className="w-4 h-4" />
                      {apt.service}
                    </p>
                    <p className="text-primary font-medium text-sm mt-1">
                      {apt.price}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-3 justify-between">
                  {apt.status === "completed" && (
                    <span className="px-3 py-1 bg-success/10 text-success border border-success/20 rounded-full text-sm font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Завершено
                    </span>
                  )}
                  {apt.status === "in_progress" && (
                    <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium flex items-center gap-1">
                      <Clock className="w-4 h-4 animate-pulse" /> В работе
                    </span>
                  )}
                  {apt.status === "pending" && (
                    <span className="px-3 py-1 bg-surfaceVariant text-onSurface border border-outline rounded-full text-sm font-medium">
                      Ожидает
                    </span>
                  )}

                  {apt.status === "pending" && (
                    <button
                      type="button"
                      className="bg-surfaceVariant hover:bg-primary hover:text-onPrimary border border-outline hover:border-primary text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      Начать работу
                    </button>
                  )}
                  {apt.status === "in_progress" && (
                    <button
                      type="button"
                      className="bg-primary text-onPrimary hover:bg-primaryVariant text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-primary/20"
                    >
                      Завершить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
