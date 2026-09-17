"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client-api";

type RankedItem = { id: string; name: string; count: number; revenue: number; share: number };
type HourBucket = { hour: number; count: number };
type WeekdayBucket = { weekday: number; label: string; count: number; revenue: number };
type Insight = { id: string; tone: "ok" | "warn" | "info"; title: string; detail: string };
type Kpis = {
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  confirmedCount: number;
  revenue: number;
  lostRevenue: number;
  averageCheck: number;
  cancellationRate: number;
  occupancyRate: number;
  windowMinutes: number;
  bookedMinutes: number;
  idleMinutes: number;
  unsellableMinutes: number;
  uniqueClients: number;
  repeatClients: number;
  walkInCount: number;
  onlineCount: number;
  reviewCount: number;
  reviewCoverage: number;
  averageRating: number | null;
};
type Report = {
  period: string;
  scope: "salon" | "master";
  completedCount: number;
  cancelledCount: number;
  totalCount: number;
  revenue: number;
  kpis: Kpis;
  services: RankedItem[];
  masters: RankedItem[];
  hours: HourBucket[];
  weekdays: WeekdayBucket[];
  insights: Insight[];
};
type MasterOption = { id: string; userName: string };

export function StatsPanel({
  endpoint,
  masterEndpoint,
  salonId,
}: {
  endpoint: string;
  masterEndpoint?: string;
  salonId?: string;
}) {
  const [period, setPeriod] = useState("week");
  const [masterId, setMasterId] = useState("");
  const [masters, setMasters] = useState<MasterOption[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestUrl = useMemo(() => {
    if (masterId && masterEndpoint) return `${masterEndpoint}?period=${period}&masterId=${masterId}`;
    return `${endpoint}?period=${period}`;
  }, [endpoint, masterEndpoint, masterId, period]);

  useEffect(() => {
    if (!salonId || !masterEndpoint) return;
    let cancelled = false;
    apiFetch(`/api/salons/${salonId}/masters`)
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled || !Array.isArray(payload)) return;
        setMasters(payload.map((item: MasterOption) => ({ id: item.id, userName: item.userName })));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [salonId, masterEndpoint]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    apiFetch(requestUrl)
      .then(async (response) => {
        const payload = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setReport(null);
          setError(payload.error ?? "Не удалось загрузить статистику");
          return;
        }
        setReport(payload);
      })
      .catch(() => {
        if (!cancelled) setError("Не удалось загрузить статистику");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestUrl]);

  const kpis = report?.kpis;
  const hourMax = Math.max(1, ...(report?.hours.map((item) => item.count) ?? [1]));
  const dayMax = Math.max(1, ...(report?.weekdays.map((item) => item.count) ?? [1]));

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold">Статистика</h1>
          <p className="text-onSurfaceVariant mt-1">
            {report?.scope === "master" ? "Личные показатели мастера" : "Сводка салона по записям, окнам и отзывам"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 [&>select]:w-full sm:[&>select]:w-auto">
          {masterEndpoint && masters.length > 0 && (
            <select
              value={masterId}
              onChange={(event) => setMasterId(event.target.value)}
              className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2"
            >
              <option value="">Весь салон</option>
              {masters.map((master) => (
                <option key={master.id} value={master.id}>
                  {master.userName}
                </option>
              ))}
            </select>
          )}
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="bg-surfaceVariant border border-outline rounded-xl px-3 py-2"
          >
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
            <option value="year">Год</option>
          </select>
        </div>
      </div>

      {error && <p className="text-error text-sm">{error}</p>}
      {loading && !report && <p className="text-onSurfaceVariant">Считаем показатели...</p>}

      {kpis && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Kpi label="Выручка" value={money(kpis.revenue)} hint={`${kpis.completedCount} завершённых`} />
            <Kpi label="Средний чек" value={money(kpis.averageCheck)} hint={`${kpis.confirmedCount} ещё ждут визита`} />
            <Kpi label="Заполненность окон" value={percent(kpis.occupancyRate)} hint={`${hours(kpis.bookedMinutes)} из ${hours(kpis.windowMinutes)}`} />
            <Kpi label="Отмены" value={percent(kpis.cancellationRate)} hint={`потеряно ${money(kpis.lostRevenue)}`} />
            <Kpi label="Клиенты" value={String(kpis.uniqueClients)} hint={`${kpis.repeatClients} вернулись повторно`} />
            <Kpi label="Онлайн / гости" value={`${kpis.onlineCount} / ${kpis.walkInCount}`} hint="запись из кабинета vs гость у кресла" />
            <Kpi
              label="Отзывы"
              value={kpis.averageRating == null ? "—" : kpis.averageRating.toFixed(1)}
              hint={`${percent(kpis.reviewCoverage)} визитов оценены`}
            />
            <Kpi label="Непродаваемые дыры" value={hours(kpis.unsellableMinutes)} hint="куски окон короче услуги" />
          </div>

          <section className="bg-surface border border-outline rounded-3xl p-5 sm:p-6">
            <h2 className="font-serif font-bold text-xl">Заполненность расписания</h2>
            <p className="text-sm text-onSurfaceVariant mt-1">
              Сколько открытого времени реально занято записями. Короткие остатки между визитами сюда не входят — это отдельные «дыры».
            </p>
            <div className="mt-4 h-3 rounded-full bg-outline/40 overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${Math.round(kpis.occupancyRate * 100)}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-onSurfaceVariant mt-3">
              <span>Занято: {hours(kpis.bookedMinutes)}</span>
              <span>Простой: {hours(kpis.idleMinutes)}</span>
              <span>Дыры: {hours(kpis.unsellableMinutes)}</span>
            </div>
          </section>

          {report.insights.length > 0 && (
            <section className="grid md:grid-cols-2 gap-4">
              {report.insights.map((insight) => (
                <article
                  key={insight.id}
                  className={`rounded-3xl border p-5 ${
                    insight.tone === "warn"
                      ? "border-error/30 bg-error/5"
                      : insight.tone === "ok"
                        ? "border-primary/30 bg-primary/5"
                        : "border-outline bg-surface"
                  }`}
                >
                  <p className="font-bold">{insight.title}</p>
                  <p className="text-sm text-onSurfaceVariant mt-2 leading-relaxed">{insight.detail}</p>
                </article>
              ))}
            </section>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <section className="bg-surface border border-outline rounded-3xl p-5 sm:p-6">
              <h2 className="font-serif font-bold text-xl mb-4">Нагрузка по дням</h2>
              <div className="space-y-2">
                {report.weekdays.map((day) => (
                  <BarRow key={day.weekday} label={day.label} value={day.count} max={dayMax} meta={day.revenue ? money(day.revenue) : ""} />
                ))}
              </div>
            </section>
            <section className="bg-surface border border-outline rounded-3xl p-5 sm:p-6">
              <h2 className="font-serif font-bold text-xl mb-4">Часы спроса</h2>
              {report.hours.length === 0 ? (
                <p className="text-sm text-onSurfaceVariant">За период записей не было</p>
              ) : (
                <div className="space-y-2">
                  {report.hours.map((item) => (
                    <BarRow key={item.hour} label={`${String(item.hour).padStart(2, "0")}:00`} value={item.count} max={hourMax} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className={`grid gap-4 ${report.scope === "salon" && report.masters.length > 1 ? "lg:grid-cols-2" : ""}`}>
            <RankTable title="Услуги" empty="Пока нет завершённых услуг" rows={report.services} />
            {report.scope === "salon" && <RankTable title="Мастера" empty="Нет завершённых визитов" rows={report.masters} />}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-surface border border-outline rounded-2xl sm:rounded-3xl p-4 sm:p-5">
      <p className="text-onSurfaceVariant text-xs sm:text-sm">{label}</p>
      <p className="text-xl sm:text-3xl font-bold mt-1 leading-tight">{value}</p>
      <p className="text-xs text-onSurfaceVariant mt-2">{hint}</p>
    </div>
  );
}

function BarRow({ label, value, max, meta }: { label: string; value: number; max: number; meta?: string }) {
  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3 text-sm">
      <span className="text-onSurfaceVariant">{label}</span>
      <div className="h-2.5 rounded-full bg-outline/40 overflow-hidden">
        <div className="h-full bg-primary/80" style={{ width: `${Math.round((value / max) * 100)}%` }} />
      </div>
      <span className="tabular-nums text-onSurfaceVariant whitespace-nowrap">
        {value}
        {meta ? ` · ${meta}` : ""}
      </span>
    </div>
  );
}

function RankTable({ title, empty, rows }: { title: string; empty: string; rows: RankedItem[] }) {
  return (
    <section className="bg-surface border border-outline rounded-3xl p-5 sm:p-6">
      <h2 className="font-serif font-bold text-xl mb-4">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-onSurfaceVariant">{empty}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{row.name}</p>
                <p className="text-xs text-onSurfaceVariant">{row.count} визитов · {percent(row.share)} выручки</p>
              </div>
              <p className="font-bold shrink-0">{money(row.revenue)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function money(value: number) {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function hours(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}
