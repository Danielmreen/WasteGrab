import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

for (const envPath of [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), ".env"),
]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false, quiet: true });
  }
}

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;
const authSecret = process.env.AUTH_SECRET || "wastegrab-dev-auth-secret";
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim() || "";
const isProduction = process.env.NODE_ENV === "production";
const authCookieSecure =
  process.env.AUTH_COOKIE_SECURE === undefined
    ? isProduction
    : process.env.AUTH_COOKIE_SECURE === "true";
const authCookieSameSite = parseCookieSameSite(process.env.AUTH_COOKIE_SAME_SITE);
const supabaseUrl = process.env.SUPABASE_URL?.trim() || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
const supabasePickupImagesBucket =
  process.env.SUPABASE_PICKUP_IMAGES_BUCKET?.trim() || "pickup-images";
const supabaseUserAvatarsBucket =
  process.env.SUPABASE_USER_AVATARS_BUCKET?.trim() || "user-avatars";

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive number.");
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

export const config = {
  port,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:4200",
  databaseUrl,
  authSecret,
  googleMapsApiKey,
  isProduction,
  authCookieSecure,
  authCookieSameSite,
  supabaseUrl,
  supabaseServiceRoleKey,
  supabasePickupImagesBucket,
  supabaseUserAvatarsBucket,
};

function parseCookieSameSite(value: string | undefined): "Lax" | "Strict" | "None" {
  if (!value) {
    return "Lax";
  }

  if (value === "Lax" || value === "Strict" || value === "None") {
    return value;
  }

  throw new Error("AUTH_COOKIE_SAME_SITE must be Lax, Strict, or None.");
}
