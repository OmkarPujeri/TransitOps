import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

const TONE: Record<string, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
  muted: "var(--muted)",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: string;
}) {
  const color = TONE[tone] ?? TONE.primary;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
        </div>
        {Icon && (
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius)]"
            style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </span>
        )}
      </div>
    </Card>
  );
}
