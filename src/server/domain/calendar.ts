import { addDateOnly } from "@/lib/date-only";
import { dateOnly, zonedParts } from "@/server/domain/scheduling";

export { addDateOnly, eachDateOnly } from "@/lib/date-only";

export const PUBLIC_CALENDAR_PAST_MONTHS = 2;
export const PUBLIC_CALENDAR_FUTURE_MONTHS = 6;

export function utcRangeForDateOnly(date: string) {
  const from = new Date(`${date}T00:00:00.000Z`);
  const to = new Date(from.getTime() + 86_400_000);
  return { from, to };
}

export function isoDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateOnlyDiffDays(left: string, right: string) {
  const [ly, lm, ld] = left.split("-").map(Number);
  const [ry, rm, rd] = right.split("-").map(Number);
  return Math.round((Date.UTC(ly!, lm! - 1, ld!) - Date.UTC(ry!, rm! - 1, rd!)) / 86_400_000);
}

export function zonedWallClockToUtc(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = `${time}:00`.split(":").map(Number);
  let utc = Date.UTC(year!, month! - 1, day!, hour!, minute!, second ?? 0);
  for (let i = 0; i < 4; i += 1) {
    const parts = zonedParts(new Date(utc), timeZone);
    const actualDate = `${parts.year}-${parts.month}-${parts.day}`;
    const actualMinutes = parts.hour * 60 + parts.minute;
    const desiredMinutes = hour! * 60 + minute!;
    utc += (dateOnlyDiffDays(date, actualDate) * 24 * 60 + (desiredMinutes - actualMinutes)) * 60_000;
    utc += ((second ?? 0) - parts.second) * 1000;
  }
  return new Date(utc);
}

export function nextWallClockInZone(now: Date, timeZone: string, hour: number, minute: number) {
  const today = dateOnly(now, timeZone);
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const sameDay = zonedWallClockToUtc(today, time, timeZone);
  if (sameDay.getTime() > now.getTime()) return sameDay;
  return zonedWallClockToUtc(addDateOnly(today, 1), time, timeZone);
}

export function yesterdayInZone(now: Date, timeZone: string) {
  return addDateOnly(dateOnly(now, timeZone), -1);
}
