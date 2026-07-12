"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Truck } from "lucide-react";
import { signup } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/types";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, null);

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
          <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
          <p className="mb-6 text-sm text-[var(--muted)]">Set up your operations console.</p>

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
            </div>
            {state?.error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-[var(--muted)]">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--primary)]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
