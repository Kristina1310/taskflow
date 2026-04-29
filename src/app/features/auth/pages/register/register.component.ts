import { Component } from '@angular/core';
import { FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { trigger, transition, style, animate } from '@angular/animations';

function passwordMatch(group: AbstractControl): ValidationErrors | null {
  const pw  = group.get('password')?.value;
  const cpw = group.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
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
      <h1 class="text-2xl font-bold text-slate-800 mb-1">Create account</h1>
      <p class="text-sm text-slate-500 mb-6">Join your team on TaskFlow</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="label">Display Name</label>
          <input formControlName="displayName" type="text" class="input" placeholder="Jane Smith" autocomplete="name"/>
          <p *ngIf="isInvalid('displayName')" class="mt-1 text-xs text-red-500">Name is required</p>
        </div>
        <div>
          <label class="label">Email</label>
          <input formControlName="email" type="email" class="input" placeholder="you@example.com" autocomplete="email"/>
          <p *ngIf="isInvalid('email')" class="mt-1 text-xs text-red-500">Valid email required</p>
        </div>
        <div>
          <label class="label">Password</label>
          <input formControlName="password" type="password" class="input" placeholder="Min. 8 characters" autocomplete="new-password"/>
          <p *ngIf="isInvalid('password')" class="mt-1 text-xs text-red-500">Min. 8 characters required</p>
        </div>
        <div>
          <label class="label">Confirm Password</label>
          <input formControlName="confirmPassword" type="password" class="input" placeholder="••••••••" autocomplete="new-password"/>
          <p *ngIf="form.hasError('mismatch') && form.get('confirmPassword')?.touched" class="mt-1 text-xs text-red-500">
            Passwords do not match
          </p>
        </div>

        <div class="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-start gap-2">
          <svg class="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          You'll be registered as a <strong class="ml-1">Member</strong>. Admins can promote your role later.
        </div>

        <app-button variant="primary" type="submit" [loading]="loading" class="w-full">
          Create Account
        </app-button>

        <p class="text-center text-sm text-slate-500">
          Already have an account?
          <a routerLink="/auth/login" class="text-primary-600 hover:text-primary-700 font-medium ml-1">Sign in</a>
        </p>
      </form>
    </div>
  `
})
export class RegisterComponent {
  form = this.fb.group({
    displayName:     ['', Validators.required],
    email:           ['', [Validators.required, Validators.email]],
    password:        ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatch });

  loading = false;

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
      await this.auth.signUp(
        this.form.value.email!,
        this.form.value.password!,
        this.form.value.displayName!
      );
      this.toast.success('Account created! Check your email to confirm.');
      this.router.navigate(['/auth/login']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      this.toast.error(msg);
    } finally {
      this.loading = false;
    }
  }
}
