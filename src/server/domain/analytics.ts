import { addDateOnly, addMonths, weekdayMonday0, yearMonthOf } from "@/lib/date-only";
import { utcRangeForDateOnly } from "@/server/domain/calendar";
import { TimeSlotStatus, AppointmentStatus } from "@/server/domain/types";
import { dateOnly, toMinutes } from "@/server/domain/scheduling";
import { tallyAppointments } from "@/server/domain/stats";
import { WEEKDAYS_SHORT } from "@/lib/locale";

export type AnalyticsPeriod = "week" | "month" | "year";

export type AnalyticsAppointment = {
  id: string;
  status: string;
  price: number;
  startTime: string;
  endTime: string;
  appointmentDate: Date;
  masterId: string;
  masterName: string;
  serviceId: string;
  serviceName: string;
  clientId: string | null;
  guestName?: string | null;
};

export type AnalyticsWindow = {
  id: string;
  masterId: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  status: string;
};

export type AnalyticsReview = {
  appointmentId: string;
  salonRating: number;
  masterRating: number;
  createdAt: Date;
};

export type RankedItem = {
  id: string;
  name: string;
  count: number;
  revenue: number;
  share: number;
};

export type HourBucket = { hour: number; count: number };
export type WeekdayBucket = { weekday: number; label: string; count: number; revenue: number };

export type AnalyticsInsight = {
  id: string;
  tone: "ok" | "warn" | "info";
  title: string;
  detail: string;
};

export type AnalyticsKpis = {
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

export type AnalyticsReport = {
  period: AnalyticsPeriod;
  from: string;
  to: string;
  scope: "salon" | "master";
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  revenue: number;
  kpis: AnalyticsKpis;
  services: RankedItem[];
  masters: RankedItem[];
  hours: HourBucket[];
  weekdays: WeekdayBucket[];
  insights: AnalyticsInsight[];
};

export function analyticsPeriodRange(period: AnalyticsPeriod, date: Date) {
  const today = dateOnly(date);
  if (period === "year") {
    const year = today.slice(0, 4);
    return rangeBetween(`${year}-01-01`, `${Number(year) + 1}-01-01`, period);
  }
  if (period === "month") {
    const month = yearMonthOf(today);
    return rangeBetween(`${month}-01`, `${addMonths(month, 1)}-01`, period);
  }
  const from = addDateOnly(today, -weekdayMonday0(today));
  return rangeBetween(from, addDateOnly(from, 7), period);
}

function rangeBetween(fromDate: string, toDate: string, period: AnalyticsPeriod) {
  return {
    from: utcRangeForDateOnly(fromDate).from,
    to: utcRangeForDateOnly(toDate).from,
    period,
  };
}

export function buildAnalyticsReport(input: {
  period: AnalyticsPeriod;
  from: Date;
  to: Date;
  scope: "salon" | "master";
  appointments: AnalyticsAppointment[];
  windows: AnalyticsWindow[];
  reviews: AnalyticsReview[];
  minSellableMinutes?: number;
}): AnalyticsReport {
  const appointments = input.appointments;
  const totals = tallyAppointments(appointments);
  const confirmed = appointments.filter((item) => item.status === AppointmentStatus.Confirmed);
  const cancelled = appointments.filter((item) => item.status === AppointmentStatus.Cancelled);
  const completed = appointments.filter((item) => item.status === AppointmentStatus.Completed);
  const active = appointments.filter((item) => item.status !== AppointmentStatus.Cancelled);
  const windows = input.windows.filter((item) => item.status !== TimeSlotStatus.Cancelled);

  const minSellable = Math.max(input.minSellableMinutes ?? shortestDuration(active) ?? 30, 15);
  const coverage = windowCoverage(windows, active, minSellable);
  const occupancyRate = coverage.windowMinutes > 0 ? clamp(coverage.bookedMinutes / coverage.windowMinutes) : 0;

  const clientVisits = new Map<string, number>();
  for (const item of completed) {
    if (!item.clientId) continue;
    clientVisits.set(item.clientId, (clientVisits.get(item.clientId) ?? 0) + 1);
  }
  const uniqueClients = clientVisits.size;
  const repeatClients = [...clientVisits.values()].filter((count) => count > 1).length;

  const walkInCount = appointments.filter((item) => !item.clientId).length;
  const onlineCount = appointments.length - walkInCount;

  const completedIds = new Set(completed.map((item) => item.id));
  const periodReviews = input.reviews.filter((review) => completedIds.has(review.appointmentId));
  const ratingValues = periodReviews.map((item) => (input.scope === "salon" ? item.salonRating : item.masterRating));
  const averageRating = ratingValues.length
    ? Math.round((ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length) * 10) / 10
    : null;

  const kpis: AnalyticsKpis = {
    ...totals,
    confirmedCount: confirmed.length,
    lostRevenue: cancelled.reduce((sum, item) => sum + item.price, 0),
    averageCheck: totals.completedCount ? Math.round(totals.revenue / totals.completedCount) : 0,
    cancellationRate: totals.totalCount ? cancelled.length / totals.totalCount : 0,
    occupancyRate,
    windowMinutes: coverage.windowMinutes,
    bookedMinutes: coverage.bookedMinutes,
    idleMinutes: coverage.idleMinutes,
    unsellableMinutes: coverage.unsellableMinutes,
    uniqueClients,
    repeatClients,
    walkInCount,
    onlineCount,
    reviewCount: periodReviews.length,
    reviewCoverage: totals.completedCount ? periodReviews.length / totals.completedCount : 0,
    averageRating,
  };

  return {
    period: input.period,
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    scope: input.scope,
    totalCount: totals.totalCount,
    completedCount: totals.completedCount,
    cancelledCount: totals.cancelledCount,
    revenue: totals.revenue,
    kpis,
    services: rankBy(
      completed.map((item) => ({ id: item.serviceId, name: item.serviceName, price: item.price })),
      totals.revenue,
    ),
    masters: rankBy(
      completed.map((item) => ({ id: item.masterId, name: item.masterName, price: item.price })),
      totals.revenue,
    ),
    hours: hourBuckets(active),
    weekdays: weekdayBuckets(active),
    insights: buildInsights(kpis, {
      masterCount: new Set(appointments.map((item) => item.masterId)).size,
      emptyWindowDays: emptyWindowDayCount(windows, active),
      topMasterShare: rankBy(
        completed.map((item) => ({ id: item.masterId, name: item.masterName, price: item.price })),
        totals.revenue,
      )[0]?.share ?? 0,
    }),
  };
}

function durationMinutes(startTime: string, endTime: string) {
  return Math.max(0, toMinutes(endTime) - toMinutes(startTime));
}

function shortestDuration(appointments: AnalyticsAppointment[]) {
  const durations = appointments
    .map((item) => durationMinutes(item.startTime, item.endTime))
    .filter((value) => value > 0);
  return durations.length ? Math.min(...durations) : null;
}

function windowCoverage(
  windows: AnalyticsWindow[],
  busy: Array<{ startTime: string; endTime: string; appointmentDate: Date; masterId: string }>,
  minSellable: number,
) {
  let windowMinutes = 0;
  let bookedMinutes = 0;
  let unsellableMinutes = 0;
  for (const window of windows) {
    const start = toMinutes(window.startTime);
    const end = toMinutes(window.endTime);
    if (end <= start) continue;
    windowMinutes += end - start;
    const blocks = mergeIntervals(
      busy
        .filter(
          (item) =>
            item.masterId === window.masterId &&
            item.appointmentDate.toISOString().slice(0, 10) === window.scheduleDate,
        )
        .map((item) => ({
          start: Math.max(start, toMinutes(item.startTime)),
          end: Math.min(end, toMinutes(item.endTime)),
        }))
        .filter((item) => item.end > item.start),
    );
    let cursor = start;
    for (const block of blocks) {
      if (block.start > cursor && block.start - cursor < minSellable) unsellableMinutes += block.start - cursor;
      bookedMinutes += block.end - block.start;
      cursor = Math.max(cursor, block.end);
    }
    if (end > cursor && end - cursor < minSellable) unsellableMinutes += end - cursor;
  }
  return {
    windowMinutes,
    bookedMinutes,
    idleMinutes: Math.max(0, windowMinutes - bookedMinutes),
    unsellableMinutes,
  };
}

function mergeIntervals(items: Array<{ start: number; end: number }>) {
  const sorted = [...items].sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: Array<{ start: number; end: number }> = [];
  for (const item of sorted) {
    const last = merged[merged.length - 1];
    if (!last || item.start > last.end) {
      merged.push({ ...item });
      continue;
    }
    last.end = Math.max(last.end, item.end);
  }
  return merged;
}

function emptyWindowDayCount(
  windows: AnalyticsWindow[],
  appointments: Array<{ appointmentDate: Date; masterId: string }>,
) {
  const booked = new Set(
    appointments.map((item) => `${item.masterId}:${item.appointmentDate.toISOString().slice(0, 10)}`),
  );
  const days = new Set(windows.map((item) => `${item.masterId}:${item.scheduleDate}`));
  let empty = 0;
  for (const key of days) {
    if (!booked.has(key)) empty += 1;
  }
  return empty;
}

function rankBy(items: Array<{ id: string; name: string; price: number }>, revenue: number): RankedItem[] {
  const map = new Map<string, RankedItem>();
  for (const item of items) {
    const current = map.get(item.id) ?? { id: item.id, name: item.name, count: 0, revenue: 0, share: 0 };
    current.count += 1;
    current.revenue += item.price;
    map.set(item.id, current);
  }
  return [...map.values()]
    .map((item) => ({ ...item, share: revenue ? item.revenue / revenue : 0 }))
    .sort((left, right) => right.revenue - left.revenue || right.count - left.count)
    .slice(0, 8);
}

function hourBuckets(appointments: AnalyticsAppointment[]): HourBucket[] {
  const counts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const item of appointments) {
    const minutes = toMinutes(item.startTime);
    if (!Number.isFinite(minutes)) continue;
    const hour = Math.floor(minutes / 60);
    if (hour >= 0 && hour < 24) counts[hour]!.count += 1;
  }
  return counts.filter((item) => item.count > 0);
}

function weekdayBuckets(appointments: AnalyticsAppointment[]): WeekdayBucket[] {
  const buckets = WEEKDAYS_SHORT.map((label, weekday) => ({ weekday, label, count: 0, revenue: 0 }));
  for (const item of appointments) {
    const date = item.appointmentDate.toISOString().slice(0, 10);
    const weekday = weekdayMonday0(date);
    const bucket = buckets[weekday];
    if (!bucket) continue;
    bucket.count += 1;
    if (item.status === AppointmentStatus.Completed) bucket.revenue += item.price;
  }
  return buckets;
}

function buildInsights(
  kpis: AnalyticsKpis,
  extra: { masterCount: number; emptyWindowDays: number; topMasterShare: number },
): AnalyticsInsight[] {
  const items: AnalyticsInsight[] = [];
  if (kpis.windowMinutes > 0 && kpis.occupancyRate < 0.35) {
    items.push({
      id: "occupancy-low",
      tone: "warn",
      title: "Окна заполнены слабо",
      detail: `Занято только ${Math.round(kpis.occupancyRate * 100)}% открытого времени. Лишние окна снижают ценность свободных слотов в каталоге.`,
    });
  } else if (kpis.windowMinutes > 0 && kpis.occupancyRate >= 0.85) {
    items.push({
      id: "occupancy-high",
      tone: "ok",
      title: "Расписание почти полное",
      detail: "Клиентам почти некуда записаться. Имеет смысл открыть дополнительные окна на пиковые дни.",
    });
  }
  if (kpis.unsellableMinutes >= 45 && kpis.windowMinutes > 0 && kpis.unsellableMinutes / kpis.windowMinutes >= 0.08) {
    items.push({
      id: "schedule-holes",
      tone: "warn",
      title: "В расписании появляются непродаваемые дыры",
      detail: `${kpis.unsellableMinutes} мин свободны, но короче услуги — их нельзя продать. Сдвиньте окна или длительность услуг.`,
    });
  }
  if (kpis.cancellationRate >= 0.2 && kpis.totalCount >= 3) {
    items.push({
      id: "cancel-high",
      tone: "warn",
      title: "Высокая доля отмен",
      detail: `Отменено ${Math.round(kpis.cancellationRate * 100)}% записей, потеряно ${kpis.lostRevenue} ₽. Напомните клиентам за сутки и не открывайте слишком ранние слоты без спроса.`,
    });
  }
  if (extra.emptyWindowDays >= 2) {
    items.push({
      id: "empty-windows",
      tone: "info",
      title: "Есть рабочие дни без записей",
      detail: `${extra.emptyWindowDays} смен открыты, но никто не записался. Сократите шаблон в слабые дни или усильте видимость в каталоге.`,
    });
  }
  if (kpis.completedCount >= 3 && kpis.reviewCoverage < 0.3) {
    items.push({
      id: "reviews-low",
      tone: "info",
      title: "Мало отзывов после визитов",
      detail: `Оценено ${Math.round(kpis.reviewCoverage * 100)}% завершённых визитов. Отзывы поднимают карточку салона и мастера в поиске.`,
    });
  }
  if (extra.masterCount > 1 && extra.topMasterShare >= 0.7 && kpis.revenue > 0) {
    items.push({
      id: "revenue-concentration",
      tone: "info",
      title: "Выручка держится на одном мастере",
      detail: "Больше 70% денег проходит через одного специалиста. Это риск, если он закроет окна или уйдёт.",
    });
  }
  if (kpis.repeatClients === 0 && kpis.uniqueClients >= 4) {
    items.push({
      id: "no-repeat",
      tone: "info",
      title: "Пока нет повторных клиентов",
      detail: "За период все гости пришли один раз. Напомните о записи тем, у кого визит уже состоялся.",
    });
  }
  return items.slice(0, 4);
}

function clamp(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
