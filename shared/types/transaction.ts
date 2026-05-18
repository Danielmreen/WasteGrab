export enum TransactionType {
  PAYMENT = "PAYMENT",
  POINTS_REDEEMED = "POINTS_REDEEMED",
}

export enum TransactionStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  PENDING = "PENDING",
}

export type Transaction = {
  id: string;
  pickupRequestId: string;
  userId: string;
  amount: string; // Decimal as string
  type: TransactionType;
  status: TransactionStatus;
  createdAt: string;
};
