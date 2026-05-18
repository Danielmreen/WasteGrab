import { Router, type Request, type Response } from "express";
import type {
  ApiErrorResponse,
  AuthResponse,
  CreateUserInput,
  LoginInput,
} from "@wastegrab/shared";
import {
  changePassword,
  clearAuthCookie,
  createAuthCookie,
  getCurrentUserFromRequest,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  updateProfile,
} from "../services/auth.service.js";
import { getBody } from "../utils/request.js";

const authRouter = Router();

authRouter.get("/me", async (req: Request, res: Response) => {
  const user = await getCurrentUserFromRequest(req);

  if (!user) {
    const payload: ApiErrorResponse = { error: "Not authenticated." };
    res.status(401).json(payload);
    return;
  }

  const payload: AuthResponse = { user };
  res.json(payload);
});

authRouter.post("/register", async (req: Request, res: Response) => {
  const body = getBody(req.body) as Partial<CreateUserInput>;
  const name = normalizeText(body.name);
  const email = normalizeEmail(body.email);
  const password = normalizeText(body.password);

  if (!name) {
    res.status(400).json({ error: "Name is required." });
    return;
  }

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "A valid email is required." });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  try {
    const session = await registerUser({
      name,
      email,
      password,
      phone: normalizeOptionalText(body.phone),
    });

    res.setHeader("Set-Cookie", createAuthCookie(session.token));
    const payload: AuthResponse = { user: session.user };
    res.status(201).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register.";
    const statusCode = message === "Email already in use." ? 409 : 400;
    res.status(statusCode).json({ error: message });
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const body = getBody(req.body) as Partial<LoginInput>;
  const email = normalizeEmail(body.email);
  const password = normalizeText(body.password);

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "A valid email is required." });
    return;
  }

  if (!password) {
    res.status(400).json({ error: "Password is required." });
    return;
  }

  try {
    const session = await loginUser({ email, password });

    res.setHeader("Set-Cookie", createAuthCookie(session.token));
    const payload: AuthResponse = { user: session.user };
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to login.";
    res.status(401).json({ error: message });
  }
});

authRouter.post("/logout", (req: Request, res: Response) => {
  res.setHeader("Set-Cookie", clearAuthCookie());
  res.status(204).send();
});

authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  const body = getBody(req.body) as Partial<{ email: string }>;
  const email = normalizeEmail(body.email);

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "A valid email is required." });
    return;
  }

  try {
    await requestPasswordReset(email);
    res.status(200).json({ message: "Password reset link has been sent to your email." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to request password reset.";
    res.status(400).json({ error: message });
  }
});

authRouter.post("/reset-password", async (req: Request, res: Response) => {
  const body = getBody(req.body);
  const email = normalizeText(body.email);
  const password = normalizeText(body.password);

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "A valid email is required." });
    return;
  }

  if (!password || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  try {
    await resetPassword(email, password);
    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reset password.";
    res.status(400).json({ error: message });
  }
});

authRouter.patch("/profile", async (req: Request, res: Response) => {
  const user = await getCurrentUserFromRequest(req);

  if (!user) {
    const payload: ApiErrorResponse = { error: "Not authenticated." };
    res.status(401).json(payload);
    return;
  }

  const body = getBody(req.body) as Partial<{ name?: string; email?: string; phone?: string }>;

  try {
    const updatedUser = await updateProfile(user.id, {
      name: body.name,
      email: body.email,
      phone: body.phone,
    });

    const payload: AuthResponse = { user: updatedUser };
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update profile.";
    const statusCode = message === "Email already in use." ? 409 : 400;
    res.status(statusCode).json({ error: message });
  }
});

authRouter.post("/change-password", async (req: Request, res: Response) => {
  const user = await getCurrentUserFromRequest(req);

  if (!user) {
    const payload: ApiErrorResponse = { error: "Not authenticated." };
    res.status(401).json(payload);
    return;
  }

  const body = getBody(req.body) as Partial<{
    currentPassword?: string;
    newPassword?: string;
  }>;
  const currentPassword = normalizeText(body.currentPassword);
  const newPassword = normalizeText(body.newPassword);

  if (!currentPassword) {
    res.status(400).json({ error: "Current password is required." });
    return;
  }

  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters." });
    return;
  }

  try {
    const updatedUser = await changePassword(user.id, currentPassword, newPassword);
    const payload: AuthResponse = { user: updatedUser };
    res.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to change password.";
    const statusCode = message === "Current password is incorrect." ? 401 : 400;
    res.status(statusCode).json({ error: message });
  }
});

export default authRouter;

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue || undefined;
}
