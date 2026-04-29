import { Component, Input } from '@angular/core';
import { TaskPriority } from '../../../core/models/task.model';

@Component({
  selector: 'app-priority-badge',
  template: `
    <span [class]="badgeClass">
      <span class="w-1.5 h-1.5 rounded-full inline-block mr-1" [class]="dotClass"></span>
      {{ label }}
    </span>
  `
})
export class PriorityBadgeComponent {
  @Input() priority: TaskPriority = 'medium';

  get label(): string {
    return { low: 'Low', medium: 'Medium', high: 'High' }[this.priority];
  }

  get badgeClass(): string {
    return 'badge ' + {
      low:    'bg-emerald-50 text-emerald-700',
      medium: 'bg-amber-50 text-amber-700',
      high:   'bg-red-50 text-red-700'
    }[this.priority];
  }

  get dotClass(): string {
    return {
      low:    'bg-emerald-400',
      medium: 'bg-amber-400',
      high:   'bg-red-400'
    }[this.priority];
  }
}
