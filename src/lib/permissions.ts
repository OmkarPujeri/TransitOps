import type { Role } from "@/lib/types";

/**
 * Role-Based Access Control — single source of truth.
 *
 * Every app route maps to the roles that may VIEW it and the roles that may
 * EDIT (create / update / delete) within it. This drives three enforcement
 * layers: the sidebar (hide links), the layout route guard (block direct URLs),
 * and the client edit-gate (hide action buttons). The database enforces writes
 * independently via RLS (see supabase/rbac.sql).
 */

export type Access = {
  /** Roles allowed to open the page. */
  view: Role[];
  /** Roles allowed to mutate data on the page. Subset of `view`. */
  edit: Role[];
};

const ALL: Role[] = ["fleet_manager", "driver", "safety_officer", "financial_analyst"];

/**
 * Keyed by the top-level route segment. Fleet Manager is the admin and can
 * always edit; other roles are scoped to their spec job description.
 */
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

/** Normalise "/vehicles/123" or "vehicles" to the top-level segment "vehicles". */
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

/** The first page this role is allowed to see — used as a safe redirect target. */
export function landingFor(role: Role): string {
  if (canView(role, "dashboard")) return "/dashboard";
  const first = Object.keys(ROUTE_ACCESS).find((key) => ROUTE_ACCESS[key].view.includes(role));
  return first ? `/${first}` : "/dashboard";
}
