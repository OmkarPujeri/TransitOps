import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DriversClient } from "./drivers-client";
import type { Driver } from "@/lib/types";

export default async function DriversPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("drivers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Driver Management" subtitle="Profiles, license validity, and safety scores." />
      <DriversClient drivers={(data ?? []) as Driver[]} />
    </div>
  );
}
