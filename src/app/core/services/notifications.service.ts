import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase.client';
import { AppNotification, NotificationPreferences } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this.notificationsSubject.asObservable();

  unreadCount$ = this.notifications$.pipe(
    map(ns => ns.filter(n => !n.read).length)
  );

  async loadForUser(userId: string): Promise<void> {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    this.notificationsSubject.next((data as AppNotification[]) || []);
  }

  async markRead(notificationId: string): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    const updated = this.notificationsSubject.value.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    this.notificationsSubject.next(updated);
  }

  async markAllRead(userId: string): Promise<void> {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
    const updated = this.notificationsSubject.value.map(n => ({ ...n, read: true }));
    this.notificationsSubject.next(updated);
  }

  async delete(notificationId: string): Promise<void> {
    await supabase.from('notifications').delete().eq('id', notificationId);
    this.notificationsSubject.next(
      this.notificationsSubject.value.filter(n => n.id !== notificationId)
    );
  }

  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data as NotificationPreferences | null;
  }

  async savePreferences(prefs: NotificationPreferences): Promise<void> {
    await supabase
      .from('notification_preferences')
      .upsert(prefs, { onConflict: 'user_id' });
  }

  async checkOverdueTasks(userId: string): Promise<void> {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, due_date')
      .or(`owner_id.eq.${userId},assignee_id.eq.${userId}`)
      .is('deleted_at', null)
      .not('status', 'in', '("done","cancelled")')
      .not('due_date', 'is', null);

    if (!tasks) return;

    const now = new Date();
    const soonThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (const task of tasks) {
      const due = new Date(task.due_date);
      if (due < now) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'task_overdue',
          title: 'Task Overdue',
          body: `"${task.title}" is overdue`,
          entity_type: 'task',
          entity_id: task.id,
          read: false
        });
      } else if (due < soonThreshold) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'task_due_soon',
          title: 'Due Soon',
          body: `"${task.title}" is due within 24 hours`,
          entity_type: 'task',
          entity_id: task.id,
          read: false
        });
      }
    }

    await this.loadForUser(userId);
  }

  subscribeRealtime(userId: string): void {
    supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const current = this.notificationsSubject.value;
        this.notificationsSubject.next([payload.new as AppNotification, ...current]);
      })
      .subscribe();
  }

  clear(): void {
    this.notificationsSubject.next([]);
  }
}
