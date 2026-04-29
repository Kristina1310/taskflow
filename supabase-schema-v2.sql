-- ============================================================
-- TaskFlow v2 Schema Extensions
-- Run these AFTER the base supabase-schema.sql
-- ============================================================

-- 1. Extend tasks table for workflow fields
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deleted_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_status   TEXT NOT NULL DEFAULT 'none'
                                             CHECK (approval_status IN ('none','pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS approval_note     TEXT,
  ADD COLUMN IF NOT EXISTS sla_policy_id     UUID;

-- 2. Task comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view comments" ON public.task_comments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authors can insert comments" ON public.task_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can delete own comments" ON public.task_comments
  FOR DELETE USING (auth.uid() = author_id);

-- 3. Subtasks
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage subtasks" ON public.task_subtasks
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. File attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploader_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  file_size     INTEGER NOT NULL DEFAULT 0,
  mime_type     TEXT NOT NULL DEFAULT 'application/octet-stream',
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view attachments" ON public.task_attachments
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Uploaders can insert attachments" ON public.task_attachments
  FOR INSERT WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "Uploaders can delete own attachments" ON public.task_attachments
  FOR DELETE USING (auth.uid() = uploader_id);

-- 5. Assignment history
CREATE TABLE IF NOT EXISTS public.task_assignment_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id               UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  assigned_by           UUID NOT NULL REFERENCES public.profiles(id),
  assignee_id           UUID REFERENCES public.profiles(id),
  previous_assignee_id  UUID REFERENCES public.profiles(id),
  reason                TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.task_assignment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers+ can view assignment history" ON public.task_assignment_events
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Managers+ can insert assignment events" ON public.task_assignment_events
  FOR INSERT WITH CHECK (auth.uid() = assigned_by);

-- 6. Auto-assignment rules
CREATE TABLE IF NOT EXISTS public.task_automation_rules (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  created_by         UUID NOT NULL REFERENCES public.profiles(id),
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  condition_priority TEXT CHECK (condition_priority IN ('low','medium','high')),
  condition_keyword  TEXT,
  assignee_id        UUID NOT NULL REFERENCES public.profiles(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.task_automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers+ can manage automation rules" ON public.task_automation_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager','admin','super_admin')
    )
  );

-- 7. In-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  entity_type  TEXT NOT NULL DEFAULT 'task',
  entity_id    UUID,
  read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- 8. Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id            UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_assigned      BOOLEAN NOT NULL DEFAULT TRUE,
  task_mentioned     BOOLEAN NOT NULL DEFAULT TRUE,
  task_overdue       BOOLEAN NOT NULL DEFAULT TRUE,
  task_due_soon      BOOLEAN NOT NULL DEFAULT TRUE,
  task_commented     BOOLEAN NOT NULL DEFAULT TRUE,
  sla_breach         BOOLEAN NOT NULL DEFAULT TRUE,
  approval_requested BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  digest_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  digest_frequency   TEXT NOT NULL DEFAULT 'weekly' CHECK (digest_frequency IN ('daily','weekly'))
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- 9. SLA policies
CREATE TABLE IF NOT EXISTS public.sla_policies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  priority       TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
  warning_hours  INTEGER NOT NULL DEFAULT 24,
  critical_hours INTEGER NOT NULL DEFAULT 48,
  created_by     UUID NOT NULL REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage SLA policies" ON public.sla_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin','super_admin')
    )
  );
CREATE POLICY "All authenticated users can view SLA policies" ON public.sla_policies
  FOR SELECT USING (auth.role() = 'authenticated');

-- 10. Member goals
CREATE TABLE IF NOT EXISTS public.member_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  target_count  INTEGER NOT NULL DEFAULT 5,
  current_count INTEGER NOT NULL DEFAULT 0,
  period        TEXT NOT NULL DEFAULT 'weekly' CHECK (period IN ('weekly','monthly')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.member_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own goals" ON public.member_goals
  FOR ALL USING (auth.uid() = user_id);

-- Trigger to auto-create notification preferences on profile creation
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_notif_prefs ON public.profiles;
CREATE TRIGGER on_profile_created_notif_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_notification_preferences();

-- ─────────────────────────────────────────────────────────────────────────────
-- v3: Team Domain Tables
-- Apply via: Supabase SQL Editor or MCP execute_sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  created_by   UUID NOT NULL REFERENCES public.profiles(id),
  member_limit INTEGER NOT NULL DEFAULT 5,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team memberships
CREATE TABLE IF NOT EXISTS public.team_memberships (
  team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_role  TEXT NOT NULL DEFAULT 'member' CHECK (team_role IN ('leader','officer','member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;

-- Team invites
CREATE TABLE IF NOT EXISTS public.team_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  email        TEXT,
  invite_type  TEXT NOT NULL DEFAULT 'link' CHECK (invite_type IN ('link','email')),
  invited_by   UUID NOT NULL REFERENCES public.profiles(id),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Extend tasks with team fields
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS team_id                 UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visible_on_team_board   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS team_approval_required  BOOLEAN NOT NULL DEFAULT false;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_id = _team_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_team_role(_team_id uuid, _user_id uuid, _role text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_id = _team_id AND user_id = _user_id AND team_role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_leader_or_officer(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_memberships
    WHERE team_id = _team_id AND user_id = _user_id AND team_role IN ('leader','officer')
  );
$$;

-- RLS Policies for teams
CREATE POLICY "Members can view their teams" ON public.teams FOR SELECT USING (
  auth.uid() = created_by OR public.is_team_member(id, auth.uid())
);
CREATE POLICY "Leaders can update teams" ON public.teams FOR UPDATE USING (
  public.has_team_role(id, auth.uid(), 'leader')
);
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (
  auth.uid() = created_by
);
CREATE POLICY "Leaders can delete teams" ON public.teams FOR DELETE USING (
  public.has_team_role(id, auth.uid(), 'leader') OR auth.uid() = created_by
);

-- RLS Policies for team_memberships
CREATE POLICY "Team members can view memberships" ON public.team_memberships FOR SELECT USING (
  public.is_team_member(team_id, auth.uid())
);
CREATE POLICY "Leaders can manage memberships" ON public.team_memberships FOR ALL USING (
  public.has_team_role(team_id, auth.uid(), 'leader')
);
CREATE POLICY "Users can join via invite" ON public.team_memberships FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- RLS Policies for team_invites
CREATE POLICY "Leaders and officers can manage invites" ON public.team_invites FOR ALL USING (
  public.is_team_leader_or_officer(team_id, auth.uid())
);
CREATE POLICY "Authenticated users can view invites by token" ON public.team_invites FOR SELECT USING (
  auth.role() = 'authenticated'
);
