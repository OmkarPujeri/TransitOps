"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "vehicle-docs";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

type Result = { error?: string };

// Sanitise a filename into a storage-safe key.
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export async function uploadVehicleDocument(_prev: unknown, formData: FormData): Promise<Result> {
  const supabase = await createClient();

  const vehicle_id = String(formData.get("vehicle_id") ?? "");
  if (!vehicle_id) return { error: "Missing vehicle." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_BYTES) return { error: "File must be under 10 MB." };

  const path = `${vehicle_id}/${Date.now()}-${safeName(file.name)}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) {
    if (/bucket/i.test(upErr.message)) {
      return { error: "Storage bucket 'vehicle-docs' not found — run supabase/documents.sql first." };
    }
    return { error: upErr.message };
  }

  const { error } = await supabase.from("vehicle_documents").insert({
    vehicle_id,
    name: file.name,
    path,
    size: file.size,
    mime: file.type || null,
  });
  if (error) {
    // Roll back the orphaned upload so storage and metadata stay in sync.
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: error.message };
  }

  revalidatePath("/vehicles");
  return {};
}

export async function deleteVehicleDocument(id: string, path: string): Promise<Result> {
  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([path]);
  const { error } = await supabase.from("vehicle_documents").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/vehicles");
  return {};
}

// Short-lived signed URL to view/download a private file.
export async function getDocumentUrl(path: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
