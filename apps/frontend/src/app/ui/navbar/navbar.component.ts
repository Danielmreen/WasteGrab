import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronRight,
  lucideHistory,
  lucideGift,
  lucideLayoutDashboard,
  lucidePackage,
  lucidePlus,
  lucideLogOut,
  lucideSettings,
  lucideTruck,
  lucideUsers,
  lucideRecycle,
} from '@ng-icons/lucide';

import { UserRole, type User } from '@wastegrab/shared';
import { ROUTE_PATHS, routePath } from '@/app-route-paths';
import { AuthService } from '@/services/auth.service';
import { ZardAvatarComponent } from '@/ui/zard/avatar/avatar.component';
import { ZardDialogService } from '@/ui/zard/dialog/dialog.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  showOnMobile: boolean;
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
      route: routePath(ROUTE_PATHS.customer.base, ROUTE_PATHS.customer.newPickup),
      icon: 'lucidePlus',
      showOnMobile: true,
    },
    {
      label: 'My Pickups',
      route: routePath(ROUTE_PATHS.customer.base, ROUTE_PATHS.customer.pickups),
      icon: 'lucideHistory',
      showOnMobile: true,
    },
    {
      label: 'Rewards',
      route: routePath(ROUTE_PATHS.customer.base, ROUTE_PATHS.customer.vouchers),
      icon: 'lucideGift',
      showOnMobile: true,
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
      route: routePath(ROUTE_PATHS.admin.base, ROUTE_PATHS.admin.wasteCategories),
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
  ],
  [UserRole.COLLECTOR]: [
    {
      label: 'Dashboard',
      route: routePath(ROUTE_PATHS.collector.base),
      icon: 'lucideLayoutDashboard',
      showOnMobile: true,
    },
    {
      label: 'Pickups',
      route: routePath(ROUTE_PATHS.collector.base, ROUTE_PATHS.collector.pickups),
      icon: 'lucideRecycle',
      showOnMobile: true,
    },
    {
      label: 'Earnings',
      route: routePath(ROUTE_PATHS.collector.base, ROUTE_PATHS.collector.earnings),
      icon: 'lucideGift',
      showOnMobile: true,
    },
  ],
} satisfies Record<Role, readonly NavItem[]>;

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
  imports: [CommonModule, RouterLink, RouterLinkActive, NgIcon, ZardAvatarComponent],
  viewProviders: [
    provideIcons({
      lucideRecycle,
      lucideGift,
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
    <aside class="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-dvh lg:w-64 lg:bg-primary/10 lg:border-r lg:border-primary/20 z-40 lg:rounded-tr-2xl lg:rounded-br-2xl overflow-y-auto">
      <div class="flex flex-col h-full">

        <!-- Brand -->
        <div class="px-6 py-6 border-b border-primary/20">
          <a routerLink="/" class="flex items-center gap-3 text-primary no-underline hover:opacity-80">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <ng-icon name="lucideRecycle" class="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div class="text-lg font-bold text-foreground">WasteGrab</div>
              <p class="text-xs text-muted-foreground">{{ user()?.role | titlecase }}</p>
            </div>
          </a>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-4 py-6">
          @for (item of navItems(); track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="bg-primary text-primary-foreground"
              [routerLinkActiveOptions]="{ exact: true }"
              ariaCurrentWhenActive="page"
              class="group mb-2 flex items-center gap-3 rounded-xl text-sm font-medium text-foreground"
            >
              <span class="flex w-full items-center gap-3 rounded-xl px-4 py-2 transition-colors group-hover:bg-primary/20">
                <ng-icon [name]="item.icon" class="size-4!" />
                <span>{{ item.label }}</span>
              </span>
            </a>
          }
        </nav>

        <!-- Bottom -->
        <div class="space-y-3 border-t border-primary/20 p-4">

          <a [routerLink]="profileRoute" class="block rounded-xl bg-primary/5 p-3 transition-colors hover:bg-primary/15">
            <div class="flex items-center gap-3">
              <z-avatar
                [zFallback]="userInitials()"
                [zAlt]="avatarAlt()"
                zSize="md"
                class="ring-2 ring-primary/30"
              />

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-foreground">{{ user()?.name }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ user()?.role | titlecase }}</p>
              </div>

              <ng-icon name="lucideChevronRight" class="size-4! text-muted-foreground" />

            </div>
          </a>

          <div class="flex gap-2">
            <a
              [routerLink]="settingsRoute"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/10 py-2 text-xs text-foreground transition-colors hover:bg-primary/20"
            >
              <ng-icon name="lucideSettings" class="size-3.5!" aria-hidden="true" />
              <span>Settings</span>
            </a>

            <button
              type="button"
              (click)="confirmLogout()"
              class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive/10 py-2 text-xs text-destructive transition-colors hover:bg-destructive/20"
            >
              <ng-icon name="lucideLogOut" class="size-3.5!" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </div>
    </aside>

    <!-- Mobile Bottom Nav -->
    <nav class="lg:hidden m-2 mt-0 bg-primary/5 border border-primary/20 rounded-2xl shadow-lg z-40">
      <div class="flex h-20 items-stretch gap-2 p-2">

        @for (item of navItems(); track item.route) {
          @if (item.showOnMobile) {
            <a
              [routerLink]="item.route"
              routerLinkActive="bg-primary text-primary-foreground"
              [routerLinkActiveOptions]="{ exact: true }"
              ariaCurrentWhenActive="page"
              class="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-foreground hover:bg-primary/20"
            >
              <ng-icon [name]="item.icon" class="size-5!" />
              <span class="text-xs font-medium">{{ item.label }}</span>
            </a>
          }
        }

        <!-- Profile -->
        <a
          [routerLink]="profileRoute"
          routerLinkActive="bg-primary text-primary-foreground"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          class="flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-foreground hover:bg-primary/20"
        >
          <z-avatar
            [zFallback]="userInitials()"
            [zAlt]="avatarAlt()"
            zSize="sm"
            class="ring-2 ring-primary/30"
          />
          <span class="text-xs font-medium">Profile</span>
        </a>

      </div>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNavbarComponent {
  protected readonly authService = inject(AuthService);
  private readonly dialogService = inject(ZardDialogService);
  private readonly router = inject(Router);

  protected readonly user = computed(() => this.authService.currentUser());
  protected readonly userInitials = computed(() => getInitials(this.user()?.name));
  protected readonly avatarAlt = computed(() => `${this.user()?.name?.trim() || 'User'} avatar`);

  protected readonly roleNav = ROLE_NAV;

  protected readonly navItems = computed(() => {
    const role = this.user()?.role;
    return role ? this.roleNav[role] ?? [] : [];
  });

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
