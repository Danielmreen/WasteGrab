import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import type { CollectorPickupCardItem } from './collector.models';
import { CollectorPickupCardComponent } from './collector-pickup-card.component';

@Component({
  selector: 'app-collector-pickup-list',
  standalone: true,
  imports: [RouterLink, CollectorPickupCardComponent],
  template: `
    <div
      class="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
    >
      <div
        class="flex items-center justify-between gap-3 border-b border-border px-5 py-4"
      >
        <div>
          <h2 class="text-base font-semibold">{{ title() }}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{{ description() }}</p>
        </div>
        @if (actionRoute(); as route) {
          <a
            [routerLink]="route"
            class="text-sm font-semibold text-primary hover:underline"
            >{{ actionLabel() }}</a
          >
        }
      </div>

      <div class="grid gap-3 p-5">
        @for (item of items(); track item.id) {
          <app-collector-pickup-card [item]="item" />
        } @empty {
          <div
            class="rounded-lg border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground"
          >
            {{ emptyText() }}
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorPickupListComponent {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly items = input.required<readonly CollectorPickupCardItem[]>();
  readonly actionLabel = input('View all');
  readonly actionRoute = input<readonly string[] | null>(null);
  readonly emptyText = input('No pickups to show right now.');
}
