import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { MaintenanceClient } from "./maintenance-client";
import type { MaintenanceLog, Vehicle } from "@/lib/types";

export default async function MaintenancePage() {
  const supabase = await createClient();
  const [{ data: logs }, { data: vehicles }] = await Promise.all([
    supabase
      .from("maintenance_logs")
      .select("*, vehicles(*)")
      .order("opened_at", { ascending: false }),
    supabase.from("vehicles").select("*").neq("status", "retired").order("reg_number"),
  ]);

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Opening a log sends the vehicle to the shop and hides it from dispatch."
      />
      <MaintenanceClient
        logs={(logs ?? []) as MaintenanceLog[]}
        vehicles={(vehicles ?? []) as Vehicle[]}
      />
    </div>
  );
}
