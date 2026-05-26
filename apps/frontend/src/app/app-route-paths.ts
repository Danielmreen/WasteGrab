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
    myRequests: 'my-requests',
    rewards: 'rewards',
  },
  admin: {
    base: 'admin',
    collectors: 'locations',
    pickups: 'pickups',
    users: 'users',
    wasteCategories: 'waste-categories',
    vouchers: 'vouchers',
  },
  collector: {
    base: 'collector',
    earnings: 'earnings',
    pickups: 'pickups',
  },
} as const;

type RoutePathSegment = string | number | null | undefined;

export function routePath(...segments: RoutePathSegment[]): string {
  const path = segments
    .filter((segment): segment is string | number => segment !== null && segment !== undefined && segment !== '')
    .map((segment) => String(segment).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');

  return path ? `/${path}` : '/';
}
