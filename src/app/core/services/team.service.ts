import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { supabase } from '../supabase.client';
import { Team, TeamMembership, TeamInvite, TeamRole } from '../models/database.types';
import { AuditService } from './audit.service';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private _myTeams$ = new BehaviorSubject<(Team & { myRole: TeamRole })[]>([]);
  /** All teams the current user belongs to (leader, officer, or member). Updated by init(). */
  myTeams$ = this._myTeams$.asObservable();

  constructor(private audit: AuditService) {}

  // ─── Bootstrap ─────────────────────────────────────────────────────────────

  /** Call once after user signs in to pre-populate sidebar teams. */
  async init(userId: string): Promise<void> {
    await this.loadMyTeams(userId);
  }

  // ─── Load ──────────────────────────────────────────────────────────────────

  async loadMyTeams(userId: string): Promise<void> {
    // Query both paths: teams the user is a member of AND teams the user created
    // (in case membership insert failed historically)
    const { data, error } = await supabase
      .from('team_memberships')
      .select(`
        team_id, team_role, joined_at,
        team:teams(id, name, description, created_by, member_limit, created_at, updated_at)
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('[TeamService] loadMyTeams error:', error);
      return;
    }

    const teams = (data ?? [])
      .filter((row: any) => row.team != null)
      .map((row: any) => ({
        ...(row.team as Team),
        myRole: row.team_role as TeamRole
      }));

    this._myTeams$.next(teams);
  }

  getSnapshot(): (Team & { myRole: TeamRole })[] {
    return this._myTeams$.getValue();
  }

  async getTeam(teamId: string): Promise<Team> {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        creator:profiles!teams_created_by_fkey(id,display_name,email,avatar_url),
        memberships:team_memberships(
          team_id, user_id, team_role, joined_at,
          user:profiles(id,display_name,email,avatar_url,role)
        )
      `)
      .eq('id', teamId)
      .single();
    if (error) throw error;
    return data as unknown as Team;
  }

  async getMyRoleInTeam(teamId: string, userId: string): Promise<TeamRole | null> {
    // First check local state to avoid extra round-trip
    const cached = this._myTeams$.getValue().find(t => t.id === teamId);
    if (cached) return cached.myRole;

    const { data, error } = await supabase
      .from('team_memberships')
      .select('team_role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return null;
    return (data?.team_role as TeamRole) ?? null;
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async createTeam(name: string, description: string, createdBy: string): Promise<Team> {
    // Insert team
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .insert({ name, description, created_by: createdBy })
      .select()
      .single();
    if (teamErr) throw teamErr;

    // Insert creator as leader; if this fails, roll back the team
    const { error: memberErr } = await supabase.from('team_memberships').insert({
      team_id: team.id,
      user_id: createdBy,
      team_role: 'leader'
    });

    if (memberErr) {
      // Rollback: delete the team (cascades memberships)
      await supabase.from('teams').delete().eq('id', team.id);
      throw new Error(`Failed to set up team membership: ${memberErr.message}`);
    }

    await this.audit.log(createdBy, 'team.created', 'team', team.id, { name });
    // Reload so sidebar/observers are up to date
    await this.loadMyTeams(createdBy);
    return team as Team;
  }

  // ─── Memberships ───────────────────────────────────────────────────────────

  async getMembers(teamId: string): Promise<TeamMembership[]> {
    const { data, error } = await supabase
      .from('team_memberships')
      .select('*, user:profiles(id,display_name,email,avatar_url,role)')
      .eq('team_id', teamId);
    if (error) throw error;
    return (data ?? []) as unknown as TeamMembership[];
  }

  async addMember(teamId: string, userId: string, role: TeamRole = 'member', actorId?: string): Promise<void> {
    const team = await this.getTeam(teamId);
    const members = await this.getMembers(teamId);
    if (members.length >= team.member_limit) {
      throw new Error(`Team is at capacity (${team.member_limit} members)`);
    }
    const { error } = await supabase.from('team_memberships').insert({
      team_id: teamId, user_id: userId, team_role: role
    });
    if (error) throw error;
    await this.audit.log(actorId ?? userId, 'team.member_joined', 'team', teamId, { user_id: userId, role });
  }

  async removeMember(teamId: string, userId: string, actorId: string): Promise<void> {
    const { error } = await supabase
      .from('team_memberships')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);
    if (error) throw error;
    await this.audit.log(actorId, 'team.member_removed', 'team', teamId, { user_id: userId });
  }

  async updateMemberRole(teamId: string, userId: string, newRole: TeamRole): Promise<void> {
    const { error } = await supabase
      .from('team_memberships')
      .update({ team_role: newRole })
      .eq('team_id', teamId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  // ─── Invites ───────────────────────────────────────────────────────────────

  async createInvite(teamId: string, invitedBy: string, email?: string): Promise<TeamInvite> {
    const token = this.generateToken();
    const { data, error } = await supabase
      .from('team_invites')
      .insert({
        team_id: teamId,
        token,
        email: email ?? null,
        invite_type: email ? 'email' : 'link',
        invited_by: invitedBy,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    await this.audit.log(invitedBy, 'team.invited', 'team', teamId, { token, email });
    return data as TeamInvite;
  }

  async getInviteByToken(token: string): Promise<TeamInvite | null> {
    const { data, error } = await supabase
      .from('team_invites')
      .select('*, team:teams(id, name, member_limit, description), inviter:profiles!team_invites_invited_by_fkey(id,display_name,email)')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) return null;
    return data as unknown as TeamInvite | null;
  }

  async acceptInvite(token: string, userId: string): Promise<void> {
    const invite = await this.getInviteByToken(token);
    if (!invite) throw new Error('Invite not found or has expired');
    await this.addMember(invite.team_id, userId, 'member', userId);
    await supabase
      .from('team_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', token);
    await this.loadMyTeams(userId);
  }

  async getTeamInvites(teamId: string): Promise<TeamInvite[]> {
    const { data, error } = await supabase
      .from('team_invites')
      .select('*, inviter:profiles!team_invites_invited_by_fkey(id,display_name,email)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as TeamInvite[];
  }

  async revokeInvite(inviteId: string): Promise<void> {
    const { error } = await supabase.from('team_invites').delete().eq('id', inviteId);
    if (error) throw error;
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async getAllTeams(): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*, creator:profiles!teams_created_by_fkey(id,display_name,email)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Team[];
  }

  async deleteTeam(teamId: string): Promise<void> {
    const { error } = await supabase.from('teams').delete().eq('id', teamId);
    if (error) throw error;
  }

  // ─── Utility ───────────────────────────────────────────────────────────────

  private generateToken(): string {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  getInviteUrl(token: string): string {
    return `${window.location.origin}/teams/join/${token}`;
  }
}
