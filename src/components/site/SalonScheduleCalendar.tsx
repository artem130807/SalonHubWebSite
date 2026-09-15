"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBooking } from "@/components/BookingProvider";
import { apiFetch } from "@/lib/client-api";
import { addDateOnly, addMonths, dayOfMonth, eachDateOnly, weekdayMonday0, yearMonthOf } from "@/lib/date-only";
import { humanDate, monthTitle, WEEKDAYS_SHORT } from "@/lib/locale";
import { DayTimeline, formatClock, LegendDot } from "@/components/site/schedule/SchedulePrimitives";

type Interval = { startTime: string; endTime: string };
type MasterDay = {
  masterId: string;
  date: string;
  windows: Interval[];
  busy: Interval[];
  starts: Interval[];
  freeStartCount: number;
};
type SalonDay = {
  date: string;
  workingMasterCount: number;
  freeMasterCount: number;
  freeStartCount: number;
  masters: MasterDay[];
};
type RosterMaster = {
  id: string;
  userName: string;
  specialization: string | null;
  avatarUrl: string | null;
  rating: number;
};
export type SalonCalendarData = {
  month: string;
  from: string;
  to: string;
  today: string;
  previewDurationMinutes: number;
  minMonth: string;
  maxMonth: string;
  masters: RosterMaster[];
  days: SalonDay[];
};

function summarizeDay(masters: MasterDay[]): Omit<SalonDay, "date" | "masters"> {
  return {
    workingMasterCount: masters.length,
    freeMasterCount: masters.filter((item) => item.freeStartCount > 0).length,
    freeStartCount: masters.reduce((sum, item) => sum + item.freeStartCount, 0),
  };
}

function pickDate(calendar: SalonCalendarData, preferred?: string, masterId?: string) {
  const matches = (day: SalonDay) =>
    !masterId || day.masters.some((item) => item.masterId === masterId && item.freeStartCount > 0);
  if (preferred && preferred >= calendar.from && preferred < calendar.to) return preferred;
  const nextFree = calendar.days.find((day) => day.date >= calendar.today && matches(day) && day.freeStartCount > 0);
  if (nextFree) return nextFree.date;
  if (calendar.today >= calendar.from && calendar.today < calendar.to) return calendar.today;
  return `${calendar.month}-01`;
}

export function SalonScheduleCalendar({
  salonId,
  initialCalendar,
}: {
  salonId: string;
  initialCalendar: SalonCalendarData;
}) {
  const { openBooking } = useBooking();
  const [calendar, setCalendar] = useState(initialCalendar);
  const [masterId, setMasterId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => pickDate(initialCalendar));
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [error, setError] = useState("");
  const monthRequest = useRef(0);

  const roster = useMemo(() => new Map(calendar.masters.map((master) => [master.id, master])), [calendar.masters]);
  const dates = useMemo(() => eachDateOnly(calendar.from, calendar.to), [calendar.from, calendar.to]);
  const daysByDate = useMemo(() => {
    const map = new Map<string, SalonDay>();
    for (const day of calendar.days) {
      const masters = masterId ? day.masters.filter((item) => item.masterId === masterId) : day.masters;
      if (masters.length === 0) continue;
      map.set(day.date, { ...day, masters, ...summarizeDay(masters) });
    }
    return map;
  }, [calendar.days, masterId]);
  const selected = daysByDate.get(selectedDate);
  const canBookAnyone = selectedDate >= calendar.today && (selected?.freeMasterCount ?? 0) > 0;

  useEffect(() => {
    if (!masterId || daysByDate.has(selectedDate)) return;
    setSelectedDate(pickDate(calendar, undefined, masterId));
  }, [calendar, daysByDate, masterId, selectedDate]);

  async function loadMonth(month: string, nextDate?: string) {
    if (month < calendar.minMonth || month > calendar.maxMonth) return;
    if (month === calendar.month && nextDate) {
      setSelectedDate(pickDate(calendar, nextDate, masterId));
      return;
    }
    const request = ++monthRequest.current;
    setLoadingMonth(true);
    setError("");
    try {
      const response = await apiFetch(`/api/salons/${salonId}/calendar?month=${month}`);
      const payload = await response.json();
      if (request !== monthRequest.current) return;
      if (!response.ok) {
        setError(payload?.error ?? "Не удалось открыть месяц");
        return;
      }
      const next = payload as SalonCalendarData;
      setCalendar(next);
      setSelectedDate(pickDate(next, nextDate, masterId));
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
    const move: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
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
          <h2 className="text-3xl font-serif font-bold">Расписание салона</h2>
          <p className="text-onSurfaceVariant mt-1">Свободные и занятые окна всех мастеров заведения</p>
        </div>
        <button
          type="button"
          onClick={() => void loadMonth(yearMonthOf(calendar.today), calendar.today)}
          className="text-sm font-semibold text-primary hover:underline self-start sm:self-auto"
        >
          Сегодня
        </button>
      </div>

      {calendar.masters.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip active={!masterId} onClick={() => setMasterId("")} label="Все мастера" />
          {calendar.masters.map((master) => (
            <FilterChip
              key={master.id}
              active={masterId === master.id}
              onClick={() => setMasterId(master.id)}
              label={master.userName}
            />
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] gap-5">
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
            aria-label={`Календарь салона, ${monthTitle(calendar.month)}`}
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
                const working = (day?.workingMasterCount ?? 0) > 0;
                const free = day?.freeMasterCount ?? 0;
                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={salonDayLabel(date, day, isToday)}
                    onClick={() => selectDate(date)}
                    className={`relative min-h-[3.5rem] sm:min-h-[4.35rem] rounded-2xl px-1 py-1.5 flex flex-col items-center justify-start gap-0.5 transition-all ${
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
                      <span className={`hidden sm:block text-[10px] leading-tight ${isSelected ? "text-onPrimary/80" : "text-onSurfaceVariant"}`}>
                        {free}/{day!.workingMasterCount}
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
            <LegendDot className="bg-primary" label="Есть свободные мастера" />
            <LegendDot className="bg-outline" label="Все окна заняты" />
            <span>На дне: свободно / работают</span>
          </div>
        </div>

        <aside className="bg-surface border border-outline/50 rounded-[1.75rem] p-5 sm:p-6 shadow-sm flex flex-col min-h-[22rem] max-h-[40rem] overflow-hidden">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Выбранный день</p>
          <h3 className="text-2xl font-serif font-bold mt-1">{humanDate(selectedDate)}</h3>
          {error && <p className="text-sm text-error mt-3">{error}</p>}
          {loadingMonth && <p className="text-sm text-onSurfaceVariant mt-3">Обновляем расписание...</p>}

          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-center text-onSurfaceVariant py-10">
              В этот день никто не открывал запись
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
              {selected.masters.map((item) => {
                const master = roster.get(item.masterId);
                if (!master) return null;
                const bookable = selectedDate >= calendar.today && item.freeStartCount > 0;
                return (
                  <article key={item.masterId} className="rounded-3xl border border-outline bg-background p-4">
                    <div className="flex items-start gap-3">
                      <Link
                        href={`/masters/${master.id}`}
                        className="w-11 h-11 rounded-full bg-primary/10 overflow-hidden shrink-0 flex items-center justify-center text-primary font-serif text-lg font-bold"
                      >
                        {master.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={master.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          master.userName.slice(0, 1)
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link href={`/masters/${master.id}`} className="font-bold hover:text-primary truncate block">
                              {master.userName}
                            </Link>
                            <p className="text-xs text-onSurfaceVariant">{master.specialization || "Мастер"}</p>
                          </div>
                          <span
                            className={`text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 ${
                              item.freeStartCount > 0 ? "bg-primary/15 text-primary" : "bg-outline/40 text-onSurfaceVariant"
                            }`}
                          >
                            {item.freeStartCount > 0 ? `${item.freeStartCount} слотов` : "занято"}
                          </span>
                        </div>
                        <p className="text-xs text-onSurfaceVariant mt-1">
                          {item.windows.map((window) => `${formatClock(window.startTime)}–${formatClock(window.endTime)}`).join(", ")}
                        </p>
                        <DayTimeline windows={item.windows} busy={item.busy} compact />
                        {item.starts.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.starts.slice(0, 8).map((slot) => (
                              <span
                                key={`${item.masterId}-${slot.startTime}`}
                                className="px-2 py-1 rounded-lg border border-outline text-[11px] font-semibold bg-surface"
                              >
                                {formatClock(slot.startTime)}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          type="button"
                          disabled={!bookable}
                          onClick={() => openBooking(salonId, master.id, selectedDate)}
                          className="mt-3 w-full bg-primary text-onPrimary text-sm font-bold py-2 rounded-xl hover:bg-primaryVariant disabled:opacity-40"
                        >
                          {bookable ? "Записаться к мастеру" : "Нет свободного времени"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {selected && !masterId && (
            <button
              type="button"
              disabled={!canBookAnyone}
              onClick={() => openBooking(salonId, undefined, selectedDate)}
              className="mt-4 w-full border border-outline font-bold py-3 rounded-2xl hover:border-primary hover:text-primary disabled:opacity-40"
            >
              {canBookAnyone ? `Записаться на ${humanDate(selectedDate)}` : "На этот день запись недоступна"}
            </button>
          )}
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
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
        active ? "bg-primary text-onPrimary border-primary" : "border-outline hover:border-primary/60"
      }`}
    >
      {label}
    </button>
  );
}

function salonDayLabel(date: string, day: SalonDay | undefined, isToday: boolean) {
  const base = humanDate(date);
  if (!day) return `${base}${isToday ? ", сегодня" : ""}, никто не работает`;
  if (day.freeMasterCount > 0) {
    return `${base}, работают ${day.workingMasterCount}, свободно у ${day.freeMasterCount}`;
  }
  return `${base}, работают ${day.workingMasterCount}, свободного времени нет`;
}
