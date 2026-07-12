"use client";

import * as React from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { TH } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Dir = "asc" | "desc";

// Client-side sorting: returns sorted rows + a clickable SortTH header.
// Numbers sort numerically, everything else by locale string.
export function useSort<T>(rows: T[], initialKey?: keyof T & string) {
  const [key, setKey] = React.useState<(keyof T & string) | null>(initialKey ?? null);
  const [dir, setDir] = React.useState<Dir>("asc");

  const sorted = React.useMemo(() => {
    if (!key) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[key] as unknown;
      const bv = b[key] as unknown;
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      }
      return dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, key, dir]);

  function toggle(k: keyof T & string) {
    if (key === k) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setKey(k);
      setDir("asc");
    }
  }

  // Sortable header cell.
  function SortTH({
    field,
    children,
    className,
  }: {
    field: keyof T & string;
    children: React.ReactNode;
    className?: string;
  }) {
    const active = key === field;
    return (
      <TH className={cn("cursor-pointer select-none", className)}>
        <button
          type="button"
          onClick={() => toggle(field)}
          className={cn(
            "inline-flex items-center gap-1 transition hover:text-[var(--foreground)]",
            active && "text-[var(--foreground)]"
          )}
        >
          {children}
          {active ? (
            dir === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ChevronsUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      </TH>
    );
  }

  return { sorted, SortTH };
}
