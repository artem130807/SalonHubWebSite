import { AppointmentStatus } from "@/server/domain/types";

export type DailyStatTotals = {
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  revenue: number;
};

export const EMPTY_DAILY_TOTALS: DailyStatTotals = {
  totalCount: 0,
  completedCount: 0,
  cancelledCount: 0,
  revenue: 0,
};

export function tallyAppointments(items: { status: string; price: number }[]): DailyStatTotals {
  const completed = items.filter((item) => item.status === AppointmentStatus.Completed);
  const cancelled = items.filter((item) => item.status === AppointmentStatus.Cancelled);
  return {
    totalCount: items.length,
    completedCount: completed.length,
    cancelledCount: cancelled.length,
    revenue: completed.reduce((sum, item) => sum + item.price, 0),
  };
}

export function addDailyTotals(left: DailyStatTotals, right: DailyStatTotals): DailyStatTotals {
  return {
    totalCount: left.totalCount + right.totalCount,
    completedCount: left.completedCount + right.completedCount,
    cancelledCount: left.cancelledCount + right.cancelledCount,
    revenue: left.revenue + right.revenue,
  };
}
