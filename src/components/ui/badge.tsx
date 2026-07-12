import * as React from "react";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  info: "bg-sky-100 text-sky-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  muted: "bg-slate-100 text-slate-600",
  primary: "bg-indigo-100 text-indigo-700",
};

export function Badge({
  tone = "muted",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone] ?? tones.muted,
        className
      )}
      {...props}
    />
  );
}
