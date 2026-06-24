import type { FormArray, FormControl, FormGroup } from '@angular/forms';
import type { Address, WasteCategory } from '@wastegrab/shared';

export type WizardStep = 'images' | 'items' | 'pickup' | 'confirm';

export type StepMeta = {
  id: WizardStep;
  label: string;
  hint: string;
};

export type PreviewImage = {
  file: File;
  url: string;
};

export type PickupItemForm = FormGroup<{
  categoryId: FormControl<string>;
  estimatedWeight: FormControl<number | null>;
}>;

export type NewPickupForm = FormGroup<{
  items: FormArray<PickupItemForm>;
  description: FormControl<string>;
  addressId: FormControl<string>;
  addressText: FormControl<string>;
}>;

export type AiSnapshotItem = {
  categoryId: string;
  categoryName: string;
  detectedCount: number;
  estimatedWeight: number;
  points: number;
};

/** Human-readable single-line address used across the wizard. */
export function formatAddress(address: Address): string {
  return (
    address.formattedAddress ||
    [address.street, address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(', ')
  );
}

/** Resolve the selected category for a pickup-item row. */
export function findCategory(
  categories: readonly WasteCategory[],
  categoryId: string | null | undefined,
): WasteCategory | undefined {
  if (!categoryId) return undefined;
  return categories.find((category) => category.id === categoryId);
}
