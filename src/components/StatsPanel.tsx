"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";

type Stats = {
  period: string;
  completedCount: number;
  cancelledCount: number;
  totalCount: number;
  revenue: number;
};

export function StatsPanel({ endpoint }: { endpoint: string }) {
  const [period, setPeriod] = useState("week");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const response = await apiFetch(`${endpoint}?period=${period}`);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Не удалось загрузить статистику");
        return;
      }
      setStats(payload);
    })();
  }, [endpoint, period]);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-serif font-bold">Статистика</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2"
        >
          <option value="week">Неделя</option>
          <option value="month">Месяц</option>
          <option value="year">Год</option>
        </select>
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-outline rounded-2xl p-6">
            <p className="text-onSurfaceVariant text-sm">Завершено</p>
            <p className="text-3xl font-bold">{stats.completedCount}</p>
          </div>
          <div className="bg-card border border-outline rounded-2xl p-6">
            <p className="text-onSurfaceVariant text-sm">Отменено</p>
            <p className="text-3xl font-bold">{stats.cancelledCount}</p>
          </div>
          <div className="bg-card border border-outline rounded-2xl p-6">
            <p className="text-onSurfaceVariant text-sm">Выручка</p>
            <p className="text-3xl font-bold">{stats.revenue} ₽</p>
          </div>
        </div>
      )}
    </div>
  );
}
