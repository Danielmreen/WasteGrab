import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultDatabaseUrl = "mysql://root:Victor_Root@localhost:3306/wastegrab_d";

for (const envPath of [
  resolve(workspaceRoot, ".env.local"),
  resolve(workspaceRoot, ".env"),
]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false, quiet: true });
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  },
});
