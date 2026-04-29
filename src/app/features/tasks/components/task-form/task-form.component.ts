import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Task, TaskPriority } from '../../../../core/models/task.model';

export interface TaskFormValue {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
}

@Component({
  selector: 'app-task-form',
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4 animate-slide-up">

      <!-- Title -->
      <div>
        <label class="label" for="title">Title <span class="text-red-500">*</span></label>
        <input
          id="title"
          type="text"
          formControlName="title"
          class="input"
          placeholder="What needs to be done?"
          [class.ring-2]="isInvalid('title')"
          [class.ring-red-400]="isInvalid('title')"
          autocomplete="off"
        />
        <p *ngIf="isInvalid('title')" class="mt-1 text-xs text-red-500 animate-fade-in">
          Title is required (min 2 characters)
        </p>
      </div>

      <!-- Description -->
      <div>
        <label class="label" for="description">Description</label>
        <textarea
          id="description"
          formControlName="description"
          rows="3"
          class="input resize-none"
          placeholder="Add more details…"
        ></textarea>
      </div>

      <!-- Priority & Due Date row -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="label" for="priority">Priority</label>
          <select id="priority" formControlName="priority" class="input">
            <option value="low">🟢 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
          </select>
        </div>
        <div>
          <label class="label" for="dueDate">Due Date</label>
          <input id="dueDate" type="date" formControlName="dueDate" class="input" />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
        <app-button variant="secondary" (onClick)="cancel.emit()">Cancel</app-button>
        <app-button variant="primary" type="submit" [disabled]="form.invalid">
          {{ editTask ? 'Save Changes' : 'Add Task' }}
        </app-button>
      </div>
    </form>
  `
})
export class TaskFormComponent implements OnInit, OnChanges {
  @Input() editTask: Task | null = null;
  @Output() save = new EventEmitter<TaskFormValue>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editTask'] && this.form) {
      this.patchForm();
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      title:       [this.editTask?.title ?? '', [Validators.required, Validators.minLength(2)]],
      description: [this.editTask?.description ?? ''],
      priority:    [this.editTask?.priority ?? 'medium'],
      dueDate:     [this.editTask?.dueDate ?? '']
    });
  }

  private patchForm(): void {
    this.form.patchValue({
      title:       this.editTask?.title ?? '',
      description: this.editTask?.description ?? '',
      priority:    this.editTask?.priority ?? 'medium',
      dueDate:     this.editTask?.dueDate ?? ''
    });
    this.form.markAsPristine();
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.form.value as TaskFormValue);
    this.form.reset({ priority: 'medium' });
  }
}
