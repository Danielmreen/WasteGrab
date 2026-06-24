import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
} from '@angular/core';

import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
} from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideLogOut,
  lucideSettings,
  lucideUser,
  lucideTrophy,
} from '@ng-icons/lucide';
import { filter, Subscription } from 'rxjs';

import { AuthService } from '@/services/auth.service';
import { ROUTE_PATHS, routePath } from '@/app-route-paths';
import { UserRole } from '@wastegrab/shared';
import { ZardAvatarComponent } from '@/ui/zard/avatar/avatar.component';
import { ZardDialogService } from '@/ui/zard/dialog/dialog.service';
import {
  ZardDropdownDirective,
  ZardDropdownMenuContentComponent,
  ZardDropdownMenuItemComponent,
} from '@/ui/zard/dropdown';
import { AppHeaderNotificationsComponent } from './header-notifications.component';
import { AppHeaderQuoteComponent } from './header-quote.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    AppHeaderNotificationsComponent,
    AppHeaderQuoteComponent,
    ZardAvatarComponent,
    ZardDropdownDirective,
    ZardDropdownMenuContentComponent,
    ZardDropdownMenuItemComponent,
    RouterLink,
    NgIcon,
  ],
  viewProviders: [
    provideIcons({ lucideLogOut, lucideSettings, lucideUser, lucideTrophy }),
  ],
  template: `
    <header class="flex items-center justify-between pointer-events-auto">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-foreground">
          {{ activeRouteTitle }}
        </h1>

        <app-header-quote />
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <div class="hidden lg:contents">
          <ng-content select="[rightSide]" />
        </div>
        <app-header-notifications />

        <!-- Mobile profile dropdown -->
        <button
          #profileTrigger
          zDropdown
          [zDropdownMenu]="profileMenu"
          zTrigger="click"
          type="button"
          aria-label="Account menu"
          class="lg:hidden size-10 shrink-0 rounded-full border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary overflow-hidden"
        >
          <z-avatar
            [zSrc]="user()?.avatarUrl || ''"
            [zFallback]="userInitials()"
            [zAlt]="avatarAlt()"
            zSize="default"
          />
        </button>

        <z-dropdown-menu-content
          #profileMenu="zDropdownMenuContent"
          class="w-56 overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-xl"
        >
          <!-- User info header -->
          <div class="border-b border-border px-4 py-3">
            <p class="truncate text-sm font-semibold text-foreground">
              {{ user()?.name }}
            </p>
            <p class="truncate text-xs text-muted-foreground">
              {{ user()?.email }}
            </p>
          </div>

          <div class="p-1">
            <a
              z-dropdown-menu-item
              [routerLink]="profileRoute"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ng-icon
                name="lucideUser"
                class="size-4! text-muted-foreground"
              />
              Profile
            </a>

            @if (showAchievementsLink()) {
              <a
                z-dropdown-menu-item
                [routerLink]="achievementsRoute()"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                <ng-icon
                  name="lucideTrophy"
                  class="size-4! text-muted-foreground"
                />
                Achievements
              </a>
            }

            <a
              z-dropdown-menu-item
              [routerLink]="settingsRoute"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ng-icon
                name="lucideSettings"
                class="size-4! text-muted-foreground"
              />
              Settings
            </a>

            <div class="my-1 h-px bg-border"></div>

            <button
              z-dropdown-menu-item
              type="button"
              (click)="confirmLogout()"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <ng-icon name="lucideLogOut" class="size-4!" />
              Logout
            </button>
          </div>
        </z-dropdown-menu-content>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly dialogService = inject(ZardDialogService);
  private routeEvents?: Subscription;

  protected activeRouteTitle = '';
  protected readonly profileRoute = routePath(ROUTE_PATHS.profile);
  protected readonly showAchievementsLink = computed(
    () => this.authService.currentUser()?.role === UserRole.CUSTOMER,
  );
  protected readonly achievementsRoute = computed(() =>
    routePath(ROUTE_PATHS.customer.base, ROUTE_PATHS.customer.achievements),
  );
  protected readonly settingsRoute = routePath(ROUTE_PATHS.settings);
  protected readonly user = computed(() => this.authService.currentUser());
  protected readonly userInitials = computed(() => {
    const name = this.user()?.name?.trim() ?? '';
    return (
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('') || 'U'
    );
  });
  protected readonly avatarAlt = computed(
    () => `${this.user()?.name?.trim() || 'User'} avatar`,
  );

  ngOnInit(): void {
    this.updateRouteTitle();

    this.routeEvents = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateRouteTitle();
      });
  }

  ngOnDestroy(): void {
    this.routeEvents?.unsubscribe();
  }

  protected confirmLogout(): void {
    this.dialogService.create({
      zTitle: 'Confirm Logout',
      zDescription: 'Are you sure you want to logout?',
      zOkText: 'Logout',
      zOkDestructive: true,
      zCancelText: 'Cancel',
      zWidth: 'max-w-sm',
      zOnOk: () => {
        this.authService.logout().subscribe({
          next: () =>
            void this.router.navigateByUrl(routePath(ROUTE_PATHS.auth)),
          error: () =>
            void this.router.navigateByUrl(routePath(ROUTE_PATHS.auth)),
        });
      },
    });
  }

  private updateRouteTitle(): void {
    let route = this.route;

    while (route.firstChild) {
      route = route.firstChild;
    }

    this.activeRouteTitle = route.snapshot.data?.['title'] ?? 'Untitled Page';
  }
}
