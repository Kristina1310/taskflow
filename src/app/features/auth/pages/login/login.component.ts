import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-login',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div @fadeIn>
      <h1 class="text-2xl font-bold text-slate-800 mb-1">Welcome back</h1>
      <p class="text-sm text-slate-500 mb-6">Sign in to your workspace</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="label">Email</label>
          <input formControlName="email" type="email" class="input" placeholder="you@example.com" autocomplete="email"/>
          <p *ngIf="isInvalid('email')" class="mt-1 text-xs text-red-500">Valid email required</p>
        </div>
        <div>
          <label class="label">Password</label>
          <div class="relative">
            <input
              formControlName="password"
              [type]="showPwd ? 'text' : 'password'"
              class="input pr-10"
              placeholder="••••••••"
              autocomplete="current-password"
            />
            <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              (click)="showPwd = !showPwd">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path *ngIf="!showPwd" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                <path *ngIf="showPwd" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" class="rounded border-slate-300 text-primary-600 focus:ring-primary-400"/>
            Remember me
          </label>
          <a routerLink="/auth/forgot-password" class="text-sm text-primary-600 hover:text-primary-700 font-medium">Forgot password?</a>
        </div>

        <app-button variant="primary" type="submit" [loading]="loading" class="w-full">
          Sign In
        </app-button>

        <p class="text-center text-sm text-slate-500">
          No account?
          <a routerLink="/auth/register" class="text-primary-600 hover:text-primary-700 font-medium ml-1">Create one</a>
        </p>
      </form>
    </div>
  `
})
export class LoginComponent {
  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });
  loading = false;
  showPwd = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  isInvalid(f: string) {
    const c = this.form.get(f);
    return c?.invalid && (c.dirty || c.touched);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    try {
      await this.auth.signIn(this.form.value.email!, this.form.value.password!);
      this.toast.success('Welcome back!');
      this.router.navigate([this.auth.getRoleDashboardRoute()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid credentials';
      this.toast.error(msg);
    } finally {
      this.loading = false;
    }
  }
}
