import { AppHeaderComponent } from '@/components/header/header.component';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheckCircle2,
  lucideChevronRight,
  lucideClock3,
  lucideRecycle,
  lucideTruck,
} from '@ng-icons/lucide';

import { customerPickups, pickupStatusColors, pickupStatusLabels, type Pickup } from './pickup-data';

@Component({
  selector: 'app-customer-pickups-page',
  templateUrl: './pickups.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppHeaderComponent,
    NgIcon,
    RouterLink,
  ],
  viewProviders: [
    provideIcons({
      lucideRecycle,
      lucideClock3,
      lucideCheckCircle2,
      lucideTruck,
      lucideChevronRight,
    }),
  ]
})
export class CustomerPickupsPage {
  protected readonly pickups: Pickup[] = customerPickups;

  protected readonly statusColors = pickupStatusColors;

  protected readonly statusLabels = pickupStatusLabels;

  protected readonly activePickups = computed(() =>
    this.pickups.filter((pickup) => pickup.status === 'in_progress'),
  );
}
