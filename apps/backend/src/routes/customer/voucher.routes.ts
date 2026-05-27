import { Router, type RequestHandler } from "express";
import type {
  ApiErrorResponse,
  CustomerVoucherListResponse,
  CustomerVoucherRedemption,
  CustomerVoucherRedemptionsResponse,
  RedeemVoucherResponse,
  Voucher,
} from "@wastegrab/shared";
import {
  PointLedgerStatus as PrismaPointLedgerStatus,
  PointLedgerType as PrismaPointLedgerType,
  VoucherRedemptionStatus as PrismaVoucherRedemptionStatus,
  VoucherStatus as PrismaVoucherStatus,
} from "../../generated/prisma/enums.js";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../prisma.js";
import { getCurrentUserFromRequest } from "../../services/auth.service.js";

const voucherRouter = Router();

voucherRouter.get(
  "/",
  (async (req, res) => {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
      return;
    }

    const now = new Date();
    const [pointsBalance, vouchers, redemptionCounts] = await Promise.all([
      getPointsBalance(user.id),
      prisma.voucher.findMany({
        where: {
          status: PrismaVoucherStatus.ACTIVE,
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } },
          ],
          AND: [
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } },
              ],
            },
          ],
        },
        orderBy: [
          { pointsCost: "asc" },
          { createdAt: "desc" },
        ],
      }),
      prisma.voucherRedemption.groupBy({
        by: ["voucherId"],
        where: {
          userId: user.id,
        },
        _count: {
          voucherId: true,
        },
      }),
    ]);

    const redemptionCountsByVoucher = new Map(
      redemptionCounts.map((row) => [row.voucherId, row._count.voucherId]),
    );

    const payload: CustomerVoucherListResponse = {
      pointsBalance,
      vouchers: vouchers.map((voucher) => {
        const unavailableReason = getUnavailableReason(voucher, pointsBalance, now);
        return {
          ...toVoucherResponse(voucher),
          canRedeem: unavailableReason === null,
          unavailableReason,
          redemptionCount: redemptionCountsByVoucher.get(voucher.id) ?? 0,
        };
      }),
    };

    res.json(payload);
  }) as RequestHandler,
);

voucherRouter.get(
  "/redemptions",
  (async (req, res) => {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
      return;
    }

    const redemptions = await prisma.voucherRedemption.findMany({
      where: {
        userId: user.id,
      },
      include: {
        voucher: true,
      },
      orderBy: {
        redeemedAt: "desc",
      },
    });

    const payload: CustomerVoucherRedemptionsResponse = {
      redemptions: redemptions.map(toCustomerRedemptionResponse),
    };

    res.json(payload);
  }) as RequestHandler,
);

voucherRouter.post(
  "/:voucherId/redeem",
  (async (req, res) => {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
      return;
    }

    try {
      const voucherId = String(req.params.voucherId);
      const result = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const voucher = await tx.voucher.findUnique({
          where: {
            id: voucherId,
          },
        });

        if (!voucher) {
          throw new RedeemVoucherError(404, "Voucher not found.");
        }

        const pointsBalance = await getPointsBalance(user.id, tx);
        const unavailableReason = getUnavailableReason(voucher, pointsBalance, now);

        if (unavailableReason) {
          throw new RedeemVoucherError(400, unavailableReason);
        }

        if (voucher.stock !== null) {
          const updatedStock = await tx.voucher.updateMany({
            where: {
              id: voucher.id,
              stock: {
                gt: 0,
              },
            },
            data: {
              stock: {
                decrement: 1,
              },
            },
          });

          if (updatedStock.count !== 1) {
            throw new RedeemVoucherError(400, "Voucher is out of stock.");
          }
        }

        const nextBalance = pointsBalance - voucher.pointsCost;
        const redemption = await tx.voucherRedemption.create({
          data: {
            userId: user.id,
            voucherId: voucher.id,
            pointsSpent: voucher.pointsCost,
            status: PrismaVoucherRedemptionStatus.REDEEMED,
            redeemedCode: voucher.code,
          },
          include: {
            voucher: true,
          },
        });

        await tx.pointLedger.create({
          data: {
            userId: user.id,
            voucherId: voucher.id,
            redemptionId: redemption.id,
            type: PrismaPointLedgerType.VOUCHER_REDEEMED,
            status: PrismaPointLedgerStatus.POSTED,
            points: -voucher.pointsCost,
            balanceAfter: nextBalance,
            description: `Redeemed ${voucher.title}.`,
            metadata: {
              voucherTitle: voucher.title,
            },
          },
        });

        return {
          pointsBalance: nextBalance,
          redemption: toCustomerRedemptionResponse(redemption),
        };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

      const payload: RedeemVoucherResponse = result;
      res.status(201).json(payload);
    } catch (err) {
      if (err instanceof RedeemVoucherError) {
        res.status(err.status).json({ error: err.message } as ApiErrorResponse);
        return;
      }

      const message = err instanceof Error ? err.message : "Unable to redeem voucher.";
      res.status(400).json({ error: message } as ApiErrorResponse);
    }
  }) as RequestHandler,
);

async function getPointsBalance(
  userId: string,
  client: Pick<typeof prisma, "pointLedger"> = prisma,
): Promise<number> {
  const latestLedger = await client.pointLedger.findFirst({
    where: {
      userId,
      status: PrismaPointLedgerStatus.POSTED,
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    select: {
      balanceAfter: true,
    },
  });

  return latestLedger?.balanceAfter ?? 0;
}

function getUnavailableReason(voucher: {
  pointsCost: number;
  stock: number | null;
  status: PrismaVoucherStatus;
  startsAt: Date | null;
  expiresAt: Date | null;
}, pointsBalance: number, now: Date): string | null {
  if (voucher.status !== PrismaVoucherStatus.ACTIVE) {
    return "Voucher is not active.";
  }

  if (voucher.startsAt && voucher.startsAt > now) {
    return "Voucher is not available yet.";
  }

  if (voucher.expiresAt && voucher.expiresAt <= now) {
    return "Voucher has expired.";
  }

  if (voucher.stock !== null && voucher.stock <= 0) {
    return "Voucher is out of stock.";
  }

  if (pointsBalance < voucher.pointsCost) {
    return "Not enough points.";
  }

  return null;
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

function toCustomerRedemptionResponse(redemption: {
  id: string;
  userId: string;
  voucherId: string;
  pointsSpent: number;
  status: PrismaVoucherRedemptionStatus;
  redeemedCode: string | null;
  redeemedAt: Date;
  cancelledAt: Date | null;
  voucher: {
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
  };
}): CustomerVoucherRedemption {
  return {
    id: redemption.id,
    userId: redemption.userId,
    voucherId: redemption.voucherId,
    pointsSpent: redemption.pointsSpent,
    status: redemption.status as CustomerVoucherRedemption["status"],
    redeemedCode: redemption.redeemedCode,
    redeemedAt: redemption.redeemedAt.toISOString(),
    cancelledAt: redemption.cancelledAt?.toISOString() ?? null,
    voucher: toVoucherResponse(redemption.voucher),
  };
}

class RedeemVoucherError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export default voucherRouter;
