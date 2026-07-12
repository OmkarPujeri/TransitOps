import Link from "next/link";
import { Truck, Route, Gauge, ShieldCheck } from "lucide-react";

// Split-screen auth: branded panel on the left, form on the right. Panel hides on mobile.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel — flat black with a single blue accent, no glass. */}
      <aside className="relative hidden overflow-hidden border-r border-[var(--border)] bg-[var(--surface)] p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" />
        <Link href="/" className="relative flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold leading-tight">TransitOps</div>
            <div className="text-xs text-[var(--muted)]">Smart Transport Operations</div>
          </div>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Every vehicle, driver, and trip — in one console.
          </h2>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Replace the spreadsheets. Dispatch with live validation, track fuel and costs, and see
            fleet utilization the moment it changes.
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            {[
              { icon: Route, text: "Dispatch with automatic status transitions" },
              { icon: ShieldCheck, text: "License & safety compliance, enforced" },
              { icon: Gauge, text: "Utilization and cost analytics, live" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/12 text-[var(--primary)]">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-[var(--muted)]">
          Built for logistics teams who&rsquo;d rather ship than reconcile.
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-[var(--background)] p-6">
        <div className="w-full max-w-sm">
          {/* Mobile-only brand mark (the aside is hidden below lg) */}
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-bold">TransitOps</div>
              <div className="text-xs text-[var(--muted)]">Smart Transport Operations</div>
            </div>
          </Link>
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
