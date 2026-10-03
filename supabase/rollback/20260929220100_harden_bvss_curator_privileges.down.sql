-- Manual rollback for 20260929220100_harden_bvss_curator_privileges.
-- Restores the exact pre-migration table grants captured from production on
-- 2026-09-29. Re-opens the privilege paths the migration closed.
-- Not a migration: never place in supabase/migrations.

grant insert, update, delete on public.bvss_curator_profiles to anon, authenticated;
grant insert, update, delete on public.bvss_curator_entitlements to anon, authenticated;
grant insert, update, delete on public.bvss_curator_playlist_claims to anon, authenticated;
grant insert, update, delete on public.bvss_admin_users to anon, authenticated;
