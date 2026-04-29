import {
  Component, Input, Output, EventEmitter, OnChanges,
  HostListener, ChangeDetectionStrategy
} from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('backdrop', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms ease-out', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms ease-in', style({ opacity: 0 }))])
    ]),
    trigger('panel', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(-8px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(-8px)' }))
      ])
    ])
  ],
  template: `
    <ng-container *ngIf="isOpen">
      <div
        @backdrop
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        (click)="onBackdropClick($event)"
      >
        <div
          @panel
          role="dialog"
          [attr.aria-label]="title"
          class="relative bg-white rounded-2xl shadow-2xl w-full z-50 overflow-hidden"
          [class]="sizeClass"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 class="text-lg font-semibold text-slate-800">{{ title }}</h2>
            <button
              class="btn-icon text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:ring-slate-300"
              (click)="close.emit()"
              aria-label="Close modal"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <!-- Body -->
          <div class="px-6 py-5">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    </ng-container>
  `
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Output() close = new EventEmitter<void>();

  get sizeClass(): string {
    return { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[this.size];
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen) this.close.emit();
  }

  onBackdropClick(e: MouseEvent) {
    this.close.emit();
  }
}
