import { getAppTimeZone } from "@/server/domain/scheduling";
import type { IJobScheduler } from "@/server/application/ports";
import type { DailyStatsJobService } from "@/server/application/daily-stats-job";

export class CronJobService {
  constructor(
    private readonly dailyStats: DailyStatsJobService,
    private readonly scheduler: IJobScheduler,
    private readonly timeZone = getAppTimeZone(),
  ) {}

  start() {
    this.scheduler.everyDayAt(0, 0, this.timeZone, () =>
      this.dailyStats.catchUp().then(
        () => undefined,
        (error) => {
          console.error("Daily stats catch-up failed", error);
        },
      ),
    );
    return this.dailyStats.catchUp().catch((error) => {
      console.error("Daily stats catch-up failed", error);
    });
  }

  stop() {
    this.scheduler.stop();
  }
}
