-- HandLingo — confirmed vocabulary seed (v2)
-- Run AFTER schema.sql.
-- Clears all old data and re-seeds with the 3-level / 9-sign structure.

-- ── Clear in FK order ────────────────────────────────────────────────────────
truncate table public.user_progress, public.sublevels, public.levels
  restart identity cascade;

-- ── Levels ───────────────────────────────────────────────────────────────────
insert into public.levels (title, order_index) values
  ('Greetings',     1),
  ('Daily Needs',   2),
  ('Communication', 3);

-- ── Sublevels ────────────────────────────────────────────────────────────────
insert into public.sublevels (level_id, sign_target, order_index, required_reps, demo_media_url)
select l.level_id, s.sign_target, s.sub_order, 5,
       'placeholder://' || replace(s.sign_target, ' ', '_')
from public.levels l
join (values
  (1, 'hello',     1),
  (1, 'thank you', 2),
  (1, 'please',    3),
  (2, 'eat',       1),
  (2, 'drink',     2),
  (2, 'help',      3),
  (3, 'where',     1),
  (3, 'today',     2),
  (3, 'happy',     3)
) as s(lvl_order, sign_target, sub_order) on l.order_index = s.lvl_order;

-- ── New content columns (idempotent) ────────────────────────────────────────
alter table public.sublevels add column if not exists use_case            text;
alter table public.sublevels add column if not exists sentence_examples   jsonb;
alter table public.sublevels add column if not exists cultural_note       text;
alter table public.sublevels add column if not exists quiz_question       text;
alter table public.sublevels add column if not exists quiz_options        jsonb;
alter table public.sublevels add column if not exists quiz_answer_index   integer;

-- ── Sign content seed ─────────────────────────────────────────────────────────
update public.sublevels set
  use_case          = 'Use when greeting a Deaf person for the first time or entering a room. Eye contact is essential — the sign alone without eye contact can feel dismissive.',
  sentence_examples = '[{"isl":["HELLO","NAME","YOU","WHAT"],"english":"Hello, what is your name?"},{"isl":["HELLO","LONG TIME","SEE"],"english":"Hello, long time no see!"},{"isl":["HELLO","TODAY","HOW"],"english":"Hello, how are you today?"}]',
  cultural_note     = 'In Deaf culture, waving or gently tapping someone''s shoulder to get attention before signing is important and completely acceptable.',
  quiz_question     = 'What is equally important as the HELLO sign itself?',
  quiz_options      = '["Hand speed","Eye contact","Shoulder position"]',
  quiz_answer_index = 1
where sign_target = 'hello';

update public.sublevels set
  use_case          = 'Used exactly like spoken thank you — after receiving help, food, a gift, or any kind gesture. A genuine smile alongside the sign carries equal weight.',
  sentence_examples = '[{"isl":["HELP","ME","THANK YOU"],"english":"Thank you for helping me"},{"isl":["FOOD","GOOD","THANK YOU"],"english":"The food was good, thank you"},{"isl":["COME","TODAY","THANK YOU"],"english":"Thank you for coming today"}]',
  cultural_note     = 'Deaf communities are very expressive — a big smile paired with thank you carries as much meaning as the sign itself. Facial expression is never optional.',
  quiz_question     = 'What makes the THANK YOU sign feel more genuine?',
  quiz_options      = '["Signing faster","Smiling while signing","Using both hands"]',
  quiz_answer_index = 1
where sign_target = 'thank you';

update public.sublevels set
  use_case          = 'Always pair this with a request — eat please, help please. Using it shows respect and politeness. In ISL, please is often placed at the end of a request.',
  sentence_examples = '[{"isl":["WATER","GIVE","ME","PLEASE"],"english":"Please give me water"},{"isl":["HELP","ME","PLEASE"],"english":"Please help me"},{"isl":["SLOW","PLEASE"],"english":"Please slow down"}]',
  cultural_note     = 'Politeness in ISL is shown through facial expression as much as signs — a genuine, sincere expression while signing please matters just as much as the gesture.',
  quiz_question     = 'Where is PLEASE usually placed in an ISL sentence?',
  quiz_options      = '["At the beginning","In the middle","At the end"]',
  quiz_answer_index = 2
where sign_target = 'please';

update public.sublevels set
  use_case          = 'Used for meals, snacks, or asking if someone has eaten. A very common daily conversation opener in Deaf communities — similar to how some cultures say have you eaten as a greeting.',
  sentence_examples = '[{"isl":["TODAY","EAT","WHERE"],"english":"Where are we eating today?"},{"isl":["YOU","EAT","ALREADY"],"english":"Have you eaten already?"},{"isl":["EAT","TOGETHER","US"],"english":"Let us eat together"}]',
  cultural_note     = 'Sharing meals is central to Deaf community gatherings. Knowing food signs helps you participate naturally and shows genuine effort to connect.',
  quiz_question     = 'In ISL, where does the time word usually appear in a sentence?',
  quiz_options      = '["At the end","At the beginning","Anywhere"]',
  quiz_answer_index = 1
where sign_target = 'eat';

update public.sublevels set
  use_case          = 'Often paired with eat in conversation. Use to offer, request, or ask about beverages. One of the most intuitive signs because it naturally mimics the action.',
  sentence_examples = '[{"isl":["YOU","WANT","DRINK","WHAT"],"english":"What do you want to drink?"},{"isl":["EAT","DRINK","TOGETHER"],"english":"Let us have a meal together"},{"isl":["DRINK","WATER","PLEASE"],"english":"Please drink some water"}]',
  cultural_note     = 'In Deaf social settings, offering a drink is often the first sign of hospitality. Knowing this sign immediately makes you a more considerate and welcoming host.',
  quiz_question     = 'Why is DRINK considered one of the easiest signs for beginners?',
  quiz_options      = '["It uses only one finger","It naturally mimics the action","It has no movement"]',
  quiz_answer_index = 1
where sign_target = 'drink';

update public.sublevels set
  use_case          = 'Can be directed — point toward the person you are asking, then sign help. One of the most important signs to know in emergency or unfamiliar situations.',
  sentence_examples = '[{"isl":["HELP","ME","PLEASE"],"english":"Please help me"},{"isl":["YOU","NEED","HELP"],"english":"Do you need help?"},{"isl":["HELP","EACH OTHER","US"],"english":"Let us help each other"}]',
  cultural_note     = 'The Deaf community is known for being highly supportive of one another. HELP is one of the most culturally significant signs — offering it genuinely is always welcome.',
  quiz_question     = 'How can you make the HELP sign more specific about who you are asking?',
  quiz_options      = '["Sign it faster","Point toward the person first","Use both hands"]',
  quiz_answer_index = 1
where sign_target = 'help';

update public.sublevels set
  use_case          = 'Always pair with what you are looking for — where eat, where help, where bathroom. Facial expression is critical — raise your eyebrows when signing any question in ISL.',
  sentence_examples = '[{"isl":["BATHROOM","WHERE"],"english":"Where is the bathroom?"},{"isl":["TODAY","EAT","WHERE"],"english":"Where are we eating today?"},{"isl":["HELP","WHERE","FIND"],"english":"Where can I find help?"}]',
  cultural_note     = 'ISL uses space directionally — pointing toward a location while signing WHERE makes your communication significantly more precise and natural to native signers.',
  quiz_question     = 'What facial expression should you use when signing a question in ISL?',
  quiz_options      = '["Frown","Raised eyebrows","Neutral face"]',
  quiz_answer_index = 1
where sign_target = 'where';

update public.sublevels set
  use_case          = 'Used to set time context at the start of a conversation. In ISL, time is almost always established first before anything else — today, yesterday, tomorrow come before the main message.',
  sentence_examples = '[{"isl":["TODAY","HAPPY","ME"],"english":"I am happy today"},{"isl":["TODAY","EAT","WHERE"],"english":"Where are we eating today?"},{"isl":["TODAY","HELP","YOU","CAN"],"english":"Can you help today?"}]',
  cultural_note     = 'Time is always established at the start of an ISL conversation. This is a fundamental grammar rule — mastering TODAY means you understand one of ISL''s core sentence structures.',
  quiz_question     = 'Where does time context usually appear in an ISL sentence?',
  quiz_options      = '["At the end","In the middle","At the beginning"]',
  quiz_answer_index = 2
where sign_target = 'today';

update public.sublevels set
  use_case          = 'Emotion signs are bigger and more expressive when the feeling is stronger. A small happy means content, a large enthusiastic happy means very joyful. Match your expression to your meaning.',
  sentence_examples = '[{"isl":["YOU","HAPPY","TODAY"],"english":"Are you happy today?"},{"isl":["ME","HAPPY","MEET","YOU"],"english":"I am happy to meet you"},{"isl":["TODAY","HAPPY","EVERYONE"],"english":"Everyone is happy today"}]',
  cultural_note     = 'Emotions are never hidden in ISL — expressing feelings openly through both sign and facial expression is a cultural norm, not oversharing. The bigger the feeling, the bigger the sign.',
  quiz_question     = 'How do you show a stronger feeling of happiness in ISL?',
  quiz_options      = '["Sign it slower","Make the sign bigger and more expressive","Add more hand movements"]',
  quiz_answer_index = 1
where sign_target = 'happy';

-- ── Re-unlock first sublevel for any existing users ──────────────────────────
insert into public.user_progress (user_id, sublevel_id, status)
select u.user_id, s.sublevel_id, 'active'
from public.users u
cross join (
  select sub.sublevel_id
  from public.sublevels sub
  join public.levels lv on lv.level_id = sub.level_id
  order by lv.order_index, sub.order_index
  limit 1
) s
on conflict (user_id, sublevel_id) do nothing;
