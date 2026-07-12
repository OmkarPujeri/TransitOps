"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
type ThemeCtx = { theme: Theme; toggle: () => void };

const Ctx = React.createContext<ThemeCtx | null>(null);

/** Runs before paint (in <head>) to apply the saved theme with no flash. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    // Sync state to whatever the pre-paint script already applied.
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const toggle = React.useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem("theme", next);
      } catch {}
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Compact icon toggle for the sidebar footer. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={
        "flex items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] " +
        (className ?? "")
      }
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {dark ? "Light" : "Dark"}
    </button>
  );
}
