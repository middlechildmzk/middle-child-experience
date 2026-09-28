-- Allow first-party playlist sharing events emitted by PlaylistShareButton.
-- Keep the function allowlist and database constraint aligned.
alter table public.bvss_web_events
  drop constraint if exists bvss_web_events_event_name_check;

alter table public.bvss_web_events
  add constraint bvss_web_events_event_name_check
  check (event_name in (
    'playlist_view',
    'spotify_click',
    'submit_start',
    'submit_complete',
    'playlist_share'
  ));
