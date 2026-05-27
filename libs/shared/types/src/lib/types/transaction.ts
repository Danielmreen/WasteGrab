export enum PointLedgerType {
  PICKUP_EARNED = "PICKUP_EARNED",
  VOUCHER_REDEEMED = "VOUCHER_REDEEMED",
  ADMIN_ADJUSTMENT = "ADMIN_ADJUSTMENT",
  EXPIRED = "EXPIRED",
  REVERSAL = "REVERSAL",
}

export enum PointLedgerStatus {
  PENDING = "PENDING",
  POSTED = "POSTED",
  REVERSED = "REVERSED",
}

export enum VoucherStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  EXPIRED = "EXPIRED",
}

export enum VoucherRedemptionStatus {
  RESERVED = "RESERVED",
  REDEEMED = "REDEEMED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export type PointLedger = {
  id: string;
  userId: string;
  pickupRequestId: string | null;
  voucherId: string | null;
  redemptionId: string | null;
  type: PointLedgerType;
  status: PointLedgerStatus;
  points: number;
  balanceAfter: number;
  description: string | null;
  metadata: unknown;
  createdAt: string;
};

export type Voucher = {
  id: string;
  title: string;
  description: string | null;
  pointsCost: number;
  code: string | null;
  stock: number | null;
  status: VoucherStatus;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type CreateVoucherInput = {
  title: string;
  description?: string | null;
  pointsCost: number;
  code?: string | null;
  stock?: number | null;
  status?: VoucherStatus;
  startsAt?: string | null;
  expiresAt?: string | null;
};

export type UpdateVoucherInput = Partial<CreateVoucherInput>;

export type VoucherRedemption = {
  id: string;
  userId: string;
  voucherId: string;
  pointsSpent: number;
  status: VoucherRedemptionStatus;
  redeemedCode: string | null;
  redeemedAt: string;
  cancelledAt: string | null;
};

export type CustomerVoucherCatalogItem = Voucher & {
  canRedeem: boolean;
  unavailableReason: string | null;
  redemptionCount: number;
};

export type CustomerVoucherRedemption = VoucherRedemption & {
  voucher: Voucher;
};

export type CustomerVoucherListResponse = {
  pointsBalance: number;
  vouchers: CustomerVoucherCatalogItem[];
};

export type CustomerVoucherRedemptionsResponse = {
  redemptions: CustomerVoucherRedemption[];
};

export type RedeemVoucherResponse = {
  pointsBalance: number;
  redemption: CustomerVoucherRedemption;
};

export type AdminVoucherRedemptionLog = VoucherRedemption & {
  userName: string;
  userEmail: string;
  voucherTitle: string;
};

export type AdminPointLedgerLog = PointLedger & {
  userName: string;
  userEmail: string;
  voucherTitle: string | null;
};

export type RewardSummary = {
  completedWeightKg: string;
  pointsBalance: number;
};

export type RewardSummaryResponse = {
  summary: RewardSummary;
};
