import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { seedLocalData } from "./seed-local-data.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

for (const envPath of [
  resolve(workspaceRoot, ".env.local"),
  resolve(workspaceRoot, ".env"),
]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false, quiet: true });
  }
}

const prismaArgs = ["db", "push", ...process.argv.slice(2)];
const result = spawnSync("prisma", prismaArgs, {
  cwd: process.cwd(),
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

void main();

async function main() {
  try {
    if (isLocalDatabase(process.env.DATABASE_URL)) {
      await seedLocalData();
    } else {
      console.log("Skipping local seed because DATABASE_URL is not local.");
    }
  } finally {
    const { prisma } = await import("../src/prisma.js");
    await prisma.$disconnect();
  }
}

function isLocalDatabase(databaseUrl: string | undefined): boolean {
  if (!databaseUrl || process.env.NODE_ENV === "production") {
    return false;
  }

  try {
    const url = new URL(databaseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}
