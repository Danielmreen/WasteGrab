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
  profile: () => import('./pages/customer/profile/profile.component').then((m) => m.ProfilePage),
  settings: () => import('./pages/customer/settings/settings.component').then((m) => m.SettingsPage),
  customerDashboard: () => import('./pages/customer/customer.component').then((m) => m.CustomerPage),
  customerNewPickup: () =>
    import('./pages/customer/new-pickup/new-pickup.component').then((m) => m.CustomerNewPickupPage),
  customerPickups: () => import('./pages/customer/pickups/pickups.component').then((m) => m.CustomerPickupsPage),
  customerPickupDetail: () =>
    import('./pages/customer/pickups/pickup-detail.component').then((m) => m.CustomerPickupDetailPage),
  customerVouchers: () => import('./pages/customer/vouchers/vouchers.component').then((m) => m.CustomerVouchersPage),
  adminDashboard: () => import('./pages/admin/admin.component').then((m) => m.AdminPage),
  adminCollectors: () => import('./pages/admin/collectors/collectors.component').then((m) => m.AdminCollectorsPage),
  adminPickups: () => import('./pages/admin/pickups/pickups.component').then((m) => m.AdminPickupsPage),
  adminUsers: () => import('./pages/admin/users/users.component').then((m) => m.AdminUsersPage),
  adminWasteCategories: () =>
    import('./pages/admin/waste-categories/waste-categories.component').then((m) => m.AdminWasteCategoriesPage),
  adminVouchers: () => import('./pages/admin/vouchers/vouchers.component').then((m) => m.AdminVouchersPage),
  collectorDashboard: () => import('./pages/collector/collector.component').then((m) => m.CollectorPage),
  collectorEarnings: () =>
    import('./pages/collector/earnings/earnings.component').then((m) => m.CollectorEarningsPage),
  collectorPickups: () =>
    import('./pages/collector/pickups/pickups.component').then((m) => m.CollectorPickupsPage),
} satisfies Record<string, LazyPage>;

interface RouteConfig {
  path: string;
  title: string;
  loadComponent?: LazyPage;
  guards?: readonly CanActivateFn[];
  roles?: readonly UserRole[];
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
        loadComponent: pages.customerPickupDetail,
      },
      {
        path: ROUTE_PATHS.customer.vouchers,
        title: 'My Vouchers',
        loadComponent: pages.customerVouchers,
      },
      {
        path: ROUTE_PATHS.customer.myRequests,
        title: 'My Requests',
        loadComponent: pages.customerPickups,
      },
      {
        path: ROUTE_PATHS.customer.rewards,
        title: 'Rewards',
        loadComponent: pages.customerVouchers,
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
        path: ROUTE_PATHS.admin.pickups,
        title: 'Manage Pickups',
        loadComponent: pages.adminPickups,
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
        title: 'Collector Pickups',
        loadComponent: pages.collectorPickups,
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
