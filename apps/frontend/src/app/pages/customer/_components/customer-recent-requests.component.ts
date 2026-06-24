import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFileText, lucideRecycle } from '@ng-icons/lucide';

import type { CustomerPickupSummary } from './customer-dashboard.models';
import { CustomerPickupListItemComponent } from './customer-pickup-list-item.component';
import { AppPanelComponent } from '@/ui/panel/panel.component';

@Component({
  selector: 'app-customer-recent-requests',
  standalone: true,
  imports: [NgIcon, AppPanelComponent, CustomerPickupListItemComponent],
  viewProviders: [provideIcons({ lucideFileText, lucideRecycle })],
  template: `
    <app-panel title="Recent Requests" icon="lucideFileText" [actionRoute]="pickupsRoute()">
      <div class="overflow-hidden rounded-2xl border border-border/70 bg-background/40">

        @if (requests().length) {
          <!-- Desktop column headers -->
          <div class="hidden grid-cols-[1.7fr_1fr_1fr_0.7fr_0.7fr] items-center border-b border-border/70 px-3 py-2 text-xs font-semibold text-muted-foreground md:grid">
            <span>Request</span>
            <span>Date</span>
            <span>Status</span>
            <span class="text-right">Weight</span>
            <span class="text-right">Points</span>
          </div>

          @for (r of requests(); track r.id) {
            <app-customer-pickup-list-item [item]="r" />
          }
        } @else {
          <div class="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <ng-icon name="lucideRecycle" class="size-6! text-muted-foreground" />
            <p class="text-sm text-muted-foreground">No recent requests yet.</p>
          </div>
        }

      </div>
    </app-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerRecentRequestsComponent {
  readonly requests = input.required<readonly CustomerPickupSummary[]>();
  readonly pickupsRoute = input.required<readonly string[]>();
}
