import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { Task } from '../../../../core/models/task.model';

@Component({
  selector: 'app-task-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('cardAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(-16px)' }))
      ])
    ])
  ],
  template: `
    <div
      @cardAnim
      class="card p-4 flex items-start gap-4 group hover:shadow-md transition-all duration-200 cursor-pointer"
      [class.opacity-60]="task.completed"
      (click)="viewDetail.emit(task.id)"
    >
      <!-- Checkbox -->
      <button
        class="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1"
        [class]="task.completed
          ? 'bg-emerald-500 border-emerald-500'
          : 'border-slate-300 hover:border-primary-400'"
        (click)="$event.stopPropagation(); toggle.emit(task.id)"
        [attr.aria-label]="task.completed ? 'Mark incomplete' : 'Mark complete'"
      >
        <svg *ngIf="task.completed" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
        </svg>
      </button>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3
            class="font-medium text-slate-800 text-sm leading-snug transition-all duration-200"
            [class.line-through]="task.completed"
            [class.text-slate-400]="task.completed"
          >{{ task.title }}</h3>
          <app-priority-badge [priority]="task.priority" class="flex-shrink-0"></app-priority-badge>
        </div>

        <p *ngIf="task.description" class="mt-1 text-xs text-slate-400 leading-relaxed">
          {{ task.description | truncate:90 }}
        </p>

        <div class="mt-2 flex items-center gap-3 text-xs text-slate-400">
          <span *ngIf="task.dueDate" class="flex items-center gap-1" [class.text-red-500]="isOverdue">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            {{ task.dueDate | date:'MMM d' }}
            <span *ngIf="isOverdue" class="font-medium">· Overdue</span>
          </span>
          <span>{{ task.createdAt | relativeDate }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
        <button
          class="btn-icon text-slate-400 hover:bg-primary-50 hover:text-primary-600 focus:ring-primary-300"
          (click)="$event.stopPropagation(); edit.emit(task)"
          aria-label="Edit task"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button
          class="btn-icon text-slate-400 hover:bg-red-50 hover:text-red-500 focus:ring-red-300"
          (click)="$event.stopPropagation(); delete.emit(task.id)"
          aria-label="Delete task"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    </div>
  `
})
export class TaskItemComponent {
  @Input() task!: Task;
  @Output() toggle = new EventEmitter<string>();
  @Output() edit = new EventEmitter<Task>();
  @Output() delete = new EventEmitter<string>();
  @Output() viewDetail = new EventEmitter<string>();

  get isOverdue(): boolean {
    if (!this.task.dueDate || this.task.completed) return false;
    return new Date(this.task.dueDate) < new Date();
  }
}
