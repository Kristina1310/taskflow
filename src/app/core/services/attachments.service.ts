import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase.client';
import { TaskAttachment } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class AttachmentsService {
  private attachmentsSubject = new BehaviorSubject<TaskAttachment[]>([]);
  attachments$ = this.attachmentsSubject.asObservable();

  async loadForTask(taskId: string): Promise<void> {
    const { data } = await supabase
      .from('task_attachments')
      .select('*, uploader:profiles!task_attachments_uploader_id_fkey(id,display_name,avatar_url)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    this.attachmentsSubject.next((data as TaskAttachment[]) || []);
  }

  async upload(taskId: string, uploaderId: string, file: File): Promise<TaskAttachment> {
    const path = `task-attachments/${taskId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(path, file);
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        uploader_id: uploaderId,
        filename: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: path
      })
      .select('*, uploader:profiles!task_attachments_uploader_id_fkey(id,display_name,avatar_url)')
      .single();
    if (error) throw error;
    await this.loadForTask(taskId);
    return data as TaskAttachment;
  }

  async delete(attachment: TaskAttachment, taskId: string): Promise<void> {
    await supabase.storage.from('attachments').remove([attachment.storage_path]);
    const { error } = await supabase.from('task_attachments').delete().eq('id', attachment.id);
    if (error) throw error;
    await this.loadForTask(taskId);
  }

  getDownloadUrl(storagePath: string): string {
    const { data } = supabase.storage.from('attachments').getPublicUrl(storagePath);
    return data.publicUrl;
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  clear(): void {
    this.attachmentsSubject.next([]);
  }
}
