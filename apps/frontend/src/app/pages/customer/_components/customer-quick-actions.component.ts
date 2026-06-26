import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronRight,
  lucidePlus,
  lucideTicket,
  lucideTrophy,
  lucideTruck,
} from '@ng-icons/lucide';

import type { CustomerQuickAction } from './customer-dashboard.models';
import { AppPanelComponent } from '@/ui/panel/panel.component';

@Component({
  selector: 'app-customer-quick-actions',
  imports: [CommonModule, RouterLink, NgIcon, AppPanelComponent],
  template: `
    <app-panel title="Quick Actions" icon="lucidePlus">
      <div class="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        @for (action of actions(); track action.label) {
          <a
            [routerLink]="action.route"
            class="card-lift flex min-h-16 flex-col justify-between gap-2 rounded-xl p-3 transition-all hover:-translate-y-0.5 lg:min-h-20 lg:gap-3 lg:rounded-2xl lg:p-4"
            [ngClass]="
              action.primary
                ? 'bg-primary text-background shadow-sm hover:bg-primary/90'
                : 'border border-border/60 bg-card hover:bg-muted/40'
            "
          >
            <span class="flex items-center justify-between gap-2">
              <span
                class="grid size-7 place-items-center rounded-lg lg:size-9 lg:rounded-full"
                [ngClass]="
                  action.primary
                    ? 'bg-background text-primary'
                    : 'bg-primary/10 text-primary'
                "
              >
                <ng-icon [name]="action.icon" class="size-3.5! lg:size-4.5!" />
              </span>
              <ng-icon
                name="lucideChevronRight"
                class="size-3.5! lg:size-4!"
                [ngClass]="
                  action.primary ? 'text-background' : 'text-muted-foreground'
                "
              />
            </span>
            <span>
              <span class="block truncate text-xs font-semibold lg:text-sm">{{
                action.label
              }}</span>
            </span>
          </a>
        }
      </div>
    </app-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      lucideChevronRight,
      lucidePlus,
      lucideTicket,
      lucideTrophy,
      lucideTruck,
    }),
  ],
})
export class CustomerQuickActionsComponent {
  readonly actions = input.required<readonly CustomerQuickAction[]>();
}
