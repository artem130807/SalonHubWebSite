import { describe, expect, it } from "vitest";
import { AppointmentSchedulingRules, TimeSlotCapacityRules, dateOnly } from "@/server/domain/scheduling";

const rules = new AppointmentSchedulingRules();
const capacity = new TimeSlotCapacityRules();
const masterId = "11111111-1111-1111-1111-111111111111";
const utcNow = new Date("2026-09-03T08:00:00.000Z");

const valid = {
  requestedMasterId: masterId,
  windowMasterId: masterId,
  windowDate: "2026-09-10",
  appointmentDate: "2026-09-10",
  windowStart: "10:00",
  windowEnd: "18:00",
  startTime: "11:00",
  serviceDurationMinutes: 40,
  masterOffersService: true,
  existing: [] as { startTime: string; endTime: string }[],
  utcNow,
};

describe("AppointmentSchedulingRules", () => {
  it("rejects a service the master does not offer", () => {
    expect(rules.validate({ ...valid, masterOffersService: false }).ok).toBe(false);
  });

  it("rejects another master's window", () => {
    expect(rules.validate({ ...valid, windowMasterId: "22222222-2222-2222-2222-222222222222" }).ok).toBe(false);
  });

  it("rejects interval outside the window", () => {
    expect(
      rules.validate({ ...valid, windowEnd: "11:00", startTime: "10:30" }).ok,
    ).toBe(false);
  });

  it("rejects overlap", () => {
    expect(
      rules.validate({
        ...valid,
        startTime: "10:20",
        existing: [{ startTime: "10:00", endTime: "10:40" }],
      }).ok,
    ).toBe(false);
  });

  it("rejects a past date", () => {
    expect(rules.validate({ ...valid, appointmentDate: "2026-09-02", windowDate: "2026-09-02" }).ok).toBe(false);
  });

  it("rejects a start inside today's lead time", () => {
    expect(
      rules.validate({
        ...valid,
        windowDate: "2026-09-03",
        appointmentDate: "2026-09-03",
        startTime: "10:00",
        utcNow: new Date("2026-09-03T10:00:00.000Z"),
      }).ok,
    ).toBe(false);
  });

  it("accepts a valid booking", () => {
    expect(
      rules.validate({
        ...valid,
        existing: [{ startTime: "10:00", endTime: "10:40" }],
      }).ok,
    ).toBe(true);
  });
});

describe("TimeSlotCapacityRules", () => {
  const window = {
    id: "slot",
    masterId,
    scheduleDate: "2026-09-10",
    startTime: "10:00",
    endTime: "11:00",
  };
  const now = new Date("2026-09-03T08:00:00.000Z");

  it("marks window booked when no salon service fits", () => {
    expect(capacity.isFullyBooked(window, [{ startTime: "10:00", endTime: "10:40" }], [40, 60], now)).toBe(true);
  });

  it("keeps window available if a shorter service still fits", () => {
    expect(capacity.isFullyBooked(window, [{ startTime: "10:00", endTime: "10:40" }], [20, 40], now)).toBe(false);
  });
});

describe("dateOnly", () => {
  it("keeps UTC calendar date in UTC", () => {
    expect(dateOnly(new Date("2026-09-03T10:00:00.000Z"), "UTC")).toBe("2026-09-03");
  });

  it("rolls to the next day in Europe/Moscow after 21:00 UTC", () => {
    expect(dateOnly(new Date("2026-09-03T21:00:00.000Z"), "Europe/Moscow")).toBe("2026-09-04");
  });
});
