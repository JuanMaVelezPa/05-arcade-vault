-- 0004 — ARKANOID catalog entry (spec 09)

insert into public.games
  (id, title, tagline, description, category, cover, color, sort_order, is_published)
values
  ('arkanoid', 'ARKANOID',
   'Bounce the ball, smash every brick, and survive five speeding walls.',
   'Slide the paddle with the mouse, a finger, or the arrow keys, and keep the ball in play. Every brick is worth 10 points. Clear a wall to reach the next of five patterns: full grid, pyramid, checkerboard, gapped rows, and a framed cross. The ball gets 10% faster on every level. You have 3 lives, and clearing level 5 ends the run. Pause the game to jump to any level.',
   'ARCADE', 'cover-arkanoid', 'magenta', 11, true);
