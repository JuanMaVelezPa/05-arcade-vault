-- 0001 — games catalog and scores leaderboards (spec 06)

create table public.games (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),
  title       text not null,
  tagline     text not null,          -- was Game.short
  description text not null,          -- was Game.long
  category    text not null check (category in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover       text not null,          -- CSS class, e.g. 'cover-asteroids'
  color       text not null,          -- 'cyan' | 'magenta' | 'green' | ...
  sort_order  integer not null unique,
  created_at  timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games (id) on delete cascade,
  player_name text not null check (player_name ~ '^[A-Z0-9_ ]{1,10}$' and player_name = btrim(player_name)),
  score       integer not null check (score between 0 and 10000000),
  created_at  timestamptz not null default now()
);

create index scores_leaderboard_idx on public.scores (game_id, score desc, created_at asc);

create view public.game_stats
with (security_invoker = true) as
select g.id as game_id,
       coalesce(max(s.score), 0)::integer as best,
       count(s.id)::integer               as plays
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games are public"  on public.games  for select to anon, authenticated using (true);
create policy "scores are public" on public.scores for select to anon, authenticated using (true);
create policy "anyone can submit a score" on public.scores for insert to anon, authenticated with check (true);

revoke insert, update, delete on public.scores from anon, authenticated;
grant  insert (game_id, player_name, score) on public.scores to anon, authenticated;
revoke insert, update, delete on public.games from anon, authenticated;
grant  select on public.game_stats to anon, authenticated;

create view public.game_champions
with (security_invoker = true) as
select distinct on (s.game_id)
       s.game_id, s.player_name, s.score, s.created_at
from public.scores s
order by s.game_id, s.score desc, s.created_at asc;

grant  select on public.game_champions to anon, authenticated;

-- seed: the 9 entries from lib/data.ts, sort_order 1..9 in catalog order
insert into public.games (id, title, tagline, description, category, cover, color, sort_order) values
  ('bloque-buster', 'BLOCK BUSTER', 'Bounce the ball and smash walls of neon.',
   'Pilot a paddle-ship and bounce a plasma core to pulverize walls of chromatic blocks. Each level rearranges the grid into impossible patterns. How far will your streak go?',
   'ARCADE', 'cover-bricks', 'cyan', 1),
  ('caida', 'DROP', 'Fit the pieces before the ceiling crushes you.',
   'Geometric pieces fall from the darkness. Rotate them, lock them in, and clear lines to survive. The speed ramps up mercilessly every 10 lines.',
   'PUZZLE', 'cover-tetro', 'magenta', 2),
  ('serpentina', 'SERPENTINE', 'Grow without biting your own tail.',
   'A serpent of light roams the grid hunting for magenta cores. Every bite makes it longer and faster. One wrong move and it devours itself.',
   'ARCADE', 'cover-snake', 'green', 3),
  ('gloton', 'GLUTTON', 'Devour dots and escape the ghosts.',
   'A gluttonous circle patrols a maze collecting glowing dots. Four specters chase it, but every so often a pill appears that reverses the roles.',
   'ARCADE', 'cover-glot', 'yellow', 4),
  ('invasores', 'INVADERS', 'Defend the planet from alien rows.',
   'Waves of hostile pixels descend formation after formation. Move your cannon horizontally and open fire with precision before they reach the surface.',
   'SHOOTER', 'cover-invaders', 'green', 5),
  ('rocas', 'ROCKS', 'Pulverize asteroids in zero gravity.',
   'Your triangular ship floats in absolute vacuum. Shoot and rotate to split rocks into ever-smaller fragments. Watch out for UFOs on the horizon.',
   'SHOOTER', 'cover-rocas', 'yellow', 6),
  ('ranaria', 'FROG CROSSING', 'Cross the pixel highway.',
   'Hop between lanes of speeding cars and drifting logs on the river. Reach the lily pads before time runs out.',
   'ARCADE', 'cover-rana', 'green', 7),
  ('duelo-pixel', 'PIXEL DUEL', 'Two paddles. One ball. Maximum reflexes.',
   'The purest duel: two vertical paddles face off to bounce a glowing ball. Solo mode against the CPU or local two-player play.',
   'VERSUS', 'cover-duelo', 'cyan', 8),
  ('asteroids', 'ASTEROIDS', 'Blast asteroids into dust in zero gravity.',
   'Your triangular ship drifts through the void. Rotate, thrust, and fire to split asteroids into ever-smaller fragments. Grab the triple-shot power-up to clear the field faster.',
   'SHOOTER', 'cover-asteroids', 'cyan', 9);
