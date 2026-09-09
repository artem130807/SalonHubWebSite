import { describe, expect, it } from "vitest";
import { stepIndex, swipeDirection, wrapIndex } from "@/lib/carousel";

describe("carousel helpers", () => {
  it("wraps indexes around the gallery", () => {
    expect(wrapIndex(-1, 3)).toBe(2);
    expect(wrapIndex(3, 3)).toBe(0);
    expect(stepIndex(0, 4, -1)).toBe(3);
    expect(stepIndex(3, 4, 1)).toBe(0);
  });

  it("detects a swipe only after the threshold", () => {
    expect(swipeDirection(-12)).toBe(0);
    expect(swipeDirection(-40)).toBe(1);
    expect(swipeDirection(55)).toBe(-1);
  });
});
