import { nextWallClockInZone } from "@/server/domain/calendar";
import type { IJobScheduler } from "@/server/application/ports";

const MAX_TIMEOUT_MS = 2_147_000_000;

export class TimeoutJobScheduler implements IJobScheduler {
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private stopped = false;

  everyDayAt(hour: number, minute: number, timeZone: string, task: () => Promise<void>) {
    const tick = () => {
      if (this.stopped) return;
      const delay = Math.max(50, nextWallClockInZone(new Date(), timeZone, hour, minute).getTime() - Date.now());
      const id = setTimeout(() => {
        this.timers.delete(id);
        void (async () => {
          try {
            await task();
          } catch (error) {
            console.error("[cron]", error);
          }
          tick();
        })();
      }, Math.min(delay, MAX_TIMEOUT_MS));
      this.timers.add(id);
    };
    tick();
  }

  stop() {
    this.stopped = true;
    for (const id of this.timers) clearTimeout(id);
    this.timers.clear();
  }
}
