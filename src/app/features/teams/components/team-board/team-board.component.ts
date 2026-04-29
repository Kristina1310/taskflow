import {
  Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit
} from '@angular/core';
import { Router } from '@angular/router';
import { CdkDragDrop, transferArrayItem, moveItemInArray } from '@angular/cdk/drag-drop';
import { Task, TaskStatus, TeamMembership, TeamRole } from '../../../../core/models/database.types';
import { AppRole } from '../../../../core/models/database.types';
import { canDoTeamAction } from '../../../../core/models/permissions';

// ── Types ─────────────────────────────────────────────────────────────────────

export type WipLevel = 'healthy' | 'warning' | 'high';
const WIP_WARN = 3;
const WIP_HIGH = 5;

export interface BoardFilter {
  assigneeId: string | null;
  priority: string | null;
  dueWindow: 'all' | 'overdue' | 'today' | 'week';
}

export interface SavedView {
  id: string;
  label: string;
  filter: BoardFilter;
}

export interface AssigneeRow {
  userId: string | null;
  displayName: string;
  avatarUrl: string | null;
  tasks: Task[];
  wip: number;
  wipLevel: WipLevel;
}

export interface StatusColumn {
  status: TaskStatus;
  label: string;
  dotClass: string;
  rows: AssigneeRow[];
}

export interface BoardMove {
  tasks: Task[];
  toStatus?: TaskStatus;
  toAssigneeId?: string | null;
}

// ── Default saved views ───────────────────────────────────────────────────────

const DEFAULT_VIEWS: SavedView[] = [
  { id: 'all',      label: 'All tasks',      filter: { assigneeId: null, priority: null, dueWindow: 'all' } },
  { id: 'overdue',  label: 'Overdue',        filter: { assigneeId: null, priority: null, dueWindow: 'overdue' } },
  { id: 'week',     label: 'Due this week',  filter: { assigneeId: null, priority: null, dueWindow: 'week' } },
  { id: 'high',     label: 'High priority',  filter: { assigneeId: null, priority: 'high', dueWindow: 'all' } },
];

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-team-board',
  template: `
    <!-- Toolbar: filters + views + bulk bar -->
    <div class="mb-4 space-y-3">

      <!-- View pills + saved views -->
      <div class="flex items-center gap-2 flex-wrap">
        <button *ngFor="let v of savedViews"
          (click)="applyView(v)"
          class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
          [ngClass]="activeViewId === v.id
            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
            : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-600'">
          {{ v.label }}
        </button>
        <div class="ml-auto flex items-center gap-2">
          <button (click)="selectionMode = !selectionMode"
            class="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
            [ngClass]="selectionMode
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'">
            {{ selectionMode ? 'Cancel Select' : 'Select' }}
          </button>
        </div>
      </div>

      <!-- Filters row -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Assignee filter -->
        <select [(ngModel)]="filter.assigneeId" (ngModelChange)="onFilterChange()"
          class="border border-slate-200 text-slate-600 text-xs rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-primary-300 transition-all">
          <option [ngValue]="null">All assignees</option>
          <option *ngFor="let m of members" [ngValue]="m.user_id">{{ m.user?.display_name }}</option>
        </select>
        <!-- Priority filter -->
        <select [(ngModel)]="filter.priority" (ngModelChange)="onFilterChange()"
          class="border border-slate-200 text-slate-600 text-xs rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-primary-300 transition-all">
          <option [ngValue]="null">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <!-- Due window filter -->
        <select [(ngModel)]="filter.dueWindow" (ngModelChange)="onFilterChange()"
          class="border border-slate-200 text-slate-600 text-xs rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-primary-300 transition-all">
          <option value="all">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="week">Due this week</option>
        </select>
        <!-- Clear indicator -->
        <button *ngIf="isFiltered" (click)="clearFilters()"
          class="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Clear filters
        </button>
        <span *ngIf="isFiltered" class="text-xs text-slate-400">{{ filteredCount }} task{{ filteredCount !== 1 ? 's' : '' }}</span>
      </div>

      <!-- Bulk action bar -->
      <div *ngIf="selectionMode && selectedIds.size > 0"
        class="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-2.5 text-white">
        <span class="text-sm font-medium">{{ selectedIds.size }} selected</span>
        <div class="flex items-center gap-2 ml-auto">
          <select *ngIf="canReassign" (change)="bulkReassign($any($event.target).value)"
            class="bg-slate-700 border border-slate-600 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none">
            <option value="">Reassign to...</option>
            <option *ngFor="let m of members" [value]="m.user_id">{{ m.user?.display_name }}</option>
          </select>
          <select (change)="bulkSetStatus($any($event.target).value)"
            class="bg-slate-700 border border-slate-600 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none">
            <option value="">Move to status...</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
          <button (click)="clearSelection()"
            class="text-slate-400 hover:text-white px-2 py-1 text-xs transition-colors">
            Deselect all
          </button>
        </div>
      </div>

    </div>

    <!-- Board: status columns -->
    <div class="flex gap-4 overflow-x-auto pb-4" style="min-height: 420px">

      <div *ngFor="let col of columns; trackBy: trackCol"
        class="flex-shrink-0 w-72">

        <!-- Column header -->
        <div class="flex items-center justify-between mb-3 px-1">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" [ngClass]="col.dotClass"></span>
            <span class="text-sm font-semibold text-slate-600">{{ col.label }}</span>
          </div>
          <span class="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-medium">
            {{ colCount(col) }}
          </span>
        </div>

        <!-- Swimlanes -->
        <div class="space-y-3">
          <div *ngFor="let row of col.rows; trackBy: trackRow"
            class="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">

            <!-- Swimlane header with WIP indicator -->
            <div class="flex items-center gap-2 px-3 py-2 bg-slate-50/80 border-b border-slate-100">
              <div class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden flex-shrink-0"
                [ngClass]="row.userId ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-slate-500'">
                <img *ngIf="row.avatarUrl" [src]="row.avatarUrl" class="w-full h-full object-cover" alt="">
                <span *ngIf="!row.avatarUrl">{{ row.displayName[0] | uppercase }}</span>
              </div>
              <span class="text-xs font-medium text-slate-600 truncate flex-1">{{ row.displayName }}</span>

              <!-- WIP chip -->
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                [ngClass]="{
                  'bg-emerald-50 text-emerald-600': row.wipLevel === 'healthy',
                  'bg-amber-50 text-amber-600':    row.wipLevel === 'warning',
                  'bg-red-50 text-red-600':        row.wipLevel === 'high'
                }">
                {{ row.wip }} WIP
              </span>
            </div>

            <!-- Drop zone -->
            <div
              cdkDropList
              [id]="dropId(col.status, row.userId)"
              [cdkDropListData]="row.tasks"
              [cdkDropListConnectedTo]="allDropIds"
              (cdkDropListDropped)="onDrop($event, col.status, row.userId)"
              class="min-h-[56px] p-2 space-y-2">

              <div *ngIf="row.tasks.length === 0"
                class="h-12 flex items-center justify-center rounded-lg border-2 border-dashed border-slate-100">
                <span class="text-slate-300 text-[11px]">Drop here</span>
              </div>

              <!-- Task card -->
              <div *ngFor="let task of row.tasks; trackBy: trackTask"
                cdkDrag
                [cdkDragDisabled]="selectionMode"
                [cdkDragData]="{ task, fromStatus: col.status, fromAssigneeId: row.userId }"
                class="relative bg-white border rounded-lg p-3 transition-all group"
                [ngClass]="selectedIds.has(task.id)
                  ? 'border-primary-400 ring-2 ring-primary-200 shadow-md'
                  : 'border-slate-100 shadow-sm hover:shadow-md hover:border-primary-200 cursor-grab active:cursor-grabbing'"
                (click)="onCardClick(task, $event)">

                <!-- Drag placeholder -->
                <div *cdkDragPlaceholder class="bg-primary-50 border-2 border-dashed border-primary-200 rounded-lg h-[84px]"></div>

                <!-- Selection checkbox (visible in select mode) -->
                <div *ngIf="selectionMode" class="absolute top-2 left-2 z-10">
                  <div class="w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                    [ngClass]="selectedIds.has(task.id)
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-white border-slate-300'">
                    <svg *ngIf="selectedIds.has(task.id)" class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                </div>

                <!-- Priority + quick reassign -->
                <div class="flex items-center gap-1.5 mb-1.5" [class.pl-5]="selectionMode">
                  <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                    [ngClass]="{
                      'bg-red-50 text-red-500':    task.priority === 'high',
                      'bg-amber-50 text-amber-500': task.priority === 'medium',
                      'bg-slate-100 text-slate-400': task.priority === 'low'
                    }">{{ task.priority | titlecase }}</span>

                  <div *ngIf="canReassign && !selectionMode" class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    (click)="$event.stopPropagation()">
                    <select [value]="task.assignee_id ?? ''"
                      (change)="onReassign(task, $any($event.target).value)"
                      class="text-[10px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-slate-600 focus:outline-none focus:border-primary-300 max-w-[90px]">
                      <option value="">Unassigned</option>
                      <option *ngFor="let m of members" [value]="m.user_id">{{ m.user?.display_name }}</option>
                    </select>
                  </div>
                </div>

                <!-- Title -->
                <p class="text-slate-700 text-xs font-semibold line-clamp-2 leading-snug cursor-pointer hover:text-primary-600 transition-colors"
                  [class.pl-5]="selectionMode">
                  {{ task.title }}
                </p>

                <!-- Description -->
                <div *ngIf="task.description" class="text-slate-400 text-[10px] mt-0.5 line-clamp-1" [class.pl-5]="selectionMode">
                  {{ task.description }}
                </div>

                <!-- Footer -->
                <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                  <div class="flex items-center gap-1">
                    <div *ngIf="task.assignee" class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold overflow-hidden bg-slate-200 text-slate-500">
                      <img *ngIf="task.assignee.avatar_url" [src]="task.assignee.avatar_url" class="w-full h-full object-cover" alt="">
                      <span *ngIf="!task.assignee.avatar_url">{{ task.assignee.display_name[0] | uppercase }}</span>
                    </div>
                    <span *ngIf="!task.assignee" class="text-[10px] text-slate-300">—</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span *ngIf="task.due_date" class="text-[10px]"
                      [ngClass]="isOverdue(task) ? 'text-red-400 font-semibold' : 'text-slate-400'">
                      {{ task.due_date | date:'MMM d' }}
                    </span>
                    <!-- Click-through hint -->
                    <svg *ngIf="!selectionMode" class="w-3 h-3 text-slate-200 group-hover:text-primary-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty board state -->
    <div *ngIf="filteredTasks.length === 0 && !isFiltered"
      class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mb-3 border border-primary-100">
        <svg class="w-7 h-7 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      </div>
      <p class="text-slate-500 font-medium text-sm">No tasks on the board yet</p>
      <p class="text-slate-400 text-xs mt-1">Add a task using the button above to get started.</p>
    </div>

    <div *ngIf="filteredTasks.length === 0 && isFiltered"
      class="flex flex-col items-center justify-center py-16 text-center">
      <p class="text-slate-500 text-sm font-medium">No tasks match the current filters</p>
      <button (click)="clearFilters()" class="mt-3 text-primary-500 text-xs hover:text-primary-600 font-medium transition-colors">
        Clear all filters
      </button>
    </div>
  `,
  styles: [`
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0,0,0.2,1); }
    .cdk-drop-list-dragging > div:not(.cdk-drag-placeholder) { transition: transform 250ms cubic-bezier(0,0,0.2,1); }
    .cdk-drag-preview { box-shadow: 0 10px 30px -5px rgba(0,0,0,0.15); opacity: 0.96; border-radius: 8px; }
  `]
})
export class TeamBoardComponent implements OnInit, OnChanges {
  @Input() tasks: Task[] = [];
  @Input() members: TeamMembership[] = [];
  @Input() myRole: TeamRole | null = null;
  @Input() myId = '';
  @Input() globalRole: AppRole = 'member';
  @Input() teamId = '';
  @Output() boardMove = new EventEmitter<BoardMove>();

  // State
  columns: StatusColumn[] = [];
  allDropIds: string[] = [];
  filteredTasks: Task[] = [];
  selectionMode = false;
  selectedIds = new Set<string>();
  activeViewId = 'all';
  filter: BoardFilter = { assigneeId: null, priority: null, dueWindow: 'all' };
  savedViews: SavedView[] = [...DEFAULT_VIEWS];

  private readonly STATUSES: { status: TaskStatus; label: string; dotClass: string }[] = [
    { status: 'todo',        label: 'To Do',        dotClass: 'bg-slate-400' },
    { status: 'in_progress', label: 'In Progress',  dotClass: 'bg-blue-500' },
    { status: 'review',      label: 'Review',       dotClass: 'bg-amber-500' },
    { status: 'done',        label: 'Done',         dotClass: 'bg-emerald-500' },
  ];

  constructor(private router: Router) {}

  get canReassign(): boolean {
    return canDoTeamAction(this.globalRole, this.myRole, 'team.assign.quick');
  }

  get isFiltered(): boolean {
    return !!(this.filter.assigneeId || this.filter.priority || this.filter.dueWindow !== 'all');
  }

  get filteredCount(): number { return this.filteredTasks.length; }

  ngOnInit(): void {
    this.loadSavedViews();
    this.applyFilter();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tasks'] || changes['members']) {
      this.applyFilter();
    }
  }

  // ── Views ───────────────────────────────────────────────────────────────────

  private loadSavedViews(): void {
    if (!this.teamId) return;
    try {
      const stored = localStorage.getItem(`board-views-${this.teamId}`);
      const custom: SavedView[] = stored ? JSON.parse(stored) : [];
      this.savedViews = [...DEFAULT_VIEWS, ...custom];
    } catch { /* ignore */ }
  }

  applyView(view: SavedView): void {
    this.activeViewId = view.id;
    this.filter = { ...view.filter };
    this.applyFilter();
  }

  // ── Filtering ───────────────────────────────────────────────────────────────

  onFilterChange(): void {
    this.activeViewId = '';
    this.applyFilter();
  }

  clearFilters(): void {
    this.filter = { assigneeId: null, priority: null, dueWindow: 'all' };
    this.activeViewId = 'all';
    this.applyFilter();
  }

  private applyFilter(): void {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + 7);

    this.filteredTasks = this.tasks.filter(t => {
      if (this.filter.assigneeId && t.assignee_id !== this.filter.assigneeId) return false;
      if (this.filter.priority && t.priority !== this.filter.priority) return false;
      if (this.filter.dueWindow !== 'all') {
        if (!t.due_date) return false;
        const due = new Date(t.due_date);
        if (this.filter.dueWindow === 'overdue' && (due >= today || t.status === 'done')) return false;
        if (this.filter.dueWindow === 'today') {
          const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
          if (due < today || due > todayEnd) return false;
        }
        if (this.filter.dueWindow === 'week' && (due < today || due > endOfWeek)) return false;
      }
      return true;
    });

    this.buildBoard();
  }

  // ── Board building ──────────────────────────────────────────────────────────

  private buildBoard(): void {
    const memberRows = [
      ...this.members.map(m => ({
        userId: m.user_id,
        displayName: m.user?.display_name ?? m.user_id,
        avatarUrl: m.user?.avatar_url ?? null,
      })),
      { userId: null as any as string, displayName: 'Unassigned', avatarUrl: null },
    ];

    this.columns = this.STATUSES.map(s => {
      const colTasks = this.filteredTasks.filter(t => t.status === s.status);
      const rows: AssigneeRow[] = memberRows.map(mr => {
        const rowTasks = colTasks.filter(t => (t.assignee_id ?? null) === (mr.userId ?? null));
        const wip = rowTasks.length;
        const wipLevel: WipLevel = wip >= WIP_HIGH ? 'high' : wip >= WIP_WARN ? 'warning' : 'healthy';
        return {
          ...mr,
          tasks: rowTasks,
          wip,
          wipLevel
        };
      }).filter(r => r.tasks.length > 0 || this.canReassign);

      return { ...s, rows };
    });

    this.allDropIds = this.columns.flatMap(col =>
      col.rows.map(row => this.dropId(col.status, row.userId))
    );
  }

  // ── Drag-and-drop ───────────────────────────────────────────────────────────

  dropId(status: TaskStatus, userId: string | null): string {
    return `drop-${status}-${userId ?? 'unassigned'}`;
  }

  onDrop(event: CdkDragDrop<Task[]>, toStatus: TaskStatus, toAssigneeId: string | null): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    const drag = event.item.data as { task: Task; fromStatus: TaskStatus; fromAssigneeId: string | null };
    const move: BoardMove = { tasks: [drag.task] };
    const statusChanged  = toStatus !== drag.fromStatus;
    const assigneeChanged = (toAssigneeId ?? null) !== (drag.fromAssigneeId ?? null);

    // Optimistic update in local arrays
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);

    if (statusChanged)   move.toStatus     = toStatus;
    if (assigneeChanged) move.toAssigneeId = toAssigneeId;
    if (statusChanged || assigneeChanged) this.boardMove.emit(move);
  }

  // ── Inline actions ──────────────────────────────────────────────────────────

  onReassign(task: Task, newAssigneeId: string): void {
    if (newAssigneeId === (task.assignee_id ?? '')) return;
    this.boardMove.emit({ tasks: [task], toAssigneeId: newAssigneeId || null });
  }

  onCardClick(task: Task, e: MouseEvent): void {
    if (this.selectionMode) {
      e.stopPropagation();
      if (this.selectedIds.has(task.id)) this.selectedIds.delete(task.id);
      else this.selectedIds.add(task.id);
      this.selectedIds = new Set(this.selectedIds); // trigger CD
      return;
    }
    // Navigate to task detail with return context
    this.router.navigate(['/tasks', task.id], {
      queryParams: { from: 'team-board', teamId: this.teamId }
    });
  }

  // ── Selection & bulk ────────────────────────────────────────────────────────

  clearSelection(): void {
    this.selectedIds = new Set();
    this.selectionMode = false;
  }

  bulkReassign(assigneeId: string): void {
    if (!assigneeId) return;
    const tasks = this.filteredTasks.filter(t => this.selectedIds.has(t.id));
    this.boardMove.emit({ tasks, toAssigneeId: assigneeId });
    this.clearSelection();
  }

  bulkSetStatus(status: string): void {
    if (!status) return;
    const tasks = this.filteredTasks.filter(t => this.selectedIds.has(t.id));
    this.boardMove.emit({ tasks, toStatus: status as TaskStatus });
    this.clearSelection();
  }

  // ── Utils ───────────────────────────────────────────────────────────────────

  colCount(col: StatusColumn): number {
    return col.rows.reduce((s, r) => s + r.tasks.length, 0);
  }

  isOverdue(task: Task): boolean {
    if (!task.due_date || task.status === 'done' || task.status === 'cancelled') return false;
    return new Date(task.due_date) < new Date();
  }

  trackCol(_: number, col: StatusColumn): string { return col.status; }
  trackRow(_: number, row: AssigneeRow): string { return row.userId ?? 'unassigned'; }
  trackTask(_: number, task: Task): string { return task.id; }
}
