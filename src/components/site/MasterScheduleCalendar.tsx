"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { BookingAccessNote } from "@/components/site/BookingAccessNote";
import { useBooking } from "@/components/BookingProvider";
import { apiFetch } from "@/lib/client-api";
import { bookingCallToAction } from "@/lib/booking-access";
import { addDateOnly, addMonths, dayOfMonth, eachDateOnly, weekdayMonday0, yearMonthOf } from "@/lib/date-only";
import { humanDate, monthTitle, streetAddress, WEEKDAYS_SHORT } from "@/lib/locale";
import { DayTimeline, formatClock, LegendDot } from "@/components/site/schedule/SchedulePrimitives";

type Interval = { startTime: string; endTime: string };
type WorkplaceDay = {
  salonId: string;
  date: string;
  windows: Interval[];
  busy: Interval[];
  starts: Interval[];
  freeStartCount: number;
};
type CalendarDay = {
  date: string;
  workingSalonCount: number;
  freeSalonCount: number;
  freeStartCount: number;
  workplaces: WorkplaceDay[];
};
type Workplace = {
  id: string;
  name: string;
  city: string;
  street: string;
  building: string;
  phone: string | null;
  openingTime: string | null;
  closingTime: string | null;
};
export type MasterCalendarData = {
  month: string;
  from: string;
  to: string;
  today: string;
  previewDurationMinutes: number;
  minMonth: string;
  maxMonth: string;
  workplaces: Workplace[];
  days: CalendarDay[];
};
type ServiceOption = { id: string; name: string; durationMinutes: number };

function summarizeDay(workplaces: WorkplaceDay[]): Omit<CalendarDay, "date" | "workplaces"> {
  return {
    workingSalonCount: workplaces.length,
    freeSalonCount: workplaces.filter((item) => item.freeStartCount > 0).length,
    freeStartCount: workplaces.reduce((sum, item) => sum + item.freeStartCount, 0),
  };
}

function pickDate(calendar: MasterCalendarData, preferred?: string, salonId?: string) {
  const matches = (day: CalendarDay) =>
    !salonId || day.workplaces.some((item) => item.salonId === salonId && item.freeStartCount > 0);
  if (preferred && preferred >= calendar.from && preferred < calendar.to) return preferred;
  const nextFree = calendar.days.find((day) => day.date >= calendar.today && matches(day) && day.freeStartCount > 0);
  if (nextFree) return nextFree.date;
  if (calendar.today >= calendar.from && calendar.today < calendar.to) return calendar.today;
  return `${calendar.month}-01`;
}

function firstWindowRange(day: WorkplaceDay | undefined) {
  if (!day || day.windows.length === 0) return null;
  return `${formatClock(day.windows[0]!.startTime)}–${formatClock(day.windows[day.windows.length - 1]!.endTime)}`;
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
  const { openBooking, access } = useBooking();
  const shortest = useMemo(
    () => services.slice().sort((left, right) => left.durationMinutes - right.durationMinutes)[0] ?? null,
    [services],
  );
  const [calendar, setCalendar] = useState(initialCalendar);
  const [workplaceId, setWorkplaceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => pickDate(initialCalendar));
  const [serviceId, setServiceId] = useState(shortest?.id ?? "");
  const [customStarts, setCustomStarts] = useState<Interval[] | null>(null);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingStarts, setLoadingStarts] = useState(false);
  const [error, setError] = useState("");
  const monthRequest = useRef(0);

  const roster = useMemo(() => new Map(calendar.workplaces.map((item) => [item.id, item])), [calendar.workplaces]);
  const dates = useMemo(() => eachDateOnly(calendar.from, calendar.to), [calendar.from, calendar.to]);
  const daysByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const day of calendar.days) {
      const workplaces = workplaceId ? day.workplaces.filter((item) => item.salonId === workplaceId) : day.workplaces;
      if (workplaceId && workplaces.length === 0) continue;
      map.set(day.date, { ...day, workplaces, ...summarizeDay(workplaces) });
    }
    return map;
  }, [calendar.days, workplaceId]);
  const selected = daysByDate.get(selectedDate);
  const usingPreview = !serviceId || serviceId === shortest?.id;
  const previewStarts = selected?.workplaces.flatMap((item) => item.starts) ?? [];
  const starts = usingPreview ? previewStarts : (customStarts ?? []);
  const slotAvailable =
    selectedDate >= calendar.today &&
    !loadingStarts &&
    (usingPreview ? (selected?.freeStartCount ?? 0) > 0 : (customStarts?.length ?? 0) > 0);
  const bookSalonId = selected?.workplaces.find((item) => item.freeStartCount > 0)?.salonId ?? salonId;

  useEffect(() => {
    if (!workplaceId || daysByDate.has(selectedDate)) return;
    setSelectedDate(pickDate(calendar, undefined, workplaceId));
  }, [calendar, daysByDate, workplaceId, selectedDate]);

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
      setSelectedDate(pickDate(calendar, nextDate, workplaceId));
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
      setSelectedDate(pickDate(next, nextDate, workplaceId));
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

  return (
    <section className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold">Расписание</h2>
          <p className="text-onSurfaceVariant mt-1">Где и когда мастер принимает клиентов</p>
        </div>
        <button
          type="button"
          onClick={() => void loadMonth(yearMonthOf(calendar.today), calendar.today)}
          className="text-sm font-semibold text-primary hover:underline self-start sm:self-auto"
        >
          Сегодня
        </button>
      </div>

      <BookingAccessNote />

      {calendar.workplaces.length > 1 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          <FilterChip active={!workplaceId} onClick={() => setWorkplaceId("")} label="Все заведения" />
          {calendar.workplaces.map((workplace) => (
            <FilterChip
              key={workplace.id}
              active={workplaceId === workplace.id}
              onClick={() => setWorkplaceId(workplace.id)}
              label={workplace.name}
            />
          ))}
        </div>
      )}

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
                const working = (day?.workingSalonCount ?? 0) > 0;
                const free = day?.freeSalonCount ?? 0;
                const range = firstWindowRange(day?.workplaces[0]);
                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={dayLabel(date, day, roster, isToday)}
                    onClick={() => selectDate(date)}
                    className={`relative min-h-11 sm:min-h-[4.25rem] rounded-xl sm:rounded-2xl px-0.5 sm:px-1 py-1 sm:py-1.5 flex flex-col items-center justify-start gap-0.5 transition-all ${
                      isSelected
                        ? "bg-primary text-onPrimary shadow-[0_8px_20px_rgba(212,175,55,0.28)]"
                        : isToday
                          ? "bg-primary/10 border border-primary/40 hover:border-primary"
                          : working
                            ? "bg-background border border-outline hover:border-primary/60"
                            : "hover:bg-surfaceVariant/60"
                    } ${outside && !isSelected ? "opacity-45" : ""} ${past && !isSelected ? "text-onSurfaceVariant" : ""}`}
                  >
                    <span className={`text-xs sm:text-sm font-bold leading-none ${isSelected ? "" : past ? "text-onSurfaceVariant" : ""}`}>
                      {dayOfMonth(date)}
                    </span>
                    {working && range && (
                      <span className={`hidden sm:block text-[10px] leading-tight truncate max-w-full ${isSelected ? "text-onPrimary/80" : "text-onSurfaceVariant"}`}>
                        {range}
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
                      {free > 1 && (
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

        <aside className="bg-surface border border-outline/50 rounded-[1.75rem] p-4 sm:p-6 shadow-sm flex flex-col min-h-[18rem]">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Выбранный день</p>
          <h3 className="text-2xl font-serif font-bold mt-1">{humanDate(selectedDate)}</h3>
          {error && <p className="text-sm text-error mt-3">{error}</p>}

          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-center text-onSurfaceVariant py-10">
              В этот день мастер не открывал запись
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-3">
                {selected.workplaces.map((item) => {
                  const workplace = roster.get(item.salonId);
                  if (!workplace) return null;
                  const bookable = selectedDate >= calendar.today && item.freeStartCount > 0;
                  return (
                    <article key={item.salonId} className="rounded-3xl border border-outline bg-background p-4">
                      <Link href={`/salons/${workplace.id}`} className="font-bold hover:text-primary block">
                        {workplace.name}
                      </Link>
                      <p className="flex items-start gap-1.5 text-xs text-onSurfaceVariant mt-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <span className="min-w-0 break-words">{streetAddress(workplace)}</span>
                      </p>
                      <p className="flex items-start gap-1.5 text-xs text-onSurfaceVariant mt-1.5 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <span className="min-w-0 break-words">
                          {item.windows.map((window) => `${formatClock(window.startTime)}–${formatClock(window.endTime)}`).join(", ")}
                        </span>
                      </p>
                      <DayTimeline windows={item.windows} busy={item.busy} compact />
                      <button
                        type="button"
                        disabled={!bookable}
                        onClick={() => openBooking(workplace.id, masterId, selectedDate)}
                        className="mt-3 w-full bg-primary text-onPrimary text-sm font-bold py-2 rounded-xl hover:bg-primaryVariant disabled:opacity-40"
                      >
                        {bookable
                          ? bookingCallToAction(access, "Записаться в это заведение")
                          : "Нет свободного времени"}
                      </button>
                    </article>
                  );
                })}
              </div>

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
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
            disabled={!slotAvailable}
            onClick={() => openBooking(bookSalonId, masterId, selectedDate)}
            className="mt-auto w-full bg-primary text-onPrimary font-bold py-3.5 rounded-2xl hover:bg-primaryVariant disabled:opacity-40 shadow-[0_4px_15px_rgba(212,175,55,0.22)]"
          >
            {slotAvailable
              ? bookingCallToAction(access, `Записаться на ${humanDate(selectedDate)}`)
              : "На этот день запись недоступна"}
          </button>
        </aside>
      </div>
    </section>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
        active ? "bg-primary text-onPrimary border-primary" : "border-outline hover:border-primary/60"
      }`}
    >
      {label}
    </button>
  );
}

function dayLabel(date: string, day: CalendarDay | undefined, roster: Map<string, Workplace>, isToday: boolean) {
  const base = humanDate(date);
  if (!day) return `${base}${isToday ? ", сегодня" : ""}, выходной`;
  const names = day.workplaces
    .map((item) => roster.get(item.salonId)?.name)
    .filter(Boolean)
    .join(", ");
  if (day.freeStartCount > 0) return `${base}, свободно в ${names}`;
  return `${base}, принимает в ${names}, свободного времени нет`;
}
