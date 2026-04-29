import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { UnauthorizedComponent } from './core/components/unauthorized.component';

const routes: Routes = [
  { path: '', redirectTo: 'panels/member', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },

  {
    path: 'tasks',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/tasks/tasks.module').then(m => m.TasksModule)
  },

  {
    path: 'users',
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRole: 'admin' },
    loadChildren: () => import('./features/users/users.module').then(m => m.UsersModule)
  },

  {
    path: 'teams',
    canActivate: [AuthGuard],
    loadChildren: () => import('./features/teams/teams.module').then(m => m.TeamsModule)
  },

  {
    path: 'panels',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'super-admin',
        canActivate: [RoleGuard],
        data: { requiredRole: 'super_admin' },
        loadChildren: () => import('./features/panels/super-admin/super-admin.module').then(m => m.SuperAdminModule)
      },
      {
        path: 'admin',
        canActivate: [RoleGuard],
        data: { requiredRole: 'admin' },
        loadChildren: () => import('./features/panels/admin/admin.module').then(m => m.AdminModule)
      },
      {
        path: 'manager',
        canActivate: [RoleGuard],
        data: { requiredRole: 'manager' },
        loadChildren: () => import('./features/panels/manager/manager.module').then(m => m.ManagerModule)
      },
      {
        path: 'member',
        loadChildren: () => import('./features/panels/member/member.module').then(m => m.MemberModule)
      }
    ]
  },

  { path: 'unauthorized', component: UnauthorizedComponent },
  { path: '**', redirectTo: 'panels/member' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
