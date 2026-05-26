import { AppHeaderComponent } from '@/ui/header/header.component';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideArrowUpRight,
  lucideCheckCircle2,
  lucideClock3,
  lucideCoins,
  lucideImage,
  lucideListFilter,
  lucideLoaderCircle,
  lucideMapPin,
  lucidePackage,
  lucidePlus,
  lucideRecycle,
  lucideScale,
  lucideTruck,
} from '@ng-icons/lucide';
import { PickupRequestService } from '@/services/pickup-request.service';
import { ImageType, PickupStatus, type PickupRequestWithDetails } from '@wastegrab/shared';

type RequestFilter = 'all' | 'active' | 'completed' | 'cancelled';

type FilterOption = {
  value: RequestFilter;
  label: string;
};

@Component({
  selector: 'app-customer-pickups-page',
  templateUrl: './pickups.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AppHeaderComponent, NgIcon, RouterLink],
  viewProviders: [
    provideIcons({
      lucideAlertCircle,
      lucideArrowUpRight,
      lucideCheckCircle2,
      lucideClock3,
      lucideCoins,
      lucideImage,
      lucideListFilter,
      lucideLoaderCircle,
      lucideMapPin,
      lucidePackage,
      lucidePlus,
      lucideRecycle,
      lucideScale,
      lucideTruck,
    }),
  ],
})
export class CustomerPickupsPage {
  private readonly pickupRequests = inject(PickupRequestService);

  protected readonly requests = signal<PickupRequestWithDetails[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly activeFilter = signal<RequestFilter>('all');

  protected readonly filters: FilterOption[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  protected readonly filteredRequests = computed(() => {
    const filter = this.activeFilter();
    const requests = this.requests();

    if (filter === 'all') {
      return requests;
    }

    if (filter === 'active') {
      return requests.filter((request) => this.isActiveStatus(request.status));
    }

    if (filter === 'completed') {
      return requests.filter((request) => request.status === PickupStatus.COMPLETED);
    }

    return requests.filter((request) => request.status === PickupStatus.CANCELLED);
  });

  protected readonly activeRequests = computed(() =>
    this.requests().filter((request) => this.isActiveStatus(request.status)),
  );

  protected readonly latestActiveRequest = computed(() => this.activeRequests()[0] ?? null);

  protected readonly totalEstimatedWeight = computed(() =>
    this.requests().reduce((total, request) => total + this.requestWeight(request), 0),
  );

  protected readonly totalImages = computed(() =>
    this.requests().reduce((total, request) => total + request.images.length, 0),
  );

  protected readonly totalPotentialPoints = computed(() =>
    this.requests().reduce((total, request) => total + this.potentialPoints(request), 0),
  );

  constructor() {
    void this.loadPickupRequests();
  }

  protected setFilter(filter: RequestFilter): void {
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

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  protected shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
  }

  protected requestWeight(request: PickupRequestWithDetails): number {
    return request.items.reduce(
      (total, item) => total + Number(item.actualWeight ?? item.estimatedWeight ?? 0),
      0,
    );
  }

  protected potentialPoints(request: PickupRequestWithDetails): number {
    return request.items.reduce((total, item) => {
      const weight = Number(item.actualWeight ?? item.estimatedWeight ?? 0);
      return total + Math.round(weight * (item.category?.pointsPerKg ?? 0));
    }, 0);
  }

  protected categoryLabel(request: PickupRequestWithDetails): string {
    return request.aiClassificationLabel || `${request.items.length} waste item${request.items.length === 1 ? '' : 's'}`;
  }

  protected primaryImage(request: PickupRequestWithDetails): string | null {
    return request.images.find((image) => image.imageType === ImageType.USER_UPLOAD)?.imageUrl ?? null;
  }

  private async loadPickupRequests(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');

    try {
      const response = await firstValueFrom(this.pickupRequests.listPickupRequests());
      this.requests.set(response.pickupRequests);
    } catch (err) {
      console.error('Failed to load pickup requests:', err);
      this.loadError.set('Unable to load pickup requests.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private isActiveStatus(status: PickupStatus): boolean {
    return [
      PickupStatus.PENDING,
      PickupStatus.ACCEPTED,
      PickupStatus.ARRIVED,
      PickupStatus.VERIFIED,
    ].includes(status);
  }

  private statusMeta(status: PickupStatus): { label: string; className: string; icon: string } {
    switch (status) {
      case PickupStatus.PENDING:
        return { label: 'Pending', className: 'bg-amber-100 text-amber-800', icon: 'lucideClock3' };
      case PickupStatus.ACCEPTED:
        return { label: 'Accepted', className: 'bg-sky-100 text-sky-800', icon: 'lucideTruck' };
      case PickupStatus.ARRIVED:
        return { label: 'Arrived', className: 'bg-indigo-100 text-indigo-800', icon: 'lucideMapPin' };
      case PickupStatus.VERIFIED:
        return { label: 'Verified', className: 'bg-primary/10 text-primary', icon: 'lucideCheckCircle2' };
      case PickupStatus.COMPLETED:
        return { label: 'Completed', className: 'bg-emerald-100 text-emerald-800', icon: 'lucideCheckCircle2' };
      case PickupStatus.CANCELLED:
        return { label: 'Cancelled', className: 'bg-rose-100 text-rose-800', icon: 'lucideAlertCircle' };
    }
  }
}
