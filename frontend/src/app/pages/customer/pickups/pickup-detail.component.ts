import { AppHeaderComponent } from '@/components/header/header.component';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle2,
  lucideClock3,
  lucideMapPin,
  lucidePackage,
  lucidePhone,
  lucideRecycle,
  lucideStar,
  lucideTruck,
  lucideArrowLeft,
  lucideAlertTriangle,
} from '@ng-icons/lucide';
import { map } from 'rxjs';

import { customerPickups, pickupStatusColors, pickupStatusLabels } from './pickup-data';

@Component({
  selector: 'app-customer-pickup-detail-page',
  templateUrl: './pickup-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppHeaderComponent, NgIcon, RouterLink],
  viewProviders: [
    provideIcons({
      lucideRecycle,
      lucidePackage,
      lucideClock3,
      lucideCheckCircle2,
      lucideTruck,
      lucideMapPin,
      lucidePhone,
      lucideStar,
      lucideArrowLeft,
      lucideAlertTriangle,
    }),
  ],
})
export class CustomerPickupDetailPage {
  private readonly route = inject(ActivatedRoute);

  protected readonly pickupId = toSignal(
    this.route.paramMap.pipe(map((paramMap) => paramMap.get('pickupId') ?? '')),
    { initialValue: '' },
  );

  protected readonly pickup = computed(() =>
    customerPickups.find((item) => item.id === this.pickupId()) ?? null,
  );

  protected readonly pickupStatusColors = pickupStatusColors;
  protected readonly pickupStatusLabels = pickupStatusLabels;
}