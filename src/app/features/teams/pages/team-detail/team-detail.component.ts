import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Team, TeamMembership, TeamInvite, Task, TeamRole, AuditLog } from '../../../../core/models/database.types';
import { TeamService } from '../../../../core/services/team.service';
import { TasksDbService } from '../../../../core/services/tasks-db.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { canDoTeamAction, TEAM_ROLE_LABELS, TEAM_ROLE_COLORS } from '../../../../core/models/permissions';
import { BoardMove } from '../../components/team-board/team-board.component';

type Tab = 'board' | 'members' | 'invites' | 'approvals' | 'provision';

const ACTION_LABELS: Record<string, string> = {
  'task.updated':           'updated a task',
  'task.created':           'created a task',
  'task.assigned':          'assigned a task',
  'team.task_approved':     'approved a task',
  'team.task_rejected':     'rejected a task',
  'team.task_reassigned':   'reassigned a task',
  'team.member_joined':     'joined the team',
  'team.member_removed':    'removed a member',
};

@Component({
  selector: 'app-team-detail',
  template: `
    <ng-container *ngIf="team; else loadingTpl">
    <div class="flex flex-col h-full">

      <!-- Page header -->
      <div class="px-6 pt-5 pb-0 border-b border-slate-100 bg-white">
        <div class="flex items-center gap-3 mb-1">
          <button (click)="router.navigate(['/teams'])"
            class="text-slate-400 hover:text-slate-600 transition-colors p-1 -ml-1 rounded">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" [ngClass]="teamColor(team.id)">
            {{ team.name[0] | uppercase }}
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="text-lg font-bold text-slate-800 truncate">{{ team.name }}</h1>
            <p class="text-slate-400 text-xs truncate">{{ team.description || 'No description' }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs text-slate-400">{{ members.length }}/{{ team.member_limit }}</span>
            <span *ngIf="myRole" class="text-xs px-2.5 py-1 rounded-full font-semibold" [ngClass]="roleClass(myRole)">
              {{ roleLabel(myRole) }}
            </span>
          </div>
        </div>
        <!-- Tabs -->
        <div class="flex gap-0.5 mt-3">
          <button *ngFor="let tab of availableTabs" (click)="activeTab = tab"
            class="px-4 py-2 text-sm font-medium border-b-2 transition-all"
            [ngClass]="activeTab === tab
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'">
            {{ tabLabel(tab) }}
            <span *ngIf="tab === 'approvals' && pendingApprovals.length > 0"
              class="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
              {{ pendingApprovals.length }}
            </span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-hidden bg-slate-50 flex">

        <!-- Main tab area -->
        <div class="flex-1 overflow-y-auto p-6">

          <!-- BOARD TAB -->
          <div *ngIf="activeTab === 'board'">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-sm font-semibold text-slate-700">Team Board</h2>
                <p class="text-xs text-slate-400 mt-0.5">{{ boardTasks.length }} task{{ boardTasks.length !== 1 ? 's' : '' }} visible</p>
              </div>
              <div class="flex items-center gap-2">
                <button (click)="toggleFeed()"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  [ngClass]="showActivityFeed
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  Activity
                </button>
                <button (click)="showTaskCreate = true"
                  class="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  Add Task
                </button>
              </div>
            </div>

            <!-- Board skeleton -->
            <div *ngIf="boardLoading" class="flex gap-4">
              <div *ngFor="let _ of [1,2,3,4]" class="flex-shrink-0 w-72">
                <div class="h-4 bg-slate-200 rounded animate-pulse mb-3 w-1/2"></div>
                <div class="space-y-2">
                  <div *ngFor="let __ of [1,2]" class="bg-white border border-slate-100 rounded-xl p-4 animate-pulse">
                    <div class="h-3 bg-slate-100 rounded w-3/4 mb-2"></div>
                    <div class="h-3 bg-slate-100 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>

            <app-team-board *ngIf="!boardLoading"
              [tasks]="boardTasks"
              [members]="members"
              [myRole]="myRole"
              [myId]="myId"
              [globalRole]="auth.currentRole || 'member'"
              [teamId]="team.id"
              (boardMove)="onBoardMove($event)">
            </app-team-board>
          </div>

          <!-- MEMBERS TAB -->
          <div *ngIf="activeTab === 'members'">
            <div class="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 class="font-semibold text-slate-700 text-sm">Members ({{ members.length }}/{{ team.member_limit }})</h2>
                <button *ngIf="canInvite" (click)="activeTab = 'invites'"
                  class="text-primary-500 hover:text-primary-600 text-xs font-medium transition-colors">
                  + Invite
                </button>
              </div>
              <div class="divide-y divide-slate-50">
                <div *ngFor="let m of members" class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div class="w-8 h-8 rounded-full bg-slate-200 border border-white shadow-sm flex items-center justify-center text-sm font-semibold text-slate-600 overflow-hidden shrink-0">
                    <img *ngIf="m.user?.avatar_url" [src]="m.user!.avatar_url" class="w-full h-full object-cover" alt="">
                    <span *ngIf="!m.user?.avatar_url">{{ m.user?.display_name?.[0] | uppercase }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-slate-700 font-medium text-sm truncate">{{ m.user?.display_name }}</div>
                    <div class="text-slate-400 text-xs truncate">{{ m.user?.email }}</div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <select *ngIf="canManageMembers && m.user_id !== myId; else roleBadge"
                      [value]="m.team_role" (change)="changeRole(m, $any($event.target).value)"
                      class="border border-slate-200 text-slate-600 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-primary-300 bg-white">
                      <option value="leader">Leader</option>
                      <option value="officer">Officer</option>
                      <option value="member">Member</option>
                    </select>
                    <ng-template #roleBadge>
                      <span class="text-xs px-2.5 py-1 rounded-full font-medium" [ngClass]="roleClass(m.team_role)">
                        {{ roleLabel(m.team_role) }}
                      </span>
                    </ng-template>
                    <button *ngIf="canManageMembers && m.user_id !== myId"
                      (click)="removeMember(m)"
                      class="text-slate-300 hover:text-red-400 p-1 rounded transition-colors">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- INVITES TAB -->
          <div *ngIf="activeTab === 'invites'" class="space-y-5">
            <div class="grid md:grid-cols-2 gap-5">
              <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <h3 class="font-semibold text-slate-700 text-sm mb-1">Invite via Link</h3>
                <p class="text-slate-400 text-xs mb-4">Share a link — valid for 7 days.</p>
                <button (click)="generateLink()" [disabled]="generatingLink"
                  class="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-all text-sm mb-3">
                  {{ generatingLink ? 'Generating...' : 'Generate Invite Link' }}
                </button>
                <div *ngIf="generatedLink" class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  <input type="text" [value]="generatedLink" readonly class="flex-1 bg-transparent text-slate-600 text-xs outline-none min-w-0 truncate">
                  <button (click)="copyLink()" class="text-primary-500 hover:text-primary-600 text-xs font-semibold whitespace-nowrap transition-colors">
                    {{ copied ? '✓ Copied' : 'Copy' }}
                  </button>
                </div>
              </div>
              <div class="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <h3 class="font-semibold text-slate-700 text-sm mb-1">Invite by Email</h3>
                <p class="text-slate-400 text-xs mb-4">Send a personal invite by email.</p>
                <form [formGroup]="inviteForm" (ngSubmit)="sendEmailInvite()">
                  <input formControlName="email" type="email" placeholder="colleague@example.com"
                    class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 text-sm mb-3 transition-all">
                  <button type="submit" [disabled]="inviteForm.invalid || sendingInvite"
                    class="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium text-sm transition-all">
                    {{ sendingInvite ? 'Sending...' : 'Send Invite' }}
                  </button>
                </form>
              </div>
            </div>
            <div class="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <div class="px-5 py-4 border-b border-slate-100">
                <h3 class="font-semibold text-slate-700 text-sm">Active Invites</h3>
              </div>
              <div *ngIf="invites.length === 0" class="px-5 py-8 text-center text-slate-400 text-sm">No invites yet</div>
              <div class="divide-y divide-slate-50">
                <div *ngFor="let inv of invites" class="flex items-center gap-3 px-5 py-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-slate-700 text-sm font-medium truncate">{{ inv.email || 'Link invite' }}</span>
                      <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        [ngClass]="inv.accepted_at ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'">
                        {{ inv.accepted_at ? 'Accepted' : 'Pending' }}
                      </span>
                    </div>
                    <div class="text-slate-400 text-xs mt-0.5">Expires {{ inv.expires_at | date:'MMM d, y' }}</div>
                  </div>
                  <button *ngIf="!inv.accepted_at" (click)="revokeInvite(inv)"
                    class="text-red-400 hover:text-red-500 text-xs font-medium transition-colors shrink-0">Revoke</button>
                </div>
              </div>
            </div>
          </div>

          <!-- APPROVALS TAB -->
          <div *ngIf="activeTab === 'approvals'">
            <div *ngIf="pendingApprovals.length === 0"
              class="bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
              <div class="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <p class="text-slate-600 font-medium text-sm">No pending approvals</p>
            </div>
            <div class="space-y-3">
              <div *ngFor="let t of pendingApprovals"
                class="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1.5">
                    <span class="text-xs px-2 py-0.5 rounded font-medium"
                      [ngClass]="t.priority==='high' ? 'bg-red-50 text-red-600' : t.priority==='medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'">
                      {{ t.priority | titlecase }}
                    </span>
                    <span class="text-slate-400 text-xs">by {{ t.owner?.display_name }}</span>
                  </div>
                  <h4 class="text-slate-800 font-semibold text-sm truncate">{{ t.title }}</h4>
                  <p class="text-slate-500 text-xs mt-1 line-clamp-2">{{ t.description }}</p>
                  <div class="text-slate-400 text-xs mt-2 flex items-center gap-3">
                    <span>To: {{ t.assignee?.display_name || 'Unassigned' }}</span>
                    <span *ngIf="t.due_date">Due {{ t.due_date | date:'MMM d' }}</span>
                  </div>
                </div>
                <div class="flex gap-2 shrink-0">
                  <button (click)="approveTask(t)" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">Approve</button>
                  <button (click)="rejectTask(t)" class="border border-red-200 text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">Reject</button>
                </div>
              </div>
            </div>
          </div>

          <!-- PROVISION TAB -->
          <div *ngIf="activeTab === 'provision'" class="max-w-sm">
            <div class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 class="font-semibold text-slate-700 mb-1 text-sm">Provision Team Member</h3>
              <p class="text-slate-400 text-xs mb-5">Create a new account and auto-add them to this team.</p>
              <form [formGroup]="provisionForm" (ngSubmit)="provisionMember()">
                <div class="space-y-3">
                  <div>
                    <label class="text-slate-600 text-xs font-medium mb-1 block">Display Name *</label>
                    <input formControlName="displayName" type="text" placeholder="Jane Doe"
                      class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 text-sm transition-all">
                  </div>
                  <div>
                    <label class="text-slate-600 text-xs font-medium mb-1 block">Email *</label>
                    <input formControlName="email" type="email" placeholder="jane@company.com"
                      class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 text-sm transition-all">
                  </div>
                  <div>
                    <label class="text-slate-600 text-xs font-medium mb-1 block">Temporary Password *</label>
                    <input formControlName="password" type="password" placeholder="Min 8 characters"
                      class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 text-sm transition-all">
                  </div>
                </div>
                <div *ngIf="provisionError" class="mt-3 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{{ provisionError }}</div>
                <button type="submit" [disabled]="provisionForm.invalid || provisioning"
                  class="w-full mt-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm">
                  {{ provisioning ? 'Creating...' : 'Create & Add to Team' }}
                </button>
              </form>
            </div>
          </div>

        </div>

        <!-- Activity feed sidebar (Board tab only) -->
        <div *ngIf="activeTab === 'board' && showActivityFeed"
          class="w-72 shrink-0 border-l border-slate-100 bg-white flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-700">Recent Activity</h3>
            <button (click)="showActivityFeed = false" class="text-slate-400 hover:text-slate-600 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-3">
            <!-- Feed skeleton -->
            <div *ngIf="feedLoading" class="space-y-3">
              <div *ngFor="let _ of [1,2,3,4,5]" class="flex gap-2.5 animate-pulse">
                <div class="w-6 h-6 rounded-full bg-slate-100 shrink-0 mt-0.5"></div>
                <div class="flex-1">
                  <div class="h-2.5 bg-slate-100 rounded w-3/4 mb-1.5"></div>
                  <div class="h-2 bg-slate-100 rounded w-1/2"></div>
                </div>
              </div>
            </div>
            <!-- Feed empty -->
            <div *ngIf="!feedLoading && activityFeed.length === 0"
              class="flex flex-col items-center justify-center py-12 text-center">
              <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-2">
                <svg class="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
              <p class="text-slate-400 text-xs">No activity yet</p>
            </div>
            <!-- Feed items -->
            <div *ngIf="!feedLoading" class="space-y-1">
              <div *ngFor="let event of activityFeed" class="flex gap-2.5 py-2 px-1 rounded-lg hover:bg-slate-50 transition-colors">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                  [ngClass]="feedDotClass(event.action)">
                  {{ event.actor?.display_name?.[0] | uppercase }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs text-slate-700 leading-snug">
                    <span class="font-semibold">{{ event.actor?.display_name || 'System' }}</span>
                    {{ feedActionLabel(event.action) }}
                  </p>
                  <p class="text-[10px] text-slate-400 mt-0.5">{{ event.created_at | relativeDate }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="px-3 pb-3 pt-1 border-t border-slate-100">
            <button (click)="refreshFeed()" [disabled]="feedLoading"
              class="w-full text-xs text-slate-400 hover:text-slate-600 py-1.5 rounded-lg hover:bg-slate-50 transition-all font-medium disabled:opacity-50">
              Refresh feed
            </button>
          </div>
        </div>

      </div>
    </div>
    </ng-container>

    <ng-template #loadingTpl>
      <div class="flex items-center justify-center h-64">
        <div class="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    </ng-template>

    <!-- Create Task Modal -->
    <div *ngIf="showTaskCreate" class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md">
        <div class="p-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold text-slate-800">New Team Task</h2>
            <button (click)="showTaskCreate = false" class="text-slate-400 hover:text-slate-600 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <form [formGroup]="taskForm" (ngSubmit)="createTask()">
            <div class="space-y-3">
              <div>
                <label class="text-slate-600 text-xs font-medium mb-1 block">Title *</label>
                <input formControlName="title" type="text" placeholder="Task title" autofocus
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 text-sm transition-all">
              </div>
              <div>
                <label class="text-slate-600 text-xs font-medium mb-1 block">Description</label>
                <textarea formControlName="description" rows="2" placeholder="What needs to be done?"
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary-400 text-sm transition-all resize-none"></textarea>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-slate-600 text-xs font-medium mb-1 block">Priority</label>
                  <select formControlName="priority"
                    class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-primary-400 text-sm bg-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label class="text-slate-600 text-xs font-medium mb-1 block">Assign to</label>
                  <select formControlName="assignee_id"
                    class="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-primary-400 text-sm bg-white">
                    <option value="">Unassigned</option>
                    <option *ngFor="let m of members" [value]="m.user_id">{{ m.user?.display_name }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="text-slate-600 text-xs font-medium mb-1 block">Due Date</label>
                <input formControlName="due_date" type="date"
                  class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-none focus:border-primary-400 text-sm transition-all">
              </div>
              <div class="flex items-center gap-3 pt-1">
                <input formControlName="needsApproval" type="checkbox" id="needsApproval"
                  class="w-4 h-4 rounded border-slate-300 accent-primary-500">
                <label for="needsApproval" class="text-slate-600 text-sm">Requires leader approval before board</label>
              </div>
            </div>
            <div class="flex gap-3 mt-5">
              <button type="button" (click)="showTaskCreate = false"
                class="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancel</button>
              <button type="submit" [disabled]="taskForm.invalid || creatingTask"
                class="flex-1 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
                {{ creatingTask ? 'Creating...' : 'Create Task' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class TeamDetailComponent implements OnInit {
  team: Team | null = null;
  members: TeamMembership[] = [];
  invites: TeamInvite[] = [];
  boardTasks: Task[] = [];
  pendingApprovals: Task[] = [];
  activityFeed: AuditLog[] = [];
  myRole: TeamRole | null = null;
  myId = '';
  activeTab: Tab = 'board';

  boardLoading = true;
  feedLoading = false;
  showTaskCreate = false;
  showActivityFeed = false;
  creatingTask = false;
  generatingLink = false;
  generatedLink = '';
  copied = false;
  sendingInvite = false;
  provisioning = false;
  provisionError = '';

  inviteForm: FormGroup;
  taskForm: FormGroup;
  provisionForm: FormGroup;

  private TEAM_COLORS = [
    'bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-pink-500'
  ];

  get canInvite():        boolean { return canDoTeamAction(this.auth.currentRole!, this.myRole, 'team.invite'); }
  get canManageMembers(): boolean { return canDoTeamAction(this.auth.currentRole!, this.myRole, 'team.manage.members'); }
  get canApprove():       boolean { return canDoTeamAction(this.auth.currentRole!, this.myRole, 'team.approve.tasks'); }
  get canProvision():     boolean { return canDoTeamAction(this.auth.currentRole!, this.myRole, 'team.provision.users'); }

  get availableTabs(): Tab[] {
    const tabs: Tab[] = ['board', 'members'];
    if (this.canInvite)    tabs.push('invites');
    if (this.canApprove)   tabs.push('approvals');
    if (this.canProvision) tabs.push('provision');
    return tabs;
  }

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private teamSvc: TeamService,
    private tasksSvc: TasksDbService,
    public auth: AuthService,
    private toast: ToastService,
    private fb: FormBuilder
  ) {
    this.inviteForm   = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
    this.provisionForm = this.fb.group({
      displayName: ['', Validators.required],
      email:       ['', [Validators.required, Validators.email]],
      password:    ['', [Validators.required, Validators.minLength(8)]]
    });
    this.taskForm = this.fb.group({
      title:         ['', Validators.required],
      description:   [''],
      priority:      ['medium'],
      assignee_id:   [''],
      due_date:      [''],
      needsApproval: [true]
    });
  }

  async ngOnInit(): Promise<void> {
    const teamId = this.route.snapshot.paramMap.get('id')!;
    this.myId = this.auth.currentUser?.id ?? '';
    await this.load(teamId);
  }

  private async load(teamId: string): Promise<void> {
    this.boardLoading = true;
    try {
      [this.team, this.members, this.myRole] = await Promise.all([
        this.teamSvc.getTeam(teamId),
        this.teamSvc.getMembers(teamId),
        this.teamSvc.getMyRoleInTeam(teamId, this.myId)
      ]);
      this.boardTasks = await this.tasksSvc.loadTeamBoardTasks(teamId);
      if (this.canApprove) {
        [this.pendingApprovals, this.invites] = await Promise.all([
          this.tasksSvc.loadTeamPendingApprovals(teamId),
          this.teamSvc.getTeamInvites(teamId)
        ]);
      }
    } catch (e: any) {
      this.toast.error(e.message ?? 'Could not load team');
    } finally {
      this.boardLoading = false;
    }
  }

  // ── Activity feed ───────────────────────────────────────────────────────────

  async refreshFeed(): Promise<void> {
    if (!this.team) return;
    this.feedLoading = true;
    try {
      this.activityFeed = await this.tasksSvc.getTeamActivityFeed(this.team.id);
    } catch { /* silent */ } finally {
      this.feedLoading = false;
    }
  }

  toggleFeed(): void {
    this.showActivityFeed = !this.showActivityFeed;
    if (this.showActivityFeed && this.activityFeed.length === 0) {
      this.refreshFeed();
    }
  }

  feedActionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action.replace('.', ' ');
  }

  feedDotClass(action: string): string {
    if (action.includes('approved')) return 'bg-emerald-500';
    if (action.includes('rejected')) return 'bg-red-500';
    if (action.includes('reassign') || action.includes('assigned')) return 'bg-blue-500';
    if (action.includes('created')) return 'bg-primary-500';
    return 'bg-slate-400';
  }

  // ── Board move (unified handler) ────────────────────────────────────────────

  async onBoardMove(move: BoardMove): Promise<void> {
    const changes: { status?: any; assignee_id?: string | null } = {};
    if (move.toStatus !== undefined)     changes.status      = move.toStatus;
    if (move.toAssigneeId !== undefined) changes.assignee_id = move.toAssigneeId;
    if (!Object.keys(changes).length) return;

    const isMulti = move.tasks.length > 1;
    try {
      if (isMulti) {
        await this.tasksSvc.bulkMoveTeamTasks(move.tasks, changes, this.myId, this.team!.id);
        this.toast.success(`${move.tasks.length} tasks updated`);
      } else {
        await this.tasksSvc.moveTeamBoardTask(move.tasks[0], changes, this.myId, this.team!.id);
      }
      this.boardTasks = await this.tasksSvc.loadTeamBoardTasks(this.team!.id);
      if (this.showActivityFeed) await this.refreshFeed();
    } catch (e: any) {
      this.toast.error(e.message ?? 'Could not update task');
      // Rollback: reload to restore server state
      this.boardTasks = await this.tasksSvc.loadTeamBoardTasks(this.team!.id);
    }
  }

  // ── Activity feed toggle with lazy load ─────────────────────────────────────
  // Template calls this via (click) on activity button
  // We do it inline in template to keep it simple — toggle + lazy load

  // ── Approvals ───────────────────────────────────────────────────────────────

  async approveTask(task: Task): Promise<void> {
    try {
      await this.tasksSvc.approveTeamTask(task.id, this.myId);
      this.pendingApprovals = this.pendingApprovals.filter(t => t.id !== task.id);
      this.boardTasks = await this.tasksSvc.loadTeamBoardTasks(this.team!.id);
      this.toast.success('Task approved and visible on board!');
    } catch (e: any) { this.toast.error(e.message); }
  }

  async rejectTask(task: Task): Promise<void> {
    const note = prompt('Rejection reason (optional):') ?? '';
    try {
      await this.tasksSvc.rejectTeamTask(task.id, this.myId, note);
      this.pendingApprovals = this.pendingApprovals.filter(t => t.id !== task.id);
      this.toast.success('Task rejected');
    } catch (e: any) { this.toast.error(e.message); }
  }

  // ── Members ─────────────────────────────────────────────────────────────────

  async changeRole(m: TeamMembership, newRole: TeamRole): Promise<void> {
    try {
      await this.teamSvc.updateMemberRole(m.team_id, m.user_id, newRole);
      m.team_role = newRole;
      this.toast.success('Role updated');
    } catch (e: any) { this.toast.error(e.message); }
  }

  async removeMember(m: TeamMembership): Promise<void> {
    try {
      await this.teamSvc.removeMember(m.team_id, m.user_id, this.myId);
      this.members = this.members.filter(mb => mb.user_id !== m.user_id);
      this.toast.success('Member removed');
    } catch (e: any) { this.toast.error(e.message); }
  }

  // ── Invites ─────────────────────────────────────────────────────────────────

  async generateLink(): Promise<void> {
    this.generatingLink = true;
    try {
      const inv = await this.teamSvc.createInvite(this.team!.id, this.myId);
      this.generatedLink = this.teamSvc.getInviteUrl(inv.token);
      this.invites = await this.teamSvc.getTeamInvites(this.team!.id);
    } catch (e: any) { this.toast.error(e.message); }
    finally { this.generatingLink = false; }
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.generatedLink).then(() => {
      this.copied = true; setTimeout(() => this.copied = false, 2500);
    });
  }

  async sendEmailInvite(): Promise<void> {
    if (this.inviteForm.invalid) return;
    this.sendingInvite = true;
    try {
      await this.teamSvc.createInvite(this.team!.id, this.myId, this.inviteForm.value.email);
      this.toast.success('Invite sent!');
      this.inviteForm.reset();
      this.invites = await this.teamSvc.getTeamInvites(this.team!.id);
    } catch (e: any) { this.toast.error(e.message); }
    finally { this.sendingInvite = false; }
  }

  async revokeInvite(invite: TeamInvite): Promise<void> {
    await this.teamSvc.revokeInvite(invite.id);
    this.invites = this.invites.filter(i => i.id !== invite.id);
    this.toast.success('Invite revoked');
  }

  // ── Task creation ────────────────────────────────────────────────────────────

  async createTask(): Promise<void> {
    if (this.taskForm.invalid) return;
    this.creatingTask = true;
    try {
      const { title, description, priority, assignee_id, due_date, needsApproval } = this.taskForm.value;
      await this.tasksSvc.createTeamTask({
        title, description: description || '', priority,
        assignee_id: assignee_id || null, due_date: due_date || null,
        team_id: this.team!.id, team_approval_required: needsApproval
      }, this.myId);
      this.toast.success(needsApproval ? 'Task created — awaiting leader approval' : 'Task added to board!');
      this.showTaskCreate = false;
      this.taskForm.reset({ priority: 'medium', needsApproval: true });
      this.boardTasks = await this.tasksSvc.loadTeamBoardTasks(this.team!.id);
      if (this.canApprove) this.pendingApprovals = await this.tasksSvc.loadTeamPendingApprovals(this.team!.id);
    } catch (e: any) { this.toast.error(e.message); }
    finally { this.creatingTask = false; }
  }

  // ── Provision ────────────────────────────────────────────────────────────────

  async provisionMember(): Promise<void> {
    if (this.provisionForm.invalid) return;
    this.provisioning = true; this.provisionError = '';
    try {
      const { displayName, email, password } = this.provisionForm.value;
      const userId = await this.auth.provisionTeamMember(email, password, displayName);
      await new Promise(r => setTimeout(r, 1200));
      await this.teamSvc.addMember(this.team!.id, userId, 'member', this.myId);
      this.members = await this.teamSvc.getMembers(this.team!.id);
      this.toast.success(`${displayName} created and added to team!`);
      this.provisionForm.reset();
    } catch (e: any) { this.provisionError = e.message; }
    finally { this.provisioning = false; }
  }

  // ── Utils ────────────────────────────────────────────────────────────────────

  teamColor(id: string): string {
    return this.TEAM_COLORS[id.charCodeAt(0) % this.TEAM_COLORS.length];
  }

  tabLabel(tab: Tab): string {
    return { board: 'Board', members: 'Members', invites: 'Invites', approvals: 'Approvals', provision: 'Provision' }[tab];
  }

  roleLabel(role: string): string { return TEAM_ROLE_LABELS[role as TeamRole] ?? role; }
  roleClass(role: string): string { return TEAM_ROLE_COLORS[role as TeamRole] ?? 'bg-slate-100 text-slate-600'; }
}
