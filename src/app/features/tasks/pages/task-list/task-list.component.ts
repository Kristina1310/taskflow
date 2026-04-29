import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { TasksDbService, TaskFilter } from '../../../../core/services/tasks-db.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Task, Profile, AppRole } from '../../../../core/models/database.types';
import { hasPermission, STATUS_LABELS, STATUS_COLORS } from '../../../../core/models/permissions';

@Component({
  selector: 'app-task-list',
  animations: [
    trigger('listStagger', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(8px)' }),
          stagger('40ms', [animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))])
        ], { optional: true })
      ])
    ]),
    trigger('pageAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div @pageAnim class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Tasks</h1>
          <p class="text-sm text-slate-400 mt-0.5">{{ canViewAll ? 'All platform tasks' : 'Your tasks' }}</p>
        </div>
        <div class="flex items-center gap-2">
          <!-- Bulk assign button -->
          <button *ngIf="selectedIds.length && canAssign"
                  (click)="bulkAssignOpen = true"
                  class="btn btn-secondary btn-sm">
            Bulk Assign ({{ selectedIds.length }})
          </button>
          <button class="btn btn-primary shadow-md shadow-primary-200" (click)="openAddModal()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            New Task
          </button>
        </div>
      </div>

      <!-- Filter + search -->
      <div class="flex flex-col sm:flex-row gap-3 mb-4">
        <div class="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button *ngFor="let tab of filterTabs"
            class="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
            [class]="activeFilter === tab.id ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            (click)="setFilter(tab.id)"
          >
            {{ tab.label }}
            <span class="text-xs px-1.5 py-0.5 rounded-full font-medium"
              [class]="activeFilter === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-500'"
            >{{ (counts$ | async)?.[tab.id] ?? 0 }}</span>
          </button>
        </div>
        <div class="relative flex-1 sm:max-w-xs">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
          </svg>
          <input type="text" placeholder="Search tasks…" class="input pl-9 text-sm" (input)="onSearch($event)"/>
        </div>
      </div>

      <!-- Workload summary (managers+) -->
      <div *ngIf="canViewAll && workloadScores.length" class="card p-4 mb-4">
        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Team Workload</h3>
        <div class="flex flex-wrap gap-2">
          <div *ngFor="let w of workloadScores.slice(0, 5)"
               class="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5">
            <div class="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">
              {{ w.displayName.charAt(0).toUpperCase() }}
            </div>
            <span class="text-xs text-slate-700 font-medium">{{ w.displayName }}</span>
            <span class="text-xs font-bold" [class]="w.score > 10 ? 'text-red-500' : w.score > 5 ? 'text-amber-500' : 'text-emerald-500'">
              {{ w.taskCount }} tasks
            </span>
          </div>
        </div>
      </div>

      <!-- Task list -->
      <div *ngIf="filteredTasks$ | async as tasks" [@listStagger]="tasks.length" class="space-y-3">
        <ng-container *ngIf="tasks.length > 0; else empty">
          <div
            *ngFor="let task of tasks; trackBy: trackById"
            class="card p-4 flex items-start gap-4 group hover:shadow-md transition-all duration-200 cursor-pointer"
            [class.opacity-60]="task.status === 'done'"
            [class.ring-2]="selectedIds.includes(task.id)"
            [class.ring-primary-400]="selectedIds.includes(task.id)"
            (click)="viewDetail(task.id)"
          >
            <!-- Checkbox for bulk select -->
            <div class="flex flex-col gap-3 flex-shrink-0">
              <input *ngIf="canAssign"
                     type="checkbox"
                     class="w-4 h-4 rounded accent-primary-600 cursor-pointer mt-0.5"
                     [checked]="selectedIds.includes(task.id)"
                     (change)="toggleSelect(task.id, $event)"
                     (click)="$event.stopPropagation()" />
              <!-- Status toggle -->
              <button
                class="w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center focus:outline-none"
                [class]="task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-primary-400'"
                (click)="$event.stopPropagation(); quickToggle(task)">
                <svg *ngIf="task.status === 'done'" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-medium text-slate-800 text-sm leading-snug"
                    [class.line-through]="task.status === 'done'"
                    [class.text-slate-400]="task.status === 'done'">
                  {{ task.title }}
                </h3>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <span [class]="getStatusColor(task.status) + ' text-xs font-semibold px-2 py-0.5 rounded-full'">
                    {{ getStatusLabel(task.status) }}
                  </span>
                  <app-priority-badge [priority]="task.priority"></app-priority-badge>
                  <a *ngIf="task.team_id" [routerLink]="['/teams', task.team_id]"
                    class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-600 font-semibold border border-primary-100 hover:bg-primary-100 transition-colors"
                    (click)="$event.stopPropagation()">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Team
                  </a>
                  <span *ngIf="task.team_id && !task.visible_on_team_board"
                    class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 font-semibold">
                    Pending approval
                  </span>
                </div>
              </div>
              <p *ngIf="task.description" class="mt-1 text-xs text-slate-400">{{ task.description | truncate:90 }}</p>

              <!-- Subtask progress bar -->
              <div *ngIf="task.subtasks?.length" class="mt-2 flex items-center gap-2">
                <div class="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                  <div class="h-full bg-emerald-400 rounded-full transition-all"
                       [style.width.%]="getSubtaskPct(task)"></div>
                </div>
                <span class="text-xs text-slate-400">{{ getDoneSubtasks(task) }}/{{ task.subtasks!.length }}</span>
              </div>

              <div class="mt-2 flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                <span *ngIf="task.due_date" class="flex items-center gap-1" [class.text-red-500]="isOverdue(task)">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  {{ task.due_date | date:'MMM d' }}
                </span>
                <span *ngIf="task.assignee" class="flex items-center gap-1">
                  <div class="w-4 h-4 rounded-full bg-primary-400 flex items-center justify-center text-white text-xs font-bold">
                    {{ task.assignee.display_name.charAt(0) }}
                  </div>
                  {{ task.assignee.display_name }}
                </span>
                <span *ngIf="task.approval_status === 'pending'"
                      class="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-medium">
                  ⏳ Approval
                </span>
                <span>{{ task.created_at | relativeDate }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button class="btn-icon text-slate-400 hover:bg-primary-50 hover:text-primary-600"
                (click)="$event.stopPropagation(); openEdit(task)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button *appCan="'tasks.delete.any'"
                class="btn-icon text-slate-400 hover:bg-red-50 hover:text-red-500"
                (click)="$event.stopPropagation(); confirmDelete(task)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </ng-container>
        <ng-template #empty>
          <div class="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
            </div>
            <h3 class="font-semibold text-slate-700 mb-1">No tasks found</h3>
            <p class="text-sm text-slate-400 mb-4">Create your first task to get started</p>
            <button class="btn btn-primary" (click)="openAddModal()">New Task</button>
          </div>
        </ng-template>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <app-modal [isOpen]="modalOpen" [title]="editingTask ? 'Edit Task' : 'New Task'" (close)="closeModal()">
      <form [formGroup]="taskForm" (ngSubmit)="onSave()" class="space-y-4">
        <div>
          <label class="label">Title <span class="text-red-500">*</span></label>
          <input formControlName="title" type="text" class="input" placeholder="What needs to be done?" autocomplete="off"/>
          <p *ngIf="fi('title')?.invalid && fi('title')?.touched" class="mt-1 text-xs text-red-500">Title is required</p>
        </div>
        <div>
          <label class="label">Description</label>
          <textarea formControlName="description" rows="3" class="input resize-none" placeholder="Add details…"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">Priority</label>
            <select formControlName="priority" class="input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label class="label">Due Date</label>
            <input formControlName="due_date" type="date" class="input"/>
          </div>
        </div>
        <div *ngIf="canAssign && teamMembers.length">
          <label class="label">Assign To</label>
          <select formControlName="assignee_id" class="input">
            <option value="">Unassigned</option>
            <option *ngFor="let m of teamMembers" [value]="m.id">{{ m.display_name }}</option>
          </select>
        </div>
        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <app-button variant="secondary" (onClick)="closeModal()">Cancel</app-button>
          <app-button variant="primary" type="submit" [disabled]="taskForm.invalid">
            {{ editingTask ? 'Save Changes' : 'Add Task' }}
          </app-button>
        </div>
      </form>
    </app-modal>

    <!-- Delete confirm -->
    <app-modal [isOpen]="deleteOpen" title="Delete Task" size="sm" (close)="deleteOpen = false">
      <p class="text-sm text-slate-600 mb-5">Soft-delete "<strong>{{ deletingTask?.title }}</strong>"? Admins can restore it.</p>
      <div class="flex justify-end gap-3">
        <app-button variant="secondary" (onClick)="deleteOpen = false">Cancel</app-button>
        <app-button variant="danger" (onClick)="doDelete()">Delete</app-button>
      </div>
    </app-modal>

    <!-- Bulk Assign Modal -->
    <app-modal [isOpen]="bulkAssignOpen" title="Bulk Assign Tasks" size="sm" (close)="bulkAssignOpen = false">
      <p class="text-sm text-slate-600 mb-4">Assign {{ selectedIds.length }} tasks to:</p>
      <select [(ngModel)]="bulkAssigneeId" class="input mb-4">
        <option value="">Select assignee...</option>
        <option *ngFor="let m of teamMembers" [value]="m.id">{{ m.display_name }}</option>
      </select>
      <div class="flex justify-end gap-3">
        <app-button variant="secondary" (onClick)="bulkAssignOpen = false">Cancel</app-button>
        <app-button variant="primary" (onClick)="doBulkAssign()" [disabled]="!bulkAssigneeId">Assign</app-button>
      </div>
    </app-modal>
  `
})
export class TaskListComponent implements OnInit, OnDestroy {
  filteredTasks$ = this.tasksSvc.filteredTasks$;
  counts$ = this.tasksSvc.counts$;
  activeFilter: TaskFilter = 'all';

  modalOpen = false;
  editingTask: Task | null = null;
  deleteOpen = false;
  deletingTask: Task | null = null;
  bulkAssignOpen = false;
  bulkAssigneeId = '';
  selectedIds: string[] = [];
  teamMembers: Profile[] = [];
  workloadScores: { userId: string; displayName: string; taskCount: number; score: number }[] = [];
  taskForm!: FormGroup;
  private actorId = '';
  private actorRole: AppRole = 'member';

  filterTabs = [
    { id: 'all' as TaskFilter,    label: 'All' },
    { id: 'active' as TaskFilter, label: 'Active' },
    { id: 'done' as TaskFilter,   label: 'Done' }
  ];

  private destroy$ = new Subject<void>();

  get canViewAll(): boolean { return this.auth.currentRole !== 'member'; }
  get canAssign(): boolean  {
    const role = this.auth.currentRole;
    return !!role && hasPermission(role, 'tasks.assign');
  }

  constructor(
    private tasksSvc: TasksDbService,
    private profileSvc: ProfileService,
    public auth: AuthService,
    private toast: ToastService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.taskForm = this.fb.group({
      title:       ['', Validators.required],
      description: [''],
      priority:    ['medium'],
      due_date:    [''],
      assignee_id: ['']
    });

    this.auth.state$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      if (state.profile) {
        this.actorId = state.profile.id;
        this.actorRole = state.profile.role;
      }
    });

    if (this.canViewAll) {
      this.tasksSvc.loadAll().then(() => this.refreshWorkload());
    } else {
      this.tasksSvc.loadForUser(this.auth.currentUser!.id);
    }

    if (this.canAssign) {
      this.profileSvc.loadAll();
      this.profileSvc.users$.pipe(takeUntil(this.destroy$)).subscribe(u => this.teamMembers = u);
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  async refreshWorkload(): Promise<void> {
    this.workloadScores = await this.tasksSvc.getWorkloadScores();
  }

  trackById(_: number, t: Task) { return t.id; }
  fi(f: string) { return this.taskForm.get(f); }

  getStatusLabel(s: string): string { return STATUS_LABELS[s] || s; }
  getStatusColor(s: string): string { return STATUS_COLORS[s] || ''; }

  setFilter(f: TaskFilter): void {
    this.activeFilter = f;
    this.tasksSvc.setFilter(f);
  }

  onSearch(e: Event): void { this.tasksSvc.setSearch((e.target as HTMLInputElement).value); }

  openAddModal(): void { this.editingTask = null; this.resetForm(); this.modalOpen = true; }

  openEdit(t: Task): void {
    this.editingTask = t;
    this.taskForm?.patchValue({ title: t.title, description: t.description, priority: t.priority, due_date: t.due_date ?? '', assignee_id: t.assignee_id ?? '' });
    this.modalOpen = true;
  }

  closeModal(): void { this.modalOpen = false; this.editingTask = null; }

  private resetForm(): void {
    this.taskForm?.reset({ priority: 'medium', title: '', description: '', due_date: '', assignee_id: '' });
  }

  async onSave(): Promise<void> {
    if (!this.taskForm?.valid) { this.taskForm?.markAllAsTouched(); return; }
    const v = this.taskForm.value;
    try {
      if (this.editingTask) {
        await this.tasksSvc.update(this.editingTask.id, v, this.actorId);
        this.toast.success('Task updated');
      } else {
        await this.tasksSvc.create(v, this.actorId);
        this.toast.success('Task created');
      }
      this.closeModal();
      if (this.canViewAll) await this.refreshWorkload();
    } catch { this.toast.error('Failed to save task'); }
  }

  async quickToggle(t: Task): Promise<void> {
    const newStatus = t.status === 'done' ? 'todo' : 'done';
    await this.tasksSvc.update(t.id, { status: newStatus }, this.actorId);
  }

  toggleSelect(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds = [...this.selectedIds, id];
    } else {
      this.selectedIds = this.selectedIds.filter(sid => sid !== id);
    }
  }

  async doBulkAssign(): Promise<void> {
    if (!this.bulkAssigneeId || !this.selectedIds.length) return;
    try {
      await this.tasksSvc.bulkAssign(this.selectedIds, this.bulkAssigneeId, this.actorId);
      this.toast.success(`${this.selectedIds.length} tasks assigned`);
      this.selectedIds = [];
      this.bulkAssigneeId = '';
      this.bulkAssignOpen = false;
      await this.refreshWorkload();
    } catch {
      this.toast.error('Bulk assign failed');
    }
  }

  confirmDelete(t: Task): void { this.deletingTask = t; this.deleteOpen = true; }

  async doDelete(): Promise<void> {
    if (!this.deletingTask) return;
    try {
      await this.tasksSvc.softDelete(this.deletingTask.id, this.actorId);
      this.toast.success('Task deleted');
    } catch { this.toast.error('Failed to delete task'); }
    this.deleteOpen = false;
    this.deletingTask = null;
  }

  isOverdue(t: Task): boolean {
    return !!t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
  }

  getSubtaskPct(t: Task): number {
    if (!t.subtasks?.length) return 0;
    return Math.round((t.subtasks.filter(s => s.completed).length / t.subtasks.length) * 100);
  }

  getDoneSubtasks(t: Task): number {
    return t.subtasks?.filter(s => s.completed).length || 0;
  }

  viewDetail(id: string): void { this.router.navigate(['/tasks', id]); }
}
