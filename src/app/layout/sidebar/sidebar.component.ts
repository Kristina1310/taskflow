import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { TeamService } from '../../core/services/team.service';
import { ToastService } from '../../core/services/toast.service';
import { AppRole, Team, TeamRole } from '../../core/models/database.types';
import { ROLE_LABELS, TEAM_ROLE_COLORS } from '../../core/models/permissions';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles: AppRole[];
  exact?: boolean;
}

const PEOPLE_ICON = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-4 h-4"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`;

@Component({
  selector: 'app-sidebar',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-8px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, height: 0 }),
        animate('150ms ease-out', style({ opacity: 1, height: '*' }))
      ])
    ])
  ],
  template: `
    <aside @slideIn class="w-64 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col h-full">

      <!-- Logo -->
      <div class="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
        <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
        </div>
        <div>
          <span class="font-bold text-slate-800 text-lg tracking-tight block leading-tight">TaskFlow</span>
          <span class="text-xs text-slate-400 leading-tight">Enterprise</span>
        </div>
      </div>

      <!-- User profile summary -->
      <div *ngIf="profile$ | async as profile" class="px-4 py-3 border-b border-slate-100">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {{ profile.display_name.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-800 truncate">{{ profile.display_name }}</p>
            <app-role-badge [role]="profile.role"></app-role-badge>
          </div>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">

        <!-- Static nav groups -->
        <ng-container *ngFor="let group of navGroups">
          <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1.5 first:pt-1">
            {{ group.label }}
          </p>
          <ng-container *ngFor="let item of group.items">
            <a
              *ngIf="isVisible(item)"
              [routerLink]="item.route"
              [routerLinkActive]="'sidebar-link-active'"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              class="sidebar-link-inactive"
            >
              <span [innerHTML]="item.icon" class="w-5 h-5 flex-shrink-0 text-current"></span>
              <span>{{ item.label }}</span>
            </a>
          </ng-container>
        </ng-container>

        <!-- ── TEAMS section (dynamic) ─────────────────────────── -->
        <div class="pt-4">
          <div class="flex items-center justify-between px-3 pb-1.5">
            <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Teams</p>
            <button (click)="openCreateTeam()"
              title="New Team"
              class="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
          </div>

          <!-- Loading state -->
          <div *ngIf="teamsLoading" class="px-3 py-2">
            <div class="h-3 bg-slate-100 rounded animate-pulse w-3/4 mb-2"></div>
            <div class="h-3 bg-slate-100 rounded animate-pulse w-1/2"></div>
          </div>

          <!-- No teams -->
          <div *ngIf="!teamsLoading && myTeams.length === 0"
            class="px-3 py-2 text-xs text-slate-400 italic">
            No teams yet —
            <button (click)="openCreateTeam()" class="text-primary-500 hover:text-primary-600 underline-offset-2 hover:underline">
              create one
            </button>
          </div>

          <!-- Team list -->
          <ng-container *ngIf="!teamsLoading">
            <!-- Led teams first -->
            <ng-container *ngIf="ledTeams.length > 0">
              <p class="text-[9px] font-semibold text-slate-300 uppercase tracking-widest px-3 py-1">Leading</p>
              <a *ngFor="let t of ledTeams"
                [routerLink]="['/teams', t.id]"
                routerLinkActive="sidebar-link-active"
                class="sidebar-link-inactive gap-2.5 !py-1.5">
                <div class="w-5 h-5 rounded bg-amber-100 flex items-center justify-center text-amber-700 text-[9px] font-bold flex-shrink-0">
                  {{ t.name[0] | uppercase }}
                </div>
                <span class="truncate flex-1">{{ t.name }}</span>
                <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold flex-shrink-0">
                  Leader
                </span>
              </a>
            </ng-container>

            <!-- Joined teams -->
            <ng-container *ngIf="joinedTeams.length > 0">
              <p class="text-[9px] font-semibold text-slate-300 uppercase tracking-widest px-3 py-1 mt-1">Member of</p>
              <a *ngFor="let t of joinedTeams"
                [routerLink]="['/teams', t.id]"
                routerLinkActive="sidebar-link-active"
                class="sidebar-link-inactive gap-2.5 !py-1.5">
                <div class="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-500 text-[9px] font-bold flex-shrink-0">
                  {{ t.name[0] | uppercase }}
                </div>
                <span class="truncate flex-1">{{ t.name }}</span>
                <span *ngIf="t.myRole === 'officer'"
                  class="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 font-semibold flex-shrink-0">
                  Officer
                </span>
              </a>
            </ng-container>
          </ng-container>
        </div>

        <!-- Management -->
        <ng-container *ngFor="let group of managementGroups">
          <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1.5">{{ group.label }}</p>
          <ng-container *ngFor="let item of group.items">
            <a
              *ngIf="isVisible(item)"
              [routerLink]="item.route"
              [routerLinkActive]="'sidebar-link-active'"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              class="sidebar-link-inactive"
            >
              <span [innerHTML]="item.icon" class="w-5 h-5 flex-shrink-0 text-current"></span>
              <span>{{ item.label }}</span>
            </a>
          </ng-container>
        </ng-container>

      </nav>

      <!-- Sign out -->
      <div class="p-4 border-t border-slate-100">
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          (click)="signOut()"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>

    <!-- Inline Create Team Modal -->
    <div *ngIf="showCreateModal"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      (click)="closeCreateTeam()">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm"
        (click)="$event.stopPropagation()">
        <div class="p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-slate-800">New Team</h2>
            <button (click)="closeCreateTeam()" class="text-slate-400 hover:text-slate-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form [formGroup]="createForm" (ngSubmit)="createTeam()">
            <div class="space-y-4">
              <div>
                <label class="text-slate-600 text-sm font-medium mb-1.5 block">Team Name *</label>
                <input formControlName="name" type="text" placeholder="e.g. Frontend Squad" autofocus
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all text-sm">
              </div>
              <div>
                <label class="text-slate-600 text-sm font-medium mb-1.5 block">Description</label>
                <textarea formControlName="description" rows="2" placeholder="What does this team work on?"
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all resize-none text-sm"></textarea>
              </div>
            </div>
            <div *ngIf="createError" class="mt-3 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ createError }}</div>
            <div class="flex gap-3 mt-5">
              <button type="button" (click)="closeCreateTeam()"
                class="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" [disabled]="createForm.invalid || creating"
                class="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
                {{ creating ? 'Creating...' : 'Create' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  profile$ = this.auth.profile$;
  currentRole: AppRole | null = null;
  myTeams: (Team & { myRole: TeamRole })[] = [];
  teamsLoading = true;
  showCreateModal = false;
  creating = false;
  createError = '';
  createForm: FormGroup;

  private destroy$ = new Subject<void>();

  get ledTeams() { return this.myTeams.filter(t => t.myRole === 'leader'); }
  get joinedTeams() { return this.myTeams.filter(t => t.myRole !== 'leader'); }

  navGroups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Dashboards',
      items: [
        { label: 'Super Admin', route: '/panels/super-admin', roles: ['super_admin'],
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>` },
        { label: 'Admin Panel', route: '/panels/admin', roles: ['super_admin', 'admin'],
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>` },
        { label: 'Manager Panel', route: '/panels/manager', roles: ['super_admin', 'admin', 'manager'],
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>` },
        { label: 'My Dashboard', route: '/panels/member', exact: true, roles: ['super_admin', 'admin', 'manager', 'member'],
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>` }
      ]
    },
    {
      label: 'Tasks',
      items: [
        { label: 'All Tasks', route: '/tasks', roles: ['super_admin', 'admin', 'manager', 'member'],
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>` }
      ]
    }
  ];

  managementGroups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Management',
      items: [
        { label: 'Users', route: '/users', roles: ['super_admin', 'admin'],
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>` },
        { label: 'Audit Logs', route: '/panels/super-admin/audit', roles: ['super_admin', 'admin'],
          icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>` }
      ]
    }
  ];

  constructor(
    private auth: AuthService,
    private teamSvc: TeamService,
    private toast: ToastService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name:        ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.auth.role$.pipe(takeUntil(this.destroy$)).subscribe(r => (this.currentRole = r));
    // Subscribe to live team list from service
    this.teamSvc.myTeams$.pipe(takeUntil(this.destroy$)).subscribe(teams => {
      this.myTeams = teams;
      this.teamsLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isVisible(item: NavItem): boolean {
    return this.currentRole ? item.roles.includes(this.currentRole) : false;
  }

  openCreateTeam(): void {
    this.showCreateModal = true;
    this.createError = '';
  }

  closeCreateTeam(): void {
    if (!this.creating) {
      this.showCreateModal = false;
      this.createForm.reset();
    }
  }

  async createTeam(): Promise<void> {
    if (this.createForm.invalid) return;
    const userId = this.auth.currentUser?.id;
    if (!userId) return;
    this.creating = true;
    this.createError = '';
    try {
      const { name, description } = this.createForm.value;
      const team = await this.teamSvc.createTeam(name.trim(), description?.trim() ?? '', userId);
      this.toast.success(`Team "${team.name}" created!`);
      this.closeCreateTeam();
      this.router.navigate(['/teams', team.id]);
    } catch (e: any) {
      this.createError = e.message ?? 'Could not create team';
    } finally {
      this.creating = false;
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
