export const THEME_COOKIE = "salonhub-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "dark";

export function parseTheme(value: string | null | undefined): Theme {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "light" || normalized === "dark") return normalized;
  return DEFAULT_THEME;
}

export function oppositeTheme(theme: Theme): Theme {
  return theme === "light" ? "dark" : "light";
}
