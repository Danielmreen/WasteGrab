import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronRight,
  lucideHistory,
  lucideImage,
  lucideGift,
  lucideLayoutDashboard,
  lucideTrophy,
  lucidePackage,
  lucidePlus,
  lucideLogOut,
  lucideSettings,
  lucideTruck,
  lucideUsers,
  lucideRecycle,
  lucideBell,
  lucideChartNoAxesColumn,
} from '@ng-icons/lucide';

import { UserRole, type User } from '@wastegrab/shared';
import { ROUTE_PATHS, routePath } from '@/app-route-paths';
import { AuthService } from '@/services/auth.service';
import { BrandLogoComponent } from '@/ui/brand/brand-logo.component';
import { ZardAvatarComponent } from '@/ui/zard/avatar/avatar.component';
import { ZardDialogService } from '@/ui/zard/dialog/dialog.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  showOnMobile: boolean;
  primary?: boolean;
}

type Role = User['role'];

const ROLE_NAV = {
  [UserRole.CUSTOMER]: [
    {
      label: 'Dashboard',
      route: routePath(ROUTE_PATHS.customer.base),
      icon: 'lucideLayoutDashboard',
      showOnMobile: true,
    },
    {
      label: 'New Request',
      route: routePath(
        ROUTE_PATHS.customer.base,
        ROUTE_PATHS.customer.newPickup,
      ),
      icon: 'lucidePlus',
      showOnMobile: true,
      primary: true,
    },
    {
      label: 'My Pickups',
      route: routePath(ROUTE_PATHS.customer.base, ROUTE_PATHS.customer.pickups),
      icon: 'lucideHistory',
      showOnMobile: true,
    },
    {
      label: 'Rewards',
      route: routePath(
        ROUTE_PATHS.customer.base,
        ROUTE_PATHS.customer.vouchers,
      ),
      icon: 'lucideGift',
      showOnMobile: true,
    },
    {
      label: 'Achievements',
      route: routePath(
        ROUTE_PATHS.customer.base,
        ROUTE_PATHS.customer.achievements,
      ),
      icon: 'lucideTrophy',
      showOnMobile: true,
    },
    {
      label: 'Leaderboard',
      route: routePath(
        ROUTE_PATHS.customer.base,
        ROUTE_PATHS.customer.leaderboard,
      ),
      icon: 'lucideChartNoAxesColumn',
      showOnMobile: false,
    },
  ],
  [UserRole.ADMIN]: [
    {
      label: 'Dashboard',
      route: routePath(ROUTE_PATHS.admin.base),
      icon: 'lucideLayoutDashboard',
      showOnMobile: true,
    },
    {
      label: 'Users',
      route: routePath(ROUTE_PATHS.admin.base, ROUTE_PATHS.admin.users),
      icon: 'lucideUsers',
      showOnMobile: true,
    },
    {
      label: 'Locations',
      route: routePath(ROUTE_PATHS.admin.base, ROUTE_PATHS.admin.collectors),
      icon: 'lucideTruck',
      showOnMobile: true,
    },
    {
      label: 'Categories',
      route: routePath(
        ROUTE_PATHS.admin.base,
        ROUTE_PATHS.admin.wasteCategories,
      ),
      icon: 'lucideRecycle',
      showOnMobile: true,
    },
    {
      label: 'Pickups',
      route: routePath(ROUTE_PATHS.admin.base, ROUTE_PATHS.admin.pickups),
      icon: 'lucidePackage',
      showOnMobile: true,
    },
    {
      label: 'Vouchers',
      route: routePath(ROUTE_PATHS.admin.base, ROUTE_PATHS.admin.vouchers),
      icon: 'lucideGift',
      showOnMobile: false,
    },
    {
      label: 'Notifications',
      route: routePath(ROUTE_PATHS.admin.base, ROUTE_PATHS.admin.notifications),
      icon: 'lucideBell',
      showOnMobile: false,
    },
    {
      label: 'Auth Slides',
      route: routePath(ROUTE_PATHS.admin.base, ROUTE_PATHS.admin.authSlides),
      icon: 'lucideImage',
      showOnMobile: false,
    },
    {
      label: 'Achievements',
      route: routePath(ROUTE_PATHS.admin.base, ROUTE_PATHS.admin.achievements),
      icon: 'lucideTrophy',
      showOnMobile: false,
    },
  ],
  [UserRole.COLLECTOR]: [
    {
      label: 'Dashboard',
      route: routePath(ROUTE_PATHS.collector.base),
      icon: 'lucideLayoutDashboard',
      showOnMobile: true,
    },
    {
      label: 'Available',
      route: routePath(
        ROUTE_PATHS.collector.base,
        ROUTE_PATHS.collector.pickups,
      ),
      icon: 'lucideRecycle',
      showOnMobile: true,
    },
    {
      label: 'My Pickups',
      route: routePath(
        ROUTE_PATHS.collector.base,
        ROUTE_PATHS.collector.myPickups,
      ),
      icon: 'lucideTruck',
      showOnMobile: true,
    },
    {
      label: 'Earnings',
      route: routePath(
        ROUTE_PATHS.collector.base,
        ROUTE_PATHS.collector.earnings,
      ),
      icon: 'lucideGift',
      showOnMobile: true,
    },
  ],
} as Record<Role, readonly NavItem[]>;

function getInitials(name?: string | null): string {
  const initials = name
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'U';
}

@Component({
  selector: 'app-navbar',
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    NgIcon,
    BrandLogoComponent,
    ZardAvatarComponent,
  ],
  viewProviders: [
    provideIcons({
      lucideRecycle,
      lucideBell,
      lucideTrophy,
      lucideChartNoAxesColumn,
      lucideGift,
      lucideImage,
      lucideLayoutDashboard,
      lucidePlus,
      lucideHistory,
      lucideUsers,
      lucideTruck,
      lucidePackage,
      lucideLogOut,
      lucideSettings,
      lucideChevronRight,
    }),
  ],
  template: `
    <!-- Desktop Sidebar -->
    <aside class="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-dvh lg:w-64 lg:bg-card lg:border-primary/20 z-40 overflow-y-auto">
      <div class="flex flex-col h-full">

        <!-- Brand Icon -->
        <div class="w-full p-6 flex flex-col items-center justify-center">
          <a routerLink="/" class="flex items-center gap-3 text-primary no-underline hover:opacity-80">
            <div class="px-6 py-3">
              <app-brand-logo size="lg" />
            </div>
          </a>
          <div class="pt-3 w-48 border-b-2 border-[#008235] mt-4"></div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 p-4">
          @for (item of navItems(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="bg-background !font-bold"
              [routerLinkActiveOptions]="{ exact: true }"
              ariaCurrentWhenActive="page"
              class="group py-2 mb-1 flex items-center gap-3 rounded-l-2xl -mr-8 text-md font-medium hover:font-bold dark:font-thin dark:hover:font-medium"
            >
              <span class="flex w-full items-center gap-4 rounded-l-2xl px-4 py-2 transition-colors text-primary-foreground! group-hover:bg-background dark:text-foreground!">
                <ng-icon [name]="item.icon" class="size-4!" />
                <span>{{ item.label }}</span>
              </span>
            </a>
          }
        </nav>

        <!-- Bottom -->
        <div class="space-y-3 border-t border-primary/20 p-4">

          <a [routerLink]="profileRoute" 
          class="block p-2 rounded-2xl bg-primary border border-background 
          transition-colors text-background hover:text-foreground hover:bg-background"
          routerLinkActive="!bg-background text-primary-foreground rounded-l-2xl -mr-8 dark:text-foreground">
            <div class="flex items-center gap-4 pl-1">
              <z-avatar
                [zSrc]="user()?.avatarUrl || ''"
                [zFallback]="userInitials()"
                [zAlt]="avatarAlt()"
                zSize="md"
                class="size-10 text-foreground"
              />
              <div class="flex flex-col width-full">
                <p class="truncate text-md font-bold">{{ user()?.name }}</p>
                <p class="truncate text-xs">{{ user()?.role | titlecase }}</p>
              </div>
            </div>
          </a>

          <div class="flex gap-2">
            <a
              [routerLink]="settingsRoute"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-background py-2 
              text-xs text-foreground transition-colors border border-background 
              hover:bg-primary hover:text-background"
            >
              <ng-icon
                name="lucideSettings"
                class="size-3.5!"
                aria-hidden="true"
              />
              <span>Settings</span>
            </a>

            <button
              type="button"
              (click)="confirmLogout()"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive/70 py-2 text-xs text-[#F4F4F0] transition-colors hover:bg-destructive/50 hover:text-white hover:font-bold"
            >
              <ng-icon
                name="lucideLogOut"
                class="size-3.5!"
                aria-hidden="true"
              />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile Bottom Nav -->
    <nav class="lg:hidden mx-3 mb-2 mt-0 z-40 flex items-center gap-2">
      <!-- Main pill -->
      <div
        class="flex flex-1 items-center gap-1 rounded-full bg-card p-2 shadow-xl ring-1 ring-border/60"
      >
        @for (item of mobileNavItems(); track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive
            #rla="routerLinkActive"
            [routerLinkActiveOptions]="{ exact: true }"
            ariaCurrentWhenActive="page"
            class="flex flex-1 items-center justify-center gap-2 transition-all active:scale-95"
            [class]="
              rla.isActive ? 'rounded-full bg-primary px-3 py-2' : 'py-2'
            "
          >
            <ng-icon
              [name]="item.icon"
              class="size-5! shrink-0"
              [class]="
                rla.isActive
                  ? 'text-background'
                  : 'text-muted-foreground'
              "
            />
            @if (rla.isActive) {
              <span
                class="whitespace-nowrap text-xs font-bold text-background"
                >{{ item.label }}</span
              >
            }
          </a>
        }
      </div>

      <!-- Primary action bubble -->
      @if (mobilePrimaryItem(); as primary) {
        <a
          [routerLink]="primary.route"
          routerLinkActive="ring-2 ring-primary/40 ring-offset-2"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          class="grid size-13 shrink-0 place-items-center rounded-full bg-primary text-background shadow-xl transition-all active:scale-95"
        >
          <ng-icon [name]="primary.icon" class="size-5!" />
        </a>
      }
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNavbarComponent {
  protected readonly authService = inject(AuthService);
  private readonly dialogService = inject(ZardDialogService);
  private readonly router = inject(Router);

  protected readonly user = computed(() => this.authService.currentUser());
  protected readonly userInitials = computed(() =>
    getInitials(this.user()?.name),
  );
  protected readonly avatarAlt = computed(
    () => `${this.user()?.name?.trim() || 'User'} avatar`,
  );

  protected readonly roleNav = ROLE_NAV;

  protected readonly navItems = computed(() => {
    const role = this.user()?.role;
    return role ? (this.roleNav[role] ?? []) : [];
  });

  protected readonly mobileNavItems = computed(() =>
    this.navItems().filter((item) => item.showOnMobile && !item.primary),
  );

  protected readonly mobilePrimaryItem = computed(
    () =>
      this.navItems().find((item) => item.showOnMobile && item.primary) ?? null,
  );

  protected readonly profileRoute = routePath(ROUTE_PATHS.profile);
  protected readonly settingsRoute = routePath(ROUTE_PATHS.settings);

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
          next: () => this.redirectToAuth(),
          error: () => this.redirectToAuth(),
        });
      },
    });
  }

  private redirectToAuth(): void {
    void this.router.navigateByUrl(routePath(ROUTE_PATHS.auth));
  }
}
