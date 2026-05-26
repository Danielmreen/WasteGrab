import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideArrowRight,
  lucideCheckCircle2,
  lucideCircleAlert,
  lucideCoins,
  lucideImage,
  lucideListChecks,
  lucideLoaderCircle,
  lucideMapPin,
  lucidePackage,
  lucidePlus,
  lucideRotateCcw,
  lucideScale,
  lucideSparkles,
  lucideUpload,
  lucideX,
} from '@ng-icons/lucide';
import { PickupStatus, type Address, type AnalyzeImageResponse, type WasteCategory } from '@wastegrab/shared';
import { AppHeaderComponent } from '@/ui/header/header.component';
import { PickupRequestService } from '@/services/pickup-request.service';
import { ZardDialogService } from '@/ui/zard/dialog/dialog.service';

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

type WizardStep = 'images' | 'items' | 'pickup' | 'confirm';

type StepMeta = {
  id: WizardStep;
  label: string;
  icon: string;
};

@Component({
  selector: 'app-customer-new-pickup-page',
  templateUrl: './new-pickup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, AppHeaderComponent, NgIcon],
  viewProviders: [
    provideIcons({
      lucideArrowLeft,
      lucideArrowRight,
      lucideCheckCircle2,
      lucideCircleAlert,
      lucideCoins,
      lucideImage,
      lucideListChecks,
      lucideLoaderCircle,
      lucideMapPin,
      lucidePackage,
      lucidePlus,
      lucideRotateCcw,
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
  private readonly dialogService = inject(ZardDialogService);
  private readonly router = inject(Router);

  protected readonly wasteCategories = signal<WasteCategory[]>([]);
  protected readonly addresses = signal<Address[]>([]);
  protected readonly images = signal<PreviewImage[]>([]);
  protected readonly isAnalyzing = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly analysisSummary = signal<AnalysisSummary | null>(null);
  protected readonly aiAutoSnapshot = signal<AiAutoSnapshot | null>(null);
  protected readonly submitError = signal('');
  protected readonly submitSuccess = signal('');
  protected readonly hasActivePickupRequest = signal(false);
  protected readonly currentStep = signal<WizardStep>('images');

  protected readonly maxImages = 5;
  protected readonly steps: StepMeta[] = [
    { id: 'images', label: 'Images', icon: 'lucideImage' },
    { id: 'items', label: 'Waste', icon: 'lucideListChecks' },
    { id: 'pickup', label: 'Pickup', icon: 'lucideMapPin' },
    { id: 'confirm', label: 'Confirm', icon: 'lucideCheckCircle2' },
  ];

  protected readonly form: NewPickupForm = new FormGroup({
    items: new FormArray<PickupItemForm>([this.createPickupItemGroup()]),
    description: new FormControl('', { nonNullable: true }),
    addressId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    addressText: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    void this.loadInitialData();
  }

  protected pickupItems(): PickupItemForm[] {
    return this.form.controls.items.controls;
  }

  protected canCreateRequest(): boolean {
    return !this.hasActivePickupRequest();
  }

  protected isStepActive(step: WizardStep): boolean {
    return this.currentStep() === step;
  }

  protected isStepComplete(step: WizardStep): boolean {
    return this.stepIndex(step) < this.currentStepIndex();
  }

  protected currentStepIndex(): number {
    return this.stepIndex(this.currentStep());
  }

  protected canGoBack(): boolean {
    return this.currentStepIndex() > 0 && !this.isAnalyzing() && !this.isSubmitting();
  }

  protected canGoNext(): boolean {
    return (
      this.currentStepIndex() < this.steps.length - 1 &&
      this.canLeaveStep(this.currentStep()) &&
      !this.isAnalyzing() &&
      !this.isSubmitting()
    );
  }

  protected nextStep(): void {
    if (!this.canGoNext()) {
      this.markCurrentStepTouched();
      return;
    }

    this.currentStep.set(this.steps[this.currentStepIndex() + 1].id);
    this.submitError.set('');
  }

  protected previousStep(): void {
    if (!this.canGoBack()) {
      return;
    }

    this.currentStep.set(this.steps[this.currentStepIndex() - 1].id);
    this.submitError.set('');
  }

  protected goToStep(step: WizardStep): void {
    const targetIndex = this.stepIndex(step);
    if (targetIndex <= this.currentStepIndex() || this.canReachStep(step)) {
      this.currentStep.set(step);
      this.submitError.set('');
    }
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

  protected hasAiSuggestions(): boolean {
    return Boolean(this.aiAutoSnapshot()?.items.length);
  }

  protected isUnmodifiedAiSuggestion(index: number, item: PickupItemForm): boolean {
    const suggestion = this.aiAutoSnapshot()?.items[index];
    if (!suggestion) {
      return false;
    }

    return (
      item.controls.categoryId.value === suggestion.categoryId &&
      this.roundWeight(item.controls.estimatedWeight.value) === this.roundWeight(suggestion.estimatedWeight)
    );
  }

  protected addPickupItem(): void {
    this.form.controls.items.push(this.createPickupItemGroup());
  }

  protected resetToAiSuggestions(): void {
    const snapshot = this.aiAutoSnapshot();
    if (!snapshot?.items.length) {
      return;
    }

    this.form.controls.items.clear();
    snapshot.items.forEach((item) => {
      this.form.controls.items.push(
        this.createPickupItemGroup({
          categoryId: item.categoryId,
          estimatedWeight: item.estimatedWeight,
        }),
      );
    });
    this.submitError.set('');
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
      return;
    }

    this.form.controls.addressText.setValue('');
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
    if (this.currentStep() === 'images') {
      this.analysisSummary.set(null);
      this.aiAutoSnapshot.set(null);
    }
  }

  protected removeImage(index: number): void {
    const next = [...this.images()];
    const [removed] = next.splice(index, 1);
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }

    this.images.set(next);
    if (!next.length) {
      this.currentStep.set('images');
    }
  }

  protected clearImages(): void {
    this.images().forEach((image) => URL.revokeObjectURL(image.url));
    this.images.set([]);
    this.analysisSummary.set(null);
    this.aiAutoSnapshot.set(null);
    this.currentStep.set('images');
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
        this.handleEmptyAiResult();
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
        this.currentStep.set('items');
        this.showAiDetectionDialog(suggestions);
      } else {
        this.handleEmptyAiResult();
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

  private handleEmptyAiResult(): void {
    this.aiAutoSnapshot.set({
      source: 'roboflow',
      detectedAt: new Date().toISOString(),
      summary: {
        totalItems: 0,
        estimatedWeight: 0,
        points: 0,
      },
      items: [],
    });
    this.analysisSummary.set({
      totalItems: 0,
      estimatedWeight: 0,
      points: 0,
    });
    this.submitError.set('');
    this.currentStep.set('items');
    this.showNoDetectionDialog();
  }

  private showNoDetectionDialog(): void {
    this.dialogService.create({
      zTitle: 'None detected',
      zDescription:
        'AI could not match any waste category from the uploaded image. You can continue by adding the waste items manually.',
      zContent:
        '<div class="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">Start with the Add button, choose the category, then enter the estimated weight.</div>',
      zOkText: 'Proceed',
      zCancelText: null,
      zWidth: 'max-w-md',
      zOnOk: () => {
        this.currentStep.set('items');
      },
    });
  }

  private showAiDetectionDialog(suggestions: AiSuggestion[]): void {
    const totalDetected = suggestions.reduce((total, suggestion) => total + suggestion.count, 0);
    const rows = suggestions
      .map(
        (suggestion) => `
          <div class="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
            <div>
              <div class="font-medium text-foreground">${this.escapeHtml(suggestion.categoryName)}</div>
              <div class="text-xs text-muted-foreground">${suggestion.count} detected</div>
            </div>
            <div class="text-right text-xs text-muted-foreground">
              <div>${Number(suggestion.estimatedWeight.toFixed(2))} kg</div>
              <div>${suggestion.points} pts</div>
            </div>
          </div>
        `,
      )
      .join('');

    this.dialogService.create({
      zTitle: 'Waste detected',
      zDescription: `AI found ${totalDetected} item${totalDetected === 1 ? '' : 's'} across ${suggestions.length} categor${suggestions.length === 1 ? 'y' : 'ies'}.`,
      zContent: `<div class="grid gap-2 text-sm">${rows}</div>`,
      zOkText: 'Review Items',
      zCancelText: null,
      zWidth: 'max-w-md',
      zOnOk: () => {
        this.currentStep.set('items');
      },
    });
  }

  protected async submit(): Promise<void> {
    this.submitSuccess.set('');
    this.submitError.set('');

    if (this.hasActivePickupRequest()) {
      this.showActivePickupDialog();
      return;
    }

    if (!this.images().length) {
      this.currentStep.set('images');
      this.submitError.set('Add at least one pickup image.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.currentStep.set(this.firstInvalidStep());
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
      payload.append('addressId', raw.addressId);

      if (this.aiAutoSnapshot()) {
        payload.append('ai_auto', this.aiAutoPayload());
      }

      if (raw.description.trim()) {
        payload.append('notes', raw.description.trim());
      }

      for (const image of this.images()) {
        payload.append('images', image.file);
      }

      const response = await firstValueFrom(this.pickupRequests.createPickupRequest(payload));
      this.showPickupRequestSuccessDialog(response.pickupRequest.id);
    } catch (err) {
      console.error('Pickup request failed:', err);
      this.submitError.set('Unable to save pickup request.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private showPickupRequestSuccessDialog(pickupRequestId: string): void {
    this.dialogService.create({
      zTitle: 'Pickup request created',
      zDescription: `Request ${pickupRequestId.slice(0, 8)} has been saved and is now pending review.`,
      zContent:
        '<div class="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">You can track the request status from My Requests.</div>',
      zOkText: 'View My Requests',
      zCancelText: null,
      zWidth: 'max-w-md',
      zOnOk: () => {
        this.resetForm();
        void this.router.navigate(['/customer', 'my-requests']);
      },
    });
  }

  private async loadInitialData(): Promise<void> {
    await Promise.all([this.loadWasteCategories(), this.loadAddresses(), this.loadActivePickupState()]);
  }

  private async loadActivePickupState(): Promise<void> {
    try {
      const response = await firstValueFrom(this.pickupRequests.listPickupRequests());
      const hasActive = response.pickupRequests.some(
        (request) => request.status !== PickupStatus.COMPLETED && request.status !== PickupStatus.CANCELLED,
      );
      this.hasActivePickupRequest.set(hasActive);

      if (hasActive) {
        this.showActivePickupDialog();
      }
    } catch (err) {
      console.error('Failed to check active pickup request:', err);
    }
  }

  private showActivePickupDialog(): void {
    this.dialogService.create({
      zTitle: 'Active request already exists',
      zDescription:
        'You can only have one pickup request active at a time. Please wait until your current request is completed or cancelled.',
      zContent:
        '<div class="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">Open My Requests to track the current pickup status.</div>',
      zOkText: 'View My Requests',
      zCancelText: null,
      zWidth: 'max-w-md',
      zOnOk: () => {
        void this.router.navigate(['/customer', 'my-requests']);
      },
    });
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
    this.currentStep.set('images');

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

  private roundWeight(value: number | null): number {
    return Number(Number(value ?? 0).toFixed(2));
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  private stepIndex(step: WizardStep): number {
    return this.steps.findIndex((item) => item.id === step);
  }

  private canReachStep(step: WizardStep): boolean {
    return this.steps.slice(0, this.stepIndex(step)).every((item) => this.canLeaveStep(item.id));
  }

  private canLeaveStep(step: WizardStep): boolean {
    switch (step) {
      case 'images':
        return this.images().length > 0;
      case 'items':
        return this.validPickupItems().length > 0;
      case 'pickup':
        return this.form.controls.addressId.valid && this.form.controls.addressText.valid;
      case 'confirm':
        return this.images().length > 0 && this.form.valid;
    }
  }

  private firstInvalidStep(): WizardStep {
    if (!this.images().length) {
      return 'images';
    }

    if (!this.validPickupItems().length) {
      return 'items';
    }

    if (this.form.controls.addressId.invalid || this.form.controls.addressText.invalid) {
      return 'pickup';
    }

    return 'confirm';
  }

  private markCurrentStepTouched(): void {
    if (this.currentStep() === 'items') {
      this.form.controls.items.markAllAsTouched();
    }

    if (this.currentStep() === 'pickup') {
      this.form.controls.addressId.markAsTouched();
      this.form.controls.addressText.markAsTouched();
    }
  }

  private validPickupItems(): Array<{ categoryId: string; estimatedWeight: number }> {
    return this.form
      .getRawValue()
      .items.filter((item) => item.categoryId && Number(item.estimatedWeight) > 0)
      .map((item) => ({
        categoryId: item.categoryId,
        estimatedWeight: Number(item.estimatedWeight),
      }));
  }
}
