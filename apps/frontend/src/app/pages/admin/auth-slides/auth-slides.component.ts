
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImage, lucideLoaderCircle, lucidePencil, lucidePlus, lucideTrash2, lucideWifi } from '@ng-icons/lucide';
import { firstValueFrom } from 'rxjs';
import type { AuthSlide } from '@wastegrab/shared';

import { AdminAuthSlideService } from '@/services/admin-auth-slide.service';
import { AppHeaderComponent } from '@/ui/header/header.component';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import { TableHeaderComponent } from '@/ui/table-header/table-header.component';
import { ZardBadgeComponent } from '@/ui/zard/badge';
import { ZardButtonComponent } from '@/ui/zard/button/button.component';
import { ZardCheckboxComponent } from '@/ui/zard/checkbox';
import { ResponsiveDialogService } from '@/services/responsive-dialog.service';
import { ZardFormControlComponent, ZardFormFieldComponent, ZardFormLabelComponent } from '@/ui/zard/form/form.component';
import { ZardInputDirective } from '@/ui/zard/input';
import { ZardModalComponent } from '@/ui/zard/modal/modal.component';
import { ZardTableImports } from '@/ui/zard/table';

type AuthSlideModalMode = 'add' | 'edit' | null;
type AuthSlideFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-admin-auth-slides-page',
  templateUrl: './auth-slides.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [

    ReactiveFormsModule,
    AppHeaderComponent,
    TableHeaderComponent,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCheckboxComponent,
    ZardModalComponent,
    ZardFormFieldComponent,
    ZardFormLabelComponent,
    ZardFormControlComponent,
    ZardInputDirective,
    EmptyStateComponent,
    NgIcon,
    ...ZardTableImports,
  ],
  viewProviders: [
    provideIcons({
      lucideImage,
      lucideLoaderCircle,
      lucidePencil,
      lucidePlus,
      lucideTrash2,
      lucideWifi,
    }),
  ],
})
export class AdminAuthSlidesPage implements OnInit {
  private readonly slidesService = inject(AdminAuthSlideService);
  private readonly dialogService = inject(ResponsiveDialogService);

  protected readonly slides = signal<AuthSlide[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly isUploadingImage = signal(false);
  protected readonly activeFilter = signal<AuthSlideFilter>('all');
  protected readonly modalMode = signal<AuthSlideModalMode>(null);
  protected readonly editingSlideId = signal<string | null>(null);
  protected readonly filters: Array<{ value: AuthSlideFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];
  protected readonly activeCount = computed(() => this.slides().filter((slide) => slide.isActive).length);
  protected readonly filteredSlides = computed(() => {
    const filter = this.activeFilter();
    if (filter === 'active') return this.slides().filter((slide) => slide.isActive);
    if (filter === 'inactive') return this.slides().filter((slide) => !slide.isActive);
    return this.slides();
  });

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    quote: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    author: new FormControl('', { nonNullable: true }),
    imageUrl: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    imageAlt: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    sortOrder: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    isActive: new FormControl(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    void this.loadSlides();
  }

  protected setFilter(filter: AuthSlideFilter): void {
    this.activeFilter.set(filter);
  }

  protected openAdd(): void {
    this.editingSlideId.set(null);
    this.form.reset({
      title: '',
      quote: '',
      author: '',
      imageUrl: '',
      imageAlt: '',
      sortOrder: (this.slides().length + 1) * 10,
      isActive: true,
    });
    this.modalMode.set('add');
  }

  protected openEdit(slide: AuthSlide): void {
    this.editingSlideId.set(slide.id);
    this.form.reset({
      title: slide.title,
      quote: slide.quote,
      author: slide.author ?? '',
      imageUrl: slide.imageUrl,
      imageAlt: slide.imageAlt,
      sortOrder: slide.sortOrder,
      isActive: slide.isActive,
    });
    this.modalMode.set('edit');
  }

  protected closeModal(): void {
    this.modalMode.set(null);
    this.editingSlideId.set(null);
  }

  protected saveCreate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.slidesService.createSlide(this.formPayload()).subscribe({
      next: (created) => {
        this.slides.update((list) => [...list, created].sort(sortSlides));
        this.closeModal();
      },
      error: (err) => this.showError(err, 'Unable to create auth slide.'),
    });
  }

  protected saveEdit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.editingSlideId();
    if (!id) return;

    this.slidesService.updateSlide(id, this.formPayload()).subscribe({
      next: (updated) => {
        this.slides.update((list) => list.map((slide) => slide.id === updated.id ? updated : slide).sort(sortSlides));
        this.closeModal();
      },
      error: (err) => this.showError(err, 'Unable to update auth slide.'),
    });
  }

  protected deleteSlide(slide: AuthSlide): void {
    this.dialogService.create({
      zTitle: 'Delete Auth Slide',
      zDescription: `Delete ${slide.title}? It will stop appearing on the login page.`,
      zOkText: 'Delete',
      zOkDestructive: true,
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.slidesService.deleteSlide(slide.id).subscribe({
          next: () => this.slides.update((list) => list.filter((item) => item.id !== slide.id)),
          error: (err) => this.showError(err, 'Unable to delete auth slide.'),
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
    this.slidesService.uploadImage(file).subscribe({
      next: ({ imageUrl }) => {
        this.form.controls.imageUrl.setValue(imageUrl);
        this.form.controls.imageUrl.markAsDirty();
      },
      error: (err) => this.showError(err, 'Unable to upload auth slide image.'),
      complete: () => this.isUploadingImage.set(false),
    });
  }

  private async loadSlides(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const slides = await firstValueFrom(this.slidesService.listSlides());
      this.slides.set(slides.sort(sortSlides));
    } catch {
      this.slides.set([]);
      this.loadError.set('Unable to load auth slides.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private formPayload() {
    const value = this.form.getRawValue();
    return {
      title: value.title,
      quote: value.quote,
      author: value.author || null,
      imageUrl: value.imageUrl,
      imageAlt: value.imageAlt,
      sortOrder: Number(value.sortOrder),
      isActive: value.isActive,
    };
  }

  private showError(err: unknown, fallback: string): void {
    const message = getErrorMessage(err) || fallback;
    this.dialogService.create({
      zTitle: 'Action failed',
      zDescription: message,
      zOkText: 'OK',
      zWidth: 'max-w-sm',
    });
  }
}

function sortSlides(a: AuthSlide, b: AuthSlide): number {
  return a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);
}

function getErrorMessage(err: unknown): string | null {
  if (typeof err !== 'object' || err === null || !('error' in err)) return null;
  const response = (err as { error?: unknown }).error;
  if (typeof response === 'object' && response !== null && 'error' in response) {
    const message = (response as { error?: unknown }).error;
    return typeof message === 'string' ? message : null;
  }
  return null;
}
