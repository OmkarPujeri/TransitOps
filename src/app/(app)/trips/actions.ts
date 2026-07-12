"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

function refresh() {
  revalidatePath("/trips");
  revalidatePath("/vehicles");
  revalidatePath("/drivers");
  revalidatePath("/dashboard");
}

/** Create a trip. If `dispatch` is set, it goes straight to dispatched (triggers validate). */
export async function createTrip(_prev: unknown, formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const dispatch = formData.get("dispatch") === "1";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    source: String(formData.get("source")).trim(),
    destination: String(formData.get("destination")).trim(),
    vehicle_id: String(formData.get("vehicle_id")) || null,
    driver_id: String(formData.get("driver_id")) || null,
    cargo_weight_kg: Number(formData.get("cargo_weight_kg")),
    planned_distance_km: Number(formData.get("planned_distance_km")),
    revenue: formData.get("revenue") ? Number(formData.get("revenue")) : null,
    status: dispatch ? "dispatched" : "draft",
    created_by: user?.id ?? null,
  };

  const { error } = await supabase.from("trips").insert(payload);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function dispatchTrip(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("trips").update({ status: "dispatched" }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function completeTrip(
  id: string,
  actual_distance_km: number,
  fuel_consumed_l: number
): Promise<Result> {
  const supabase = await createClient();
  const { data: trip } = await supabase.from("trips").select("vehicle_id").eq("id", id).single();

  const { error } = await supabase
    .from("trips")
    .update({ status: "completed", actual_distance_km, fuel_consumed_l })
    .eq("id", id);
  if (error) return { error: error.message };

  // Log the fuel used against the vehicle so reports have real efficiency data.
  if (trip?.vehicle_id && fuel_consumed_l > 0) {
    await supabase.from("fuel_logs").insert({
      vehicle_id: trip.vehicle_id,
      trip_id: id,
      liters: fuel_consumed_l,
      cost: Math.round(fuel_consumed_l * 1.7),
    });
  }
  refresh();
  return {};
}

export async function cancelTrip(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("trips").update({ status: "cancelled" }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}
