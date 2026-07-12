import Link from "next/link";
import {
  Truck,
  Route,
  ShieldCheck,
  Gauge,
  Sparkles,
  Wrench,
  Fuel,
  ArrowRight,
  Check,
  LayoutDashboard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// The public entry point: marketing landing → login → dashboard.
// A server component so the nav can adapt to whether the visitor is signed in.
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authed = Boolean(user);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Nav authed={authed} />
      <Hero authed={authed} />
      <Logos />
      <Features />
      <Workflow />
      <CTA authed={authed} />
      <Footer />
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
        <Truck className="h-4 w-4" />
      </span>
      <span className="text-base font-bold tracking-tight">TransitOps</span>
    </Link>
  );
}

function Nav({ authed }: { authed: boolean }) {
  const links = [
    { href: "#features", label: "Features" },
    { href: "#workflow", label: "How it works" },
    { href: "#features", label: "Solutions" },
    { href: "#cta", label: "Pricing" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] border-dashed bg-[var(--background)]/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-sm text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {authed ? (
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius)] bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90"
            >
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-9 items-center rounded-[var(--radius)] px-4 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center rounded-[var(--radius)] bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ authed }: { authed: boolean }) {
  return (
    <section className="relative overflow-hidden">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-6xl px-6 pb-0 pt-24 text-center sm:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-[var(--muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
          Fleet operations, unified
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Run your whole fleet
          <br />
          without the spreadsheets
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--muted)]">
          TransitOps unifies vehicles, drivers, dispatch, maintenance and costs, with a status
          engine enforced at the database, not the UI.
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link
            href={authed ? "/dashboard" : "/signup"}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] bg-white px-6 text-sm font-medium text-black transition hover:bg-white/90"
          >
            {authed ? "Go to dashboard" : "Start free"}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#features"
            className="inline-flex h-11 items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-6 text-sm font-medium transition hover:bg-[var(--surface-2)]"
          >
            See how it works
          </Link>
        </div>

        <DashboardPreview />
      </div>
    </section>
  );
}

// An in-theme product shot built from real markup — no screenshot asset needed.
function DashboardPreview() {
  const bars = [96, 44, 28, 26, 15, 13, 14, 12, 11, 10, 8, 7];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return (
    <div className="relative mt-16 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-t-xl border border-[var(--border)] bg-[var(--surface)] text-left shadow-2xl">
        <div className="flex">
          {/* Mini sidebar */}
          <div className="hidden w-48 shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--background)] p-3 sm:flex">
            <div className="mb-3 flex items-center gap-2 px-2 py-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary)] text-white">
                <Truck className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-bold">TransitOps</span>
            </div>
            {[
              { icon: LayoutDashboard, label: "Dashboard", active: true },
              { icon: Truck, label: "Vehicles" },
              { icon: Route, label: "Trips" },
              { icon: Wrench, label: "Maintenance" },
              { icon: Fuel, label: "Expenses" },
            ].map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs " +
                  (active
                    ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                    : "text-[var(--muted)]")
                }
              >
                <Icon className={"h-3.5 w-3.5 " + (active ? "text-[var(--primary)]" : "")} />
                {label}
              </div>
            ))}
          </div>

          {/* Panel */}
          <div className="min-w-0 flex-1 p-5">
            <div className="mb-4 grid grid-cols-3 gap-3">
              {[
                { k: "Active Trips", v: "24", d: "+32%", up: true },
                { k: "Utilization", v: "78%", d: "+8%", up: true },
                { k: "Open Jobs", v: "6", d: "-15%", up: false },
              ].map((s) => (
                <div key={s.k} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">{s.k}</div>
                  <div className="mt-1 flex items-end justify-between">
                    <div className="text-xl font-bold">{s.v}</div>
                    <div className={"text-[10px] " + (s.up ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                      {s.d}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="text-sm font-semibold">New Orders</div>
              <div className="text-xs text-[var(--muted)]">Visualize your main activities data</div>
              <div className="mt-4 flex h-40 items-end gap-1.5">
                {bars.map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full rounded-sm bg-[var(--primary)]"
                      style={{ height: `${h}%` }}
                    />
                    <span className="text-[8px] text-[var(--muted)]">{months[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Logos() {
  return (
    <section className="border-y border-[var(--border)] py-10">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-xs uppercase tracking-widest text-[var(--muted)]">
          Trusted by operations teams moving freight every day
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-lg font-semibold text-[var(--muted)]">
          {["Northbound", "CargoLine", "Meridian", "Freightly", "Axle & Co", "Vantage"].map((n) => (
            <span key={n} className="opacity-70">
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Route,
    title: "Dispatch with live validation",
    body: "Load limits, license expiry and availability are checked before a trip goes out, not after.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance, enforced",
    body: "License and safety rules live in Postgres triggers, so the UI can't bypass them.",
  },
  {
    icon: Gauge,
    title: "Utilization in real time",
    body: "See which vehicles are idle, on trip, or in the shop the moment status changes.",
  },
  {
    icon: Wrench,
    title: "Maintenance state machine",
    body: "Opening and closing jobs moves vehicles in and out of service automatically.",
  },
  {
    icon: Fuel,
    title: "Fuel & cost tracking",
    body: "Log fuel and expenses against trips and vehicles, and watch cost-per-km trend.",
  },
  {
    icon: Sparkles,
    title: "AI Copilot",
    body: "Ask about idle vehicles or the best driver for a load, grounded in your live data.",
  },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything the fleet touches</h2>
        <p className="mt-4 text-[var(--muted)]">
          One console for the whole lifecycle, from registering a vehicle to closing the books on a
          trip.
        </p>
      </div>
      <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="bg-[var(--surface)] p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/12 text-[var(--primary)]">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    { n: "01", title: "Register your fleet", body: "Add vehicles and drivers with licenses, load limits and safety scores." },
    { n: "02", title: "Dispatch trips", body: "Draft, validate and dispatch. The status engine keeps everything in sync." },
    { n: "03", title: "Track and report", body: "Watch utilization, costs and compliance live, and export what you need." },
  ];
  return (
    <section id="workflow" className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Live in three steps</h2>
          <p className="mt-4 text-[var(--muted)]">No migration project. Set up your fleet and dispatch the same day.</p>
        </div>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="text-sm font-bold text-[var(--primary)]">{s.n}</div>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA({ authed }: { authed: boolean }) {
  const points = ["Role-based access", "Enforced at the database", "AI Copilot included"];
  return (
    <section id="cta" className="mx-auto max-w-6xl px-6 py-24">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center sm:p-16">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to ship, not reconcile?</h2>
          <p className="mx-auto mt-4 max-w-lg text-[var(--muted)]">
            Replace the spreadsheets with a console built for how fleets actually run.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href={authed ? "/dashboard" : "/signup"}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] bg-white px-6 text-sm font-medium text-black transition hover:bg-white/90"
            >
              {authed ? "Go to dashboard" : "Create your account"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
            {points.map((p) => (
              <span key={p} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-[var(--primary)]" /> {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <Logo />
        <p className="text-xs text-[var(--muted)]">
          © 2026 TransitOps · Smart Transport Operations.
        </p>
        <div className="flex items-center gap-6 text-sm text-[var(--muted)]">
          <Link href="/login" className="transition hover:text-[var(--foreground)]">
            Sign in
          </Link>
          <Link href="/signup" className="transition hover:text-[var(--foreground)]">
            Get started
          </Link>
        </div>
      </div>
    </footer>
  );
}
