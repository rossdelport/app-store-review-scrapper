-- Security hardening flagged by the Supabase linter.

-- Pin search_path on the trigger function.
alter function public.set_updated_at() set search_path = '';

-- owns_project doesn't need SECURITY DEFINER: it's only referenced by child-table
-- RLS policies, and querying public.projects under the caller's own RLS yields
-- exactly the right answer (true iff the project exists AND belongs to the user).
-- Switching to SECURITY INVOKER removes the privilege-escalation surface.
create or replace function public.owns_project(p uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select exists (select 1 from public.projects where id = p and user_id = auth.uid());
$$;
