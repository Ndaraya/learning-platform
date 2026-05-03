alter table courses
  add column if not exists requires_pro boolean not null default false;

alter table profiles
  add column if not exists subscribed_course_id uuid references courses(id) on delete set null;
