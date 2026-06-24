import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBrain, lucideCircleSlash, lucideImage, lucideLoaderCircle, lucidePencil, lucidePlus, lucideSparkles, lucideTrash2, lucideWifi } from '@ng-icons/lucide';

import { AppHeaderComponent } from '@/ui/header/header.component';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import { ZardTableImports } from '@/ui/zard/table';
import { ZardButtonComponent } from '@/ui/zard/button/button.component';
import { ZardCheckboxComponent } from '@/ui/zard/checkbox';
import { ZardModalComponent } from '@/ui/zard/modal/modal.component';
import { ZardFormControlComponent, ZardFormFieldComponent, ZardFormLabelComponent } from '@/ui/zard/form/form.component';
import { ZardInputDirective } from '@/ui/zard/input';
import { ResponsiveDialogService } from '@/services/responsive-dialog.service';
import { StatGridComponent } from '@/ui/stat-card/stat-grid.component';
import type { StatCardItem } from '@/ui/stat-card/stat-card.models';
import { TableHeaderComponent } from '@/ui/table-header/table-header.component';
import { WasteCategoryService } from '@/services/waste-category.service';
import type { WasteCategory } from '@wastegrab/shared';

type WasteCategoryModalMode = 'add' | 'edit' | null;
type WasteCategoryFilter = 'all' | 'active' | 'hazardous' | 'banned';

@Component({
  selector: 'app-admin-waste-categories-page',
  templateUrl: './waste-categories.html',
  imports: [
    ReactiveFormsModule,
    AppHeaderComponent,
    ...ZardTableImports,
    ZardButtonComponent,
    StatGridComponent,
    TableHeaderComponent,
    ZardCheckboxComponent,
    ZardModalComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
    EmptyStateComponent,
    NgIcon,
  ],
  viewProviders: [
    provideIcons({
      lucideBrain,
      lucideCircleSlash,
      lucideImage,
      lucideLoaderCircle,
      lucidePencil,
      lucidePlus,
      lucideSparkles,
      lucideTrash2,
      lucideWifi,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWasteCategoriesPage implements OnInit {
  private readonly wasteCategoryService = inject(WasteCategoryService);
  private readonly dialogService = inject(ResponsiveDialogService);

  protected readonly categories = signal<WasteCategory[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly isUploadingImage = signal(false);
  protected readonly activeFilter = signal<WasteCategoryFilter>('all');
  protected readonly modalMode = signal<WasteCategoryModalMode>(null);
  protected readonly editingCategoryId = signal<string | null>(null);
  protected readonly filters: Array<{ value: WasteCategoryFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'hazardous', label: 'Hazardous' },
    { value: 'banned', label: 'Banned' },
  ];
  protected readonly activeCount = computed(() => this.categories().filter((category) => !category.isBanned).length);
  protected readonly aiCount = computed(() => this.categories().filter((category) => category.isAiDetectable).length);
  protected readonly restrictedCount = computed(() => this.categories().filter((category) => (
    category.isBanned || category.isHazardous
  )).length);
  protected readonly stats = computed<StatCardItem[]>(() => [
    { icon: 'lucideSparkles', label: 'Active', value: this.activeCount() },
    { icon: 'lucideBrain', label: 'AI Detectable', value: this.aiCount() },
    { icon: 'lucideCircleSlash', label: 'Restricted', value: this.restrictedCount(), spanClass: 'col-span-2 sm:col-span-1' },
  ]);
  protected readonly filteredCategories = computed(() => {
    const categories = this.categories();
    const filter = this.activeFilter();

    if (filter === 'active') return categories.filter((category) => !category.isBanned && !category.isHazardous);
    if (filter === 'hazardous') return categories.filter((category) => category.isHazardous);
    if (filter === 'banned') return categories.filter((category) => category.isBanned);
    return categories;
  });

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    pointsPerKg: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    averageWeightKg: new FormControl('0.050', { nonNullable: true, validators: [Validators.required] }),
    isBanned: new FormControl(false, { nonNullable: true }),
    isHazardous: new FormControl(false, { nonNullable: true }),
    isAiDetectable: new FormControl(true, { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    imageUrl: new FormControl('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  protected setFilter(filter: WasteCategoryFilter): void {
    this.activeFilter.set(filter);
  }

  protected openAdd(): void {
    this.editingCategoryId.set(null);
    this.form.reset({
      name: '',
      pointsPerKg: 1,
      averageWeightKg: '0.050',
      isBanned: false,
      isHazardous: false,
      isAiDetectable: true,
      description: '',
      imageUrl: '',
    });
    this.modalMode.set('add');
  }

  protected openEdit(category: WasteCategory): void {
    this.editingCategoryId.set(category.id);
    this.form.reset({
      name: category.name,
      pointsPerKg: category.pointsPerKg,
      averageWeightKg: category.averageWeightKg,
      isBanned: category.isBanned,
      isHazardous: category.isHazardous,
      isAiDetectable: category.isAiDetectable,
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? '',
    });
    this.modalMode.set('edit');
  }

  protected closeModal(): void {
    this.modalMode.set(null);
    this.editingCategoryId.set(null);
  }

  protected saveCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.wasteCategoryService.createCategory(value).subscribe({
      next: (created) => {
        this.categories.update((list) => [...list, created].sort(sortByName));
        this.closeModal();
      },
    });
  }

  protected saveEdit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.editingCategoryId();
    if (!id) return;

    this.wasteCategoryService.updateCategory(id, this.form.getRawValue()).subscribe({
      next: (updated) => {
        this.categories.update((list) => list.map((category) => (
          category.id === updated.id ? updated : category
        )).sort(sortByName));
        this.closeModal();
      },
    });
  }

  protected deleteCategory(category: WasteCategory): void {
    this.dialogService.create({
      zTitle: 'Delete Waste Category',
      zDescription: `Are you sure you want to delete ${category.name}?`,
      zOkText: 'Delete',
      zOkDestructive: true,
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.wasteCategoryService.deleteCategory(category.id).subscribe({
          next: () => this.categories.update((list) => list.filter((item) => item.id !== category.id)),
        });
      },
    });
  }

  protected uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      this.dialogService.create({
        zTitle: 'Unsupported Image',
        zDescription: 'Please choose a JPG, PNG, WebP, or HEIC image.',
        zOkText: 'OK',
        zWidth: 'max-w-sm',
      });
      return;
    }

    this.isUploadingImage.set(true);
    this.wasteCategoryService.uploadImage(file).subscribe({
      next: ({ imageUrl }) => {
        this.form.controls.imageUrl.setValue(imageUrl);
        this.form.controls.imageUrl.markAsDirty();
      },
      error: () => {
        this.isUploadingImage.set(false);
        this.dialogService.create({
          zTitle: 'Upload failed',
          zDescription: 'Unable to upload the category image. Please try again.',
          zOkText: 'OK',
          zWidth: 'max-w-sm',
        });
      },
      complete: () => this.isUploadingImage.set(false),
    });
  }

  protected clearImage(): void {
    this.form.controls.imageUrl.setValue('');
    this.form.controls.imageUrl.markAsDirty();
  }

  protected statusLabel(category: WasteCategory): string {
    if (category.isBanned) return 'Banned';
    if (category.isHazardous) return 'Hazardous';
    return 'Active';
  }

  protected statusClass(category: WasteCategory): string {
    if (category.isBanned) return 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
    if (category.isHazardous) return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }

  private loadCategories(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.wasteCategoryService.listCategories().subscribe({
      next: (list) => this.categories.set(list),
      error: () => {
        this.categories.set([]);
        this.loadError.set('Unable to load waste categories.');
      },
      complete: () => this.isLoading.set(false),
    });
  }
}

function sortByName(a: WasteCategory, b: WasteCategory): number {
  return a.name.localeCompare(b.name);
}
