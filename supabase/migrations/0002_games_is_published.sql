-- 0002 — only published games are visible and can receive scores (spec 07)

alter table public.games
  add column is_published boolean not null default false;

update public.games set is_published = true where id = 'asteroids';

drop policy "games are public" on public.games;
create policy "published games are public" on public.games
  for select to anon, authenticated
  using (is_published);

drop policy "anyone can submit a score" on public.scores;
create policy "anyone can submit a score to a published game" on public.scores
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.games g
      where g.id = game_id and g.is_published
    )
  );
