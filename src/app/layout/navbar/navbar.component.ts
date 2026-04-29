import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  template: `
    <header class="h-16 bg-white border-b border-slate-100 flex items-center px-6 gap-4 flex-shrink-0 z-10">
      <!-- Page title from router -->
      <div class="flex-1">
        <h2 class="text-sm font-semibold text-slate-500 hidden md:block">
          {{ getPageTitle() }}
        </h2>
      </div>

      <div class="flex items-center gap-3 ml-auto">
        <!-- Notification bell -->
        <app-notification-bell></app-notification-bell>

        <!-- Role indicator -->
        <ng-container *ngIf="auth.profile$ | async as profile">
          <app-role-badge [role]="profile.role"></app-role-badge>
          <span class="hidden md:block text-sm text-slate-600 font-medium">{{ profile.display_name }}</span>
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-xs font-bold select-none cursor-pointer"
            [title]="profile.email"
          >
            {{ profile.display_name.charAt(0).toUpperCase() }}
          </div>
        </ng-container>
      </div>
    </header>
  `
})
export class NavbarComponent {
  constructor(public auth: AuthService, private router: Router) {}

  getPageTitle(): string {
    const url = this.router.url;
    const map: Record<string, string> = {
      '/panels/super-admin': 'Super Admin Dashboard',
      '/panels/admin':       'Admin Dashboard',
      '/panels/manager':     'Manager Dashboard',
      '/panels/member':      'My Dashboard',
      '/tasks':              'Tasks',
      '/users':              'User Management',
      '/teams':              'My Teams',
      '/panels/super-admin/audit': 'Audit Logs'
    };
    if (url.startsWith('/teams/join/')) return 'Join Team';
    if (url.startsWith('/teams/') && url.length > 8) return 'Team Board';
    return map[url] ?? 'TaskFlow';
  }
}
