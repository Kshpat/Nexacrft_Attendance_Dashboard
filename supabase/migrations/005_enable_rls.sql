-- Enable Row Level Security on attendance and notifications tables

-- Attendance RLS
alter table public.attendance enable row level security;

create policy "employees can insert their own attendance"
  on public.attendance
  for insert
  using (auth.uid() = user_id);

create policy "employees can select their own attendance"
  on public.attendance
  for select
  using (auth.uid() = user_id);

create policy "employees can update only their own attendance (time_in then time_out)"
  on public.attendance
  for update
  using (auth.uid() = user_id);

-- Admins can select all attendance
create policy "admins can select all attendance"
  on public.attendance
  for select
  using (exists (select 1 from auth.users where id = auth.uid() and role = 'admin'));

-- Notifications RLS
alter table public.notifications enable row level security;

create policy "admins can insert notifications"
  on public.notifications
  for insert
  using (exists (select 1 from auth.users where id = auth.uid() and role = 'admin'));

create policy "admins can select their notifications"
  on public.notifications
  for select
  using (admin_id = auth.uid());
