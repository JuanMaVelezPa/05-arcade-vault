-- 0007 — FROGGER catalog entry (specs/game-jam/frogger/01-frogger-core)
-- Inserted unpublished: it is published once the engine is registered.

insert into public.games
  (id, title, tagline, description, category, cover, color, sort_order, is_published)
values
  ('frogger', 'FROGGER',
   'Cross the road and the river without becoming roadkill.',
   'Guide your frog across a busy road and a river of floating logs and diving turtles. Fill all five goal slots on the far bank to clear the round; each level speeds up the traffic and shortens the clock. You have three lives and 15 seconds per crossing.',
   'ARCADE', 'cover-frogger', 'green', 13, false);
