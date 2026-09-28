-- 0003 — TETRIS catalog entry (spec 08)

insert into public.games
  (id, title, tagline, description, category, cover, color, sort_order, is_published)
values
  ('tetris', 'TETRIS',
   'Stack falling blocks, clear lines, and keep up as the speed climbs.',
   'Guide falling pieces into a 10 × 20 well. Fill a row to clear it, and clear four at once for 800 points × level. Every 10 lines raises the level and the drop speed. A ghost piece shows where you''ll land, the side panel previews the next piece, and watch out for the nut: a hollow 3 × 3 ring that doesn''t fit like the rest.',
   'PUZZLE', 'cover-tetris', 'yellow', 10, true);
