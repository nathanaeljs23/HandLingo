-- HandLingo — ISL seed data
-- Run AFTER schema.sql.
-- Uses INSERT ... ON CONFLICT DO NOTHING so it's safe to re-run.
-- demo_media_url values are placeholder paths; replace with real
-- Supabase Storage URLs once you upload the demo assets.

insert into public.levels (level_id, title, order_index) values
  ('00000000-0000-0000-0000-000000000001', 'Greetings & Basics',    1),
  ('00000000-0000-0000-0000-000000000002', 'Numbers 1–10',          2),
  ('00000000-0000-0000-0000-000000000003', 'Colours',               3),
  ('00000000-0000-0000-0000-000000000004', 'Family Members',        4),
  ('00000000-0000-0000-0000-000000000005', 'Everyday Objects',      5)
on conflict do nothing;

-- ── Level 1: Greetings & Basics ────────────────────────────────────────────
insert into public.sublevels (sublevel_id, level_id, sign_target, demo_media_url, required_reps, order_index) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Hello',       '/demos/greetings/hello.gif',        3, 1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Thank You',   '/demos/greetings/thank_you.gif',    3, 2),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Please',      '/demos/greetings/please.gif',       3, 3),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Sorry',       '/demos/greetings/sorry.gif',        3, 4),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Goodbye',     '/demos/greetings/goodbye.gif',      3, 5)
on conflict do nothing; 

-- ── Level 2: Numbers 1–10 ─────────────────────────────────────────────────
insert into public.sublevels (sublevel_id, level_id, sign_target, demo_media_url, required_reps, order_index) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'One',         '/demos/numbers/1.gif', 3, 1),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Two',         '/demos/numbers/2.gif', 3, 2),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Three',       '/demos/numbers/3.gif', 3, 3),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Four',        '/demos/numbers/4.gif', 3, 4),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', 'Five',        '/demos/numbers/5.gif', 3, 5),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'Six',         '/demos/numbers/6.gif', 3, 6),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', 'Seven',       '/demos/numbers/7.gif', 3, 7),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', 'Eight',       '/demos/numbers/8.gif', 3, 8),
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002', 'Nine',        '/demos/numbers/9.gif', 3, 9),
  ('20000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'Ten',         '/demos/numbers/10.gif',3, 10)
on conflict do nothing;

-- ── Level 3: Colours ──────────────────────────────────────────────────────
insert into public.sublevels (sublevel_id, level_id, sign_target, demo_media_url, required_reps, order_index) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Red',         '/demos/colours/red.gif',    3, 1),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Blue',        '/demos/colours/blue.gif',   3, 2),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'Green',       '/demos/colours/green.gif',  3, 3),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'Yellow',      '/demos/colours/yellow.gif', 3, 4),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', 'White',       '/demos/colours/white.gif',  3, 5),
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000003', 'Black',       '/demos/colours/black.gif',  3, 6)
on conflict do nothing;

-- ── Level 4: Family Members ───────────────────────────────────────────────
insert into public.sublevels (sublevel_id, level_id, sign_target, demo_media_url, required_reps, order_index) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Mother',      '/demos/family/mother.gif',  3, 1),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'Father',      '/demos/family/father.gif',  3, 2),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'Sister',      '/demos/family/sister.gif',  3, 3),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'Brother',     '/demos/family/brother.gif', 3, 4),
  ('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'Friend',      '/demos/family/friend.gif',  3, 5)
on conflict do nothing;

-- ── Level 5: Everyday Objects ─────────────────────────────────────────────
insert into public.sublevels (sublevel_id, level_id, sign_target, demo_media_url, required_reps, order_index) values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'Water',       '/demos/objects/water.gif',  3, 1),
  ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'Food',        '/demos/objects/food.gif',   3, 2),
  ('50000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 'Book',        '/demos/objects/book.gif',   3, 3),
  ('50000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005', 'School',      '/demos/objects/school.gif', 3, 4),
  ('50000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'Home',        '/demos/objects/home.gif',   3, 5)
on conflict do nothing;

-- ── Unlock the very first sublevel for every existing user ────────────────
-- (After sign-up the trigger creates the user row; this seeds progress for
--  any users you may have created before applying the schema.)
insert into public.user_progress (user_id, sublevel_id, status)
select u.user_id, '10000000-0000-0000-0000-000000000001', 'active'
from public.users u
on conflict do nothing;
