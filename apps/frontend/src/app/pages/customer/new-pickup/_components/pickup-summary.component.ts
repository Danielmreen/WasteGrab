import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle2,
  lucideImage,
  lucidePackage,
  lucideScale,
} from '@ng-icons/lucide';

import { StepHeaderComponent } from './step-header.component';
import type { PreviewImage } from './new-pickup.models';

/**
 * Estimate + reference-images panel. Rendered in the desktop sidebar and inside
 * the mobile bottom sheet (via the parent's summary template).
 */
@Component({
  selector: 'app-pickup-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIcon, StepHeaderComponent],
  viewProviders: [
    provideIcons({
      lucideCheckCircle2,
      lucideImage,
      lucidePackage,
      lucideScale,
    }),
  ],
  template: `
    @if (showReferenceImages() && images().length) {
    <section class="rounded-2xl border border-border bg-card shadow-sm">
      <app-step-header
        title="Reference Images"
        [subtitle]="images().length + ' uploaded'"
      >
        <button
          stepHeaderActions
          type="button"
          class="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          (click)="editImages.emit()"
          [disabled]="busy()"
          aria-label="Edit images"
          title="Edit images"
        >
          <ng-icon name="lucideImage" class="size-4!" />
        </button>
      </app-step-header>

      <div class="grid grid-cols-5 gap-2 p-4">
        @for (image of images().slice(0, 5); let index = $index; track
        image.url) {
        <div
          class="relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
        >
          <img
            [src]="image.url"
            [alt]="'Reference image ' + (index + 1)"
            class="size-full object-cover"
          />

          @if (index === 4 && images().length > 5) {
          <div
            class="absolute inset-0 grid place-items-center bg-foreground/60 text-xs font-bold text-background"
          >
            +{{ images().length - 4 }}
          </div>
          }
        </div>
        }
      </div>
    </section>
    }

    <section
      class="rounded-2xl border border-border bg-card shadow-sm"
      data-tour="pickup-estimate-desktop"
    >
      <app-step-header
        title="Estimate"
        subtitle="Based on selected categories"
      />

      <div class="grid gap-3 p-4">
        <div class="flex items-center justify-between rounded-lg bg-muted/60 p-3">
          <span class="flex items-center gap-2 text-sm text-muted-foreground">
            <ng-icon name="lucidePackage" class="size-4!" />
            Categories
          </span>
          <span class="text-sm font-semibold">{{ selectedItemCount() }}</span>
        </div>

        <div class="flex items-center justify-between rounded-lg bg-muted/60 p-3">
          <span class="flex items-center gap-2 text-sm text-muted-foreground">
            <ng-icon name="lucideScale" class="size-4!" />
            Weight
          </span>
          <span class="text-sm font-semibold"
            >{{ totalWeight() | number: '1.2-2' }} kg</span
          >
        </div>

        <div
          class="flex items-center justify-between rounded-lg bg-primary/10 p-3 text-primary"
        >
          <span class="flex items-center gap-2 text-sm font-medium">
            <ng-icon name="lucideCheckCircle2" class="size-4!" />
            Points
          </span>
          <span class="text-sm font-bold">{{ estimatedPoints() }}</span>
        </div>
      </div>
    </section>
  `,
})
export class PickupSummaryComponent {
  readonly images = input.required<PreviewImage[]>();
  readonly showReferenceImages = input(false);
  readonly selectedItemCount = input.required<number>();
  readonly totalWeight = input.required<number>();
  readonly estimatedPoints = input.required<number>();
  readonly busy = input(false);

  readonly editImages = output<void>();
}
