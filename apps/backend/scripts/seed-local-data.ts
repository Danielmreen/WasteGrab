import { randomBytes, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

for (const envPath of [
  resolve(workspaceRoot, ".env.local"),
  resolve(workspaceRoot, ".env"),
]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false, quiet: true });
  }
}

const seedUsers = [
  {
    name: "Customer",
    email: "customer@test.com",
    role: "CUSTOMER" as const,
  },
  {
    name: "Admin",
    email: "admin@test.com",
    role: "ADMIN" as const,
  },
  {
    name: "Collector",
    email: "collector@test.com",
    role: "COLLECTOR" as const,
  },
];

const seedPassword = "ADae21!!";

const seedWasteCategories = [
  {
    name: "Plastic",
    pricePerKg: "5.00",
    pointsPerKg: 2,
    averageWeightKg: "0.030",
    isBanned: false,
    isHazardous: false,
    isAiDetectable: true,
    description: "Plastic bottles, containers, and clean recyclable plastic items",
  },
  {
    name: "Metal",
    pricePerKg: "15.00",
    pointsPerKg: 3,
    averageWeightKg: "0.100",
    isBanned: false,
    isHazardous: false,
    isAiDetectable: true,
    description: "Aluminum cans, steel tins, and other recyclable metal waste",
  },
  {
    name: "Paper",
    pricePerKg: "2.00",
    pointsPerKg: 1,
    averageWeightKg: "0.020",
    isBanned: false,
    isHazardous: false,
    isAiDetectable: true,
    description: "Paper, newspapers, magazines, and cardboard",
  },
  {
    name: "Glass",
    pricePerKg: "3.00",
    pointsPerKg: 1,
    averageWeightKg: "0.150",
    isBanned: false,
    isHazardous: false,
    isAiDetectable: true,
    description: "Glass bottles and jars",
  },
  {
    name: "Organic",
    pricePerKg: "1.00",
    pointsPerKg: 1,
    averageWeightKg: "0.050",
    isBanned: false,
    isHazardous: false,
    isAiDetectable: false,
    description: "Food waste and biodegradable material",
  },
  {
    name: "E-Waste",
    pricePerKg: "8.00",
    pointsPerKg: 2,
    averageWeightKg: "0.300",
    isBanned: false,
    isHazardous: true,
    isAiDetectable: false,
    description: "Electronic waste that requires special hazardous handling",
  },
  {
    name: "Medical Waste",
    pricePerKg: "0.00",
    pointsPerKg: 0,
    averageWeightKg: "0.050",
    isBanned: true,
    isHazardous: true,
    isAiDetectable: false,
    description: "Banned medical or biohazard waste",
  },
];

export async function seedLocalData() {
  await seedLocalUsers();
  await seedLocalCustomerAddress();
  await seedLocalWasteCategories();
}

export async function seedLocalUsers() {
  const { prisma } = await import("../src/prisma.js");
  const passwordHash = hashPassword(seedPassword);

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
      },
    });
  }

  console.log("Seeded local users: customer@test.com, admin@test.com, collector@test.com");
}

export async function seedLocalCustomerAddress() {
  const { prisma } = await import("../src/prisma.js");
  const { createAddress } = await import("../src/services/address.service.js");

  const customer = await prisma.user.findUnique({
    where: {
      email: "customer@test.com",
    },
  });

  if (!customer) {
    throw new Error("Customer user must be seeded before customer address.");
  }

  const existingHomeAddress = await prisma.address.findFirst({
    where: {
      userId: customer.id,
      label: "Home",
    },
  });

  if (!existingHomeAddress) {
    await createAddress(customer.id, {
      label: "Home",
      street: "123 Main Street",
      city: "Kuala Lumpur",
      state: "Kuala Lumpur",
      postalCode: "50000",
      formattedAddress: "123 Main Street, Kuala Lumpur, Kuala Lumpur 50000",
      notes: "Default customer seed address",
    });
  }

  const existingOfficeAddress = await prisma.address.findFirst({
    where: {
      userId: customer.id,
      label: "Office",
    },
  });

  if (!existingOfficeAddress) {
    await createAddress(customer.id, {
      label: "Office",
      street: "88 Jalan Bukit Bintang",
      city: "Kuala Lumpur",
      state: "Kuala Lumpur",
      postalCode: "55100",
      formattedAddress: "88 Jalan Bukit Bintang, Kuala Lumpur, Kuala Lumpur 55100",
      notes: "Secondary customer seed address",
    });
  }

  console.log("Seeded customer address for customer@test.com.");
}

export async function seedLocalWasteCategories() {
  const { prisma } = await import("../src/prisma.js");

  for (const category of seedWasteCategories) {
    const existing = await prisma.wasteCategory.findFirst({
      where: {
        name: category.name,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (existing) {
      await prisma.wasteCategory.update({
        where: {
          id: existing.id,
        },
        data: category,
      });
      continue;
    }

    await prisma.wasteCategory.create({
      data: category,
    });
  }

  console.log("Seeded local waste categories.");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}

async function main() {
  const { prisma } = await import("../src/prisma.js");

  try {
    await seedLocalData();
  } catch (err: unknown) {
    console.error("Unable to seed local data.");
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}