import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarCheck,
  lucideCheckCircle2,
  lucideChevronRight,
  lucideClock3,
  lucideImage,
  lucideMapPin,
  lucidePackageCheck,
  lucidePlus,
  lucideTruck,
} from '@ng-icons/lucide';

import { PickupStatus } from '@wastegrab/shared';
import type { CustomerPickupSummary } from './customer-dashboard.models';
import { AppPanelComponent } from '@/ui/panel/panel.component';

const pickupSteps: Array<{
  status: PickupStatus;
  label: string;
  icon: string;
}> = [
  { status: PickupStatus.PENDING, label: 'Pending', icon: 'lucideClock3' },
  { status: PickupStatus.ACCEPTED, label: 'Accepted', icon: 'lucideTruck' },
  { status: PickupStatus.ARRIVED, label: 'Arrived', icon: 'lucideMapPin' },
  {
    status: PickupStatus.VERIFIED,
    label: 'Verified',
    icon: 'lucideCheckCircle2',
  },
  {
    status: PickupStatus.COMPLETED,
    label: 'Completed',
    icon: 'lucidePackageCheck',
  },
];

@Component({
  selector: 'app-customer-active-pickup-card',
  imports: [CommonModule, RouterLink, NgIcon, AppPanelComponent],
  template: `
    <app-panel title="Active Pickup" icon="lucideTruck">
      @if (pickup(); as current) {
        <a
          [routerLink]="current.detailRoute"
          class="block rounded-2xl border border-primary/30 bg-background/40 p-3 transition-colors hover:border-primary/60 hover:bg-muted/40 sm:p-4 lg:p-5"
        >
        <div class="flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-2">
            <span class="font-mono text-sm font-semibold"
              >#{{ current.shortId }}</span
            >
            <span
              class="rounded-full px-2.5 py-1 text-xs font-bold capitalize"
              [class]="current.statusClass"
            >
              {{ current.statusLabel }}
            </span>
          </div>
          <ng-icon
            name="lucideChevronRight"
            class="size-4! shrink-0 text-muted-foreground"
          />
        </div>

        <div
          class="mt-3 flex items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-2 text-xs text-primary sm:px-3 sm:text-sm"
        >
          <ng-icon name="lucideTruck" class="size-3.5! sm:size-4!" />
          <span class="min-w-0 flex-1 truncate font-medium">{{
            current.statusMessage
          }}</span>
          <span class="shrink-0 text-xs text-primary/80">{{
            current.createdAtLabel
          }}</span>
        </div>

        <div class="mt-3 hidden gap-3 sm:mt-4 sm:flex md:grid md:grid-cols-[7rem_1fr] md:gap-5 md:items-stretch">
          <div
            class="size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:size-20 md:size-auto md:aspect-square"
          >
            @if (current.imageUrl) {
              <img
                [src]="current.imageUrl"
                alt="Active pickup image"
                class="size-full object-cover"
              />
            } @else {
              <div
                class="grid size-full place-items-center text-muted-foreground"
              >
                <ng-icon name="lucideImage" class="size-7!" />
              </div>
            }
          </div>

          <div class="min-w-0 flex-1">
            <h2 class="truncate text-base font-semibold sm:text-xl">{{ current.title }}</h2>
            <p class="mt-1 line-clamp-1 text-xs/5 text-muted-foreground sm:line-clamp-2 sm:text-sm/6">
              {{ current.address }}
            </p>

            <div class="mt-2 grid grid-cols-3 gap-1.5 text-center sm:mt-3 sm:gap-2">
              <div class="rounded-lg bg-muted/60 p-1.5  sm:p-2">
                <p class="text-[10px] text-muted-foreground sm:text-xs">Weight</p>
                <p class="truncate text-sm font-semibold">
                  {{ current.weightKg | number: '1.1-1' }} kg
                </p>
              </div>
              <div class="rounded-lg bg-muted/60 p-1.5  sm:p-2">
                <p class="text-[10px] text-muted-foreground sm:text-xs">Points</p>
                <p class="truncate text-sm font-semibold">
                  {{ current.points }}
                </p>
              </div>
              <div class="rounded-lg bg-muted/60 p-1.5  sm:p-2">
                <p class="text-[10px] text-muted-foreground sm:text-xs">Items</p>
                <p class="truncate text-sm font-semibold">
                  {{ current.itemCount }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-3 rounded-xl border border-border bg-card p-2.5 sm:mt-4 sm:p-3">
          <ol class="flex items-center">
            @for (step of steps; track step.status) {
              <li class="flex flex-1 items-center last:flex-none">
                <div class="flex flex-col items-center gap-1 sm:gap-1.5">
                  <span
                    class="flex size-6 items-center justify-center rounded-full border text-xs font-semibold sm:size-7"
                    [ngClass]="stepDotClass(current.status, step.status)"
                  >
                    <ng-icon [name]="step.icon" class="size-3! sm:size-3.5!" />
                  </span>
                  <span
                    class="hidden text-[11px] font-medium sm:inline"
                    [ngClass]="
                      isStepComplete(current.status, step.status)
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    "
                  >
                    {{ step.label }}
                  </span>
                </div>

                @if (!$last) {
                  <span
                    class="mx-0.5 mb-0 h-0.5 flex-1 rounded-full sm:mx-1 sm:mb-5"
                    [ngClass]="
                      isStepComplete(current.status, steps[$index + 1].status)
                        ? 'bg-primary'
                        : 'bg-border'
                    "
                  ></span>
                }
              </li>
            }
          </ol>
        </div>
        </a>
      } @else {
        <section
          class="rounded-2xl border border-border/70 bg-background/40 p-3 sm:p-4 lg:p-5"
        >
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <span
              class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary sm:size-10 sm:rounded-full"
            >
              <ng-icon name="lucideCalendarCheck" class="size-4.5! sm:size-5!" />
            </span>
            <div>
              <h2 class="text-base font-semibold">No active pickup request</h2>
              <p class="mt-1 text-xs text-muted-foreground sm:text-sm">
                Create a new request when your recyclables are ready.
              </p>
            </div>
          </div>
          <a
            [routerLink]="newPickupRoute()"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-full btn-brand px-4 text-sm font-semibold shadow-sm transition-all sm:h-11 sm:px-5"
          >
            <ng-icon name="lucidePlus" class="size-4!" />
            Request pickup
          </a>
        </div>
        </section>
      }
    </app-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      lucideCalendarCheck,
      lucideCheckCircle2,
      lucideChevronRight,
      lucideClock3,
      lucideImage,
      lucideMapPin,
      lucidePackageCheck,
      lucidePlus,
      lucideTruck,
    }),
  ],
})
export class CustomerActivePickupCardComponent {
  readonly pickup = input<CustomerPickupSummary | null>(null);
  readonly newPickupRoute = input.required<readonly string[]>();

  protected readonly steps = pickupSteps;

  protected isStepComplete(current: PickupStatus, step: PickupStatus): boolean {
    return this.statusIndex(current) >= this.statusIndex(step);
  }

  protected stepDotClass(current: PickupStatus, step: PickupStatus): string {
    if (this.isStepComplete(current, step)) {
      return 'border-primary bg-primary text-primary-foreground';
    }

    if (this.statusIndex(current) === this.statusIndex(step)) {
      return 'border-primary bg-primary/10 text-primary';
    }

    return 'border-border bg-card text-muted-foreground';
  }

  private statusIndex(status: PickupStatus): number {
    const index = pickupSteps.findIndex((step) => step.status === status);
    return index === -1 ? 0 : index;
  }
}
