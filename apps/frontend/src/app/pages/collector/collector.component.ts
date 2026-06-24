import { AppHeaderComponent } from '@/ui/header/header.component';
import { CollectorPickupService } from '@/services/collector-pickup.service';
import { ROUTE_PATHS } from '@/app.routes';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle2,
  lucideLoaderCircle,
  lucideNavigation,
  lucidePackage,
  lucideScale,
  lucideTruck,
  lucideWifi,
} from '@ng-icons/lucide';
import { firstValueFrom, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '@/services/notification.service';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import {
  PickupStatus,
  type CollectionLocation,
  type CollectorPickupRequest,
} from '@wastegrab/shared';

import { CollectorHeroComponent } from './_components/collector-hero.component';
import { CollectorNextPickupComponent } from './_components/collector-next-pickup.component';
import { CollectorPickupListComponent } from './_components/collector-pickup-list.component';
import { CollectorLocationsPanelComponent } from './_components/collector-locations-panel.component';
import type {
  CollectorFeaturedPickup,
  CollectorLocationCardItem,
  CollectorPickupCardItem,
  CollectorStatItem,
} from './_components/collector.models';

@Component({
  selector: 'app-collector-page',
  templateUrl: './collector.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppHeaderComponent,
    RouterLink,
    NgIcon,
    EmptyStateComponent,
    CollectorHeroComponent,
    CollectorNextPickupComponent,
    CollectorPickupListComponent,
    CollectorLocationsPanelComponent,
  ],
  viewProviders: [
    provideIcons({
      lucideCheckCircle2,
      lucideLoaderCircle,
      lucideNavigation,
      lucidePackage,
      lucideScale,
      lucideTruck,
      lucideWifi,
    }),
  ],
})
export class CollectorPage {
  private readonly pickupService = inject(CollectorPickupService);
  private readonly notificationService = inject(NotificationService);

  protected readonly pickupsPath = [
    '/',
    ROUTE_PATHS.collector.base,
    ROUTE_PATHS.collector.pickups,
  ];
  protected readonly myPickupsPath = [
    '/',
    ROUTE_PATHS.collector.base,
    ROUTE_PATHS.collector.myPickups,
  ];
  protected readonly earningsPath = [
    '/',
    ROUTE_PATHS.collector.base,
    ROUTE_PATHS.collector.earnings,
  ];

  protected readonly availablePickups = signal<CollectorPickupRequest[]>([]);
  protected readonly myPickups = signal<CollectorPickupRequest[]>([]);
  protected readonly collectionLocations = signal<CollectionLocation[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');

  private readonly activeMyPickups = computed(() =>
    this.myPickups().filter((pickup) => this.isActiveStatus(pickup.status)),
  );
  private readonly completedPickups = computed(() =>
    this.myPickups().filter((pickup) => pickup.status === PickupStatus.COMPLETED),
  );
  private readonly nextPickup = computed(
    () => this.activeMyPickups()[0] ?? this.availablePickups()[0] ?? null,
  );

  protected readonly stats = computed<CollectorStatItem[]>(() => [
    {
      label: 'Available',
      value: String(this.availablePickups().length),
      icon: 'lucidePackage',
    },
    {
      label: 'In Progress',
      value: String(this.activeMyPickups().length),
      icon: 'lucideTruck',
    },
    {
      label: 'Completed',
      value: String(this.completedPickups().length),
      icon: 'lucideCheckCircle2',
    },
    {
      label: 'Est. Weight',
      value: `${this.totalWeight(this.myPickups()).toFixed(1)} kg`,
      icon: 'lucideScale',
    },
  ]);

  protected readonly featuredPickup = computed<CollectorFeaturedPickup | null>(
    () => {
      const pickup = this.nextPickup();
      if (!pickup) return null;
      const base = pickup.collectorId ? this.myPickupsPath : this.pickupsPath;
      return {
        id: pickup.id,
        shortId: this.shortId(pickup.id),
        badge: pickup.collectorId ? 'Next Assignment' : 'Recommended Request',
        customer: this.customerLabel(pickup),
        address: pickup.addressText,
        statusLabel: this.statusLabel(pickup.status),
        statusClass: this.statusClass(pickup.status),
        categoryLabel: this.categoryLabel(pickup),
        weightLabel: `${this.pickupWeight(pickup).toFixed(1)} kg`,
        distanceLabel: this.distanceLabel(pickup),
        detailRoute: [...base, pickup.id],
      };
    },
  );

  protected readonly activeAssignments = computed<CollectorPickupCardItem[]>(() =>
    this.activeMyPickups()
      .slice(0, 4)
      .map((pickup) => ({
        id: pickup.id,
        customer: this.customerLabel(pickup),
        subtitle: pickup.addressText,
        weightLabel: `${this.pickupWeight(pickup).toFixed(1)} kg`,
        detailRoute: [...this.myPickupsPath, pickup.id],
      })),
  );

  protected readonly nearbyRequests = computed<CollectorPickupCardItem[]>(() =>
    this.availablePickups()
      .slice(0, 3)
      .map((pickup) => ({
        id: pickup.id,
        customer: this.customerLabel(pickup),
        subtitle: `${this.categoryLabel(pickup)} · ${this.distanceLabel(pickup)}`,
        weightLabel: `${this.pickupWeight(pickup).toFixed(1)} kg`,
        detailRoute: [...this.pickupsPath, pickup.id],
      })),
  );

  protected readonly locationCards = computed<CollectorLocationCardItem[]>(() =>
    this.collectionLocations()
      .slice(0, 3)
      .map((location) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        detailRoute: ['/', 'collector', 'locations', this.locationSlug(location)],
      })),
  );

  constructor() {
    void this.loadDashboard();
    interval(30_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        void this.loadDashboard();
      });
    effect(() => {
      if (this.notificationService.pickupUpdate()) void this.loadDashboard();
    });
  }

  private shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
  }

  private customerLabel(pickup: CollectorPickupRequest): string {
    return pickup.user?.name || pickup.user?.email || 'Customer';
  }

  private categoryLabel(pickup: CollectorPickupRequest): string {
    return (
      pickup.aiClassificationLabel ||
      `${pickup.items.length} item${pickup.items.length === 1 ? '' : 's'}`
    );
  }

  private pickupWeight(pickup: CollectorPickupRequest): number {
    return pickup.items.reduce(
      (total, item) =>
        total + Number(item.actualWeight ?? item.estimatedWeight ?? 0),
      0,
    );
  }

  private distanceLabel(pickup: CollectorPickupRequest): string {
    const distance = Number(pickup.distanceKm);
    return Number.isFinite(distance)
      ? `${distance.toFixed(distance < 10 ? 1 : 0)} km`
      : 'Route pending';
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

  private locationSlug(location: CollectionLocation): string {
    const slug =
      location.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'location';

    return `${slug}--${location.id}`;
  }

  private async loadDashboard(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const [availableResponse, myResponse, locations] = await Promise.all([
        firstValueFrom(this.pickupService.listPickups({ scope: 'available' })),
        firstValueFrom(this.pickupService.listPickups({ scope: 'my' })),
        firstValueFrom(this.pickupService.listCollectionLocations()),
      ]);
      this.availablePickups.set(availableResponse.pickupRequests);
      this.myPickups.set(myResponse.pickupRequests);
      this.collectionLocations.set(locations);
    } catch (err) {
      console.error('Failed to load collector dashboard:', err);
      this.loadError.set('Unable to load collector dashboard data.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private isActiveStatus(status: PickupStatus): boolean {
    return (
      status !== PickupStatus.COMPLETED && status !== PickupStatus.CANCELLED
    );
  }

  private totalWeight(pickups: CollectorPickupRequest[]): number {
    return pickups.reduce(
      (total, pickup) => total + this.pickupWeight(pickup),
      0,
    );
  }
}
