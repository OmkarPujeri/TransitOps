import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ReportsClient } from "./reports-client";
import type { Vehicle, Trip, FuelLog, Expense, MaintenanceLog } from "@/lib/types";

export default async function ReportsPage() {
  const supabase = await createClient();

  const [vehiclesRes, tripsRes, fuelRes, expensesRes, maintRes] = await Promise.all([
    supabase.from("vehicles").select("*"),
    supabase.from("trips").select("*"),
    supabase.from("fuel_logs").select("*"),
    supabase.from("expenses").select("*"),
    supabase.from("maintenance_logs").select("*"),
  ]);

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Fleet cost, utilization, and performance." />
      <ReportsClient
        vehicles={(vehiclesRes.data ?? []) as Vehicle[]}
        trips={(tripsRes.data ?? []) as Trip[]}
        fuelLogs={(fuelRes.data ?? []) as FuelLog[]}
        expenses={(expensesRes.data ?? []) as Expense[]}
        maintenance={(maintRes.data ?? []) as MaintenanceLog[]}
      />
    </div>
  );
}
