export enum PickupStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  ARRIVED = "ARRIVED",
  VERIFIED = "VERIFIED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum ImageType {
  USER_UPLOAD = "USER_UPLOAD",
  COLLECTOR_PROOF = "COLLECTOR_PROOF",
}

export type PickupRequest = {
  id: string;
  userId: string;
  collectorId: string | null;
  addressText: string;
  status: PickupStatus;
  notes: string | null;
  aiClassificationLabel: string | null;
  aiConfidence: string | null; // Decimal as string
  aiSuggestedPayload: unknown | null;
  estimatedPrice: string | null; // Decimal as string
  finalPrice: string | null; // Decimal as string
  createdAt: string;
  completedAt: string | null;
};

export type PickupItem = {
  id: string;
  pickupRequestId: string;
  categoryId: string;
  estimatedWeight: string | null; // Decimal as string
  actualWeight: string | null; // Decimal as string
};

export type PickupImage = {
  id: string;
  pickupRequestId: string;
  imageUrl: string;
  imageType: ImageType;
  uploadedAt: string;
};

export type CreatePickupRequestInput = {
  addressId?: string;
  addressText: string;
  notes?: string;
  aiAuto?: unknown;
  ai_auto?: unknown;
  items: Array<{
    categoryId: string;
    estimatedWeight?: string;
  }>;
  images?: string[]; // image URLs
};

export type PickupRequestWithDetails = PickupRequest & {
  items: PickupItem[];
  images: PickupImage[];
};

export type CreatePickupRequestResponse = {
  pickupRequest: PickupRequestWithDetails;
};

export type UpdatePickupRequestInput = {
  status?: PickupStatus;
  collectorId?: string;
  aiClassificationLabel?: string;
  aiConfidence?: string;
  estimatedPrice?: string;
  finalPrice?: string;
};
