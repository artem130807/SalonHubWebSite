import { describe, expect, it } from "vitest";
import { AppointmentStatus, TimeSlotStatus } from "@/server/domain/types";
import { analyticsPeriodRange, buildAnalyticsReport } from "@/server/domain/analytics";

describe("analyticsPeriodRange", () => {
  it("starts the week on Monday UTC", () => {
    const range = analyticsPeriodRange("week", new Date("2026-09-03T12:00:00.000Z"));
    expect(range.from.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });
});

describe("buildAnalyticsReport", () => {
  it("measures occupancy, unsellable holes and lost cancellation revenue", () => {
    const report = buildAnalyticsReport({
      period: "week",
      from: new Date("2026-08-31T00:00:00.000Z"),
      to: new Date("2026-09-07T00:00:00.000Z"),
      scope: "master",
      appointments: [
        visit({
          id: "a1",
          status: AppointmentStatus.Completed,
          startTime: "10:00",
          endTime: "10:30",
          price: 1000,
          serviceId: "cut",
          serviceName: "Стрижка",
        }),
        visit({
          id: "a2",
          status: AppointmentStatus.Cancelled,
          startTime: "12:00",
          endTime: "12:30",
          price: 800,
          serviceId: "shave",
          serviceName: "Бритьё",
          clientId: null,
        }),
      ],
      windows: [
        {
          id: "w1",
          masterId: "m1",
          scheduleDate: "2026-09-03",
          startTime: "10:00",
          endTime: "11:00",
          status: TimeSlotStatus.Available,
        },
      ],
      reviews: [{ appointmentId: "a1", salonRating: 5, masterRating: 4, createdAt: new Date("2026-09-03T12:00:00.000Z") }],
      minSellableMinutes: 30,
    });

    expect(report.completedCount).toBe(1);
    expect(report.revenue).toBe(1000);
    expect(report.kpis.lostRevenue).toBe(800);
    expect(report.kpis.windowMinutes).toBe(60);
    expect(report.kpis.bookedMinutes).toBe(30);
    expect(report.kpis.occupancyRate).toBe(0.5);
    expect(report.kpis.unsellableMinutes).toBe(0);
    expect(report.kpis.averageCheck).toBe(1000);
    expect(report.kpis.walkInCount).toBe(1);
    expect(report.kpis.onlineCount).toBe(1);
    expect(report.kpis.reviewCoverage).toBe(1);
    expect(report.kpis.averageRating).toBe(4);
    expect(report.services[0]).toMatchObject({ name: "Стрижка", revenue: 1000 });
  });

  it("counts leftover fragments shorter than the service as unsellable", () => {
    const report = buildAnalyticsReport({
      period: "week",
      from: new Date("2026-08-31T00:00:00.000Z"),
      to: new Date("2026-09-07T00:00:00.000Z"),
      scope: "salon",
      appointments: [
        visit({
          id: "a1",
          status: AppointmentStatus.Completed,
          startTime: "10:00",
          endTime: "10:40",
          price: 1500,
        }),
      ],
      windows: [
        {
          id: "w1",
          masterId: "m1",
          scheduleDate: "2026-09-03",
          startTime: "10:00",
          endTime: "11:00",
          status: TimeSlotStatus.Available,
        },
      ],
      reviews: [],
      minSellableMinutes: 30,
    });
    expect(report.kpis.unsellableMinutes).toBe(20);
    expect(report.insights.some((item) => item.id === "schedule-holes")).toBe(false);
  });

  it("flags a salon that depends on one master", () => {
    const report = buildAnalyticsReport({
      period: "week",
      from: new Date("2026-08-31T00:00:00.000Z"),
      to: new Date("2026-09-07T00:00:00.000Z"),
      scope: "salon",
      appointments: [
        visit({ id: "a1", masterId: "m1", masterName: "Алекс", price: 3000, status: AppointmentStatus.Completed }),
        visit({ id: "a2", masterId: "m1", masterName: "Алекс", price: 2000, status: AppointmentStatus.Completed, clientId: "c2" }),
        visit({ id: "a3", masterId: "m2", masterName: "Иван", price: 500, status: AppointmentStatus.Completed, clientId: "c3" }),
      ],
      windows: [],
      reviews: [],
    });
    expect(report.masters[0]?.name).toBe("Алекс");
    expect(report.masters[0]?.share).toBeGreaterThan(0.7);
    expect(report.insights.some((item) => item.id === "revenue-concentration")).toBe(true);
  });
});

function visit(
  input: Partial<{
    id: string;
    status: string;
    price: number;
    startTime: string;
    endTime: string;
    masterId: string;
    masterName: string;
    serviceId: string;
    serviceName: string;
    clientId: string | null;
  }>,
) {
  return {
    id: input.id ?? "a",
    status: input.status ?? AppointmentStatus.Completed,
    price: input.price ?? 1000,
    startTime: input.startTime ?? "10:00",
    endTime: input.endTime ?? "10:30",
    appointmentDate: new Date("2026-09-03T00:00:00.000Z"),
    masterId: input.masterId ?? "m1",
    masterName: input.masterName ?? "Мастер",
    serviceId: input.serviceId ?? "s1",
    serviceName: input.serviceName ?? "Стрижка",
    clientId: input.clientId === undefined ? "c1" : input.clientId,
    guestName: input.clientId === null ? "Гость" : null,
  };
}
