import type { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import type { User } from '@wastegrab/shared';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.loadSession().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/auth']);
      }

      const allowedRoles = route.data?.['roles'] as User['role'][] | undefined;
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        return router.createUrlTree([authService.getDefaultRouteForRole(user.role)]);
      }

      return true;
    }),
  );
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.loadSession().pipe(
    map((user) => (user ? router.createUrlTree([authService.getDefaultRouteForRole(user.role)]) : true)),
  );
};
