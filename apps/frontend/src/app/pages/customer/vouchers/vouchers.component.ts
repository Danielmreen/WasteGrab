import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBadgeCheck,
  lucideCoins,
  lucideGift,
  lucideReceiptText,
  lucideRefreshCw,
  lucideTicket,
} from '@ng-icons/lucide';
import { firstValueFrom } from 'rxjs';

import { AppHeaderComponent } from '@/ui/header/header.component';
import { ZardButtonComponent } from '@/ui/zard/button/button.component';
import { ZardDialogService } from '@/ui/zard/dialog/dialog.service';
import { CustomerVoucherService } from '@/services/customer-voucher.service';
import type {
  CustomerVoucherCatalogItem,
  CustomerVoucherRedemption,
} from '@wastegrab/shared';

type VoucherTab = 'available' | 'redeemed';

@Component({
  selector: 'app-customer-vouchers-page',
  templateUrl: './vouchers.html',
  imports: [CommonModule, AppHeaderComponent, ZardButtonComponent, NgIcon],
  viewProviders: [
    provideIcons({
      lucideBadgeCheck,
      lucideCoins,
      lucideGift,
      lucideReceiptText,
      lucideRefreshCw,
      lucideTicket,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerVouchersPage implements OnInit {
  private readonly voucherService = inject(CustomerVoucherService);
  private readonly dialogService = inject(ZardDialogService);

  protected readonly activeTab = signal<VoucherTab>('available');
  protected readonly pointsBalance = signal(0);
  protected readonly vouchers = signal<CustomerVoucherCatalogItem[]>([]);
  protected readonly redemptions = signal<CustomerVoucherRedemption[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly redeemingVoucherId = signal<string | null>(null);

  protected readonly redeemedCount = computed(() => this.redemptions().length);
  protected readonly affordableCount = computed(() => (
    this.vouchers().filter((voucher) => voucher.canRedeem).length
  ));

  ngOnInit(): void {
    void this.loadVouchers();
  }

  protected selectTab(tab: VoucherTab): void {
    this.activeTab.set(tab);
  }

  protected refresh(): void {
    void this.loadVouchers();
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
            this.vouchers.update((list) => list.map((item) => {
              if (item.id !== voucher.id) {
                const reason = this.reasonFor(item, response.pointsBalance);
                return {
                  ...item,
                  canRedeem: reason === null,
                  unavailableReason: reason,
                };
              }

              const nextStock = item.stock === null ? null : Math.max(item.stock - 1, 0);
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
            }));
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
    } finally {
      this.isLoading.set(false);
    }
  }

  private reasonFor(voucher: CustomerVoucherCatalogItem, pointsBalance: number): string | null {
    const now = Date.now();
    if (voucher.startsAt && new Date(voucher.startsAt).getTime() > now) return 'Voucher is not available yet.';
    if (voucher.expiresAt && new Date(voucher.expiresAt).getTime() <= now) return 'Voucher has expired.';
    if (voucher.stock !== null && voucher.stock <= 0) return 'Voucher is out of stock.';
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
  if (typeof response === 'object' && response !== null && 'error' in response) {
    const message = (response as { error?: unknown }).error;
    return typeof message === 'string' ? message : null;
  }

  return null;
}
