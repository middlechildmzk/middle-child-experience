import type { Metadata } from 'next';
import { getPlaylists, playlistApiBase } from '../../lib/playlist-os';
import SubmissionForm from './SubmissionForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Submit Music to BVSS FVM Playlists',
  description: 'Submit released or unreleased electronic music to BVSS FVM. Search or paste a Spotify track, or privately upload an unreleased song for human curator review.',
  alternates: { canonical: '/submit' },
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ playlist?: string }>;
}) {
  const playlists = await getPlaylists();
  const { playlist } = await searchParams;
  let spotifyTextSearchConfigured = false;
  try {
    const response = await fetch(playlistApiBase + '/bvss-track-lookup', { cache: 'no-store' });
    if (response.ok) {
      const body = await response.json();
      spotifyTextSearchConfigured = Boolean(body.spotify_text_search_configured);
    }
  } catch {}

  return (
    <main>
      <section className="shell page-hero submit-hero-v3">
        <p className="eyebrow">Music submissions</p>
        <h1>Find the song. Tell us the vibe. Done.</h1>
        <p className="lead">
          Released? Search for it or paste the Spotify link. Unreleased? Upload the audio or share a private listening link.
        </p>
      </section>

      <section className="section submit-section-v3">
        <div className="shell submit-v3-shell">
          <SubmissionForm
            playlists={playlists}
            initialPlaylist={playlist}
            spotifyTextSearchConfigured={spotifyTextSearchConfigured}
          />
        </div>
      </section>

      <section className="proof-strip submit-proof-v3">
        <div className="shell proof-grid">
          <div><span>Review</span><strong>Human curator decisions</strong></div>
          <div><span>Privacy</span><strong>Private unreleased delivery</strong></div>
          <div><span>Placement</span><strong>Never guaranteed or sold</strong></div>
        </div>
      </section>
    </main>
  );
}
