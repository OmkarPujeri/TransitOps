import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { VehiclesClient } from "./vehicles-client";
import type { Vehicle } from "@/lib/types";

export default async function VehiclesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Vehicle Registry" subtitle="Master list of every vehicle in the fleet." />
      <VehiclesClient vehicles={(data ?? []) as Vehicle[]} />
    </div>
  );
}
