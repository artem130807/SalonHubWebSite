import { describe, expect, it } from "vitest";
import { TimeSlotStatus } from "@/server/domain/types";
import { buildPublicDaySchedule, resolvePublicCalendarMonth } from "@/server/application/public-calendar";

describe("public calendar month window", () => {
  it("accepts the current month and rejects a far month", () => {
    const ok = resolvePublicCalendarMonth("2026-09-14", "2026-09");
    expect(ok.ok && ok.value.from).toBe("2026-08-31");
    expect(ok.ok && ok.value.to).toBe("2026-10-05");
    expect(resolvePublicCalendarMonth("2026-09-14", "2028-01").ok).toBe(false);
    expect(resolvePublicCalendarMonth("2026-09-14", "bad").ok).toBe(false);
    expect(resolvePublicCalendarMonth("2026-09-14", "2026-13").ok).toBe(false);
    expect(resolvePublicCalendarMonth("2026-09-14", "2026-09-14").ok).toBe(false);
  });
});

describe("public day schedule", () => {
  it("keeps busy intervals anonymous and counts remaining starts", () => {
    const day = buildPublicDaySchedule(
      "2026-09-03",
      [
        {
          id: "w1",
          masterId: "m1",
          scheduleDate: "2026-09-03",
          startTime: "10:00",
          endTime: "12:00",
          status: TimeSlotStatus.Available,
        },
      ],
      [{ timeSlotId: "w1", startTime: "10:00", endTime: "10:30" }],
      30,
      new Date("2026-09-03T06:00:00.000Z"),
    );
    expect(day.windows).toEqual([{ startTime: "10:00", endTime: "12:00" }]);
    expect(day.busy).toEqual([{ startTime: "10:00", endTime: "10:30" }]);
    expect(day.starts[0]).toEqual({ startTime: "10:30", endTime: "11:00" });
    expect(day.freeStartCount).toBeGreaterThan(0);
    expect(JSON.stringify(day)).not.toContain("Клиент");
  });

  it("ignores busy intervals that do not belong to a live window", () => {
    const day = buildPublicDaySchedule(
      "2026-09-03",
      [
        {
          id: "w1",
          masterId: "m1",
          scheduleDate: "2026-09-03",
          startTime: "10:00",
          endTime: "12:00",
          status: TimeSlotStatus.Available,
        },
      ],
      [
        { timeSlotId: "w1", startTime: "10:00", endTime: "10:30" },
        { timeSlotId: "cancelled", startTime: "18:00", endTime: "19:00" },
      ],
      30,
      new Date("2026-09-03T06:00:00.000Z"),
    );
    expect(day.busy).toEqual([{ startTime: "10:00", endTime: "10:30" }]);
  });
});
