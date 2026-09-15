import { err, ok, type Result } from "@/server/domain/result";
import {
  PUBLIC_CALENDAR_FUTURE_MONTHS,
  PUBLIC_CALENDAR_PAST_MONTHS,
} from "@/server/domain/calendar";
import { availableSlotCalculator, SALON_CARD_PREVIEW_MINUTES } from "@/server/domain/scheduling";
import { AppointmentStatus, TimeSlotStatus, type Appointment, type MasterTimeSlot, type Service } from "@/server/domain/types";
import { addMonths, monthOffset, paddedMonthRange, parseYearMonth, yearMonthOf } from "@/lib/date-only";

export type PublicCalendarInterval = {
  startTime: string;
  endTime: string;
};

export type PublicCalendarDay = {
  date: string;
  windows: PublicCalendarInterval[];
  busy: PublicCalendarInterval[];
  starts: PublicCalendarInterval[];
  freeStartCount: number;
};

export type PublicCalendarMonthMeta = {
  month: string;
  from: string;
  to: string;
  today: string;
  minMonth: string;
  maxMonth: string;
};

export function previewDurationMinutes(services: Pick<Service, "durationMinutes">[]) {
  const durations = services.map((item) => item.durationMinutes).filter((item) => item > 0);
  return durations.length ? Math.min(...durations) : SALON_CARD_PREVIEW_MINUTES;
}

export function resolvePublicCalendarMonth(today: string, month?: string | null): Result<PublicCalendarMonthMeta> {
  const resolved = month?.trim() || yearMonthOf(today);
  if (!parseYearMonth(resolved)) return err("Некорректный месяц");
  const todayMonth = yearMonthOf(today);
  const offset = monthOffset(todayMonth, resolved);
  if (offset < -PUBLIC_CALENDAR_PAST_MONTHS || offset > PUBLIC_CALENDAR_FUTURE_MONTHS) {
    return err("Календарь доступен только на ближайшие месяцы");
  }
  const range = paddedMonthRange(resolved);
  return ok({
    month: resolved,
    from: range.from,
    to: range.to,
    today,
    minMonth: addMonths(todayMonth, -PUBLIC_CALENDAR_PAST_MONTHS),
    maxMonth: addMonths(todayMonth, PUBLIC_CALENDAR_FUTURE_MONTHS),
  });
}

export function utcRangeForCalendar(fromInclusive: string, toExclusive: string) {
  return {
    from: new Date(`${fromInclusive}T00:00:00.000Z`),
    to: new Date(`${toExclusive}T00:00:00.000Z`),
  };
}

export function appointmentDateOnly(appointment: Pick<Appointment, "appointmentDate">) {
  return appointment.appointmentDate.toISOString().slice(0, 10);
}

export function activeWindows(slots: MasterTimeSlot[]) {
  return slots.filter((slot) => slot.status !== TimeSlotStatus.Cancelled);
}

export function activeAppointments(items: Appointment[]) {
  return items.filter((item) => item.status !== AppointmentStatus.Cancelled);
}

export function buildPublicDaySchedule(
  date: string,
  windows: MasterTimeSlot[],
  appointments: Array<Pick<Appointment, "timeSlotId" | "startTime" | "endTime">>,
  durationMinutes: number,
  utcNow: Date,
): PublicCalendarDay {
  const dayWindows = [...windows].sort((left, right) => left.startTime.localeCompare(right.startTime));
  const busyByWindow = new Map(dayWindows.map((window) => [window.id, [] as PublicCalendarInterval[]]));
  for (const appointment of appointments) {
    const busy = busyByWindow.get(appointment.timeSlotId);
    if (busy) busy.push({ startTime: appointment.startTime, endTime: appointment.endTime });
  }
  const starts = availableSlotCalculator.calculate(dayWindows, busyByWindow, durationMinutes, utcNow);
  const windowIds = new Set(dayWindows.map((window) => window.id));
  return {
    date,
    windows: dayWindows.map((window) => ({ startTime: window.startTime, endTime: window.endTime })),
    busy: appointments
      .filter((item) => windowIds.has(item.timeSlotId))
      .map((item) => ({ startTime: item.startTime, endTime: item.endTime }))
      .sort((left, right) => left.startTime.localeCompare(right.startTime)),
    starts: starts.map((item) => ({ startTime: item.startTime, endTime: item.endTime })),
    freeStartCount: starts.length,
  };
}

export function buildPublicDaysForMaster(
  windows: MasterTimeSlot[],
  appointments: Appointment[],
  durationMinutes: number,
  utcNow: Date,
) {
  const windowsByDate = new Map<string, MasterTimeSlot[]>();
  for (const window of windows) {
    const list = windowsByDate.get(window.scheduleDate) ?? [];
    list.push(window);
    windowsByDate.set(window.scheduleDate, list);
  }
  const appointmentsByDate = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    const date = appointmentDateOnly(appointment);
    const list = appointmentsByDate.get(date) ?? [];
    list.push(appointment);
    appointmentsByDate.set(date, list);
  }
  const days = [...windowsByDate.entries()].map(([date, dayWindows]) =>
    buildPublicDaySchedule(date, dayWindows, appointmentsByDate.get(date) ?? [], durationMinutes, utcNow),
  );
  days.sort((left, right) => left.date.localeCompare(right.date));
  return days;
}
