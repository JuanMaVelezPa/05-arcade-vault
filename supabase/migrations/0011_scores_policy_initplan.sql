-- Spec 25: evaluate auth.uid() once per statement (advisor auth_rls_initplan).
-- Same rule as 0009; drop and create run in one transaction, so there is no
-- window without an insert policy.
begin;

drop policy "signed-in users submit their own score" on public.scores;
create policy "signed-in users submit their own score" on public.scores
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.games g
      where g.id = scores.game_id and g.is_published
    )
  );

commit;
