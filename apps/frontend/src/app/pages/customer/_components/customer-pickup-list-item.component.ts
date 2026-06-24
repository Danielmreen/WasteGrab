import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideCheckCircle2,
  lucideChevronRight,
  lucideClock3,
  lucideCoins,
  lucideImage,
  lucideMapPin,
  lucideScale,
  lucideTruck,
} from '@ng-icons/lucide';

import type { CustomerPickupSummary } from './customer-dashboard.models';

@Component({
  selector: 'app-customer-pickup-list-item',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon],
  viewProviders: [
    provideIcons({
      lucideAlertCircle,
      lucideCheckCircle2,
      lucideChevronRight,
      lucideClock3,
      lucideCoins,
      lucideImage,
      lucideMapPin,
      lucideScale,
      lucideTruck,
    }),
  ],
  template: `
    <!-- Mobile -->
    <a
      [routerLink]="item().detailRoute"
      class="grid gap-2 border-b border-border/70 p-3 text-sm transition-colors last:border-b-0 hover:bg-muted/40 md:hidden"
    >
      <span class="flex min-w-0 items-center gap-3">
        <span class="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
          @if (item().imageUrl) {
            <img [src]="item().imageUrl" alt="Pickup" class="size-full object-cover" />
          } @else {
            <ng-icon name="lucideImage" class="size-5!" />
          }
          @if (item().isActive) {
            <span class="absolute right-1 top-1 size-2 rounded-full bg-primary shadow-sm"></span>
          }
        </span>
        <span class="min-w-0">
          <span class="block truncate font-semibold">{{ item().title }}</span>
          <span class="mt-0.5 block truncate text-xs text-muted-foreground">
            #{{ item().shortId }} · {{ item().createdAtLabel }}
          </span>
        </span>
      </span>

      <span class="flex items-center justify-between gap-3">
        <span
          class="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
          [class]="item().statusClass"
        >
          <ng-icon [name]="item().statusIcon" class="size-3.5!" />
          {{ item().statusLabel }}
        </span>
        <span class="flex shrink-0 items-center gap-3 text-xs font-semibold">
          <span class="flex items-center gap-1">
            <ng-icon name="lucideScale" class="size-3.5! text-primary" />
            {{ item().weightKg | number:'1.1-1' }} kg
          </span>
          <span class="flex items-center gap-1 text-primary">
            <ng-icon name="lucideCoins" class="size-3.5!" />
            {{ item().points }}
          </span>
        </span>
      </span>
    </a>

    <!-- Desktop -->
    <a
      [routerLink]="item().detailRoute"
      class="hidden border-b border-border/70 px-3 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-muted/40 md:grid md:grid-cols-[1.7fr_1fr_1fr_0.7fr_0.7fr] md:items-center md:gap-3"
    >
      <span class="flex min-w-0 items-center gap-3">
        <span class="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary/10 text-primary">
          @if (item().imageUrl) {
            <img [src]="item().imageUrl" alt="Pickup" class="size-full object-cover" />
          } @else {
            <ng-icon name="lucideImage" class="size-5!" />
          }
          @if (item().isActive) {
            <span class="absolute right-1 top-1 size-2 rounded-full bg-primary shadow-sm"></span>
          }
        </span>
        <span class="min-w-0">
          <span class="block truncate font-mono text-[11px] text-muted-foreground">#{{ item().shortId }}</span>
          <span class="block truncate font-semibold">{{ item().title }}</span>
        </span>
      </span>

      <span class="text-xs text-muted-foreground">{{ item().createdAtFullLabel }}</span>

      <span
        class="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
        [class]="item().statusClass"
      >
        <ng-icon [name]="item().statusIcon" class="size-3.5!" />
        {{ item().statusLabel }}
      </span>

      <span class="flex items-center justify-end gap-1 text-sm font-semibold">
        <ng-icon name="lucideScale" class="size-3.5! text-primary" />
        {{ item().weightKg | number:'1.1-1' }} kg
      </span>

      <span class="flex items-center justify-end gap-1 text-sm font-semibold text-primary">
        <ng-icon name="lucideCoins" class="size-3.5!" />
        {{ item().points }} {{ item().pointsLabel }}
      </span>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerPickupListItemComponent {
  readonly item = input.required<CustomerPickupSummary>();
}
