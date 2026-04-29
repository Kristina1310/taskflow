import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { TaskService } from '../../../core/services/task.service';

@Injectable({ providedIn: 'root' })
export class TaskExistsGuard implements CanActivate {
  constructor(private taskService: TaskService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const id = route.paramMap.get('id');
    if (id && this.taskService.getById(id)) {
      return true;
    }
    this.router.navigate(['/tasks']);
    return false;
  }
}
