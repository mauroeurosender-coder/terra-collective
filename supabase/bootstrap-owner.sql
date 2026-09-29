-- 1. Supabase → Authentication → Users → "Add user" (email + password, auto-confirm).
-- 2. Replace the email below with that user's email and run this in the SQL Editor.
insert into staff (user_id, email, name, role)
select id, email, 'Owner', 'owner' from auth.users where email = 'lloretaceramicsportugal@gmail.com'
on conflict (user_id) do update set role = 'owner';
