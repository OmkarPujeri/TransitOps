import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatCompletion, groqConfigured } from "@/lib/groq";
import type { Vehicle, Driver } from "@/lib/types";

// Dispatch ranking: POST { cargo_weight_kg } -> { vehicle_id, driver_id, reason } | { error }.
// Pick is deterministic (always valid); Groq only writes the "why", falling back to a template.
export async function POST(req: Request) {
  let cargo = 0;
  try {
    const body = await req.json();
    cargo = Number(body?.cargo_weight_kg) || 0;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (cargo <= 0) {
    return NextResponse.json({ error: "Enter a cargo weight to get a recommendation." }, { status: 400 });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: vehicleRows }, { data: driverRows }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("status", "available"),
    supabase.from("drivers").select("*").eq("status", "available"),
  ]);

  const vehicles = (vehicleRows ?? []) as Vehicle[];
  const drivers = (driverRows ?? []) as Driver[];

  // Eligible drivers: available with a license that hasn't expired.
  const eligibleDrivers = drivers.filter((d) => d.license_expiry >= today);

  // Vehicles that can actually carry the load.
  const fitting = vehicles.filter((v) => v.max_load_kg >= cargo);

  if (fitting.length === 0) {
    return NextResponse.json({
      error: `No available vehicle can carry ${cargo.toLocaleString()} kg.`,
    });
  }
  if (eligibleDrivers.length === 0) {
    return NextResponse.json({ error: "No available driver with a valid license." });
  }

  // Best vehicle: smallest sufficient capacity (least wasted capacity), then lowest odometer.
  const vehicle = [...fitting].sort(
    (a, b) => a.max_load_kg - b.max_load_kg || a.odometer - b.odometer
  )[0];

  // Best driver: highest safety score, then most license runway.
  const driver = [...eligibleDrivers].sort(
    (a, b) => b.safety_score - a.safety_score || (a.license_expiry < b.license_expiry ? 1 : -1)
  )[0];

  const spare = vehicle.max_load_kg - cargo;
  const fallbackReason =
    `${vehicle.reg_number} (${vehicle.max_load_kg.toLocaleString()}kg capacity, ` +
    `${spare.toLocaleString()}kg to spare) is the tightest fit for ${cargo.toLocaleString()}kg, ` +
    `paired with ${driver.full_name} (safety score ${driver.safety_score}) — the top pick among ` +
    `${fitting.length} suitable vehicle(s) and ${eligibleDrivers.length} eligible driver(s).`;

  let reason = fallbackReason;

  if (groqConfigured()) {
    try {
      reason = await chatCompletion(
        [
          {
            role: "system",
            content:
              "You are a fleet dispatch assistant. In ONE concise sentence (max 35 words), " +
              "explain why this vehicle and driver are the best choice for the cargo. " +
              "Reference concrete numbers (capacity, spare capacity, safety score). " +
              "Plain text only — no markdown, no preamble.",
          },
          {
            role: "user",
            content: JSON.stringify({
              cargo_weight_kg: cargo,
              chosen_vehicle: {
                reg: vehicle.reg_number,
                model: vehicle.name_model,
                capacity_kg: vehicle.max_load_kg,
                spare_kg: spare,
                odometer_km: vehicle.odometer,
              },
              chosen_driver: {
                name: driver.full_name,
                safety_score: driver.safety_score,
                license_expiry: driver.license_expiry,
              },
              pool: {
                suitable_vehicles: fitting.length,
                eligible_drivers: eligibleDrivers.length,
              },
            }),
          },
        ],
        { temperature: 0.3, maxTokens: 120 }
      );
    } catch {
      // Groq down / bad key — silently use the deterministic explanation.
      reason = fallbackReason;
    }
  }

  return NextResponse.json({
    vehicle_id: vehicle.id,
    driver_id: driver.id,
    reason,
  });
}
