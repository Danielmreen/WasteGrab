import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideClock3,
  lucideNavigation,
  lucideRecycle,
  lucideScale,
} from '@ng-icons/lucide';

import type { CollectorFeaturedPickup } from './collector.models';

@Component({
  selector: 'app-collector-next-pickup',
  standalone: true,
  imports: [RouterLink, NgIcon],
  viewProviders: [
    provideIcons({
      lucideArrowRight,
      lucideClock3,
      lucideNavigation,
      lucideRecycle,
      lucideScale,
    }),
  ],
  template: `
    @if (pickup(); as item) {
      <section
        class="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
      >
        <div class="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full btn-brand px-2.5 py-1 text-xs font-bold text-white"
              >
                {{ item.badge }}
              </span>
              <span class="text-xs font-semibold text-primary"
                >#{{ item.shortId }}</span
              >
              <span
                class="rounded-full px-2.5 py-1 text-xs font-bold capitalize"
                [class]="item.statusClass"
              >
                {{ item.statusLabel }}
              </span>
            </div>
            <h2 class="mt-3 truncate text-xl font-semibold">
              {{ item.customer }}
            </h2>
            <p class="mt-1 line-clamp-2 text-sm/6 text-muted-foreground">
              {{ item.address }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                class="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground"
              >
                <ng-icon name="lucideRecycle" class="size-3.5!" />
                {{ item.categoryLabel }}
              </span>
              <span
                class="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground"
              >
                <ng-icon name="lucideScale" class="size-3.5!" />
                {{ item.weightLabel }}
              </span>
              <span
                class="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground"
              >
                <ng-icon name="lucideNavigation" class="size-3.5!" />
                {{ item.distanceLabel }}
              </span>
            </div>
          </div>

          <a
            [routerLink]="item.detailRoute"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-full btn-brand px-5 text-sm font-semibold shadow-sm transition-colors"
          >
            Open Pickup
            <ng-icon name="lucideArrowRight" class="size-4!" />
          </a>
        </div>
      </section>
    } @else {
      <section
        class="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
      >
        <div class="flex items-start gap-3 p-5">
          <span
            class="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
          >
            <ng-icon name="lucideClock3" class="size-5!" />
          </span>
          <div>
            <h2 class="text-base font-semibold">No pickups in queue</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Available customer requests will appear here when they are ready.
            </p>
          </div>
        </div>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorNextPickupComponent {
  readonly pickup = input.required<CollectorFeaturedPickup | null>();
}
