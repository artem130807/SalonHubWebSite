import { describe, expect, it, vi } from "vitest";
import { addDateOnly, nextWallClockInZone, yesterdayInZone, zonedWallClockToUtc } from "@/server/domain/calendar";
import { DailyStatsJobService, STATS_JOB_LEASE_MS } from "@/server/application/daily-stats-job";
import { CronJobService } from "@/server/application/cron-job-service";
import { AppointmentStatus, StatsJobStatus, UserRole } from "@/server/domain/types";
import { InMemoryStatsJobRunRepository, createInMemoryRepos } from "@/server/infrastructure/memory-repositories";
import { StatsService } from "@/server/application/platform-services";
import type {
  IAppointmentRepository,
  IDailyStatsRepository,
  IJobScheduler,
  IMasterProfileRepository,
  ISalonRepository,
} from "@/server/application/ports";

const moscow = "Europe/Moscow";

describe("calendar midnight in Moscow", () => {
  it("converts 00:00 Moscow to 21:00 UTC the previous calendar day", () => {
    const utc = zonedWallClockToUtc("2026-09-07", "00:00", moscow);
    expect(utc.toISOString()).toBe("2026-09-06T21:00:00.000Z");
  });

  it("schedules the next 00:00 Moscow from the evening before", () => {
    const next = nextWallClockInZone(new Date("2026-09-06T15:00:00.000Z"), moscow, 0, 0);
    expect(next.toISOString()).toBe("2026-09-06T21:00:00.000Z");
  });

  it("treats 00:05 Moscow as a new day whose yesterday is the previous date", () => {
    const now = new Date("2026-09-06T21:05:00.000Z");
    expect(yesterdayInZone(now, moscow)).toBe("2026-09-06");
  });
});

function jobHarness() {
  const clock = { utcNow: () => new Date("2026-09-07T00:05:00+03:00") };
  const salonIds = ["salon-a", "salon-b"];
  const masterIds = ["master-a", "master-b"];
  const appointments = {
    list: vi.fn(async (filter: { salonId?: string; masterId?: string }) => {
      if (filter.salonId === "salon-a" || filter.masterId === "master-a") {
        return [
          { status: AppointmentStatus.Completed, price: 1000 },
          { status: AppointmentStatus.Cancelled, price: 500 },
        ];
      }
      return [];
    }),
  };
  const snapshots = {
    upsertSalon: vi.fn(),
    upsertMaster: vi.fn(),
    listSalon: vi.fn(),
    listMaster: vi.fn(),
  };
  const repos = createInMemoryRepos();
  const service = new DailyStatsJobService(
    appointments as unknown as IAppointmentRepository,
    { listIds: async () => salonIds } as ISalonRepository,
    { listIds: async () => masterIds } as IMasterProfileRepository,
    snapshots as unknown as IDailyStatsRepository,
    repos.statsJobRuns,
    clock,
    moscow,
    "worker-1",
  );
  return { service, snapshots, appointments, repos, clock };
}

describe("DailyStatsJobService with mocked ports", () => {
  it("writes a snapshot for every salon and master and marks the run completed", async () => {
    const { service, snapshots, repos } = jobHarness();
    const result = await service.runForDate("2026-09-06");
    expect(result.status).toBe("completed");
    expect(snapshots.upsertSalon).toHaveBeenCalledTimes(2);
    expect(snapshots.upsertMaster).toHaveBeenCalledTimes(2);
    expect(snapshots.upsertSalon).toHaveBeenCalledWith(
      expect.objectContaining({ salonId: "salon-a", statDate: "2026-09-06", completedCount: 1, revenue: 1000 }),
    );
    expect(repos.db.statsJobRuns[0]?.status).toBe(StatsJobStatus.Completed);
  });

  it("skips a completed day and reclaims a stale running lease", async () => {
    const { service, snapshots, repos } = jobHarness();
    await service.runForDate("2026-09-06");
    snapshots.upsertSalon.mockClear();
    const skipped = await service.runForDate("2026-09-06");
    expect(skipped.status).toBe("skipped");
    expect(snapshots.upsertSalon).not.toHaveBeenCalled();

    const runs = new InMemoryStatsJobRunRepository(repos.db);
    await runs.claim("2026-09-05", new Date("2026-09-06T10:00:00.000Z"), new Date("2026-09-06T10:05:00.000Z"), "old");
    repos.db.statsJobRuns.find((row) => row.statDate === "2026-09-05")!.leaseUntil = new Date("2026-09-06T10:05:00.000Z");
    const reclaimed = await service.runForDate("2026-09-05");
    expect(reclaimed.status).toBe("completed");
    expect(repos.db.statsJobRuns.find((row) => row.statDate === "2026-09-05")?.attempt).toBe(2);
  });

  it("keeps successful snapshots when one entity write fails and retries the day", async () => {
    const { service, snapshots, repos } = jobHarness();
    snapshots.upsertSalon.mockImplementation(async (stat: { salonId: string }) => {
      if (stat.salonId === "salon-b") throw new Error("db down");
    });
    const failed = await service.runForDate("2026-09-06");
    expect(failed.status).toBe("failed");
    expect(repos.db.statsJobRuns[0]?.status).toBe(StatsJobStatus.Failed);
    expect(snapshots.upsertSalon).toHaveBeenCalledWith(expect.objectContaining({ salonId: "salon-a" }));

    snapshots.upsertSalon.mockImplementation(async () => undefined);
    const retried = await service.runForDate("2026-09-06");
    expect(retried.status).toBe("completed");
    expect(snapshots.upsertSalon).toHaveBeenCalledWith(expect.objectContaining({ salonId: "salon-b" }));
    expect(repos.db.statsJobRuns[0]?.status).toBe(StatsJobStatus.Completed);
  });

  it("does not snapshot today during catch-up", async () => {
    const { service, snapshots } = jobHarness();
    await service.catchUp();
    const dates = snapshots.upsertSalon.mock.calls.map((call) => (call[0] as { statDate: string }).statDate);
    expect(dates).toContain("2026-09-06");
    expect(dates).not.toContain("2026-09-07");
  });
});

describe("CronJobService", () => {
  it("registers 00:00 in the app timezone and runs catch-up on start", async () => {
    const catchUp = vi.fn().mockResolvedValue({ ok: true, value: [] });
    const scheduler: IJobScheduler = {
      everyDayAt: vi.fn(),
      stop: vi.fn(),
    };
    const cron = new CronJobService({ catchUp } as never, scheduler, moscow);
    await cron.start();
    expect(scheduler.everyDayAt).toHaveBeenCalledWith(0, 0, moscow, expect.any(Function));
    expect(catchUp).toHaveBeenCalledOnce();
  });
});

describe("StatsService reads snapshots without double-counting today", () => {
  it("uses stored daily rows for closed days and live appointments for today", async () => {
    const list = vi.fn(async (filter: { from?: Date }) => {
      if (filter.from?.toISOString().startsWith("2026-09-03")) {
        return [{ status: AppointmentStatus.Completed, price: 200 }];
      }
      return [];
    });
    const listMaster = vi.fn().mockResolvedValue([
      { statDate: "2026-09-02", totalCount: 1, completedCount: 1, cancelledCount: 0, revenue: 1000 },
    ]);
    const service = new StatsService(
      { list } as unknown as IAppointmentRepository,
      { getById: vi.fn().mockResolvedValue({ id: "m", salonId: "s" }) } as unknown as IMasterProfileRepository,
      { utcNow: () => new Date("2026-09-03T12:00:00.000Z") },
      { listMaster, listSalon: vi.fn().mockResolvedValue([]) } as unknown as IDailyStatsRepository,
    );
    const result = await service.mine(
      { userId: "u", role: UserRole.Master, name: "Мастер", masterProfileId: "m" },
      "week",
      new Date("2026-09-03T12:00:00.000Z"),
    );
    expect(result.ok && result.value.completedCount).toBe(2);
    expect(result.ok && result.value.revenue).toBe(1200);
    expect(listMaster).toHaveBeenCalled();
    expect(list).toHaveBeenCalled();
  });
});

describe("job lease helpers", () => {
  it("keeps the lease window at ten minutes", () => {
    expect(STATS_JOB_LEASE_MS).toBe(10 * 60 * 1000);
    expect(addDateOnly("2026-09-01", 1)).toBe("2026-09-02");
  });
});
