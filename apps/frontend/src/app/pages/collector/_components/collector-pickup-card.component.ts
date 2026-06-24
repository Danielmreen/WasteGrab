import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight } from '@ng-icons/lucide';

import type { CollectorPickupCardItem } from './collector.models';

@Component({
  selector: 'app-collector-pickup-card',
  standalone: true,
  imports: [RouterLink, NgIcon],
  viewProviders: [provideIcons({ lucideArrowRight })],
  template: `
    <a
      [routerLink]="item().detailRoute"
      class="grid gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/40 sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <span class="min-w-0">
        <span class="block truncate text-sm font-semibold">{{
          item().customer
        }}</span>
        <span class="mt-1 block truncate text-xs text-muted-foreground">{{
          item().subtitle
        }}</span>
      </span>
      <span
        class="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground"
      >
        {{ item().weightLabel }}
        <ng-icon name="lucideArrowRight" class="size-4!" />
      </span>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorPickupCardComponent {
  readonly item = input.required<CollectorPickupCardItem>();
}
