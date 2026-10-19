-- 0009 — scores belong to a signed-in user (specs/23-require-sign-in-for-scores)
-- Existing anonymous scores have no owner and are deleted. From now on only
-- authenticated users insert, user_id comes from the session and player_name is
-- always overwritten from profiles.username, so neither can be spoofed.

delete from public.scores;

alter table public.scores
  add column user_id uuid not null default auth.uid()
  references auth.users (id) on delete cascade;

create index scores_user_id_idx on public.scores (user_id);

create or replace function public.set_score_player_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.player_name := (
    select p.username from public.profiles p where p.user_id = new.user_id
  );
  if new.player_name is null then
    raise exception 'profile not found for user %', new.user_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.set_score_player_name() from public, anon, authenticated;

create trigger scores_set_player_name
  before insert on public.scores
  for each row execute function public.set_score_player_name();

-- 0002 renamed the 0001 policy and limited it to published games; keep that rule.
drop policy "anyone can submit a score to a published game" on public.scores;
create policy "signed-in users submit their own score" on public.scores
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.games g
      where g.id = scores.game_id and g.is_published
    )
  );

revoke insert on public.scores from anon, authenticated;
grant  insert (game_id, score) on public.scores to authenticated;
