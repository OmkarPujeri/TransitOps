import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { VehiclesClient } from "./vehicles-client";
import type { Vehicle, VehicleDocument } from "@/lib/types";

export default async function VehiclesPage() {
  const supabase = await createClient();

  const [vehiclesRes, docsRes] = await Promise.all([
    supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
    // The table may not exist yet (before documents.sql is run) — tolerate errors.
    supabase.from("vehicle_documents").select("*").order("uploaded_at", { ascending: false }),
  ]);

  // Group documents by vehicle so each row gets its own list.
  const documents: Record<string, VehicleDocument[]> = {};
  for (const doc of (docsRes.data ?? []) as VehicleDocument[]) {
    (documents[doc.vehicle_id] ??= []).push(doc);
  }

  return (
    <div>
      <PageHeader title="Vehicle Registry" subtitle="Master list of every vehicle in the fleet." />
      <VehiclesClient vehicles={(vehiclesRes.data ?? []) as Vehicle[]} documents={documents} />
    </div>
  );
}
