"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useBooking } from "@/components/BookingProvider";
import { apiFetch } from "@/lib/client-api";
import { addDateOnly, addMonths, dayOfMonth, eachDateOnly, weekdayMonday0, yearMonthOf } from "@/lib/date-only";
import { humanDate, monthTitle, WEEKDAYS_SHORT } from "@/lib/locale";
import { DayTimeline, formatClock, LegendDot } from "@/components/site/schedule/SchedulePrimitives";

type Interval = { startTime: string; endTime: string };
type CalendarDay = {
  date: string;
  windows: Interval[];
  busy: Interval[];
  starts: Interval[];
  freeStartCount: number;
};
export type MasterCalendarData = {
  month: string;
  from: string;
  to: string;
  today: string;
  previewDurationMinutes: number;
  minMonth: string;
  maxMonth: string;
  days: CalendarDay[];
};
type ServiceOption = { id: string; name: string; durationMinutes: number };

function pickDate(calendar: MasterCalendarData, preferred?: string) {
  if (preferred && preferred >= calendar.from && preferred < calendar.to) return preferred;
  const nextFree = calendar.days.find((day) => day.date >= calendar.today && day.freeStartCount > 0);
  if (nextFree) return nextFree.date;
  if (calendar.today >= calendar.from && calendar.today < calendar.to) return calendar.today;
  return `${calendar.month}-01`;
}

export function MasterScheduleCalendar({
  masterId,
  salonId,
  initialCalendar,
  services,
}: {
  masterId: string;
  salonId: string;
  initialCalendar: MasterCalendarData;
  services: ServiceOption[];
}) {
  const { openBooking } = useBooking();
  const shortest = useMemo(
    () => services.slice().sort((left, right) => left.durationMinutes - right.durationMinutes)[0] ?? null,
    [services],
  );
  const [calendar, setCalendar] = useState(initialCalendar);
  const [selectedDate, setSelectedDate] = useState(() => pickDate(initialCalendar));
  const [serviceId, setServiceId] = useState(shortest?.id ?? "");
  const [customStarts, setCustomStarts] = useState<Interval[] | null>(null);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingStarts, setLoadingStarts] = useState(false);
  const [error, setError] = useState("");
  const monthRequest = useRef(0);

  const daysByDate = useMemo(
    () => new Map(calendar.days.map((day) => [day.date, day])),
    [calendar.days],
  );
  const selected = daysByDate.get(selectedDate);
  const usingPreview = !serviceId || serviceId === shortest?.id;
  const starts = usingPreview ? (selected?.starts ?? []) : (customStarts ?? []);
  const canBook =
    selectedDate >= calendar.today &&
    !loadingStarts &&
    (usingPreview ? (selected?.freeStartCount ?? 0) > 0 : (customStarts?.length ?? 0) > 0);
  const dates = useMemo(() => eachDateOnly(calendar.from, calendar.to), [calendar.from, calendar.to]);

  useEffect(() => {
    if (usingPreview || !selectedDate) {
      setCustomStarts(null);
      setLoadingStarts(false);
      return;
    }
    const service = services.find((item) => item.id === serviceId);
    if (!service) return;
    let cancelled = false;
    setCustomStarts(null);
    setLoadingStarts(true);
    setError("");
    apiFetch(
      `/api/masters/${masterId}/available-slots?date=${selectedDate}&durationMinutes=${service.durationMinutes}`,
    )
      .then(async (response) => {
        const payload = await response.json();
        if (cancelled) return;
        if (!response.ok || !Array.isArray(payload)) {
          setCustomStarts([]);
          setError(payload?.error ?? "Не удалось загрузить свободное время");
          return;
        }
        setCustomStarts(payload);
      })
      .catch(() => {
        if (cancelled) return;
        setCustomStarts([]);
        setError("Не удалось загрузить свободное время");
      })
      .finally(() => {
        if (!cancelled) setLoadingStarts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [masterId, selectedDate, serviceId, usingPreview, services]);

  async function loadMonth(month: string, nextDate?: string) {
    if (month < calendar.minMonth || month > calendar.maxMonth) return;
    if (month === calendar.month && nextDate) {
      setSelectedDate(pickDate(calendar, nextDate));
      return;
    }
    const request = ++monthRequest.current;
    setLoadingMonth(true);
    setError("");
    try {
      const response = await apiFetch(`/api/masters/${masterId}/calendar?month=${month}`);
      const payload = await response.json();
      if (request !== monthRequest.current) return;
      if (!response.ok) {
        setError(payload?.error ?? "Не удалось открыть месяц");
        return;
      }
      const next = payload as MasterCalendarData;
      setCalendar(next);
      setSelectedDate(pickDate(next, nextDate));
    } catch {
      if (request === monthRequest.current) setError("Не удалось открыть месяц");
    } finally {
      if (request === monthRequest.current) setLoadingMonth(false);
    }
  }

  function selectDate(date: string) {
    const month = yearMonthOf(date);
    if (month !== calendar.month) {
      void loadMonth(month, date);
      return;
    }
    setSelectedDate(date);
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const move: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (event.key === "Home") {
      event.preventDefault();
      selectDate(addDateOnly(selectedDate, -weekdayMonday0(selectedDate)));
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      selectDate(addDateOnly(selectedDate, 6 - weekdayMonday0(selectedDate)));
      return;
    }
    if (event.key === "PageUp") {
      event.preventDefault();
      void loadMonth(addMonths(calendar.month, -1), selectedDate);
      return;
    }
    if (event.key === "PageDown") {
      event.preventDefault();
      void loadMonth(addMonths(calendar.month, 1), selectedDate);
      return;
    }
    const delta = move[event.key];
    if (!delta) return;
    event.preventDefault();
    selectDate(addDateOnly(selectedDate, delta));
  }

  const windowsLabel = selected?.windows.map((item) => `${formatClock(item.startTime)}–${formatClock(item.endTime)}`).join(", ");

  return (
    <section className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-3xl font-serif font-bold">Расписание</h2>
          <p className="text-onSurfaceVariant mt-1">Рабочие дни и свободное время мастера</p>
        </div>
        <button
          type="button"
          onClick={() => void loadMonth(yearMonthOf(calendar.today), calendar.today)}
          className="text-sm font-semibold text-primary hover:underline self-start sm:self-auto"
        >
          Сегодня
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)] gap-5">
        <div className="bg-surface/50 border border-outline/50 rounded-[1.75rem] p-4 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="absolute -top-16 -right-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between gap-3 mb-5 relative">
            <button
              type="button"
              onClick={() => void loadMonth(addMonths(calendar.month, -1))}
              disabled={calendar.month <= calendar.minMonth}
              className="p-2 rounded-full border border-outline hover:border-primary hover:text-primary disabled:opacity-30 transition-colors"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="text-lg sm:text-xl font-serif font-bold capitalize">{monthTitle(calendar.month)}</p>
            <button
              type="button"
              onClick={() => void loadMonth(addMonths(calendar.month, 1))}
              disabled={calendar.month >= calendar.maxMonth}
              className="p-2 rounded-full border border-outline hover:border-primary hover:text-primary disabled:opacity-30 transition-colors"
              aria-label="Следующий месяц"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div
            role="grid"
            aria-label={`Календарь, ${monthTitle(calendar.month)}`}
            tabIndex={0}
            onKeyDown={onGridKeyDown}
            className="outline-none"
          >
            <div role="row" className="grid grid-cols-7 gap-1.5 mb-2">
              {WEEKDAYS_SHORT.map((day) => (
                <div key={day} role="columnheader" className="text-center text-[11px] font-semibold tracking-wide text-onSurfaceVariant uppercase py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {dates.map((date) => {
                const day = daysByDate.get(date);
                const outside = yearMonthOf(date) !== calendar.month;
                const isToday = date === calendar.today;
                const isSelected = date === selectedDate;
                const past = date < calendar.today;
                const working = (day?.windows.length ?? 0) > 0;
                const free = day?.freeStartCount ?? 0;
                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={dayLabel(date, day, isToday)}
                    onClick={() => selectDate(date)}
                    className={`relative min-h-[3.5rem] sm:min-h-[4.25rem] rounded-2xl px-1 py-1.5 flex flex-col items-center justify-start gap-0.5 transition-all ${
                      isSelected
                        ? "bg-primary text-onPrimary shadow-[0_8px_20px_rgba(212,175,55,0.28)]"
                        : isToday
                          ? "bg-primary/10 border border-primary/40 hover:border-primary"
                          : working
                            ? "bg-background border border-outline hover:border-primary/60"
                            : "hover:bg-surfaceVariant/60"
                    } ${outside && !isSelected ? "opacity-45" : ""} ${past && !isSelected ? "text-onSurfaceVariant" : ""}`}
                  >
                    <span className={`text-sm font-bold leading-none ${isSelected ? "" : past ? "text-onSurfaceVariant" : ""}`}>
                      {dayOfMonth(date)}
                    </span>
                    {working && (
                      <span className={`hidden sm:block text-[10px] leading-tight truncate max-w-full ${isSelected ? "text-onPrimary/80" : "text-onSurfaceVariant"}`}>
                        {formatClock(day!.windows[0]!.startTime)}–{formatClock(day!.windows[day!.windows.length - 1]!.endTime)}
                      </span>
                    )}
                    <span className="flex gap-0.5 mt-auto mb-0.5 min-h-[6px]">
                      {working ? (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            free > 0 ? (isSelected ? "bg-onPrimary" : "bg-primary") : isSelected ? "bg-onPrimary/40" : "bg-outline"
                          }`}
                        />
                      ) : null}
                      {free > 8 && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-onPrimary" : "bg-primary"}`} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-5 text-xs text-onSurfaceVariant">
            <LegendDot className="bg-primary" label="Есть свободное время" />
            <LegendDot className="bg-outline" label="День занят" />
            <LegendDot className="border border-primary/50 bg-primary/10" label="Сегодня" />
          </div>
        </div>

        <aside className="bg-surface border border-outline/50 rounded-[1.75rem] p-5 sm:p-6 shadow-sm flex flex-col min-h-[22rem]">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Выбранный день</p>
          <h3 className="text-2xl font-serif font-bold mt-1">{humanDate(selectedDate)}</h3>
          {error && <p className="text-sm text-error mt-3">{error}</p>}

          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-center text-onSurfaceVariant py-10">
              В этот день мастер не открывал запись
            </div>
          ) : (
            <>
              <p className="text-sm text-onSurfaceVariant mt-3 inline-flex items-start gap-2">
                <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>Окна: {windowsLabel}</span>
              </p>
              <DayTimeline windows={selected.windows} busy={selected.busy} />

              {services.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-5">
                  {services.map((service) => {
                    const active = service.id === serviceId;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => setServiceId(service.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          active ? "bg-primary text-onPrimary border-primary" : "border-outline hover:border-primary/60"
                        }`}
                      >
                        {service.name} · {service.durationMinutes} мин
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="text-sm font-medium text-onSurfaceVariant mt-5 mb-3">
                Свободное время
                {usingPreview ? ` · слоты по ${calendar.previewDurationMinutes} мин` : ""}
              </p>
              {loadingStarts || loadingMonth ? (
                <p className="text-onSurfaceVariant text-sm">Обновляем слоты...</p>
              ) : starts.length === 0 ? (
                <p className="text-onSurfaceVariant bg-background border border-outline rounded-2xl px-4 py-6 text-center text-sm">
                  {selected.freeStartCount === 0 && usingPreview
                    ? "На этот день свободных стартов нет"
                    : "Нет окна подходящей длины для выбранной услуги"}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {starts.slice(0, 18).map((slot) => (
                    <span
                      key={`${slot.startTime}-${slot.endTime}`}
                      className="rounded-xl border border-outline bg-background py-2 text-center text-sm font-semibold"
                    >
                      {formatClock(slot.startTime)}
                    </span>
                  ))}
                </div>
              )}
              {starts.length > 18 && (
                <p className="text-xs text-onSurfaceVariant mt-2">Показаны первые 18 слотов</p>
              )}
            </>
          )}

          <button
            type="button"
            disabled={!canBook}
            onClick={() => openBooking(salonId, masterId, selectedDate)}
            className="mt-auto w-full bg-primary text-onPrimary font-bold py-3.5 rounded-2xl hover:bg-primaryVariant disabled:opacity-40 shadow-[0_4px_15px_rgba(212,175,55,0.22)]"
          >
            {canBook ? `Записаться на ${humanDate(selectedDate)}` : "На этот день запись недоступна"}
          </button>
        </aside>
      </div>
    </section>
  );
}

function dayLabel(date: string, day: CalendarDay | undefined, isToday: boolean) {
  const base = humanDate(date);
  if (isToday && !day) return `${base}, сегодня, выходной`;
  if (!day) return `${base}, выходной`;
  if (day.freeStartCount > 0) return `${base}, ${day.windows.length} окон, ${day.freeStartCount} свободных стартов`;
  return `${base}, рабочие окна есть, свободного времени нет`;
}
