import { Router, type NextFunction, type Request, type Response } from "express";
import type {
  AdminPointLedgerLog,
  AdminVoucherRedemptionLog,
  ApiErrorResponse,
  CreateVoucherInput,
  UpdateVoucherInput,
  Voucher,
} from "@wastegrab/shared";
import {
  VoucherRedemptionStatus as PrismaVoucherRedemptionStatus,
  VoucherStatus as PrismaVoucherStatus,
} from "../../generated/prisma/enums.js";
import { prisma } from "../../prisma.js";
import { getCurrentUserFromRequest } from "../../services/auth.service.js";
import { getBody } from "../../utils/request.js";

const voucherRouter = Router();

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden. Admin access required." } as ApiErrorResponse);
    return;
  }

  next();
}

voucherRouter.get("/", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const vouchers = await prisma.voucher.findMany({
      orderBy: [
        { status: "asc" },
        { createdAt: "desc" },
      ],
    });

    res.json(vouchers.map(toVoucherResponse));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch vouchers.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

voucherRouter.get("/redemptions", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const redemptions = await prisma.voucherRedemption.findMany({
      orderBy: { redeemedAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        voucher: {
          select: {
            title: true,
          },
        },
      },
      take: 100,
    });

    res.json(redemptions.map(toRedemptionLogResponse));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch voucher redemptions.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

voucherRouter.get("/point-ledger", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const ledger = await prisma.pointLedger.findMany({
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        voucher: {
          select: {
            title: true,
          },
        },
      },
      take: 150,
    });

    res.json(ledger.map(toPointLedgerLogResponse));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch point ledger.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

voucherRouter.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const voucher = await prisma.voucher.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!voucher) {
      res.status(404).json({ error: "Voucher not found." } as ApiErrorResponse);
      return;
    }

    res.json(toVoucherResponse(voucher));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch voucher.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

voucherRouter.post("/", requireAdmin, async (req: Request, res: Response) => {
  const input = getBody(req.body) as Partial<CreateVoucherInput>;
  const title = normalizeRequiredString(input.title);
  const pointsCost = normalizeNonNegativeInteger(input.pointsCost);

  if (!title || pointsCost === undefined) {
    res.status(400).json({ error: "Missing required fields: title, pointsCost." } as ApiErrorResponse);
    return;
  }

  try {
    const voucher = await prisma.voucher.create({
      data: {
        title,
        description: normalizeOptionalString(input.description),
        pointsCost,
        code: normalizeOptionalString(input.code),
        stock: normalizeNullableNonNegativeInteger(input.stock),
        status: normalizeVoucherStatus(input.status) ?? PrismaVoucherStatus.ACTIVE,
        startsAt: normalizeOptionalDate(input.startsAt),
        expiresAt: normalizeOptionalDate(input.expiresAt),
      },
    });

    res.status(201).json(toVoucherResponse(voucher));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create voucher.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

voucherRouter.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  const input = getBody(req.body) as Partial<UpdateVoucherInput>;

  try {
    const existing = await prisma.voucher.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!existing) {
      res.status(404).json({ error: "Voucher not found." } as ApiErrorResponse);
      return;
    }

    const data: {
      title?: string;
      description?: string | null;
      pointsCost?: number;
      code?: string | null;
      stock?: number | null;
      status?: PrismaVoucherStatus;
      startsAt?: Date | null;
      expiresAt?: Date | null;
    } = {};

    if (input.title !== undefined) {
      const title = normalizeRequiredString(input.title);
      if (!title) {
        res.status(400).json({ error: "title is required." } as ApiErrorResponse);
        return;
      }
      data.title = title;
    }

    if (input.pointsCost !== undefined) {
      const pointsCost = normalizeNonNegativeInteger(input.pointsCost);
      if (pointsCost === undefined) {
        res.status(400).json({ error: "pointsCost must be a non-negative integer." } as ApiErrorResponse);
        return;
      }
      data.pointsCost = pointsCost;
    }

    if (input.description !== undefined) data.description = normalizeOptionalString(input.description);
    if (input.code !== undefined) data.code = normalizeOptionalString(input.code);
    if (input.stock !== undefined) data.stock = normalizeNullableNonNegativeInteger(input.stock);

    if (input.status !== undefined) {
      const status = normalizeVoucherStatus(input.status);
      if (!status) {
        res.status(400).json({ error: "status is invalid." } as ApiErrorResponse);
        return;
      }
      data.status = status;
    }

    if (input.startsAt !== undefined) data.startsAt = normalizeOptionalDate(input.startsAt);
    if (input.expiresAt !== undefined) data.expiresAt = normalizeOptionalDate(input.expiresAt);

    const updated = await prisma.voucher.update({
      where: { id: existing.id },
      data,
    });

    res.json(toVoucherResponse(updated));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update voucher.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

voucherRouter.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.voucher.findUnique({
      where: { id: String(req.params.id) },
      select: {
        id: true,
        _count: {
          select: {
            redemptions: true,
            pointLedger: true,
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: "Voucher not found." } as ApiErrorResponse);
      return;
    }

    if (existing._count.redemptions > 0 || existing._count.pointLedger > 0) {
      res.status(400).json({
        error: "Voucher has redemption history. Set it inactive instead of deleting it.",
      } as ApiErrorResponse);
      return;
    }

    await prisma.voucher.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to delete voucher.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

function normalizeRequiredString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeNonNegativeInteger(value: unknown): number | undefined {
  const normalized = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    return undefined;
  }

  return normalized;
}

function normalizeNullableNonNegativeInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return normalizeNonNegativeInteger(value) ?? null;
}

function normalizeVoucherStatus(value: unknown): PrismaVoucherStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return Object.values(PrismaVoucherStatus).includes(value as PrismaVoucherStatus)
    ? value as PrismaVoucherStatus
    : undefined;
}

function normalizeOptionalDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toVoucherResponse(voucher: {
  id: string;
  title: string;
  description: string | null;
  pointsCost: number;
  code: string | null;
  stock: number | null;
  status: PrismaVoucherStatus;
  startsAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}): Voucher {
  return {
    id: voucher.id,
    title: voucher.title,
    description: voucher.description,
    pointsCost: voucher.pointsCost,
    code: voucher.code,
    stock: voucher.stock,
    status: voucher.status as Voucher["status"],
    startsAt: voucher.startsAt?.toISOString() ?? null,
    expiresAt: voucher.expiresAt?.toISOString() ?? null,
    createdAt: voucher.createdAt.toISOString(),
  };
}

function toRedemptionLogResponse(redemption: {
  id: string;
  userId: string;
  voucherId: string;
  pointsSpent: number;
  status: PrismaVoucherRedemptionStatus;
  redeemedCode: string | null;
  redeemedAt: Date;
  cancelledAt: Date | null;
  user: {
    name: string;
    email: string;
  };
  voucher: {
    title: string;
  };
}): AdminVoucherRedemptionLog {
  return {
    id: redemption.id,
    userId: redemption.userId,
    voucherId: redemption.voucherId,
    pointsSpent: redemption.pointsSpent,
    status: redemption.status as AdminVoucherRedemptionLog["status"],
    redeemedCode: redemption.redeemedCode,
    redeemedAt: redemption.redeemedAt.toISOString(),
    cancelledAt: redemption.cancelledAt?.toISOString() ?? null,
    userName: redemption.user.name,
    userEmail: redemption.user.email,
    voucherTitle: redemption.voucher.title,
  };
}

function toPointLedgerLogResponse(row: {
  id: string;
  userId: string;
  pickupRequestId: string | null;
  voucherId: string | null;
  redemptionId: string | null;
  type: string;
  status: string;
  points: number;
  balanceAfter: number;
  description: string | null;
  metadata: unknown;
  createdAt: Date;
  user: {
    name: string;
    email: string;
  };
  voucher: {
    title: string;
  } | null;
}): AdminPointLedgerLog {
  return {
    id: row.id,
    userId: row.userId,
    pickupRequestId: row.pickupRequestId,
    voucherId: row.voucherId,
    redemptionId: row.redemptionId,
    type: row.type as AdminPointLedgerLog["type"],
    status: row.status as AdminPointLedgerLog["status"],
    points: row.points,
    balanceAfter: row.balanceAfter,
    description: row.description,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    userName: row.user.name,
    userEmail: row.user.email,
    voucherTitle: row.voucher?.title ?? null,
  };
}

export default voucherRouter;
