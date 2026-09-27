'use client';

import { useState } from 'react';
import { playlistApiBase } from '../../lib/playlist-os';

function recordShare(slug: string) {
  const payload = JSON.stringify({
    event_name: 'playlist_share',
    playlist_slug: slug,
    path: window.location.pathname,
    referrer: document.referrer || null,
    utm: Object.fromEntries(new URLSearchParams(window.location.search)),
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      playlistApiBase + '/bvss-event',
      new Blob([payload], { type: 'application/json' }),
    );
    return;
  }

  fetch(playlistApiBase + '/bvss-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export default function PlaylistShareButton({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'shared'>('idle');

  async function share() {
    const url = window.location.href;
    const data = {
      title: name + ' · BVSS FVM',
      text: 'Listen to ' + name + ', curated by BVSS FVM.',
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
        setState('shared');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setState('copied');
      } else {
        return;
      }
      recordShare(slug);
      window.setTimeout(() => setState('idle'), 2200);
    } catch {
      // A cancelled native share sheet is not an error state for the user.
    }
  }

  return (
    <button className="button button-secondary" type="button" onClick={share}>
      {state === 'copied' ? 'Link copied' : state === 'shared' ? 'Shared' : 'Share playlist'}
    </button>
  );
}
