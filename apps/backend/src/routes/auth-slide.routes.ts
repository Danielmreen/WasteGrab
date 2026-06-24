import { Router, type Request, type Response } from "express";
import type { ApiErrorResponse, PublicAuthSlidesResponse } from "@wastegrab/shared";
import { prisma } from "../prisma.js";

const authSlideRouter = Router();

authSlideRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const slides = await prisma.authSlide.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    res.json({ slides: slides.map(toAuthSlideResponse) } satisfies PublicAuthSlidesResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch auth slides.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

function toAuthSlideResponse(slide: {
  id: string;
  title: string;
  quote: string;
  author: string | null;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: slide.id,
    title: slide.title,
    quote: slide.quote,
    author: slide.author,
    imageUrl: slide.imageUrl,
    imageAlt: slide.imageAlt,
    sortOrder: slide.sortOrder,
    isActive: slide.isActive,
    createdAt: slide.createdAt.toISOString(),
    updatedAt: slide.updatedAt.toISOString(),
  };
}

export { toAuthSlideResponse };
export default authSlideRouter;
