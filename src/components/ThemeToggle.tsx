"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { oppositeTheme } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const next = oppositeTheme(theme);
  const label = next === "light" ? "Включить светлую тему" : "Включить тёмную тему";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(next)}
      className={`w-10 h-10 rounded-full border border-outline bg-surface/70 text-onSurface hover:border-primary hover:text-primary hover:bg-primary/10 transition-colors inline-flex items-center justify-center ${className}`}
    >
      {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  );
}
