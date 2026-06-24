import type { PickupStatus } from '@wastegrab/shared';

export type CustomerQuickAction = {
  label: string;
  route: readonly string[];
  icon: string;
  primary?: boolean;
};

export type CustomerPickupSummary = {
  id: string;
  shortId: string;
  title: string;
  address: string;
  status: PickupStatus;
  statusLabel: string;
  statusClass: string;
  statusIcon: string;
  imageUrl: string | null;
  weightKg: number;
  points: number;
  pointsLabel: string;
  itemCount: number;
  isActive: boolean;
  createdAtLabel: string;
  createdAtFullLabel: string;
  detailRoute: readonly string[];
  statusMessage: string;
};

export type CustomerVoucherSummary = {
  imageUrl?: string | null;
  title: string;
  code: string;
  expiryLabel: string;
  pointsSpent: number;
  route: readonly string[];
};

export type CustomerLeaderboardRow = {
  rank: number;
  name: string;
  avatarUrl: string | null;
  value: string;
  isCurrentUser: boolean;
  route: readonly string[];
};
