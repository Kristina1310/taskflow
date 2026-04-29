import { Component, Input } from '@angular/core';
import { AppRole } from '../../../core/models/database.types';
import { ROLE_LABELS, ROLE_COLORS } from '../../../core/models/permissions';

@Component({
  selector: 'app-role-badge',
  template: `<span class="badge" [class]="color">{{ label }}</span>`
})
export class RoleBadgeComponent {
  @Input() role!: AppRole;
  get label(): string { return ROLE_LABELS[this.role] ?? this.role; }
  get color(): string { return ROLE_COLORS[this.role] ?? 'bg-slate-100 text-slate-700'; }
}
