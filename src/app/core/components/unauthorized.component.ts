import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  template: `
    <div class="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div class="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
        <svg class="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
      <p class="text-slate-500 text-sm mb-6 text-center max-w-xs">
        You don't have permission to access this page.
        Your current role is <strong>{{ roleLabel }}</strong>.
      </p>
      <button class="btn-primary" (click)="goHome()">Go to My Dashboard</button>
    </div>
  `
})
export class UnauthorizedComponent {
  constructor(private auth: AuthService, private router: Router) {}

  get roleLabel(): string {
    return this.auth.currentRole?.replace('_', ' ') ?? 'unknown';
  }

  goHome(): void {
    this.router.navigate([this.auth.getRoleDashboardRoute()]);
  }
}
