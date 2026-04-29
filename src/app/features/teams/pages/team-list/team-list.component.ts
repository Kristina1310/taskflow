import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Team, TeamRole } from '../../../../core/models/database.types';
import { TeamService } from '../../../../core/services/team.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TEAM_ROLE_COLORS, TEAM_ROLE_LABELS } from '../../../../core/models/permissions';

@Component({
  selector: 'app-team-list',
  template: `
    <div class="p-6 max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">My Teams</h1>
          <p class="text-slate-500 text-sm mt-0.5">Teams you lead or belong to</p>
        </div>
        <button (click)="showCreate = true"
          class="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          New Team
        </button>
      </div>

      <!-- Loading skeleton -->
      <div *ngIf="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div *ngFor="let _ of [1,2,3]" class="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse">
          <div class="h-10 w-10 rounded-xl bg-slate-100 mb-3"></div>
          <div class="h-5 bg-slate-100 rounded w-3/4 mb-2"></div>
          <div class="h-3 bg-slate-100 rounded w-full mb-1"></div>
          <div class="h-3 bg-slate-100 rounded w-2/3"></div>
        </div>
      </div>

      <!-- Teams grid -->
      <div *ngIf="!loading && teams.length > 0"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div *ngFor="let t of teams" (click)="goTo(t.id)"
          class="bg-white border border-slate-100 rounded-2xl p-5 hover:border-primary-200 hover:shadow-md cursor-pointer transition-all group">

          <div class="flex items-start justify-between mb-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base"
              [ngClass]="teamColor(t.id)">
              {{ t.name[0] | uppercase }}
            </div>
            <span class="text-xs px-2.5 py-1 rounded-full font-semibold" [ngClass]="roleClass(t.myRole)">
              {{ roleLabel(t.myRole) }}
            </span>
          </div>

          <h3 class="text-slate-800 font-semibold group-hover:text-primary-600 transition-colors line-clamp-1">
            {{ t.name }}
          </h3>
          <p class="text-slate-400 text-sm mt-1 line-clamp-2 min-h-[2.5rem]">
            {{ t.description || 'No description' }}
          </p>

          <div class="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <div class="flex -space-x-1.5">
              <div *ngFor="let m of (t.memberships || []).slice(0, 4)"
                class="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] text-slate-600 font-semibold overflow-hidden">
                <img *ngIf="m.user?.avatar_url" [src]="m.user!.avatar_url" class="w-full h-full object-cover" alt="">
                <span *ngIf="!m.user?.avatar_url">{{ m.user?.display_name?.[0] | uppercase }}</span>
              </div>
              <div *ngIf="(t.memberships?.length || 0) > 4"
                class="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] text-slate-500">
                +{{ (t.memberships?.length || 0) - 4 }}
              </div>
            </div>
            <span class="text-xs text-slate-400">{{ t.memberships?.length || 1 }}/{{ t.member_limit }}</span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading && teams.length === 0"
        class="flex flex-col items-center justify-center py-24 text-center">
        <div class="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </div>
        <h3 class="text-slate-700 font-semibold text-lg mb-1">No teams yet</h3>
        <p class="text-slate-400 text-sm">Create your first team or accept an invite link.</p>
        <button (click)="showCreate = true"
          class="mt-5 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all text-sm shadow-sm">
          Create your first team
        </button>
      </div>
    </div>

    <!-- Create Team Modal -->
    <div *ngIf="showCreate" class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md">
        <div class="p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-slate-800">Create Team</h2>
            <button (click)="showCreate = false" class="text-slate-400 hover:text-slate-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="text-slate-600 text-sm font-medium mb-1.5 block">Team Name *</label>
              <input [(ngModel)]="newName" type="text" placeholder="e.g. Frontend Squad"
                class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all text-sm">
            </div>
            <div>
              <label class="text-slate-600 text-sm font-medium mb-1.5 block">Description</label>
              <textarea [(ngModel)]="newDesc" rows="2" placeholder="What does this team work on?"
                class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all resize-none text-sm"></textarea>
            </div>
          </div>
          <div *ngIf="createError" class="mt-3 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ createError }}</div>
          <div class="flex gap-3 mt-5">
            <button (click)="showCreate = false"
              class="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Cancel
            </button>
            <button (click)="createTeam()" [disabled]="!newName.trim() || creating"
              class="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
              {{ creating ? 'Creating...' : 'Create Team' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TeamListComponent implements OnInit, OnDestroy {
  teams: (Team & { myRole: TeamRole })[] = [];
  loading = true;
  showCreate = false;
  creating = false;
  createError = '';
  newName = '';
  newDesc = '';

  private destroy$ = new Subject<void>();

  private TEAM_COLORS = [
    'bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-pink-500'
  ];

  constructor(
    private teamSvc: TeamService,
    private auth: AuthService,
    private toast: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to live teams from service (already loaded by AppComponent)
    this.teamSvc.myTeams$.pipe(takeUntil(this.destroy$)).subscribe(async teams => {
      if (teams.length > 0) {
        // Enrich with memberships for avatar stacks
        const enriched = await Promise.all(
          teams.map(t => this.teamSvc.getTeam(t.id).then(full => ({ ...full, myRole: t.myRole })).catch(() => t))
        );
        this.teams = enriched as any;
      } else {
        this.teams = teams as any;
      }
      this.loading = false;
    });

    // If not yet loaded (e.g. direct navigation), trigger load
    const userId = this.auth.currentUser?.id;
    if (userId && this.teamSvc.getSnapshot().length === 0) {
      this.teamSvc.loadMyTeams(userId).catch(() => {});
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async createTeam(): Promise<void> {
    if (!this.newName.trim()) return;
    const userId = this.auth.currentUser?.id;
    if (!userId) return;
    this.creating = true;
    this.createError = '';
    try {
      const team = await this.teamSvc.createTeam(this.newName.trim(), this.newDesc.trim(), userId);
      this.toast.success(`Team "${team.name}" created!`);
      this.showCreate = false;
      this.newName = '';
      this.newDesc = '';
      this.router.navigate(['/teams', team.id]);
    } catch (e: any) {
      this.createError = e.message ?? 'Could not create team';
    } finally {
      this.creating = false;
    }
  }

  goTo(teamId: string): void {
    this.router.navigate(['/teams', teamId]);
  }

  roleLabel(role: TeamRole): string {
    return TEAM_ROLE_LABELS[role] ?? 'Member';
  }

  roleClass(role: TeamRole): string {
    return TEAM_ROLE_COLORS[role] ?? 'bg-slate-100 text-slate-600';
  }

  teamColor(teamId: string): string {
    const idx = teamId.charCodeAt(0) % this.TEAM_COLORS.length;
    return this.TEAM_COLORS[idx];
  }
}
