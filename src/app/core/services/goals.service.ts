import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase.client';
import { MemberGoal } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private goalsSubject = new BehaviorSubject<MemberGoal[]>([]);
  goals$ = this.goalsSubject.asObservable();

  async loadForUser(userId: string): Promise<void> {
    const { data } = await supabase
      .from('member_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    this.goalsSubject.next((data as MemberGoal[]) || []);
  }

  async create(userId: string, goal: Pick<MemberGoal, 'title' | 'target_count' | 'period'>): Promise<void> {
    const { error } = await supabase.from('member_goals').insert({ ...goal, user_id: userId });
    if (error) throw error;
    await this.loadForUser(userId);
  }

  async increment(goalId: string, userId: string): Promise<void> {
    const goal = this.goalsSubject.value.find(g => g.id === goalId);
    if (!goal) return;
    const newCount = Math.min(goal.current_count + 1, goal.target_count);
    const { error } = await supabase
      .from('member_goals')
      .update({ current_count: newCount, updated_at: new Date().toISOString() })
      .eq('id', goalId);
    if (error) throw error;
    await this.loadForUser(userId);
  }

  async delete(goalId: string, userId: string): Promise<void> {
    const { error } = await supabase.from('member_goals').delete().eq('id', goalId);
    if (error) throw error;
    await this.loadForUser(userId);
  }

  async syncFromTasks(userId: string): Promise<void> {
    // Count tasks completed this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: completed } = await supabase
      .from('tasks')
      .select('id')
      .or(`owner_id.eq.${userId},assignee_id.eq.${userId}`)
      .eq('status', 'done')
      .gte('updated_at', weekAgo.toISOString());

    const weeklyGoals = this.goalsSubject.value.filter(g => g.period === 'weekly');
    for (const goal of weeklyGoals) {
      const count = Math.min(completed?.length || 0, goal.target_count);
      await supabase
        .from('member_goals')
        .update({ current_count: count, updated_at: new Date().toISOString() })
        .eq('id', goal.id);
    }
    await this.loadForUser(userId);
  }
}
