import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { attachRealtime } from "./src/server/realtime/attach-ws";

const dev = process.argv.includes("--dev");
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    void handle(req, res, parsedUrl);
  });

  attachRealtime(server);
  server.listen(port, hostname, () => {
    console.log(`SalonHub ready on http://localhost:${port} (ws: /notificationHub, /chatHub)`);
  });
  const { getApp } = await import("./src/server/infrastructure/get-app");
  const { CronJobService } = await import("./src/server/application/cron-job-service");
  const { TimeoutJobScheduler } = await import("./src/server/jobs/timeout-scheduler");
  const { getAppTimeZone } = await import("./src/server/domain/scheduling");
  const cron = new CronJobService(getApp().dailyStatsJob, new TimeoutJobScheduler(), getAppTimeZone());
  void cron.start();
  setInterval(() => {
    void getApp().appointments.cancelExpired();
  }, 15 * 60 * 1000);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
