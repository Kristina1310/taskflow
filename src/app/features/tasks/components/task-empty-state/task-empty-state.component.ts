import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FilterType } from '../../../../core/models/task.model';

@Component({
  selector: 'app-task-empty-state',
  template: `
    <div class="flex flex-col items-center justify-center py-20 animate-fade-in">
      <div class="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      </div>
      <h3 class="text-base font-semibold text-slate-700 mb-1">{{ title }}</h3>
      <p class="text-sm text-slate-400 mb-5">{{ subtitle }}</p>
      <button *ngIf="filter === 'all'" class="btn-primary" (click)="addTask.emit()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Create your first task
      </button>
    </div>
  `
})
export class TaskEmptyStateComponent {
  @Input() filter: FilterType = 'all';
  @Output() addTask = new EventEmitter<void>();

  get title(): string {
    return { all: 'No tasks yet', active: 'No active tasks', completed: 'Nothing completed yet' }[this.filter];
  }

  get subtitle(): string {
    return {
      all:       'Add your first task to get started.',
      active:    'All tasks are done — great work!',
      completed: 'Complete some tasks to see them here.'
    }[this.filter];
  }
}
