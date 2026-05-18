import type { NextFunction, Request, Response } from "express";
import { getCurrentUserFromRequest } from "../services/auth.service.js";

export async function requireAuthenticatedUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await getCurrentUserFromRequest(req);

  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  next();
}
