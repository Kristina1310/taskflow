import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { MemberDashboardComponent } from './member-dashboard.component';

const routes: Routes = [{ path: '', component: MemberDashboardComponent }];

@NgModule({
  declarations: [MemberDashboardComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class MemberModule {}
