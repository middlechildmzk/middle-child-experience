import { curatorOwnership } from '../../lib/network-ownership';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicCurators } from '../../lib/curator-network';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Playlist Curators',
  description: 'The curators behind the BVSS FVM network: the in-house CuratorOS team today, with applications open to independent playlist owners.',
  alternates: { canonical: '/curators' },
};

export default async function CuratorsPage() {
  const curators = await getPublicCurators();

  return (
    <main>
      <section className="shell page-hero">
        <p className="eyebrow">Curator Network Beta</p>
        <h1>Curators. One accountable network.</h1>
        <p className="lead">
          Today the curator directory is the in-house CuratorOS team, which operates alongside BVSS FVM. Independent playlist owners can apply, and every application is reviewed before a playlist receives routed submissions.
        </p>
        <div className="actions">
          <Link className="button" href="/curators/apply">Apply as a curator</Link>
          <Link className="button button-secondary" href="/submit">Submit music</Link>
        </div>
      </section>

      <section className="proof-strip">
        <div className="shell proof-grid">
          <div><span>Ownership</span><strong>Playlist verification required</strong></div>
          <div><span>Editorial</span><strong>No guaranteed placement</strong></div>
          <div><span>Transparency</span><strong>Response + review facts, not vanity scores</strong></div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Verified curators</p>
          <h2>Beta directory.</h2>
          {curators.length ? (
            <div className="integration-grid">
              {curators.map((curator) => (
                <Link className="card curator-card" href={'/curators/' + curator.handle} key={curator.curator_id}>
                  <span className="status-pill">{curatorOwnership(curator.handle) === 'in_house' ? 'in-house team' : 'independent curator'}</span>
                  <h3>{curator.display_name}</h3>
                  <p>{curator.bio || 'Curator in the BVSS FVM network.'}</p>
                  <div className="chip-row">
                    {curator.genres.slice(0, 4).map((genre) => <span className="chip" key={genre}>{genre}</span>)}
                  </div>
                  <div className="curator-facts">
                    <span><strong>{curator.verified_playlist_count}</strong> verified playlists</span>
                    <span><strong>{curator.reviews_completed}</strong> completed reviews</span>
                    <span><strong>{curator.active_placements}</strong> active placements</span>
                  </div>
                  <span className="card-link">View curator →</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card beta-empty">
              <p className="eyebrow">Founding curator cohort</p>
              <h3>The directory opens as curators are approved.</h3>
              <p>
                BVSS FVM is onboarding the first independent playlist owners now. Applications are reviewed before any playlist can receive network-routed submissions.
              </p>
              <Link className="button" href="/curators/apply">Apply for the beta</Link>
            </div>
          )}
        </div>
      </section>

      <section className="section final-cta">
        <div className="shell section-split">
          <div><p className="eyebrow">For playlist owners</p><h2>Keep your taste. Lose the inbox chaos.</h2></div>
          <div>
            <p className="lead compact-lead">
              Set your genres and moods, verify your playlists, receive matched submissions, listen once, and record accept / hold / reject decisions in one place.
            </p>
            <div className="actions"><Link className="button" href="/curators/apply">Join the beta</Link></div>
          </div>
        </div>
      </section>
    </main>
  );
}
