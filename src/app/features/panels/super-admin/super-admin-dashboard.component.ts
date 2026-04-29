import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { forkJoin, from } from 'rxjs';
import { supabase } from '../../../core/supabase.client';
import { AuthService } from '../../../core/services/auth.service';

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  recentSignups: number;
}

@Component({
  selector: 'app-super-admin-dashboard',
  animations: [
    trigger('staggerIn', [
      transition(':enter', [
        query('.stat-item', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger('80ms', [animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))])
        ], { optional: true })
      ])
    ])
  ],
  template: `
    <div class="max-w-6xl mx-auto animate-slide-up">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
            <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-slate-800">Super Admin Dashboard</h1>
        </div>
        <p class="text-slate-500 text-sm">Full platform visibility and system controls</p>
      </div>

      <!-- Stats grid -->
      <div @staggerIn class="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div class="stat-item">
          <app-stat-card label="Total Users" [value]="stats.totalUsers"
            iconBg="bg-purple-50 text-purple-600"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
          ></app-stat-card>
        </div>
        <div class="stat-item">
          <app-stat-card label="Active Users" [value]="stats.activeUsers"
            iconBg="bg-emerald-50 text-emerald-600"
            [sub]="stats.totalUsers ? (((stats.activeUsers / stats.totalUsers) * 100) | number:'1.0-0') + '% of total' : ''"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
          ></app-stat-card>
        </div>
        <div class="stat-item">
          <app-stat-card label="New Signups (7d)" [value]="stats.recentSignups"
            iconBg="bg-blue-50 text-blue-600"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>'
          ></app-stat-card>
        </div>
        <div class="stat-item">
          <app-stat-card label="Total Tasks" [value]="stats.totalTasks"
            iconBg="bg-slate-100 text-slate-600"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'
          ></app-stat-card>
        </div>
        <div class="stat-item">
          <app-stat-card label="Completed Tasks" [value]="stats.completedTasks"
            iconBg="bg-emerald-50 text-emerald-600"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
          ></app-stat-card>
        </div>
        <div class="stat-item">
          <app-stat-card label="Pending Tasks" [value]="stats.pendingTasks"
            iconBg="bg-amber-50 text-amber-600"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
          ></app-stat-card>
        </div>
      </div>

      <!-- Role distribution -->
      <div class="card p-5 mb-6">
        <h2 class="text-base font-semibold text-slate-800 mb-4">Role Distribution</h2>
        <div class="space-y-3">
          <div *ngFor="let r of roleDistribution">
            <div class="flex items-center justify-between text-sm mb-1">
              <div class="flex items-center gap-2">
                <app-role-badge [role]="r.role"></app-role-badge>
              </div>
              <span class="font-medium text-slate-700">{{ r.count }}</span>
            </div>
            <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                [class]="r.barClass"
                [style.width]="stats.totalUsers ? ((r.count / stats.totalUsers) * 100) + '%' : '0%'"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <a routerLink="/users" class="card p-4 flex items-center gap-3 hover:shadow-md transition-all duration-200 group cursor-pointer">
          <div class="w-9 h-9 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-700">Manage Users</p>
            <p class="text-xs text-slate-400">Roles & access</p>
          </div>
        </a>
        <a routerLink="/panels/super-admin/audit" class="card p-4 flex items-center gap-3 hover:shadow-md transition-all duration-200 group cursor-pointer">
          <div class="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
            <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-700">Audit Logs</p>
            <p class="text-xs text-slate-400">System activity</p>
          </div>
        </a>
        <a routerLink="/tasks" class="card p-4 flex items-center gap-3 hover:shadow-md transition-all duration-200 group cursor-pointer">
          <div class="w-9 h-9 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-700">All Tasks</p>
            <p class="text-xs text-slate-400">Platform-wide view</p>
          </div>
        </a>
      </div>
    </div>
  `
})
export class SuperAdminDashboardComponent implements OnInit {
  stats: PlatformStats = { totalUsers: 0, activeUsers: 0, totalTasks: 0, completedTasks: 0, pendingTasks: 0, recentSignups: 0 };
  roleDistribution: { role: 'super_admin' | 'admin' | 'manager' | 'member'; count: number; barClass: string }[] = [];

  constructor(private auth: AuthService) {}

  async ngOnInit(): Promise<void> {
    const [usersRes, tasksRes] = await Promise.all([
      supabase.from('profiles').select('role, status, created_at'),
      supabase.from('tasks').select('status')
    ]);

    const users = (usersRes.data ?? []) as { role: string; status: string; created_at: string }[];
    const tasks = (tasksRes.data ?? []) as { status: string }[];

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    this.stats = {
      totalUsers:     users.length,
      activeUsers:    users.filter(u => u.status === 'active').length,
      recentSignups:  users.filter(u => new Date(u.created_at) > weekAgo).length,
      totalTasks:     tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      pendingTasks:   tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length
    };

    const barClasses: Record<string, string> = {
      super_admin: 'bg-purple-400',
      admin:       'bg-red-400',
      manager:     'bg-blue-400',
      member:      'bg-slate-400'
    };

    this.roleDistribution = (['super_admin', 'admin', 'manager', 'member'] as const).map(role => ({
      role,
      count: users.filter(u => u.role === role).length,
      barClass: barClasses[role]
    }));
  }
}
