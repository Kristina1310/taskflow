import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationsService } from '../../../core/services/notifications.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppNotification } from '../../../core/models/database.types';

@Component({
  selector: 'app-notification-bell',
  template: `
    <div class="relative">
      <button
        (click)="togglePanel()"
        class="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
        title="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span *ngIf="(unreadCount$ | async) as count"
              class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 font-bold animate-pulse">
          {{ count > 9 ? '9+' : count }}
        </span>
      </button>

      <!-- Notification Panel -->
      <div *ngIf="panelOpen"
           class="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
           [@slideDown]>
        <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 class="font-semibold text-slate-800">Notifications</h3>
          <button
            *ngIf="(unreadCount$ | async) as count"
            (click)="markAllRead()"
            class="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >Mark all read</button>
        </div>

        <div class="max-h-96 overflow-y-auto">
          <ng-container *ngIf="(notifications$ | async) as notifications">
            <div *ngIf="!notifications.length" class="py-12 text-center text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p class="text-sm">All caught up!</p>
            </div>

            <div *ngFor="let n of notifications"
                 (click)="handleClick(n)"
                 class="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                 [class.bg-blue-50]="!n.read">
              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex-shrink-0">
                  <div [class]="getTypeIcon(n.type).bg + ' w-8 h-8 rounded-full flex items-center justify-center'">
                    <span class="text-sm">{{ getTypeIcon(n.type).emoji }}</span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-800 leading-tight">{{ n.title }}</p>
                  <p class="text-xs text-slate-500 mt-0.5 line-clamp-2">{{ n.body }}</p>
                  <p class="text-xs text-slate-400 mt-1">{{ n.created_at | relativeDate }}</p>
                </div>
                <button *ngIf="!n.read"
                        (click)="$event.stopPropagation(); markRead(n.id)"
                        class="text-blue-400 hover:text-blue-600 flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            </div>
          </ng-container>
        </div>
      </div>
    </div>
  `
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  panelOpen = false;
  notifications$ = this.notifSvc.notifications$;
  unreadCount$ = this.notifSvc.unreadCount$;

  private sub = new Subscription();

  constructor(
    private notifSvc: NotificationsService,
    private authSvc: AuthService,
    private router: Router,
    private el: ElementRef
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.authSvc.state$.subscribe(state => {
        if (state.user) {
          this.notifSvc.loadForUser(state.user.id);
          this.notifSvc.subscribeRealtime(state.user.id);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.el.nativeElement.contains(e.target)) {
      this.panelOpen = false;
    }
  }

  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
  }

  async markRead(id: string): Promise<void> {
    await this.notifSvc.markRead(id);
  }

  async markAllRead(): Promise<void> {
    const state = await this.authSvc.state$.pipe().toPromise();
    if (state?.user) await this.notifSvc.markAllRead(state.user.id);
  }

  handleClick(n: AppNotification): void {
    this.notifSvc.markRead(n.id);
    if (n.entity_type === 'task' && n.entity_id) {
      this.router.navigate(['/tasks', n.entity_id]);
    }
    this.panelOpen = false;
  }

  getTypeIcon(type: string): { emoji: string; bg: string } {
    const map: Record<string, { emoji: string; bg: string }> = {
      task_assigned:       { emoji: '📋', bg: 'bg-blue-100' },
      task_mentioned:      { emoji: '💬', bg: 'bg-purple-100' },
      task_status_changed: { emoji: '🔄', bg: 'bg-amber-100' },
      task_overdue:        { emoji: '⚠️', bg: 'bg-red-100' },
      task_due_soon:       { emoji: '⏰', bg: 'bg-orange-100' },
      task_approved:       { emoji: '✅', bg: 'bg-green-100' },
      task_rejected:       { emoji: '❌', bg: 'bg-red-100' },
      task_commented:      { emoji: '💬', bg: 'bg-slate-100' },
      approval_requested:  { emoji: '🔍', bg: 'bg-amber-100' },
      sla_breach:          { emoji: '🚨', bg: 'bg-red-100' },
      digest:              { emoji: '📊', bg: 'bg-blue-100' }
    };
    return map[type] || { emoji: '🔔', bg: 'bg-slate-100' };
  }
}
