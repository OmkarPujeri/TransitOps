"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

function refresh() {
  revalidatePath("/maintenance");
  revalidatePath("/vehicles");
  revalidatePath("/dashboard");
}

export async function openMaintenance(_prev: unknown, formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const payload = {
    vehicle_id: String(formData.get("vehicle_id")),
    type: String(formData.get("type")),
    description: String(formData.get("description")) || null,
    cost: Number(formData.get("cost")) || 0,
    status: "open",
  };
  if (!payload.vehicle_id) return { error: "Select a vehicle." };
  const { error } = await supabase.from("maintenance_logs").insert(payload);
  if (error) return { error: error.message };
  refresh();
  return {};
}

export async function closeMaintenance(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_logs").update({ status: "closed" }).eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return {};
}
