export type WasteCategory = {
  id: string;
  name: string;
  pointsPerKg: number;
  averageWeightKg: string; // Decimal as string
  isBanned: boolean;
  isHazardous: boolean;
  isAiDetectable: boolean;
  description: string | null;
  imageUrl: string | null;
};

export type CreateWasteCategoryInput = {
  name: string;
  pointsPerKg?: number;
  averageWeightKg?: string;
  isBanned?: boolean;
  isHazardous?: boolean;
  isAiDetectable?: boolean;
  description?: string;
  imageUrl?: string | null;
};

export type UpdateWasteCategoryInput = {
  name?: string;
  pointsPerKg?: number;
  averageWeightKg?: string;
  isBanned?: boolean;
  isHazardous?: boolean;
  isAiDetectable?: boolean;
  description?: string;
  imageUrl?: string | null;
};
