"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

// Fuel & expenses feed reports and dashboard rollups, so refresh those too.
function refresh() {
  revalidatePath("/expenses");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

function optionalId(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  return v ? String(v) : null;
}

// Blank date means "now" — let the DB default fill it.
function optionalDate(formData: FormData): string | undefined {
  const v = formData.get("logged_at");
  return v ? new Date(String(v)).toISOString() : undefined;
}

// ---------- Fuel logs ----------

export async function saveFuelLog(_prev: unknown, formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const id = formData.get("id") as string | null;

  const vehicle_id = optionalId(formData, "vehicle_id");
  if (!vehicle_id) return { error: "Select the vehicle that was fuelled." };

  const liters = Number(formData.get("liters"));
  const cost = Number(formData.get("cost"));
  if (!(liters > 0)) return { error: "Liters must be greater than zero." };
  if (!(cost >= 0)) return { error: "Cost must be zero or more." };

  const logged_at = optionalDate(formData);
  const payload = {
    vehicle_id,
    trip_id: optionalId(formData, "trip_id"),
    liters,
    cost,
    ...(logged_at ? { logged_at } : {}),
  };

  const query = id
    ? supabase.from("fuel_logs").update(payload).eq("id", id)
    : supabase.from("fuel_logs").insert(payload);

  const { error } = await query;
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteFuelLog(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}

// ---------- Expenses ----------

export async function saveExpense(_prev: unknown, formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const id = formData.get("id") as string | null;

  const amount = Number(formData.get("amount"));
  if (!(amount >= 0)) return { error: "Amount must be zero or more." };

  const note = String(formData.get("note") ?? "").trim();
  const logged_at = optionalDate(formData);
  const payload = {
    vehicle_id: optionalId(formData, "vehicle_id"),
    trip_id: optionalId(formData, "trip_id"),
    category: String(formData.get("category") || "Other"),
    amount,
    note: note || null,
    ...(logged_at ? { logged_at } : {}),
  };

  const query = id
    ? supabase.from("expenses").update(payload).eq("id", id)
    : supabase.from("expenses").insert(payload);

  const { error } = await query;
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function deleteExpense(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}
