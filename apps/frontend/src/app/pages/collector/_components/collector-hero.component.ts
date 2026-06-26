import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePackageCheck, lucideTruck } from '@ng-icons/lucide';

import type { CollectorStatItem } from './collector.models';

@Component({
  selector: 'app-collector-hero',
  standalone: true,
  imports: [RouterLink, NgIcon],
  viewProviders: [provideIcons({ lucidePackageCheck, lucideTruck })],
  template: `
    <div class="brand-hero card-lift h-full relative overflow-hidden rounded-3xl p-5 lg:p-6">
      <div
        class="pointer-events-none absolute -right-10 -top-14 size-48 rounded-full bg-white/10"
        aria-hidden="true"
      ></div>
      <div
        class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:pt-8"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium text-white/80">Field overview</p>
          <h1 class="mt-1 text-2xl font-bold tracking-tight">
            Collector Dashboard
          </h1>
          <p class="mt-2 max-w-2xl text-sm/6 text-white/80">
            Prioritize active assignments, claim nearby customer requests, and
            keep drop-off options close.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a
            [routerLink]="myPickupsRoute()"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/25"
          >
            <ng-icon name="lucideTruck" class="size-4!" />
            My Pickups
          </a>
          <a
            [routerLink]="earningsRoute()"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/25"
          >
            <ng-icon name="lucidePackageCheck" class="size-4!" />
            Earnings
          </a>
        </div>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        @for (stat of stats(); track stat.label) {
          <div class="rounded-2xl bg-white/10 p-4">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm text-white/75">{{ stat.label }}</p>
                <p class="truncate text-2xl font-bold tracking-tight">
                  {{ stat.value }}
                </p>
              </div>
              <span
                class="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-white"
              >
                <ng-icon [name]="stat.icon" class="size-5!" />
              </span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorHeroComponent {
  readonly stats = input.required<readonly CollectorStatItem[]>();
  readonly myPickupsRoute = input.required<readonly string[]>();
  readonly earningsRoute = input.required<readonly string[]>();
}
