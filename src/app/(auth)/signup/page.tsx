"use client";

import { useActionState } from "react";
import { signup } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/types";
import { AuthShell, AuthSwitch } from "@/components/auth-shell";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, null);

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-[var(--muted)]">Set up your operations console.</p>

      <form action={action} className="space-y-4">
        <div>
          <Label>Full name</Label>
          <Input name="full_name" required placeholder="Jordan Fleet" />
        </div>
        <div>
          <Label>Email</Label>
          <Input name="email" type="email" required placeholder="you@fleet.com" />
        </div>
        <div>
          <Label>Password</Label>
          <Input name="password" type="password" required minLength={6} placeholder="••••••••" />
        </div>
        <div>
          <Label>Role</Label>
          <Select name="role" defaultValue="fleet_manager">
            {Object.entries(ROLE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            Sets what you can access. In production this would be assigned by an admin invite.
          </p>
        </div>
        {state?.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>

      <AuthSwitch prompt="Already have an account?" href="/login" action="Sign in" />
    </AuthShell>
  );
}
