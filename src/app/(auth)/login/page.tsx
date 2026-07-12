"use client";

import { useActionState } from "react";
import { login } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AuthShell, AuthSwitch } from "@/components/auth-shell";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-[var(--muted)]">Sign in to your fleet console.</p>

      <form action={action} className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input name="email" type="email" required placeholder="you@fleet.com" />
        </div>
        <div>
          <Label>Password</Label>
          <Input name="password" type="password" required placeholder="••••••••" />
        </div>
        {state?.error && (
          <p className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-red-400">{state.error}</p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <AuthSwitch prompt="No account?" href="/signup" action="Create one" />
    </AuthShell>
  );
}
