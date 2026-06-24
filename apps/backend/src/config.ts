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
const isProduction = process.env.NODE_ENV === "production";
const authSecret = process.env.AUTH_SECRET?.trim() || (
  isProduction ? "" : "wastegrab-dev-auth-secret"
);
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim() || "";
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
const supabaseAuthSlidesBucket =
  process.env.SUPABASE_AUTH_SLIDES_BUCKET?.trim() || "auth-slides";
const supabaseWasteCategoriesBucket =
  process.env.SUPABASE_WASTE_CATEGORIES_BUCKET?.trim() || "waste-categories";
const webPushPublicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim() || "";
const webPushPrivateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim() || "";
const webPushSubject = process.env.WEB_PUSH_SUBJECT?.trim() || "mailto:admin@wastegrab.local";

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive number.");
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

if (!authSecret) {
  throw new Error("AUTH_SECRET is required in production.");
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
  supabaseAuthSlidesBucket,
  supabaseWasteCategoriesBucket,
  webPushPublicKey,
  webPushPrivateKey,
  webPushSubject,
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
