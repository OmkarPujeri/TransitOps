import * as React from "react";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  success: "bg-green-500/15 text-green-400",
  info: "bg-sky-500/15 text-sky-400",
  warning: "bg-amber-500/15 text-amber-400",
  danger: "bg-red-500/15 text-red-400",
  muted: "bg-white/8 text-[var(--muted)]",
  primary: "bg-[var(--primary)]/15 text-blue-400",
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
