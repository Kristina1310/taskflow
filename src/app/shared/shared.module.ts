import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { ButtonComponent } from './components/button/button.component';
import { ModalComponent } from './components/modal/modal.component';
import { TruncatePipe } from './pipes/truncate.pipe';
import { RelativeDatePipe } from './pipes/relative-date.pipe';
import { PriorityBadgeComponent } from './components/priority-badge/priority-badge.component';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { SkeletonComponent } from './components/skeleton/skeleton.component';
import { ToastContainerComponent } from './components/toast/toast.component';
import { DataTableComponent } from './components/data-table/data-table.component';
import { CanDirective } from './directives/can.directive';
import { RoleBadgeComponent } from './components/role-badge/role-badge.component';
import { NotificationBellComponent } from './components/notification-bell/notification-bell.component';
import { KanbanBoardComponent } from './components/kanban-board/kanban-board.component';

const DECLARATIONS = [
  ButtonComponent,
  ModalComponent,
  TruncatePipe,
  RelativeDatePipe,
  PriorityBadgeComponent,
  StatCardComponent,
  SkeletonComponent,
  ToastContainerComponent,
  DataTableComponent,
  CanDirective,
  RoleBadgeComponent,
  NotificationBellComponent,
  KanbanBoardComponent
];

@NgModule({
  declarations: DECLARATIONS,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  exports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    ...DECLARATIONS
  ]
})
export class SharedModule {}
