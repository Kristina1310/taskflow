import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { TaskAssignmentEvent } from '../../../../core/models/database.types';
import { TasksDbService } from '../../../../core/services/tasks-db.service';

@Component({
  selector: 'app-task-timeline',
  template: `
    <div class="space-y-3">
      <h4 class="font-semibold text-slate-700 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Assignment History
      </h4>

      <div *ngIf="loading" class="animate-pulse space-y-2">
        <div class="h-8 bg-slate-100 rounded-xl"></div>
        <div class="h-8 bg-slate-100 rounded-xl"></div>
      </div>

      <div *ngIf="!loading" class="relative">
        <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
        <div class="space-y-4">
          <div *ngFor="let event of events"
               class="flex gap-3 relative">
            <div class="w-8 h-8 rounded-full bg-white border-2 border-primary-300 flex items-center justify-center flex-shrink-0 z-10">
              <span class="text-xs">👤</span>
            </div>
            <div class="flex-1 bg-slate-50 rounded-xl px-3 py-2 text-sm">
              <p class="text-slate-700">
                <span class="font-medium">{{ event.actor?.display_name }}</span>
                {{ event.assignee_id ? 'assigned to' : 'unassigned from' }}
                <span *ngIf="event.assignee" class="font-medium">{{ event.assignee.display_name }}</span>
              </p>
              <p *ngIf="event.previous_assignee" class="text-xs text-slate-400 mt-0.5">
                Previously: {{ event.previous_assignee.display_name }}
              </p>
              <p *ngIf="event.reason" class="text-xs text-slate-500 mt-0.5 italic">"{{ event.reason }}"</p>
              <p class="text-xs text-slate-400 mt-1">{{ event.created_at | relativeDate }}</p>
            </div>
          </div>

          <div *ngIf="!events.length" class="flex gap-3 relative">
            <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 z-10">
              <span class="text-xs text-slate-400">—</span>
            </div>
            <div class="flex-1 py-2">
              <p class="text-sm text-slate-400">No assignment history yet.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TaskTimelineComponent implements OnInit {
  @Input() taskId!: string;

  events: TaskAssignmentEvent[] = [];
  loading = true;

  constructor(private tasksSvc: TasksDbService) {}

  async ngOnInit(): Promise<void> {
    this.events = await this.tasksSvc.getAssignmentHistory(this.taskId);
    this.loading = false;
  }
}
