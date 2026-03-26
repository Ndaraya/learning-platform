-- Add timed assessment support to tasks
alter table tasks
  add column if not exists timed_mode text not null default 'untimed'
    check (timed_mode in ('untimed', 'practice', 'exam')),
  add column if not exists time_limit_seconds integer
    check (time_limit_seconds is null or time_limit_seconds > 0);
