import { randomUUID } from "node:crypto";
import { Router, type Request, type RequestHandler } from "express";
import multer from "multer";
import sharp from "sharp";
import type {
  ApiErrorResponse,
  CreatePickupRequestResponse,
  GetPickupRequestResponse,
  LeaderboardResponse,
  ListPickupRequestsResponse,
  PickupImage,
  PickupItem,
  PickupRequest,
  PickupRequestWithDetails,
  RewardSummaryResponse,
} from "@wastegrab/shared";
import {
  ImageType as PrismaImageType,
  PointLedgerStatus as PrismaPointLedgerStatus,
  PickupStatus as PrismaPickupStatus,
} from "../../generated/prisma/enums.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../prisma.js";
import { getCurrentUserFromRequest } from "../../services/auth.service.js";
import { createNotification } from "../../services/notification.service.js";
import { emitPickupUpdateEvent } from "../../services/notification-stream.service.js";
import { removeImages, uploadPublicImage } from "../../services/supabase-storage.service.js";

type PickupRequestUpload = Request & { files?: Express.Multer.File[] };
type RequestedPickupItem = {
  categoryId: string;
  estimatedWeight: number;
};

const pickupRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image uploads are supported."));
  },
});

const pickupRequestInclude = {
  collector: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  items: {
    include: {
      category: {
        select: {
          id: true,
          name: true,
          pointsPerKg: true,
        },
      },
    },
  },
  images: true,
} satisfies Prisma.PickupRequestInclude;

pickupRouter.get(
  "/",
  (async (req, res) => {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
      return;
    }

    const pickupRequests = await prisma.pickupRequest.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: pickupRequestInclude,
    });

    const payload: ListPickupRequestsResponse = {
      pickupRequests: pickupRequests.map(toPickupRequestWithDetails),
    };

    res.json(payload);
  }) as RequestHandler,
);

pickupRouter.get(
  "/rewards/summary",
  (async (req, res) => {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
      return;
    }

    const [completedPickups, latestLedger] = await Promise.all([
      prisma.pickupRequest.findMany({
        where: {
          userId: user.id,
          status: PrismaPickupStatus.COMPLETED,
        },
        select: {
          items: {
            select: {
              estimatedWeight: true,
              actualWeight: true,
            },
          },
        },
      }),
      prisma.pointLedger.findFirst({
        where: {
          userId: user.id,
          status: PrismaPointLedgerStatus.POSTED,
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        select: {
          balanceAfter: true,
        },
      }),
    ]);

    const completedWeightKg = completedPickups.reduce((pickupTotal, request) => {
      return pickupTotal + request.items.reduce((itemTotal, item) => {
        return itemTotal + Number(item.actualWeight ?? item.estimatedWeight ?? 0);
      }, 0);
    }, 0);

    const payload: RewardSummaryResponse = {
      summary: {
        completedWeightKg: completedWeightKg.toFixed(2),
        pointsBalance: latestLedger?.balanceAfter ?? 0,
      },
    };

    res.json(payload);
  }) as RequestHandler,
);

pickupRouter.get(
  "/leaderboard",
  (async (req, res) => {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
      return;
    }

    const completedPickups = await prisma.pickupRequest.findMany({
      where: {
        status: PrismaPickupStatus.COMPLETED,
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        items: {
          select: {
            estimatedWeight: true,
            actualWeight: true,
          },
        },
      },
    });

    const leaderboardByUser = new Map<
      string,
      {
        userId: string;
        name: string;
        avatarUrl: string | null;
        completedPickupIds: Set<string>;
        totalWeightKg: number;
      }
    >();

    completedPickups.forEach((pickup) => {
      const entry = leaderboardByUser.get(pickup.userId) ?? {
        userId: pickup.user.id,
        name: pickup.user.name,
        avatarUrl: pickup.user.avatarUrl,
        completedPickupIds: new Set<string>(),
        totalWeightKg: 0,
      };

      entry.completedPickupIds.add(pickup.id);
      entry.totalWeightKg += pickup.items.reduce((total, item) => {
        return total + Number(item.actualWeight ?? item.estimatedWeight ?? 0);
      }, 0);

      leaderboardByUser.set(pickup.userId, entry);
    });

    const rankedLeaderboard = [...leaderboardByUser.values()]
      .sort((a, b) => {
        if (b.totalWeightKg !== a.totalWeightKg) {
          return b.totalWeightKg - a.totalWeightKg;
        }

        if (b.completedPickupIds.size !== a.completedPickupIds.size) {
          return b.completedPickupIds.size - a.completedPickupIds.size;
        }

        return a.name.localeCompare(b.name);
      })
      .map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        name: entry.name,
        avatarUrl: entry.avatarUrl,
        completedPickups: entry.completedPickupIds.size,
        totalWeightKg: entry.totalWeightKg.toFixed(2),
        isCurrentUser: entry.userId === user.id,
      }));

    const payload: LeaderboardResponse = {
      leaderboard: rankedLeaderboard.slice(0, 20),
      currentUser: rankedLeaderboard.find((entry) => entry.userId === user.id) ?? null,
    };

    res.json(payload);
  }) as RequestHandler,
);

pickupRouter.get(
  "/:pickupRequestId",
  (async (req, res) => {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
      return;
    }

    const pickupRequest = await prisma.pickupRequest.findFirst({
      where: {
        id: String(req.params.pickupRequestId),
        userId: user.id,
      },
      include: pickupRequestInclude,
    });

    if (!pickupRequest) {
      res.status(404).json({ error: "Pickup request not found." } as ApiErrorResponse);
      return;
    }

    const payload: GetPickupRequestResponse = {
      pickupRequest: toPickupRequestWithDetails(pickupRequest),
    };

    res.json(payload);
  }) as RequestHandler,
);

pickupRouter.patch(
  "/:pickupRequestId/cancel",
  (async (req, res) => {
    const user = await getCurrentUserFromRequest(req);

    if (!user) {
      res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
      return;
    }

    const existing = await prisma.pickupRequest.findFirst({
      where: {
        id: String(req.params.pickupRequestId),
        userId: user.id,
      },
      include: pickupRequestInclude,
    });

    if (!existing) {
      res.status(404).json({ error: "Pickup request not found." } as ApiErrorResponse);
      return;
    }

    if (
      existing.status !== PrismaPickupStatus.PENDING &&
      existing.status !== PrismaPickupStatus.ACCEPTED
    ) {
      res.status(400).json({ error: "This pickup request cannot be cancelled." } as ApiErrorResponse);
      return;
    }

    const cancelled = await prisma.pickupRequest.update({
      where: {
        id: existing.id,
      },
      data: {
        status: PrismaPickupStatus.CANCELLED,
      },
      include: pickupRequestInclude,
    });

    if (existing.collectorId) {
      emitPickupUpdateEvent(existing.collectorId, existing.id);
    }

    const payload: GetPickupRequestResponse = {
      pickupRequest: toPickupRequestWithDetails(cancelled),
    };

    res.json(payload);
  }) as RequestHandler,
);

pickupRouter.post(
  "/",
  upload.array("images", 5),
  (async (req, res) => {
    const uploadRequest = req as PickupRequestUpload;
    const files = uploadRequest.files ?? [];

    try {
      const user = await getCurrentUserFromRequest(uploadRequest);

      if (!user) {
        res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
        return;
      }

      if (!files.length) {
        res.status(400).json({ error: "At least one image is required." } as ApiErrorResponse);
        return;
      }

      const activePickupRequest = await prisma.pickupRequest.findFirst({
        where: {
          userId: user.id,
          status: {
            notIn: [PrismaPickupStatus.COMPLETED, PrismaPickupStatus.CANCELLED],
          },
        },
        select: {
          id: true,
        },
      });

      if (activePickupRequest) {
        res.status(409).json({
          error: "You already have an active pickup request. Please wait until it is completed or cancelled before creating a new one.",
        } as ApiErrorResponse);
        return;
      }

      const requestedItems = parseRequestedItems(
        req.body.items,
        req.body.categoryId,
        req.body.estimatedWeight,
      );
      const notes = normalizeOptionalText(req.body.notes);
      const addressId = normalizeOptionalText(req.body.addressId);
      const aiSuggestedPayload = parseOptionalJson(req.body.ai_auto ?? req.body.aiAuto);

      if (!requestedItems.length) {
        res.status(400).json({ error: "At least one waste category is required." } as ApiErrorResponse);
        return;
      }

      const categories = await prisma.wasteCategory.findMany({
        where: {
          id: {
            in: requestedItems.map((item) => item.categoryId),
          },
          isBanned: false,
          isHazardous: false,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (categories.length !== requestedItems.length) {
        res.status(400).json({ error: "One or more waste categories are not available." } as ApiErrorResponse);
        return;
      }

      const pickupAddress = await resolvePickupAddress({
        userId: user.id,
        addressId,
        fallback: normalizeText(req.body.addressText),
      });

      if (!pickupAddress.addressText) {
        res.status(400).json({ error: "Pickup address is required." } as ApiErrorResponse);
        return;
      }

      const pickupRequestId = randomUUID();
      const uploadedPaths: string[] = [];

      try {
        const uploadedImages: Array<{ imageUrl: string; imageType: PrismaImageType }> = [];

        for (const file of files) {
          const imagePath = `pickup-requests/${user.id}/${pickupRequestId}/${randomUUID()}.jpg`;
          const image = await sharp(file.buffer)
            .rotate()
            .resize({
              width: 1600,
              height: 1600,
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({ quality: 88 })
            .toBuffer();

          const imageUrl = await uploadPublicImage(imagePath, image);
          uploadedPaths.push(imagePath);
          uploadedImages.push({ imageUrl, imageType: PrismaImageType.USER_UPLOAD });
        }

        const classificationLabel = categories
          .map((category) => category.name)
          .join(", ")
          .slice(0, 100);

        const created = await prisma.pickupRequest.create({
          data: {
            id: pickupRequestId,
            userId: user.id,
            addressText: pickupAddress.addressText,
            latitude: pickupAddress.latitude,
            longitude: pickupAddress.longitude,
            status: PrismaPickupStatus.PENDING,
            notes,
            aiClassificationLabel: classificationLabel,
            aiSuggestedPayload,
            items: {
              create: requestedItems.map((item) => ({
                categoryId: item.categoryId,
                estimatedWeight: item.estimatedWeight.toFixed(2),
              })),
            },
            images: {
              create: uploadedImages,
            },
          },
          include: pickupRequestInclude,
        });

        const payload: CreatePickupRequestResponse = {
          pickupRequest: toPickupRequestWithDetails(created),
        };

        await createNotification({
          userId: user.id,
          title: "Pickup request created",
          message: "Your pickup request is waiting for collector review.",
          type: "PICKUP_CREATED",
          actionUrl: `/customer/pickups/${created.id}`,
        });

        res.status(201).json(payload);
      } catch (err) {
        await removeImages(uploadedPaths);
        throw err;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create pickup request.";
      res.status(400).json({ error: message } as ApiErrorResponse);
    }
  }) as RequestHandler,
);

async function resolvePickupAddress(input: {
  userId: string;
  addressId: string | undefined;
  fallback: string;
}): Promise<{ addressText: string; latitude: string | null; longitude: string | null }> {
  if (!input.addressId) {
    return { addressText: input.fallback, latitude: null, longitude: null };
  }

  const address = await prisma.address.findFirst({
    where: {
      id: input.addressId,
      userId: input.userId,
    },
  });

  if (!address) {
    return { addressText: input.fallback, latitude: null, longitude: null };
  }

  const addressText = (
    address.formattedAddress ||
    [address.street, address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(", ")
  );

  const coordinates = normalizeCoordinatePair(address.latitude, address.longitude);

  return {
    addressText,
    latitude: coordinates ? String(coordinates.latitude) : stringifyDecimal(address.latitude),
    longitude: coordinates ? String(coordinates.longitude) : stringifyDecimal(address.longitude),
  };
}

function normalizeCoordinatePair(latitudeValue: unknown, longitudeValue: unknown): { latitude: number; longitude: number } | null {
  const latitude = parseCoordinate(latitudeValue);
  const longitude = parseCoordinate(longitudeValue);

  if (latitude === null || longitude === null) {
    return null;
  }

  if (latitude === 0 && longitude === 0) {
    return null;
  }

  if (isLatitude(latitude) && isLongitude(longitude)) {
    return { latitude, longitude };
  }

  if (isLatitude(longitude) && isLongitude(latitude)) {
    return { latitude: longitude, longitude: latitude };
  }

  return null;
}

function parseCoordinate(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : null;
}

function isLatitude(value: number): boolean {
  return value >= -90 && value <= 90;
}

function isLongitude(value: number): boolean {
  return value >= -180 && value <= 180;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value: unknown): string | undefined {
  const text = normalizeText(value);
  return text || undefined;
}

function parsePositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseRequestedItems(
  itemsValue: unknown,
  legacyCategoryId: unknown,
  legacyEstimatedWeight: unknown,
): RequestedPickupItem[] {
  if (itemsValue === undefined) {
    const categoryId = normalizeText(legacyCategoryId);
    const estimatedWeight = parsePositiveNumber(legacyEstimatedWeight);
    return categoryId && estimatedWeight !== null
      ? [{ categoryId, estimatedWeight }]
      : [];
  }

  const rawItems = parseItemsValue(itemsValue);
  const consolidated = new Map<string, number>();

  rawItems.forEach((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Waste item ${index + 1} is invalid.`);
    }

    const categoryId = normalizeText(item.categoryId);
    const estimatedWeight = parsePositiveNumber(item.estimatedWeight);

    if (!categoryId || estimatedWeight === null) {
      throw new Error(`Waste item ${index + 1} needs a category and weight.`);
    }

    consolidated.set(
      categoryId,
      (consolidated.get(categoryId) ?? 0) + estimatedWeight,
    );
  });

  return Array.from(consolidated.entries()).map(([categoryId, estimatedWeight]) => ({
    categoryId,
    estimatedWeight,
  }));
}

function parseItemsValue(value: unknown): unknown[] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;

  if (!Array.isArray(parsed)) {
    throw new Error("Waste items must be an array.");
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseOptionalJson(value: unknown): Prisma.InputJsonValue | undefined {
  const text = normalizeOptionalText(value);

  if (!text) {
    return undefined;
  }

  const parsed = JSON.parse(text) as unknown;

  if (!isRecord(parsed) && !Array.isArray(parsed)) {
    throw new Error("AI autofill payload is invalid.");
  }

  return parsed as Prisma.InputJsonValue;
}

function toPickupRequestWithDetails(row: {
  id: string;
  userId: string;
  collectorId: string | null;
  addressText: string;
  latitude: unknown | null;
  longitude: unknown | null;
  status: PrismaPickupStatus;
  notes: string | null;
  aiClassificationLabel: string | null;
  aiConfidence: unknown | null;
  aiSuggestedPayload: unknown | null;
  createdAt: Date;
  completedAt: Date | null;
  items?: Array<{
    id: string;
    pickupRequestId: string;
    categoryId: string;
    estimatedWeight: unknown | null;
    actualWeight: unknown | null;
    category?: {
      id: string;
      name: string;
      pointsPerKg: number;
    } | null;
  }>;
  images?: Array<{
    id: string;
    pickupRequestId: string;
    imageUrl: string;
    imageType: PrismaImageType;
    uploadedAt: Date;
  }>;
  collector?: {
    id: string;
    name: string;
    email: string;
  } | null;
}): PickupRequestWithDetails {
  const request: PickupRequest = {
    id: row.id,
    userId: row.userId,
    collectorId: row.collectorId,
    addressText: row.addressText,
    latitude: stringifyDecimal(row.latitude),
    longitude: stringifyDecimal(row.longitude),
    status: row.status as PickupRequest["status"],
    notes: row.notes,
    aiClassificationLabel: row.aiClassificationLabel,
    aiConfidence: stringifyDecimal(row.aiConfidence),
    aiSuggestedPayload: row.aiSuggestedPayload,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };

  const items: PickupItem[] = (row.items ?? []).map((item) => ({
    id: item.id,
    pickupRequestId: item.pickupRequestId,
    categoryId: item.categoryId,
    estimatedWeight: stringifyDecimal(item.estimatedWeight),
    actualWeight: stringifyDecimal(item.actualWeight),
    category: item.category
      ? {
          id: item.category.id,
          name: item.category.name,
          pointsPerKg: item.category.pointsPerKg,
        }
      : null,
  }));

  const images: PickupImage[] = (row.images ?? []).map((image) => ({
    id: image.id,
    pickupRequestId: image.pickupRequestId,
    imageUrl: image.imageUrl,
    imageType: image.imageType as PickupImage["imageType"],
    uploadedAt: image.uploadedAt.toISOString(),
  }));

  return {
    ...request,
    items,
    images,
    collector: row.collector ?? null,
  };
}

function stringifyDecimal(value: unknown | null): string | null {
  return value === null || value === undefined ? null : String(value);
}

export default pickupRouter;
