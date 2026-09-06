import { describe, expect, it } from "vitest";
import { applyRating, isValidStarRating, removeRating } from "@/server/domain/rating";

describe("rating math", () => {
  it("accepts only integer stars 1-5", () => {
    expect(isValidStarRating(5)).toBe(true);
    expect(isValidStarRating(1)).toBe(true);
    expect(isValidStarRating(0)).toBe(false);
    expect(isValidStarRating(4.5)).toBe(false);
  });

  it("adds the first rating", () => {
    expect(applyRating(0, 0, 5)).toEqual({ rating: 5, ratingCount: 1 });
  });

  it("averages a second rating", () => {
    expect(applyRating(5, 1, 3)).toEqual({ rating: 4, ratingCount: 2 });
  });

  it("replaces a rating in place", () => {
    expect(applyRating(5, 1, 4, 5)).toEqual({ rating: 4, ratingCount: 1 });
  });

  it("clears the average when the last review is removed", () => {
    expect(removeRating(5, 1, 5)).toEqual({ rating: 0, ratingCount: 0 });
    expect(removeRating(4, 2, 5)).toEqual({ rating: 3, ratingCount: 1 });
  });
});
