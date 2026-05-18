export type WasteCategory = {
  id: string;
  name: string;
  pricePerKg: string; // Decimal as string
  pointsPerKg: number;
  isBanned: boolean;
  description: string | null;
};

export type CreateWasteCategoryInput = {
  name: string;
  pricePerKg: string;
  pointsPerKg?: number;
  description?: string;
};

export type UpdateWasteCategoryInput = {
  name?: string;
  pricePerKg?: string;
  pointsPerKg?: number;
  isBanned?: boolean;
  description?: string;
};
