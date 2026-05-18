import "dotenv/config";

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;
const authSecret = process.env.AUTH_SECRET || "wastegrab-dev-auth-secret";

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
  isProduction: process.env.NODE_ENV === "production",
};
