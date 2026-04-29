-- ============================================================
-- TaskFlow Enterprise — Supabase Schema
-- Run this in your Supabase SQL Editor to bootstrap the DB
-- ============================================================

-- profiles (extended from auth.users)
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  display_name text NOT NULL,
  role         text NOT NULL DEFAULT 'member'
               CHECK (role IN ('super_admin','admin','manager','member')),
  status       text NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','suspended','pending')),
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- tasks
CREATE TABLE public.tasks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  status       text NOT NULL DEFAULT 'todo'
               CHECK (status IN ('todo','in_progress','done','cancelled')),
  priority     text NOT NULL DEFAULT 'medium'
               CHECK (priority IN ('low','medium','high')),
  owner_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assignee_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- audit_logs
CREATE TABLE public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action       text NOT NULL,
  entity_type  text NOT NULL,
  entity_id    text NOT NULL,
  metadata     jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read; only self can update own non-role fields
CREATE POLICY "profiles_read_all"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Admins can update any profile (role assignment via service-role key or RPC)
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

-- Tasks: owners and assignees can read; admins/managers see all
CREATE POLICY "tasks_read" ON public.tasks FOR SELECT
  USING (
    owner_id = auth.uid() OR
    assignee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','manager'))
  );

CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    assignee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin','manager'))
  );

CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE
  USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

-- Audit logs: only admins/super_admins can read; insert is server-side
CREATE POLICY "audit_read" ON public.audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin')));

CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT
  WITH CHECK (actor_id = auth.uid());
