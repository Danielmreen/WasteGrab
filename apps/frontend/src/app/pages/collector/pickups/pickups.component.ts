import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowUpRight,
  lucideCheckCircle2,
  lucideClock3,
  lucideCoins,
  lucideImage,
  lucideLoaderCircle,
  lucideMapPin,
  lucideNavigation,
  lucidePackageCheck,
  lucideScale,
  lucideTruck,
  lucideWifi,
  lucideXCircle,
} from '@ng-icons/lucide';
import { ImageType, PickupStatus, type CollectionLocation, type CollectorPickupRequest } from '@wastegrab/shared';
import { firstValueFrom, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '@/services/notification.service';

import { CollectorPickupService, type CollectorLocation, type CollectorPickupScope } from '@/services/collector-pickup.service';
import { AppHeaderComponent } from '@/ui/header/header.component';
import { RouteMapComponent, type RouteMapStop } from '@/ui/route-map/route-map.component';
import { TableHeaderComponent } from '@/ui/table-header/table-header.component';
import { StatGridComponent } from '@/ui/stat-card/stat-grid.component';
import type { StatCardItem } from '@/ui/stat-card/stat-card.models';
import { EmptyStateComponent } from '@/ui/empty-state/empty-state.component';
import { ZardTableImports } from '@/ui/zard/table';
import { CollectorLocationBarComponent } from '../_components/collector-location-bar.component';

type PickupFilter = 'all' | 'available' | 'assigned' | 'completed' | 'cancelled';
type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';
type CoordinatePair = {
  latitude: number;
  longitude: number;
};
type RouteFitAnchor = CoordinatePair & {
  label: string;
};
type RouteFit = {
  label: string;
  distanceKm: number;
  isOffRoute: boolean;
};

const ROUTE_FIT_THRESHOLD_KM = 15;

@Component({
  selector: 'app-collector-pickups-page',
  templateUrl: './pickups.html',
  imports: [DecimalPipe, RouterLink, AppHeaderComponent, EmptyStateComponent, CollectorLocationBarComponent, TableHeaderComponent, StatGridComponent, NgIcon, RouteMapComponent, ...ZardTableImports],
  viewProviders: [
    provideIcons({
      lucideArrowUpRight,
      lucideCheckCircle2,
      lucideClock3,
      lucideCoins,
      lucideImage,
      lucideLoaderCircle,
      lucideMapPin,
      lucideNavigation,
      lucidePackageCheck,
      lucideScale,
      lucideTruck,
      lucideWifi,
      lucideXCircle,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectorPickupsPage {
  private readonly pickupService = inject(CollectorPickupService);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);

  protected readonly pickupScope = this.readPickupScope();
  protected readonly pickups = signal<CollectorPickupRequest[]>([]);
  protected readonly routeAnchorPickups = signal<CollectorPickupRequest[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal('');
  protected readonly activeFilter = signal<PickupFilter>('all');
  protected readonly collectorLocation = signal<CollectorLocation | null>(null);
  protected readonly locationStatus = signal<LocationStatus>('idle');
  protected readonly collectorLocationAccuracy = signal<number | null>(null);
  protected readonly collectionLocations = signal<CollectionLocation[]>([]);
  protected readonly PickupStatus = PickupStatus;

  protected readonly filters = computed<Array<{ value: PickupFilter; label: string }>>(() => {
    if (this.pickupScope === 'my') {
      return [
        { value: 'all', label: 'All' },
        { value: 'assigned', label: 'Active' },
        { value: 'cancelled', label: 'Cancelled' },
      ];
    }

    return [
      { value: 'all', label: 'All' },
      { value: 'available', label: 'Available' },
    ];
  });

  protected readonly availablePickups = computed(() => this.pickups().filter((pickup) => pickup.collectorId === null && this.isActiveStatus(pickup.status)));
  protected readonly assignedPickups = computed(() => this.pickups().filter((pickup) => pickup.collectorId !== null && this.isActiveStatus(pickup.status)));
  protected readonly completedPickups = computed(() => this.pickups().filter((pickup) => pickup.status === PickupStatus.COMPLETED));
  protected readonly totalPotentialPoints = computed(() => this.pickups().reduce((total, pickup) => total + this.potentialPoints(pickup), 0));
  protected readonly stats = computed<StatCardItem[]>(() => [
    { icon: 'lucidePackageCheck', label: 'Total', value: this.pickups().length },
    { icon: 'lucideMapPin', label: 'Available', value: this.availablePickups().length },
    { icon: 'lucideTruck', label: 'Assigned', value: this.assignedPickups().length },
    { icon: 'lucideCoins', label: 'Potential Points', value: this.totalPotentialPoints(), unit: 'pts' },
  ]);
  protected readonly tableTitle = computed(() => this.pickupScope === 'my' ? 'My Pickups' : 'Available Pickup Requests');
  protected readonly tableDescription = computed(() => this.pickupScope === 'my'
    ? 'Review pickup requests assigned to you.'
    : 'Review available customer pickup requests sorted by how well they fit your current route.');
  protected readonly routeStops = computed(() => {
    if (this.pickupScope !== 'my') {
      return [];
    }

    return this.assignedPickups()
      .filter((pickup) => this.hasPickupCoordinates(pickup))
      .sort((a, b) => this.routeSortValue(a) - this.routeSortValue(b));
  });
  protected readonly routeStopDirectionsUrl = computed(() => {
    const location = this.collectorLocation();
    const stops = this.routeStops();

    if (!location || stops.length === 0) {
      return null;
    }

    const origin = `${location.latitude},${location.longitude}`;
    const destination = `${stops[stops.length - 1].latitude},${stops[stops.length - 1].longitude}`;
    const waypoints = stops
      .slice(0, -1)
      .map((pickup) => `${pickup.latitude},${pickup.longitude}`)
      .join('|');
    const waypointParam = waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '';

    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypointParam}&travelmode=driving`;
  });
  protected readonly isRouteMapLoading = computed(() =>
    this.pickupScope === 'my' &&
    (
      this.isLoading() ||
      this.locationStatus() === 'requesting'
    ),
  );

  protected readonly filteredPickups = computed(() => {
    const filter = this.activeFilter();
    const pickups = this.pickupScope === 'available'
      ? this.routeSortedAvailablePickups(this.pickups())
      : this.pickups().filter((pickup) => pickup.status !== PickupStatus.COMPLETED);

    if (filter === 'available') return pickups.filter((pickup) => pickup.collectorId === null && this.isActiveStatus(pickup.status));
    if (filter === 'assigned') return pickups.filter((pickup) => pickup.collectorId !== null && this.isActiveStatus(pickup.status));
    if (filter === 'cancelled') return pickups.filter((pickup) => pickup.status === PickupStatus.CANCELLED);
    return pickups;
  });

  protected readonly locationStatusLabel = computed(() => {
    switch (this.locationStatus()) {
      case 'requesting':
        return 'Requesting collector location...';
      case 'granted': {
        const accuracy = this.collectorLocationAccuracy();
        const routeStops = this.routeAnchorPickups().length;
        return this.collectorLocation()
          ? routeStops > 0
            ? `Sorted by your route with ${routeStops} active stop${routeStops === 1 ? '' : 's'}${accuracy === null ? '' : `, accuracy +/- ${Math.round(accuracy)} m`}.`
            : `Sorted from your browser location${accuracy === null ? '' : `, accuracy +/- ${Math.round(accuracy)} m`}.`
          : 'Sorted by nearest known pickup location.';
      }
      case 'denied':
        return 'Location blocked. Showing newest pickups first.';
      case 'unsupported':
        return 'Location unavailable. Showing newest pickups first.';
      default:
        return 'Use location to sort nearest pickups first.';
    }
  });

  constructor() {
    void this.loadPickups();
    interval(30_000).pipe(takeUntilDestroyed()).subscribe(() => {
      void this.loadPickups(false);
    });
    effect(() => {
      if (this.notificationService.pickupUpdate()) void this.loadPickups(false);
    });
  }

  protected setFilter(filter: PickupFilter): void {
    this.activeFilter.set(filter);
  }

  protected async requestLocationAndRefresh(): Promise<void> {
    const location = await this.requestCollectorLocation();
    this.collectorLocation.set(location);
    await this.loadPickups(false);
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

  protected requestWeight(pickup: CollectorPickupRequest): number {
    return pickup.items.reduce(
      (total, item) => total + Number(item.actualWeight ?? item.estimatedWeight ?? 0),
      0,
    );
  }

  protected potentialPoints(pickup: CollectorPickupRequest): number {
    return pickup.items.reduce((total, item) => {
      const weight = Number(item.actualWeight ?? item.estimatedWeight ?? 0);
      return total + Math.round(weight * (item.category?.pointsPerKg ?? 0));
    }, 0);
  }

  protected categoryLabel(pickup: CollectorPickupRequest): string {
    return pickup.aiClassificationLabel || `${pickup.items.length} waste item${pickup.items.length === 1 ? '' : 's'}`;
  }

  protected primaryImage(pickup: CollectorPickupRequest): string | null {
    return pickup.images.find((image) => image.imageType === ImageType.USER_UPLOAD)?.imageUrl ?? null;
  }

  protected distanceLabel(pickup: CollectorPickupRequest): string {
    return pickup.distanceKm === null ? '-' : `${pickup.distanceKm} km`;
  }

  protected routeFitLabel(pickup: CollectorPickupRequest): string | null {
    return this.routeFit(pickup)?.label ?? null;
  }

  protected routeFitClass(pickup: CollectorPickupRequest): string {
    return this.routeFit(pickup)?.isOffRoute
      ? 'bg-muted text-muted-foreground'
      : 'bg-primary/10 text-primary';
  }

  private routeFit(pickup: CollectorPickupRequest): RouteFit | null {
    if (this.pickupScope !== 'available' || pickup.collectorId !== null || !this.isActiveStatus(pickup.status)) {
      return null;
    }

    const fit = this.nearestRouteFitAnchor(pickup);
    if (!fit) {
      return null;
    }

    return fit.distanceKm > ROUTE_FIT_THRESHOLD_KM
      ? {
          label: 'Off route',
          distanceKm: fit.distanceKm,
          isOffRoute: true,
        }
      : {
          label: fit.anchor.label,
          distanceKm: fit.distanceKm,
          isOffRoute: false,
        };
  }

  protected routeStopLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  protected routeMapStops(): RouteMapStop[] {
    return this.routeStops().map((pickup, index) => ({
      label: this.routeStopLabel(index),
      title: `#${this.shortId(pickup.id)}`,
      subtitle: pickup.addressText,
      latitude: String(pickup.latitude),
      longitude: String(pickup.longitude),
    }));
  }

  protected collectionPointMarkers(): RouteMapStop[] {
    return this.collectionLocations()
      .filter((location) => location.latitude !== null && location.longitude !== null)
      .map((location) => ({
        label: 'D',
        title: location.name,
        subtitle: this.locationLabel(location),
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        kind: 'collection',
      }));
  }

  private async loadPickups(requestLocation = true): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set('');

    try {
      const location = this.collectorLocation() ?? (requestLocation ? await this.requestCollectorLocation() : null);
      this.collectorLocation.set(location);
      const response = await firstValueFrom(this.pickupService.listPickups({
        location,
        scope: this.pickupScope,
      }));
      this.pickups.set(response.pickupRequests);
      await this.loadRouteAnchors(location, response.pickupRequests);
      await this.loadCollectionLocations();
    } catch {
      this.loadError.set('Unable to load pickup requests.');
      this.pickups.set([]);
      this.routeAnchorPickups.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadCollectionLocations(): Promise<void> {
    try {
      this.collectionLocations.set(await firstValueFrom(this.pickupService.listCollectionLocations()));
    } catch {
      this.collectionLocations.set([]);
    }
  }

  private async loadRouteAnchors(location: CollectorLocation | null, loadedPickups: CollectorPickupRequest[]): Promise<void> {
    if (this.pickupScope === 'my') {
      this.routeAnchorPickups.set(loadedPickups.filter((pickup) => this.isActiveStatus(pickup.status) && this.hasPickupCoordinates(pickup)));
      return;
    }

    if (!location) {
      this.routeAnchorPickups.set([]);
      return;
    }

    try {
      const response = await firstValueFrom(this.pickupService.listPickups({
        location,
        scope: 'my',
      }));
      this.routeAnchorPickups.set(
        response.pickupRequests.filter((pickup) => this.isActiveStatus(pickup.status) && this.hasPickupCoordinates(pickup)),
      );
    } catch {
      this.routeAnchorPickups.set([]);
    }
  }

  private async requestCollectorLocation(): Promise<CollectorLocation | null> {
    if (!('geolocation' in navigator)) {
      this.locationStatus.set('unsupported');
      return null;
    }

    this.locationStatus.set('requesting');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10_000,
        });
      });

      this.locationStatus.set('granted');
      this.collectorLocationAccuracy.set(position.coords.accuracy);
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch {
      this.locationStatus.set('denied');
      this.collectorLocationAccuracy.set(null);
      return null;
    }
  }

  private isActiveStatus(status: PickupStatus): boolean {
    return ![PickupStatus.COMPLETED, PickupStatus.CANCELLED].includes(status);
  }

  private hasPickupCoordinates(pickup: CollectorPickupRequest): boolean {
    return Boolean(pickup.latitude && pickup.longitude);
  }

  private routeSortValue(pickup: CollectorPickupRequest): number {
    return pickup.distanceKm === null ? Number.POSITIVE_INFINITY : Number(pickup.distanceKm);
  }

  private routeSortedAvailablePickups(pickups: CollectorPickupRequest[]): CollectorPickupRequest[] {
    const anchors = this.routeFitAnchors();
    if (anchors.length === 0) {
      return [...pickups];
    }

    return [...pickups].sort((a, b) => {
      const aScore = this.nearestRouteAnchorDistance(a, anchors);
      const bScore = this.nearestRouteAnchorDistance(b, anchors);

      if (aScore !== bScore) {
        return aScore - bScore;
      }

      return this.routeSortValue(a) - this.routeSortValue(b);
    });
  }

  private routeFitAnchors(): RouteFitAnchor[] {
    const location = this.collectorLocation();
    const anchors: RouteFitAnchor[] = location
      ? [{ ...location, label: 'Nearest collector' }]
      : [];

    anchors.push(
      ...this.routeAnchorPickups()
        .map((pickup, index) => {
          const coordinates = this.pickupCoordinates(pickup);

          return coordinates ? { ...coordinates, label: `Nearest stop ${this.routeStopLabel(index)}` } : null;
        })
        .filter((coordinates): coordinates is RouteFitAnchor => coordinates !== null),
    );

    return anchors;
  }

  private nearestRouteFitAnchor(pickup: CollectorPickupRequest): { anchor: RouteFitAnchor; distanceKm: number } | null {
    const coordinates = this.pickupCoordinates(pickup);
    const anchors = this.routeFitAnchors();

    if (!coordinates || anchors.length === 0) {
      return null;
    }

    return anchors.reduce<{ anchor: RouteFitAnchor; distanceKm: number } | null>((nearest, anchor) => {
      const distanceKm = this.calculateDistanceKm(anchor, coordinates);
      if (!nearest) {
        return { anchor, distanceKm };
      }

      return distanceKm < nearest.distanceKm
        ? { anchor, distanceKm }
        : nearest;
    }, null);
  }

  private nearestRouteAnchorDistance(pickup: CollectorPickupRequest, anchors: CoordinatePair[]): number {
    const coordinates = this.pickupCoordinates(pickup);
    if (!coordinates) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.min(...anchors.map((anchor) => this.calculateDistanceKm(anchor, coordinates)));
  }

  private pickupCoordinates(pickup: CollectorPickupRequest): CoordinatePair | null {
    const latitude = Number(pickup.latitude);
    const longitude = Number(pickup.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return { latitude, longitude };
  }

  private calculateDistanceKm(from: CoordinatePair, to: CoordinatePair): number {
    const earthRadiusKm = 6371;
    const latitudeDelta = this.toRadians(to.latitude - from.latitude);
    const longitudeDelta = this.toRadians(to.longitude - from.longitude);
    const fromLatitudeRadians = this.toRadians(from.latitude);
    const toLatitudeRadians = this.toRadians(to.latitude);
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(fromLatitudeRadians) *
        Math.cos(toLatitudeRadians) *
        Math.sin(longitudeDelta / 2) ** 2;

    return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }

  private locationLabel(location: CollectionLocation): string {
    return [
      location.address,
      location.city,
      location.state,
      location.postalCode,
    ].filter(Boolean).join(', ') || 'Collection location';
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private readPickupScope(): CollectorPickupScope {
    const scope = this.route.snapshot.data['pickupScope'];

    return scope === 'my' ? 'my' : 'available';
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
