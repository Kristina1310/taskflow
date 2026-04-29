import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.isLoggedIn$.pipe(
      take(1),
      map(loggedIn => {
        if (loggedIn) {
          this.router.navigate([this.auth.getRoleDashboardRoute()]);
          return false;
        }
        return true;
      })
    );
  }
}
