import { randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import sharp from "sharp";
import type {
  ApiErrorResponse,
  CreateAuthSlideInput,
  UpdateAuthSlideInput,
} from "@wastegrab/shared";
import { prisma } from "../../prisma.js";
import { getCurrentUserFromRequest } from "../../services/auth.service.js";
import { uploadPublicAuthSlide } from "../../services/supabase-storage.service.js";
import { getBody } from "../../utils/request.js";
import { toAuthSlideResponse } from "../auth-slide.routes.js";

const authSlideRouter = Router();
const authSlideImageUpload = multer({
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

authSlideRouter.get("/", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const slides = await prisma.authSlide.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    res.json(slides.map(toAuthSlideResponse));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch auth slides.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

authSlideRouter.post("/upload", requireAdmin, authSlideImageUpload.single("image"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "Missing image file." } as ApiErrorResponse);
    return;
  }

  try {
    const image = await sharp(req.file.buffer)
      .rotate()
      .resize({
        width: 1800,
        height: 1200,
        fit: "cover",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 88 })
      .toBuffer();

    const imageUrl = await uploadPublicAuthSlide(`auth-slides/${randomUUID()}.jpg`, image);

    res.status(201).json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to upload auth slide image.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

authSlideRouter.post("/", requireAdmin, async (req: Request, res: Response) => {
  const input = getBody(req.body) as Partial<CreateAuthSlideInput>;
  const title = normalizeRequiredString(input.title);
  const quote = normalizeRequiredString(input.quote);
  const imageUrl = normalizeRequiredString(input.imageUrl);
  const imageAlt = normalizeRequiredString(input.imageAlt);

  if (!title || !quote || !imageUrl || !imageAlt) {
    res.status(400).json({ error: "Missing required fields: title, quote, imageUrl, imageAlt." } as ApiErrorResponse);
    return;
  }

  try {
    const slide = await prisma.authSlide.create({
      data: {
        title,
        quote,
        imageUrl,
        imageAlt,
        author: normalizeOptionalString(input.author),
        sortOrder: normalizeInteger(input.sortOrder) ?? 0,
        isActive: input.isActive ?? true,
      },
    });

    res.status(201).json(toAuthSlideResponse(slide));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create auth slide.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

authSlideRouter.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  const input = getBody(req.body) as Partial<UpdateAuthSlideInput>;

  try {
    const existing = await prisma.authSlide.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!existing) {
      res.status(404).json({ error: "Auth slide not found." } as ApiErrorResponse);
      return;
    }

    const data: {
      title?: string;
      quote?: string;
      author?: string | null;
      imageUrl?: string;
      imageAlt?: string;
      sortOrder?: number;
      isActive?: boolean;
    } = {};

    if (input.title !== undefined) {
      const title = normalizeRequiredString(input.title);
      if (!title) {
        res.status(400).json({ error: "title is required." } as ApiErrorResponse);
        return;
      }
      data.title = title;
    }

    if (input.quote !== undefined) {
      const quote = normalizeRequiredString(input.quote);
      if (!quote) {
        res.status(400).json({ error: "quote is required." } as ApiErrorResponse);
        return;
      }
      data.quote = quote;
    }

    if (input.imageUrl !== undefined) {
      const imageUrl = normalizeRequiredString(input.imageUrl);
      if (!imageUrl) {
        res.status(400).json({ error: "imageUrl is required." } as ApiErrorResponse);
        return;
      }
      data.imageUrl = imageUrl;
    }

    if (input.imageAlt !== undefined) {
      const imageAlt = normalizeRequiredString(input.imageAlt);
      if (!imageAlt) {
        res.status(400).json({ error: "imageAlt is required." } as ApiErrorResponse);
        return;
      }
      data.imageAlt = imageAlt;
    }

    if (input.author !== undefined) data.author = normalizeOptionalString(input.author);
    if (input.sortOrder !== undefined) data.sortOrder = normalizeInteger(input.sortOrder) ?? 0;
    if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);

    const updated = await prisma.authSlide.update({
      where: { id: existing.id },
      data,
    });

    res.json(toAuthSlideResponse(updated));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update auth slide.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

authSlideRouter.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.authSlide.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!existing) {
      res.status(404).json({ error: "Auth slide not found." } as ApiErrorResponse);
      return;
    }

    await prisma.authSlide.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to delete auth slide.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeInteger(value: unknown): number | undefined {
  const normalized = Number(value);
  return Number.isInteger(normalized) ? normalized : undefined;
}

export default authSlideRouter;
