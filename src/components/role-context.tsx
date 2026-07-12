"use client";

import * as React from "react";
import type { Role } from "@/lib/types";
import { canEdit as canEditRoute } from "@/lib/permissions";

/**
 * Makes the current user's role available to client components so they can
 * gate edit affordances (hide "Add"/"Delete" buttons for read-only roles).
 * This is UX only — the layout route guard and RLS are the real enforcement.
 */
const RoleCtx = React.createContext<Role | null>(null);

export function RoleProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  return <RoleCtx.Provider value={role}>{children}</RoleCtx.Provider>;
}

export function useRole(): Role {
  const role = React.useContext(RoleCtx);
  if (!role) throw new Error("useRole must be used within RoleProvider");
  return role;
}

/** True if the current role may edit the given route (defaults to the current path's segment). */
export function useCanEdit(pathname: string): boolean {
  const role = useRole();
  return canEditRoute(role, pathname);
}
