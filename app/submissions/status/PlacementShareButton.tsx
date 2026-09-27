'use client';

import { useState } from 'react';

export default function PlacementShareButton({
  artist,
  song,
  playlist,
  playlistSlug,
}: {
  artist: string;
  song: string;
  playlist: string;
  playlistSlug?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const playlistUrl = playlistSlug
      ? window.location.origin + '/playlists/' + playlistSlug
      : window.location.origin + '/playlists';

    const text = artist + ' — ' + song + ' was added to ' + playlist + ' by BVSS FVM.';
    const shareData = {
      title: 'Added to ' + playlist,
      text,
      url: playlistUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text + ' ' + playlistUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      }
    } catch {
      // Native share cancellation is intentionally silent.
    }
  }

  return (
    <button className="button button-secondary button-small" type="button" onClick={share}>
      {copied ? 'Placement copied' : 'Share placement'}
    </button>
  );
}
