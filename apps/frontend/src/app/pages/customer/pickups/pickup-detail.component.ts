import { AppHeaderComponent } from '@/ui/header/header.component';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle2,
  lucideClock3,
  lucideCoins,
  lucideImage,
  lucideMapPin,
  lucidePackage,
  lucidePhone,
  lucideRecycle,
  lucideSparkles,
  lucideStar,
  lucideTruck,
  lucideArrowLeft,
  lucideAlertTriangle,
  lucideLoaderCircle,
  lucideXCircle,
} from '@ng-icons/lucide';
import { map } from 'rxjs';

import { customerPickups, pickupStatusColors, pickupStatusLabels } from './pickup-data';
import { PickupRequestService } from '@/services/pickup-request.service';
import { PickupStatus, type PickupRequestWithDetails } from '@wastegrab/shared';
import { ZardDialogService } from '@/ui/zard/dialog/dialog.service';

@Component({
  selector: 'app-customer-pickup-detail-page',
  templateUrl: './pickup-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AppHeaderComponent, NgIcon, RouterLink],
  viewProviders: [
    provideIcons({
      lucideRecycle,
      lucideSparkles,
      lucidePackage,
      lucideClock3,
      lucideCoins,
      lucideImage,
      lucideCheckCircle2,
      lucideTruck,
      lucideMapPin,
      lucidePhone,
      lucideStar,
      lucideArrowLeft,
      lucideAlertTriangle,
      lucideLoaderCircle,
      lucideXCircle,
    }),
  ],
})
export class CustomerPickupDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly pickupRequests = inject(PickupRequestService);
  private readonly dialogService = inject(ZardDialogService);
  private readonly remotePickup = signal<PickupRequestWithDetails | null>(null);
  protected readonly isCancelling = signal(false);

  protected readonly pickupId = toSignal(
    this.route.paramMap.pipe(map((paramMap) => paramMap.get('pickupId') ?? '')),
    { initialValue: '' },
  );

  protected readonly pickup = computed(() => {
    const remote = this.remotePickup();
    if (remote) {
      return {
        id: remote.id,
        status: this.toLegacyStatus(remote.status),
        wasteTypes: remote.aiClassificationLabel?.split(',').map((item) => item.trim()).filter(Boolean) ?? [
          `${remote.items.length} waste item${remote.items.length === 1 ? '' : 's'}`,
        ],
        weight: `${remote.items.reduce((total, item) => total + Number(item.actualWeight ?? item.estimatedWeight ?? 0), 0).toFixed(2)} kg`,
        points: this.potentialPoints(remote),
        date: new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(remote.createdAt)),
        timeSlot: 'Requested pickup',
        address: remote.addressText,
        collector: null,
        timeline: [
          { status: 'created' as const, time: new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(remote.createdAt)), label: 'Request Created' },
        ],
      };
    }

    return customerPickups.find((item) => item.id === this.pickupId()) ?? null;
  });

  protected readonly pickupStatusColors = pickupStatusColors;
  protected readonly pickupStatusLabels = pickupStatusLabels;

  protected readonly potentialPoints = (pickup: PickupRequestWithDetails): number =>
    pickup.items.reduce((total, item) => {
      const weight = Number(item.actualWeight ?? item.estimatedWeight ?? 0);
      return total + Math.round(weight * (item.category?.pointsPerKg ?? 0));
    }, 0);

  protected readonly pickupItems = computed(() => this.remotePickup()?.items ?? []);
  protected readonly pickupImages = computed(() => this.remotePickup()?.images ?? []);

  protected previewImage(imageUrl: string, index: number): void {
    this.dialogService.create({
      zTitle: `Pickup image ${index + 1}`,
      zContent: `<img src="${this.escapeHtml(imageUrl)}" alt="Pickup image ${index + 1}" class="max-h-[70vh] w-full rounded-lg object-contain" />`,
      zOkText: 'Close',
      zCancelText: null,
      zWidth: 'max-w-3xl',
    });
  }

  protected itemLabel(item: PickupRequestWithDetails['items'][number]): string {
    return item.category?.name ?? item.categoryId;
  }

  protected itemWeight(item: PickupRequestWithDetails['items'][number]): number {
    return Number(item.actualWeight ?? item.estimatedWeight ?? 0);
  }

  protected itemPotentialPoints(item: PickupRequestWithDetails['items'][number]): number {
    return Math.round(this.itemWeight(item) * (item.category?.pointsPerKg ?? 0));
  }

  protected isAiSuggestedItem(item: PickupRequestWithDetails['items'][number]): boolean {
    const payload = this.remotePickup()?.aiSuggestedPayload;
    if (!this.hasAiSuggestionItems(payload)) {
      return false;
    }

    const itemWeight = this.roundWeight(item.estimatedWeight);
    return payload.items.some(
      (suggestion) =>
        suggestion.categoryId === item.categoryId &&
        this.roundWeight(suggestion.estimatedWeight) === itemWeight,
    );
  }

  protected canCancelPickup(): boolean {
    const remote = this.remotePickup();
    return Boolean(
      remote &&
        remote.status !== PickupStatus.COMPLETED &&
        remote.status !== PickupStatus.CANCELLED &&
        !this.isCancelling(),
    );
  }

  protected confirmCancelPickup(): void {
    if (!this.canCancelPickup()) {
      return;
    }

    this.dialogService.create({
      zTitle: 'Cancel pickup request',
      zDescription: 'Are you sure you want to cancel this pickup request? You can create a new request after cancellation.',
      zOkText: 'Cancel Request',
      zOkDestructive: true,
      zCancelText: 'Keep Request',
      zWidth: 'max-w-md',
      zOnOk: () => {
        void this.cancelPickupRequest();
      },
    });
  }

  constructor() {
    void this.loadPickupRequest();
  }

  private async loadPickupRequest(): Promise<void> {
    const id = this.pickupId();
    if (!id) {
      return;
    }

    try {
      const response = await firstValueFrom(this.pickupRequests.getPickupRequest(id));
      this.remotePickup.set(response.pickupRequest);
    } catch {
      this.remotePickup.set(null);
    }
  }

  private async cancelPickupRequest(): Promise<void> {
    const id = this.pickupId();
    if (!id) {
      return;
    }

    this.isCancelling.set(true);
    try {
      const response = await firstValueFrom(this.pickupRequests.cancelPickupRequest(id));
      this.remotePickup.set(response.pickupRequest);
    } catch (err) {
      console.error('Failed to cancel pickup request:', err);
      this.dialogService.create({
        zTitle: 'Unable to cancel',
        zDescription: 'The pickup request could not be cancelled. Please try again.',
        zOkText: 'OK',
        zCancelText: null,
        zWidth: 'max-w-sm',
      });
    } finally {
      this.isCancelling.set(false);
    }
  }

  private toLegacyStatus(status: PickupStatus): keyof typeof pickupStatusColors {
    switch (status) {
      case PickupStatus.PENDING:
        return 'pending';
      case PickupStatus.ACCEPTED:
        return 'assigned';
      case PickupStatus.ARRIVED:
      case PickupStatus.VERIFIED:
        return 'in_progress';
      case PickupStatus.COMPLETED:
        return 'completed';
      case PickupStatus.CANCELLED:
        return 'cancelled';
    }
  }

  private hasAiSuggestionItems(value: unknown): value is {
    items: Array<{ categoryId: string; estimatedWeight: number | string | null }>;
  } {
    return (
      typeof value === 'object' &&
      value !== null &&
      Array.isArray((value as { items?: unknown }).items)
    );
  }

  private roundWeight(value: number | string | null): number {
    return Number(Number(value ?? 0).toFixed(2));
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
