import { Router, type NextFunction, type Request, type Response } from "express";
import type {
  ApiErrorResponse,
  CollectionLocation,
  CollectorPickupRequest,
  GetCollectorPickupRequestResponse,
  ListCollectorPickupRequestsResponse,
  PickupImage,
  PickupItem,
  PickupRequest,
} from "@wastegrab/shared";
import {
  ImageType as PrismaImageType,
  PointLedgerStatus as PrismaPointLedgerStatus,
  PointLedgerType as PrismaPointLedgerType,
  PickupStatus as PrismaPickupStatus,
} from "../../generated/prisma/enums.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../prisma.js";
import { getCurrentUserFromRequest } from "../../services/auth.service.js";
import { awardEligibleAchievements } from "../../services/achievement.service.js";
import { emitPickupUpdateEvent } from "../../services/notification-stream.service.js";

const pickupRouter = Router();

const pickupRequestInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
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

function toCollectionLocationResponse(location: {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: { toNumber?(): number } | number | string | null;
  longitude: { toNumber?(): number } | number | string | null;
  googlePlaceId: string | null;
  imageUrl: string | null;
  createdAt: Date;
  createdBy: string | null;
}): CollectionLocation {
  return {
    id: location.id,
    name: location.name,
    address: location.address,
    city: location.city,
    state: location.state,
    postalCode: location.postalCode,
    latitude: location.latitude === null ? null : Number(location.latitude),
    longitude: location.longitude === null ? null : Number(location.longitude),
    googlePlaceId: location.googlePlaceId,
    imageUrl: location.imageUrl,
    createdAt: location.createdAt.toISOString(),
    createdBy: location.createdBy,
  };
}

async function requireCollector(req: Request, res: Response, next: NextFunction) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || user.role !== "COLLECTOR") {
    res.status(403).json({ error: "Forbidden. Collector access required." } as ApiErrorResponse);
    return;
  }

  next();
}

pickupRouter.get("/", requireCollector, async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user || user.role !== "COLLECTOR") {
      res.status(403).json({ error: "Forbidden. Collector access required." } as ApiErrorResponse);
      return;
    }

    const collectorCoordinates = normalizeCoordinatePair(
      req.query.latitude,
      req.query.longitude,
    );
    const scope = parsePickupScope(req.query.scope);
    const pickupRequests = await prisma.pickupRequest.findMany({
      where: pickupScopeWhere(scope, user.id),
      include: pickupRequestInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const mapped = pickupRequests.map((pickup) => toCollectorPickupRequest(
      pickup,
      collectorCoordinates,
    ));
    mapped.sort(compareCollectorPickups);

    const payload: ListCollectorPickupRequestsResponse = {
      pickupRequests: mapped,
    };

    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch pickup requests.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

pickupRouter.get("/collection-locations", requireCollector, async (_req: Request, res: Response) => {
  try {
    const locations = await prisma.location.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(locations.map(toCollectionLocationResponse));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch collection locations.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

pickupRouter.get("/:pickupRequestId", requireCollector, async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUserFromRequest(req);

    if (!user || user.role !== "COLLECTOR") {
      res.status(403).json({ error: "Forbidden. Collector access required." } as ApiErrorResponse);
      return;
    }

    const collectorCoordinates = normalizeCoordinatePair(
      req.query.latitude,
      req.query.longitude,
    );
    const pickupRequest = await prisma.pickupRequest.findFirst({
      where: {
        id: String(req.params.pickupRequestId),
        OR: [
          { collectorId: user.id },
          {
            collectorId: null,
            status: {
              notIn: [PrismaPickupStatus.COMPLETED, PrismaPickupStatus.CANCELLED],
            },
          },
        ],
      },
      include: pickupRequestInclude,
    });

    if (!pickupRequest) {
      res.status(404).json({ error: "Pickup request not found." } as ApiErrorResponse);
      return;
    }

    const payload: GetCollectorPickupRequestResponse = {
      pickupRequest: toCollectorPickupRequest(pickupRequest, collectorCoordinates),
    };

    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch pickup request.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

pickupRouter.patch("/:pickupRequestId/accept", requireCollector, async (req: Request, res: Response) => {
  try {
    const user = await requireCollectorUser(req, res);
    if (!user) return;
    const pickup = await prisma.pickupRequest.findFirst({
      where: {
        id: String(req.params.pickupRequestId),
        collectorId: null,
        status: PrismaPickupStatus.PENDING,
      },
    });

    if (!pickup) {
      res.status(400).json({ error: "Pickup is not available to accept." } as ApiErrorResponse);
      return;
    }

    const updated = await prisma.pickupRequest.update({
      where: { id: pickup.id },
      data: {
        collector: {
          connect: {
            id: user.id,
          },
        },
        status: PrismaPickupStatus.ACCEPTED,
      },
      include: pickupRequestInclude,
    });

    emitPickupUpdateEvent(pickup.userId, pickup.id);
    res.json({ pickupRequest: toCollectorPickupRequest(updated, null) } satisfies GetCollectorPickupRequestResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to accept pickup.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

pickupRouter.patch("/:pickupRequestId/arrive", requireCollector, async (req: Request, res: Response) => {
  try {
    const user = await requireCollectorUser(req, res);
    if (!user) return;
    const pickup = await prisma.pickupRequest.findFirst({
      where: {
        id: String(req.params.pickupRequestId),
        collectorId: user.id,
        status: PrismaPickupStatus.ACCEPTED,
      },
    });

    if (!pickup) {
      res.status(400).json({ error: "Pickup must be accepted by you before marking arrived." } as ApiErrorResponse);
      return;
    }

    const updated = await prisma.pickupRequest.update({
      where: { id: pickup.id },
      data: {
        status: PrismaPickupStatus.ARRIVED,
      },
      include: pickupRequestInclude,
    });

    emitPickupUpdateEvent(pickup.userId, pickup.id);
    res.json({ pickupRequest: toCollectorPickupRequest(updated, null) } satisfies GetCollectorPickupRequestResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to mark pickup arrived.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

pickupRouter.patch("/:pickupRequestId/verify", requireCollector, async (req: Request, res: Response) => {
  try {
    const user = await requireCollectorUser(req, res);
    if (!user) return;
    const actualWeights = parseActualWeights(req.body);

    const existing = await prisma.pickupRequest.findFirst({
      where: {
        id: String(req.params.pickupRequestId),
        collectorId: user.id,
        status: PrismaPickupStatus.ARRIVED,
      },
      include: {
        items: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existing) {
      res.status(400).json({ error: "Pickup must be arrived before verification." } as ApiErrorResponse);
      return;
    }

    const pickupItemIds = new Set(existing.items.map((item) => item.id));
    const invalidItem = actualWeights.find((item) => !pickupItemIds.has(item.itemId));
    if (invalidItem) {
      res.status(400).json({ error: "Verified weights include an item outside this pickup." } as ApiErrorResponse);
      return;
    }

    const verifiedItemIds = new Set(actualWeights.map((item) => item.itemId));
    if (verifiedItemIds.size !== pickupItemIds.size) {
      res.status(400).json({ error: "Every pickup item must have a verified weight." } as ApiErrorResponse);
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of actualWeights) {
        await tx.pickupItem.update({
          where: { id: item.itemId },
          data: { actualWeight: item.actualWeight.toFixed(2) },
        });
      }

      return tx.pickupRequest.update({
        where: { id: existing.id },
        data: {
          status: PrismaPickupStatus.VERIFIED,
        },
        include: pickupRequestInclude,
      });
    });

    emitPickupUpdateEvent(existing.userId, existing.id);
    res.json({ pickupRequest: toCollectorPickupRequest(updated, null) } satisfies GetCollectorPickupRequestResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to verify pickup.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

pickupRouter.patch("/:pickupRequestId/complete", requireCollector, async (req: Request, res: Response) => {
  try {
    const user = await requireCollectorUser(req, res);
    if (!user) return;
    const existing = await prisma.pickupRequest.findFirst({
      where: {
        id: String(req.params.pickupRequestId),
        collectorId: user.id,
        status: PrismaPickupStatus.VERIFIED,
      },
      include: pickupRequestInclude,
    });

    if (!existing) {
      res.status(400).json({ error: "Pickup must be verified before completion." } as ApiErrorResponse);
      return;
    }

    const points = calculatePickupPoints(existing.items ?? []);

    const updated = await prisma.$transaction(async (tx) => {
      const latestLedger = await tx.pointLedger.findFirst({
        where: {
          userId: existing.userId,
          status: PrismaPointLedgerStatus.POSTED,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          balanceAfter: true,
        },
      });

      const completed = await tx.pickupRequest.update({
        where: { id: existing.id },
        data: {
          status: PrismaPickupStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: pickupRequestInclude,
      });

      const existingLedger = await tx.pointLedger.findFirst({
        where: {
          pickupRequestId: existing.id,
          type: PrismaPointLedgerType.PICKUP_EARNED,
        },
      });

      if (!existingLedger) {
        await tx.pointLedger.create({
          data: {
            userId: existing.userId,
            pickupRequestId: existing.id,
            type: PrismaPointLedgerType.PICKUP_EARNED,
            status: PrismaPointLedgerStatus.POSTED,
            points,
            balanceAfter: (latestLedger?.balanceAfter ?? 0) + points,
            description: "Points earned from completed pickup.",
            metadata: {
              actualWeightKg: calculatePickupWeight(existing.items ?? []),
            },
          },
        });
      }

      return completed;
    });

    await awardEligibleAchievements(existing.userId);
    emitPickupUpdateEvent(existing.userId, existing.id);
    res.json({ pickupRequest: toCollectorPickupRequest(updated, null) } satisfies GetCollectorPickupRequestResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to complete pickup.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

type PickupScope = "all" | "available" | "my";
type VerifiedWeightInput = {
  itemId: string;
  actualWeight: number;
};

async function requireCollectorUser(req: Request, res: Response) {
  const user = await getCurrentUserFromRequest(req);

  if (!user || user.role !== "COLLECTOR") {
    res.status(403).json({ error: "Forbidden. Collector access required." } as ApiErrorResponse);
    return null;
  }

  return user;
}

function parseActualWeights(body: unknown): VerifiedWeightInput[] {
  const items = isRecord(body) ? body.items : null;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one verified item weight is required.");
  }

  return items.map((item) => {
    if (!isRecord(item)) {
      throw new Error("Verified item weight is invalid.");
    }

    const itemId = typeof item.itemId === "string" ? item.itemId : "";
    const actualWeight = Number(item.actualWeight);

    if (!itemId || !Number.isFinite(actualWeight) || actualWeight <= 0) {
      throw new Error("Verified weights must include itemId and a positive actualWeight.");
    }

    return {
      itemId,
      actualWeight,
    };
  });
}

function calculatePickupPoints(items: Array<{
  actualWeight: unknown | null;
  estimatedWeight: unknown | null;
  category?: {
    pointsPerKg: number;
  } | null;
}>): number {
  return items.reduce((total, item) => {
    const weight = Number(item.actualWeight ?? item.estimatedWeight ?? 0);
    return total + Math.round(weight * (item.category?.pointsPerKg ?? 0));
  }, 0);
}

function calculatePickupWeight(items: Array<{
  actualWeight: unknown | null;
  estimatedWeight: unknown | null;
}>): number {
  return Number(items.reduce((total, item) => {
    return total + Number(item.actualWeight ?? item.estimatedWeight ?? 0);
  }, 0).toFixed(2));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePickupScope(value: unknown): PickupScope {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw === "available" || raw === "my" ? raw : "all";
}

function pickupScopeWhere(scope: PickupScope, collectorId: string): Prisma.PickupRequestWhereInput {
  if (scope === "available") {
    return {
      collectorId: null,
      status: {
        notIn: [PrismaPickupStatus.COMPLETED, PrismaPickupStatus.CANCELLED],
      },
    };
  }

  if (scope === "my") {
    return {
      collectorId,
    };
  }

  return {};
}

function toCollectorPickupRequest(
  row: {
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
    user: {
      id: string;
      name: string;
      email: string;
    };
    collector: {
      id: string;
      name: string;
      email: string;
    } | null;
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
  },
  collectorCoordinates: CoordinatePair | null,
): CollectorPickupRequest {
  const pickupCoordinates = normalizeCoordinatePair(row.latitude, row.longitude);
  const request: PickupRequest = {
    id: row.id,
    userId: row.userId,
    collectorId: row.collectorId,
    addressText: row.addressText,
    latitude: pickupCoordinates ? String(pickupCoordinates.latitude) : stringifyDecimal(row.latitude),
    longitude: pickupCoordinates ? String(pickupCoordinates.longitude) : stringifyDecimal(row.longitude),
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
    user: row.user,
    collector: row.collector,
    distanceKm: calculateDistanceKm(
      collectorCoordinates,
      pickupCoordinates,
    ),
  };
}

function compareCollectorPickups(a: CollectorPickupRequest, b: CollectorPickupRequest): number {
  const aDistance = a.distanceKm === null ? Number.POSITIVE_INFINITY : Number(a.distanceKm);
  const bDistance = b.distanceKm === null ? Number.POSITIVE_INFINITY : Number(b.distanceKm);

  if (aDistance !== bDistance) {
    return aDistance - bDistance;
  }

  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

type CoordinatePair = {
  latitude: number;
  longitude: number;
};

function calculateDistanceKm(from: CoordinatePair | null, to: CoordinatePair | null): string | null {
  if (!from || !to) {
    return null;
  }

  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitudeRadians = toRadians(from.latitude);
  const toLatitudeRadians = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;
  const distance = 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return distance.toFixed(2);
}

function parseCoordinate(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCoordinatePair(latitudeValue: unknown, longitudeValue: unknown): CoordinatePair | null {
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

function isLatitude(value: number): boolean {
  return value >= -90 && value <= 90;
}

function isLongitude(value: number): boolean {
  return value >= -180 && value <= 180;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function stringifyDecimal(value: unknown | null): string | null {
  return value === null || value === undefined ? null : String(value);
}

export default pickupRouter;
