import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-forgot-password',
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
      <h1 class="text-2xl font-bold text-slate-800 mb-1">Reset password</h1>
      <p class="text-sm text-slate-500 mb-6">We'll send you a reset link</p>

      <div *ngIf="sent" class="flex flex-col items-center gap-3 py-4 text-center animate-fade-in">
        <div class="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <svg class="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <p class="text-sm text-slate-600">Reset link sent! Check your email inbox.</p>
        <a routerLink="/auth/login" class="text-primary-600 hover:text-primary-700 text-sm font-medium">Back to login</a>
      </div>

      <form *ngIf="!sent" [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="label">Email</label>
          <input formControlName="email" type="email" class="input" placeholder="you@example.com" autocomplete="email"/>
        </div>
        <app-button variant="primary" type="submit" [loading]="loading" class="w-full">
          Send Reset Link
        </app-button>
        <p class="text-center text-sm text-slate-500">
          <a routerLink="/auth/login" class="text-primary-600 hover:text-primary-700 font-medium">Back to login</a>
        </p>
      </form>
    </div>
  `
})
export class ForgotPasswordComponent {
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  loading = false;
  sent = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private toast: ToastService) {}

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    try {
      await this.auth.resetPassword(this.form.value.email!);
      this.sent = true;
    } catch (e: unknown) {
      this.toast.error(e instanceof Error ? e.message : 'Failed to send reset link');
    } finally {
      this.loading = false;
    }
  }
}
