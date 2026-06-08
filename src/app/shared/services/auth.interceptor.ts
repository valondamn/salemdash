import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth';

function shouldSkipAuth(url: string): boolean {
  return url.includes('/ssm/login');
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  const authenticatedRequest =
    token && !shouldSkipAuth(request.url)
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !shouldSkipAuth(request.url)) {
        auth.logout();
        void router.navigateByUrl('/login');
      }

      return throwError(() => error);
    })
  );
};
