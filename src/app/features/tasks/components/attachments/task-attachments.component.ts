import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AttachmentsService } from '../../../../core/services/attachments.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TaskAttachment, AppRole } from '../../../../core/models/database.types';

@Component({
  selector: 'app-task-attachments',
  template: `
    <div class="space-y-3">
      <h4 class="font-semibold text-slate-700 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        Attachments <span class="text-slate-400 font-normal text-sm">({{ attachments.length }})</span>
      </h4>

      <div class="space-y-2">
        <div *ngFor="let a of attachments"
             class="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 group hover:bg-slate-100 transition-colors">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
               [class]="getFileIconBg(a.mime_type)">
            <span class="text-sm">{{ getFileEmoji(a.mime_type) }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <a [href]="getUrl(a)"
               target="_blank"
               class="text-sm font-medium text-primary-600 hover:text-primary-700 truncate block">
              {{ a.filename }}
            </a>
            <span class="text-xs text-slate-400">
              {{ formatSize(a.file_size) }} · {{ a.created_at | date:'MMM d' }}
              <span *ngIf="a.uploader"> · {{ a.uploader.display_name }}</span>
            </span>
          </div>
          <button
            *ngIf="canDelete(a)"
            (click)="deleteAttachment(a)"
            class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <div *ngIf="!attachments.length" class="text-sm text-slate-400 py-1">
          No attachments yet.
        </div>
      </div>

      <!-- Upload -->
      <div>
        <label
          class="flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-200 rounded-xl p-3 hover:border-primary-400 hover:bg-primary-50 transition-all text-sm text-slate-500 hover:text-primary-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>{{ uploading ? 'Uploading...' : 'Upload file' }}</span>
          <input type="file" class="hidden" (change)="onFileChange($event)" [disabled]="uploading" />
        </label>
      </div>
    </div>
  `
})
export class TaskAttachmentsComponent implements OnInit, OnDestroy {
  @Input() taskId!: string;

  attachments: TaskAttachment[] = [];
  uploading = false;
  private currentUserId = '';
  private currentUserRole: AppRole = 'member';
  private sub = new Subscription();

  constructor(
    private attachmentsSvc: AttachmentsService,
    private authSvc: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.attachmentsSvc.loadForTask(this.taskId);
    this.sub.add(this.attachmentsSvc.attachments$.subscribe(a => this.attachments = a));
    this.sub.add(this.authSvc.state$.subscribe(state => {
      if (state.profile) {
        this.currentUserId = state.profile.id;
        this.currentUserRole = state.profile.role;
      }
    }));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.attachmentsSvc.clear();
  }

  async onFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (file.size > 10 * 1024 * 1024) {
      this.toast.error('File too large (max 10 MB)');
      return;
    }
    this.uploading = true;
    try {
      await this.attachmentsSvc.upload(this.taskId, this.currentUserId, file);
      this.toast.success('File uploaded');
    } catch {
      this.toast.error('Upload failed');
    } finally {
      this.uploading = false;
      input.value = '';
    }
  }

  async deleteAttachment(a: TaskAttachment): Promise<void> {
    if (!confirm('Remove this attachment?')) return;
    try {
      await this.attachmentsSvc.delete(a, this.taskId);
    } catch {
      this.toast.error('Failed to delete attachment');
    }
  }

  canDelete(a: TaskAttachment): boolean {
    return a.uploader_id === this.currentUserId ||
           this.currentUserRole === 'admin' ||
           this.currentUserRole === 'super_admin';
  }

  getUrl(a: TaskAttachment): string { return this.attachmentsSvc.getDownloadUrl(a.storage_path); }
  formatSize(bytes: number): string { return this.attachmentsSvc.formatSize(bytes); }

  getFileEmoji(mime: string): string {
    if (mime.startsWith('image/')) return '🖼️';
    if (mime.includes('pdf')) return '📄';
    if (mime.includes('spreadsheet') || mime.includes('excel')) return '📊';
    if (mime.includes('word') || mime.includes('document')) return '📝';
    if (mime.includes('zip') || mime.includes('archive')) return '🗜️';
    return '📎';
  }

  getFileIconBg(mime: string): string {
    if (mime.startsWith('image/')) return 'bg-purple-100';
    if (mime.includes('pdf')) return 'bg-red-100';
    if (mime.includes('spreadsheet') || mime.includes('excel')) return 'bg-emerald-100';
    return 'bg-slate-100';
  }
}
