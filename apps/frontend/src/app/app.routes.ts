import type { CanActivateFn, Route, Routes } from '@angular/router';
import { AppLayout } from './layouts/app-layout.component';
import { UserRole } from '@wastegrab/shared';
import { authGuard, guestGuard } from './services/auth.guard';
import { ROUTE_PATHS } from './app-route-paths';

export { ROUTE_PATHS, routePath } from './app-route-paths';

type LazyPage = NonNullable<Route['loadComponent']>;

const pages = {
  home: () => import('./pages/home/home.component').then((m) => m.HomePage),
  auth: () => import('./pages/auth/auth.component').then((m) => m.AuthPage),
  profile: () =>
    import('./pages/customer/profile/profile.component').then(
      (m) => m.ProfilePage,
    ),
  settings: () =>
    import('./pages/customer/settings/settings.component').then(
      (m) => m.SettingsPage,
    ),
  customerDashboard: () =>
    import('./pages/customer/customer.component').then((m) => m.CustomerPage),
  customerNewPickup: () =>
    import('./pages/customer/new-pickup/new-pickup.component').then(
      (m) => m.CustomerNewPickupPage,
    ),
  customerPickups: () =>
    import('./pages/customer/pickups/pickups.component').then(
      (m) => m.CustomerPickupsPage,
    ),
  customerVouchers: () =>
    import('./pages/customer/vouchers/vouchers.component').then(
      (m) => m.CustomerVouchersPage,
    ),
  customerAchievements: () =>
    import('./pages/customer/achievements/achievements.component').then(
      (m) => m.CustomerAchievementsPage,
    ),
  customerLeaderboard: () =>
    import('./pages/customer/leaderboard/leaderboard.component').then(
      (m) => m.CustomerLeaderboardPage,
    ),
  adminDashboard: () =>
    import('./pages/admin/admin.component').then((m) => m.AdminPage),
  adminCollectors: () =>
    import('./pages/admin/collection-locations/collection-location.component').then(
      (m) => m.AdminCollectionLocationPage,
    ),
  adminPickups: () =>
    import('./pages/admin/pickups/pickups.component').then(
      (m) => m.AdminPickupsPage,
    ),
  adminUsers: () =>
    import('./pages/admin/users/users.component').then((m) => m.AdminUsersPage),
  adminWasteCategories: () =>
    import('./pages/admin/waste-categories/waste-categories.component').then(
      (m) => m.AdminWasteCategoriesPage,
    ),
  adminVouchers: () =>
    import('./pages/admin/vouchers/vouchers.component').then(
      (m) => m.AdminVouchersPage,
    ),
  adminAchievements: () =>
    import('./pages/admin/achievements/achievements.component').then(
      (m) => m.AdminAchievementsPage,
    ),
  adminAuthSlides: () =>
    import('./pages/admin/auth-slides/auth-slides.component').then(
      (m) => m.AdminAuthSlidesPage,
    ),
  adminNotifications: () =>
    import('./pages/admin/notifications/notifications.component').then(
      (m) => m.AdminNotificationsPage,
    ),
  collectorDashboard: () =>
    import('./pages/collector/collector.component').then(
      (m) => m.CollectorPage,
    ),
  collectorEarnings: () =>
    import('./pages/collector/earnings/earnings.component').then(
      (m) => m.CollectorEarningsPage,
    ),
  collectorPickups: () =>
    import('./pages/collector/pickups/pickups.component').then(
      (m) => m.CollectorPickupsPage,
    ),
  collectorLocationDetail: () =>
    import('./pages/collector/location-detail/location-detail.component').then(
      (m) => m.CollectorLocationDetailPage,
    ),
  pickupDetail: () =>
    import('./pages/pickup-detail/pickup-detail.component').then(
      (m) => m.PickupDetailPage,
    ),
} satisfies Record<string, LazyPage>;

interface RouteConfig {
  path: string;
  title: string;
  loadComponent?: LazyPage;
  guards?: readonly CanActivateFn[];
  roles?: readonly UserRole[];
  data?: Record<string, unknown>;
  children?: readonly RouteConfig[];
}

const ROUTE_CONFIG = [
  {
    path: ROUTE_PATHS.home,
    title: 'Home',
    loadComponent: pages.home,
  },
  {
    path: ROUTE_PATHS.auth,
    title: 'Login',
    loadComponent: pages.auth,
    guards: [guestGuard],
  },
  {
    path: ROUTE_PATHS.profile,
    title: 'Profile',
    loadComponent: pages.profile,
    guards: [authGuard],
  },
  {
    path: ROUTE_PATHS.settings,
    title: 'Settings',
    loadComponent: pages.settings,
    guards: [authGuard],
  },
  {
    path: ROUTE_PATHS.customer.base,
    title: 'Customer',
    guards: [authGuard],
    roles: [UserRole.CUSTOMER],
    children: [
      {
        path: '',
        title: 'Dashboard',
        loadComponent: pages.customerDashboard,
      },
      {
        path: ROUTE_PATHS.customer.newPickup,
        title: 'New Pickup',
        loadComponent: pages.customerNewPickup,
      },
      {
        path: ROUTE_PATHS.customer.pickups,
        title: 'My Pickups',
        loadComponent: pages.customerPickups,
      },
      {
        path: `${ROUTE_PATHS.customer.pickups}/${ROUTE_PATHS.customer.pickupDetail}`,
        title: 'Pickup Details',
        loadComponent: pages.pickupDetail,
        data: {
          pickupContext: 'customer',
        },
      },
      {
        path: ROUTE_PATHS.customer.vouchers,
        title: 'My Vouchers',
        loadComponent: pages.customerVouchers,
      },
      {
        path: ROUTE_PATHS.customer.leaderboard,
        title: 'Leaderboard',
        loadComponent: pages.customerLeaderboard,
      },
      {
        path: ROUTE_PATHS.customer.myRequests,
        title: 'My Requests',
        loadComponent: pages.customerPickups,
      },
      {
        path: ROUTE_PATHS.customer.achievements,
        title: 'Achievements',
        loadComponent: pages.customerAchievements,
      },
      {
        path: ROUTE_PATHS.profile,
        title: 'Profile',
        loadComponent: pages.profile,
      },
      {
        path: ROUTE_PATHS.settings,
        title: 'Settings',
        loadComponent: pages.settings,
      },
    ],
  },
  {
    path: ROUTE_PATHS.admin.base,
    title: 'Admin',
    guards: [authGuard],
    roles: [UserRole.ADMIN],
    children: [
      {
        path: '',
        title: 'Admin Dashboard',
        loadComponent: pages.adminDashboard,
      },
      {
        path: ROUTE_PATHS.admin.collectors,
        title: 'Manage Collection Locations',
        loadComponent: pages.adminCollectors,
      },
      {
        path: `${ROUTE_PATHS.admin.collectors}/:locationSlug`,
        title: 'Collection Location',
        loadComponent: pages.collectorLocationDetail,
        data: {
          locationContext: 'admin',
        },
      },
      {
        path: ROUTE_PATHS.admin.pickups,
        title: 'Manage Pickups',
        loadComponent: pages.adminPickups,
      },
      {
        path: `${ROUTE_PATHS.admin.pickups}/${ROUTE_PATHS.admin.pickupDetail}`,
        title: 'Pickup Details',
        loadComponent: pages.pickupDetail,
        data: {
          pickupContext: 'admin',
        },
      },
      {
        path: ROUTE_PATHS.admin.users,
        title: 'Manage Users',
        loadComponent: pages.adminUsers,
      },
      {
        path: ROUTE_PATHS.admin.wasteCategories,
        title: 'Manage Waste Categories',
        loadComponent: pages.adminWasteCategories,
      },
      {
        path: ROUTE_PATHS.admin.vouchers,
        title: 'Manage Vouchers',
        loadComponent: pages.adminVouchers,
      },
      {
        path: ROUTE_PATHS.admin.notifications,
        title: 'Notifications',
        loadComponent: pages.adminNotifications,
      },
      {
        path: ROUTE_PATHS.admin.achievements,
        title: 'Achievements',
        loadComponent: pages.adminAchievements,
      },
      {
        path: ROUTE_PATHS.admin.authSlides,
        title: 'Auth Slides',
        loadComponent: pages.adminAuthSlides,
      },
    ],
  },
  {
    path: ROUTE_PATHS.collector.base,
    title: 'Collector',
    guards: [authGuard],
    roles: [UserRole.COLLECTOR],
    children: [
      {
        path: '',
        title: 'Collector Dashboard',
        loadComponent: pages.collectorDashboard,
      },
      {
        path: ROUTE_PATHS.collector.earnings,
        title: 'Collector Earnings',
        loadComponent: pages.collectorEarnings,
      },
      {
        path: ROUTE_PATHS.collector.pickups,
        title: 'Available Pickups',
        loadComponent: pages.collectorPickups,
        data: {
          pickupScope: 'available',
        },
      },
      {
        path: `${ROUTE_PATHS.collector.pickups}/${ROUTE_PATHS.collector.pickupDetail}`,
        title: 'Pickup Details',
        loadComponent: pages.pickupDetail,
        data: {
          pickupContext: 'collector',
          pickupScope: 'available',
        },
      },
      {
        path: ROUTE_PATHS.collector.myPickups,
        title: 'My Pickups',
        loadComponent: pages.collectorPickups,
        data: {
          pickupScope: 'my',
        },
      },
      {
        path: `${ROUTE_PATHS.collector.locations}/${ROUTE_PATHS.collector.locationDetail}`,
        title: 'Collection Location',
        loadComponent: pages.collectorLocationDetail,
      },
      {
        path: `${ROUTE_PATHS.collector.myPickups}/${ROUTE_PATHS.collector.pickupDetail}`,
        title: 'Pickup Details',
        loadComponent: pages.pickupDetail,
        data: {
          pickupContext: 'collector',
          pickupScope: 'my',
        },
      },
    ],
  },
] satisfies readonly RouteConfig[];

function buildRoutes(configs: readonly RouteConfig[]): Routes {
  return configs.map((config) => {
    const route: Route = {
      path: config.path,
      data: {
        title: config.title,
        ...(config.roles ? { roles: [...config.roles] } : {}),
        ...(config.data ?? {}),
      },
    };

    if (config.loadComponent) {
      route.loadComponent = config.loadComponent;
    }

    if (config.guards) {
      route.canActivate = [...config.guards];
    }

    if (config.children) {
      route.children = buildRoutes(config.children);
    }

    return route;
  });
}

const appRoutes = buildRoutes(ROUTE_CONFIG);

export const routes: Routes = [
  {
    path: '',
    component: AppLayout,
    children: appRoutes,
  },
];
