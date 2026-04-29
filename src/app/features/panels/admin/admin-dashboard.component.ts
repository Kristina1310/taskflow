import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProfileService } from '../../../core/services/profile.service';
import { Profile, AppRole, SlaPolicy } from '../../../core/models/database.types';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { SlaService } from '../../../core/services/sla.service';
import { TasksDbService } from '../../../core/services/tasks-db.service';
import {
  ROLE_HIERARCHY, ROLE_LABELS, getRolePermissions, Permission
} from '../../../core/models/permissions';

@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="max-w-6xl mx-auto animate-slide-up">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3 mb-1">
            <div class="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <circle cx="12" cy="12" r="3" stroke-width="2"/>
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
          </div>
          <p class="text-slate-500 text-sm">Manage users, roles, SLA policies, and access control</p>
        </div>
        <!-- Tab switcher -->
        <div class="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button *ngFor="let tab of tabs"
                  (click)="activeTab = tab.id"
                  class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                  [class]="activeTab === tab.id ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'">
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <app-stat-card label="Total Users" [value]="users.length"
          iconBg="bg-blue-50 text-blue-600"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
        ></app-stat-card>
        <app-stat-card label="Active" [value]="activeCount"
          iconBg="bg-emerald-50 text-emerald-600"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        ></app-stat-card>
        <app-stat-card label="Suspended" [value]="suspendedCount"
          iconBg="bg-red-50 text-red-500"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>'
        ></app-stat-card>
        <app-stat-card label="SLA Policies" [value]="policies.length"
          iconBg="bg-amber-50 text-amber-600"
          icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>'
        ></app-stat-card>
      </div>

      <!-- Users Tab -->
      <ng-container *ngIf="activeTab === 'users'">
        <div class="card overflow-hidden">
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 class="font-semibold text-slate-800">Users</h2>
            <input [(ngModel)]="search" type="text" placeholder="Search users..." class="input text-sm w-56"/>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr *ngFor="let u of filteredUsers" class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {{ u.display_name.charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <p class="font-medium text-slate-800">{{ u.display_name }}</p>
                        <p class="text-xs text-slate-400">{{ u.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <select class="input text-xs py-1 w-36" [value]="u.role" [disabled]="!canEditRole(u)" (change)="onRoleChange(u, $event)">
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option *ngIf="isSuperAdmin" value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td class="px-4 py-3">
                    <span class="badge" [class]="u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'">
                      {{ u.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-xs text-slate-400">{{ u.created_at | relativeDate }}</td>
                  <td class="px-4 py-3">
                    <button *ngIf="canEditRole(u)"
                      class="btn-icon text-slate-400 hover:text-red-500 hover:bg-red-50"
                      [title]="u.status === 'active' ? 'Suspend' : 'Activate'"
                      (click)="toggleStatus(u)">
                      <svg *ngIf="u.status === 'active'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
                      </svg>
                      <svg *ngIf="u.status !== 'active'" class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>

      <!-- Policy Editor Tab -->
      <ng-container *ngIf="activeTab === 'policy'">
        <div class="space-y-6">
          <div class="card p-6">
            <h2 class="font-semibold text-slate-800 mb-1">Role Permission Matrix</h2>
            <p class="text-sm text-slate-500 mb-5">Read-only overview of permissions per role.</p>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr>
                    <th class="text-left py-2 pr-4 text-slate-500 font-semibold uppercase tracking-wider">Permission</th>
                    <th *ngFor="let role of allRoles" class="text-center py-2 px-3 font-semibold uppercase tracking-wider"
                        [class]="getRoleHeaderClass(role)">
                      {{ ROLE_LABELS[role] }}
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  <tr *ngFor="let perm of allPermissions" class="hover:bg-slate-50">
                    <td class="py-2 pr-4 text-slate-600 font-mono">{{ perm }}</td>
                    <td *ngFor="let role of allRoles" class="text-center py-2 px-3">
                      <span *ngIf="hasPerms(role, perm)" class="text-emerald-500 font-bold">✓</span>
                      <span *ngIf="!hasPerms(role, perm)" class="text-slate-200">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- SLA Policies Tab -->
      <ng-container *ngIf="activeTab === 'sla'">
        <div class="space-y-5">
          <!-- Add SLA Policy -->
          <div class="card p-5">
            <h2 class="font-semibold text-slate-800 mb-4">Add SLA Policy</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label class="label">Name</label>
                <input [(ngModel)]="newPolicy.name" type="text" class="input text-sm" placeholder="e.g. High Priority SLA"/>
              </div>
              <div>
                <label class="label">Priority</label>
                <select [(ngModel)]="newPolicy.priority" class="input text-sm">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label class="label">Warning (hours)</label>
                <input [(ngModel)]="newPolicy.warning_hours" type="number" class="input text-sm" min="1"/>
              </div>
              <div>
                <label class="label">Critical (hours)</label>
                <input [(ngModel)]="newPolicy.critical_hours" type="number" class="input text-sm" min="1"/>
              </div>
            </div>
            <button (click)="addPolicy()" class="btn btn-primary mt-4 text-sm">Add Policy</button>
          </div>

          <!-- SLA Policy list -->
          <div class="card overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-100">
              <h2 class="font-semibold text-slate-800">Active SLA Policies</h2>
            </div>
            <div class="divide-y divide-slate-50">
              <div *ngFor="let p of policies" class="px-5 py-4 flex items-center gap-4">
                <div class="flex-1">
                  <p class="font-medium text-slate-800">{{ p.name }}</p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Priority: <span class="font-medium">{{ p.priority }}</span> ·
                    Warning at <span class="font-medium">{{ p.warning_hours }}h</span> ·
                    Critical at <span class="font-medium">{{ p.critical_hours }}h</span>
                  </p>
                </div>
                <span class="badge" [class]="p.priority === 'high' ? 'bg-red-50 text-red-600' : p.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'">
                  {{ p.priority }}
                </span>
                <button (click)="deletePolicy(p.id)" class="btn-icon text-slate-300 hover:text-red-500">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
              <div *ngIf="!policies.length" class="px-5 py-8 text-center text-slate-400 text-sm">No SLA policies yet.</div>
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Trash / Restore Tab -->
      <ng-container *ngIf="activeTab === 'trash'">
        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100">
            <h2 class="font-semibold text-slate-800">Deleted Tasks</h2>
            <p class="text-xs text-slate-400 mt-0.5">Soft-deleted tasks that can be restored.</p>
          </div>
          <div class="divide-y divide-slate-50">
            <div *ngFor="let t of deletedTasks" class="px-5 py-3 flex items-center gap-3">
              <span class="flex-1 text-sm text-slate-600 truncate">{{ t.title }}</span>
              <span class="text-xs text-slate-400">{{ t.deleted_at | relativeDate }}</span>
              <button (click)="restoreTask(t.id)"
                      class="btn btn-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">
                Restore
              </button>
            </div>
            <div *ngIf="!deletedTasks.length" class="px-5 py-8 text-center text-slate-400 text-sm">
              Trash is empty.
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  users: Profile[] = [];
  policies: SlaPolicy[] = [];
  deletedTasks: any[] = [];
  search = '';
  activeTab: 'users' | 'policy' | 'sla' | 'trash' = 'users';
  tabs = [
    { id: 'users' as const, label: 'Users' },
    { id: 'policy' as const, label: 'Policy Editor' },
    { id: 'sla' as const, label: 'SLA Policies' },
    { id: 'trash' as const, label: 'Trash' }
  ];

  newPolicy = { name: '', priority: 'high' as 'high' | 'medium' | 'low', warning_hours: 24, critical_hours: 48 };

  allRoles: AppRole[] = ['super_admin', 'admin', 'manager', 'member'];
  allPermissions: Permission[] = [
    'tasks.create', 'tasks.edit.any', 'tasks.delete.any',
    'tasks.assign', 'tasks.bulk_assign', 'tasks.approve',
    'tasks.restore', 'tasks.field.status.any',
    'comments.delete.any', 'attachments.delete.any',
    'users.manage', 'users.role.assign', 'users.suspend',
    'analytics.view.global', 'audit.view', 'audit.export',
    'sla.manage', 'automation_rules.manage', 'session.manage', 'system.manage'
  ];

  ROLE_LABELS = ROLE_LABELS;
  private sub = new Subscription();

  constructor(
    private profileSvc: ProfileService,
    private auth: AuthService,
    private toast: ToastService,
    private slaSvc: SlaService,
    private tasksSvc: TasksDbService
  ) {}

  ngOnInit(): void {
    this.profileSvc.loadAll();
    this.sub.add(this.profileSvc.users$.subscribe(u => this.users = u));
    this.slaSvc.loadPolicies();
    this.sub.add(this.slaSvc.policies$.subscribe(p => this.policies = p));
    this.loadTrash();
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get isSuperAdmin(): boolean { return this.auth.currentRole === 'super_admin'; }
  get activeCount(): number   { return this.users.filter(u => u.status === 'active').length; }
  get suspendedCount(): number{ return this.users.filter(u => u.status === 'suspended').length; }

  get filteredUsers(): Profile[] {
    const q = this.search.toLowerCase();
    return q ? this.users.filter(u => u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : this.users;
  }

  canEditRole(u: Profile): boolean {
    const myRole = this.auth.currentRole;
    if (!myRole) return false;
    if (u.id === this.auth.currentUser?.id) return false;
    return ROLE_HIERARCHY[myRole] > ROLE_HIERARCHY[u.role];
  }

  hasPerms(role: AppRole, perm: Permission): boolean {
    return getRolePermissions(role).includes(perm);
  }

  getRoleHeaderClass(role: AppRole): string {
    return {
      super_admin: 'text-purple-600',
      admin:       'text-red-600',
      manager:     'text-blue-600',
      member:      'text-slate-500'
    }[role] || '';
  }

  async onRoleChange(user: Profile, e: Event): Promise<void> {
    const newRole = (e.target as HTMLSelectElement).value as AppRole;
    try {
      await this.profileSvc.updateRole(user.id, newRole, this.auth.currentUser!.id);
      this.toast.success(`${user.display_name}'s role updated`);
    } catch { this.toast.error('Failed to update role'); }
  }

  async toggleStatus(user: Profile): Promise<void> {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await this.profileSvc.updateStatus(user.id, newStatus, this.auth.currentUser!.id);
      this.toast.success(`${user.display_name} ${newStatus === 'active' ? 'activated' : 'suspended'}`);
    } catch { this.toast.error('Failed to update status'); }
  }

  async addPolicy(): Promise<void> {
    if (!this.newPolicy.name.trim()) return;
    try {
      await this.slaSvc.createPolicy({ ...this.newPolicy, created_by: this.auth.currentUser!.id }, this.auth.currentUser!.id);
      this.toast.success('SLA policy added');
      this.newPolicy = { name: '', priority: 'high', warning_hours: 24, critical_hours: 48 };
    } catch { this.toast.error('Failed to add policy'); }
  }

  async deletePolicy(id: string): Promise<void> {
    if (!confirm('Delete this SLA policy?')) return;
    try {
      await this.slaSvc.deletePolicy(id);
      this.toast.success('Policy deleted');
    } catch { this.toast.error('Failed to delete policy'); }
  }

  async loadTrash(): Promise<void> {
    this.deletedTasks = await this.tasksSvc.loadDeleted();
  }

  async restoreTask(id: string): Promise<void> {
    try {
      await this.tasksSvc.restore(id, this.auth.currentUser!.id);
      this.toast.success('Task restored');
      await this.loadTrash();
    } catch { this.toast.error('Failed to restore task'); }
  }
}
