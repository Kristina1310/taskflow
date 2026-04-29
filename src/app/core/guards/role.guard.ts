import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AppRole } from '../models/database.types';
import { isRoleAtLeast } from '../models/permissions';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRole = route.data['requiredRole'] as AppRole | undefined;
    const userRole = this.auth.currentRole;

    if (!userRole) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    if (requiredRole && !isRoleAtLeast(userRole, requiredRole)) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  }
}
