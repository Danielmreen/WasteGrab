export enum UserRole {
  CUSTOMER = "CUSTOMER",
  COLLECTOR = "COLLECTOR",
  ADMIN = "ADMIN",
}

import type { Address } from './address.js';

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
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
