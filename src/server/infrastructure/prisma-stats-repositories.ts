import type { Prisma } from "@prisma/client";
import { StatsJobStatus, type DailyMasterStat, type DailySalonStat, type StatsJobRun } from "@/server/domain/types";
import type { IDailyStatsRepository, IStatsJobRunRepository } from "@/server/application/ports";
import { isUniqueConstraintError } from "@/server/infrastructure/prisma-errors";
import { prisma } from "@/server/infrastructure/prisma";

function dateValue(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function nextDateValue(date: string) {
  const next = dateValue(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function statDateFilter(statDate: string) {
  return { gte: dateValue(statDate), lt: nextDateValue(statDate) };
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function mapSalonStat(row: {
  id: string;
  salonId: string;
  statDate: Date;
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  revenue: Prisma.Decimal | number;
}): DailySalonStat {
  return {
    id: row.id,
    salonId: row.salonId,
    statDate: dateKey(row.statDate),
    totalCount: row.totalCount,
    completedCount: row.completedCount,
    cancelledCount: row.cancelledCount,
    revenue: Number(row.revenue),
  };
}

function mapMasterStat(row: {
  id: string;
  masterId: string;
  statDate: Date;
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  revenue: Prisma.Decimal | number;
}): DailyMasterStat {
  return {
    id: row.id,
    masterId: row.masterId,
    statDate: dateKey(row.statDate),
    totalCount: row.totalCount,
    completedCount: row.completedCount,
    cancelledCount: row.cancelledCount,
    revenue: Number(row.revenue),
  };
}

function mapRun(row: {
  id: string;
  statDate: Date;
  status: StatsJobStatus;
  attempt: number;
  leaseUntil: Date;
  workerId: string | null;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
}): StatsJobRun {
  return {
    id: row.id,
    statDate: dateKey(row.statDate),
    status: row.status,
    attempt: row.attempt,
    leaseUntil: row.leaseUntil,
    workerId: row.workerId,
    error: row.error,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
  };
}

export const prismaDailyStats: IDailyStatsRepository = {
  upsertSalon: async (stat) => {
    await prisma.dailySalonStat.upsert({
      where: { salonId_statDate: { salonId: stat.salonId, statDate: dateValue(stat.statDate) } },
      create: {
        id: stat.id,
        salonId: stat.salonId,
        statDate: dateValue(stat.statDate),
        totalCount: stat.totalCount,
        completedCount: stat.completedCount,
        cancelledCount: stat.cancelledCount,
        revenue: stat.revenue,
      },
      update: {
        totalCount: stat.totalCount,
        completedCount: stat.completedCount,
        cancelledCount: stat.cancelledCount,
        revenue: stat.revenue,
      },
    });
  },
  upsertMaster: async (stat) => {
    await prisma.dailyMasterStat.upsert({
      where: { masterId_statDate: { masterId: stat.masterId, statDate: dateValue(stat.statDate) } },
      create: {
        id: stat.id,
        masterId: stat.masterId,
        statDate: dateValue(stat.statDate),
        totalCount: stat.totalCount,
        completedCount: stat.completedCount,
        cancelledCount: stat.cancelledCount,
        revenue: stat.revenue,
      },
      update: {
        totalCount: stat.totalCount,
        completedCount: stat.completedCount,
        cancelledCount: stat.cancelledCount,
        revenue: stat.revenue,
      },
    });
  },
  listSalon: async (salonId, fromDate, toDateExclusive) => {
    const rows = await prisma.dailySalonStat.findMany({
      where: { salonId, statDate: { gte: dateValue(fromDate), lt: dateValue(toDateExclusive) } },
      orderBy: { statDate: "asc" },
    });
    return rows.map(mapSalonStat);
  },
  listMaster: async (masterId, fromDate, toDateExclusive) => {
    const rows = await prisma.dailyMasterStat.findMany({
      where: { masterId, statDate: { gte: dateValue(fromDate), lt: dateValue(toDateExclusive) } },
      orderBy: { statDate: "asc" },
    });
    return rows.map(mapMasterStat);
  },
};

async function findRun(statDate: string) {
  return prisma.statsJobRun.findFirst({ where: { statDate: statDateFilter(statDate) } });
}

const reclaimData = (now: Date, leaseUntil: Date, workerId: string) => ({
  status: StatsJobStatus.Running,
  leaseUntil,
  workerId,
  error: null,
  startedAt: now,
  completedAt: null,
  attempt: { increment: 1 },
});

export const prismaStatsJobRuns: IStatsJobRunRepository = {
  get: async (statDate) => {
    const row = await findRun(statDate);
    return row ? mapRun(row) : null;
  },
  claim: async (statDate, now, leaseUntil, workerId) => {
    let existing = await findRun(statDate);
    if (!existing) {
      try {
        await prisma.statsJobRun.create({
          data: {
            statDate: dateValue(statDate),
            status: StatsJobStatus.Running,
            attempt: 1,
            leaseUntil,
            workerId,
            startedAt: now,
          },
        });
        return true;
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        existing = await findRun(statDate);
        if (!existing) return false;
      }
    }
    if (!existing || existing.status === StatsJobStatus.Completed) return false;
    if (existing.status === StatsJobStatus.Running && existing.leaseUntil.getTime() > now.getTime()) return false;
    const updated = await prisma.statsJobRun.updateMany({
      where: {
        id: existing.id,
        OR: [{ status: StatsJobStatus.Failed }, { status: StatsJobStatus.Running, leaseUntil: { lt: now } }],
      },
      data: reclaimData(now, leaseUntil, workerId),
    });
    return updated.count === 1;
  },
  renewLease: async (statDate, leaseUntil, workerId) => {
    await prisma.statsJobRun.updateMany({
      where: { statDate: statDateFilter(statDate), status: StatsJobStatus.Running, workerId },
      data: { leaseUntil },
    });
  },
  markCompleted: async (statDate, now) => {
    await prisma.statsJobRun.updateMany({
      where: { statDate: statDateFilter(statDate), status: StatsJobStatus.Running },
      data: { status: StatsJobStatus.Completed, completedAt: now, error: null },
    });
  },
  markFailed: async (statDate, now, error) => {
    await prisma.statsJobRun.updateMany({
      where: { statDate: statDateFilter(statDate), status: StatsJobStatus.Running },
      data: { status: StatsJobStatus.Failed, completedAt: now, error },
    });
  },
};
