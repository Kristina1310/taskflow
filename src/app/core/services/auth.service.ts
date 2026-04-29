import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase.client';
import { Profile, AppRole } from '../models/database.types';
import { ToastService } from './toast.service';

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private stateSubject = new BehaviorSubject<AuthState>({
    session: null, user: null, profile: null, loading: true
  });

  state$       = this.stateSubject.asObservable();
  session$     = this.state$.pipe(map(s => s.session));
  user$        = this.state$.pipe(map(s => s.user));
  profile$     = this.state$.pipe(map(s => s.profile));
  loading$     = this.state$.pipe(map(s => s.loading));
  isLoggedIn$  = this.state$.pipe(map(s => !!s.session));
  role$        = this.state$.pipe(map(s => s.profile?.role ?? null));

  get currentRole(): AppRole | null { return this.stateSubject.value.profile?.role ?? null; }
  get currentProfile(): Profile | null { return this.stateSubject.value.profile; }
  get currentUser(): User | null { return this.stateSubject.value.user; }
  get isLoggedIn(): boolean { return !!this.stateSubject.value.session; }

  constructor(private router: Router, private toast: ToastService) {
    this.init();
  }

  private async init(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const profile = await this.loadProfile(session.user.id);
      this.stateSubject.next({ session, user: session.user, profile, loading: false });
    } else {
      this.stateSubject.next({ session: null, user: null, profile: null, loading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const profile = await this.loadProfile(session.user.id);
        this.stateSubject.next({ session, user: session.user, profile, loading: false });
      } else if (event === 'SIGNED_OUT') {
        this.stateSubject.next({ session: null, user: null, profile: null, loading: false });
        this.router.navigate(['/auth/login']);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        const current = this.stateSubject.value;
        this.stateSubject.next({ ...current, session, user: session.user });
      }
    });
  }

  private async loadProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) { console.error('Profile load error', error); return null; }
    return data as Profile;
  }

  private mapAuthError(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');

    // Supabase SDK/network layer sometimes surfaces this generic browser fetch error.
    if (message.toLowerCase().includes('failed to fetch')) {
      return new Error(
        'Network error talking to Supabase. Check environment URL/anon key, internet access, and Supabase project status.'
      );
    }
    return error instanceof Error ? error : new Error(message);
  }

  async signUp(email: string, password: string, displayName: string): Promise<void> {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/auth/login`
        }
      });
      if (error) throw error;
      // Profile row is created by DB trigger handle_new_user().
    } catch (error: unknown) {
      throw this.mapAuthError(error);
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: unknown) {
      throw this.mapAuthError(error);
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: unknown) {
      throw this.mapAuthError(error);
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      if (error) throw error;
    } catch (error: unknown) {
      throw this.mapAuthError(error);
    }
  }

  async refreshProfile(): Promise<void> {
    const userId = this.currentUser?.id;
    if (!userId) return;
    const profile = await this.loadProfile(userId);
    const current = this.stateSubject.value;
    this.stateSubject.next({ ...current, profile });
  }

  /**
   * Allows a Team Leader to provision a new user account and add them to a team.
   * Creates the auth user and profile; the DB trigger handles profile insertion.
   */
  async provisionTeamMember(email: string, password: string, displayName: string): Promise<string> {
    try {
      // Use admin sign-up without email confirmation required (password-based creation)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: undefined
        }
      });
      if (error) throw error;
      if (!data.user) throw new Error('User creation failed');
      return data.user.id;
    } catch (error: unknown) {
      throw this.mapAuthError(error);
    }
  }

  getRoleDashboardRoute(): string {
    const role = this.currentRole;
    if (!role) return '/auth/login';
    const routes: Record<string, string> = {
      super_admin: '/panels/super-admin',
      admin:       '/panels/admin',
      manager:     '/panels/manager',
      member:      '/panels/member'
    };
    return routes[role] ?? '/panels/member';
  }
}
