import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle2,
  lucideFileText,
  lucideLoaderCircle,
  lucideScale,
  lucideStar,
  lucideWifi,
} from '@ng-icons/lucide';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import { firstValueFrom, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ROUTE_PATHS } from '@/app.routes';
import { AuthService } from '@/services/auth.service';
import { CustomerVoucherService } from '@/services/customer-voucher.service';
import { PickupRequestService } from '@/services/pickup-request.service';
import { CustomerActivePickupCardComponent } from './_components/customer-active-pickup-card.component';
import { CustomerHeroComponent } from './_components/customer-hero.component';
import { CustomerQuickActionsComponent } from './_components/customer-quick-actions.component';
import { CustomerRankPanelComponent } from './_components/customer-rank-panel.component';
import { CustomerRecentRequestsComponent } from './_components/customer-recent-requests.component';
import { CustomerVoucherPanelComponent } from './_components/customer-voucher-panel.component';
import type {
  CustomerLeaderboardRow,
  CustomerPickupSummary,
  CustomerQuickAction,
  CustomerVoucherSummary,
} from './_components/customer-dashboard.models';
import type { StatCardItem } from '@/ui/stat-card/stat-card.models';
import { StatGridComponent } from '@/ui/stat-card/stat-grid.component';
import {
  ImageType,
  type LeaderboardEntry,
  PickupStatus,
  VoucherRedemptionStatus,
  VoucherStatus,
  type CustomerVoucherRedemption,
  type PickupRequestWithDetails,
  type RewardSummary,
} from '@wastegrab/shared';
import { AppHeaderComponent } from '@/ui/header/header.component';
import { NotificationService } from '@/services/notification.service';

@Component({
  selector: 'app-customer-page',
  templateUrl: './customer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIcon,
    EmptyStateComponent,
    CustomerActivePickupCardComponent,
    CustomerHeroComponent,
    CustomerQuickActionsComponent,
    CustomerRankPanelComponent,
    CustomerRecentRequestsComponent,
    CustomerVoucherPanelComponent,
    AppHeaderComponent,
    StatGridComponent,
  ],
  viewProviders: [
    provideIcons({
      lucideCheckCircle2,
      lucideFileText,
      lucideLoaderCircle,
      lucideScale,
      lucideStar,
      lucideWifi,
    }),
  ],
})
export class CustomerPage {
  protected readonly authService = inject(AuthService);
  private readonly pickupRequests = inject(PickupRequestService);
  private readonly voucherService = inject(CustomerVoucherService);
  private readonly notificationService = inject(NotificationService);

  readonly newPickupPath = [
    '/',
    ROUTE_PATHS.customer.base,
    ROUTE_PATHS.customer.newPickup,
  ];
  readonly pickupsPath = [
    '/',
    ROUTE_PATHS.customer.base,
    ROUTE_PATHS.customer.pickups,
  ];
  readonly vouchersPath = [
    '/',
    ROUTE_PATHS.customer.base,
    ROUTE_PATHS.customer.vouchers,
  ];
  readonly leaderboardPath = [
    '/',
    ROUTE_PATHS.customer.base,
    ROUTE_PATHS.customer.leaderboard,
  ];

  protected readonly requests = signal<PickupRequestWithDetails[]>([]);
  protected readonly rewardSummary = signal<RewardSummary | null>(null);
  protected readonly voucherRedemptions = signal<CustomerVoucherRedemption[]>(
    [],
  );
  protected readonly leaderboard = signal<LeaderboardEntry[]>([]);
  protected readonly currentUserRank = signal<LeaderboardEntry | null>(null);
  protected readonly isLoadingRequests = signal(true);
  protected readonly loadErrorRequests = signal('');

  protected readonly activeRequest = computed(
    () =>
      this.requests().find((request) => this.isActiveStatus(request.status)) ??
      null,
  );
  protected readonly activeRequests = computed(() =>
    this.requests().filter((request) => this.isActiveStatus(request.status)),
  );
  protected readonly recentRequests = computed(() =>
    this.requests().slice(0, 4),
  );
  protected readonly activeVouchers = computed(() =>
    this.voucherRedemptions().filter((redemption) =>
      this.isActiveVoucher(redemption),
    ),
  );
  protected readonly customerName = computed(
    () => this.authService.currentUser()?.name?.trim() || 'Customer',
  );
  protected readonly activePickupSummary =
    computed<CustomerPickupSummary | null>(() => {
      const request = this.activeRequest();
      return request ? this.toPickupSummary(request) : null;
    });
  protected readonly recentPickupSummaries = computed<CustomerPickupSummary[]>(
    () => this.recentRequests().map((request) => this.toPickupSummary(request)),
  );
  protected readonly activeVoucherSummaries = computed<
    CustomerVoucherSummary[]
  >(() =>
    this.activeVouchers()
      .slice(0, 2)
      .map((redemption) => ({
        imageUrl: redemption.voucher.imageUrl ?? null,
        title: redemption.voucher.title,
        code: redemption.redeemedCode || 'No code',
        expiryLabel: this.voucherExpiryLabel(redemption),
        pointsSpent: redemption.pointsSpent,
        route: this.vouchersPath,
      })),
  );
  protected readonly leaderboardRows = computed<CustomerLeaderboardRow[]>(
    () => {
      const entries = this.leaderboard().slice(0, 5);
      const currentRank = this.currentUserRank();

      if (
        currentRank &&
        !entries.some((entry) => entry.userId === currentRank.userId)
      ) {
        entries.push(currentRank);
      }

      return entries.map((entry) => ({
        rank: entry.rank,
        name: entry.name,
        avatarUrl: entry.avatarUrl,
        value: `${Number(entry.totalWeightKg).toFixed(1)} kg`,
        isCurrentUser: entry.isCurrentUser,
        route: this.leaderboardPath,
      }));
    },
  );
  protected readonly quickActions = computed<CustomerQuickAction[]>(() => [
    {
      label: 'Request pickup',
      route: this.newPickupPath,
      icon: 'lucidePlus',
      primary: true,
    },
    {
      label: 'Track requests',
      route: this.pickupsPath,
      icon: 'lucideTruck',
    },
    {
      label: 'Use rewards',
      route: this.vouchersPath,
      icon: 'lucideTicket',
    },
    {
      label: 'View leaderboard',
      route: this.leaderboardPath,
      icon: 'lucideTrophy',
    },
  ]);

  protected readonly dashboardStats = computed<StatCardItem[]>(() => [
    {
      label: 'Total Requests',
      value: String(this.requests().length),
      icon: 'lucideFileText',
      tone: 'brand',
    },
    {
      label: 'Completed',
      value: String(
        this.requests().filter(
          (request) => request.status === PickupStatus.COMPLETED,
        ).length,
      ),
      icon: 'lucideCheckCircle2',
      tone: 'brand',
    },
    {
      label: 'Contributed',
      value: Number(this.rewardSummary()?.completedWeightKg ?? 0).toFixed(1),
      unit: 'kg',
      icon: 'lucideScale',
      tone: 'brand',
    },
    {
      label: 'Points',
      value: `${this.rewardSummary()?.pointsBalance ?? 0}`,
      icon: 'lucideStar',
      tone: 'brand',
    },
  ]);

  constructor() {
    void this.loadPickupRequests();
    interval(60_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        void this.loadPickupRequests();
      });
    effect(() => {
      if (this.notificationService.pickupUpdate())
        void this.loadPickupRequests();
    });
  }

  private shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
  }

  private categoryLabel(request: PickupRequestWithDetails): string {
    return (
      request.aiClassificationLabel ||
      `${request.items.length} waste item${request.items.length === 1 ? '' : 's'}`
    );
  }

  private requestWeight(request: PickupRequestWithDetails): number {
    return request.items.reduce(
      (total, item) =>
        total + Number(item.actualWeight ?? item.estimatedWeight ?? 0),
      0,
    );
  }

  private potentialPoints(request: PickupRequestWithDetails): number {
    return request.items.reduce((total, item) => {
      const weight = Number(item.actualWeight ?? item.estimatedWeight ?? 0);
      return total + Math.round(weight * (item.category?.pointsPerKg ?? 0));
    }, 0);
  }

  private primaryImage(request: PickupRequestWithDetails): string | null {
    return (
      request.images.find((image) => image.imageType === ImageType.USER_UPLOAD)
        ?.imageUrl ?? null
    );
  }

  private voucherExpiryLabel(redemption: CustomerVoucherRedemption): string {
    return redemption.voucher.expiresAt
      ? `Expires ${new Date(redemption.voucher.expiresAt).toLocaleDateString()}`
      : 'No expiry';
  }

  private statusIconName(status: PickupStatus): string {
    switch (status) {
      case PickupStatus.PENDING:
        return 'lucideClock3';
      case PickupStatus.ACCEPTED:
        return 'lucideTruck';
      case PickupStatus.ARRIVED:
        return 'lucideMapPin';
      case PickupStatus.VERIFIED:
        return 'lucideCheckCircle2';
      case PickupStatus.COMPLETED:
        return 'lucideCheckCircle2';
      default:
        return 'lucideAlertCircle';
    }
  }

  private statusLabel(status: PickupStatus): string {
    return status.toLowerCase().replace(/_/g, ' ');
  }

  private statusClass(status: PickupStatus): string {
    switch (status) {
      case PickupStatus.PENDING:
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
      case PickupStatus.ACCEPTED:
      case PickupStatus.ARRIVED:
      case PickupStatus.VERIFIED:
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-300';
      case PickupStatus.COMPLETED:
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }

  private dateLabel(value: string): string {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  private dateTimeLabel(value: string): string {
    return new Date(value).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  private toPickupSummary(
    request: PickupRequestWithDetails,
  ): CustomerPickupSummary {
    return {
      id: request.id,
      shortId: this.shortId(request.id),
      title: this.categoryLabel(request),
      address: request.addressText,
      status: request.status,
      statusLabel: this.statusLabel(request.status),
      statusClass: this.statusClass(request.status),
      statusIcon: this.statusIconName(request.status),
      imageUrl: this.primaryImage(request),
      weightKg: this.requestWeight(request),
      points: this.potentialPoints(request),
      pointsLabel:
        request.status === PickupStatus.COMPLETED ? 'pts' : 'Potential pts',
      itemCount: request.items.length,
      isActive: this.isActiveStatus(request.status),
      createdAtLabel: this.dateLabel(request.createdAt),
      createdAtFullLabel: this.dateTimeLabel(request.createdAt),
      detailRoute: [...this.pickupsPath, request.id],
      statusMessage: this.statusMessage(request.status),
    };
  }

  private statusMessage(status: PickupStatus): string {
    switch (status) {
      case PickupStatus.PENDING:
        return 'Waiting for a collector to accept';
      case PickupStatus.ACCEPTED:
        return 'Collector accepted your pickup';
      case PickupStatus.ARRIVED:
        return 'Collector has arrived';
      case PickupStatus.VERIFIED:
        return 'Waste weight has been verified';
      case PickupStatus.COMPLETED:
        return 'Pickup completed';
      case PickupStatus.CANCELLED:
        return 'Pickup cancelled';
      default:
        return 'Pickup request updated';
    }
  }

  private async loadPickupRequests(): Promise<void> {
    this.isLoadingRequests.set(true);
    this.loadErrorRequests.set('');
    try {
      const [pickupResponse, rewardResponse] = await Promise.all([
        firstValueFrom(this.pickupRequests.listPickupRequests()),
        firstValueFrom(this.pickupRequests.getRewardSummary()),
      ]);

      this.requests.set(pickupResponse.pickupRequests);
      this.rewardSummary.set(rewardResponse.summary);

      const [redemptionResponse, leaderboardResponse] = await Promise.all([
        firstValueFrom(this.voucherService.listRedemptions()).catch((err) => {
          console.warn('Failed to load customer voucher redemptions:', err);
          return null;
        }),
        firstValueFrom(this.pickupRequests.getLeaderboard()).catch((err) => {
          console.warn('Failed to load customer leaderboard:', err);
          return null;
        }),
      ]);

      this.voucherRedemptions.set(redemptionResponse?.redemptions ?? []);
      this.leaderboard.set(leaderboardResponse?.leaderboard ?? []);
      this.currentUserRank.set(leaderboardResponse?.currentUser ?? null);
    } catch (err) {
      console.error('Failed to load pickup requests:', err);
      this.loadErrorRequests.set('Unable to load dashboard data.');
    } finally {
      this.isLoadingRequests.set(false);
    }
  }

  private isActiveStatus(status: PickupStatus): boolean {
    return (
      status !== PickupStatus.COMPLETED && status !== PickupStatus.CANCELLED
    );
  }

  private isActiveVoucher(redemption: CustomerVoucherRedemption): boolean {
    if (redemption.status !== VoucherRedemptionStatus.REDEEMED) return false;
    if (redemption.voucher.status !== VoucherStatus.ACTIVE) return false;
    return (
      !redemption.voucher.expiresAt ||
      new Date(redemption.voucher.expiresAt).getTime() > Date.now()
    );
  }
}
