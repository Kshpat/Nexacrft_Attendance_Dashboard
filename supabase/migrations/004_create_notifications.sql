create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references auth.users(id) on delete cascade,
  type text check (type in ('clock_in','clock_out','missing')) not null,
  payload jsonb,
  created_at timestamp with time zone default now()
);

-- Index for realtime fetch by admin
create index idx_notifications_admin on public.notifications (admin_id, created_at);
