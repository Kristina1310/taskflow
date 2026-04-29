import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { TasksDbService } from '../../../../core/services/tasks-db.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { TeamService } from '../../../../core/services/team.service';
import { Task, TaskStatus, Profile, AppRole, TeamRole } from '../../../../core/models/database.types';
import {
  canTransition, WORKFLOW_TRANSITIONS, STATUS_LABELS, STATUS_COLORS,
  hasPermission, TEAM_ROLE_LABELS, TEAM_ROLE_COLORS, canDoTeamAction
} from '../../../../core/models/permissions';

@Component({
  selector: 'app-task-detail',
  animations: [
    trigger('pageAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div @pageAnim class="max-w-4xl mx-auto" *ngIf="task; else loading">
      <!-- Back -->
      <button class="flex items-center gap-2 text-sm text-slate-500 hover:text-primary-600 transition-colors mb-6 group" (click)="goBack()">
        <svg class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        {{ isFromTeamBoard ? 'Back to team board' : 'Back to tasks' }}
      </button>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Column -->
        <div class="lg:col-span-2 space-y-5">
          <!-- Task header card -->
          <div class="card p-6 space-y-4">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <h1 class="text-xl font-bold text-slate-800 leading-tight"
                    [class.line-through]="task.status === 'done'"
                    [class.text-slate-400]="task.status === 'done'">
                  {{ task.title }}
                </h1>
                <div class="flex items-center gap-2 mt-2 flex-wrap">
                  <span [class]="getStatusColor(task.status) + ' text-xs font-semibold px-2.5 py-1 rounded-full'">
                    {{ getStatusLabel(task.status) }}
                  </span>
                  <app-priority-badge [priority]="task.priority"></app-priority-badge>
                  <span *ngIf="task.approval_status === 'pending'"
                        class="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                    ⏳ Pending Approval
                  </span>
                  <span *ngIf="task.approval_status === 'approved'"
                        class="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
                    ✅ Approved
                  </span>
                  <span *ngIf="task.approval_status === 'rejected'"
                        class="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">
                    ❌ Rejected
                  </span>
                  <span *ngIf="isOverdue" class="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-semibold">
                    ⚠️ Overdue
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button (click)="editOpen = true"
                        class="btn btn-secondary btn-sm">
                  Edit
                </button>
                <button *appCan="'tasks.delete.any'"
                        (click)="deleteOpen = true"
                        class="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">
                  Delete
                </button>
              </div>
            </div>

            <!-- Description -->
            <div *ngIf="task.description" class="border-t border-slate-100 pt-4">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</p>
              <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{{ task.description }}</p>
            </div>

            <!-- Approval note -->
            <div *ngIf="task.approval_note" class="border-t border-slate-100 pt-4">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Approval Note</p>
              <p class="text-sm text-slate-600 leading-relaxed italic">"{{ task.approval_note }}"</p>
            </div>

            <!-- Workflow transitions -->
            <div class="border-t border-slate-100 pt-4">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Workflow</p>
              <div class="flex flex-wrap gap-2">
                <button
                  *ngFor="let s of availableTransitions"
                  (click)="transitionTo(s)"
                  class="btn btn-sm px-3 py-1.5 text-xs font-medium border transition-all"
                  [class]="getTransitionBtnClass(s)">
                  → {{ getStatusLabel(s) }}
                </button>
                <span *ngIf="!availableTransitions.length" class="text-xs text-slate-400">
                  No transitions available
                </span>
              </div>
            </div>

            <!-- Approval actions -->
            <div *ngIf="task.approval_status === 'pending' && canApprove"
                 class="border-t border-slate-100 pt-4">
              <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Approval Actions</p>
              <div class="flex gap-3">
                <button (click)="approveTask()"
                        class="btn btn-sm bg-emerald-500 text-white hover:bg-emerald-600 border-0">
                  ✅ Approve
                </button>
                <button (click)="rejectOpen = true"
                        class="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">
                  ❌ Reject
                </button>
              </div>
            </div>
          </div>

          <!-- Subtasks -->
          <div class="card p-5">
            <app-task-subtasks [taskId]="task.id"></app-task-subtasks>
          </div>

          <!-- Comments -->
          <div class="card p-5">
            <app-task-comments [taskId]="task.id"></app-task-comments>
          </div>

          <!-- Attachments -->
          <div class="card p-5">
            <app-task-attachments [taskId]="task.id"></app-task-attachments>
          </div>
        </div>

        <!-- Sidebar Column -->
        <div class="space-y-5">
          <!-- Details -->
          <div class="card p-5 space-y-4">
            <h3 class="font-semibold text-slate-700 text-sm">Details</h3>
            <div class="space-y-3 text-sm">
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Owner</p>
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">
                    {{ task.owner?.display_name?.charAt(0)?.toUpperCase() }}
                  </div>
                  <span class="text-slate-700">{{ task.owner?.display_name ?? '—' }}</span>
                </div>
              </div>

              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Assignee</p>
                <div *ngIf="task.assignee" class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">
                    {{ task.assignee.display_name.charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-slate-700">{{ task.assignee.display_name }}</span>
                </div>
                <p *ngIf="!task.assignee" class="text-slate-400">Unassigned</p>

                <!-- Reassign dropdown -->
                <div *appCan="'tasks.assign'" class="mt-2">
                  <select class="input text-xs py-1" (change)="reassign($event)">
                    <option value="">Reassign to...</option>
                    <option *ngFor="let m of teamMembers" [value]="m.id">{{ m.display_name }}</option>
                  </select>
                </div>
              </div>

              <div *ngIf="task.due_date">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</p>
                <p [class.text-red-500]="isOverdue" [class.text-slate-700]="!isOverdue" class="font-medium">
                  {{ task.due_date | date:'MMMM d, y' }}
                </p>
              </div>

              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Created</p>
                <p class="text-slate-600">{{ task.created_at | relativeDate }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Last Updated</p>
                <p class="text-slate-600">{{ task.updated_at | relativeDate }}</p>
              </div>

              <!-- Team context badge -->
              <div *ngIf="task.team_id">
                <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Team</p>
                <a [routerLink]="['/teams', task.team_id]"
                  class="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  View on team board
                </a>
                <div *ngIf="task.visible_on_team_board === false"
                  class="mt-1.5 text-[10px] bg-amber-50 text-amber-600 border border-amber-100 rounded px-2 py-1">
                  Pending board approval
                </div>
                <div *ngIf="task.visible_on_team_board && task.team_id"
                  class="mt-1.5 text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 rounded px-2 py-1">
                  Visible on team board
                </div>
              </div>
            </div>
          </div>

          <!-- Assignment history -->
          <div class="card p-5">
            <app-task-timeline [taskId]="task.id"></app-task-timeline>
          </div>
        </div>
      </div>
    </div>

    <ng-template #loading>
      <div class="animate-pulse space-y-4 max-w-4xl mx-auto">
        <div class="h-8 bg-slate-100 rounded-xl w-32"></div>
        <div class="h-64 bg-slate-100 rounded-2xl"></div>
      </div>
    </ng-template>

    <!-- Edit Modal -->
    <app-modal [isOpen]="editOpen" title="Edit Task" (close)="editOpen = false">
      <form *ngIf="editOpen && editForm" [formGroup]="editForm" (ngSubmit)="onSave()" class="space-y-4">
        <div>
          <label class="label">Title</label>
          <input formControlName="title" type="text" class="input"/>
        </div>
        <div>
          <label class="label">Description</label>
          <textarea formControlName="description" rows="3" class="input resize-none"></textarea>
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
        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <app-button variant="secondary" (onClick)="editOpen = false">Cancel</app-button>
          <app-button variant="primary" type="submit">Save Changes</app-button>
        </div>
      </form>
    </app-modal>

    <!-- Delete confirm -->
    <app-modal [isOpen]="deleteOpen" title="Delete Task" size="sm" (close)="deleteOpen = false">
      <p class="text-sm text-slate-600 mb-5">Soft-delete "<strong>{{ task?.title }}</strong>"? It can be restored by an admin.</p>
      <div class="flex justify-end gap-3">
        <app-button variant="secondary" (onClick)="deleteOpen = false">Cancel</app-button>
        <app-button variant="danger" (onClick)="doDelete()">Delete</app-button>
      </div>
    </app-modal>

    <!-- Reject Modal -->
    <app-modal [isOpen]="rejectOpen" title="Reject Task" size="sm" (close)="rejectOpen = false">
      <div class="space-y-3">
        <p class="text-sm text-slate-600">Provide a reason for rejection:</p>
        <textarea
          [(ngModel)]="rejectNote"
          rows="3"
          placeholder="Rejection reason..."
          class="input resize-none w-full text-sm">
        </textarea>
        <div class="flex justify-end gap-3 pt-2">
          <app-button variant="secondary" (onClick)="rejectOpen = false">Cancel</app-button>
          <app-button variant="danger" (onClick)="rejectTask()">Reject</app-button>
        </div>
      </div>
    </app-modal>
  `
})
export class TaskDetailComponent implements OnInit, OnDestroy {
  task: Task | null = null;
  editOpen = false;
  deleteOpen = false;
  rejectOpen = false;
  rejectNote = '';
  editForm!: FormGroup;
  teamMembers: Profile[] = [];
  private destroy$ = new Subject<void>();
  private actorId = '';
  private actorRole: AppRole = 'member';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tasksSvc: TasksDbService,
    private auth: AuthService,
    private toast: ToastService,
    private profileSvc: ProfileService,
    private teamSvc: TeamService,
    private fb: FormBuilder
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;

    this.editForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      priority: ['medium'],
      due_date: ['']
    });

    this.auth.state$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      if (state.profile) {
        this.actorId = state.profile.id;
        this.actorRole = state.profile.role;
      }
    });

    if (this.auth.currentRole !== 'member') {
      this.profileSvc.loadAll();
      this.profileSvc.users$.pipe(takeUntil(this.destroy$)).subscribe(u => this.teamMembers = u);
    }

    await this.tasksSvc.loadAll();
    this.tasksSvc.tasks$.pipe(takeUntil(this.destroy$)).subscribe(tasks => {
      this.task = tasks.find(t => t.id === id) ?? null;
      if (!this.task) this.router.navigate(['/tasks']);
      if (this.task) {
        this.editForm.patchValue({
          title: this.task.title,
          description: this.task.description,
          priority: this.task.priority,
          due_date: this.task.due_date ?? ''
        });
      }
    });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get isOverdue(): boolean {
    return !!this.task?.due_date && new Date(this.task.due_date) < new Date() && this.task.status !== 'done';
  }

  get isFromTeamBoard(): boolean {
    return this.route.snapshot.queryParamMap.get('from') === 'team-board';
  }

  get canApprove(): boolean {
    return hasPermission(this.actorRole, 'tasks.approve');
  }

  get availableTransitions(): string[] {
    if (!this.task) return [];
    return (WORKFLOW_TRANSITIONS[this.task.status] || []).filter(s =>
      canTransition(this.task!.status, s, this.actorRole)
    );
  }

  getStatusLabel(s: string): string { return STATUS_LABELS[s] || s; }
  getStatusColor(s: string): string { return STATUS_COLORS[s] || ''; }

  getTransitionBtnClass(s: string): string {
    const base = STATUS_COLORS[s] || 'bg-slate-100 text-slate-600';
    return base + ' border-transparent hover:opacity-80';
  }

  async transitionTo(newStatus: string): Promise<void> {
    if (!this.task) return;
    try {
      await this.tasksSvc.transitionStatus(this.task, newStatus as TaskStatus, this.actorRole, this.actorId);
      this.toast.success(`Status → ${this.getStatusLabel(newStatus)}`);
    } catch (e: any) {
      this.toast.error(e?.message || 'Transition not allowed');
    }
  }

  async approveTask(): Promise<void> {
    if (!this.task) return;
    try {
      await this.tasksSvc.approveTask(this.task.id, this.actorId);
      this.toast.success('Task approved');
    } catch {
      this.toast.error('Failed to approve');
    }
  }

  async rejectTask(): Promise<void> {
    if (!this.task || !this.rejectNote.trim()) return;
    try {
      await this.tasksSvc.rejectTask(this.task.id, this.actorId, this.rejectNote);
      this.toast.success('Task rejected');
      this.rejectOpen = false;
      this.rejectNote = '';
    } catch {
      this.toast.error('Failed to reject');
    }
  }

  async reassign(event: Event): Promise<void> {
    if (!this.task) return;
    const assigneeId = (event.target as HTMLSelectElement).value;
    if (!assigneeId) return;
    try {
      await this.tasksSvc.assign(this.task.id, assigneeId, this.actorId, 'Manual reassignment');
      this.toast.success('Task reassigned');
    } catch {
      this.toast.error('Failed to reassign');
    }
    (event.target as HTMLSelectElement).value = '';
  }

  async onSave(): Promise<void> {
    if (!this.task || !this.editForm?.valid) return;
    try {
      await this.tasksSvc.update(this.task.id, this.editForm.value, this.actorId);
      this.toast.success('Task updated');
      this.editOpen = false;
    } catch { this.toast.error('Failed to save'); }
  }

  async doDelete(): Promise<void> {
    if (!this.task) return;
    try {
      await this.tasksSvc.softDelete(this.task.id, this.actorId);
      this.toast.success('Task moved to trash');
      this.router.navigate(['/tasks']);
    } catch { this.toast.error('Failed to delete task'); }
  }

  goBack(): void {
    const from   = this.route.snapshot.queryParamMap.get('from');
    const teamId = this.route.snapshot.queryParamMap.get('teamId');
    if (from === 'team-board' && teamId) {
      this.router.navigate(['/teams', teamId]);
    } else {
      this.router.navigate(['/tasks']);
    }
  }
}
