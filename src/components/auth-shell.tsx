import Link from "next/link";
import { Truck, Route, Gauge, ShieldCheck } from "lucide-react";

// Split-screen auth: branded panel on the left, form on the right. Panel hides on mobile.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-[var(--primary)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold leading-tight">TransitOps</div>
            <div className="text-xs text-white/70">Smart Transport Operations</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Every vehicle, driver, and trip — in one console.
          </h2>
          <p className="mt-3 text-sm text-white/80">
            Replace the spreadsheets. Dispatch with live validation, track fuel and
            costs, and see fleet utilization the moment it changes.
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            {[
              { icon: Route, text: "Dispatch with automatic status transitions" },
              { icon: ShieldCheck, text: "License & safety compliance, enforced" },
              { icon: Gauge, text: "Utilization and cost analytics, live" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/60">
          Built for logistics teams who’d rather ship than reconcile.
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile-only brand mark (the aside is hidden below lg) */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold">TransitOps</div>
              <div className="text-xs text-[var(--muted)]">Smart Transport Operations</div>
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthSwitch({
  prompt,
  href,
  action,
}: {
  prompt: string;
  href: string;
  action: string;
}) {
  return (
    <p className="mt-6 text-center text-sm text-[var(--muted)]">
      {prompt}{" "}
      <Link href={href} className="font-medium text-[var(--primary)] hover:underline">
        {action}
      </Link>
    </p>
  );
}
