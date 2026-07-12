"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

export async function saveDriver(_prev: unknown, formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const id = formData.get("id") as string | null;

  const payload = {
    full_name: String(formData.get("full_name")).trim(),
    license_number: String(formData.get("license_number")).trim().toUpperCase(),
    license_category: String(formData.get("license_category")),
    license_expiry: String(formData.get("license_expiry")),
    contact: String(formData.get("contact")) || null,
    safety_score: Number(formData.get("safety_score")),
    status: String(formData.get("status")),
  };

  const query = id
    ? supabase.from("drivers").update(payload).eq("id", id)
    : supabase.from("drivers").insert(payload);

  const { error } = await query;
  if (error) {
    if (error.code === "23505") return { error: "License number must be unique." };
    return { error: error.message };
  }
  revalidatePath("/drivers");
  return {};
}

export async function deleteDriver(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("drivers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/drivers");
  return {};
}
