"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Truck } from "lucide-react";
import { login } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-bold">TransitOps</div>
            <div className="text-xs text-[var(--muted)]">Smart Transport Operations</div>
          </div>
        </div>

        <div className="card p-6">
          <h1 className="mb-1 text-xl font-semibold">Welcome back</h1>
          <p className="mb-6 text-sm text-[var(--muted)]">Sign in to your fleet console.</p>

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
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--muted)]">
            No account?{" "}
            <Link href="/signup" className="font-medium text-[var(--primary)]">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
