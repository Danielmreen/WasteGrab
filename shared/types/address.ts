export type Address = {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
};

export type CreateAddressInput = {
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  notes?: string;
};

export type UpdateAddressInput = Partial<CreateAddressInput & { isDefault?: boolean }>;
