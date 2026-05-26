import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle2,
  lucideCircleAlert,
  lucideCoins,
  lucideImage,
  lucideLoaderCircle,
  lucideMapPin,
  lucidePackage,
  lucidePlus,
  lucideScale,
  lucideSparkles,
  lucideUpload,
  lucideX,
} from '@ng-icons/lucide';
import type { Address, AnalyzeImageResponse, WasteCategory } from '@wastegrab/shared';
import { AppHeaderComponent } from '@/ui/header/header.component';
import { PickupRequestService } from '@/services/pickup-request.service';

type NewPickupForm = FormGroup<{
  items: FormArray<PickupItemForm>;
  description: FormControl<string>;
  addressId: FormControl<string>;
  addressText: FormControl<string>;
}>;

type PickupItemForm = FormGroup<{
  categoryId: FormControl<string>;
  estimatedWeight: FormControl<number | null>;
}>;

type PreviewImage = {
  file: File;
  url: string;
};

type AiSuggestion = {
  categoryName: string;
  categoryId: string;
  estimatedWeight: number;
  count: number;
  points: number;
};

type AnalysisSummary = {
  totalItems: number;
  estimatedWeight: number;
  points: number;
};

type AiAutoSnapshot = {
  source: 'roboflow';
  detectedAt: string;
  summary: AnalysisSummary;
  items: Array<{
    categoryId: string;
    categoryName: string;
    detectedCount: number;
    estimatedWeight: number;
    points: number;
  }>;
};

@Component({
  selector: 'app-customer-new-pickup-page',
  templateUrl: './new-pickup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, AppHeaderComponent, NgIcon],
  viewProviders: [
    provideIcons({
      lucideCheckCircle2,
      lucideCircleAlert,
      lucideCoins,
      lucideImage,
      lucideLoaderCircle,
      lucideMapPin,
      lucidePackage,
      lucidePlus,
      lucideScale,
      lucideSparkles,
      lucideUpload,
      lucideX,
    }),
  ],
})
export class CustomerNewPickupPage {
  private readonly http = inject(HttpClient);
  private readonly pickupRequests = inject(PickupRequestService);

  protected readonly wasteCategories = signal<WasteCategory[]>([]);
  protected readonly addresses = signal<Address[]>([]);
  protected readonly images = signal<PreviewImage[]>([]);
  protected readonly isAnalyzing = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly analysisSummary = signal<AnalysisSummary | null>(null);
  protected readonly aiAutoSnapshot = signal<AiAutoSnapshot | null>(null);
  protected readonly submitError = signal('');
  protected readonly submitSuccess = signal('');

  protected readonly maxImages = 5;

  protected readonly form: NewPickupForm = new FormGroup({
    items: new FormArray<PickupItemForm>([this.createPickupItemGroup()]),
    description: new FormControl('', { nonNullable: true }),
    addressId: new FormControl('', { nonNullable: true }),
    addressText: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    void this.loadInitialData();
  }

  protected pickupItems(): PickupItemForm[] {
    return this.form.controls.items.controls;
  }

  protected selectedCategory(item: PickupItemForm): WasteCategory | undefined {
    const categoryId = item.controls.categoryId.value;
    return this.wasteCategories().find((category) => category.id === categoryId);
  }

  protected estimatedValue(): number {
    return this.pickupItems().reduce((total, item) => {
      const category = this.selectedCategory(item);
      const estimatedWeight = Number(item.controls.estimatedWeight.value ?? 0);
      return total + (category ? Number(category.pricePerKg) * estimatedWeight : 0);
    }, 0);
  }

  protected estimatedPoints(): number {
    return this.pickupItems().reduce((total, item) => {
      const category = this.selectedCategory(item);
      const estimatedWeight = Number(item.controls.estimatedWeight.value ?? 0);
      return total + (category ? Math.round(category.pointsPerKg * estimatedWeight) : 0);
    }, 0);
  }

  protected totalWeight(): number {
    return this.pickupItems().reduce(
      (total, item) => total + Number(item.controls.estimatedWeight.value ?? 0),
      0,
    );
  }

  protected selectedItemCount(): number {
    return this.pickupItems().filter((item) => item.controls.categoryId.value).length;
  }

  protected aiAutoPayload(): string {
    const snapshot = this.aiAutoSnapshot();
    return snapshot ? JSON.stringify(snapshot) : '';
  }

  protected addPickupItem(): void {
    this.form.controls.items.push(this.createPickupItemGroup());
  }

  protected removePickupItem(index: number): void {
    if (this.form.controls.items.length === 1) {
      this.form.controls.items.at(0).reset({
        categoryId: '',
        estimatedWeight: null,
      });
      return;
    }

    this.form.controls.items.removeAt(index);
  }

  protected addressLabel(address: Address): string {
    return `${address.label} - ${this.formatAddress(address)}`;
  }

  protected onAddressChanged(): void {
    const address = this.addresses().find(
      (item) => item.id === this.form.controls.addressId.value,
    );

    if (address) {
      this.form.controls.addressText.setValue(this.formatAddress(address));
    }
  }

  protected onFilesSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const remainingSlots = this.maxImages - this.images().length;
    const files = Array.from(input.files).slice(0, Math.max(remainingSlots, 0));
    const next = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    this.images.set([...this.images(), ...next]);
    input.value = '';
    this.submitError.set('');
  }

  protected removeImage(index: number): void {
    const next = [...this.images()];
    const [removed] = next.splice(index, 1);
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }

    this.images.set(next);
  }

  protected clearImages(): void {
    this.images().forEach((image) => URL.revokeObjectURL(image.url));
    this.images.set([]);
    this.analysisSummary.set(null);
    this.aiAutoSnapshot.set(null);
  }

  protected async analyzeImages(): Promise<void> {
    const image = this.images()[0]?.file;
    if (!image) {
      this.submitError.set('Add at least one image before running AI analysis.');
      return;
    }

    this.isAnalyzing.set(true);
    this.submitError.set('');
    this.analysisSummary.set(null);

    try {
      const formData = new FormData();
      formData.append('image', image);

      const response = await firstValueFrom(
        this.http.post<AnalyzeImageResponse>('/api/roboflow-ai/analyze-image', formData),
      );
      const result = response.result;

      if (!result) {
        this.submitError.set('AI analysis did not return a result.');
        return;
      }

      this.analysisSummary.set({
        totalItems: result.totalItems,
        estimatedWeight: result.estimatedWeight,
        points: result.points,
      });

      const categoriesByName = new Map(
        this.wasteCategories().map((category) => [
          this.normalizeCategoryName(category.name),
          category,
        ]),
      );
      const suggestions = result.detectedCategories
        .map((detected): AiSuggestion | null => {
          const category = categoriesByName.get(this.normalizeCategoryName(detected.name));
          if (!category) {
            return null;
          }

          return {
            categoryName: category.name,
            categoryId: category.id,
            estimatedWeight: Math.max(detected.estimatedWeight, Number(category.averageWeightKg)),
            count: detected.count,
            points: detected.points,
          };
        })
        .filter((suggestion): suggestion is AiSuggestion => suggestion !== null);

      this.aiAutoSnapshot.set({
        source: 'roboflow',
        detectedAt: new Date().toISOString(),
        summary: {
          totalItems: result.totalItems,
          estimatedWeight: result.estimatedWeight,
          points: result.points,
        },
        items: suggestions.map((suggestion) => ({
          categoryId: suggestion.categoryId,
          categoryName: suggestion.categoryName,
          detectedCount: suggestion.count,
          estimatedWeight: Number(suggestion.estimatedWeight.toFixed(2)),
          points: suggestion.points,
        })),
      });

      if (suggestions[0]) {
        this.applyAllSuggestions(suggestions);
      } else {
        this.submitError.set('No matching category detected. You can still fill it manually.');
      }
    } catch (err) {
      console.error('AI analysis failed:', err);
      this.submitError.set('AI analysis failed. You can still submit the request manually.');
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  private applyAllSuggestions(suggestions: AiSuggestion[]): void {
    if (!suggestions.length) {
      return;
    }

    this.form.controls.items.clear();
    suggestions.forEach((suggestion) => {
      this.form.controls.items.push(
        this.createPickupItemGroup({
          categoryId: suggestion.categoryId,
          estimatedWeight: Number(suggestion.estimatedWeight.toFixed(2)),
        }),
      );
    });
    this.submitError.set('');
  }

  protected async submit(): Promise<void> {
    this.submitSuccess.set('');
    this.submitError.set('');

    if (!this.images().length) {
      this.submitError.set('Add at least one pickup image.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Complete the required pickup details.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const raw = this.form.getRawValue();
      const items = raw.items
        .filter((item) => item.categoryId && Number(item.estimatedWeight) > 0)
        .map((item) => ({
          categoryId: item.categoryId,
          estimatedWeight: String(item.estimatedWeight),
        }));
      const payload = new FormData();
      payload.append('items', JSON.stringify(items));
      payload.append('addressText', raw.addressText);

      if (this.aiAutoSnapshot()) {
        payload.append('ai_auto', this.aiAutoPayload());
      }

      if (raw.addressId) {
        payload.append('addressId', raw.addressId);
      }

      if (raw.description.trim()) {
        payload.append('notes', raw.description.trim());
      }

      for (const image of this.images()) {
        payload.append('images', image.file);
      }

      const response = await firstValueFrom(this.pickupRequests.createPickupRequest(payload));
      this.submitSuccess.set(`Pickup request ${response.pickupRequest.id.slice(0, 8)} saved.`);
      this.resetForm();
    } catch (err) {
      console.error('Pickup request failed:', err);
      this.submitError.set('Unable to save pickup request.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadInitialData(): Promise<void> {
    await Promise.all([this.loadWasteCategories(), this.loadAddresses()]);
  }

  private async loadWasteCategories(): Promise<void> {
    try {
      const categories = await firstValueFrom(
        this.http.get<WasteCategory[]>('/api/waste-categories'),
      );

      this.wasteCategories.set(categories);
    } catch (err) {
      console.error('Failed to load waste categories:', err);
      this.submitError.set('Unable to load waste categories.');
    }
  }

  private async loadAddresses(): Promise<void> {
    try {
      const addresses = await firstValueFrom(
        this.http.get<Address[]>('/api/customer/address', { withCredentials: true }),
      );

      this.addresses.set(addresses);
      const preferred = addresses.find((address) => address.isDefault) ?? addresses[0];

      if (preferred) {
        this.form.patchValue({
          addressId: preferred.id,
          addressText: this.formatAddress(preferred),
        });
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
    }
  }

  private resetForm(): void {
    this.clearImages();
    this.form.reset({
      description: '',
      addressId: '',
      addressText: '',
    });
    this.form.controls.items.clear();
    this.form.controls.items.push(this.createPickupItemGroup());

    const preferred = this.addresses().find((address) => address.isDefault) ?? this.addresses()[0];
    if (preferred) {
      this.form.patchValue({
        addressId: preferred.id,
        addressText: this.formatAddress(preferred),
      });
    }
  }

  private formatAddress(address: Address): string {
    return (
      address.formattedAddress ||
      [address.street, address.city, address.state, address.postalCode]
        .filter(Boolean)
        .join(', ')
    );
  }

  private normalizeCategoryName(value: string): string {
    return value.trim().toLowerCase();
  }

  private createPickupItemGroup(input?: {
    categoryId?: string;
    estimatedWeight?: number | null;
  }): PickupItemForm {
    return new FormGroup({
      categoryId: new FormControl(input?.categoryId ?? '', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      estimatedWeight: new FormControl<number | null>(input?.estimatedWeight ?? null, {
        validators: [Validators.required, Validators.min(0.01)],
      }),
    });
  }
}
