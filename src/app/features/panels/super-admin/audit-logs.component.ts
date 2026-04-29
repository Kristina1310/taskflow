import { Component, OnInit } from '@angular/core';
import { AuditService } from '../../../core/services/audit.service';
import { AuditLog } from '../../../core/models/database.types';

@Component({
  selector: 'app-audit-logs',
  template: `
    <div class="max-w-6xl mx-auto animate-slide-up">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Audit Logs</h1>
          <p class="text-slate-500 text-sm mt-0.5">Complete history of system actions</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="exportCsv()" class="btn btn-secondary btn-sm text-sm gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Export CSV
          </button>
          <button class="btn btn-secondary btn-sm" (click)="reload()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="card p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label class="label text-xs">Filter by Action</label>
          <select [(ngModel)]="filterAction" class="input text-sm py-1.5">
            <option value="">All Actions</option>
            <option value="auth">Auth Events</option>
            <option value="user">User Events</option>
            <option value="task">Task Events</option>
            <option value="comment">Comment Events</option>
            <option value="sla">SLA Events</option>
          </select>
        </div>
        <div>
          <label class="label text-xs">Date From</label>
          <input [(ngModel)]="filterFrom" type="date" class="input text-sm py-1.5"/>
        </div>
        <div>
          <label class="label text-xs">Date To</label>
          <input [(ngModel)]="filterTo" type="date" class="input text-sm py-1.5"/>
        </div>
        <div class="flex-1 min-w-[180px]">
          <label class="label text-xs">Search Actor/Entity</label>
          <input [(ngModel)]="filterSearch" type="text" class="input text-sm py-1.5" placeholder="Search..."/>
        </div>
        <button (click)="clearFilters()" class="btn btn-secondary btn-sm text-sm self-end">Clear</button>
      </div>

      <!-- Summary -->
      <div class="flex items-center gap-3 mb-3 text-xs text-slate-500">
        <span>{{ filteredLogs.length }} of {{ allLogs.length }} records</span>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-100">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actor</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr *ngFor="let log of pagedLogs" class="hover:bg-slate-50 transition-colors animate-fade-in">
                <td class="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                  {{ log.created_at | date:'MMM d, HH:mm' }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0">
                      {{ log.actor?.display_name?.charAt(0) ?? '?' }}
                    </div>
                    <span class="text-slate-700 text-xs">{{ log.actor?.display_name ?? log.actor_id }}</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <span class="badge text-xs" [class]="actionClass(log.action)">{{ log.action }}</span>
                </td>
                <td class="px-4 py-3 text-xs text-slate-500">
                  <span class="font-medium text-slate-700">{{ log.entity_type }}</span>
                  <span class="ml-1 text-slate-400 font-mono">{{ log.entity_id | truncate:8 }}</span>
                </td>
                <td class="px-4 py-3 text-xs text-slate-400 font-mono max-w-xs truncate" [title]="log.metadata | json">
                  {{ log.metadata | json | truncate:60 }}
                </td>
              </tr>
              <tr *ngIf="!filteredLogs.length">
                <td colspan="5" class="px-4 py-12 text-center text-slate-400 text-sm">No audit logs found.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div *ngIf="totalPages > 1" class="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs text-slate-400">Page {{ currentPage }} of {{ totalPages }}</span>
          <div class="flex gap-2">
            <button (click)="prevPage()" [disabled]="currentPage === 1" class="btn btn-secondary btn-sm text-xs">← Prev</button>
            <button (click)="nextPage()" [disabled]="currentPage >= totalPages" class="btn btn-secondary btn-sm text-xs">Next →</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AuditLogsComponent implements OnInit {
  allLogs: AuditLog[] = [];
  filterAction = '';
  filterFrom = '';
  filterTo = '';
  filterSearch = '';
  currentPage = 1;
  pageSize = 25;

  constructor(private audit: AuditService) {}

  ngOnInit(): void {
    this.audit.logs$.subscribe(logs => { this.allLogs = logs; this.currentPage = 1; });
    this.audit.loadAll();
  }

  reload(): void { this.audit.loadAll(); }

  get filteredLogs(): AuditLog[] {
    return this.allLogs.filter(log => {
      if (this.filterAction && !log.action.startsWith(this.filterAction)) return false;
      if (this.filterSearch) {
        const q = this.filterSearch.toLowerCase();
        const actor = (log.actor?.display_name || log.actor_id || '').toLowerCase();
        const entity = (log.entity_id || '').toLowerCase();
        if (!actor.includes(q) && !entity.includes(q)) return false;
      }
      if (this.filterFrom && log.created_at < this.filterFrom) return false;
      if (this.filterTo && log.created_at > this.filterTo + 'T23:59:59') return false;
      return true;
    });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredLogs.length / this.pageSize);
  }

  get pagedLogs(): AuditLog[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLogs.slice(start, start + this.pageSize);
  }

  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }

  clearFilters(): void {
    this.filterAction = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.filterSearch = '';
    this.currentPage = 1;
  }

  exportCsv(): void {
    const rows = [
      ['Time', 'Actor', 'Action', 'Entity Type', 'Entity ID', 'Details'],
      ...this.filteredLogs.map(l => [
        l.created_at,
        l.actor?.display_name || l.actor_id,
        l.action,
        l.entity_type,
        l.entity_id,
        JSON.stringify(l.metadata)
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  actionClass(action: string): string {
    if (action.startsWith('auth.'))     return 'bg-blue-50 text-blue-700';
    if (action.startsWith('user.'))     return 'bg-purple-50 text-purple-700';
    if (action.includes('deleted') || action.includes('breach')) return 'bg-red-50 text-red-700';
    if (action.includes('created'))     return 'bg-emerald-50 text-emerald-700';
    if (action.includes('approved'))    return 'bg-emerald-50 text-emerald-700';
    if (action.includes('assigned'))    return 'bg-amber-50 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  }
}
