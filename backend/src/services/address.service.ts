import type { Address, CreateAddressInput, UpdateAddressInput } from "@wastegrab/shared";
import { prisma } from "../prisma.js";

export async function listAddress(userId: string): Promise<Address[]> {
  const rows = await prisma.address.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(toAddressResponse);
}

export async function getAddressById(id: string): Promise<Address | null> {
  const row = await prisma.address.findUnique({ where: { id } });

  if (!row) return null;
  return toAddressResponse(row);
}

export async function createAddress(userId: string, input: CreateAddressInput): Promise<Address> {
  // If this is the user's first address, make it default
  const count = await prisma.address.count({ where: { userId } });
  const isDefault = count === 0;

  const created = await prisma.address.create({
    data: {
      userId,
      label: input.label,
      street: input.street,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      notes: input.notes ?? null,
      isDefault,
    },
  });

  return toAddressResponse(created);
}

export async function updateAddress(id: string, updates: UpdateAddressInput): Promise<Address> {
  // If setting isDefault to true, clear other defaults for the user
  if (updates.isDefault) {
    const existing = await prisma.address.findUnique({ where: { id } });
    if (existing) {
      await prisma.address.updateMany({ where: { userId: existing.userId, isDefault: true }, data: { isDefault: false } });
    }
  }

  const updated = await prisma.address.update({ where: { id }, data: { ...updates } as any });

  return toAddressResponse(updated);
}

export async function deleteAddress(id: string): Promise<void> {
  await prisma.address.delete({ where: { id } });
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<Address> {
  // Ensure the address belongs to the user
  const addr = await prisma.address.findUnique({ where: { id: addressId } });
  if (!addr || addr.userId !== userId) {
    throw new Error("Address not found or unauthorized");
  }

  await prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });

  const updated = await prisma.address.update({ where: { id: addressId }, data: { isDefault: true } });

  return toAddressResponse(updated);
}

function toAddressResponse(row: any): Address {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    street: row.street,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    notes: row.notes ?? null,
    isDefault: !!row.isDefault,
    createdAt: row.createdAt.toISOString(),
  };
}
