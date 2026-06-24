import { randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import type {
  ApiErrorResponse,
  CreateWasteCategoryInput,
  UpdateWasteCategoryInput,
  WasteCategory,
} from "@wastegrab/shared";
import { prisma } from "../../prisma.js";
import { getCurrentUserFromRequest } from "../../services/auth.service.js";
import { uploadPublicWasteCategory } from "../../services/supabase-storage.service.js";
import { getBody } from "../../utils/request.js";

const wasteCategoryRouter = Router();
const wasteCategoryImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") && file.mimetype !== "image/svg+xml") {
      cb(null, true);
      return;
    }

    cb(new Error("Only raster image uploads are supported."));
  },
});

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden. Admin access required." } as ApiErrorResponse);
    return;
  }

  next();
}

wasteCategoryRouter.get("/", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.wasteCategory.findMany({
      orderBy: { name: "asc" },
    });

    res.json(categories.map(toWasteCategoryResponse));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch waste categories.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

wasteCategoryRouter.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const category = await prisma.wasteCategory.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!category) {
      res.status(404).json({ error: "Waste category not found." } as ApiErrorResponse);
      return;
    }

    res.json(toWasteCategoryResponse(category));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch waste category.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

wasteCategoryRouter.post("/upload", requireAdmin, wasteCategoryImageUpload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "Missing image file." } as ApiErrorResponse);
    return;
  }

  try {
    const image = await sharp(req.file.buffer)
      .rotate()
      .resize({
        width: 800,
        height: 800,
        fit: "cover",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 88 })
      .toBuffer();

    const imageUrl = await uploadPublicWasteCategory(`waste-categories/${randomUUID()}.jpg`, image);

    res.status(201).json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to upload waste category image.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

wasteCategoryRouter.post("/", requireAdmin, async (req: Request, res: Response) => {
  const input = getBody(req.body) as Partial<CreateWasteCategoryInput>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const pointsPerKg = normalizeIntegerInput(input.pointsPerKg);
  const averageWeightKg = normalizeDecimalInput(input.averageWeightKg ?? "0.05");

  if (!name || pointsPerKg === undefined) {
    res.status(400).json({ error: "Missing required fields: name, pointsPerKg." } as ApiErrorResponse);
    return;
  }

  if (!averageWeightKg) {
    res.status(400).json({ error: "averageWeightKg must be a valid number." } as ApiErrorResponse);
    return;
  }

  try {
    const category = await prisma.wasteCategory.create({
      data: {
        name,
        pointsPerKg,
        averageWeightKg,
        isBanned: Boolean(input.isBanned),
        isHazardous: Boolean(input.isHazardous),
        isAiDetectable: input.isAiDetectable ?? true,
        description: normalizeOptionalString(input.description),
        imageUrl: normalizeOptionalString(input.imageUrl),
      },
    });

    res.status(201).json(toWasteCategoryResponse(category));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create waste category.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

wasteCategoryRouter.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  const input = getBody(req.body) as Partial<UpdateWasteCategoryInput>;

  try {
    const existing = await prisma.wasteCategory.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!existing) {
      res.status(404).json({ error: "Waste category not found." } as ApiErrorResponse);
      return;
    }

    const data: Record<string, string | number | boolean | null> = {};

    if (typeof input.name === "string") {
      data.name = input.name.trim();
    }

    if (input.pointsPerKg !== undefined) {
      const pointsPerKg = normalizeIntegerInput(input.pointsPerKg);
      if (pointsPerKg === undefined) {
        res.status(400).json({ error: "pointsPerKg must be a valid integer." } as ApiErrorResponse);
        return;
      }
      data.pointsPerKg = pointsPerKg;
    }

    if (input.averageWeightKg !== undefined) {
      const averageWeightKg = normalizeDecimalInput(input.averageWeightKg);
      if (!averageWeightKg) {
        res.status(400).json({ error: "averageWeightKg must be a valid number." } as ApiErrorResponse);
        return;
      }
      data.averageWeightKg = averageWeightKg;
    }

    if (input.isBanned !== undefined) data.isBanned = input.isBanned;
    if (input.isHazardous !== undefined) data.isHazardous = input.isHazardous;
    if (input.isAiDetectable !== undefined) data.isAiDetectable = input.isAiDetectable;
    if (input.description !== undefined) data.description = normalizeOptionalString(input.description);
    if (input.imageUrl !== undefined) data.imageUrl = normalizeOptionalString(input.imageUrl);

    const updated = await prisma.wasteCategory.update({
      where: { id: existing.id },
      data,
    });

    res.json(toWasteCategoryResponse(updated));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update waste category.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

wasteCategoryRouter.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.wasteCategory.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!existing) {
      res.status(404).json({ error: "Waste category not found." } as ApiErrorResponse);
      return;
    }

    await prisma.wasteCategory.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to delete waste category.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

function normalizeDecimalInput(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const normalized = String(value).trim();
  if (!normalized || Number.isNaN(Number(normalized))) {
    return undefined;
  }

  return normalized;
}

function normalizeIntegerInput(value: unknown): number | undefined {
  const normalized = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    return undefined;
  }

  return normalized;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function toWasteCategoryResponse(category: {
  id: string;
  name: string;
  pointsPerKg: number;
  averageWeightKg: { toString(): string };
  isBanned: boolean;
  isHazardous: boolean;
  isAiDetectable: boolean;
  description: string | null;
  imageUrl: string | null;
}): WasteCategory {
  return {
    id: category.id,
    name: category.name,
    pointsPerKg: category.pointsPerKg,
    averageWeightKg: category.averageWeightKg.toString(),
    isBanned: category.isBanned,
    isHazardous: category.isHazardous,
    isAiDetectable: category.isAiDetectable,
    description: category.description,
    imageUrl: category.imageUrl,
  };
}

export default wasteCategoryRouter;
