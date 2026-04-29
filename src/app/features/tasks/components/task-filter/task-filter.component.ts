import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FilterType } from '../../../../core/models/task.model';

interface FilterTab {
  id: FilterType;
  label: string;
  count: number;
}

@Component({
  selector: 'app-task-filter',
  template: `
    <div class="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
      <button
        *ngFor="let tab of tabs"
        class="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
        [class]="activeFilter === tab.id
          ? 'bg-white text-primary-700 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'"
        (click)="filterChange.emit(tab.id)"
      >
        {{ tab.label }}
        <span
          class="text-xs px-1.5 py-0.5 rounded-full font-medium"
          [class]="activeFilter === tab.id
            ? 'bg-primary-100 text-primary-700'
            : 'bg-slate-200 text-slate-500'"
        >{{ tab.count }}</span>
      </button>
    </div>
  `
})
export class TaskFilterComponent {
  @Input() activeFilter: FilterType = 'all';
  @Input() counts: { all: number; active: number; completed: number } = { all: 0, active: 0, completed: 0 };
  @Output() filterChange = new EventEmitter<FilterType>();

  get tabs(): FilterTab[] {
    return [
      { id: 'all',       label: 'All',       count: this.counts.all },
      { id: 'active',    label: 'Active',    count: this.counts.active },
      { id: 'completed', label: 'Completed', count: this.counts.completed }
    ];
  }
}
