import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucidePlus,
  lucideRotateCcw,
  lucideSparkles,
  lucideTrash2,
} from '@ng-icons/lucide';
import type { WasteCategory } from '@wastegrab/shared';

import { ZardInputDirective } from '@/ui/zard/input';
import { ZardSelectImports } from '@/ui/zard/select/select.imports';
import { CategoryThumbComponent } from './category-thumb.component';
import { StepHeaderComponent } from './step-header.component';
import {
  findCategory,
  type AiSnapshotItem,
  type NewPickupForm,
  type PickupItemForm,
} from './new-pickup.models';

@Component({
  selector: 'app-items-step',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgIcon,
    ZardInputDirective,
    ...ZardSelectImports,
    CategoryThumbComponent,
    StepHeaderComponent,
  ],
  viewProviders: [
    provideIcons({
      lucideCircleAlert,
      lucidePlus,
      lucideRotateCcw,
      lucideSparkles,
      lucideTrash2,
    }),
  ],
  template: `
    <section
      class="rounded-2xl border border-border bg-card shadow-sm"
      data-tour="pickup-items"
    >
      <app-step-header
        title="Review Waste Items"
        subtitle="AI detections become editable rows."
      >
        <div stepHeaderActions class="flex items-center gap-2">
          @if (hasAiSuggestions()) {
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
            (click)="restore.emit()"
            [disabled]="disabled()"
          >
            <ng-icon name="lucideRotateCcw" class="size-4!" />
            Restore Suggestion
          </button>
          }

          <button
            type="button"
            class="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-border bg-background px-3 text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            (click)="addItem.emit()"
            [disabled]="disabled()"
          >
            <ng-icon name="lucidePlus" class="size-4!" />
            Add
          </button>
        </div>
      </app-step-header>

      <div class="grid gap-4 p-4" [formGroup]="form()">
        @if (analysisSummary()) {
        <div class="flex flex-wrap gap-2">
          @for (item of items; let index = $index; track item) { @if
          (selectedCategory(item)) {
          <span
            class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
            [class.bg-primary/10]="isUnmodifiedAiSuggestion(index, item)"
            [class.text-primary]="isUnmodifiedAiSuggestion(index, item)"
            [class.bg-muted]="!isUnmodifiedAiSuggestion(index, item)"
            [class.text-muted-foreground]="!isUnmodifiedAiSuggestion(index, item)"
          >
            @if (isUnmodifiedAiSuggestion(index, item)) {
            <ng-icon name="lucideSparkles" class="size-3.5!" />
            } {{ selectedCategory(item)?.name }}
          </span>
          } }
        </div>
        }

        <div class="grid gap-2.5" formArrayName="items">
          @for (item of items; let index = $index; track item) {
          <div
            [formGroupName]="index"
            class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border border-border/60 bg-muted/20 p-3 sm:flex sm:gap-2.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
          >
            <app-category-thumb
              [imageUrl]="selectedCategory(item)?.imageUrl"
              [name]="selectedCategory(item)?.name"
              chipClass="size-10 sm:size-9"
            />

            <z-select
              [id]="'categoryId-' + index"
              formControlName="categoryId"
              class="min-w-0 sm:flex-1"
              zPlaceholder="Select category"
              data-tour="pickup-category"
            >
              @for (category of wasteCategories(); track category.id) {
              <z-select-item [zValue]="category.id"
                >{{ category.name }}</z-select-item
              >
              }
            </z-select>

            <button
              type="button"
              class="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:order-last"
              (click)="removeItem.emit(index)"
              aria-label="Remove waste item"
            >
              <ng-icon name="lucideTrash2" class="size-4!" />
            </button>

            <div
              class="col-span-3 flex items-center justify-between gap-3 sm:col-auto sm:block sm:w-36"
            >
              <span class="text-sm font-medium text-muted-foreground sm:hidden"
                >Estimated weight</span
              >
              <div class="relative w-24 sm:w-full">
                <input
                  z-input
                  [id]="'estimatedWeight-' + index"
                  type="number"
                  min="0.01"
                  step="0.01"
                  formControlName="estimatedWeight"
                  class="w-full pr-9 text-right sm:text-left"
                  [attr.aria-label]="'Weight in kg for item ' + (index + 1)"
                  data-tour="pickup-weight"
                />
                <span
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground"
                  >kg</span
                >
              </div>
            </div>
          </div>
          }
        </div>

        @if (form().controls.items.invalid) {
        <p class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ng-icon name="lucideCircleAlert" class="size-3.5! text-amber-500" />
          Add a category and weight for every item to continue.
        </p>
        }
      </div>
    </section>
  `,
})
export class ItemsStepComponent {
  readonly form = input.required<NewPickupForm>();
  readonly wasteCategories = input.required<WasteCategory[]>();
  readonly analysisSummary = input<unknown>(null);
  readonly aiSnapshotItems = input<AiSnapshotItem[]>([]);
  readonly hasAiSuggestions = input(false);
  readonly disabled = input(false);

  readonly restore = output<void>();
  readonly addItem = output<void>();
  readonly removeItem = output<number>();

  protected get items(): PickupItemForm[] {
    return this.form().controls.items.controls;
  }

  protected selectedCategory(item: PickupItemForm): WasteCategory | undefined {
    return findCategory(this.wasteCategories(), item.controls.categoryId.value);
  }

  protected isUnmodifiedAiSuggestion(
    index: number,
    item: PickupItemForm,
  ): boolean {
    const suggestion = this.aiSnapshotItems()[index];
    if (!suggestion) return false;

    return (
      item.controls.categoryId.value === suggestion.categoryId &&
      this.roundWeight(item.controls.estimatedWeight.value) ===
        this.roundWeight(suggestion.estimatedWeight)
    );
  }

  private roundWeight(value: number | null): number {
    return Number(Number(value ?? 0).toFixed(2));
  }
}
