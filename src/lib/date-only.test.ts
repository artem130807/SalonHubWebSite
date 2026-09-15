import { describe, expect, it } from "vitest";
import { addDateOnly, addMonths, isYearMonth, monthOffset, paddedMonthRange, parseYearMonth, weekdayMonday0 } from "@/lib/date-only";

describe("date-only calendar grid", () => {
  it("pads September 2026 from Monday to the Monday after month end", () => {
    expect(weekdayMonday0("2026-09-01")).toBe(1);
    expect(paddedMonthRange("2026-09")).toEqual({ from: "2026-08-31", to: "2026-10-05" });
  });

  it("shifts months across the year boundary", () => {
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(monthOffset("2026-09", "2027-01")).toBe(4);
    expect(addDateOnly("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("rejects impossible month numbers", () => {
    expect(parseYearMonth("2026-13")).toBeNull();
    expect(parseYearMonth("2026-00")).toBeNull();
    expect(isYearMonth("2026-13")).toBe(false);
    expect(isYearMonth("2026-09")).toBe(true);
  });
});
