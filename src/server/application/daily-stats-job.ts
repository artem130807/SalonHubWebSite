import { randomUUID } from "node:crypto";
import { ok } from "@/server/domain/result";
import { addDateOnly, eachDateOnly, utcRangeForDateOnly, yesterdayInZone } from "@/server/domain/calendar";
import { EMPTY_DAILY_TOTALS, tallyAppointments } from "@/server/domain/stats";
import { getAppTimeZone } from "@/server/domain/scheduling";
import type { DailyMasterStat, DailySalonStat } from "@/server/domain/types";
import type {
  IAppointmentRepository,
  IClock,
  IDailyStatsRepository,
  IMasterProfileRepository,
  ISalonRepository,
  IStatsJobRunRepository,
} from "@/server/application/ports";

export const STATS_JOB_LEASE_MS = 10 * 60 * 1000;
export const STATS_CATCH_UP_DAYS = 7;

export class DailyStatsJobService {
  constructor(
    private readonly appointments: IAppointmentRepository,
    private readonly salons: ISalonRepository,
    private readonly masters: IMasterProfileRepository,
    private readonly snapshots: IDailyStatsRepository,
    private readonly runs: IStatsJobRunRepository,
    private readonly clock: IClock,
    private readonly timeZone = getAppTimeZone(),
    private readonly workerId: string = randomUUID(),
  ) {}

  async catchUp() {
    const yesterday = yesterdayInZone(this.clock.utcNow(), this.timeZone);
    const from = addDateOnly(yesterday, -(STATS_CATCH_UP_DAYS - 1));
    const results = [];
    for (const statDate of eachDateOnly(from, addDateOnly(yesterday, 1))) {
      results.push(await this.runForDate(statDate));
    }
    return ok(results);
  }

  async runForDate(statDate: string) {
    const now = this.clock.utcNow();
    const claimed = await this.runs.claim(
      statDate,
      now,
      new Date(now.getTime() + STATS_JOB_LEASE_MS),
      this.workerId,
    );
    if (!claimed) {
      const existing = await this.runs.get(statDate);
      return { statDate, status: existing?.status === "Completed" ? ("skipped" as const) : ("busy" as const) };
    }

    const failures: string[] = [];
    try {
      const salonIds = await this.salons.listIds();
      for (const salonId of salonIds) {
        try {
          await this.snapshotSalon(salonId, statDate);
          await this.heartbeat(statDate);
        } catch (error) {
          failures.push(`salon:${salonId}:${error instanceof Error ? error.message : "write failed"}`);
        }
      }
      const masterIds = await this.masters.listIds();
      for (const masterId of masterIds) {
        try {
          await this.snapshotMaster(masterId, statDate);
          await this.heartbeat(statDate);
        } catch (error) {
          failures.push(`master:${masterId}:${error instanceof Error ? error.message : "write failed"}`);
        }
      }
      if (failures.length) {
        await this.runs.markFailed(statDate, this.clock.utcNow(), failures.join("; "));
        return { statDate, status: "failed" as const, failures };
      }
      await this.runs.markCompleted(statDate, this.clock.utcNow());
      return { statDate, status: "completed" as const, failures };
    } catch (error) {
      const message = error instanceof Error ? error.message : "job failed";
      await this.runs.markFailed(statDate, this.clock.utcNow(), message);
      return { statDate, status: "failed" as const, failures: [...failures, message] };
    }
  }

  private async heartbeat(statDate: string) {
    const now = this.clock.utcNow();
    await this.runs.renewLease(statDate, new Date(now.getTime() + STATS_JOB_LEASE_MS), this.workerId);
  }

  private async snapshotSalon(salonId: string, statDate: string) {
    const { from, to } = utcRangeForDateOnly(statDate);
    const items = await this.appointments.list({ salonId, from, to });
    const totals = items.length ? tallyAppointments(items) : EMPTY_DAILY_TOTALS;
    const row: DailySalonStat = { id: randomUUID(), salonId, statDate, ...totals };
    await this.snapshots.upsertSalon(row);
  }

  private async snapshotMaster(masterId: string, statDate: string) {
    const { from, to } = utcRangeForDateOnly(statDate);
    const items = await this.appointments.list({ masterId, from, to });
    const totals = items.length ? tallyAppointments(items) : EMPTY_DAILY_TOTALS;
    const row: DailyMasterStat = { id: randomUUID(), masterId, statDate, ...totals };
    await this.snapshots.upsertMaster(row);
  }
}
