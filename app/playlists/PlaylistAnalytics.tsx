
'use client';

import { useEffect } from 'react';
import { playlistApiBase } from '../../lib/playlist-os';

function send(event_name: string, playlist_slug: string, path: string) {
  const payload = JSON.stringify({
    event_name,
    playlist_slug,
    path,
    referrer: document.referrer || null,
    utm: Object.fromEntries(new URLSearchParams(window.location.search)),
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon(playlistApiBase + '/bvss-event', new Blob([payload], { type: 'application/json' }));
    return;
  }
  fetch(playlistApiBase + '/bvss-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export default function PlaylistAnalytics({
  slug,
  spotifyUrl,
}: {
  slug: string;
  spotifyUrl: string;
}) {
  useEffect(() => {
    send('playlist_view', slug, window.location.pathname);
  }, [slug]);

  return (
    <a
      className="button"
      href={spotifyUrl}
      target="_blank"
      rel="noreferrer"
      onClick={() => send('spotify_click', slug, window.location.pathname)}
    >
      Open in Spotify
    </a>
  );
}
