"use client";

import * as React from "react";
import type { Role } from "@/lib/types";
import { canEdit as canEditRoute } from "@/lib/permissions";

// Exposes the user's role to client components for edit-gating (UX only; route guard + RLS enforce).
const RoleCtx = React.createContext<Role | null>(null);

export function RoleProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  return <RoleCtx.Provider value={role}>{children}</RoleCtx.Provider>;
}

export function useRole(): Role {
  const role = React.useContext(RoleCtx);
  if (!role) throw new Error("useRole must be used within RoleProvider");
  return role;
}

// True if the current role may edit the given route.
export function useCanEdit(pathname: string): boolean {
  const role = useRole();
  return canEditRoute(role, pathname);
}
