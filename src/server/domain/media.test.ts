import { describe, expect, it } from "vitest";
import { isAllowedPhotoUrl, isUuid } from "@/server/domain/media";

describe("isAllowedPhotoUrl", () => {
  it("accepts uploaded files and https URLs", () => {
    expect(isAllowedPhotoUrl("/uploads/a1b2c3.jpg")).toBe(true);
    expect(isAllowedPhotoUrl("https://cdn.example.com/photo.png")).toBe(true);
  });

  it("rejects traversal, scripts, and http", () => {
    expect(isAllowedPhotoUrl("/uploads/../.env")).toBe(false);
    expect(isAllowedPhotoUrl("/uploads/foo/../../secret")).toBe(false);
    expect(isAllowedPhotoUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedPhotoUrl("http://example.com/x.jpg")).toBe(false);
    expect(isAllowedPhotoUrl("/uploads/")).toBe(false);
  });
});

describe("isUuid", () => {
  it("accepts canonical UUIDs and rejects garbage", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});
