import { Component } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  animations: [
    trigger('toast', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px) scale(0.96)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-4px) scale(0.96)' }))
      ])
    ])
  ],
  template: `
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <div
        *ngFor="let t of toasts$ | async; trackBy: trackById"
        @toast
        class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium"
        [class]="typeClass(t.type)"
      >
        <span [innerHTML]="typeIcon(t.type)" class="flex-shrink-0 w-5 h-5 mt-0.5"></span>
        <span class="flex-1">{{ t.message }}</span>
        <button class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity" (click)="toast.remove(t.id)">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  `
})
export class ToastContainerComponent {
  toasts$ = this.toast.toasts$;
  constructor(public toast: ToastService) {}
  trackById(_: number, t: Toast) { return t.id; }
  typeClass(type: Toast['type']): string {
    return {
      success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      error:   'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-amber-50 border-amber-200 text-amber-800',
      info:    'bg-blue-50 border-blue-200 text-blue-800'
    }[type];
  }
  typeIcon(type: Toast['type']): string {
    const icons: Record<string, string> = {
      success: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 text-emerald-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      error:   `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 text-red-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      warning: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 text-amber-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
      info:    `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5 text-blue-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
    };
    return icons[type];
  }
}
