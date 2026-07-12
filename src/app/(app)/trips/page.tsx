import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { TripsClient } from "./trips-client";
import type { Trip, Vehicle, Driver } from "@/lib/types";

export default async function TripsPage() {
  const supabase = await createClient();

  const [{ data: trips }, { data: vehicles }, { data: drivers }] = await Promise.all([
    supabase
      .from("trips")
      .select("*, vehicles(*), drivers(*)")
      .order("created_at", { ascending: false }),
    supabase.from("vehicles").select("*").order("reg_number"),
    supabase.from("drivers").select("*").order("full_name"),
  ]);

  return (
    <div>
      <PageHeader
        title="Trip Management"
        subtitle="Dispatch with automatic validation. Statuses cascade to vehicles & drivers."
      />
      <TripsClient
        trips={(trips ?? []) as Trip[]}
        vehicles={(vehicles ?? []) as Vehicle[]}
        drivers={(drivers ?? []) as Driver[]}
      />
    </div>
  );
}
