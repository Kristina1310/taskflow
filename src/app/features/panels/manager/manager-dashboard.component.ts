import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { TasksDbService } from '../../../core/services/tasks-db.service';
import { ProfileService } from '../../../core/services/profile.service';
import { SlaService } from '../../../core/services/sla.service';
import { Task, Profile } from '../../../core/models/database.types';
import { SlaStatus } from '../../../core/services/sla.service';

@Component({
  selector: 'app-manager-dashboard',
  animations: [
    trigger('staggerCards', [
      transition(':enter', [
        query('.anim-card', [
          style({ opacity: 0, transform: 'translateY(12px)' }),
          stagger('60ms', [animate('280ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))])
        ], { optional: true })
      ])
    ])
  ],
  template: `
    <div class="max-w-7xl mx-auto animate-slide-up">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <div class="flex items-center gap-3 mb-1">
            <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-slate-800">Manager Dashboard</h1>
          </div>
          <p class="text-slate-500 text-sm">Team overview, workload and board view</p>
        </div>
        <!-- View toggle -->
        <div class="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button *ngFor="let v of views"
                  (click)="activeView = v.id"
                  class="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                  [class]="activeView === v.id ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'">
            {{ v.label }}
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div @staggerCards class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div class="anim-card">
          <app-stat-card label="Total Tasks" [value]="stats.total"
            iconBg="bg-blue-50 text-blue-600"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'
          ></app-stat-card>
        </div>
        <div class="anim-card">
          <app-stat-card label="Completion" [value]="stats.rate + '%'"
            iconBg="bg-emerald-50 text-emerald-600"
            [sub]="stats.done + ' done'"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
          ></app-stat-card>
        </div>
        <div class="anim-card">
          <app-stat-card label="In Review" [value]="stats.inReview"
            iconBg="bg-amber-50 text-amber-600"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>'
          ></app-stat-card>
        </div>
        <div class="anim-card">
          <app-stat-card label="Overdue" [value]="stats.overdue"
            iconBg="bg-red-50 text-red-500"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
          ></app-stat-card>
        </div>
        <div class="anim-card">
          <app-stat-card label="SLA Breaches" [value]="slaBreaches"
            iconBg="bg-rose-50 text-rose-600"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>'
          ></app-stat-card>
        </div>
      </div>

      <!-- List View -->
      <ng-container *ngIf="activeView === 'list'">
        <!-- Progress -->
        <div class="card p-5 mb-6">
          <div class="flex items-center justify-between mb-3">
            <h2 class="font-semibold text-slate-800">Overall Progress</h2>
            <span class="text-2xl font-bold text-primary-600">{{ stats.rate }}%</span>
          </div>
          <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-1000"
                 [style.width]="stats.rate + '%'"></div>
          </div>
        </div>

        <!-- Team workload -->
        <div class="card p-5 mb-6" *ngIf="teamWorkload.length">
          <h2 class="font-semibold text-slate-800 mb-4">Team Workload</h2>
          <div class="space-y-3">
            <div *ngFor="let m of teamWorkload" class="flex items-center gap-4">
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {{ m.name.charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between mb-1">
                  <span class="text-sm font-medium text-slate-700 truncate">{{ m.name }}</span>
                  <span class="text-xs text-slate-400 ml-2">{{ m.active }} active / {{ m.total }} total</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700"
                       [class]="m.active > 8 ? 'bg-red-400' : m.active > 4 ? 'bg-amber-400' : 'bg-blue-400'"
                       [style.width]="m.total ? ((m.active / m.total) * 100) + '%' : '0%'"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- SLA warnings -->
        <div *ngIf="slaWarnings.length" class="card p-5 mb-6">
          <h2 class="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span class="text-amber-500">⚠️</span> SLA Alerts
          </h2>
          <div class="space-y-2">
            <div *ngFor="let s of slaWarnings"
                 (click)="router.navigate(['/tasks', s.taskId])"
                 class="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                 [class.border-l-4]="true"
                 [class.border-red-400]="s.status === 'breached'"
                 [class.border-amber-400]="s.status === 'warning'">
              <span [class]="s.status === 'breached' ? 'text-red-600 font-bold text-sm' : 'text-amber-600 font-medium text-sm'">
                {{ s.status === 'breached' ? '🚨 BREACH' : '⚠️ WARNING' }}
              </span>
              <span class="flex-1 text-sm text-slate-700 truncate">{{ s.title }}</span>
              <span class="text-xs text-slate-400">
                {{ s.hoursRemaining !== null && s.hoursRemaining >= 0 ? s.hoursRemaining + 'h left' : 'Overdue' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Recent tasks table -->
        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100">
            <h2 class="font-semibold text-slate-800">Recent Tasks</h2>
          </div>
          <div class="divide-y divide-slate-50">
            <div *ngFor="let t of recentTasks"
                 (click)="router.navigate(['/tasks', t.id])"
                 class="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer">
              <span class="w-2 h-2 rounded-full flex-shrink-0"
                [class]="t.status === 'done' ? 'bg-emerald-400' : t.status === 'in_progress' ? 'bg-blue-400' : t.status === 'review' ? 'bg-amber-400' : 'bg-slate-300'"></span>
              <span class="flex-1 text-sm text-slate-700 truncate">{{ t.title }}</span>
              <span *ngIf="t.assignee" class="text-xs text-slate-400">{{ t.assignee.display_name }}</span>
              <app-priority-badge [priority]="t.priority"></app-priority-badge>
              <span class="text-xs text-slate-400 flex-shrink-0">{{ t.created_at | relativeDate }}</span>
            </div>
            <div *ngIf="!recentTasks.length" class="px-5 py-8 text-center text-slate-400 text-sm">No tasks yet</div>
          </div>
        </div>
      </ng-container>

      <!-- Kanban Board View -->
      <ng-container *ngIf="activeView === 'board'">
        <div class="card p-5">
          <h2 class="font-semibold text-slate-800 mb-4">Task Board</h2>
          <app-kanban-board [tasks]="allTasks" (taskClick)="router.navigate(['/tasks', $event.id])"></app-kanban-board>
        </div>
      </ng-container>
    </div>
  `
})
export class ManagerDashboardComponent implements OnInit, OnDestroy {
  stats = { total: 0, done: 0, overdue: 0, highPrio: 0, rate: 0, inReview: 0 };
  recentTasks: Task[] = [];
  allTasks: Task[] = [];
  teamWorkload: { name: string; active: number; total: number }[] = [];
  slaWarnings: SlaStatus[] = [];
  slaBreaches = 0;
  activeView: 'list' | 'board' = 'list';
  views = [
    { id: 'list' as const, label: 'List' },
    { id: 'board' as const, label: 'Board' }
  ];

  private sub = new Subscription();

  constructor(
    public router: Router,
    private auth: AuthService,
    private tasksSvc: TasksDbService,
    private profileSvc: ProfileService,
    private slaSvc: SlaService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.slaSvc.loadPolicies();
    await this.tasksSvc.loadAll();
    this.sub.add(
      this.tasksSvc.tasks$.subscribe(tasks => {
        this.stats = this.tasksSvc.getStats(tasks);
        this.allTasks = tasks;
        this.recentTasks = tasks.filter(t => !t.deleted_at).slice(0, 10);
        this.buildWorkload(tasks);
        const slaStatus = this.slaSvc.evaluateTasks(tasks);
        this.slaWarnings = slaStatus.filter(s => s.status !== 'ok');
        this.slaBreaches = slaStatus.filter(s => s.status === 'breached').length;
      })
    );
    await this.profileSvc.loadAll();
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  private buildWorkload(tasks: Task[]): void {
    const map = new Map<string, { name: string; active: number; total: number }>();
    for (const t of tasks.filter(x => !x.deleted_at)) {
      const id   = t.assignee_id ?? t.owner_id;
      const name = t.assignee?.display_name ?? t.owner?.display_name ?? 'Unknown';
      if (!map.has(id)) map.set(id, { name, active: 0, total: 0 });
      const entry = map.get(id)!;
      entry.total++;
      if (t.status !== 'done' && t.status !== 'cancelled') entry.active++;
    }
    this.teamWorkload = Array.from(map.values()).sort((a, b) => b.active - a.active).slice(0, 8);
  }
}
