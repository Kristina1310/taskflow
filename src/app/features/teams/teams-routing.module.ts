import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TeamListComponent } from './pages/team-list/team-list.component';
import { TeamDetailComponent } from './pages/team-detail/team-detail.component';
import { TeamJoinComponent } from './pages/team-join/team-join.component';

const routes: Routes = [
  { path: '',          component: TeamListComponent },
  { path: 'join/:token', component: TeamJoinComponent },
  { path: ':id',       component: TeamDetailComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TeamsRoutingModule {}
