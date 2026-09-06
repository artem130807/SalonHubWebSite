import { describe, expect, it } from "vitest";
import { isUniqueConstraintError } from "@/server/infrastructure/prisma-errors";

describe("isUniqueConstraintError", () => {
  it("detects Prisma unique violations without relying on instanceof", () => {
    expect(isUniqueConstraintError({ code: "P2002", message: "Unique constraint failed" })).toBe(true);
    expect(isUniqueConstraintError({ code: "P2025" })).toBe(false);
    expect(isUniqueConstraintError(new Error("Unique constraint failed"))).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
  });
});
