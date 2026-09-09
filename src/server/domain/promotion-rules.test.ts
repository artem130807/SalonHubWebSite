import { describe, expect, it } from "vitest";
import {
  bestDiscountForService,
  discountedPrice,
  isPromotionLive,
  parsePromotionBoundary,
  validatePromotionDraft,
} from "@/server/domain/promotion-rules";

describe("promotion rules", () => {
  const now = new Date("2026-09-10T12:00:00.000Z");

  it("treats inactive and out-of-window promotions as not live", () => {
    expect(isPromotionLive({ isActive: false, startsAt: null, endsAt: null }, now)).toBe(false);
    expect(
      isPromotionLive({ isActive: true, startsAt: new Date("2026-09-11T00:00:00.000Z"), endsAt: null }, now),
    ).toBe(false);
    expect(
      isPromotionLive({ isActive: true, startsAt: null, endsAt: new Date("2026-09-09T23:59:59.000Z") }, now),
    ).toBe(false);
    expect(isPromotionLive({ isActive: true, startsAt: null, endsAt: null }, now)).toBe(true);
  });

  it("rejects an inverted date range and an out-of-range discount", () => {
    expect(
      validatePromotionDraft({
        title: "Стрижка",
        discountPercent: 20,
        startsAt: new Date("2026-09-12T00:00:00.000Z"),
        endsAt: new Date("2026-09-01T00:00:00.000Z"),
      }),
    ).toMatch(/окончания/i);
    expect(
      validatePromotionDraft({
        title: "Стрижка",
        discountPercent: 100,
        startsAt: null,
        endsAt: null,
      }),
    ).toMatch(/скидка/i);
    expect(
      validatePromotionDraft({
        title: "  ",
        discountPercent: 15,
        startsAt: null,
        endsAt: null,
      }),
    ).toMatch(/название/i);
  });

  it("applies the best matching discount to a service", () => {
    const offers = [
      { discountPercent: 10, serviceId: null },
      { discountPercent: 25, serviceId: "cut" },
      { discountPercent: 40, serviceId: "shave" },
    ];
    expect(bestDiscountForService(offers, "cut")).toBe(25);
    expect(bestDiscountForService(offers, "color")).toBe(10);
    expect(discountedPrice(1500, 25)).toBe(1125);
  });

  it("parses date-only boundaries as UTC day start and end", () => {
    expect(parsePromotionBoundary("2026-09-10", false)?.toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(parsePromotionBoundary("2026-09-10", true)?.toISOString()).toBe("2026-09-10T23:59:59.999Z");
    expect(parsePromotionBoundary("not-a-date", false)).toBeNull();
  });
});
