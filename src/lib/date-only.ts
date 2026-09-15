export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function isDateOnly(value: string) {
  return DATE_ONLY_PATTERN.test(value);
}

export function isYearMonth(value: string) {
  return parseYearMonth(value) !== null;
}

export function addDateOnly(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year!, month! - 1, day! + days));
  return utc.toISOString().slice(0, 10);
}

export function eachDateOnly(fromInclusive: string, toExclusive: string) {
  const dates: string[] = [];
  for (let cursor = fromInclusive; cursor < toExclusive; cursor = addDateOnly(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

export function yearMonthOf(date: string) {
  return date.slice(0, 7);
}

export function parseYearMonth(value: string) {
  if (!YEAR_MONTH_PATTERN.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function addMonths(yearMonth: string, delta: number) {
  const parsed = parseYearMonth(yearMonth);
  if (!parsed) return yearMonth;
  const index = parsed.year * 12 + (parsed.month - 1) + delta;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthOffset(fromYearMonth: string, toYearMonth: string) {
  const from = parseYearMonth(fromYearMonth);
  const to = parseYearMonth(toYearMonth);
  if (!from || !to) return 0;
  return (to.year - from.year) * 12 + (to.month - from.month);
}

export function weekdayMonday0(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year!, month! - 1, day!)).getUTCDay();
  return weekday === 0 ? 6 : weekday - 1;
}

export function paddedMonthRange(yearMonth: string) {
  const first = `${yearMonth}-01`;
  const nextMonth = `${addMonths(yearMonth, 1)}-01`;
  const last = addDateOnly(nextMonth, -1);
  return {
    from: addDateOnly(first, -weekdayMonday0(first)),
    to: addDateOnly(last, 7 - weekdayMonday0(last)),
  };
}

export function dayOfMonth(date: string) {
  return Number(date.slice(8, 10));
}
