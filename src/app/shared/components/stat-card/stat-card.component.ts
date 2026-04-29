import { Component, Input } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-stat-card',
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div @enter class="card p-5 hover:shadow-md transition-all duration-200">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{{ label }}</p>
          <p class="text-3xl font-bold text-slate-800">{{ value }}</p>
          <p *ngIf="sub" class="text-xs mt-1" [class]="subClass">{{ sub }}</p>
        </div>
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          [class]="iconBg"
        >
          <span [innerHTML]="icon" class="w-5 h-5 text-current"></span>
        </div>
      </div>
      <div *ngIf="trend !== null" class="mt-3 flex items-center gap-1 text-xs font-medium"
        [class]="trend >= 0 ? 'text-emerald-600' : 'text-red-500'">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            [attr.d]="trend >= 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'"/>
        </svg>
        {{ trend >= 0 ? '+' : '' }}{{ trend }}% vs last period
      </div>
    </div>
  `
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = 0;
  @Input() icon = '';
  @Input() iconBg = 'bg-primary-50 text-primary-600';
  @Input() sub: string | null = null;
  @Input() subClass = 'text-slate-400';
  @Input() trend: number | null = null;
}
