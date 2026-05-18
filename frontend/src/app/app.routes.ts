import { Routes } from '@angular/router';
import { Type } from '@angular/core';
import { AppLayout } from './layouts/app-layout.component';
import { AuthPage } from './pages/auth/auth.component';
import { HomePage } from './pages/home/home.component';
import { TodosPage } from './pages/todos/todos.component';
import { ProfilePage } from './pages/customer/profile/profile.component';
import { SettingsPage } from './pages/customer/settings/settings.component';
import { AdminPage } from './pages/admin/admin.component';
import { CollectorPage } from './pages/collector/collector.component';
import { CustomerNewPickupPage } from './pages/customer/new-pickup/new-pickup.component';
import { CustomerPickupsPage } from './pages/customer/pickups/pickups.component';
import { CustomerPickupDetailPage } from './pages/customer/pickups/pickup-detail.component';
import { CustomerVouchersPage } from './pages/customer/vouchers/vouchers.component';
import { AdminCollectorsPage } from './pages/admin/collectors/collectors.component';
import { AdminPickupsPage } from './pages/admin/pickups/pickups.component';
import { AdminUsersPage } from './pages/admin/users/users.component';
import { AdminVouchersPage } from './pages/admin/vouchers/vouchers.component';
import { CollectorEarningsPage } from './pages/collector/earnings/earnings.component';
import { CollectorPickupsPage } from './pages/collector/pickups/pickups.component';
import { UserRole } from '@wastegrab/shared';
import { authGuard, guestGuard } from './services/auth.guard';
import { CustomerPage } from './pages/customer/customer.component';

// Route metadata - Single source of truth
interface RouteConfig {
  path: string;
  component: Type<any>;
  title: string;
  guards?: any[];
  roles?: UserRole[];
  children?: RouteConfig[];
}

const ROUTE_CONFIG: RouteConfig[] = [
  {
    path: '',
    component: HomePage,
    title: 'Home',
  },
  {
    path: 'auth',
    component: AuthPage,
    title: 'Login',
    guards: [guestGuard],
  },
  {
    path: 'todos',
    component: TodosPage,
    title: 'Todos',
    guards: [authGuard],
  },
  {
    path: 'profile',
    component: ProfilePage,
    title: 'Profile',
    guards: [authGuard],
  },
  {
    path: 'settings',
    component: SettingsPage,
    title: 'Settings',
    guards: [authGuard],
  },
  {
    path: 'customer',
    component: null as any, // Parent route
    title: 'Customer',
    guards: [authGuard],
    roles: [UserRole.CUSTOMER],
    children: [
      {
        path: '',
        component: CustomerPage,
        title: 'Dashboard',
      },
      {
        path: 'new-pickup',
        component: CustomerNewPickupPage,
        title: 'New Pickup',
      },
      {
        path: 'pickups',
        component: CustomerPickupsPage,
        title: 'My Pickups',
      },
      {
        path: 'pickups/:pickupId',
        component: CustomerPickupDetailPage,
        title: 'Pickup Details',
      },
      {
        path: 'vouchers',
        component: CustomerVouchersPage,
        title: 'My Vouchers',
      },
      {
        path: 'my-requests',
        component: CustomerPickupsPage,
        title: 'My Requests',
      },
      {
        path: 'rewards',
        component: CustomerVouchersPage,
        title: 'Rewards',
      },
      {
        path: 'profile',
        component: ProfilePage,
        title: 'Profile',
      },
      {
        path: 'settings',
        component: SettingsPage,
        title: 'Settings',
      },
    ],
  },
  {
    path: 'admin',
    component: null as any, // Parent route
    title: 'Admin',
    guards: [authGuard],
    roles: [UserRole.ADMIN],
    children: [
      {
        path: '',
        component: AdminPage,
        title: 'Admin Dashboard',
      },
      {
        path: 'location-collectors',
        component: AdminCollectorsPage,
        title: 'Manage Location Collectors',
      },
      {
        path: 'pickups',
        component: AdminPickupsPage,
        title: 'Manage Pickups',
      },
      {
        path: 'users',
        component: AdminUsersPage,
        title: 'Manage Users',
      },
      {
        path: 'vouchers',
        component: AdminVouchersPage,
        title: 'Manage Vouchers',
      },
    ],
  },
  {
    path: 'collector',
    component: null as any, // Parent route
    title: 'Collector',
    guards: [authGuard],
    roles: [UserRole.COLLECTOR],
    children: [
      {
        path: '',
        component: CollectorPage,
        title: 'Collector Dashboard',
      },
      {
        path: 'earnings',
        component: CollectorEarningsPage,
        title: 'Collector Earnings',
      },
      {
        path: 'pickups',
        component: CollectorPickupsPage,
        title: 'Collector Pickups',
      },
    ],
  },
];

// Extract just the paths for template navigation
export const ROUTE_PATHS = {
  home: '',
  auth: 'auth',
  todos: 'todos',
  profile: 'profile',
  settings: 'settings',
  customer: {
    base: 'customer',
    newPickup: 'new-pickup',
    pickups: 'pickups',
    pickupDetail: ':pickupId',
    vouchers: 'vouchers',
    myRequests: 'my-requests',
    rewards: 'rewards',
  },
  admin: {
    base: 'admin',
    collectors: 'location-collectors',
    pickups: 'pickups',
    users: 'users',
    vouchers: 'vouchers',
  },
  collector: {
    base: 'collector',
    earnings: 'earnings',
    pickups: 'pickups',
  },
} as const;

// Convert RouteConfig to Angular Routes
function buildRoutes(configs: RouteConfig[]): Routes {
  return configs.map(config => ({
    path: config.path,
    component: config.component,
    canActivate: config.guards,
    data: {
      title: config.title,
      ...(config.roles && { roles: config.roles }),
    },
    children: config.children ? buildRoutes(config.children) : undefined,
  }));
}

const appRoutes = buildRoutes(ROUTE_CONFIG);

export const routes: Routes = [
  {
    path: '',
    component: AppLayout,
    children: appRoutes,
  },
];
