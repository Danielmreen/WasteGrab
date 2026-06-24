import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideArrowUpRight,
  lucideCheckCircle2,
  lucideClock3,
  lucideCoins,
  lucideLoaderCircle,
  lucideMapPin,
  lucidePackage,
  lucidePackageCheck,
  lucidePlus,
  lucideRecycle,
  lucideScale,
  lucideTruck,
  lucideWifi,
} from '@ng-icons/lucide';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';

import { AppHeaderComponent } from '@/ui/header/header.component';
import { StatGridComponent } from '@/ui/stat-card/stat-grid.component';
import { TableHeaderComponent } from '@/ui/table-header/table-header.component';
import type { StatCardItem } from '@/ui/stat-card/stat-card.models';
import { CustomerPickupListItemComponent } from '../_components/customer-pickup-list-item.component';
import { PickupRequestService } from '@/services/pickup-request.service';
import { NotificationService } from '@/services/notification.service';
import {
  ImageType,
  PickupStatus,
  type PickupRequestWithDetails,
} from '@wastegrab/shared';
import type { CustomerPickupSummary } from '../_components/customer-dashboard.models';

type RequestFilter = 'all' | 'active' | 'completed' | 'cancelled';

@Component({
  selector: 'app-customer-pickups-page',
  templateUrl: './pickups.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AppHeaderComponent,
    EmptyStateComponent,
    StatGridComponent,
    TableHeaderComponent,
    NgIcon,
    CustomerPickupListItemComponent,
  ],
  viewProviders: [
    provideIcons({
      lucideAlertCircle,
      lucideArrowUpRight,
      lucideCheckCircle2,
      lucideClock3,
      lucideCoins,
      lucideLoaderCircle,
      lucideMapPin,
      lucidePackage,
      lucidePackageCheck,
      lucidePlus,
      lucideRecycle,
      lucideScale,
      lucideTruck,
      lucideWifi,
    }),
  ],
})
export class CustomerPickupsPage {
  private readonly pickupRequests = inject(PickupRequestService);
  private readonly notificationService = inject(NotificationService);

  protected readonly requests = signal<PickupRequestWithDetails[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly activeFilter = signal<RequestFilter>('all');

  protected readonly filters = [
    { value: 'all' as const, label: 'All' },
    { value: 'active' as const, label: 'Active' },
    { value: 'completed' as const, label: 'Completed' },
    { value: 'cancelled' as const, label: 'Cancelled' },
  ];

  protected readonly progressSteps = [
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

  protected readonly activeRequests = computed(() =>
    this.requests().filter((r) => this.isActive(r.status)),
  );
  protected readonly latestActiveRequest = computed(
    () => this.activeRequests()[0] ?? null,
  );

  protected readonly totalWeight = computed(() =>
    this.requests().reduce((t, r) => t + this.weight(r), 0),
  );
  protected readonly totalPoints = computed(() =>
    this.requests().reduce((t, r) => t + this.points(r), 0),
  );

  protected readonly pageStats = computed<StatCardItem[]>(() => [
    {
      icon: 'lucidePackage',
      label: 'Total Requests',
      value: this.requests().length,
      tone: 'brand',
    },
    {
      icon: 'lucideTruck',
      label: 'Active',
      value: this.activeRequests().length,
      tone: 'brand',
    },
    {
      icon: 'lucideScale',
      label: 'Contributed',
      value: this.totalWeight().toFixed(1),
      unit: 'kg',
      tone: 'brand',
    },
    {
      icon: 'lucideCoins',
      label: 'Potential Points',
      value: this.totalPoints(),
      tone: 'brand',
    },
  ]);

  protected readonly summaries = computed(() =>
    this.sorted(this.requests()).map((r) => this.toSummary(r)),
  );

  protected readonly filteredSummaries = computed(() => {
    const f = this.activeFilter();
    const all = this.summaries();
    if (f === 'all') return all;
    if (f === 'active') return all.filter((s) => s.isActive);
    if (f === 'completed')
      return all.filter((s) => s.status === PickupStatus.COMPLETED);
    return all.filter((s) => s.status === PickupStatus.CANCELLED);
  });

  constructor() {
    void this.load();
    interval(30_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => void this.load());
    effect(() => {
      if (this.notificationService.pickupUpdate()) void this.load();
    });
  }

  protected setFilter(f: string): void {
    this.activeFilter.set(f as RequestFilter);
  }

  protected isActive(status: PickupStatus): boolean {
    return [
      PickupStatus.PENDING,
      PickupStatus.ACCEPTED,
      PickupStatus.ARRIVED,
      PickupStatus.VERIFIED,
    ].includes(status);
  }

  protected isStepComplete(
    request: PickupRequestWithDetails,
    step: PickupStatus,
  ): boolean {
    const order = [
      PickupStatus.PENDING,
      PickupStatus.ACCEPTED,
      PickupStatus.ARRIVED,
      PickupStatus.VERIFIED,
      PickupStatus.COMPLETED,
    ];
    return order.indexOf(request.status) > order.indexOf(step);
  }

  protected isCurrentStep(
    request: PickupRequestWithDetails,
    step: PickupStatus,
  ): boolean {
    return request.status === step;
  }

  protected categoryLabel(r: PickupRequestWithDetails): string {
    return (
      r.aiClassificationLabel ||
      `${r.items.length} waste item${r.items.length === 1 ? '' : 's'}`
    );
  }

  protected primaryImage(r: PickupRequestWithDetails): string | null {
    return (
      r.images.find((i) => i.imageType === ImageType.USER_UPLOAD)?.imageUrl ??
      null
    );
  }

  protected shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const res = await firstValueFrom(
        this.pickupRequests.listPickupRequests(),
      );
      this.requests.set(res.pickupRequests);
    } catch {
      this.loadError.set('Unable to load pickup requests.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private weight(r: PickupRequestWithDetails): number {
    return r.items.reduce(
      (t, i) => t + Number(i.actualWeight ?? i.estimatedWeight ?? 0),
      0,
    );
  }

  private points(r: PickupRequestWithDetails): number {
    return r.items.reduce((t, i) => {
      const w = Number(i.actualWeight ?? i.estimatedWeight ?? 0);
      return t + Math.round(w * (i.category?.pointsPerKg ?? 0));
    }, 0);
  }

  private sorted(
    requests: PickupRequestWithDetails[],
  ): PickupRequestWithDetails[] {
    const rank = (s: PickupStatus) =>
      s === PickupStatus.COMPLETED ? 2 : s === PickupStatus.CANCELLED ? 1 : 0;
    return [...requests].sort((a, b) => {
      const diff = rank(a.status) - rank(b.status);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  private toSummary(r: PickupRequestWithDetails): CustomerPickupSummary {
    const meta = this.statusMeta(r.status);
    return {
      id: r.id,
      shortId: this.shortId(r.id),
      title: this.categoryLabel(r),
      address: r.addressText,
      status: r.status,
      statusLabel: meta.label,
      statusClass: meta.className,
      statusIcon: meta.icon,
      imageUrl: this.primaryImage(r),
      weightKg: this.weight(r),
      points: this.points(r),
      pointsLabel:
        r.status === PickupStatus.COMPLETED ? 'pts' : 'Potential pts',
      itemCount: r.items.length,
      isActive: this.isActive(r.status),
      createdAtLabel: new Date(r.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      createdAtFullLabel: new Intl.DateTimeFormat('en-MY', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(r.createdAt)),
      detailRoute: ['/customer/pickups', r.id],
      statusMessage: '',
    };
  }

  private statusMeta(status: PickupStatus): {
    label: string;
    className: string;
    icon: string;
  } {
    switch (status) {
      case PickupStatus.PENDING:
        return {
          label: 'Pending',
          className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
          icon: 'lucideClock3',
        };
      case PickupStatus.ACCEPTED:
        return {
          label: 'Accepted',
          className: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
          icon: 'lucideTruck',
        };
      case PickupStatus.ARRIVED:
        return {
          label: 'Arrived',
          className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
          icon: 'lucideMapPin',
        };
      case PickupStatus.VERIFIED:
        return {
          label: 'Verified',
          className: 'bg-primary/10 text-primary',
          icon: 'lucideCheckCircle2',
        };
      case PickupStatus.COMPLETED:
        return {
          label: 'Completed',
          className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
          icon: 'lucideCheckCircle2',
        };
      case PickupStatus.CANCELLED:
        return {
          label: 'Cancelled',
          className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
          icon: 'lucideAlertCircle',
        };
    }
  }
}
