import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideTrophy } from '@ng-icons/lucide';

import type { CustomerLeaderboardRow } from './customer-dashboard.models';
import { AppPanelComponent } from '@/ui/panel/panel.component';

@Component({
  selector: 'app-customer-rank-panel',
  imports: [CommonModule, RouterLink, NgIcon, AppPanelComponent],
  template: `
    <app-panel
      title="Top Leaderboard"
      icon="lucideTrophy"
      actionLabel="View All"
      [actionRoute]="leaderboardRoute()"
    >
      @if (rows().length) {
        <ul
          class="overflow-hidden rounded-xl border border-border/70 bg-background/40"
        >
          @for (row of rows(); track row.rank + row.name) {
            <li class="border-b border-border/70 last:border-b-0">
              <a
                [routerLink]="row.route"
                class="flex items-center gap-2 px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/40"
                [ngClass]="
                  row.isCurrentUser
                    ? 'bg-primary/10 text-primary hover:bg-primary/15'
                    : ''
                "
              >
                <span
                  class="grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold"
                  [ngClass]="rankClass(row.rank)"
                >
                  {{ row.rank }}
                </span>
                <span
                  class="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
                >
                  @if (row.avatarUrl) {
                    <img
                      [src]="row.avatarUrl"
                      [alt]="row.name + ' avatar'"
                      class="size-full rounded-full object-cover"
                    />
                  } @else {
                    {{ initials(row.name) }}
                  }
                </span>
                <span
                  class="min-w-0 flex-1 truncate font-semibold"
                  [ngClass]="
                    row.isCurrentUser ? 'text-primary' : 'text-foreground'
                  "
                >
                  {{ row.name }}
                  @if (row.isCurrentUser) {
                    <span> (You)</span>
                  }
                </span>
                <span
                  class="shrink-0 text-xs font-bold"
                  [ngClass]="
                    row.isCurrentUser ? 'text-primary' : 'text-foreground'
                  "
                  >{{ row.value }}</span
                >
              </a>
            </li>
          }
        </ul>
      } @else {
        <a
          [routerLink]="leaderboardRoute()"
          class="flex items-center justify-between rounded-2xl border border-dashed border-border bg-background/40 p-3 text-sm text-muted-foreground"
        >
          Complete a pickup to join the rankings.
          <ng-icon name="lucideArrowRight" class="size-4!" />
        </a>
      }
    </app-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ lucideArrowRight, lucideTrophy })],
})
export class CustomerRankPanelComponent {
  readonly rows = input.required<readonly CustomerLeaderboardRow[]>();
  readonly leaderboardRoute = input.required<readonly string[]>();

  protected rankClass(rank: number): string {
    switch (rank) {
      case 1:
        return 'border border-amber-300 bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 text-amber-950 shadow-sm shadow-amber-500/30';
      case 2:
        return 'border border-slate-300 bg-gradient-to-br from-slate-100 via-slate-300 to-slate-500 text-slate-900 shadow-sm shadow-slate-400/30 dark:from-slate-200 dark:via-slate-400 dark:to-slate-600';
      case 3:
        return 'border border-orange-300 bg-gradient-to-br from-orange-200 via-orange-400 to-amber-700 text-orange-950 shadow-sm shadow-orange-500/30';
      default:
        return 'border border-transparent bg-transparent text-muted-foreground';
    }
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
