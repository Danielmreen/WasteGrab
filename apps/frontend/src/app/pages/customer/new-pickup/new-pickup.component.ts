import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideArrowRight,
  lucideCheckCircle2,
  lucideCircleAlert,
  lucideInfo,
  lucideLoaderCircle,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import {
  PickupStatus,
  type Address,
  type AnalyzeImageResult,
  type DetectedWasteCategory,
  type WasteCategory,
} from '@wastegrab/shared';
import { driver, type Driver } from 'driver.js';
import { ROUTE_PATHS } from '@/app.routes';
import { AppHeaderComponent } from '@/ui/header/header.component';
import { PickupRequestService } from '@/services/pickup-request.service';
import { AuthService } from '@/services/auth.service';
import { ResponsiveDialogService } from '@/services/responsive-dialog.service';
import { ZardSheetService } from '@/ui/zard/sheet/sheet.service';
import type { ZardSheetRef } from '@/ui/zard/sheet/sheet-ref';
import { AiAnalysisService } from '@/services/ai-analysis.service';
import { AddressService } from '@/services/address.service';
import { WasteCategoryService } from '@/services/waste-category.service';
import { ConfirmStepComponent } from './_components/confirm-step.component';
import { ImagesStepComponent } from './_components/images-step.component';
import { ItemsStepComponent } from './_components/items-step.component';
import { NewPickupStepperComponent } from './_components/new-pickup-stepper.component';
import { PickupStepComponent } from './_components/pickup-step.component';
import { PickupSummaryComponent } from './_components/pickup-summary.component';
import type {
  AiSnapshotItem,
  NewPickupForm,
  PickupItemForm,
  PreviewImage,
  StepMeta,
  WizardStep,
} from './_components/new-pickup.models';
import { findCategory, formatAddress } from './_components/new-pickup.models';

const NEW_PICKUP_TOUR_KEY = 'wastegrab-new-pickup-tour-complete';

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
  items: AiSnapshotItem[];
};

@Component({
  selector: 'app-customer-new-pickup-page',
  templateUrl: './new-pickup.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AppHeaderComponent,
    NgIcon,
    ConfirmStepComponent,
    ImagesStepComponent,
    ItemsStepComponent,
    NewPickupStepperComponent,
    PickupStepComponent,
    PickupSummaryComponent,
  ],
  viewProviders: [
    provideIcons({
      lucideArrowLeft,
      lucideArrowRight,
      lucideCheckCircle2,
      lucideCircleAlert,
      lucideInfo,
      lucideLoaderCircle,
      lucideTriangleAlert,
    }),
  ],
})
export class CustomerNewPickupPage implements AfterViewInit, OnDestroy {
  private readonly pickupRequests = inject(PickupRequestService);
  private readonly authService = inject(AuthService);
  private readonly dialogService = inject(ResponsiveDialogService);
  private readonly sheetService = inject(ZardSheetService);
  private readonly router = inject(Router);
  private readonly aiAnalysis = inject(AiAnalysisService);
  private readonly addressService = inject(AddressService);
  private readonly wasteCategoryService = inject(WasteCategoryService);

  protected readonly wasteCategories = signal<WasteCategory[]>([]);
  protected readonly addresses = signal<Address[]>([]);
  protected readonly addressQuery = signal('');
  protected readonly filteredAddresses = computed(() => {
    const query = this.addressQuery().trim().toLowerCase();
    const list = this.addresses();
    if (!query) return list;
    return list.filter((address) =>
      `${address.label} ${formatAddress(address)}`
        .toLowerCase()
        .includes(query),
    );
  });
  protected readonly images = signal<PreviewImage[]>([]);
  protected readonly isAnalyzing = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly analysisSummary = signal<AnalysisSummary | null>(null);
  protected readonly aiAutoSnapshot = signal<AiAutoSnapshot | null>(null);
  protected readonly submitError = signal('');
  protected readonly submitSuccess = signal('');
  protected readonly hasActivePickupRequest = signal(false);
  protected readonly currentStep = signal<WizardStep>('images');
  private readonly summaryTpl = viewChild<TemplateRef<unknown>>('summaryContent');
  private summarySheet?: ZardSheetRef;
  private productTour: Driver | null = null;

  protected readonly maxImages = 5;
  protected readonly steps: StepMeta[] = [
    { id: 'images', label: 'Images', hint: 'Upload waste photos' },
    { id: 'items', label: 'Items', hint: 'Review detected items' },
    { id: 'pickup', label: 'Pickup', hint: 'Select time & address' },
    { id: 'confirm', label: 'Confirm', hint: 'Review & submit' },
  ];

  protected readonly form: NewPickupForm = new FormGroup({
    items: new FormArray<PickupItemForm>([this.createPickupItemGroup()]),
    description: new FormControl('', { nonNullable: true }),
    addressId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    addressText: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  constructor() {
    void this.loadInitialData();
  }

  ngAfterViewInit(): void {
    if (this.hasCompletedNewPickupTour()) {
      return;
    }

    window.setTimeout(() => this.startNewPickupTour(), 450);
  }

  ngOnDestroy(): void {
    this.productTour?.destroy();
    this.productTour = null;
  }

  protected pickupItems(): PickupItemForm[] {
    return this.form.controls.items.controls;
  }

  protected canCreateRequest(): boolean {
    return !this.hasActivePickupRequest();
  }

  protected openSummary(): void {
    const content = this.summaryTpl();
    if (!content) return;

    this.summarySheet = this.sheetService.create({
      zContent: content,
      zSide: 'bottom',
      zTitle: 'Request summary',
      zHideFooter: true,
      zCustomClasses: 'max-h-[85svh] overflow-y-auto rounded-t-2xl',
    });
  }

  protected closeSummary(): void {
    this.summarySheet?.close();
    this.summarySheet = undefined;
  }

  protected isStepActive(step: WizardStep): boolean {
    return this.currentStep() === step;
  }

  protected currentStepIndex(): number {
    return this.stepIndex(this.currentStep());
  }

  protected canGoBack(): boolean {
    return (
      this.currentStepIndex() > 0 && !this.isAnalyzing() && !this.isSubmitting()
    );
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
    return findCategory(this.wasteCategories(), item.controls.categoryId.value);
  }

  protected estimatedPoints(): number {
    return this.pickupItems().reduce((total, item) => {
      const category = this.selectedCategory(item);
      const estimatedWeight = Number(item.controls.estimatedWeight.value ?? 0);
      return (
        total +
        (category ? Math.round(category.pointsPerKg * estimatedWeight) : 0)
      );
    }, 0);
  }

  protected totalWeight(): number {
    return this.pickupItems().reduce(
      (total, item) => total + Number(item.controls.estimatedWeight.value ?? 0),
      0,
    );
  }

  protected selectedItemCount(): number {
    return this.pickupItems().filter((item) => item.controls.categoryId.value)
      .length;
  }

  protected aiAutoPayload(): string {
    const snapshot = this.aiAutoSnapshot();
    return snapshot ? JSON.stringify(snapshot) : '';
  }

  protected hasAiSuggestions(): boolean {
    return Boolean(this.aiAutoSnapshot()?.items.length);
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

  protected selectAddress(address: Address): void {
    this.form.controls.addressId.setValue(address.id);
    this.onAddressChanged();
  }

  protected selectedAddressLabel(): string {
    return (
      this.addresses().find(
        (item) => item.id === this.form.controls.addressId.value,
      )?.label ?? ''
    );
  }

  protected onAddressChanged(): void {
    const address = this.addresses().find(
      (item) => item.id === this.form.controls.addressId.value,
    );

    if (address) {
      this.form.controls.addressText.setValue(formatAddress(address));
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
    const images = this.images().map((image) => image.file);
    if (!images.length) {
      this.submitError.set(
        'Add at least one image before running AI analysis.',
      );
      return;
    }

    this.isAnalyzing.set(true);
    this.submitError.set('');
    this.analysisSummary.set(null);

    try {
      const response = await firstValueFrom(
        this.aiAnalysis.analyzeImages(images),
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
          const category = categoriesByName.get(
            this.normalizeCategoryName(detected.name),
          );
          if (!category) {
            return null;
          }

          return {
            categoryName: category.name,
            categoryId: category.id,
            estimatedWeight: Math.max(
              detected.estimatedWeight,
              Number(category.averageWeightKg),
            ),
            count: detected.count,
            points: detected.points,
          };
        })
        .filter(
          (suggestion): suggestion is AiSuggestion => suggestion !== null,
        );

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
        this.showAiDetectionDialog(suggestions, result.images ?? []);
      } else {
        this.handleEmptyAiResult();
      }
    } catch (err) {
      console.error('AI analysis failed:', err);
      this.submitError.set(
        'AI analysis failed. You can still submit the request manually.',
      );
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
        'AI could not match any waste category from the uploaded images. You can continue by adding the waste items manually.',
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

  private startNewPickupTour(): void {
    if (this.productTour?.isActive()) {
      return;
    }

    this.currentStep.set('images');
    this.productTour?.destroy();
    this.productTour = driver({
      allowClose: true,
      animate: true,
      disableActiveInteraction: true,
      doneBtnText: 'Finish',
      nextBtnText: 'Next',
      overlayOpacity: 0.55,
      popoverClass: 'wastegrab-product-tour',
      progressText: '{{current}}/{{total}}',
      showButtons: ['next', 'close'],
      showProgress: true,
      stagePadding: 6,
      stageRadius: 10,
      onCloseClick: () => {
        localStorage.setItem(NEW_PICKUP_TOUR_KEY, 'true');
        void this.authService.completeOnboarding().subscribe({
          next: () => {
            this.productTour?.destroy();
            this.productTour = null;
          },
          error: (err) => {
            console.error('Failed to complete onboarding:', err);
            this.productTour?.destroy();
            this.productTour = null;
          },
        });
      },
      onDestroyed: () => {
        // Onboarding is completed via onCloseClick, not here
      },
      steps: [
        {
          element: '[data-tour="pickup-steps"]',
          popover: {
            title: 'Pickup request steps',
            description:
              'This flow keeps the request simple: upload photos, review waste, choose pickup details, then confirm.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="pickup-upload"]',
          popover: {
            title: 'Start with photos',
            description:
              'Add clear photos of the waste. AI scans every uploaded image, and each photo helps the collector verify the pickup.',
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '[data-tour="pickup-ai"]',
          popover: {
            title: 'AI scan',
            description:
              'After uploading photos, this button can suggest categories, estimated weight, and points across all images. You can still edit everything.',
            side: 'right',
            align: 'start',
            onNextClick: (_element, _step, opts) =>
              this.moveTourToStep(opts.driver, 'items'),
          },
        },
        {
          element: '[data-tour="pickup-items"]',
          popover: {
            title: 'Review waste items',
            description:
              'Each row is one waste category. AI can fill this in, or you can add rows manually.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="pickup-category"]',
          popover: {
            title: 'Category controls points',
            description:
              'Pick the correct waste type here. The category determines how many points each kg is worth.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="pickup-weight"]',
          popover: {
            title: 'Estimated kg',
            description:
              'This is your best estimate. The collector can verify the final weight before points are awarded.',
            side: 'bottom',
            align: 'start',
            onNextClick: (_element, _step, opts) =>
              this.moveTourToStep(opts.driver, 'pickup'),
          },
        },
        {
          element: '[data-tour="pickup-address"]',
          popover: {
            title: 'Pickup address',
            description:
              'Choose a saved address so the collector knows where to collect the waste.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '[data-tour="pickup-notes"]',
          popover: {
            title: 'Collector notes',
            description:
              'Use this for optional details like guardhouse instructions, floor number, or where the items are placed.',
            side: 'top',
            align: 'start',
            onNextClick: (_element, _step, opts) =>
              this.moveTourToStep(opts.driver, 'confirm'),
          },
        },
        {
          element: window.matchMedia('(min-width: 1280px)').matches
            ? '[data-tour="pickup-estimate-desktop"]'
            : '[data-tour="pickup-estimate"]',
          popover: {
            title: 'Points preview',
            description:
              'This estimate updates from your selected categories and kg. Final points can change after verification.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '[data-tour="pickup-submit"]',
          popover: {
            title: 'Submit request',
            description:
              'Once everything looks right, submit the pickup request and track it from My Requests.',
            side: 'left',
            align: 'end',
            onNextClick: (_element, _step, opts) => {
              // Finish tour and reset wizard to step one
              localStorage.setItem(NEW_PICKUP_TOUR_KEY, 'true');
              void this.authService.completeOnboarding().subscribe({
                next: () => {
                  opts.driver.destroy();
                  this.productTour = null;
                  this.currentStep.set('images');
                },
                error: (err) => {
                  console.error('Failed to complete onboarding:', err);
                  opts.driver.destroy();
                  this.productTour = null;
                  this.currentStep.set('images');
                },
              });
            },
          },
        },
      ],
    });

    this.productTour.drive();
  }

  private moveTourToStep(tour: Driver, step: WizardStep): void {
    this.currentStep.set(step);
    window.setTimeout(() => {
      tour.refresh();
      tour.moveNext();
    });
  }

  private hasCompletedNewPickupTour(): boolean {
    return localStorage.getItem(NEW_PICKUP_TOUR_KEY) === 'true';
  }

  private showAiDetectionDialog(
    suggestions: AiSuggestion[],
    analyzedImages: AnalyzeImageResult['images'],
  ): void {
    const totalDetected = suggestions.reduce(
      (total, suggestion) => total + suggestion.count,
      0,
    );
    const imagesByIndex = new Map(
      analyzedImages.map((image) => [image.index, image]),
    );
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
    const imageRows = this.images()
      .map((image, index) => {
        const analyzedImage = imagesByIndex.get(index);
        const detectedCategories = analyzedImage?.detectedCategories ?? [];
        const detectedText = detectedCategories.length
          ? detectedCategories
              .map((category) => this.formatDetectedImageCategory(category))
              .join(', ')
          : 'No matching waste detected';

        return `
          <div class="grid grid-cols-[4rem_1fr] gap-3 rounded-md border border-border bg-background p-2">
            <img src="${this.escapeHtml(image.url)}" alt="Uploaded waste image ${index + 1}" class="size-16 rounded-md object-cover" />
            <div class="min-w-0">
              <div class="text-xs font-semibold text-foreground">Image ${index + 1}</div>
              <div class="mt-1 text-xs text-muted-foreground">${detectedText}</div>
            </div>
          </div>
        `;
      })
      .join('');

    this.dialogService.create({
      zTitle: 'Waste detected',
      zDescription: `AI found ${totalDetected} item${totalDetected === 1 ? '' : 's'} across ${suggestions.length} categor${suggestions.length === 1 ? 'y' : 'ies'}.`,
      zContent: `
        <div class="grid gap-3 text-sm">
          <div class="grid gap-2">${imageRows}</div>
          <div class="border-t border-border pt-3">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Combined suggestion</div>
            <div class="grid gap-2">${rows}</div>
          </div>
        </div>
      `,
      zOkText: 'Review Items',
      zCancelText: null,
      zWidth: 'max-w-md',
      zOnOk: () => {
        this.currentStep.set('items');
      },
    });
  }

  private formatDetectedImageCategory(category: DetectedWasteCategory): string {
    return `${this.escapeHtml(category.name)} x${category.count}`;
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

      const response = await firstValueFrom(
        this.pickupRequests.createPickupRequest(payload),
      );
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
        void this.router.navigate(['/', ROUTE_PATHS.customer.base, ROUTE_PATHS.customer.myRequests]);
      },
    });
  }

  private async loadInitialData(): Promise<void> {
    await Promise.all([
      this.loadWasteCategories(),
      this.loadAddresses(),
      this.loadActivePickupState(),
    ]);
  }

  private async loadActivePickupState(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.pickupRequests.listPickupRequests(),
      );
      const hasActive = response.pickupRequests.some(
        (request) =>
          request.status !== PickupStatus.COMPLETED &&
          request.status !== PickupStatus.CANCELLED,
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
        void this.router.navigate(['/', ROUTE_PATHS.customer.base, ROUTE_PATHS.customer.myRequests]);
      },
    });
  }

  private async loadWasteCategories(): Promise<void> {
    try {
      const categories = await firstValueFrom(
        this.wasteCategoryService.listPublicCategories(),
      );

      this.wasteCategories.set(categories);
    } catch (err) {
      console.error('Failed to load waste categories:', err);
      this.submitError.set('Unable to load waste categories.');
    }
  }

  private async loadAddresses(): Promise<void> {
    try {
      const addresses = await firstValueFrom(this.addressService.listAddress());

      this.addresses.set(addresses);
      const preferred =
        addresses.find((address) => address.isDefault) ?? addresses[0];

      if (preferred) {
        this.form.patchValue({
          addressId: preferred.id,
          addressText: formatAddress(preferred),
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

    const preferred =
      this.addresses().find((address) => address.isDefault) ??
      this.addresses()[0];
    if (preferred) {
      this.form.patchValue({
        addressId: preferred.id,
        addressText: formatAddress(preferred),
      });
    }
  }

  private normalizeCategoryName(value: string): string {
    return value.trim().toLowerCase();
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
      estimatedWeight: new FormControl<number | null>(
        input?.estimatedWeight ?? null,
        {
          validators: [Validators.required, Validators.min(0.01)],
        },
      ),
    });
  }

  private stepIndex(step: WizardStep): number {
    return this.steps.findIndex((item) => item.id === step);
  }

  private canReachStep(step: WizardStep): boolean {
    return this.steps
      .slice(0, this.stepIndex(step))
      .every((item) => this.canLeaveStep(item.id));
  }

  private canLeaveStep(step: WizardStep): boolean {
    switch (step) {
      case 'images':
        return this.images().length > 0;
      case 'items':
        return (
          this.form.controls.items.length > 0 &&
          this.form.controls.items.valid
        );
      case 'pickup':
        return (
          this.form.controls.addressId.valid &&
          this.form.controls.addressText.valid
        );
      case 'confirm':
        return this.images().length > 0 && this.form.valid;
    }
  }

  private firstInvalidStep(): WizardStep {
    if (!this.images().length) {
      return 'images';
    }

    if (this.form.controls.items.length === 0 || this.form.controls.items.invalid) {
      return 'items';
    }

    if (
      this.form.controls.addressId.invalid ||
      this.form.controls.addressText.invalid
    ) {
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
}
