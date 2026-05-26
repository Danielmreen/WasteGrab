import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { Router, type Request, type RequestHandler } from "express";
import multer from "multer";
import sharp from "sharp";
import type {
  ApiErrorResponse,
  CreatePickupRequestResponse,
  PickupImage,
  PickupItem,
  PickupRequest,
  PickupRequestWithDetails,
} from "@wastegrab/shared";
import {
  ImageType as PrismaImageType,
  PickupStatus as PrismaPickupStatus,
} from "../../generated/prisma/enums.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../prisma.js";
import { getCurrentUserFromRequest } from "../../services/auth.service.js";
import { removeImages, uploadPublicImage } from "../../services/supabase-storage.service.js";

type PickupRequestUpload = Request & { files?: Express.Multer.File[] };
type RequestedPickupItem = {
  categoryId: string;
  estimatedWeight: number;
};

const pickupRouter = Router();

const upload = multer({
  dest: "uploads/",
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

pickupRouter.post(
  "/",
  upload.array("images", 5),
  (async (req, res) => {
    const uploadRequest = req as PickupRequestUpload;
    const user = await getCurrentUserFromRequest(uploadRequest);
    const files = uploadRequest.files ?? [];

    try {
      if (!user) {
        res.status(401).json({ error: "Not authenticated." } as ApiErrorResponse);
        return;
      }

      if (!files.length) {
        res.status(400).json({ error: "At least one image is required." } as ApiErrorResponse);
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
          pricePerKg: true,
        },
      });
      const categoriesById = new Map(categories.map((category) => [category.id, category]));

      if (categories.length !== requestedItems.length) {
        res.status(400).json({ error: "One or more waste categories are not available." } as ApiErrorResponse);
        return;
      }

      const addressText = await resolveAddressText({
        userId: user.id,
        addressId,
        fallback: normalizeText(req.body.addressText),
      });

      if (!addressText) {
        res.status(400).json({ error: "Pickup address is required." } as ApiErrorResponse);
        return;
      }

      const pickupRequestId = randomUUID();
      const uploadedPaths: string[] = [];

      try {
        const uploadedImages: Array<{ imageUrl: string; imageType: PrismaImageType }> = [];

        for (const file of files) {
          const imagePath = `pickup-requests/${user.id}/${pickupRequestId}/${randomUUID()}.jpg`;
          const image = await sharp(file.path)
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

        const estimatedPrice = requestedItems.reduce((total, item) => {
          const category = categoriesById.get(item.categoryId);
          return total + Number(category?.pricePerKg ?? 0) * item.estimatedWeight;
        }, 0);
        const classificationLabel = categories
          .map((category) => category.name)
          .join(", ")
          .slice(0, 100);

        const created = await prisma.pickupRequest.create({
          data: {
            id: pickupRequestId,
            userId: user.id,
            addressText,
            status: PrismaPickupStatus.PENDING,
            notes,
            aiClassificationLabel: classificationLabel,
            aiSuggestedPayload,
            estimatedPrice: estimatedPrice.toFixed(2),
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
          include: {
            items: true,
            images: true,
          },
        });

        const payload: CreatePickupRequestResponse = {
          pickupRequest: toPickupRequestWithDetails(created),
        };

        res.status(201).json(payload);
      } catch (err) {
        await removeImages(uploadedPaths);
        throw err;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create pickup request.";
      res.status(400).json({ error: message } as ApiErrorResponse);
    } finally {
      await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => undefined)));
    }
  }) as RequestHandler,
);

async function resolveAddressText(input: {
  userId: string;
  addressId: string | undefined;
  fallback: string;
}): Promise<string> {
  if (!input.addressId) {
    return input.fallback;
  }

  const address = await prisma.address.findFirst({
    where: {
      id: input.addressId,
      userId: input.userId,
    },
  });

  if (!address) {
    return input.fallback;
  }

  return (
    address.formattedAddress ||
    [address.street, address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(", ")
  );
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
  status: PrismaPickupStatus;
  notes: string | null;
  aiClassificationLabel: string | null;
  aiConfidence: unknown | null;
  aiSuggestedPayload: unknown | null;
  estimatedPrice: unknown | null;
  finalPrice: unknown | null;
  createdAt: Date;
  completedAt: Date | null;
  items?: Array<{
    id: string;
    pickupRequestId: string;
    categoryId: string;
    estimatedWeight: unknown | null;
    actualWeight: unknown | null;
  }>;
  images?: Array<{
    id: string;
    pickupRequestId: string;
    imageUrl: string;
    imageType: PrismaImageType;
    uploadedAt: Date;
  }>;
}): PickupRequestWithDetails {
  const request: PickupRequest = {
    id: row.id,
    userId: row.userId,
    collectorId: row.collectorId,
    addressText: row.addressText,
    status: row.status as PickupRequest["status"],
    notes: row.notes,
    aiClassificationLabel: row.aiClassificationLabel,
    aiConfidence: stringifyDecimal(row.aiConfidence),
    aiSuggestedPayload: row.aiSuggestedPayload,
    estimatedPrice: stringifyDecimal(row.estimatedPrice),
    finalPrice: stringifyDecimal(row.finalPrice),
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };

  const items: PickupItem[] = (row.items ?? []).map((item) => ({
    id: item.id,
    pickupRequestId: item.pickupRequestId,
    categoryId: item.categoryId,
    estimatedWeight: stringifyDecimal(item.estimatedWeight),
    actualWeight: stringifyDecimal(item.actualWeight),
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
  };
}

function stringifyDecimal(value: unknown | null): string | null {
  return value === null || value === undefined ? null : String(value);
}

export default pickupRouter;
