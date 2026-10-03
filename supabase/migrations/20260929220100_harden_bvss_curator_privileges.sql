-- T1B security correction: BVSS curator network privileges.
--
-- Verified 2026-09-29 against production (curator tables had 0 rows; nothing
-- exploited): anon and authenticated held table-wide INSERT/UPDATE/DELETE, and
-- the policy bvss_curator_profile_self_update only checks user_id = auth.uid().
-- RLS does not restrict columns, so a signed-in curator could:
--   * self-approve (status pending -> approved, forge approved_at/approved_by);
--   * un-suspend (status suspended -> approved, clear suspended_at/reason);
--   * self-upgrade plan (beta -> pro);
--   * rewrite handle, contact email, terms acceptance or user_id.
--
-- After this migration a curator may edit only the fields the curator portal's
-- update_profile action already edits: display_name, bio, website_url,
-- spotify_profile_url, social_links, genres, moods. Applications, approval,
-- suspension, plan, handle, terms and entitlements are written only by the
-- service-role edge functions (bvss-curator apply, bvss-network-admin), which is
-- how every existing writer already works (no client-side writes exist).
--
-- Consequence: an admin can no longer change protected curator columns through
-- direct PostgREST calls under the bvss_admin_* policies; the admin path is the
-- bvss-network-admin edge function. No code uses the direct path today.
--
-- Rollback: supabase/rollback/20260929220100_harden_bvss_curator_privileges.down.sql

-- Anonymous callers never write curator network tables.
revoke insert, update, delete on public.bvss_curator_profiles from anon;
revoke insert, update, delete on public.bvss_curator_entitlements from anon;
revoke insert, update, delete on public.bvss_curator_playlist_claims from anon;
revoke insert, update, delete on public.bvss_admin_users from anon;

-- Curator profiles: column-scoped self-service only.
revoke insert, update, delete on public.bvss_curator_profiles from authenticated;
grant update (display_name, bio, website_url, spotify_profile_url, social_links, genres, moods)
  on public.bvss_curator_profiles to authenticated;

-- Entitlements, ownership-claim verification and admin membership are service-role only.
revoke insert, update, delete on public.bvss_curator_entitlements from authenticated;
revoke insert, update, delete on public.bvss_curator_playlist_claims from authenticated;
revoke insert, update, delete on public.bvss_admin_users from authenticated;
