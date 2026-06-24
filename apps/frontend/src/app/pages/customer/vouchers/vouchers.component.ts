import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBadgeCheck,
  lucideCoins,
  lucideGift,
  lucideLoaderCircle,
  lucideReceiptText,
  lucideTicket,
  lucideWallet,
  lucideWifi,
} from '@ng-icons/lucide';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import { firstValueFrom } from 'rxjs';

import { AppHeaderComponent } from '@/ui/header/header.component';
import {
  TableHeaderComponent,
  type FilterOption,
} from '@/ui/table-header/table-header.component';
import { StatGridComponent } from '@/ui/stat-card/stat-grid.component';
import type { StatCardItem } from '@/ui/stat-card/stat-card.models';
import {
  CustomerVoucherCardComponent,
  type VoucherCardItem,
} from '../_components/customer-voucher-card.component';
import { ResponsiveDialogService } from '@/services/responsive-dialog.service';
import { CustomerVoucherService } from '@/services/customer-voucher.service';
import type {
  CustomerVoucherCatalogItem,
  CustomerVoucherRedemption,
} from '@wastegrab/shared';

type VoucherTab = 'available' | 'redeemed';

@Component({
  selector: 'app-customer-vouchers-page',
  templateUrl: './vouchers.html',
  imports: [
    AppHeaderComponent,
    EmptyStateComponent,
    TableHeaderComponent,
    NgIcon,
    CustomerVoucherCardComponent,
    StatGridComponent,
  ],
  viewProviders: [
    provideIcons({
      lucideBadgeCheck,
      lucideCoins,
      lucideGift,
      lucideLoaderCircle,
      lucideReceiptText,
      lucideTicket,
      lucideWallet,
      lucideWifi,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerVouchersPage implements OnInit {
  private readonly voucherService = inject(CustomerVoucherService);
  private readonly dialogService = inject(ResponsiveDialogService);

  protected readonly activeTab = signal<VoucherTab>('available');
  protected readonly pointsBalance = signal(0);
  protected readonly vouchers = signal<CustomerVoucherCatalogItem[]>([]);
  protected readonly redemptions = signal<CustomerVoucherRedemption[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly redeemingVoucherId = signal<string | null>(null);
  protected readonly filters: FilterOption<VoucherTab>[] = [
    { value: 'available', label: 'Available' },
    { value: 'redeemed', label: 'My Vouchers' },
  ];

  protected readonly redeemedCount = computed(() => this.redemptions().length);
  protected readonly affordableCount = computed(
    () => this.vouchers().filter((voucher) => voucher.canRedeem).length,
  );
  protected readonly stats = computed<StatCardItem[]>(() => [
    { icon: 'lucideWallet', label: 'Available Points', value: this.pointsBalance(), unit: 'pts' },
    { icon: 'lucideGift', label: 'Can Redeem', value: this.affordableCount() },
    { icon: 'lucideTicket', label: 'Available Vouchers', value: this.vouchers().length, spanClass: 'col-span-2 sm:col-span-1'},
  ]);
  protected readonly voucherListDescription = computed(() => {
    if (this.activeTab() === 'available') {
      const count = this.vouchers().length;
      return `${count} available reward${count === 1 ? '' : 's'}`;
    }

    const count = this.redemptions().length;
    return `${count} redeemed voucher${count === 1 ? '' : 's'}`;
  });

  ngOnInit(): void {
    void this.loadVouchers();
  }

  protected selectTab(tab: VoucherTab): void {
    this.activeTab.set(tab);
  }

  protected toAvailableCard(v: CustomerVoucherCatalogItem): VoucherCardItem {
    return {
      imageUrl: v.imageUrl,
      title: v.title,
      description: v.description || 'Reward voucher',
      leftValue: v.pointsCost,
      leftLabel: 'pts',
      leftIcon: 'lucideCoins',
      badgeLabel: this.stockLabel(v),
      meta: v.expiresAt
        ? `Exp. ${new Date(v.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
        : null,
    };
  }

  protected toRedeemedCard(r: CustomerVoucherRedemption): VoucherCardItem {
    return {
      imageUrl: r.voucher.imageUrl,
      title: r.voucher.title,
      description: `#${this.shortId(r.id)} · ${new Date(r.redeemedAt).toLocaleString()}`,
      leftValue: r.pointsSpent,
      leftLabel: 'pts used',
      leftIcon: 'lucideBadgeCheck',
      badgeLabel: r.status,
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      code: r.redeemedCode || null,
    };
  }

  protected redeemVoucher(voucher: CustomerVoucherCatalogItem): void {
    if (!voucher.canRedeem || this.redeemingVoucherId()) {
      return;
    }

    this.dialogService.create({
      zTitle: 'Redeem Voucher',
      zDescription: `Redeem ${voucher.title} for ${voucher.pointsCost} points?`,
      zOkText: 'Redeem',
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.redeemingVoucherId.set(voucher.id);
        this.voucherService.redeemVoucher(voucher.id).subscribe({
          next: (response) => {
            this.pointsBalance.set(response.pointsBalance);
            this.redemptions.update((list) => [response.redemption, ...list]);
            this.vouchers.update((list) =>
              list.map((item) => {
                if (item.id !== voucher.id) {
                  const reason = this.reasonFor(item, response.pointsBalance);
                  return {
                    ...item,
                    canRedeem: reason === null,
                    unavailableReason: reason,
                  };
                }

                const nextStock =
                  item.stock === null ? null : Math.max(item.stock - 1, 0);
                const updated = {
                  ...item,
                  stock: nextStock,
                  redemptionCount: item.redemptionCount + 1,
                };
                const reason = this.reasonFor(updated, response.pointsBalance);
                return {
                  ...updated,
                  canRedeem: reason === null,
                  unavailableReason: reason,
                };
              }),
            );
            this.activeTab.set('redeemed');
            this.dialogService.create({
              zTitle: 'Voucher Redeemed',
              zDescription: response.redemption.redeemedCode
                ? `Your code is ${response.redemption.redeemedCode}.`
                : 'Your voucher has been added to your redeemed vouchers.',
              zOkText: 'Done',
              zWidth: 'max-w-sm',
            });
          },
          error: (err) => this.showError(err, 'Unable to redeem voucher.'),
          complete: () => this.redeemingVoucherId.set(null),
        });
      },
    });
  }

  protected stockLabel(voucher: CustomerVoucherCatalogItem): string {
    return voucher.stock === null ? 'Unlimited' : `${voucher.stock} left`;
  }

  protected shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
  }

  private async loadVouchers(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const [catalog, redemptions] = await Promise.all([
        firstValueFrom(this.voucherService.listVouchers()),
        firstValueFrom(this.voucherService.listRedemptions()),
      ]);

      this.pointsBalance.set(catalog.pointsBalance);
      this.vouchers.set(catalog.vouchers);
      this.redemptions.set(redemptions.redemptions);
    } catch (err) {
      console.error('Failed to load vouchers:', err);
      this.vouchers.set([]);
      this.redemptions.set([]);
      this.loadError.set('Unable to load vouchers.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private reasonFor(
    voucher: CustomerVoucherCatalogItem,
    pointsBalance: number,
  ): string | null {
    const now = Date.now();
    if (voucher.startsAt && new Date(voucher.startsAt).getTime() > now)
      return 'Voucher is not available yet.';
    if (voucher.expiresAt && new Date(voucher.expiresAt).getTime() <= now)
      return 'Voucher has expired.';
    if (voucher.stock !== null && voucher.stock <= 0)
      return 'Voucher is out of stock.';
    if (pointsBalance < voucher.pointsCost) return 'Not enough points.';
    return null;
  }

  private showError(err: unknown, fallback: string): void {
    const message = getErrorMessage(err) || fallback;
    this.dialogService.create({
      zTitle: 'Action failed',
      zDescription: message,
      zOkText: 'OK',
      zWidth: 'max-w-sm',
    });
    this.redeemingVoucherId.set(null);
  }
}

function getErrorMessage(err: unknown): string | null {
  if (typeof err !== 'object' || err === null || !('error' in err)) {
    return null;
  }

  const response = (err as { error?: unknown }).error;
  if (
    typeof response === 'object' &&
    response !== null &&
    'error' in response
  ) {
    const message = (response as { error?: unknown }).error;
    return typeof message === 'string' ? message : null;
  }

  return null;
}
