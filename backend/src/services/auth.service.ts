import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import type { Request } from "express";
import type {
  AuthResponse,
  CreateUserInput,
  LoginInput,
  UserRole,
  User,
} from "@wastegrab/shared";
import type { UserModel as UserRecord } from "../generated/prisma/models/User.js";
import { config } from "../config.js";
import { prisma } from "../prisma.js";

const authCookieName = "wastegrab_auth";
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 7;

type AuthSession = AuthResponse & {
  token: string;
};

export async function registerUser(input: CreateUserInput): Promise<AuthSession> {
  const email = normalizeEmail(input.email);
  const name = normalizeName(input.name);
  const password = normalizePassword(input.password);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("Email already in use.");
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      phone: normalizeOptionalText(input.phone),
    },
  });

  return {
    user: toUserResponse(user),
    token: createSessionToken(user.id),
  };
}

export async function loginUser(input: LoginInput): Promise<AuthSession> {
  const email = normalizeEmail(input.email);
  const password = normalizePassword(input.password);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  return {
    user: toUserResponse(user),
    token: createSessionToken(user.id),
  };
}

export async function getCurrentUserFromRequest(
  request: Request,
): Promise<User | null> {
  const token = getCookieValue(request.headers.cookie, authCookieName);

  if (!token) {
    return null;
  }

  const userId = verifySessionToken(token);

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return null;
  }

  return toUserResponse(user);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("Email not found.");
  }

  // In a real app, you would send a reset email here.
}

export async function resetPassword(email: string, newPassword: string): Promise<AuthSession> {
  const normalizedEmail = normalizeEmail(email);
  const password = normalizePassword(newPassword);

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  // Update password
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(password),
    },
  });

  return {
    user: toUserResponse(updatedUser),
    token: createSessionToken(updatedUser.id),
  };
}

export async function updateProfile(
  userId: string,
  updates: { name?: string; email?: string; phone?: string },
): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const data: any = {};

  if (updates.name) {
    data.name = normalizeName(updates.name);
  }

  if (updates.email) {
    const normalizedEmail = normalizeEmail(updates.email);
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new Error("Email already in use.");
    }

    data.email = normalizedEmail;
  }

  if (updates.phone !== undefined) {
    data.phone = normalizeOptionalText(updates.phone);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return toUserResponse(updatedUser);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const normalizedCurrent = normalizePassword(currentPassword);
  const normalizedNew = normalizePassword(newPassword);

  if (!verifyPassword(normalizedCurrent, user.passwordHash)) {
    throw new Error("Current password is incorrect.");
  }

  if (normalizedNew.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashPassword(normalizedNew),
    },
  });

  return toUserResponse(updatedUser);
}

export function createAuthCookie(token: string): string {
  return serializeCookie(authCookieName, token, sessionLifetimeMs);
}

export function clearAuthCookie(): string {
  return serializeCookie(authCookieName, "", 0);
}

function createSessionToken(userId: string): string {
  const payload = JSON.stringify({
    userId,
    expiresAt: Date.now() + sessionLifetimeMs,
  });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", config.authSecret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string): string | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", config.authSecret)
    .update(encodedPayload)
    .digest("base64url");

  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as { userId?: string; expiresAt?: number };

    if (
      typeof payload.userId !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, hash] = passwordHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, 64) as Buffer;
  const hashBuffer = Buffer.from(hash, "hex");

  return (
    derivedKey.length === hashBuffer.length &&
    timingSafeEqual(derivedKey, hashBuffer)
  );
}

function serializeCookie(name: string, value: string, maxAgeMs: number): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];

  if (config.isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function getCookieValue(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");

    if (rawName === name) {
      return rawValueParts.join("=");
    }
  }

  return null;
}

function toUserResponse(user: UserRecord): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role as UserRole,
    createdAt: user.createdAt.toISOString(),
  };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeName(value: string): string {
  return value.trim();
}

function normalizePassword(value: string): string {
  return value.trim();
}

function normalizeOptionalText(value?: string): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
}