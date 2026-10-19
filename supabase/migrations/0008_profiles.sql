-- 0008 — profiles (specs/22-auth-sign-in-sign-up)
-- One public profile per auth user. The username uses the same rule as
-- scores.player_name so a later spec can use it directly as the player name.
-- Clients never write this table; only the trigger below does.

create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique
             check (username ~ '^[A-Z0-9_ ]{1,10}$' and username = btrim(username)),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are public" on public.profiles
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.profiles from anon, authenticated;

-- Creates the profile on sign-up. Uses raw_user_meta_data.username when valid,
-- otherwise derives one from the OAuth name or the email local part. Invalid
-- characters become '_', the result is cut to 10 and a numeric suffix is added
-- on collision, so a name clash can never block a sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_name  text;
  base      text;
  candidate text;
  suffix    int := 0;
begin
  raw_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'username'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'user_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '')
  );

  base := btrim(left(
    regexp_replace(upper(coalesce(raw_name, '')), '[^A-Z0-9_ ]', '_', 'g'),
    10
  ));
  if base = '' then
    base := 'PLAYER';
  end if;

  candidate := base;
  loop
    begin
      insert into public.profiles (user_id, username)
      values (new.id, candidate);
      return new;
    exception when unique_violation then
      if exists (select 1 from public.profiles where user_id = new.id) then
        return new;
      end if;
      suffix := suffix + 1;
      candidate := btrim(left(base, 10 - length(suffix::text))) || suffix::text;
    end;
  end loop;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
