import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { ManagerDashboardComponent } from './manager-dashboard.component';

const routes: Routes = [{ path: '', component: ManagerDashboardComponent }];

@NgModule({
  declarations: [ManagerDashboardComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class ManagerModule {}
