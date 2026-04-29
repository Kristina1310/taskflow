import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { TasksRoutingModule } from './tasks-routing.module';
import { TaskListComponent } from './pages/task-list/task-list.component';
import { TaskDetailComponent } from './pages/task-detail/task-detail.component';
import { TaskCommentsComponent } from './components/comments/task-comments.component';
import { TaskSubtasksComponent } from './components/subtasks/task-subtasks.component';
import { TaskAttachmentsComponent } from './components/attachments/task-attachments.component';
import { TaskTimelineComponent } from './components/task-timeline/task-timeline.component';

@NgModule({
  declarations: [
    TaskListComponent,
    TaskDetailComponent,
    TaskCommentsComponent,
    TaskSubtasksComponent,
    TaskAttachmentsComponent,
    TaskTimelineComponent
  ],
  imports: [SharedModule, TasksRoutingModule]
})
export class TasksModule {}
