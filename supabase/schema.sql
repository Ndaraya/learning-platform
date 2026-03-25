-- ============================================================
-- LearnPath — Full Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('student', 'admin', 'org_admin', 'super_admin');
create type task_type as enum ('quiz', 'written');
create type question_type as enum ('mcq', 'written');
create type subscription_tier as enum ('free', 'pro', 'enterprise');


-- ============================================================
-- TABLES
-- ============================================================

-- Organizations (companies, schools, government agencies)
create table organizations (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  type              text not null default 'company',   -- company | school | government
  subscription_tier subscription_tier not null default 'free',
  stripe_customer_id text,
  created_at        timestamptz not null default now()
);

-- User profiles (mirrors auth.users, extended with role + org)
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  role         user_role not null default 'student',
  org_id       uuid references organizations(id) on delete set null,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Courses
create table courses (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text,
  thumbnail_url text,
  published     boolean not null default false,
  created_by    uuid not null references profiles(id) on delete restrict,
  created_at    timestamptz not null default now()
);

-- Modules (ordered sections within a course)
create table modules (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid not null references courses(id) on delete cascade,
  title       text not null,
  description text,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Lessons (ordered items within a module)
create table lessons (
  id          uuid primary key default uuid_generate_v4(),
  module_id   uuid not null references modules(id) on delete cascade,
  title       text not null,
  description text,
  youtube_url text not null,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Tasks (quiz or written, attached to a lesson)
create table tasks (
  id           uuid primary key default uuid_generate_v4(),
  lesson_id    uuid not null references lessons(id) on delete cascade,
  title        text not null,
  type         task_type not null,
  instructions text,
  "order"      integer not null default 0,
  created_at   timestamptz not null default now()
);

-- Questions (MCQ or written, attached to a task)
create table questions (
  id              uuid primary key default uuid_generate_v4(),
  task_id         uuid not null references tasks(id) on delete cascade,
  prompt          text not null,
  type            question_type not null,
  options         jsonb,          -- ["Option A", "Option B", ...]  (MCQ only)
  correct_answer  text,           -- exact string match             (MCQ only)
  points          integer not null default 10,
  grading_rubric  text,           -- plain-English rubric for Claude (written only)
  created_at      timestamptz not null default now()
);

-- Enrollments (student ↔ course, optionally via an org)
create table enrollments (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  course_id    uuid not null references courses(id) on delete cascade,
  org_id       uuid references organizations(id) on delete set null,
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

-- Lesson progress per student
create table lesson_progress (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references profiles(id) on delete cascade,
  lesson_id    uuid not null references lessons(id) on delete cascade,
  completed    boolean not null default false,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);

-- Task submissions (one per student per task attempt)
create table task_submissions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references profiles(id) on delete cascade,
  task_id    uuid not null references tasks(id) on delete cascade,
  score      integer,            -- 0–100 percent, set after grading
  max_score  integer not null default 100,
  feedback   text,
  graded_at  timestamptz,
  created_at timestamptz not null default now()
);

-- Individual question responses (one per question per submission)
create table question_responses (
  id            uuid primary key default uuid_generate_v4(),
  submission_id uuid not null references task_submissions(id) on delete cascade,
  question_id   uuid not null references questions(id) on delete cascade,
  answer        text not null,
  score         integer,
  max_score     integer not null default 10,
  feedback      text,
  ai_graded     boolean not null default false,
  created_at    timestamptz not null default now()
);


-- ============================================================
-- INDEXES
-- ============================================================
create index on profiles (org_id);
create index on profiles (role);
create index on courses (published);
create index on modules (course_id, "order");
create index on lessons (module_id, "order");
create index on tasks (lesson_id, "order");
create index on questions (task_id);
create index on enrollments (user_id);
create index on enrollments (course_id);
create index on enrollments (org_id);
create index on lesson_progress (user_id);
create index on task_submissions (user_id);
create index on task_submissions (task_id);
create index on question_responses (submission_id);


-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'display_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table organizations      enable row level security;
alter table profiles           enable row level security;
alter table courses            enable row level security;
alter table modules            enable row level security;
alter table lessons            enable row level security;
alter table tasks              enable row level security;
alter table questions          enable row level security;
alter table enrollments        enable row level security;
alter table lesson_progress    enable row level security;
alter table task_submissions   enable row level security;
alter table question_responses enable row level security;


-- Helper: get the current user's role
create or replace function public.current_user_role()
returns user_role
language sql stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: get the current user's org_id
create or replace function public.current_user_org()
returns uuid
language sql stable
security definer set search_path = ''
as $$
  select org_id from public.profiles where id = auth.uid();
$$;


-- ── organizations ────────────────────────────────────────────
-- super_admin: full access
-- admin + org_admin + student: read own org
create policy "super_admin full access" on organizations
  for all using (public.current_user_role() = 'super_admin');

create policy "org members read own org" on organizations
  for select using (id = public.current_user_org());


-- ── profiles ─────────────────────────────────────────────────
-- Users can read and update their own profile
create policy "users read own profile" on profiles
  for select using (id = auth.uid());

create policy "users update own profile" on profiles
  for update using (id = auth.uid());

-- Admin + super_admin can read all profiles
create policy "admin read all profiles" on profiles
  for select using (public.current_user_role() in ('admin', 'super_admin'));

-- Org admin can read profiles in their org
create policy "org_admin read org profiles" on profiles
  for select using (
    public.current_user_role() = 'org_admin'
    and org_id = public.current_user_org()
  );

-- Super admin can update any profile (e.g. change roles)
create policy "super_admin update all profiles" on profiles
  for update using (public.current_user_role() = 'super_admin');

-- Allow trigger to insert new profile on signup
create policy "service insert profiles" on profiles
  for insert with check (id = auth.uid());


-- ── courses ──────────────────────────────────────────────────
-- Enrolled students can read published courses
create policy "enrolled students read courses" on courses
  for select using (
    published = true
    and exists (
      select 1 from enrollments
      where enrollments.course_id = courses.id
        and enrollments.user_id = auth.uid()
    )
  );

-- Admin / super_admin full access
create policy "admin full access courses" on courses
  for all using (public.current_user_role() in ('admin', 'super_admin'));


-- ── modules ──────────────────────────────────────────────────
create policy "enrolled students read modules" on modules
  for select using (
    exists (
      select 1 from courses
      join enrollments on enrollments.course_id = courses.id
      where courses.id = modules.course_id
        and courses.published = true
        and enrollments.user_id = auth.uid()
    )
  );

create policy "admin full access modules" on modules
  for all using (public.current_user_role() in ('admin', 'super_admin'));


-- ── lessons ──────────────────────────────────────────────────
create policy "enrolled students read lessons" on lessons
  for select using (
    exists (
      select 1 from modules
      join courses on courses.id = modules.course_id
      join enrollments on enrollments.course_id = courses.id
      where modules.id = lessons.module_id
        and courses.published = true
        and enrollments.user_id = auth.uid()
    )
  );

create policy "admin full access lessons" on lessons
  for all using (public.current_user_role() in ('admin', 'super_admin'));


-- ── tasks ────────────────────────────────────────────────────
create policy "enrolled students read tasks" on tasks
  for select using (
    exists (
      select 1 from lessons
      join modules on modules.id = lessons.module_id
      join courses on courses.id = modules.course_id
      join enrollments on enrollments.course_id = courses.id
      where lessons.id = tasks.lesson_id
        and courses.published = true
        and enrollments.user_id = auth.uid()
    )
  );

create policy "admin full access tasks" on tasks
  for all using (public.current_user_role() in ('admin', 'super_admin'));


-- ── questions ────────────────────────────────────────────────
create policy "enrolled students read questions" on questions
  for select using (
    exists (
      select 1 from tasks
      join lessons on lessons.id = tasks.lesson_id
      join modules on modules.id = lessons.module_id
      join courses on courses.id = modules.course_id
      join enrollments on enrollments.course_id = courses.id
      where tasks.id = questions.task_id
        and courses.published = true
        and enrollments.user_id = auth.uid()
    )
  );

create policy "admin full access questions" on questions
  for all using (public.current_user_role() in ('admin', 'super_admin'));


-- ── enrollments ──────────────────────────────────────────────
create policy "students read own enrollments" on enrollments
  for select using (user_id = auth.uid());

create policy "students insert own enrollments" on enrollments
  for insert with check (user_id = auth.uid());

create policy "org_admin read org enrollments" on enrollments
  for select using (
    public.current_user_role() = 'org_admin'
    and org_id = public.current_user_org()
  );

create policy "admin full access enrollments" on enrollments
  for all using (public.current_user_role() in ('admin', 'super_admin'));


-- ── lesson_progress ──────────────────────────────────────────
create policy "students manage own progress" on lesson_progress
  for all using (user_id = auth.uid());

create policy "admin read all progress" on lesson_progress
  for select using (public.current_user_role() in ('admin', 'super_admin'));

create policy "org_admin read org progress" on lesson_progress
  for select using (
    public.current_user_role() = 'org_admin'
    and exists (
      select 1 from profiles
      where profiles.id = lesson_progress.user_id
        and profiles.org_id = public.current_user_org()
    )
  );


-- ── task_submissions ─────────────────────────────────────────
create policy "students manage own submissions" on task_submissions
  for all using (user_id = auth.uid());

create policy "admin read all submissions" on task_submissions
  for select using (public.current_user_role() in ('admin', 'super_admin'));

create policy "org_admin read org submissions" on task_submissions
  for select using (
    public.current_user_role() = 'org_admin'
    and exists (
      select 1 from profiles
      where profiles.id = task_submissions.user_id
        and profiles.org_id = public.current_user_org()
    )
  );


-- ── question_responses ───────────────────────────────────────
create policy "students manage own responses" on question_responses
  for all using (
    exists (
      select 1 from task_submissions
      where task_submissions.id = question_responses.submission_id
        and task_submissions.user_id = auth.uid()
    )
  );

create policy "admin read all responses" on question_responses
  for select using (public.current_user_role() in ('admin', 'super_admin'));
