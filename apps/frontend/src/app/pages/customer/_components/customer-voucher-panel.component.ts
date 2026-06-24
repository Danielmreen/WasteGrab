import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideCoins, lucideTicket } from '@ng-icons/lucide';

import type { CustomerVoucherSummary } from './customer-dashboard.models';
import {
  CustomerVoucherCardComponent,
  type VoucherCardItem,
} from './customer-voucher-card.component';
import { AppPanelComponent } from '@/ui/panel/panel.component';

@Component({
  selector: 'app-customer-voucher-panel',
  imports: [
    RouterLink,
    NgIcon,
    AppPanelComponent,
    CustomerVoucherCardComponent,
  ],
  viewProviders: [
    provideIcons({ lucideArrowRight, lucideCoins, lucideTicket }),
  ],
  template: `
    <app-panel
      title="Active Vouchers"
      icon="lucideTicket"
      sectionId="rewards"
      [actionRoute]="vouchersRoute()"
    >
      @if (cards().length) {
        <div class="grid gap-3">
          @for (card of cards(); track card.title) {
            <app-customer-voucher-card [item]="card" [muted]="true" />
          }
        </div>
      } @else {
        <a
          [routerLink]="vouchersRoute()"
          class="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-background/40 p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
        >
          Browse reward vouchers
          <ng-icon name="lucideArrowRight" class="size-4!" />
        </a>
      }
    </app-panel>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerVoucherPanelComponent {
  readonly vouchers = input.required<readonly CustomerVoucherSummary[]>();
  readonly vouchersRoute = input.required<readonly string[]>();

  protected readonly cards = computed<VoucherCardItem[]>(() =>
    this.vouchers().map((v) => ({
      imageUrl: v.imageUrl,
      title: v.title,
      leftValue: v.pointsSpent,
      leftLabel: 'pts used',
      leftIcon: 'lucideCoins',
      badgeLabel: v.expiryLabel,
      code: v.code,
      route: v.route,
    })),
  );
}
