import { AppHeaderComponent } from '@/components/header/header.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { RouterLink } from '@angular/router';
import {
  lucidePackage,
  lucideTrendingUp,
  lucideGift,
  lucideRecycle,
  lucideCheckCircle2,
  lucideTruck,
  lucideClock3,
  lucideChevronRight,
  lucideAlertTriangle,
  lucidePlus,
} from '@ng-icons/lucide';

import { ZardButtonComponent } from '@/components/button/button.component';
import { ROUTE_PATHS } from '@/app.routes';
import { customerPickups, pickupStatusColors, pickupStatusLabels, type Pickup } from './pickups/pickup-data';

type DashboardStat = {
  label: string;
  value: string;
  icon: string;
  accentClass: string;
};

@Component({
  selector: 'app-customer-page',
  templateUrl: './customer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppHeaderComponent,
    ZardButtonComponent,
    NgIcon,
    RouterLink,
  ],
  viewProviders: [
    provideIcons({
      lucidePackage,
      lucideTrendingUp,
      lucideGift,
      lucideRecycle,
      lucideCheckCircle2,
      lucideTruck,
      lucideClock3,
      lucideChevronRight,
      lucideAlertTriangle,
      lucidePlus,
    }),
  ],
})
export class CustomerPage {
  readonly routePaths = ROUTE_PATHS;
  readonly newPickupPath = ['/', ROUTE_PATHS.customer.base, ROUTE_PATHS.customer.newPickup];
  readonly pickupsPath = ['/', ROUTE_PATHS.customer.base, ROUTE_PATHS.customer.pickups];

  readonly dashboardStats: DashboardStat[] = [
    { label: 'Total Pickups', value: '24', icon: 'lucidePackage', accentClass: 'bg-primary/10 text-primary' },
    { label: 'Total Weight', value: '128.5 kg', icon: 'lucideTrendingUp', accentClass: 'bg-primary/10 text-primary' },
    { label: 'Reward Points', value: '12,850', icon: 'lucideGift', accentClass: 'bg-primary/10 text-primary' },
    { label: 'Total Earned', value: 'RM 128.50', icon: 'lucideRecycle', accentClass: 'bg-primary/10 text-primary' },
  ];

  readonly recentPickups: Pickup[] = customerPickups;

  readonly pickupStatusColors = pickupStatusColors;

  readonly pickupStatusLabels = pickupStatusLabels;
}
