create index if not exists bvss_curator_playlist_claims_playlist_idx
  on public.bvss_curator_playlist_claims(playlist_id);
create index if not exists bvss_curator_playlist_claims_verified_by_idx
  on public.bvss_curator_playlist_claims(verified_by);
create index if not exists bvss_curator_profiles_approved_by_idx
  on public.bvss_curator_profiles(approved_by);
create index if not exists bvss_media_uploads_submission_idx
  on public.bvss_media_uploads(submission_id);
create index if not exists bvss_network_reports_reporter_idx
  on public.bvss_network_reports(reporter_user_id);
create index if not exists bvss_network_reports_curator_idx
  on public.bvss_network_reports(curator_id);
create index if not exists bvss_network_reports_playlist_idx
  on public.bvss_network_reports(playlist_id);
create index if not exists bvss_network_reports_submission_idx
  on public.bvss_network_reports(submission_id);
create index if not exists bvss_network_reports_resolved_by_idx
  on public.bvss_network_reports(resolved_by);
create index if not exists bvss_playlists_verified_by_idx
  on public.bvss_playlists(verified_by);
create index if not exists bvss_submission_download_events_curator_idx
  on public.bvss_submission_download_events(curator_id);
create index if not exists bvss_submission_download_events_reviewer_idx
  on public.bvss_submission_download_events(reviewer_user_id);
create index if not exists bvss_submission_routes_placement_idx
  on public.bvss_submission_routes(placement_id);
create index if not exists bvss_submission_routes_playlist_idx
  on public.bvss_submission_routes(playlist_id);
