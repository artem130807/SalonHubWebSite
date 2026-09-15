"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { setThemeAction } from "@/app/actions/theme";
import { parseTheme, type Theme } from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function ThemeProvider({ initialTheme, children }: { initialTheme: Theme; children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme(next) {
        const resolved = parseTheme(next);
        setThemeState(resolved);
        applyTheme(resolved);
        void setThemeAction(resolved);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
