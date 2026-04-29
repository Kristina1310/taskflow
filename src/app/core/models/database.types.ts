export type AppRole = 'super_admin' | 'admin' | 'manager' | 'member';
export type TeamRole = 'leader' | 'officer' | 'member';
export type AccountStatus = 'active' | 'suspended' | 'pending';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';
export type AuditAction =
  | 'user.created' | 'user.updated' | 'user.role_changed' | 'user.suspended'
  | 'task.created' | 'task.updated' | 'task.deleted' | 'task.assigned'
  | 'task.status_changed' | 'task.approval_requested' | 'task.approved' | 'task.rejected'
  | 'task.soft_deleted' | 'task.restored' | 'task.bulk_assigned'
  | 'comment.created' | 'comment.deleted'
  | 'sla.breached'
  | 'team.created' | 'team.member_joined' | 'team.member_removed' | 'team.invited'
  | 'team.task_approved' | 'team.task_rejected' | 'team.task_reassigned'
  | 'auth.login' | 'auth.logout' | 'auth.force_logout';

export type NotificationType =
  | 'task_assigned' | 'task_mentioned' | 'task_status_changed' | 'task_overdue'
  | 'task_due_soon' | 'task_approved' | 'task_rejected' | 'task_commented'
  | 'sla_breach' | 'approval_requested' | 'digest';

export type TaskApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type SlaBreachLevel = 'warning' | 'critical';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
  status: AccountStatus;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  owner_id: string;
  assignee_id: string | null;
  due_date: string | null;
  deleted_at: string | null;
  approval_status: TaskApprovalStatus;
  approval_note: string | null;
  sla_policy_id: string | null;
  team_id: string | null;
  visible_on_team_board: boolean;
  team_approval_required: boolean;
  created_at: string;
  updated_at: string;
  owner?: Profile;
  assignee?: Profile;
  subtasks?: Subtask[];
  comments?: TaskComment[];
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  uploader_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  uploader?: Profile;
}

export interface TaskAssignmentEvent {
  id: string;
  task_id: string;
  assigned_by: string;
  assignee_id: string | null;
  previous_assignee_id: string | null;
  reason: string | null;
  created_at: string;
  actor?: Profile;
  assignee?: Profile;
  previous_assignee?: Profile;
}

export interface AutoAssignmentRule {
  id: string;
  name: string;
  created_by: string;
  is_active: boolean;
  condition_priority: TaskPriority | null;
  condition_keyword: string | null;
  assignee_id: string;
  created_at: string;
  assignee?: Profile;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  entity_type: string;
  entity_id: string;
  read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  task_assigned: boolean;
  task_mentioned: boolean;
  task_overdue: boolean;
  task_due_soon: boolean;
  task_commented: boolean;
  sla_breach: boolean;
  approval_requested: boolean;
  email_enabled: boolean;
  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly';
}

export interface SlaPolicy {
  id: string;
  name: string;
  priority: TaskPriority;
  warning_hours: number;
  critical_hours: number;
  created_by: string;
  created_at: string;
}

export interface MemberGoal {
  id: string;
  user_id: string;
  title: string;
  target_count: number;
  current_count: number;
  period: 'weekly' | 'monthly';
  created_at: string;
  updated_at: string;
}

// ─── Team Domain ─────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  member_limit: number;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  memberships?: TeamMembership[];
}

export interface TeamMembership {
  team_id: string;
  user_id: string;
  team_role: TeamRole;
  joined_at: string;
  user?: Profile;
  team?: Team;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  token: string;
  email?: string;
  invite_type: 'link' | 'email';
  invited_by: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
  team?: Team;
  inviter?: Profile;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Profile;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> };
      tasks:    { Row: Task;    Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Task> };
      audit_logs: { Row: AuditLog; Insert: Omit<AuditLog, 'id' | 'created_at'>; Update: never };
    };
  };
}
