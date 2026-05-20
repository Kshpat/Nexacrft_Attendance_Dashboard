alter table auth.users
  add column if not exists username text unique;

-- Insert first admin (username: Kshitij)
-- The password is stored as a bcrypt hash. Replace the placeholder hash with the actual bcrypt hash of 'Sakshitij@01'.
insert into auth.users (email, username, encrypted_password, role, email_confirmed_at)
values (
  'kshitij@example.com',
  'Kshitij',
  '$2b$10$pD5bw51IDQ2vCZnwF.L1qOKRaLEiitL/WZ9RpqIGeIEhWTC5A/1Li',
  'admin',
  now()
)
on conflict (email) do nothing;
