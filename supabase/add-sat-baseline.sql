create table if not exists sat_baselines (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles(id) on delete cascade,
  course_id             uuid not null references courses(id) on delete cascade,
  reading_writing_score integer check (reading_writing_score between 200 and 800),
  math_score            integer check (math_score between 200 and 800),
  total_score           integer check (total_score between 400 and 1600),
  source                text not null default 'manual',
  created_at            timestamptz default now(),
  unique(user_id, course_id)
);

alter table sat_baselines enable row level security;

create policy "own sat baseline" on sat_baselines for all using (auth.uid() = user_id);

create policy "admins read sat baselines" on sat_baselines for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','org_admin','super_admin'))
);
