import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { RoleProvider } from "@/components/role-context";
import type { Role } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const name = profile?.full_name ?? user.email ?? "User";
  const role = (profile?.role ?? "fleet_manager") as Role;

  return (
    <RoleProvider role={role}>
      <div className="flex min-h-screen">
        <Sidebar name={name} role={role} />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-7xl p-6">{children}</div>
        </main>
      </div>
    </RoleProvider>
  );
}
