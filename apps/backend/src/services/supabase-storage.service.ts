import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

let supabase: SupabaseClient | null = null;

export function getPickupImagesBucket(): string {
  return config.supabasePickupImagesBucket;
}

export function getSupabaseClient(): SupabaseClient {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error("Supabase storage is not configured.");
  }

  supabase ??= createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabase;
}

export async function uploadPublicImage(
  path: string,
  body: Buffer,
): Promise<string> {
  const bucket = getPickupImagesBucket();
  const { data, error } = await getSupabaseClient().storage
    .from(bucket)
    .upload(path, body, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const publicUrl = getSupabaseClient().storage
    .from(bucket)
    .getPublicUrl(data.path).data.publicUrl;

  if (!publicUrl) {
    throw new Error("Unable to create public image URL.");
  }

  return publicUrl;
}

export async function removeImages(paths: string[]): Promise<void> {
  if (!paths.length) {
    return;
  }

  await getSupabaseClient().storage
    .from(getPickupImagesBucket())
    .remove(paths)
    .catch(() => undefined);
}
