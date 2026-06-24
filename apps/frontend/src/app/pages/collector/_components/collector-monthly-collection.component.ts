import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import type { CollectorMonthlySummary } from './collector.models';

@Component({
  selector: 'app-collector-monthly-collection',
  standalone: true,
  imports: [DecimalPipe, EmptyStateComponent],
  template: `
    <div
      class="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
    >
      <div class="border-b border-border px-5 py-4">
        <h2 class="text-base font-semibold">Monthly Collection</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Verified weight collected per month.
        </p>
      </div>

      <div class="grid gap-3 p-5">
        @for (month of months(); track month.key) {
          <div class="rounded-lg bg-muted/60 p-3">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="font-medium">{{ month.label }}</span>
              <span class="text-muted-foreground">
                {{ month.pickupCount }} pickup{{
                  month.pickupCount === 1 ? '' : 's'
                }}
                ·
                <span class="font-semibold text-foreground"
                  >{{ month.weightKg | number: '1.1-1' }} kg</span
                >
              </span>
            </div>
            <div class="mt-2 h-2 overflow-hidden rounded-full bg-border/60">
              <div
                class="h-full rounded-full bg-primary transition-all"
                [style.width.%]="month.barPercent"
              ></div>
            </div>
          </div>
        } @empty {
          <app-empty-state
            icon="lucideScale"
            title="No collection history yet."
            description="Monthly totals will appear after you complete pickups."
          />
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorMonthlyCollectionComponent {
  readonly months = input.required<readonly CollectorMonthlySummary[]>();
}
