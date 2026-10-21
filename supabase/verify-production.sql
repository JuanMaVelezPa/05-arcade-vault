-- verify-production.sql (specs/27-production-migration)
-- Read-only. Run the whole file in the SQL Editor of Dev and of Production, then
-- compare the single JSON result: every key must be identical (except
-- `migrations` versions if the files were pasted by hand instead of `db push`).

select jsonb_pretty(jsonb_build_object(
  'rls', (
    select jsonb_object_agg(c.relname, c.relrowsecurity order by c.relname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  ),
  'policies', (
    select jsonb_agg(
      jsonb_build_object(
        'table', tablename, 'name', policyname, 'cmd', cmd,
        'roles', roles, 'using', qual, 'check', with_check
      ) order by tablename, policyname
    )
    from pg_policies where schemaname = 'public'
  ),
  'views', (
    select jsonb_object_agg(c.relname, coalesce(c.reloptions::text, 'none') order by c.relname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
  ),
  'functions', (
    select jsonb_agg(
      jsonb_build_object(
        'name', p.proname,
        'security_definer', p.prosecdef,
        'anon_execute', has_function_privilege('anon', p.oid, 'execute'),
        'authenticated_execute', has_function_privilege('authenticated', p.oid, 'execute')
      ) order by p.proname
    )
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ),
  'triggers', (
    select jsonb_agg(
      jsonb_build_object(
        'table', event_object_schema || '.' || event_object_table,
        'name', trigger_name, 'timing', action_timing, 'event', event_manipulation
      ) order by event_object_table, trigger_name
    )
    from information_schema.triggers
    where trigger_schema in ('public', 'auth')
      and trigger_name in ('on_auth_user_created', 'scores_set_player_name')
  ),
  'table_privileges', (
    select jsonb_agg(
      jsonb_build_object('table', table_name, 'role', grantee, 'privilege', privilege_type)
      order by table_name, grantee, privilege_type
    )
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
  ),
  'column_privileges', (
    select jsonb_agg(
      jsonb_build_object(
        'table', table_name, 'column', column_name,
        'role', grantee, 'privilege', privilege_type
      ) order by table_name, column_name, grantee, privilege_type
    )
    from information_schema.column_privileges
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE')
  ),
  'scores_columns', (
    select jsonb_agg(
      jsonb_build_object('name', column_name, 'type', data_type, 'nullable', is_nullable)
      order by ordinal_position
    )
    from information_schema.columns
    where table_schema = 'public' and table_name = 'scores'
  ),
  'games', (
    select jsonb_agg(
      jsonb_build_object('id', id, 'published', is_published, 'sort_order', sort_order)
      order by sort_order
    )
    from public.games
  ),
  'counts', jsonb_build_object(
    'games', (select count(*) from public.games),
    'scores', (select count(*) from public.scores),
    'profiles', (select count(*) from public.profiles)
  ),
  'migrations', (
    select jsonb_agg(version || ':' || name order by version)
    from supabase_migrations.schema_migrations
  )
)) as verify;
