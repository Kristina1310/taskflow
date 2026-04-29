import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { supabase } from '../supabase.client';
import { Task, TaskStatus, TaskPriority, TaskAssignmentEvent, AutoAssignmentRule, AuditLog } from '../models/database.types';
import { AuditService } from './audit.service';
import { canTransition, canTeamBoardTransition } from '../models/permissions';
import { AppRole } from '../models/database.types';

export type TaskFilter = 'all' | 'active' | 'done';

export interface TaskCreateInput {
  title: string;
  description: string;
  priority: TaskPriority;
  due_date?: string | null;
  assignee_id?: string | null;
}

const TASK_SELECT = `
  *,
  owner:profiles!tasks_owner_id_fkey(id,display_name,avatar_url,role),
  assignee:profiles!tasks_assignee_id_fkey(id,display_name,avatar_url,role),
  subtasks:task_subtasks(*),
  attachments:task_attachments(id,filename,file_size,mime_type,storage_path,created_at)
`;

@Injectable({ providedIn: 'root' })
export class TasksDbService {
  private tasksSubject  = new BehaviorSubject<Task[]>([]);
  private filterSubject = new BehaviorSubject<TaskFilter>('all');
  private searchSubject = new BehaviorSubject<string>('');

  tasks$  = this.tasksSubject.asObservable();
  filter$ = this.filterSubject.asObservable();
  search$ = this.searchSubject.asObservable();

  filteredTasks$: Observable<Task[]> = combineLatest([this.tasks$, this.filter$, this.search$]).pipe(
    map(([tasks, filter, q]) => {
      let res = tasks.filter(t => !t.deleted_at);
      if (filter === 'active') res = res.filter(t => t.status !== 'done' && t.status !== 'cancelled');
      if (filter === 'done')   res = res.filter(t => t.status === 'done');
      if (q.trim()) {
        const lq = q.toLowerCase();
        res = res.filter(t => t.title.toLowerCase().includes(lq) || t.description.toLowerCase().includes(lq));
      }
      return res;
    })
  );

  counts$ = this.tasks$.pipe(
    map(tasks => {
      const active = tasks.filter(t => !t.deleted_at);
      return {
        all:    active.length,
        active: active.filter(t => t.status !== 'done' && t.status !== 'cancelled').length,
        done:   active.filter(t => t.status === 'done').length
      };
    })
  );

  constructor(private audit: AuditService) {}

  async loadForUser(userId: string): Promise<void> {
    const { data } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .or(`owner_id.eq.${userId},assignee_id.eq.${userId}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (data) this.tasksSubject.next(data as Task[]);
  }

  async loadAll(): Promise<void> {
    const { data } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (data) this.tasksSubject.next(data as Task[]);
  }

  async create(input: TaskCreateInput, ownerId: string): Promise<Task> {
    const { data, error } = await supabase.from('tasks').insert({
      ...input,
      owner_id: ownerId,
      status: 'todo' as TaskStatus,
      approval_status: 'none',
      deleted_at: null
    }).select().single();
    if (error) throw error;
    await this.audit.log(ownerId, 'task.created', 'task', data.id, { title: data.title });

    if (input.assignee_id) {
      await this.recordAssignmentEvent(data.id, ownerId, input.assignee_id, null, 'Initial assignment');
    }

    // Run auto-assignment rules if no explicit assignee
    if (!input.assignee_id) {
      await this.runAutoAssignment(data.id, input.priority, input.title, ownerId);
    }

    await this.loadAll();
    return data as Task;
  }

  async update(id: string, changes: Partial<Task>, actorId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    await this.audit.log(actorId, 'task.updated', 'task', id, changes as Record<string, unknown>);
    await this.loadAll();
  }

  async transitionStatus(
    task: Task,
    newStatus: TaskStatus,
    actorRole: AppRole,
    actorId: string
  ): Promise<void> {
    if (!canTransition(task.status, newStatus, actorRole)) {
      throw new Error(`Transition from ${task.status} → ${newStatus} is not allowed for your role.`);
    }

    const changes: Partial<Task> = { status: newStatus };

    // If moving to review, set approval_status to pending (for member/manager)
    if (newStatus === 'review' && task.approval_status === 'none') {
      changes.approval_status = 'pending';
    }
    // If done approved, clear approval pending
    if (newStatus === 'done') {
      changes.approval_status = 'approved';
    }

    await this.update(task.id, changes, actorId);
    await this.audit.log(actorId, 'task.status_changed', 'task', task.id, {
      from: task.status,
      to: newStatus
    });
  }

  async requestApproval(taskId: string, actorId: string): Promise<void> {
    await this.update(taskId, { approval_status: 'pending' }, actorId);
    await this.audit.log(actorId, 'task.approval_requested', 'task', taskId, {});
    await this.createNotification(
      taskId,
      'approval_requested',
      'Approval Requested',
      `Task requires your approval`,
      actorId
    );
  }

  async approveTask(taskId: string, actorId: string, note?: string): Promise<void> {
    await this.update(taskId, {
      approval_status: 'approved',
      approval_note: note || null,
      status: 'done'
    }, actorId);
    await this.audit.log(actorId, 'task.approved', 'task', taskId, { note });
  }

  async rejectTask(taskId: string, actorId: string, note: string): Promise<void> {
    await this.update(taskId, {
      approval_status: 'rejected',
      approval_note: note,
      status: 'in_progress'
    }, actorId);
    await this.audit.log(actorId, 'task.rejected', 'task', taskId, { note });
  }

  async delete(id: string, actorId: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    await this.audit.log(actorId, 'task.deleted', 'task', id, {});
    await this.loadAll();
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    await this.update(id, { deleted_at: new Date().toISOString() } as any, actorId);
    await this.audit.log(actorId, 'task.soft_deleted', 'task', id, {});
  }

  async restore(id: string, actorId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    await this.audit.log(actorId, 'task.restored', 'task', id, {});
    await this.loadAll();
  }

  async loadDeleted(): Promise<Task[]> {
    const { data } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    return (data as Task[]) || [];
  }

  async assign(taskId: string, assigneeId: string | null, actorId: string, reason?: string): Promise<void> {
    const current = this.tasksSubject.value.find(t => t.id === taskId);
    const prevAssigneeId = current?.assignee_id || null;

    await this.update(taskId, { assignee_id: assigneeId }, actorId);
    await this.audit.log(actorId, 'task.assigned', 'task', taskId, { assignee_id: assigneeId });
    await this.recordAssignmentEvent(taskId, actorId, assigneeId, prevAssigneeId, reason);

    if (assigneeId && assigneeId !== actorId) {
      await this.createNotification(
        taskId,
        'task_assigned',
        'Task Assigned',
        `You have been assigned a task`,
        assigneeId
      );
    }
  }

  async bulkAssign(taskIds: string[], assigneeId: string, actorId: string): Promise<void> {
    for (const id of taskIds) {
      await this.assign(id, assigneeId, actorId, 'Bulk assignment');
    }
    await this.audit.log(actorId, 'task.bulk_assigned', 'task', 'bulk', {
      task_ids: taskIds,
      assignee_id: assigneeId
    });
  }

  private async recordAssignmentEvent(
    taskId: string,
    actorId: string,
    assigneeId: string | null,
    prevAssigneeId: string | null,
    reason?: string | null
  ): Promise<void> {
    await supabase.from('task_assignment_events').insert({
      task_id: taskId,
      assigned_by: actorId,
      assignee_id: assigneeId,
      previous_assignee_id: prevAssigneeId,
      reason: reason || null
    });
  }

  async getAssignmentHistory(taskId: string): Promise<TaskAssignmentEvent[]> {
    const { data } = await supabase
      .from('task_assignment_events')
      .select(`
        *,
        actor:profiles!task_assignment_events_assigned_by_fkey(id,display_name,avatar_url),
        assignee:profiles!task_assignment_events_assignee_id_fkey(id,display_name,avatar_url),
        previous_assignee:profiles!task_assignment_events_previous_assignee_id_fkey(id,display_name,avatar_url)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    return (data as TaskAssignmentEvent[]) || [];
  }

  async getWorkloadScores(): Promise<{ userId: string; displayName: string; taskCount: number; score: number }[]> {
    const tasks = this.tasksSubject.value.filter(t => !t.deleted_at && t.status !== 'done' && t.status !== 'cancelled');
    const map = new Map<string, { displayName: string; count: number; highCount: number }>();
    for (const t of tasks) {
      if (!t.assignee_id) continue;
      const entry = map.get(t.assignee_id) || { displayName: t.assignee?.display_name || t.assignee_id, count: 0, highCount: 0 };
      entry.count++;
      if (t.priority === 'high') entry.highCount++;
      map.set(t.assignee_id, entry);
    }
    return Array.from(map.entries())
      .map(([userId, v]) => ({
        userId,
        displayName: v.displayName,
        taskCount: v.count,
        score: v.count + v.highCount * 2
      }))
      .sort((a, b) => a.score - b.score);
  }

  async loadAutomationRules(): Promise<AutoAssignmentRule[]> {
    const { data } = await supabase
      .from('task_automation_rules')
      .select('*, assignee:profiles!task_automation_rules_assignee_id_fkey(id,display_name,avatar_url)')
      .eq('is_active', true);
    return (data as AutoAssignmentRule[]) || [];
  }

  async createAutomationRule(rule: Omit<AutoAssignmentRule, 'id' | 'created_at' | 'assignee'>, actorId: string): Promise<void> {
    await supabase.from('task_automation_rules').insert({ ...rule, created_by: actorId });
  }

  async updateAutomationRule(id: string, changes: Partial<AutoAssignmentRule>): Promise<void> {
    await supabase.from('task_automation_rules').update(changes).eq('id', id);
  }

  async deleteAutomationRule(id: string): Promise<void> {
    await supabase.from('task_automation_rules').delete().eq('id', id);
  }

  private async runAutoAssignment(taskId: string, priority: TaskPriority, title: string, creatorId: string): Promise<void> {
    const rules = await this.loadAutomationRules();
    for (const rule of rules) {
      const matchesPriority = !rule.condition_priority || rule.condition_priority === priority;
      const matchesKeyword = !rule.condition_keyword || title.toLowerCase().includes(rule.condition_keyword.toLowerCase());
      if (matchesPriority && matchesKeyword) {
        await this.assign(taskId, rule.assignee_id, creatorId, `Auto-assigned by rule: ${rule.name}`);
        break;
      }
    }
  }

  private async createNotification(
    entityId: string,
    type: string,
    title: string,
    body: string,
    userId: string
  ): Promise<void> {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body,
      entity_type: 'task',
      entity_id: entityId,
      read: false
    });
  }

  // ─── Team Task Methods ──────────────────────────────────────────────────────

  async createTeamTask(
    input: TaskCreateInput & { team_id: string; team_approval_required?: boolean },
    ownerId: string
  ): Promise<Task> {
    const needsApproval = input.team_approval_required ?? true;
    const { data, error } = await supabase.from('tasks').insert({
      title: input.title,
      description: input.description,
      priority: input.priority,
      due_date: input.due_date ?? null,
      assignee_id: input.assignee_id ?? null,
      owner_id: ownerId,
      status: 'todo' as TaskStatus,
      approval_status: 'none',
      deleted_at: null,
      team_id: input.team_id,
      visible_on_team_board: !needsApproval,
      team_approval_required: needsApproval
    }).select().single();
    if (error) throw error;
    await this.audit.log(ownerId, 'task.created', 'task', data.id, {
      title: data.title, team_id: input.team_id
    });
    return data as Task;
  }

  async loadTeamBoardTasks(teamId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('team_id', teamId)
      .eq('visible_on_team_board', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Task[];
  }

  async loadTeamPendingApprovals(teamId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select(TASK_SELECT)
      .eq('team_id', teamId)
      .eq('visible_on_team_board', false)
      .eq('team_approval_required', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Task[];
  }

  async approveTeamTask(taskId: string, actorId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ visible_on_team_board: true, updated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) throw error;
    await this.audit.log(actorId, 'team.task_approved', 'task', taskId, {});
    await this.createNotification(taskId, 'task_approved', 'Task Approved', 'Your task has been approved for the team board', actorId);
  }

  async rejectTeamTask(taskId: string, actorId: string, note: string): Promise<void> {
    await this.update(taskId, { approval_status: 'rejected', approval_note: note }, actorId);
    await this.audit.log(actorId, 'team.task_rejected', 'task', taskId, { note });
  }

  async teamQuickReassign(taskId: string, newAssigneeId: string, actorId: string, teamId: string): Promise<void> {
    const current = this.tasksSubject.value.find(t => t.id === taskId);
    const prevAssigneeId = current?.assignee_id || null;
    await this.update(taskId, { assignee_id: newAssigneeId }, actorId);
    await this.recordAssignmentEvent(taskId, actorId, newAssigneeId, prevAssigneeId, 'Team quick reassignment');
    await this.audit.log(actorId, 'team.task_reassigned', 'task', taskId, {
      new_assignee: newAssigneeId, team_id: teamId
    });
    if (newAssigneeId !== actorId) {
      await this.createNotification(taskId, 'task_assigned', 'Task Reassigned', 'You have been assigned a team task', newAssigneeId);
    }
  }

  /**
   * Atomic team board move: updates status and/or assignee in one DB call,
   * bypassing the global-role workflow check in favour of team-board transitions.
   */
  async moveTeamBoardTask(
    task: Task,
    changes: { status?: TaskStatus; assignee_id?: string | null },
    actorId: string,
    teamId: string
  ): Promise<void> {
    const dbChanges: Partial<Task> = { ...changes, updated_at: new Date().toISOString() as any };

    // If status is changing, validate team-board transitions
    if (changes.status && changes.status !== task.status) {
      if (!canTeamBoardTransition(task.status, changes.status)) {
        throw new Error(`Cannot move from "${task.status}" to "${changes.status}" on the team board.`);
      }
      // Automatically update approval_status when reaching done
      if (changes.status === 'done') {
        dbChanges.approval_status = 'approved';
      }
    }

    const { error } = await supabase
      .from('tasks')
      .update(dbChanges)
      .eq('id', task.id);
    if (error) throw error;

    // Audit single compound event
    const meta: Record<string, unknown> = { team_id: teamId };
    if (changes.status)      meta['status']   = `${task.status} -> ${changes.status}`;
    if ('assignee_id' in changes) meta['assignee'] = `${task.assignee_id ?? 'none'} -> ${changes.assignee_id ?? 'none'}`;
    await this.audit.log(actorId, 'task.updated', 'task', task.id, meta);

    // Record assignment event if assignee changed
    if ('assignee_id' in changes && changes.assignee_id !== task.assignee_id) {
      await this.recordAssignmentEvent(task.id, actorId, changes.assignee_id ?? null, task.assignee_id, 'Team board reassign');
      if (changes.assignee_id && changes.assignee_id !== actorId) {
        await this.createNotification(task.id, 'task_assigned', 'Task Reassigned', 'You have been assigned a team task', changes.assignee_id);
      }
    }
  }

  /** Returns the last N audit log entries touching a specific team's tasks. */
  async getTeamActivityFeed(teamId: string, limit = 30): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, actor:profiles!audit_logs_actor_id_fkey(id,display_name,avatar_url)')
      .or(`entity_type.eq.team,and(entity_type.eq.task,metadata->>team_id.eq.${teamId})`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AuditLog[];
  }

  /** Bulk update status or assignee for many tasks at once. */
  async bulkMoveTeamTasks(
    tasks: Task[],
    changes: { status?: TaskStatus; assignee_id?: string | null },
    actorId: string,
    teamId: string
  ): Promise<void> {
    for (const task of tasks) {
      await this.moveTeamBoardTask(task, changes, actorId, teamId);
    }
    await this.audit.log(actorId, 'task.bulk_assigned', 'task', 'bulk', {
      task_ids: tasks.map(t => t.id),
      changes,
      team_id: teamId
    });
  }

  setFilter(f: TaskFilter): void { this.filterSubject.next(f); }
  setSearch(q: string): void     { this.searchSubject.next(q); }

  getStats(tasks: Task[]) {
    const active    = tasks.filter(t => !t.deleted_at);
    const total     = active.length;
    const done      = active.filter(t => t.status === 'done').length;
    const overdue   = active.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
    const highPrio  = active.filter(t => t.priority === 'high' && t.status !== 'done').length;
    const inReview  = active.filter(t => t.status === 'review').length;
    const rate      = total ? Math.round((done / total) * 100) : 0;
    return { total, done, overdue, highPrio, rate, inReview };
  }
}
