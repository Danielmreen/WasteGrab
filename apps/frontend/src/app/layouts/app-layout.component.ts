import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserRole } from '@wastegrab/shared';

import { AuthService } from '@/services/auth.service';
import { AppNavbarComponent } from '@/ui/navbar/navbar.component';
import { AdminOnboardingComponent } from '@/onboarding/admin-onboarding.component';
import { CollectorOnboardingComponent } from '@/onboarding/collector-onboarding.component';
import { CustomerOnboardingComponent } from '@/onboarding/customer-onboarding.component';

@Component({
  selector: 'app-layout',
  imports: [
    AppNavbarComponent,
    RouterOutlet,
    NgClass,
    AdminOnboardingComponent,
    CustomerOnboardingComponent,
    CollectorOnboardingComponent,
  ],
  template: `
    <div
      class="h-dvh flex min-w-0 flex-col-reverse lg:grid"
      [ngClass]="
        authService.currentUser() ? 'lg:grid-cols-[16rem_minmax(0,1fr)]' : ''
      "
    >
      @if (authService.currentUser()) {
        <app-navbar />
      }
      <main
        class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
        [ngClass]="
          authService.currentUser()
            ? 'lg:pb-0 m-2 rounded-3xl border border-border/60 bg-secondary/50 shadow-sm'
            : 'lg:pb-0 bg-background'
        "
      >
          <router-outlet />
      </main>
    </div>

    @if (shouldShowCustomerOnboarding()) {
      <app-customer-onboarding />
    }

    @if (shouldShowCollectorOnboarding()) {
      <app-collector-onboarding />
    }

    @if (shouldShowAdminOnboarding()) {
      <app-admin-onboarding />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  protected readonly authService = inject(AuthService);

  protected readonly shouldShowCustomerOnboarding = computed(() => {
    const user = this.authService.currentUser();

    return user?.role === UserRole.CUSTOMER && !user.hasCompletedOnboarding;
  });

  protected readonly shouldShowCollectorOnboarding = computed(() => {
    const user = this.authService.currentUser();

    return user?.role === UserRole.COLLECTOR && !user.hasCompletedOnboarding;
  });

  protected readonly shouldShowAdminOnboarding = computed(() => {
    const user = this.authService.currentUser();

    return user?.role === UserRole.ADMIN && !user.hasCompletedOnboarding;
  });
}
