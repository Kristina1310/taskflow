import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase.client';
import { TaskComment } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private commentsSubject = new BehaviorSubject<TaskComment[]>([]);
  comments$ = this.commentsSubject.asObservable();

  async loadForTask(taskId: string): Promise<void> {
    const { data } = await supabase
      .from('task_comments')
      .select('*, author:profiles!task_comments_author_id_fkey(id,display_name,avatar_url,role)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    this.commentsSubject.next((data as TaskComment[]) || []);
  }

  async add(taskId: string, authorId: string, content: string): Promise<TaskComment> {
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ task_id: taskId, author_id: authorId, content })
      .select('*, author:profiles!task_comments_author_id_fkey(id,display_name,avatar_url,role)')
      .single();
    if (error) throw error;

    // Notify mentioned users
    const mentions = this.extractMentions(content);
    for (const mention of mentions) {
      await this.notifyMention(taskId, mention, authorId, content);
    }

    await this.loadForTask(taskId);
    return data as TaskComment;
  }

  async delete(commentId: string, taskId: string): Promise<void> {
    const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
    if (error) throw error;
    await this.loadForTask(taskId);
  }

  private extractMentions(content: string): string[] {
    const regex = /@([a-zA-Z0-9._-]+)/g;
    const matches: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      matches.push(m[1]);
    }
    return matches;
  }

  private async notifyMention(taskId: string, displayNameFragment: string, authorId: string, content: string): Promise<void> {
    // Find user by display_name fragment
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .ilike('display_name', `%${displayNameFragment}%`)
      .limit(1)
      .single();
    if (data && data.id !== authorId) {
      await supabase.from('notifications').insert({
        user_id: data.id,
        type: 'task_mentioned',
        title: 'You were mentioned',
        body: content.substring(0, 120),
        entity_type: 'task',
        entity_id: taskId,
        read: false
      });
    }
  }

  clear(): void {
    this.commentsSubject.next([]);
  }
}
