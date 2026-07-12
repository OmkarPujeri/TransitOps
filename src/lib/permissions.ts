import type { Role } from "@/lib/types";

// RBAC single source of truth: which roles may view/edit each route.
// Drives the sidebar, route guard, and edit-gates; RLS enforces writes at the DB (supabase/rbac.sql).

export type Access = {
  view: Role[]; // roles allowed to open the page
  edit: Role[]; // roles allowed to mutate data (subset of view)
};

const ALL: Role[] = ["fleet_manager", "driver", "safety_officer", "financial_analyst"];

// Keyed by top-level route segment. Fleet Manager is admin; others scoped to their job.
export const ROUTE_ACCESS: Record<string, Access> = {
  dashboard: { view: ALL, edit: ["fleet_manager"] },
  vehicles: { view: ALL, edit: ["fleet_manager"] },
  drivers: { view: ALL, edit: ["fleet_manager", "safety_officer"] },
  trips: { view: ["fleet_manager", "driver"], edit: ["fleet_manager", "driver"] },
  maintenance: { view: ["fleet_manager", "financial_analyst"], edit: ["fleet_manager"] },
  expenses: { view: ["fleet_manager", "financial_analyst"], edit: ["fleet_manager", "financial_analyst"] },
  reports: { view: ["fleet_manager", "safety_officer", "financial_analyst"], edit: ["fleet_manager"] },
  copilot: { view: ALL, edit: ALL },
};

// Normalise "/vehicles/123" or "vehicles" to the segment "vehicles".
export function routeKey(pathname: string): string {
  return pathname.replace(/^\/+/, "").split("/")[0] ?? "";
}

export function canView(role: Role, pathname: string): boolean {
  const access = ROUTE_ACCESS[routeKey(pathname)];
  if (!access) return true; // unknown routes aren't RBAC-restricted
  return access.view.includes(role);
}

export function canEdit(role: Role, pathname: string): boolean {
  const access = ROUTE_ACCESS[routeKey(pathname)];
  if (!access) return false;
  return access.edit.includes(role);
}

// First page this role can see — a safe redirect target.
export function landingFor(role: Role): string {
  if (canView(role, "dashboard")) return "/dashboard";
  const first = Object.keys(ROUTE_ACCESS).find((key) => ROUTE_ACCESS[key].view.includes(role));
  return first ? `/${first}` : "/dashboard";
}
