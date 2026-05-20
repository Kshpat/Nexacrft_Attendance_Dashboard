alter table auth.users
  add column if not exists role text default 'employee';
