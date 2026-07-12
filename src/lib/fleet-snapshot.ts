import { createClient } from "@/lib/supabase/server";
import type { Vehicle, Driver, Trip } from "@/lib/types";

type DB = Awaited<ReturnType<typeof createClient>>;

export interface FleetSummary {
  vehiclesTotal: number;
  vehiclesAvailable: number;
  driversEligible: number;
  tripsActive: number;
  totalCost: number;
}

export interface FleetSnapshot {
  summary: FleetSummary;
  // Compact, LLM-friendly description of current fleet state.
  text: string;
}

// Reads current fleet state: a summary for headers and a compact text block to ground the copilot.
export async function buildFleetSnapshot(supabase: DB): Promise<FleetSnapshot> {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: vehicles }, { data: drivers }, { data: trips }, { data: fuel }, { data: expenses }, { data: maint }] =
    await Promise.all([
      supabase.from("vehicles").select("*").order("reg_number"),
      supabase.from("drivers").select("*").order("full_name"),
      supabase.from("trips").select("*, vehicles(reg_number), drivers(full_name)").order("created_at", { ascending: false }),
      supabase.from("fuel_logs").select("cost, liters, vehicle_id"),
      supabase.from("expenses").select("amount, vehicle_id"),
      supabase.from("maintenance_logs").select("cost, status, vehicle_id"),
    ]);

  const V = (vehicles ?? []) as Vehicle[];
  const D = (drivers ?? []) as Driver[];
  const T = (trips ?? []) as (Trip & { vehicles?: { reg_number: string } | null; drivers?: { full_name: string } | null })[];
  const F = (fuel ?? []) as { cost: number; liters: number; vehicle_id: string }[];
  const E = (expenses ?? []) as { amount: number; vehicle_id: string }[];
  const M = (maint ?? []) as { cost: number; status: string; vehicle_id: string }[];

  const vehiclesAvailable = V.filter((v) => v.status === "available");
  const eligibleDrivers = D.filter((d) => d.status === "available" && d.license_expiry >= today);
  const activeTrips = T.filter((t) => t.status === "dispatched");

  const fuelCost = F.reduce((s, f) => s + Number(f.cost ?? 0), 0);
  const expenseCost = E.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const maintCost = M.reduce((s, m) => s + Number(m.cost ?? 0), 0);
  const totalCost = fuelCost + expenseCost + maintCost;

  const countBy = (rows: { status: string }[]) =>
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

  const lines: string[] = [];
  lines.push(`FLEET (${V.length} vehicles): ${JSON.stringify(countBy(V))}`);
  lines.push(
    `Vehicles: ${V.map(
      (v) => `${v.reg_number} [${v.type}, cap ${v.max_load_kg}kg, ${v.odometer}km, ${v.status}, region ${v.region ?? "n/a"}]`
    ).join("; ")}`
  );
  lines.push(`DRIVERS (${D.length}): ${JSON.stringify(countBy(D))}`);
  lines.push(
    `Drivers: ${D.map(
      (d) => `${d.full_name} [safety ${d.safety_score}, license ${d.license_category} exp ${d.license_expiry}, ${d.status}]`
    ).join("; ")}`
  );
  lines.push(`TRIPS (${T.length}): ${JSON.stringify(countBy(T))}`);
  if (activeTrips.length) {
    lines.push(
      `Active trips: ${activeTrips
        .map(
          (t) =>
            `${t.source}->${t.destination} [${t.vehicles?.reg_number ?? "?"} / ${t.drivers?.full_name ?? "?"}, ${t.cargo_weight_kg}kg]`
        )
        .join("; ")}`
    );
  }
  lines.push(
    `COSTS: fuel $${Math.round(fuelCost)}, expenses $${Math.round(expenseCost)}, maintenance $${Math.round(
      maintCost
    )}, total $${Math.round(totalCost)}`
  );

  return {
    summary: {
      vehiclesTotal: V.length,
      vehiclesAvailable: vehiclesAvailable.length,
      driversEligible: eligibleDrivers.length,
      tripsActive: activeTrips.length,
      totalCost,
    },
    text: lines.join("\n"),
  };
}
