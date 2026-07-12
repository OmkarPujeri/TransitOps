"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  Sparkles,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { canView } from "@/lib/permissions";
import { logout } from "@/app/(auth)/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Vehicles", icon: Truck },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/trips", label: "Trips", icon: Route },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/expenses", label: "Fuel & Expenses", icon: Fuel },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/copilot", label: "AI Copilot", icon: Sparkles },
];

export function Sidebar({ name, role }: { name: string; role: Role }) {
  const pathname = usePathname();
  const nav = NAV.filter((item) => canView(role, item.href));

  return (
    <aside className="flex w-60 flex-col border-r border-[var(--border)] bg-[var(--background)]">
      <Link href="/" className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight">TransitOps</div>
          <div className="text-[10px] text-[var(--muted)]">Fleet Operations</div>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-[var(--primary)]")} />
              {label}
              {href === "/copilot" && !active && (
                <span className="ml-auto rounded-full bg-[var(--primary)]/15 px-1.5 text-[9px] font-bold text-[var(--primary)]">
                  AI
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        <div className="mb-2 px-2">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="text-xs text-[var(--muted)]">{ROLE_LABELS[role]}</div>
        </div>
        <form action={logout}>
          <button className="flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--danger)]">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
