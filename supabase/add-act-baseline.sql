create table if not exists act_baselines (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  course_id       uuid not null references courses(id) on delete cascade,
  english_score   integer check (english_score between 1 and 36),
  math_score      integer check (math_score between 1 and 36),
  reading_score   integer check (reading_score between 1 and 36),
  science_score   integer check (science_score between 1 and 36),
  composite_score integer check (composite_score between 1 and 36),
  source          text not null default 'manual',
  created_at      timestamptz default now(),
  unique(user_id, course_id)
);

alter table act_baselines enable row level security;

create policy "own baseline" on act_baselines for all using (auth.uid() = user_id);

create policy "admins read baselines" on act_baselines for select using (
  exists (select 1 from profiles where id = auth.uid() and role in ('admin','org_admin','super_admin'))
);
