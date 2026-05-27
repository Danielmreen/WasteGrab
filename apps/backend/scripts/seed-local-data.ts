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
const seedIds = {
  completedPickup: "11111111-1111-4111-8111-111111111111",
  cafeVoucher: "22222222-2222-4222-8222-222222222222",
  groceryVoucher: "33333333-3333-4333-8333-333333333333",
  inactiveVoucher: "44444444-4444-4444-8444-444444444444",
  groceryRedemption: "55555555-5555-4555-8555-555555555555",
  pickupEarnedLedger: "66666666-6666-4666-8666-666666666666",
  voucherRedeemedLedger: "77777777-7777-4777-8777-777777777777",
  adminAdjustmentLedger: "88888888-8888-4888-8888-888888888888",
};

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
  await seedLocalVouchersAndRewards();
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

export async function seedLocalVouchersAndRewards() {
  const { prisma } = await import("../src/prisma.js");
  const {
    PickupStatus,
    PointLedgerStatus,
    PointLedgerType,
    VoucherRedemptionStatus,
    VoucherStatus,
  } = await import("../src/generated/prisma/enums.js");

  const [customer, collector, paper, glass, plastic] = await Promise.all([
    prisma.user.findUnique({ where: { email: "customer@test.com" } }),
    prisma.user.findUnique({ where: { email: "collector@test.com" } }),
    prisma.wasteCategory.findFirst({ where: { name: "Paper" } }),
    prisma.wasteCategory.findFirst({ where: { name: "Glass" } }),
    prisma.wasteCategory.findFirst({ where: { name: "Plastic" } }),
  ]);

  if (!customer || !collector || !paper || !glass || !plastic) {
    throw new Error("Users and waste categories must be seeded before vouchers and rewards.");
  }

  await prisma.voucher.upsert({
    where: { id: seedIds.cafeVoucher },
    update: {
      title: "Cafe Drink Voucher",
      description: "Redeem for one selected drink at participating cafes.",
      pointsCost: 40,
      code: "CAFE40",
      stock: 25,
      status: VoucherStatus.ACTIVE,
      startsAt: null,
      expiresAt: new Date("2026-12-31T15:59:59.000Z"),
    },
    create: {
      id: seedIds.cafeVoucher,
      title: "Cafe Drink Voucher",
      description: "Redeem for one selected drink at participating cafes.",
      pointsCost: 40,
      code: "CAFE40",
      stock: 25,
      status: VoucherStatus.ACTIVE,
      expiresAt: new Date("2026-12-31T15:59:59.000Z"),
    },
  });

  await prisma.voucher.upsert({
    where: { id: seedIds.groceryVoucher },
    update: {
      title: "Grocery Discount",
      description: "Small grocery rebate for consistent recycling activity.",
      pointsCost: 200,
      code: "GROCERY200",
      stock: 9,
      status: VoucherStatus.ACTIVE,
      startsAt: null,
      expiresAt: new Date("2026-10-31T15:59:59.000Z"),
    },
    create: {
      id: seedIds.groceryVoucher,
      title: "Grocery Discount",
      description: "Small grocery rebate for consistent recycling activity.",
      pointsCost: 200,
      code: "GROCERY200",
      stock: 9,
      status: VoucherStatus.ACTIVE,
      expiresAt: new Date("2026-10-31T15:59:59.000Z"),
    },
  });

  await prisma.voucher.upsert({
    where: { id: seedIds.inactiveVoucher },
    update: {
      title: "Transit Credit",
      description: "Inactive sample reward kept for admin status testing.",
      pointsCost: 300,
      code: null,
      stock: null,
      status: VoucherStatus.INACTIVE,
      startsAt: null,
      expiresAt: null,
    },
    create: {
      id: seedIds.inactiveVoucher,
      title: "Transit Credit",
      description: "Inactive sample reward kept for admin status testing.",
      pointsCost: 300,
      status: VoucherStatus.INACTIVE,
    },
  });

  await prisma.pickupRequest.upsert({
    where: { id: seedIds.completedPickup },
    update: {
      userId: customer.id,
      collectorId: collector.id,
      addressText: "123 Main Street, Kuala Lumpur, Kuala Lumpur 50000",
      status: PickupStatus.COMPLETED,
      aiClassificationLabel: "Paper, Glass, Plastic",
      notes: "Seed completed pickup for reward ledger demo.",
      estimatedPrice: "18.50",
      finalPrice: "21.10",
      completedAt: new Date("2026-05-20T04:30:00.000Z"),
      items: {
        deleteMany: {},
        create: [
          {
            categoryId: paper.id,
            estimatedWeight: "4.00",
            actualWeight: "4.50",
          },
          {
            categoryId: glass.id,
            estimatedWeight: "2.00",
            actualWeight: "2.20",
          },
          {
            categoryId: plastic.id,
            estimatedWeight: "1.00",
            actualWeight: "1.30",
          },
        ],
      },
    },
    create: {
      id: seedIds.completedPickup,
      userId: customer.id,
      collectorId: collector.id,
      addressText: "123 Main Street, Kuala Lumpur, Kuala Lumpur 50000",
      status: PickupStatus.COMPLETED,
      aiClassificationLabel: "Paper, Glass, Plastic",
      notes: "Seed completed pickup for reward ledger demo.",
      estimatedPrice: "18.50",
      finalPrice: "21.10",
      completedAt: new Date("2026-05-20T04:30:00.000Z"),
      items: {
        create: [
          {
            categoryId: paper.id,
            estimatedWeight: "4.00",
            actualWeight: "4.50",
          },
          {
            categoryId: glass.id,
            estimatedWeight: "2.00",
            actualWeight: "2.20",
          },
          {
            categoryId: plastic.id,
            estimatedWeight: "1.00",
            actualWeight: "1.30",
          },
        ],
      },
    },
  });

  await prisma.voucherRedemption.upsert({
    where: { id: seedIds.groceryRedemption },
    update: {
      userId: customer.id,
      voucherId: seedIds.groceryVoucher,
      pointsSpent: 200,
      status: VoucherRedemptionStatus.REDEEMED,
      redeemedCode: "GROCERY200",
      redeemedAt: new Date("2026-05-22T08:15:00.000Z"),
      cancelledAt: null,
    },
    create: {
      id: seedIds.groceryRedemption,
      userId: customer.id,
      voucherId: seedIds.groceryVoucher,
      pointsSpent: 200,
      status: VoucherRedemptionStatus.REDEEMED,
      redeemedCode: "GROCERY200",
      redeemedAt: new Date("2026-05-22T08:15:00.000Z"),
    },
  });

  await prisma.pointLedger.upsert({
    where: { id: seedIds.pickupEarnedLedger },
    update: {
      userId: customer.id,
      pickupRequestId: seedIds.completedPickup,
      voucherId: null,
      redemptionId: null,
      type: PointLedgerType.PICKUP_EARNED,
      status: PointLedgerStatus.POSTED,
      points: 231,
      balanceAfter: 231,
      description: "Points earned from completed seed pickup.",
      metadata: {
        actualWeightKg: 8,
      },
      createdAt: new Date("2026-05-20T04:30:30.000Z"),
    },
    create: {
      id: seedIds.pickupEarnedLedger,
      userId: customer.id,
      pickupRequestId: seedIds.completedPickup,
      type: PointLedgerType.PICKUP_EARNED,
      status: PointLedgerStatus.POSTED,
      points: 231,
      balanceAfter: 231,
      description: "Points earned from completed seed pickup.",
      metadata: {
        actualWeightKg: 8,
      },
      createdAt: new Date("2026-05-20T04:30:30.000Z"),
    },
  });

  await prisma.pointLedger.upsert({
    where: { id: seedIds.voucherRedeemedLedger },
    update: {
      userId: customer.id,
      pickupRequestId: null,
      voucherId: seedIds.groceryVoucher,
      redemptionId: seedIds.groceryRedemption,
      type: PointLedgerType.VOUCHER_REDEEMED,
      status: PointLedgerStatus.POSTED,
      points: -200,
      balanceAfter: 31,
      description: "Redeemed Grocery Discount.",
      metadata: {
        voucherTitle: "Grocery Discount",
      },
      createdAt: new Date("2026-05-22T08:15:00.000Z"),
    },
    create: {
      id: seedIds.voucherRedeemedLedger,
      userId: customer.id,
      voucherId: seedIds.groceryVoucher,
      redemptionId: seedIds.groceryRedemption,
      type: PointLedgerType.VOUCHER_REDEEMED,
      status: PointLedgerStatus.POSTED,
      points: -200,
      balanceAfter: 31,
      description: "Redeemed Grocery Discount.",
      metadata: {
        voucherTitle: "Grocery Discount",
      },
      createdAt: new Date("2026-05-22T08:15:00.000Z"),
    },
  });

  await prisma.pointLedger.upsert({
    where: { id: seedIds.adminAdjustmentLedger },
    update: {
      userId: customer.id,
      pickupRequestId: null,
      voucherId: null,
      redemptionId: null,
      type: PointLedgerType.ADMIN_ADJUSTMENT,
      status: PointLedgerStatus.POSTED,
      points: 25,
      balanceAfter: 56,
      description: "Seed admin bonus adjustment.",
      metadata: {
        reason: "Demo account setup",
      },
      createdAt: new Date("2026-05-23T02:00:00.000Z"),
    },
    create: {
      id: seedIds.adminAdjustmentLedger,
      userId: customer.id,
      type: PointLedgerType.ADMIN_ADJUSTMENT,
      status: PointLedgerStatus.POSTED,
      points: 25,
      balanceAfter: 56,
      description: "Seed admin bonus adjustment.",
      metadata: {
        reason: "Demo account setup",
      },
      createdAt: new Date("2026-05-23T02:00:00.000Z"),
    },
  });

  console.log("Seeded local vouchers, redemption logs, and point ledger.");
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
