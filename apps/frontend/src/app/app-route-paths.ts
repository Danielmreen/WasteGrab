export const ROUTE_PATHS = {
  home: '',
  auth: 'auth',
  profile: 'profile',
  settings: 'settings',
  customer: {
    base: 'customer',
    newPickup: 'new-pickup',
    pickups: 'pickups',
    pickupDetail: ':pickupId',
    vouchers: 'vouchers',
    leaderboard: 'leaderboard',
    myRequests: 'my-requests',
    achievements: 'achievements',
  },
  admin: {
    base: 'admin',
    collectors: 'locations',
    pickups: 'pickups',
    pickupDetail: ':pickupId',
    users: 'users',
    wasteCategories: 'waste-categories',
    vouchers: 'vouchers',
    notifications: 'notifications',
    achievements: 'achievements',
    authSlides: 'auth-slides',
  },
  collector: {
    base: 'collector',
    earnings: 'earnings',
    pickups: 'pickups',
    myPickups: 'my-pickups',
    pickupDetail: ':pickupId',
    locations: 'locations',
    locationDetail: ':locationSlug',
  },
} as const;

type RoutePathSegment = string | number | null | undefined;

export function routePath(...segments: RoutePathSegment[]): string {
  const path = segments
    .filter(
      (segment): segment is string | number =>
        segment !== null && segment !== undefined && segment !== '',
    )
    .map((segment) => String(segment).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');

  return path ? `/${path}` : '/';
}
