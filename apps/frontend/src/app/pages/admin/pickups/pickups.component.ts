import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowUpRight,
  lucideCheckCircle2,
  lucideClock3,
  lucideCoins,
  lucideImage,
  lucideLoaderCircle,
  lucideMapPin,
  lucidePackageCheck,
  lucideScale,
  lucideTruck,
  lucideXCircle,
} from '@ng-icons/lucide';
import { firstValueFrom, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminPickupService } from '@/services/admin-pickup.service';
import { ImageType, PickupStatus, type AdminPickupRequest } from '@wastegrab/shared';

import { AppHeaderComponent } from '@/ui/header/header.component';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import { TableHeaderComponent } from '@/ui/table-header/table-header.component';
import { StatGridComponent } from '@/ui/stat-card/stat-grid.component';
import type { StatCardItem } from '@/ui/stat-card/stat-card.models';
import { ZardTableImports } from '@/ui/zard/table';
import { DecimalPipe } from '@angular/common';

type PickupFilter = 'all' | 'active' | 'completed' | 'cancelled';

@Component({
  selector: 'app-admin-pickups-page',
  templateUrl: './pickups.html',
  imports: [RouterLink, AppHeaderComponent, EmptyStateComponent, TableHeaderComponent, DecimalPipe, StatGridComponent, NgIcon, ...ZardTableImports],
  viewProviders: [
    provideIcons({
      lucideArrowUpRight,
      lucideCheckCircle2,
      lucideClock3,
      lucideCoins,
      lucideImage,
      lucideLoaderCircle,
      lucideMapPin,
      lucidePackageCheck,
      lucideScale,
      lucideTruck,
      lucideXCircle,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPickupsPage {
  private readonly pickupService = inject(AdminPickupService);

  protected readonly pickups = signal<AdminPickupRequest[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly activeFilter = signal<PickupFilter>('all');
  protected readonly PickupStatus = PickupStatus;

  protected readonly filters: Array<{ value: PickupFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  protected readonly activePickups = computed(() => this.pickups().filter((pickup) => this.isActiveStatus(pickup.status)));
  protected readonly completedPickups = computed(() => this.pickups().filter((pickup) => pickup.status === PickupStatus.COMPLETED));
  protected readonly cancelledPickups = computed(() => this.pickups().filter((pickup) => pickup.status === PickupStatus.CANCELLED));
  protected readonly totalPotentialPoints = computed(() => this.pickups().reduce((total, pickup) => total + this.potentialPoints(pickup), 0));
  protected readonly stats = computed<StatCardItem[]>(() => [
    { icon: 'lucidePackageCheck', label: 'Total', value: this.pickups().length },
    { icon: 'lucideTruck', label: 'Active', value: this.activePickups().length },
    { icon: 'lucideCheckCircle2', label: 'Completed', value: this.completedPickups().length },
    { icon: 'lucideCoins', label: 'Pickup Points', value: this.totalPotentialPoints(), unit: 'pts' },
  ]);

  protected readonly filteredPickups = computed(() => {
    const filter = this.activeFilter();
    const pickups = this.sortedPickups(this.pickups());

    if (filter === 'active') return pickups.filter((pickup) => this.isActiveStatus(pickup.status));
    if (filter === 'completed') return pickups.filter((pickup) => pickup.status === PickupStatus.COMPLETED);
    if (filter === 'cancelled') return pickups.filter((pickup) => pickup.status === PickupStatus.CANCELLED);
    return pickups;
  });

  constructor() {
    void this.loadPickups();
    interval(60_000).pipe(takeUntilDestroyed()).subscribe(() => {
      void this.loadPickups();
    });
  }

  protected setFilter(filter: PickupFilter): void {
    this.activeFilter.set(filter);
  }

  protected statusLabel(status: PickupStatus): string {
    return this.statusMeta(status).label;
  }

  protected statusClass(status: PickupStatus): string {
    return this.statusMeta(status).className;
  }

  protected statusIcon(status: PickupStatus): string {
    return this.statusMeta(status).icon;
  }

  protected shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected requestWeight(pickup: AdminPickupRequest): number {
    return pickup.items.reduce(
      (total, item) => total + Number(item.actualWeight ?? item.estimatedWeight ?? 0),
      0,
    );
  }

  protected potentialPoints(pickup: AdminPickupRequest): number {
    return pickup.items.reduce((total, item) => {
      const weight = Number(item.actualWeight ?? item.estimatedWeight ?? 0);
      return total + Math.round(weight * (item.category?.pointsPerKg ?? 0));
    }, 0);
  }

  protected pointsLabel(pickup: AdminPickupRequest): string {
    return pickup.status === PickupStatus.COMPLETED ? 'Awarded' : 'Potential';
  }

  protected categoryLabel(pickup: AdminPickupRequest): string {
    return pickup.aiClassificationLabel || `${pickup.items.length} waste item${pickup.items.length === 1 ? '' : 's'}`;
  }

  protected primaryImage(pickup: AdminPickupRequest): string | null {
    return pickup.images.find((image) => image.imageType === ImageType.USER_UPLOAD)?.imageUrl ?? null;
  }

  private async loadPickups(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');

    try {
      const response = await firstValueFrom(this.pickupService.listPickups());
      this.pickups.set(response.pickupRequests);
    } catch {
      this.loadError.set('Unable to load pickup requests.');
      this.pickups.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private isActiveStatus(status: PickupStatus): boolean {
    return ![PickupStatus.COMPLETED, PickupStatus.CANCELLED].includes(status);
  }

  private sortedPickups(pickups: AdminPickupRequest[]): AdminPickupRequest[] {
    return [...pickups].sort((a, b) => {
      const aCompleted = a.status === PickupStatus.COMPLETED ? 1 : 0;
      const bCompleted = b.status === PickupStatus.COMPLETED ? 1 : 0;

      if (aCompleted !== bCompleted) {
        return aCompleted - bCompleted;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  private statusMeta(status: PickupStatus): { label: string; className: string; icon: string } {
    switch (status) {
      case PickupStatus.PENDING:
        return { label: 'Pending', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', icon: 'lucideClock3' };
      case PickupStatus.ACCEPTED:
        return { label: 'Accepted', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300', icon: 'lucideTruck' };
      case PickupStatus.ARRIVED:
        return { label: 'Arrived', className: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', icon: 'lucideMapPin' };
      case PickupStatus.VERIFIED:
        return { label: 'Verified', className: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300', icon: 'lucideCheckCircle2' };
      case PickupStatus.COMPLETED:
        return { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', icon: 'lucidePackageCheck' };
      case PickupStatus.CANCELLED:
        return { label: 'Cancelled', className: 'bg-rose-500/10 text-rose-700 dark:text-rose-300', icon: 'lucideXCircle' };
      default:
        return { label: status, className: 'bg-muted text-muted-foreground', icon: 'lucideLoaderCircle' };
    }
  }
}
