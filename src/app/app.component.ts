import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { TeamService } from './core/services/team.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  loading$    = this.auth.loading$;
  isLoggedIn$ = this.auth.isLoggedIn$;

  constructor(
    private auth: AuthService,
    private teamSvc: TeamService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // When auth state becomes logged-in, pre-load teams for sidebar
    this.auth.user$.subscribe(user => {
      if (user?.id) {
        this.teamSvc.init(user.id);
      }
    });
  }

  isAuthRoute(): boolean {
    return this.router.url.startsWith('/auth');
  }
}
