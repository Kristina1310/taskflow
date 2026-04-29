import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase.client';
import { AuditLog, AuditAction } from '../models/database.types';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private logsSubject = new BehaviorSubject<AuditLog[]>([]);
  logs$ = this.logsSubject.asObservable();

  async log(
    actorId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        actor_id: actorId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata
      });
    } catch {
      // Audit logging must never throw and break the primary flow
    }
  }

  async loadAll(limit = 100): Promise<void> {
    const { data } = await supabase
      .from('audit_logs')
      .select('*, actor:profiles(id, display_name, role, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (data) this.logsSubject.next(data as AuditLog[]);
  }
}
