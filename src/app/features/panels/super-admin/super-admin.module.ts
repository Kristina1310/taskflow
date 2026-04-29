import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { SuperAdminDashboardComponent } from './super-admin-dashboard.component';
import { AuditLogsComponent } from './audit-logs.component';

const routes: Routes = [
  { path: '',      component: SuperAdminDashboardComponent },
  { path: 'audit', component: AuditLogsComponent }
];

@NgModule({
  declarations: [SuperAdminDashboardComponent, AuditLogsComponent],
  imports: [SharedModule, RouterModule.forChild(routes)]
})
export class SuperAdminModule {}
