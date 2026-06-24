import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheckCircle2, lucideCoins, lucideMapPin } from '@ng-icons/lucide';
import type { WasteCategory } from '@wastegrab/shared';

import { CategoryThumbComponent } from './category-thumb.component';
import { StepHeaderComponent } from './step-header.component';
import {
  findCategory,
  type PickupItemForm,
  type PreviewImage,
} from './new-pickup.models';

@Component({
  selector: 'app-confirm-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIcon, CategoryThumbComponent, StepHeaderComponent],
  viewProviders: [
    provideIcons({ lucideCheckCircle2, lucideCoins, lucideMapPin }),
  ],
  template: `
    <section
      class="rounded-2xl border border-border bg-card shadow-sm"
      data-tour="pickup-confirm"
    >
      <app-step-header
        title="Confirm Request"
        subtitle="Review the request before saving."
      >
        <span
          stepHeaderIcon
          class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <ng-icon name="lucideCheckCircle2" class="size-5!" />
        </span>
      </app-step-header>

      <div class="grid gap-5 p-4">
        <!-- Reward highlight -->
        <div
          class="flex items-center justify-between gap-3 rounded-2xl bg-primary/10 p-4"
        >
          <div class="min-w-0">
            <p class="text-xs font-medium text-primary/80">Estimated reward</p>
            <p class="text-2xl font-bold text-primary">
              {{ estimatedPoints() }} pts
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              {{ totalWeight() | number: '1.2-2' }} kg ·
              {{ selectedItemCount() }}
              {{ selectedItemCount() === 1 ? 'item' : 'items' }}
            </p>
          </div>
          <span
            class="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
          >
            <ng-icon name="lucideCoins" class="size-6!" />
          </span>
        </div>

        <!-- Photos -->
        @if (images().length) {
        <div class="grid gap-2">
          <span
            class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >Photos</span
          >
          <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
            @for (image of images(); let index = $index; track image.url) {
            <img
              [src]="image.url"
              [alt]="'Pickup image ' + (index + 1)"
              class="aspect-square rounded-lg border border-border object-cover"
            />
            }
          </div>
        </div>
        }

        <!-- Items -->
        <div class="grid gap-2">
          <span
            class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >Waste items</span
          >
          <div class="grid gap-2">
            @for (item of items(); let index = $index; track item) { @if
            (selectedCategory(item)) {
            <div
              class="flex items-center gap-3 rounded-xl border border-border p-2.5"
            >
              <app-category-thumb
                [imageUrl]="selectedCategory(item)?.imageUrl"
                [name]="selectedCategory(item)?.name"
                chipClass="size-9"
              />
              <span class="min-w-0 flex-1 truncate font-medium">{{
                selectedCategory(item)?.name
              }}</span>
              <span class="shrink-0 text-sm font-semibold">
                {{ item.controls.estimatedWeight.value || 0 | number: '1.2-2' }}
                <span class="text-xs font-normal text-muted-foreground">kg</span>
              </span>
            </div>
            } }
          </div>
        </div>

        <!-- Pickup address -->
        <div class="grid gap-2">
          <span
            class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >Pickup address</span
          >
          <div
            class="flex items-start gap-3 rounded-xl border border-border p-3"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <ng-icon name="lucideMapPin" class="size-5!" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-foreground">
                {{ addressLabel() || 'Selected address' }}
              </p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                {{ addressText() }}
              </p>
            </div>
          </div>
        </div>

        <!-- Notes -->
        @if (description()) {
        <div class="grid gap-2">
          <span
            class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >Notes</span
          >
          <p
            class="rounded-xl border border-border p-3 text-sm text-muted-foreground"
          >
            {{ description() }}
          </p>
        </div>
        }
      </div>
    </section>
  `,
})
export class ConfirmStepComponent {
  readonly images = input.required<PreviewImage[]>();
  readonly items = input.required<PickupItemForm[]>();
  readonly wasteCategories = input.required<WasteCategory[]>();
  readonly estimatedPoints = input.required<number>();
  readonly totalWeight = input.required<number>();
  readonly selectedItemCount = input.required<number>();
  readonly addressLabel = input<string | null | undefined>(null);
  readonly addressText = input<string | null | undefined>(null);
  readonly description = input<string | null | undefined>(null);

  protected selectedCategory(item: PickupItemForm): WasteCategory | undefined {
    return findCategory(this.wasteCategories(), item.controls.categoryId.value);
  }
}
