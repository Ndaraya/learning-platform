alter table profiles add column if not exists
  time_accommodation text not null default 'standard'
  check (time_accommodation in ('standard', 'time_and_half', 'double'));
