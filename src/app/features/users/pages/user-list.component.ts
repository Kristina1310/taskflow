import { Component, OnInit } from '@angular/core';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Profile, AppRole } from '../../../core/models/database.types';
import { ROLE_HIERARCHY } from '../../../core/models/permissions';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-user-list',
  animations: [
    trigger('pageAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div @pageAnim class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">User Management</h1>
          <p class="text-slate-500 text-sm mt-0.5">{{ allUsers.length }} total users</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
            </svg>
            <input [(ngModel)]="search" type="text" placeholder="Search…" class="input pl-9 text-sm w-52"/>
          </div>
          <select [(ngModel)]="filterRole" class="input text-sm w-36">
            <option value="">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="member">Member</option>
          </select>
        </div>
      </div>

      <!-- Cards grid -->
      <div class="grid md:grid-cols-2 gap-4">
      <div
        *ngFor="let u of filteredUsers"
          class="card p-5 flex items-start gap-4 hover:shadow-md transition-all duration-200 animate-slide-up"
        >
          <!-- Avatar -->
          <div class="w-11 h-11 rounded-full flex-shrink-0 bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm"
            [class]="avatarClass(u.role)">
            {{ u.display_name.charAt(0).toUpperCase() }}
          </div>
          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <p class="font-semibold text-slate-800 truncate">{{ u.display_name }}</p>
              <span class="badge" [class]="u.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'">
                {{ u.status }}
              </span>
            </div>
            <p class="text-xs text-slate-400 truncate mb-2">{{ u.email }}</p>
            <div class="flex items-center gap-2">
              <app-role-badge [role]="u.role"></app-role-badge>
              <span class="text-xs text-slate-400">Joined {{ u.created_at | relativeDate }}</span>
            </div>
          </div>
          <!-- Actions -->
          <div class="flex flex-col gap-2 flex-shrink-0" *ngIf="canEdit(u)">
            <select
              class="input text-xs py-1"
              [value]="u.role"
              (change)="onRoleChange(u, $event)"
            >
              <option value="member">Member</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option *ngIf="isSuperAdmin" value="super_admin">Super Admin</option>
            </select>
            <button
              class="btn text-xs py-1 px-2"
              [class]="u.status === 'active' ? 'btn-ghost text-red-500 hover:bg-red-50' : 'btn-ghost text-emerald-600 hover:bg-emerald-50'"
              (click)="toggleStatus(u)"
            >
              {{ u.status === 'active' ? 'Suspend' : 'Activate' }}
            </button>
          </div>
        </div>

          <!-- Empty state -->
          <div *ngIf="!filteredUsers.length" class="col-span-2 py-16 text-center text-slate-400 text-sm">
          No users found matching your filters
        </div>
      </div>
    </div>
  `
})
export class UserListComponent implements OnInit {
  users$ = this.profileSvc.users$;
  allUsers: Profile[] = [];
  search = '';
  filterRole = '';

  constructor(
    private profileSvc: ProfileService,
    public auth: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.profileSvc.loadAll();
    this.users$.subscribe(u => (this.allUsers = u));
  }

  get isSuperAdmin() { return this.auth.currentRole === 'super_admin'; }

  get filteredUsers(): Profile[] {
    let res = this.allUsers;
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      res = res.filter(u => u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    if (this.filterRole) res = res.filter(u => u.role === this.filterRole);
    return res;
  }

  canEdit(u: Profile): boolean {
    const myRole = this.auth.currentRole;
    if (!myRole || u.id === this.auth.currentUser?.id) return false;
    return ROLE_HIERARCHY[myRole] > ROLE_HIERARCHY[u.role];
  }

  avatarClass(role: AppRole): string {
    return {
      super_admin: 'from-purple-400 to-purple-700',
      admin:       'from-red-400 to-red-700',
      manager:     'from-blue-400 to-blue-700',
      member:      'from-slate-400 to-slate-600'
    }[role];
  }

  async onRoleChange(u: Profile, e: Event): Promise<void> {
    const newRole = (e.target as HTMLSelectElement).value as AppRole;
    try {
      await this.profileSvc.updateRole(u.id, newRole, this.auth.currentUser!.id);
      this.toast.success(`Role updated to ${newRole.replace('_', ' ')}`);
    } catch { this.toast.error('Failed to update role'); }
  }

  async toggleStatus(u: Profile): Promise<void> {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      await this.profileSvc.updateStatus(u.id, newStatus, this.auth.currentUser!.id);
      this.toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`);
    } catch { this.toast.error('Failed to update status'); }
  }
}
