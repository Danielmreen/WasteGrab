import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

let supabase: SupabaseClient | null = null;

export function getPickupImagesBucket(): string {
  return config.supabasePickupImagesBucket;
}

export function getUserAvatarsBucket(): string {
  return config.supabaseUserAvatarsBucket;
}

export function getAuthSlidesBucket(): string {
  return config.supabaseAuthSlidesBucket;
}

export function getWasteCategoriesBucket(): string {
  return config.supabaseWasteCategoriesBucket;
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
  return uploadPublicImageToBucket(getPickupImagesBucket(), path, body, false);
}

export async function uploadPublicAvatar(
  path: string,
  body: Buffer,
): Promise<string> {
  return uploadPublicImageToBucket(getUserAvatarsBucket(), path, body, true);
}

export async function uploadPublicAuthSlide(
  path: string,
  body: Buffer,
): Promise<string> {
  return uploadPublicImageToBucket(getAuthSlidesBucket(), path, body, true);
}

export async function uploadPublicWasteCategory(
  path: string,
  body: Buffer,
): Promise<string> {
  return uploadPublicImageToBucket(getWasteCategoriesBucket(), path, body, true);
}

async function uploadPublicImageToBucket(
  bucket: string,
  path: string,
  body: Buffer,
  upsert: boolean,
): Promise<string> {
  await ensurePublicBucket(bucket);

  const { data, error } = await getSupabaseClient().storage
    .from(bucket)
    .upload(path, body, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert,
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

async function ensurePublicBucket(bucket: string): Promise<void> {
  const { data } = await getSupabaseClient().storage.getBucket(bucket);

  if (data) {
    return;
  }

  const { error } = await getSupabaseClient().storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: ["image/jpeg"],
    fileSizeLimit: 3 * 1024 * 1024,
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new Error(error.message);
  }
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
