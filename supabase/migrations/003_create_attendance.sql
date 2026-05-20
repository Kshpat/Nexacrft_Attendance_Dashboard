create table public.attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  time_in time,
  time_out time,
  status text check (status in ('present','absent','partial')) default 'partial',
  created_at timestamp with time zone default now()
);

-- Index for fast look‑ups by user and date
create index idx_attendance_user_date on public.attendance (user_id, date);
