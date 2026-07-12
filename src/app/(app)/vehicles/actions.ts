"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

export async function saveVehicle(_prev: unknown, formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const id = formData.get("id") as string | null;

  const payload = {
    reg_number: String(formData.get("reg_number")).trim().toUpperCase(),
    name_model: String(formData.get("name_model")).trim(),
    type: String(formData.get("type")),
    max_load_kg: Number(formData.get("max_load_kg")),
    odometer: Number(formData.get("odometer")),
    acquisition_cost: Number(formData.get("acquisition_cost")),
    region: String(formData.get("region")) || null,
    status: String(formData.get("status")),
  };

  const query = id
    ? supabase.from("vehicles").update(payload).eq("id", id)
    : supabase.from("vehicles").insert(payload);

  const { error } = await query;
  if (error) {
    if (error.code === "23505") return { error: "Registration number must be unique." };
    return { error: error.message };
  }
  revalidatePath("/vehicles");
  return {};
}

export async function deleteVehicle(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/vehicles");
  return {};
}
