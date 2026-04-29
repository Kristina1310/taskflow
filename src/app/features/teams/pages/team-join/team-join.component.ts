import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamInvite } from '../../../../core/models/database.types';
import { TeamService } from '../../../../core/services/team.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-team-join',
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-sm p-8 text-center">

        <ng-container *ngIf="loading">
          <div class="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p class="text-slate-500 text-sm">Checking invite...</p>
        </ng-container>

        <ng-container *ngIf="!loading && error">
          <div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <h2 class="text-xl font-bold text-slate-800 mb-2">Invite Invalid</h2>
          <p class="text-slate-500 text-sm mb-6">{{ error }}</p>
          <button (click)="router.navigate(['/teams'])"
            class="w-full border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl font-medium transition-colors text-sm">
            Go to Teams
          </button>
        </ng-container>

        <ng-container *ngIf="!loading && !error && invite">
          <div class="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-100">
            <svg class="w-7 h-7 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-slate-800 mb-1">You're invited!</h2>
          <p class="text-slate-500 text-sm mb-5">
            <span class="font-medium text-slate-700">{{ invite.inviter?.display_name || 'Someone' }}</span>
            invites you to join
            <span class="text-primary-600 font-semibold">{{ invite.team?.name }}</span>
          </p>

          <div *ngIf="invite.team?.description"
            class="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-5 text-sm text-slate-600 text-left">
            {{ invite.team?.description }}
          </div>

          <p class="text-xs text-slate-400 mb-5">
            Expires {{ invite.expires_at | date:'MMM d, y' }}
          </p>

          <ng-container *ngIf="isLoggedIn; else notLoggedIn">
            <button (click)="acceptInvite()" [disabled]="joining"
              class="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white py-3 rounded-xl font-semibold transition-all shadow-sm mb-3 text-sm">
              {{ joining ? 'Joining...' : 'Join Team' }}
            </button>
            <button (click)="router.navigate(['/teams'])"
              class="w-full border border-slate-200 text-slate-500 hover:bg-slate-50 py-2.5 rounded-xl font-medium transition-colors text-sm">
              Decline
            </button>
          </ng-container>

          <ng-template #notLoggedIn>
            <p class="text-slate-500 text-sm mb-4">Sign in to accept this invite.</p>
            <button (click)="goLogin()"
              class="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-semibold transition-all shadow-sm text-sm">
              Sign In to Accept
            </button>
          </ng-template>
        </ng-container>

      </div>
    </div>
  `
})
export class TeamJoinComponent implements OnInit {
  token = '';
  invite: TeamInvite | null = null;
  loading = true;
  joining = false;
  error = '';

  get isLoggedIn(): boolean { return this.auth.isLoggedIn; }

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private teamSvc: TeamService,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    try {
      this.invite = await this.teamSvc.getInviteByToken(this.token);
      if (!this.invite) this.error = 'This invite link is invalid or has expired.';
    } catch {
      this.error = 'Could not load invite. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async acceptInvite(): Promise<void> {
    const userId = this.auth.currentUser?.id;
    if (!userId) return;
    this.joining = true;
    try {
      await this.teamSvc.acceptInvite(this.token, userId);
      this.toast.success(`You joined ${this.invite?.team?.name ?? 'the team'}!`);
      this.router.navigate(['/teams', this.invite?.team_id]);
    } catch (e: any) {
      this.toast.error(e.message ?? 'Could not join team');
    } finally {
      this.joining = false;
    }
  }

  goLogin(): void {
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: `/teams/join/${this.token}` }
    });
  }
}
