import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase.client';
import { Profile, AppRole } from '../models/database.types';
import { AuditService } from './audit.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private usersSubject = new BehaviorSubject<Profile[]>([]);
  users$ = this.usersSubject.asObservable();

  constructor(private audit: AuditService) {}

  async loadAll(): Promise<void> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) this.usersSubject.next(data as Profile[]);
  }

  async getById(id: string): Promise<Profile | null> {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    return data as Profile | null;
  }

  async updateRole(targetId: string, newRole: AppRole, actorId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetId);
    if (error) throw error;
    await this.audit.log(actorId, 'user.role_changed', 'profile', targetId, { new_role: newRole });
    await this.loadAll();
  }

  async updateStatus(targetId: string, status: 'active' | 'suspended', actorId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', targetId);
    if (error) throw error;
    await this.audit.log(actorId, 'user.suspended', 'profile', targetId, { status });
    await this.loadAll();
  }

  async updateProfile(id: string, changes: Partial<Pick<Profile, 'display_name' | 'avatar_url'>>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }
}
