import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';

export interface TableColumn<T = unknown> {
  key: string;
  label: string;
  sortable?: boolean;
  template?: TemplateRef<{ $implicit: T }>;
}

@Component({
  selector: 'app-data-table',
  template: `
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-100">
            <tr>
              <th
                *ngFor="let col of columns"
                class="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"
                [class.cursor-pointer]="col.sortable"
                [class.hover:text-slate-800]="col.sortable"
                (click)="col.sortable && sort.emit(col.key)"
              >
                <span class="flex items-center gap-1">
                  {{ col.label }}
                  <svg *ngIf="col.sortable" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
                  </svg>
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr
              *ngFor="let row of rows; trackBy: trackByIndex"
              class="hover:bg-slate-50 transition-colors duration-100"
            >
              <td *ngFor="let col of columns" class="px-4 py-3 text-slate-700">
                <ng-container *ngIf="col.template; else defaultCell">
                  <ng-container *ngTemplateOutlet="col.template; context: { $implicit: row }"></ng-container>
                </ng-container>
                <ng-template #defaultCell>{{ row[col.key] }}</ng-template>
              </td>
            </tr>
            <tr *ngIf="!rows.length">
              <td [attr.colspan]="columns.length" class="px-4 py-12 text-center text-slate-400 text-sm">
                {{ emptyText }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class DataTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() rows: Record<string, unknown>[] = [];
  @Input() emptyText = 'No data available';
  @Output() sort = new EventEmitter<string>();

  trackByIndex(i: number) { return i; }
}
