import { NgModule } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SharedModule } from '../../shared/shared.module';
import { TeamsRoutingModule } from './teams-routing.module';
import { TeamListComponent } from './pages/team-list/team-list.component';
import { TeamDetailComponent } from './pages/team-detail/team-detail.component';
import { TeamJoinComponent } from './pages/team-join/team-join.component';
import { TeamBoardComponent } from './components/team-board/team-board.component';

@NgModule({
  declarations: [
    TeamListComponent,
    TeamDetailComponent,
    TeamJoinComponent,
    TeamBoardComponent
  ],
  imports: [SharedModule, TeamsRoutingModule, DragDropModule]
})
export class TeamsModule {}
