import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ExpensesClient } from "./expenses-client";
import type { Vehicle, Trip, FuelLog, Expense } from "@/lib/types";

export default async function ExpensesPage() {
  const supabase = await createClient();

  const [fuel, expenses, vehicles, trips] = await Promise.all([
    supabase.from("fuel_logs").select("*").order("logged_at", { ascending: false }),
    supabase.from("expenses").select("*").order("logged_at", { ascending: false }),
    supabase.from("vehicles").select("*").order("reg_number"),
    supabase.from("trips").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader
        title="Fuel & Expenses"
        subtitle="Log fuel fill-ups and operating costs. Totals flow into Reports and the Dashboard."
      />
      <ExpensesClient
        fuelLogs={(fuel.data ?? []) as FuelLog[]}
        expenses={(expenses.data ?? []) as Expense[]}
        vehicles={(vehicles.data ?? []) as Vehicle[]}
        trips={(trips.data ?? []) as Trip[]}
      />
    </div>
  );
}
