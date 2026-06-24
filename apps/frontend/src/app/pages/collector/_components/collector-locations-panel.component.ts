import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMapPin } from '@ng-icons/lucide';

import type { CollectorLocationCardItem } from './collector.models';

@Component({
  selector: 'app-collector-locations-panel',
  standalone: true,
  imports: [RouterLink, NgIcon],
  viewProviders: [provideIcons({ lucideMapPin })],
  template: `
    <div
      class="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
    >
      <div class="flex items-center gap-3 border-b border-border px-5 py-4">
        <span
          class="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"
        >
          <ng-icon name="lucideMapPin" class="size-5!" />
        </span>
        <div>
          <h2 class="text-base font-semibold">Collection Points</h2>
          <p class="text-sm text-muted-foreground">{{ description() }}</p>
        </div>
      </div>

      <div class="grid gap-3 p-5">
        @for (location of locations(); track location.id) {
          <a
            [routerLink]="location.detailRoute"
            class="rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <p class="truncate text-sm font-semibold">{{ location.name }}</p>
            <p class="mt-1 line-clamp-2 text-xs/5 text-muted-foreground">
              {{ location.address }}
            </p>
          </a>
        } @empty {
          <div
            class="rounded-lg border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground"
          >
            No collection locations are available yet.
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorLocationsPanelComponent {
  readonly locations = input.required<readonly CollectorLocationCardItem[]>();
  readonly description = input('');
}
