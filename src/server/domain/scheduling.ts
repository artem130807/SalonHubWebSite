import { err, okVoid, type Result } from "@/server/domain/result";
import type { AvailableStart, BusyInterval, WorkingWindow } from "@/server/domain/types";

export const MIN_LEAD_TIME_MINUTES = 15;
export const MAX_PREVIEW_SLOTS = 4096;
export const SALON_CARD_PREVIEW_MINUTES = 40;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getAppTimeZone() {
  return process.env.APP_TIMEZONE ?? "Europe/Moscow";
}

export function isValidClockTime(value: string) {
  return TIME_PATTERN.test(value);
}

export function normalizeClockTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)/);
  if (!match) return value.trim();
  const hours = Number(match[1]);
  if (hours > 23) return value.trim();
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

export function isValidDateOnly(value: string) {
  return DATE_PATTERN.test(value);
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export function dateOnly(date: Date, timeZone = getAppTimeZone()): string {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function roundUpToMinute(date: Date, timeZone = getAppTimeZone()): number {
  const parts = zonedParts(date, timeZone);
  let minutes = parts.hour * 60 + parts.minute;
  if (parts.second > 0 || date.getMilliseconds() > 0) {
    minutes += 1;
  }
  return minutes;
}

export function addMinutes(time: string, durationMinutes: number): string | null {
  const end = toMinutes(time) + durationMinutes;
  if (end > 24 * 60) return null;
  return fromMinutes(end);
}

export class AvailableSlotCalculator {
  calculate(
    windows: WorkingWindow[],
    busyByWindow: Map<string, BusyInterval[]>,
    serviceDurationMinutes: number,
    utcNow: Date,
  ): AvailableStart[] {
    if (serviceDurationMinutes <= 0 || windows.length === 0) return [];

    const segments = this.buildFreeSegments(
      windows,
      busyByWindow,
      serviceDurationMinutes,
      utcNow,
    );
    const available: AvailableStart[] = [];
    for (const segment of segments) {
      this.addPreviewSlots(available, segment, serviceDurationMinutes);
    }
    return available.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }

  countStarts(
    windows: WorkingWindow[],
    busyByWindow: Map<string, BusyInterval[]>,
    serviceDurationMinutes: number,
    utcNow: Date,
  ): number {
    return this.calculate(windows, busyByWindow, serviceDurationMinutes, utcNow).length;
  }

  private buildFreeSegments(
    windows: WorkingWindow[],
    busyByWindow: Map<string, BusyInterval[]>,
    serviceDurationMinutes: number,
    utcNow: Date,
  ) {
    const today = dateOnly(utcNow);
    const earliestToday = roundUpToMinute(utcNow) + MIN_LEAD_TIME_MINUTES;
    const ordered = [...windows].sort(
      (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
    );
    const free: { window: WorkingWindow; start: number; end: number }[] = [];

    for (const window of ordered) {
      let segmentStart = toMinutes(window.startTime);
      const segmentEnd = toMinutes(window.endTime);

      if (window.scheduleDate < today) continue;

      if (window.scheduleDate === today && segmentStart < earliestToday) {
        segmentStart = earliestToday;
        if (segmentEnd <= segmentStart || segmentEnd - segmentStart < serviceDurationMinutes) {
          continue;
        }
      }

      const busy = [...(busyByWindow.get(window.id) ?? [])].sort(
        (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
      );

      if (busy.length === 0) {
        free.push({ window, start: segmentStart, end: segmentEnd });
        continue;
      }

      let previousEnd = segmentStart;
      for (const appointment of busy) {
        const busyStart = Math.max(toMinutes(appointment.startTime), segmentStart);
        const busyEnd = Math.min(toMinutes(appointment.endTime), segmentEnd);
        if (busyEnd <= previousEnd) continue;
        if (busyStart <= previousEnd) {
          previousEnd = busyEnd;
          continue;
        }
        if (busyStart - previousEnd >= serviceDurationMinutes) {
          free.push({ window, start: previousEnd, end: busyStart });
        }
        previousEnd = busyEnd;
      }

      if (segmentEnd - previousEnd >= serviceDurationMinutes) {
        free.push({ window, start: previousEnd, end: segmentEnd });
      }
    }

    return free;
  }

  private addPreviewSlots(
    available: AvailableStart[],
    segment: { window: WorkingWindow; start: number; end: number },
    step: number,
  ) {
    let generated = 0;
    for (let t = segment.start; t + step <= segment.end; t += step) {
      if (++generated > MAX_PREVIEW_SLOTS) break;
      available.push({
        sourceWindowId: segment.window.id,
        masterId: segment.window.masterId,
        date: segment.window.scheduleDate,
        startTime: fromMinutes(t),
        endTime: fromMinutes(t + step),
      });
    }
  }
}

export class AppointmentSchedulingRules {
  validate(input: {
    requestedMasterId: string;
    windowMasterId: string;
    windowDate: string;
    appointmentDate: string;
    windowStart: string;
    windowEnd: string;
    startTime: string;
    serviceDurationMinutes: number;
    masterOffersService: boolean;
    existing: BusyInterval[];
    utcNow: Date;
  }): Result {
    if (!input.masterOffersService) {
      return err("Выбранная услуга недоступна у этого мастера");
    }
    if (input.serviceDurationMinutes <= 0) {
      return err("Некорректная длительность услуги");
    }
    if (!isValidClockTime(input.startTime) || !isValidDateOnly(input.appointmentDate)) {
      return err("Некорректные дата или время записи");
    }

    const today = dateOnly(input.utcNow);
    if (input.appointmentDate < today) {
      return err("Нельзя записаться на прошедшую дату.");
    }
    if (input.appointmentDate === today) {
      const earliest = roundUpToMinute(input.utcNow) + MIN_LEAD_TIME_MINUTES;
      if (toMinutes(input.startTime) < earliest) {
        return err("Выбранное время уже недоступно. Обновите слоты.");
      }
    }
    if (input.windowMasterId !== input.requestedMasterId) {
      return err("Слот не принадлежит выбранному мастеру.");
    }
    if (input.windowDate !== input.appointmentDate) {
      return err("Слот не принадлежит выбранной дате.");
    }

    const end = addMinutes(input.startTime, input.serviceDurationMinutes);
    if (!end) {
      return err("Время записи выходит за пределы выбранного слота.");
    }

    const startMin = toMinutes(input.startTime);
    const endMin = toMinutes(end);
    if (startMin < toMinutes(input.windowStart) || endMin > toMinutes(input.windowEnd)) {
      return err("Время записи выходит за пределы выбранного слота.");
    }

    const overlap = input.existing.some(
      (busy) => startMin < toMinutes(busy.endTime) && toMinutes(busy.startTime) < endMin,
    );
    if (overlap) {
      return err("Выбранный интервал уже занят. Обновите доступные слоты.");
    }

    return okVoid();
  }
}

export class TimeSlotCapacityRules {
  constructor(private readonly calculator = new AvailableSlotCalculator()) {}

  isFullyBooked(
    window: WorkingWindow,
    busy: BusyInterval[],
    salonServiceDurations: number[],
    utcNow: Date,
  ): boolean {
    if (salonServiceDurations.length === 0) return true;
    const windows = [window];
    const busyMap = new Map<string, BusyInterval[]>([[window.id, busy]]);
    return salonServiceDurations.every(
      (duration) => this.calculator.countStarts(windows, busyMap, duration, utcNow) === 0,
    );
  }
}

export const availableSlotCalculator = new AvailableSlotCalculator();
export const appointmentSchedulingRules = new AppointmentSchedulingRules();
export const timeSlotCapacityRules = new TimeSlotCapacityRules(availableSlotCalculator);
