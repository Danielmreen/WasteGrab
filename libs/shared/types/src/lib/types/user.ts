export enum UserRole {
  CUSTOMER = "CUSTOMER",
  COLLECTOR = "COLLECTOR",
  ADMIN = "ADMIN",
}

import type { Address } from './address';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
  address?: Address[];
};

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
};

export type UpdateUserInput = {
  name?: string;
  phone?: string;
  role?: UserRole;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: User;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordInput = {
  email: string;
  password: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type UpdateProfileInput = {
  name?: string;
  email?: string;
  phone?: string;
};

export type UpdateProfileResponse = AuthResponse;

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResponse = AuthResponse;
