import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { Permission, hasPermission } from '../../core/models/permissions';

/**
 * Structural directive: *appCan="'tasks.delete.any'"
 * Renders content only when the current user has the specified permission.
 */
@Directive({ selector: '[appCan]' })
export class CanDirective implements OnInit, OnDestroy {
  @Input('appCan') permission!: Permission;

  private sub?: Subscription;

  constructor(
    private tpl: TemplateRef<unknown>,
    private vc: ViewContainerRef,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.sub = this.auth.role$.subscribe(role => {
      this.vc.clear();
      if (role && hasPermission(role, this.permission)) {
        this.vc.createEmbeddedView(this.tpl);
      }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
