"use server";

import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE, THEME_COOKIE_MAX_AGE } from "@/lib/theme";

export async function setThemeAction(theme: string) {
  const next = parseTheme(theme);
  const store = await cookies();
  store.set(THEME_COOKIE, next, {
    path: "/",
    sameSite: "lax",
    maxAge: THEME_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
}
