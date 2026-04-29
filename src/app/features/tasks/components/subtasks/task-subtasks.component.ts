import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SubtasksService } from '../../../../core/services/subtasks.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Subtask } from '../../../../core/models/database.types';

@Component({
  selector: 'app-task-subtasks',
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="font-semibold text-slate-700 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Subtasks
        </h4>
        <span class="text-xs text-slate-500 font-medium">
          {{ doneCount }}/{{ subtasks.length }} complete
        </span>
      </div>

      <!-- Progress bar -->
      <div *ngIf="subtasks.length" class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div class="h-full bg-emerald-500 rounded-full transition-all duration-500"
             [style.width.%]="progress$ | async"></div>
      </div>

      <!-- List -->
      <div class="space-y-1.5">
        <div *ngFor="let s of subtasks"
             class="flex items-center gap-3 group py-1">
          <button
            (click)="toggle(s)"
            class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
            [class.border-emerald-500]="s.completed"
            [class.bg-emerald-500]="s.completed"
            [class.border-slate-300]="!s.completed"
          >
            <svg *ngIf="s.completed" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <span class="flex-1 text-sm transition-all"
                [class.line-through]="s.completed"
                [class.text-slate-400]="s.completed"
                [class.text-slate-700]="!s.completed">
            {{ s.title }}
          </span>
          <button
            (click)="deleteSubtask(s)"
            class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Add subtask -->
      <div class="flex gap-2">
        <input
          [formControl]="titleCtrl"
          type="text"
          placeholder="Add a subtask..."
          class="input flex-1 text-sm py-1.5"
          (keydown.enter)="addSubtask()"
        />
        <button
          (click)="addSubtask()"
          [disabled]="titleCtrl.invalid"
          class="btn btn-primary btn-sm px-3 py-1.5 text-sm">
          Add
        </button>
      </div>
    </div>
  `
})
export class TaskSubtasksComponent implements OnInit, OnDestroy {
  @Input() taskId!: string;

  subtasks: Subtask[] = [];
  progress$ = this.subtasksSvc.progress$;
  titleCtrl = new FormControl('', Validators.required);
  private sub = new Subscription();

  constructor(
    private subtasksSvc: SubtasksService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.subtasksSvc.loadForTask(this.taskId);
    this.sub.add(this.subtasksSvc.subtasks$.subscribe(s => this.subtasks = s));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.subtasksSvc.clear();
  }

  get doneCount(): number {
    return this.subtasks.filter(s => s.completed).length;
  }

  async addSubtask(): Promise<void> {
    if (this.titleCtrl.invalid) return;
    try {
      await this.subtasksSvc.add(this.taskId, this.titleCtrl.value!.trim());
      this.titleCtrl.reset();
    } catch {
      this.toast.error('Failed to add subtask');
    }
  }

  async toggle(s: Subtask): Promise<void> {
    try {
      await this.subtasksSvc.toggle(s.id, this.taskId, !s.completed);
    } catch {
      this.toast.error('Failed to update subtask');
    }
  }

  async deleteSubtask(s: Subtask): Promise<void> {
    try {
      await this.subtasksSvc.delete(s.id, this.taskId);
    } catch {
      this.toast.error('Failed to delete subtask');
    }
  }
}
