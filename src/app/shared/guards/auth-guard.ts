import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.restoreSession().then((isAuthenticated) => {
    if (isAuthenticated) return true;
    return router.parseUrl('/login');
  });
};
