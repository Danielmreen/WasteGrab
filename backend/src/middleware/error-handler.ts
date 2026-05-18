import type { NextFunction, Request, Response } from "express";
import type { ApiErrorResponse } from "@wastegrab/shared";

export function notFoundHandler(req: Request, res: Response): void {
  const payload: ApiErrorResponse = { error: "Route not found." };
  res.status(404).json(payload);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (err instanceof SyntaxError && isObject(err) && "body" in err) {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }

  if (isPrismaNotFoundError(err)) {
    const payload: ApiErrorResponse = { error: "Resource not found." };
    res.status(404).json(payload);
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}

function isPrismaNotFoundError(error: unknown): boolean {
  return isObject(error) && error.code === "P2025";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
