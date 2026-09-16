import { describe, expect, it } from "vitest";
import { parseInternalPath, withReturnTo } from "@/lib/safe-path";

describe("parseInternalPath", () => {
  it("accepts in-app paths and rejects open redirects", () => {
    expect(parseInternalPath("/salons/1")).toBe("/salons/1");
    expect(parseInternalPath("/login?x=1")).toBe("/login?x=1");
    expect(parseInternalPath("//evil.test")).toBeNull();
    expect(parseInternalPath("https://evil.test")).toBeNull();
    expect(parseInternalPath("/\\evil.test")).toBeNull();
    expect(parseInternalPath("")).toBeNull();
  });
});

describe("withReturnTo", () => {
  it("appends a safe from query", () => {
    expect(withReturnTo("/login", "/masters/1")).toBe("/login?from=%2Fmasters%2F1");
    expect(withReturnTo("/register?x=1", "/salons/1")).toBe("/register?x=1&from=%2Fsalons%2F1");
    expect(withReturnTo("/login", "//evil.test")).toBe("/login");
  });
});
