import { Router, type Request, type Response } from "express";
import type { ApiErrorResponse, User, CreateUserInput, UpdateUserInput } from "@wastegrab/shared";
import { getBody } from "../utils/request.js";
import { getCurrentUserFromRequest } from "../services/auth.service.js";
import { prisma } from "../prisma.js";

const userRouter = Router();

// Middleware to check if user is admin
async function requireAdmin(req: Request, res: Response, next: Function) {
  const user = await getCurrentUserFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    res.status(403).json({ error: "Forbidden. Admin access required." } as ApiErrorResponse);
    return;
  }
  next();
}

// GET /api/users - List all users
userRouter.get("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(users.map(toUserResponse));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch users.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

// GET /api/users/:id - Get user by ID
userRouter.get("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!user) {
      res.status(404).json({ error: "User not found." } as ApiErrorResponse);
      return;
    }

    res.json(toUserResponse(user));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to fetch user.";
    res.status(500).json({ error: message } as ApiErrorResponse);
  }
});

// POST /api/users - Create new user
userRouter.post("/", requireAdmin, async (req: Request, res: Response) => {
  const body = getBody(req.body) as Partial<CreateUserInput>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const role = body.role || "CUSTOMER";

  if (!name || !email || !password) {
    res.status(400).json({ error: "Missing required fields: name, email, password." } as ApiErrorResponse);
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: "Email already in use." } as ApiErrorResponse);
      return;
    }

    // Import crypto for hashing
    const { scryptSync } = await import("crypto");
    const passwordHash = scryptSync(password, "wastegrab", 64).toString("hex");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone || null,
        role,
      },
    });

    res.status(201).json(toUserResponse(user));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create user.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

// PATCH /api/users/:id - Update user
userRouter.patch("/:id", requireAdmin, async (req: Request, res: Response) => {
  const body = getBody(req.body) as Partial<UpdateUserInput>;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!existingUser) {
      res.status(404).json({ error: "User not found." } as ApiErrorResponse);
      return;
    }

    const updateData: any = {};
    if (body.name) updateData.name = body.name.trim();
    if (body.phone !== undefined) updateData.phone = body.phone ? body.phone.trim() : null;
    if (body.role) updateData.role = body.role;

    const user = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: updateData,
    });

    res.json(toUserResponse(user));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update user.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

// DELETE /api/users/:id - Delete user
userRouter.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!existingUser) {
      res.status(404).json({ error: "User not found." } as ApiErrorResponse);
      return;
    }

    // Prevent deleting the requesting admin if they're the only admin
    const requestingUser = await getCurrentUserFromRequest(req);
    if (requestingUser?.id === String(req.params.id) && existingUser.role === "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });
      if (adminCount === 1) {
        res.status(400).json({ error: "Cannot delete the last admin user." } as ApiErrorResponse);
        return;
      }
    }

    await prisma.user.delete({
      where: { id: String(req.params.id) },
    });

    res.status(204).send();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to delete user.";
    res.status(400).json({ error: message } as ApiErrorResponse);
  }
});

function toUserResponse(user: any): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export default userRouter;
