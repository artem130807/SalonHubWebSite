import { describe, expect, it } from "vitest";
import { oppositeTheme, parseTheme } from "@/lib/theme";

describe("theme preference", () => {
  it("defaults to dark and only accepts light or dark", () => {
    expect(parseTheme(undefined)).toBe("dark");
    expect(parseTheme("")).toBe("dark");
    expect(parseTheme("white")).toBe("dark");
    expect(parseTheme("LIGHT")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("flips between light and dark", () => {
    expect(oppositeTheme("dark")).toBe("light");
    expect(oppositeTheme("light")).toBe("dark");
  });
});
