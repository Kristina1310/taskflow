import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase.client';
import { SlaPolicy, Task } from '../models/database.types';

export interface SlaStatus {
  taskId: string;
  title: string;
  status: 'ok' | 'warning' | 'breached';
  hoursRemaining: number | null;
  dueDate: string | null;
}

@Injectable({ providedIn: 'root' })
export class SlaService {
  private policiesSubject = new BehaviorSubject<SlaPolicy[]>([]);
  policies$ = this.policiesSubject.asObservable();

  async loadPolicies(): Promise<void> {
    const { data } = await supabase
      .from('sla_policies')
      .select('*')
      .order('priority');
    this.policiesSubject.next((data as SlaPolicy[]) || []);
  }

  async createPolicy(policy: Omit<SlaPolicy, 'id' | 'created_at'>, actorId: string): Promise<void> {
    const { error } = await supabase.from('sla_policies').insert({ ...policy, created_by: actorId });
    if (error) throw error;
    await this.loadPolicies();
  }

  async updatePolicy(id: string, changes: Partial<SlaPolicy>): Promise<void> {
    const { error } = await supabase.from('sla_policies').update(changes).eq('id', id);
    if (error) throw error;
    await this.loadPolicies();
  }

  async deletePolicy(id: string): Promise<void> {
    const { error } = await supabase.from('sla_policies').delete().eq('id', id);
    if (error) throw error;
    await this.loadPolicies();
  }

  evaluateTasks(tasks: Task[]): SlaStatus[] {
    const policies = this.policiesSubject.value;
    const now = new Date();
    const results: SlaStatus[] = [];

    for (const task of tasks) {
      if (task.status === 'done' || task.status === 'cancelled' || task.deleted_at) continue;
      if (!task.due_date) continue;

      const due = new Date(task.due_date);
      const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

      const policy = policies.find(p => p.priority === task.priority);
      let status: 'ok' | 'warning' | 'breached' = 'ok';

      if (hoursRemaining < 0) {
        status = 'breached';
      } else if (policy) {
        if (hoursRemaining <= policy.warning_hours) {
          status = 'warning';
        }
        if (hoursRemaining <= 0 || hoursRemaining >= policy.critical_hours * -1) {
          status = hoursRemaining < 0 ? 'breached' : status;
        }
      }

      results.push({
        taskId: task.id,
        title: task.title,
        status,
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        dueDate: task.due_date
      });
    }

    return results;
  }
}
