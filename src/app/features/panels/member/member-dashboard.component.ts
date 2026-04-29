import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, Validators } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { TasksDbService } from '../../../core/services/tasks-db.service';
import { GoalsService } from '../../../core/services/goals.service';
import { NotificationsService } from '../../../core/services/notifications.service';
import { Task, MemberGoal } from '../../../core/models/database.types';

@Component({
  selector: 'app-member-dashboard',
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
    <div class="max-w-4xl mx-auto animate-slide-up">
      <!-- Welcome -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">
            Good {{ greeting }}, <span class="text-primary-600">{{ (auth.profile$ | async)?.display_name }}</span>
          </h1>
          <p class="text-slate-500 text-sm mt-1">Here's your productivity overview for today</p>
        </div>
        <div class="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button *ngFor="let tab of tabs"
                  (click)="activeTab = tab.id"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  [class]="activeTab === tab.id ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'">
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div @staggerCards class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="anim-card">
          <app-stat-card label="My Tasks" [value]="stats.total"
            iconBg="bg-primary-50 text-primary-600"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'
          ></app-stat-card>
        </div>
        <div class="anim-card">
          <app-stat-card label="Done Today" [value]="doneToday"
            iconBg="bg-emerald-50 text-emerald-600"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
          ></app-stat-card>
        </div>
        <div class="anim-card">
          <app-stat-card label="Overdue" [value]="stats.overdue"
            iconBg="bg-red-50 text-red-500"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
          ></app-stat-card>
        </div>
        <div class="anim-card">
          <app-stat-card label="Completion" [value]="stats.rate + '%'"
            iconBg="bg-amber-50 text-amber-600"
            icon='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>'
          ></app-stat-card>
        </div>
      </div>

      <!-- Overview Tab -->
      <ng-container *ngIf="activeTab === 'overview'">
        <div class="grid md:grid-cols-2 gap-6 mb-6">
          <!-- Progress ring -->
          <div class="card p-5">
            <h2 class="font-semibold text-slate-800 mb-4">My Progress</h2>
            <div class="flex items-center gap-6">
              <div class="relative w-24 h-24 flex-shrink-0">
                <svg class="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" stroke-width="12"/>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" stroke-width="12"
                    stroke-linecap="round"
                    [attr.stroke-dasharray]="251.2"
                    [attr.stroke-dashoffset]="251.2 - (251.2 * stats.rate / 100)"
                    class="transition-all duration-1000"/>
                </svg>
                <span class="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-800">{{ stats.rate }}%</span>
              </div>
              <div class="space-y-2 flex-1">
                <div class="flex justify-between text-sm">
                  <span class="text-slate-500">Completed</span>
                  <span class="font-semibold text-emerald-600">{{ stats.done }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-500">Active</span>
                  <span class="font-semibold text-primary-600">{{ stats.total - stats.done }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-500">In Review</span>
                  <span class="font-semibold text-amber-500">{{ stats.inReview }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-slate-500">Overdue</span>
                  <span class="font-semibold text-red-500">{{ stats.overdue }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick actions -->
          <div class="card p-5">
            <h2 class="font-semibold text-slate-800 mb-4">Quick Actions</h2>
            <div class="space-y-3">
              <button class="w-full flex items-center gap-3 p-3 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors text-left" (click)="goToTasks()">
                <div class="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-primary-800">Create New Task</p>
                  <p class="text-xs text-primary-600">Add to your task list</p>
                </div>
              </button>
              <button class="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-left" (click)="checkNotifications()">
                <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-700">Check Overdue</p>
                  <p class="text-xs text-slate-500">Run overdue notifications check</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Active tasks -->
        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 class="font-semibold text-slate-800">Active Tasks</h2>
            <button class="text-xs text-primary-600 hover:text-primary-700 font-medium" (click)="goToTasks()">View all →</button>
          </div>
          <div class="divide-y divide-slate-50">
            <div *ngFor="let t of activeTasks" (click)="router.navigate(['/tasks', t.id])"
                 class="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer">
              <span class="w-2 h-2 rounded-full flex-shrink-0"
                [class]="t.status === 'in_progress' ? 'bg-blue-400 animate-pulse' : t.status === 'review' ? 'bg-amber-400' : 'bg-slate-300'"></span>
              <span class="flex-1 text-sm text-slate-700">{{ t.title }}</span>
              <span *ngIf="t.approval_status === 'pending'" class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">⏳</span>
              <app-priority-badge [priority]="t.priority"></app-priority-badge>
              <span *ngIf="t.due_date" class="text-xs" [class]="isOverdue(t) ? 'text-red-500 font-medium' : 'text-slate-400'">
                {{ t.due_date | date:'MMM d' }}
              </span>
            </div>
            <div *ngIf="!activeTasks.length" class="px-5 py-10 text-center text-slate-400 text-sm">
              No active tasks — you're all caught up! 🎉
            </div>
          </div>
        </div>
      </ng-container>

      <!-- Goals Tab -->
      <ng-container *ngIf="activeTab === 'goals'">
        <div class="space-y-5">
          <!-- Add Goal -->
          <div class="card p-5">
            <h2 class="font-semibold text-slate-800 mb-4">Set a New Goal</h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input [formControl]="goalTitleCtrl" type="text" class="input text-sm sm:col-span-1" placeholder="Goal title..."/>
              <div class="flex gap-3">
                <input [(ngModel)]="goalTarget" type="number" class="input text-sm w-24" min="1" placeholder="Target"/>
                <select [(ngModel)]="goalPeriod" class="input text-sm flex-1">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <button (click)="addGoal()" [disabled]="goalTitleCtrl.invalid" class="btn btn-primary text-sm">
                Add Goal
              </button>
            </div>
          </div>

          <!-- Goal Cards -->
          <div class="grid sm:grid-cols-2 gap-4">
            <div *ngFor="let g of goals"
                 class="card p-5 space-y-3">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="font-semibold text-slate-800">{{ g.title }}</h3>
                  <span class="text-xs text-slate-400 capitalize">{{ g.period }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <button (click)="syncGoals()" class="text-xs text-primary-500 hover:text-primary-700 font-medium">Sync</button>
                  <button (click)="deleteGoal(g.id)" class="btn-icon text-slate-300 hover:text-red-500">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-sm text-slate-600">{{ g.current_count }} / {{ g.target_count }}</span>
                  <span class="text-sm font-bold" [class]="getGoalPct(g) >= 100 ? 'text-emerald-600' : 'text-primary-600'">
                    {{ getGoalPct(g) }}%
                  </span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700"
                       [class]="getGoalPct(g) >= 100 ? 'bg-emerald-500' : 'bg-primary-500'"
                       [style.width.%]="getGoalPct(g)"></div>
                </div>
              </div>

              <div *ngIf="getGoalPct(g) >= 100"
                   class="flex items-center gap-2 text-emerald-600 text-xs font-medium">
                <span>🎉</span> Goal achieved!
              </div>
            </div>
          </div>

          <div *ngIf="!goals.length" class="text-center py-12 text-slate-400">
            <p class="text-4xl mb-3">🎯</p>
            <p class="font-medium text-slate-600">No goals set yet</p>
            <p class="text-sm">Set weekly or monthly goals to track your progress</p>
          </div>
        </div>
      </ng-container>

      <!-- Weekly Report Tab -->
      <ng-container *ngIf="activeTab === 'report'">
        <div class="space-y-5">
          <div class="card p-6">
            <h2 class="font-semibold text-slate-800 mb-5">Weekly Summary</h2>
            <div class="grid sm:grid-cols-3 gap-5 mb-6">
              <div class="text-center p-4 bg-emerald-50 rounded-2xl">
                <p class="text-3xl font-bold text-emerald-600">{{ weeklyCompleted }}</p>
                <p class="text-sm text-emerald-700 mt-1">Tasks Completed</p>
              </div>
              <div class="text-center p-4 bg-blue-50 rounded-2xl">
                <p class="text-3xl font-bold text-blue-600">{{ weeklyCreated }}</p>
                <p class="text-sm text-blue-700 mt-1">Tasks Created</p>
              </div>
              <div class="text-center p-4 bg-amber-50 rounded-2xl">
                <p class="text-3xl font-bold text-amber-600">{{ stats.overdue }}</p>
                <p class="text-sm text-amber-700 mt-1">Still Overdue</p>
              </div>
            </div>

            <h3 class="font-semibold text-slate-700 mb-3">Completed This Week</h3>
            <div class="space-y-2">
              <div *ngFor="let t of weeklyDone" class="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                <span class="text-emerald-500">✓</span>
                <span class="flex-1 text-sm text-slate-700">{{ t.title }}</span>
                <span class="text-xs text-slate-400">{{ t.updated_at | date:'EEE, MMM d' }}</span>
              </div>
              <div *ngIf="!weeklyDone.length" class="py-4 text-center text-slate-400 text-sm">
                Nothing completed this week yet. Keep going!
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class MemberDashboardComponent implements OnInit, OnDestroy {
  stats = { total: 0, done: 0, overdue: 0, highPrio: 0, rate: 0, inReview: 0 };
  activeTasks: Task[] = [];
  doneToday = 0;
  weeklyCompleted = 0;
  weeklyCreated = 0;
  weeklyDone: Task[] = [];
  goals: MemberGoal[] = [];
  goalTitleCtrl = new FormControl('', Validators.required);
  goalTarget = 5;
  goalPeriod: 'weekly' | 'monthly' = 'weekly';
  activeTab: 'overview' | 'goals' | 'report' = 'overview';
  tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'goals' as const, label: 'Goals' },
    { id: 'report' as const, label: 'Weekly Report' }
  ];
  private sub = new Subscription();
  private userId = '';

  constructor(
    public auth: AuthService,
    public router: Router,
    private tasksSvc: TasksDbService,
    private goalsSvc: GoalsService,
    private notifSvc: NotificationsService
  ) {}

  async ngOnInit(): Promise<void> {
    this.userId = this.auth.currentUser?.id || '';
    if (!this.userId) return;

    await this.tasksSvc.loadForUser(this.userId);
    this.sub.add(this.tasksSvc.tasks$.subscribe(tasks => {
      this.stats = this.tasksSvc.getStats(tasks);
      this.activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && !t.deleted_at).slice(0, 8);
      const today = new Date().toDateString();
      this.doneToday = tasks.filter(t => t.status === 'done' && new Date(t.updated_at).toDateString() === today).length;
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      this.weeklyDone = tasks.filter(t => t.status === 'done' && new Date(t.updated_at) >= weekAgo);
      this.weeklyCompleted = this.weeklyDone.length;
      this.weeklyCreated = tasks.filter(t => new Date(t.created_at) >= weekAgo).length;
    }));

    await this.goalsSvc.loadForUser(this.userId);
    this.sub.add(this.goalsSvc.goals$.subscribe(g => this.goals = g));
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
  }

  isOverdue(t: Task): boolean {
    return !!t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
  }

  goToTasks(): void { this.router.navigate(['/tasks']); }

  async checkNotifications(): Promise<void> {
    await this.notifSvc.checkOverdueTasks(this.userId);
  }

  async addGoal(): Promise<void> {
    if (this.goalTitleCtrl.invalid) return;
    await this.goalsSvc.create(this.userId, {
      title: this.goalTitleCtrl.value!.trim(),
      target_count: this.goalTarget,
      period: this.goalPeriod
    });
    this.goalTitleCtrl.reset();
  }

  async syncGoals(): Promise<void> {
    await this.goalsSvc.syncFromTasks(this.userId);
  }

  async deleteGoal(id: string): Promise<void> {
    await this.goalsSvc.delete(id, this.userId);
  }

  getGoalPct(g: MemberGoal): number {
    return g.target_count ? Math.min(Math.round((g.current_count / g.target_count) * 100), 100) : 0;
  }
}
