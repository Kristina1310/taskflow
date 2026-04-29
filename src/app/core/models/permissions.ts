import { AppRole, TeamRole } from './database.types';

export type Permission =
  | 'tasks.create'
  | 'tasks.edit.own'
  | 'tasks.edit.any'
  | 'tasks.delete.own'
  | 'tasks.delete.any'
  | 'tasks.assign'
  | 'tasks.reassign'
  | 'tasks.bulk_assign'
  | 'tasks.view.all'
  | 'tasks.approve'
  | 'tasks.request_approval'
  | 'tasks.restore'
  | 'tasks.field.priority'
  | 'tasks.field.due_date'
  | 'tasks.field.assignee'
  | 'tasks.field.status.advance'
  | 'tasks.field.status.any'
  | 'comments.create'
  | 'comments.delete.own'
  | 'comments.delete.any'
  | 'subtasks.manage'
  | 'attachments.upload'
  | 'attachments.delete.own'
  | 'attachments.delete.any'
  | 'users.view'
  | 'users.manage'
  | 'users.role.assign'
  | 'users.suspend'
  | 'analytics.view.own'
  | 'analytics.view.team'
  | 'analytics.view.global'
  | 'audit.view'
  | 'audit.export'
  | 'sla.manage'
  | 'notifications.manage'
  | 'goals.manage'
  | 'automation_rules.manage'
  | 'system.manage'
  | 'session.manage'
  // Team-scoped permissions
  | 'teams.create'
  | 'teams.manage'
  | 'teams.invite'
  | 'teams.assign.quick'
  | 'teams.approve.tasks'
  | 'teams.view.members'
  | 'teams.remove.members'
  | 'teams.provision.users';

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: [
    'tasks.create', 'tasks.edit.own', 'tasks.edit.any',
    'tasks.delete.own', 'tasks.delete.any',
    'tasks.assign', 'tasks.reassign', 'tasks.bulk_assign', 'tasks.view.all',
    'tasks.approve', 'tasks.request_approval', 'tasks.restore',
    'tasks.field.priority', 'tasks.field.due_date', 'tasks.field.assignee',
    'tasks.field.status.advance', 'tasks.field.status.any',
    'comments.create', 'comments.delete.own', 'comments.delete.any',
    'subtasks.manage', 'attachments.upload', 'attachments.delete.own', 'attachments.delete.any',
    'users.view', 'users.manage', 'users.role.assign', 'users.suspend',
    'analytics.view.own', 'analytics.view.team', 'analytics.view.global',
    'audit.view', 'audit.export',
    'sla.manage', 'notifications.manage', 'goals.manage',
    'automation_rules.manage', 'system.manage', 'session.manage',
    'teams.create', 'teams.manage', 'teams.invite', 'teams.assign.quick',
    'teams.approve.tasks', 'teams.view.members', 'teams.remove.members', 'teams.provision.users'
  ],
  admin: [
    'tasks.create', 'tasks.edit.own', 'tasks.edit.any',
    'tasks.delete.own', 'tasks.delete.any',
    'tasks.assign', 'tasks.reassign', 'tasks.bulk_assign', 'tasks.view.all',
    'tasks.approve', 'tasks.request_approval', 'tasks.restore',
    'tasks.field.priority', 'tasks.field.due_date', 'tasks.field.assignee',
    'tasks.field.status.advance', 'tasks.field.status.any',
    'comments.create', 'comments.delete.own', 'comments.delete.any',
    'subtasks.manage', 'attachments.upload', 'attachments.delete.own', 'attachments.delete.any',
    'users.view', 'users.manage', 'users.role.assign', 'users.suspend',
    'analytics.view.own', 'analytics.view.team', 'analytics.view.global',
    'audit.view', 'audit.export',
    'sla.manage', 'goals.manage', 'automation_rules.manage',
    'teams.create', 'teams.manage', 'teams.invite', 'teams.assign.quick',
    'teams.approve.tasks', 'teams.view.members', 'teams.remove.members', 'teams.provision.users'
  ],
  manager: [
    'tasks.create', 'tasks.edit.own', 'tasks.edit.any',
    'tasks.delete.own',
    'tasks.assign', 'tasks.reassign', 'tasks.bulk_assign', 'tasks.view.all',
    'tasks.approve', 'tasks.request_approval',
    'tasks.field.priority', 'tasks.field.due_date', 'tasks.field.assignee',
    'tasks.field.status.advance', 'tasks.field.status.any',
    'comments.create', 'comments.delete.own',
    'subtasks.manage', 'attachments.upload', 'attachments.delete.own',
    'users.view',
    'analytics.view.own', 'analytics.view.team',
    'goals.manage',
    'teams.create', 'teams.invite', 'teams.view.members'
  ],
  member: [
    'tasks.create', 'tasks.edit.own', 'tasks.delete.own',
    'tasks.request_approval',
    'tasks.field.priority', 'tasks.field.due_date',
    'tasks.field.status.advance',
    'comments.create', 'comments.delete.own',
    'subtasks.manage', 'attachments.upload', 'attachments.delete.own',
    'analytics.view.own',
    'goals.manage',
    'teams.create', 'teams.view.members'
  ]
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRolePermissions(role: AppRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  super_admin: 4,
  admin: 3,
  manager: 2,
  member: 1
};

export function isRoleAtLeast(userRole: AppRole, minRole: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member'
};

export const ROLE_COLORS: Record<AppRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin:       'bg-red-100 text-red-700',
  manager:     'bg-blue-100 text-blue-700',
  member:      'bg-slate-100 text-slate-700'
};

// Allowed status transitions per role
export const WORKFLOW_TRANSITIONS: Record<string, string[]> = {
  todo:        ['in_progress', 'cancelled'],
  in_progress: ['review', 'done', 'todo', 'cancelled'],
  review:      ['done', 'in_progress'],
  done:        ['in_progress'],
  cancelled:   ['todo']
};

export function canTransition(
  from: string,
  to: string,
  role: AppRole
): boolean {
  if (hasPermission(role, 'tasks.field.status.any')) return true;
  return WORKFLOW_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Team-board specific: allows richer direct transitions regardless of global role */
export function canTeamBoardTransition(from: string, to: string): boolean {
  return WORKFLOW_TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_LABELS: Record<string, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  review:      'Review',
  done:        'Done',
  cancelled:   'Cancelled'
};

export const STATUS_COLORS: Record<string, string> = {
  todo:        'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  review:      'bg-amber-100 text-amber-700',
  done:        'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-red-100 text-red-600'
};

// ─── Team-Scoped Permission Helpers ─────────────────────────────────────────

export type TeamPermission =
  | 'team.invite'
  | 'team.assign.quick'
  | 'team.approve.tasks'
  | 'team.manage.members'
  | 'team.provision.users'
  | 'team.view';

const TEAM_ROLE_PERMISSIONS: Record<TeamRole, TeamPermission[]> = {
  leader:  ['team.invite', 'team.assign.quick', 'team.approve.tasks', 'team.manage.members', 'team.provision.users', 'team.view'],
  officer: ['team.invite', 'team.assign.quick', 'team.view'],
  member:  ['team.view']
};

export function hasTeamPermission(teamRole: TeamRole | null | undefined, permission: TeamPermission): boolean {
  if (!teamRole) return false;
  return TEAM_ROLE_PERMISSIONS[teamRole]?.includes(permission) ?? false;
}

export function getEffectiveTeamPermissions(
  globalRole: AppRole,
  teamRole: TeamRole | null | undefined
): TeamPermission[] {
  const global = new Set<TeamPermission>();
  // Super admins and admins get all team permissions globally
  if (globalRole === 'super_admin' || globalRole === 'admin') {
    (Object.keys(TEAM_ROLE_PERMISSIONS) as TeamRole[]).forEach(r =>
      TEAM_ROLE_PERMISSIONS[r].forEach(p => global.add(p))
    );
    return Array.from(global);
  }
  if (teamRole) {
    TEAM_ROLE_PERMISSIONS[teamRole].forEach(p => global.add(p));
  }
  return Array.from(global);
}

export function canDoTeamAction(
  globalRole: AppRole,
  teamRole: TeamRole | null | undefined,
  permission: TeamPermission
): boolean {
  if (globalRole === 'super_admin' || globalRole === 'admin') return true;
  return hasTeamPermission(teamRole, permission);
}

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  leader:  'Team Leader',
  officer: 'Team Officer',
  member:  'Team Member'
};

export const TEAM_ROLE_COLORS: Record<TeamRole, string> = {
  leader:  'bg-amber-100 text-amber-700',
  officer: 'bg-sky-100 text-sky-700',
  member:  'bg-slate-100 text-slate-600'
};
