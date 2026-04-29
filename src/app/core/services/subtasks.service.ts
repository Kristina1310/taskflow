import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { supabase } from '../supabase.client';
import { Subtask } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class SubtasksService {
  private subtasksSubject = new BehaviorSubject<Subtask[]>([]);
  subtasks$ = this.subtasksSubject.asObservable();

  progress$ = this.subtasks$.pipe(
    map(subtasks => {
      if (!subtasks.length) return 0;
      return Math.round((subtasks.filter(s => s.completed).length / subtasks.length) * 100);
    })
  );

  async loadForTask(taskId: string): Promise<void> {
    const { data } = await supabase
      .from('task_subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    this.subtasksSubject.next((data as Subtask[]) || []);
  }

  async add(taskId: string, title: string): Promise<void> {
    const { error } = await supabase.from('task_subtasks').insert({ task_id: taskId, title });
    if (error) throw error;
    await this.loadForTask(taskId);
  }

  async toggle(subtaskId: string, taskId: string, completed: boolean): Promise<void> {
    const { error } = await supabase
      .from('task_subtasks')
      .update({ completed, updated_at: new Date().toISOString() })
      .eq('id', subtaskId);
    if (error) throw error;
    await this.loadForTask(taskId);
  }

  async delete(subtaskId: string, taskId: string): Promise<void> {
    const { error } = await supabase.from('task_subtasks').delete().eq('id', subtaskId);
    if (error) throw error;
    await this.loadForTask(taskId);
  }

  clear(): void {
    this.subtasksSubject.next([]);
  }
}
