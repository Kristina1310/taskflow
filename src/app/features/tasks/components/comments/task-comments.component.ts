import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CommentsService } from '../../../../core/services/comments.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TaskComment, AppRole } from '../../../../core/models/database.types';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-task-comments',
  template: `
    <div class="space-y-4">
      <h4 class="font-semibold text-slate-700 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Comments <span class="text-slate-400 font-normal text-sm">({{ comments.length }})</span>
      </h4>

      <!-- Comment list -->
      <div class="space-y-3">
        <div *ngFor="let comment of comments"
             class="flex gap-3 group">
          <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-sm flex items-center justify-center font-bold flex-shrink-0">
            {{ comment.author?.display_name?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <div class="flex-1">
            <div class="bg-slate-50 rounded-xl px-3 py-2">
              <div class="flex items-center justify-between gap-2 mb-1">
                <span class="text-xs font-semibold text-slate-700">{{ comment.author?.display_name }}</span>
                <span class="text-xs text-slate-400">{{ comment.created_at | relativeDate }}</span>
              </div>
              <p class="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap"
                 [innerHTML]="renderMentions(comment.content)"></p>
            </div>
            <button *ngIf="canDeleteComment(comment)"
                    (click)="deleteComment(comment)"
                    class="text-xs text-slate-400 hover:text-red-500 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Delete
            </button>
          </div>
        </div>

        <div *ngIf="!comments.length" class="text-sm text-slate-400 py-2">
          No comments yet. Be the first to comment!
        </div>
      </div>

      <!-- Add comment -->
      <div class="flex gap-3">
        <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-sm flex items-center justify-center font-bold flex-shrink-0">
          {{ currentUserInitial }}
        </div>
        <div class="flex-1">
          <textarea
            [formControl]="commentCtrl"
            rows="2"
            placeholder="Add a comment... Use @name to mention someone"
            class="input resize-none w-full text-sm"
            (keydown.ctrl.enter)="submit()"
          ></textarea>
          <div class="flex items-center justify-between mt-2">
            <span class="text-xs text-slate-400">Ctrl+Enter to submit</span>
            <button
              (click)="submit()"
              [disabled]="commentCtrl.invalid || saving"
              class="btn btn-primary btn-sm py-1 px-3 text-sm">
              {{ saving ? 'Posting...' : 'Comment' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TaskCommentsComponent implements OnInit, OnDestroy {
  @Input() taskId!: string;

  comments: TaskComment[] = [];
  commentCtrl = new FormControl('', [Validators.required, Validators.minLength(1)]);
  saving = false;
  currentUserInitial = '?';
  private currentUserId = '';
  private currentUserRole: AppRole = 'member';
  private sub = new Subscription();

  constructor(
    private commentsSvc: CommentsService,
    private authSvc: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.commentsSvc.loadForTask(this.taskId);
    this.sub.add(
      this.commentsSvc.comments$.subscribe(c => this.comments = c)
    );
    this.sub.add(
      this.authSvc.state$.subscribe(state => {
        if (state.profile) {
          this.currentUserId = state.profile.id;
          this.currentUserInitial = state.profile.display_name?.charAt(0)?.toUpperCase() || '?';
          this.currentUserRole = state.profile.role;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.commentsSvc.clear();
  }

  async submit(): Promise<void> {
    if (this.commentCtrl.invalid || this.saving) return;
    this.saving = true;
    try {
      await this.commentsSvc.add(this.taskId, this.currentUserId, this.commentCtrl.value!.trim());
      this.commentCtrl.reset();
    } catch {
      this.toast.error('Failed to post comment');
    } finally {
      this.saving = false;
    }
  }

  async deleteComment(comment: TaskComment): Promise<void> {
    if (!confirm('Delete this comment?')) return;
    try {
      await this.commentsSvc.delete(comment.id, this.taskId);
    } catch {
      this.toast.error('Failed to delete comment');
    }
  }

  canDeleteComment(comment: TaskComment): boolean {
    return comment.author_id === this.currentUserId ||
           this.currentUserRole === 'admin' ||
           this.currentUserRole === 'super_admin';
  }

  renderMentions(content: string): string {
    return content.replace(/@(\w+)/g, '<span class="text-primary-600 font-medium">@$1</span>');
  }
}
