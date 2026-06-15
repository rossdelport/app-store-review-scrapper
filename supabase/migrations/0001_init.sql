-- Review Scout SaaS schema.
-- A "project" is one research unit: a target app + competitor apps, all their
-- reviews, the combined Claude analysis (Love / Want Added / Don't Need), and
-- the generated iOS build-spec prompt. Everything is scoped to the owning user
-- via Row Level Security.

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  niche       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_updated_at_idx on public.projects(updated_at desc);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- project_apps: the selected target + competitor apps
-- ---------------------------------------------------------------------------
create table if not exists public.project_apps (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  store         text not null check (store in ('appstore','googleplay')),
  app_id        text not null,
  title         text not null,
  developer     text,
  icon          text,
  url           text,
  score         numeric,
  rating_count  bigint,
  is_target     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (project_id, store, app_id)
);
create index if not exists project_apps_project_id_idx on public.project_apps(project_id);

-- ---------------------------------------------------------------------------
-- reviews: all reviews pulled (scrape) or uploaded (csv/xlsx) for a project
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  store       text,
  app_id      text,
  app_title   text,
  country     text,
  rating      numeric,
  text        text not null,
  source      text,  -- 'scrape' | 'upload'
  created_at  timestamptz not null default now()
);
create index if not exists reviews_project_id_idx on public.reviews(project_id);

-- ---------------------------------------------------------------------------
-- analyses: the Claude clustering result (latest row = current). jsonb matches
-- the AnalysisResult shape (love / wantAdded / dontNeed arrays of insights).
-- ---------------------------------------------------------------------------
create table if not exists public.analyses (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  result          jsonb not null,
  review_count    int,
  analyzed_count  int,
  model           text,
  created_at      timestamptz not null default now()
);
create index if not exists analyses_project_id_idx on public.analyses(project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- prompts: the generated iOS MVP build specification (markdown)
-- ---------------------------------------------------------------------------
create table if not exists public.prompts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists prompts_project_id_idx on public.prompts(project_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.projects     enable row level security;
alter table public.project_apps enable row level security;
alter table public.reviews      enable row level security;
alter table public.analyses     enable row level security;
alter table public.prompts      enable row level security;

-- projects: owner-only
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select using (user_id = auth.uid());
drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check (user_id = auth.uid());
drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete using (user_id = auth.uid());

-- child tables: access allowed when the parent project belongs to the user.
-- Helper avoids repeating the subquery and keeps policies readable.
create or replace function public.owns_project(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects where id = p and user_id = auth.uid());
$$;

drop policy if exists "project_apps_all_own" on public.project_apps;
create policy "project_apps_all_own" on public.project_apps
  for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));

drop policy if exists "reviews_all_own" on public.reviews;
create policy "reviews_all_own" on public.reviews
  for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));

drop policy if exists "analyses_all_own" on public.analyses;
create policy "analyses_all_own" on public.analyses
  for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));

drop policy if exists "prompts_all_own" on public.prompts;
create policy "prompts_all_own" on public.prompts
  for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
