import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Task, TaskStatus } from '../../../core/models/database.types';
import { STATUS_COLORS, STATUS_LABELS } from '../../../core/models/permissions';

export interface KanbanColumn {
  status: TaskStatus;
  label: string;
  colorClass: string;
  tasks: Task[];
}

@Component({
  selector: 'app-kanban-board',
  template: `
    <div class="flex gap-4 overflow-x-auto pb-4">
      <div *ngFor="let col of columns"
           class="flex-shrink-0 w-72 bg-slate-50 rounded-2xl p-3">
        <!-- Column Header -->
        <div class="flex items-center justify-between mb-3 px-1">
          <div class="flex items-center gap-2">
            <span [class]="col.colorClass + ' text-xs font-semibold px-2 py-0.5 rounded-full'">
              {{ col.label }}
            </span>
            <span class="text-xs text-slate-400 font-medium">{{ col.tasks.length }}</span>
          </div>
        </div>

        <!-- Cards -->
        <div class="space-y-2 min-h-[100px]">
          <div *ngFor="let task of col.tasks; trackBy: trackById"
               (click)="taskClick.emit(task)"
               class="bg-white rounded-xl p-3 shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <!-- Priority dot -->
            <div class="flex items-start justify-between gap-2 mb-2">
              <div [class]="getPriorityDot(task.priority) + ' w-2 h-2 rounded-full mt-1.5 flex-shrink-0'"></div>
              <span class="text-xs font-medium text-slate-700 flex-1 leading-snug">{{ task.title }}</span>
            </div>

            <!-- Assignee & due -->
            <div class="flex items-center justify-between mt-2">
              <div *ngIf="task.assignee" class="flex items-center gap-1.5">
                <div class="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold">
                  {{ task.assignee.display_name.charAt(0).toUpperCase() }}
                </div>
                <span class="text-xs text-slate-500 truncate max-w-[80px]">{{ task.assignee.display_name }}</span>
              </div>
              <div *ngIf="!task.assignee" class="text-xs text-slate-300">Unassigned</div>

              <span *ngIf="task.due_date"
                    [class]="getDueDateClass(task.due_date) + ' text-xs'"
                    title="{{ task.due_date | date }}">
                {{ task.due_date | date:'MMM d' }}
              </span>
            </div>

            <!-- Subtask progress -->
            <div *ngIf="task.subtasks?.length" class="mt-2">
              <div class="flex items-center gap-2">
                <div class="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-400 rounded-full transition-all"
                       [style.width.%]="getSubtaskProgress(task)"></div>
                </div>
                <span class="text-xs text-slate-400">
                  {{ getDoneSubtasks(task) }}/{{ task.subtasks!.length }}
                </span>
              </div>
            </div>

            <!-- Approval badge -->
            <div *ngIf="task.approval_status === 'pending'" class="mt-2">
              <span class="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md font-medium">⏳ Pending Approval</span>
            </div>
          </div>

          <div *ngIf="!col.tasks.length"
               class="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-slate-200">
            <p class="text-xs text-slate-300">No tasks</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class KanbanBoardComponent {
  @Input() set tasks(tasks: Task[]) { this.buildColumns(tasks); }
  @Output() taskClick = new EventEmitter<Task>();

  columns: KanbanColumn[] = [];

  private readonly COLUMN_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

  private buildColumns(tasks: Task[]): void {
    this.columns = this.COLUMN_STATUSES.map(status => ({
      status,
      label: STATUS_LABELS[status],
      colorClass: STATUS_COLORS[status],
      tasks: tasks.filter(t => t.status === status && !t.deleted_at)
    }));
  }

  trackById(_: number, t: Task): string { return t.id; }

  getPriorityDot(priority: string): string {
    return { high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-slate-300' }[priority] || 'bg-slate-300';
  }

  getDueDateClass(date: string): string {
    const now = new Date();
    const due = new Date(date);
    if (due < now) return 'text-red-500 font-medium';
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diff < 24) return 'text-amber-500 font-medium';
    return 'text-slate-400';
  }

  getSubtaskProgress(task: Task): number {
    if (!task.subtasks?.length) return 0;
    return Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100);
  }

  getDoneSubtasks(task: Task): number {
    return task.subtasks?.filter(s => s.completed).length || 0;
  }
}
