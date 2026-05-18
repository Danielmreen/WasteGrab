import { Router, type Request, type Response } from "express";
import type { ApiErrorResponse } from "@wastegrab/shared";
import { getBody } from "../../utils/request.js";
import { getCurrentUserFromRequest } from "../../services/auth.service.js";
import { prisma } from "../../prisma.js";

const locationRouter = Router();

// Middleware to check if user is admin
async function requireAdmin(req: Request, res: Response, next: Function) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden. Admin access required." } as ApiErrorResponse);
    return;
  }
  next();
}

// GET /api/admin/locations - list locations with assigned collectors
locationRouter.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { createdAt: "desc" },
      include: { collectors: { include: { collector: true } } },
    });

    res.json(locations.map(l => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch locations.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

// GET /api/admin/locations/:id - get single location
locationRouter.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const location = await prisma.location.findUnique({
      where: { id: String(req.params.id) },
      include: { collectors: { include: { collector: true } } },
    });

    if (!location) {
      res.status(404).json({ error: "Location not found." } as ApiErrorResponse);
      return;
    }

    res.json({ ...location, createdAt: location.createdAt.toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch location.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

// POST /api/admin/locations - create a location
locationRouter.post("/", requireAdmin, async (req: Request, res: Response) => {
  const body = getBody(req.body);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : undefined;
  const city = typeof body.city === "string" ? body.city.trim() : undefined;
  const state = typeof body.state === "string" ? body.state.trim() : undefined;
  const postalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : undefined;
  const latitude = typeof body.latitude === "number" ? body.latitude : undefined;
  const longitude = typeof body.longitude === "number" ? body.longitude : undefined;

  if (!name) {
    res.status(400).json({ error: "Missing required field: name." } as ApiErrorResponse);
    return;
  }

  try {
    const currentUser = await getCurrentUserFromRequest(req);

    const location = await prisma.location.create({
      data: {
        name,
        address: address ?? null,
        city: city ?? null,
        state: state ?? null,
        postalCode: postalCode ?? null,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        createdBy: currentUser?.id ?? null,
      },
    });

    res.status(201).json({ ...location, createdAt: location.createdAt.toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create location.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

// POST /api/admin/locations/:id/assign - assign a collector to a location
locationRouter.post("/:id/assign", requireAdmin, async (req: Request, res: Response) => {
  const body = getBody(req.body);
  const collectorId = typeof body.collectorId === "string" ? body.collectorId : "";

  if (!collectorId) {
    res.status(400).json({ error: "Missing required field: collectorId." } as ApiErrorResponse);
    return;
  }

  try {
    // Diagnostic logging
    console.debug('[admin:assign] body:', body);
    console.debug('[admin:assign] collectorId:', collectorId);
    // Check location exists
    const location = await prisma.location.findUnique({ where: { id: String(req.params.id) } });
    console.debug('[admin:assign] location:', !!location);
    if (!location) {
      res.status(404).json({ error: "Location not found." } as ApiErrorResponse);
      return;
    }

    // Check user exists and is a collector
    const user = await prisma.user.findUnique({ where: { id: collectorId } });
    console.debug('[admin:assign] user:', user ? { id: user.id, role: user.role } : null);
    if (!user || user.role !== "COLLECTOR") {
      res.status(400).json({ error: "Invalid collector user." } as ApiErrorResponse);
      return;
    }

    const assignment = await prisma.locationCollector.create({
      data: { locationId: location.id, collectorId: collectorId },
    });

    res.status(201).json({ ...assignment, assignedAt: assignment.assignedAt.toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to assign collector.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

// DELETE /api/admin/locations/:id/collectors/:collectorId - unassign
locationRouter.delete("/:id/collectors/:collectorId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.locationCollector.findUnique({
      where: { locationId_collectorId: { locationId: String(req.params.id), collectorId: String(req.params.collectorId) } },
    });

    if (!existing) {
      res.status(404).json({ error: "Assignment not found." } as ApiErrorResponse);
      return;
    }

    await prisma.locationCollector.delete({ where: { id: existing.id } });

    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to remove assignment.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

// PATCH /api/admin/locations/:id - update location
locationRouter.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  const body = getBody(req.body);
  const updateData: any = {};
  if (typeof body.name === 'string') updateData.name = body.name.trim();
  if (typeof body.address === 'string') updateData.address = body.address.trim();
  if (typeof body.city === 'string') updateData.city = body.city.trim();
  if (typeof body.state === 'string') updateData.state = body.state.trim();
  if (typeof body.postalCode === 'string') updateData.postalCode = body.postalCode.trim();
  if (typeof body.latitude === 'number') updateData.latitude = body.latitude;
  if (typeof body.longitude === 'number') updateData.longitude = body.longitude;

  try {
    const existing = await prisma.location.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      res.status(404).json({ error: 'Location not found.' } as ApiErrorResponse);
      return;
    }

    const updated = await prisma.location.update({
      where: { id: existing.id },
      data: updateData,
      include: { collectors: { include: { collector: true } } },
    });

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      collectors: updated.collectors.map(c => ({
        ...c,
        assignedAt: c.assignedAt.toISOString(),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to update location.';
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

// DELETE /api/admin/locations/:id - delete location
locationRouter.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const existing = await prisma.location.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      res.status(404).json({ error: 'Location not found.' } as ApiErrorResponse);
      return;
    }

    await prisma.location.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to delete location.';
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

export default locationRouter;
