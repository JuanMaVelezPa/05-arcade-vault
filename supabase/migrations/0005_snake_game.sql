-- 0005 — SNAKE catalog entry (spec 11)

insert into public.games
  (id, title, tagline, description, category, cover, color, sort_order, is_published)
values
  ('snake', 'SNAKE',
   'Eat the fruit, grow longer, and slither through five walled mazes.',
   'Steer the snake with the arrow keys or WASD and eat the fruit to grow. Each fruit is worth 10 points times the level. Eat 10 fruits to reach the next of five stages: open field, corner blocks, twin bars, the box, and the maze. The snake gets faster on every stage. Hitting a wall, an obstacle, or your own tail costs one of 3 lives. Clearing stage 5 ends the run with a 500-point bonus. Pause the game to jump to any level.',
   'ARCADE', 'cover-snake-arcade', 'green', 12, true);
