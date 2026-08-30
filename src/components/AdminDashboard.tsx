"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { TrendingUp, Users, CalendarCheck, Scissors } from "lucide-react";

const stats = [
  { label: "Записей сегодня", value: "24", trend: "+4", icon: CalendarCheck },
  { label: "Выручка за день", value: "38 500 ₽", trend: "+12%", icon: TrendingUp },
  { label: "Новых клиентов", value: "6", trend: "+2", icon: Users },
  { label: "Специалистов на смене", value: "3 / 4", trend: "0", icon: Scissors },
];

const recentBookings = [
  {
    id: "1023",
    client: "Михаил С.",
    barber: "Александр",
    service: "Стрижка + Борода",
    time: "10:00",
    status: "Завершено",
  },
  {
    id: "1024",
    client: "Артем В.",
    barber: "Александр",
    service: "Мужская стрижка",
    time: "11:30",
    status: "В работе",
  },
  {
    id: "1025",
    client: "Дмитрий К.",
    barber: "Михаил",
    service: "Королевское бритье",
    time: "12:00",
    status: "Ожидает",
  },
  {
    id: "1026",
    client: "Олег Д.",
    barber: "Александр",
    service: "Моделирование бороды",
    time: "13:00",
    status: "Ожидает",
  },
];

export function AdminDashboard() {
  return (
    <DashboardLayout role="admin">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2">
              Сводка салона
            </h1>
            <p className="text-onSurfaceVariant">
              Обзор показателей вашего салона на сегодня
            </p>
          </div>
          <button
            type="button"
            className="bg-primary text-onPrimary px-4 py-2 rounded-lg font-medium hover:bg-primaryVariant transition-colors"
          >
            + Создать запись вручную
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-card border border-outline p-6 rounded-2xl"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-surfaceVariant flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      stat.trend.startsWith("+")
                        ? "text-success"
                        : "text-onSurfaceVariant"
                    }`}
                  >
                    {stat.trend}
                  </span>
                </div>
                <h3 className="text-onSurfaceVariant text-sm font-medium mb-1">
                  {stat.label}
                </h3>
                <p className="text-2xl font-bold text-onBackground">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-card border border-outline rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-outline flex justify-between items-center">
              <h2 className="text-xl font-bold">Последние записи</h2>
              <button
                type="button"
                className="text-sm text-primary hover:underline"
              >
                Смотреть все
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surfaceVariant/50 text-onSurfaceVariant text-sm">
                    <th className="p-4 font-medium">ID</th>
                    <th className="p-4 font-medium">Время</th>
                    <th className="p-4 font-medium">Клиент</th>
                    <th className="p-4 font-medium">Специалист</th>
                    <th className="p-4 font-medium">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline">
                  {recentBookings.map((b) => (
                    <tr
                      key={b.id}
                      className="hover:bg-surfaceVariant/30 transition-colors"
                    >
                      <td className="p-4 text-sm font-mono text-onSurfaceVariant">
                        #{b.id}
                      </td>
                      <td className="p-4 font-medium">{b.time}</td>
                      <td className="p-4">
                        <p className="font-bold">{b.client}</p>
                        <p className="text-xs text-onSurfaceVariant">
                          {b.service}
                        </p>
                      </td>
                      <td className="p-4">{b.barber}</td>
                      <td className="p-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                            b.status === "Завершено"
                              ? "bg-success/10 text-success border border-success/20"
                              : b.status === "В работе"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-surfaceVariant text-onSurface border border-outline"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-outline rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-6">Статус специалистов</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-surfaceVariant flex items-center justify-center font-bold">
                      А
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Александр</p>
                    <p className="text-xs text-primary">В работе (до 12:30)</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-surfaceVariant rounded-md">
                  8 записей
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-outline hover:bg-surfaceVariant/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-surfaceVariant flex items-center justify-center font-bold">
                      М
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Михаил</p>
                    <p className="text-xs text-success">Свободен</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-surfaceVariant rounded-md">
                  6 записей
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-outline hover:bg-surfaceVariant/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-surfaceVariant flex items-center justify-center font-bold text-onSurfaceVariant">
                      Д
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-outline rounded-full border-2 border-card" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-onSurfaceVariant">
                      Давид
                    </p>
                    <p className="text-xs text-onSurfaceVariant">Выходной</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-surfaceVariant rounded-md text-onSurfaceVariant">
                  0 записей
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
