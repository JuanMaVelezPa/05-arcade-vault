-- 0010 — revoke public EXECUTE on rls_auto_enable() (specs/24-security-hardening)
-- Supabase-created SECURITY DEFINER event-trigger helper. It was callable through
-- /rest/v1/rpc/rls_auto_enable by anon and authenticated. Event triggers fire
-- without an EXECUTE grant on the caller, so auto-enabling RLS keeps working.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
