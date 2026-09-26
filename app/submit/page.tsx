
import type { Metadata } from 'next';
import { getPlaylists } from '../../lib/playlist-os';
import SubmissionForm from './SubmissionForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Submit Music to Spotify Playlists',
  description: 'Submit one Spotify track to the BVSS FVM electronic playlist network. Genre and mood routing helps match your song to relevant human-curated playlists.',
  alternates: { canonical: '/submit' },
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ playlist?: string }>;
}) {
  const playlists = await getPlaylists();
  const { playlist } = await searchParams;

  return (
    <main>
      <section className="shell page-hero">
        <p className="eyebrow">Music submissions</p>
        <h1>Submit once. We route the fit.</h1>
        <p className="lead">
          One focused submission can be considered across the BVSS FVM playlist network. Matching helps organize the review queue; humans make every placement decision.
        </p>
      </section>
      <section className="section">
        <div className="shell submit-layout">
          <div>
            <p className="eyebrow">What we need</p>
            <h2>A real song, a Spotify link and useful context.</h2>
            <p className="muted">
              Genre, moods and comparable artists help route the track to the right curator queue. You may also choose preferred playlists, but you do not need to know the exact lane.
            </p>
            <div className="card submission-principles">
              <h3>How review works</h3>
              <p>1. Input is validated and obvious duplicates are blocked.</p>
              <p>2. The system proposes likely playlist matches.</p>
              <p>3. A curator listens and chooses accept, reject or hold.</p>
              <p>4. Accepted placements are recorded with history and rotation notes.</p>
            </div>
          </div>
          <SubmissionForm playlists={playlists} initialPlaylist={playlist} />
        </div>
      </section>
    </main>
  );
}
