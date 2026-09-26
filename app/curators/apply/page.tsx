import type { Metadata } from 'next';
import Link from 'next/link';
import CuratorApply from './CuratorApply';

export const metadata: Metadata = {
  title: 'Apply to the Curator Network Beta',
  description: 'Apply as an independent playlist curator, verify playlist ownership, and review matched artist submissions through BVSS FVM.',
  alternates: { canonical: '/curators/apply' },
};

export default function CuratorApplyPage() {
  return (
    <main>
      <section className="shell page-hero">
        <p className="eyebrow">Curator Network Beta</p>
        <h1>Bring your playlists. Keep your taste.</h1>
        <p className="lead">
          BVSS FVM is opening its submission infrastructure to a small founding cohort of independent playlist curators.
        </p>
        <div className="actions">
          <Link className="button button-secondary" href="/curators">View curator network</Link>
        </div>
      </section>

      <section className="section">
        <div className="shell submit-layout">
          <div>
            <p className="eyebrow">What the beta includes</p>
            <h2>A cleaner way to receive music.</h2>
            <div className="card submission-principles">
              <p><strong>1.</strong> Create one curator identity.</p>
              <p><strong>2.</strong> Add the Spotify playlists you actually control.</p>
              <p><strong>3.</strong> Verify ownership before a playlist can receive submissions.</p>
              <p><strong>4.</strong> Set genre, mood, and fit criteria.</p>
              <p><strong>5.</strong> Review matched tracks in one queue.</p>
              <p><strong>6.</strong> Accept, hold, or reject without surrendering editorial control.</p>
            </div>
            <p className="muted">
              Beta participation is free. BVSS FVM does not require or permit guaranteed placement. Future paid features will be workflow/analytics tools or legitimate review services — not pay-for-placement.
            </p>
          </div>
          <CuratorApply />
        </div>
      </section>
    </main>
  );
}
