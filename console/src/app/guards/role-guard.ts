import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { GrpcAuthService } from '../services/grpc-auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(GrpcAuthService);
  const router = inject(Router);
  return authService
    .isAllowed(route.data['roles'], route.data['requiresAll'])
    .pipe(map((allowed) => allowed || router.createUrlTree(['/users/me'])));
};
