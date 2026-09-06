import { describe, expect, it } from "vitest";
import { AvailableSlotCalculator } from "@/server/domain/scheduling";

const calculator = new AvailableSlotCalculator();
const masterId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const windowId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

describe("AvailableSlotCalculator", () => {
  it("returns nothing for empty windows", () => {
    const result = calculator.calculate([], new Map(), 40, new Date("2026-09-03T08:00:00.000Z"));
    expect(result).toEqual([]);
  });

  it("slices a full shift by service duration", () => {
    const result = calculator.calculate(
      [{ id: windowId, masterId, scheduleDate: "2026-09-10", startTime: "10:00", endTime: "12:00" }],
      new Map([[windowId, []]]),
      40,
      new Date("2026-09-03T08:00:00.000Z"),
    );
    expect(result.map((s) => s.startTime)).toEqual(["10:00", "10:40", "11:20"]);
    expect(result[0]?.endTime).toBe("10:40");
  });

  it("subtracts a busy interval", () => {
    const result = calculator.calculate(
      [{ id: windowId, masterId, scheduleDate: "2026-09-10", startTime: "10:00", endTime: "13:00" }],
      new Map([[windowId, [{ startTime: "10:40", endTime: "11:20" }]]]),
      40,
      new Date("2026-09-03T08:00:00.000Z"),
    );
    expect(result.map((s) => s.startTime)).toEqual(["10:00", "11:20", "12:00"]);
  });

  it("applies 15 minute lead time for today", () => {
    const result = calculator.calculate(
      [{ id: windowId, masterId, scheduleDate: "2026-09-03", startTime: "10:00", endTime: "12:00" }],
      new Map([[windowId, []]]),
      40,
      new Date("2026-09-03T10:00:00.000Z"),
    );
    expect(result[0]?.startTime).toBe("10:15");
    expect(result.some((s) => s.startTime === "10:00")).toBe(false);
  });

  it("ignores a gap smaller than the service", () => {
    const result = calculator.calculate(
      [{ id: windowId, masterId, scheduleDate: "2026-09-10", startTime: "10:00", endTime: "11:00" }],
      new Map([[windowId, [{ startTime: "10:00", endTime: "10:30" }]]]),
      40,
      new Date("2026-09-03T08:00:00.000Z"),
    );
    expect(result).toEqual([]);
  });
});
