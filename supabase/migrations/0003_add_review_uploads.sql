-- Track each review upload as a deletable batch (filename + count), so the UI
-- can list uploaded files and let users remove one (e.g. an accidental
-- double-upload). Reviews link to their upload via reviews.upload_id; deleting
-- the upload cascades to its reviews.

create table if not exists public.review_uploads (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  filename      text not null,
  review_count  int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists review_uploads_project_id_idx on public.review_uploads(project_id, created_at desc);

alter table public.reviews
  add column if not exists upload_id uuid references public.review_uploads(id) on delete cascade;
create index if not exists reviews_upload_id_idx on public.reviews(upload_id);

alter table public.review_uploads enable row level security;
drop policy if exists "review_uploads_all_own" on public.review_uploads;
create policy "review_uploads_all_own" on public.review_uploads
  for all using (public.owns_project(project_id)) with check (public.owns_project(project_id));
