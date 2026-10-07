import type { Metadata } from 'next';
import Link from 'next/link';
import { getPlaylists } from '../../../lib/playlist-os';
import { siteUrl } from '../../../lib/site-url';
import { SUBMIT_DISCLOSURE } from '../../learn/GuideBlocks';
import FitChecker from './FitChecker';

// Open/closed status and vocabulary come from the live registry on every request.
export const dynamic = 'force-dynamic';

const PATH = '/tools/playlist-fit-checker';
const TITLE = 'Spotify Playlist Fit Checker';
const SEO_TITLE = 'Spotify Playlist Fit Checker: Find Playlists for Your Song';
const DESCRIPTION =
  'Describe your song by genre, mood and listening moment to find BVSS FVM and CuratorOS playlists that fit, see why each one matches, and submit free.';

export const metadata: Metadata = {
  title: { absolute: SEO_TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: SEO_TITLE, description: DESCRIPTION, url: PATH, type: 'website' },
};

export default async function PlaylistFitCheckerPage() {
  const playlists = await getPlaylists().catch(() => []);
  const pageUrl = siteUrl + PATH;

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': pageUrl + '#webpage',
    name: TITLE,
    description: DESCRIPTION,
    url: pageUrl,
    isPartOf: { '@id': siteUrl + '/#website' },
    publisher: { '@id': siteUrl + '/#organization' },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BVSS FVM', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: TITLE, item: pageUrl },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="shell page-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">BVSS FVM</Link><span>›</span><span>{TITLE}</span>
        </nav>
        <p className="eyebrow">Free tool · BVSS FVM + CuratorOS playlists</p>
        <h1>{TITLE}</h1>
        <p className="lead">
          Not sure which playlist your song belongs on? Describe it the way a listener would hear it, and we will show the
          playlists in our network that fit, why each one matches, and a direct way to submit.
        </p>
        <p className="free-submission-disclosure">{SUBMIT_DISCLOSURE}</p>
      </section>

      <section className="section fit-section">
        <div className="shell">
          <FitChecker playlists={playlists} />
        </div>
      </section>

      <div className="shell guide-layout">
        <div className="guide-body">
          <section className="guide-section">
            <h2>How fit is decided</h2>
            <p>
              Matching uses only what you select and what each playlist says it covers: its primary genre, the other genres
              it includes, its moods and its listening moments. A match on the playlist’s primary genre counts most, then its
              other genres, then shared moods and the listening moment.
            </p>
            <p>
              Follower counts are not used, so a bigger playlist is never shown as a better fit. Only playlists that are
              active and open for submissions appear. Nothing here listens to your audio or judges the song.
            </p>
          </section>
          <section className="guide-section">
            <h2>Before you submit</h2>
            <p>
              Several of the reasons a curator can choose when passing on a song are about fit, such as not my genre lane,
              wrong mood and energy mismatch. A few checks help you avoid the obvious ones:
            </p>
            <ul>
              <li>Pick the genre a listener would hear in the first 30 seconds.</li>
              <li>Choose moods that describe how the song sounds, not how you hope it lands.</li>
              <li>Open the playlist and listen to a few recent adds before you submit.</li>
            </ul>
            <p>
              Read what each decline reason means in{' '}
              <Link className="inline-link" href="/learn/why-playlist-curators-reject-songs">why playlist curators reject songs</Link>, and how to describe your
              song well in <Link className="inline-link" href="/learn/how-to-pitch-playlist-curators">how to pitch playlist curators</Link>.
            </p>
          </section>
        </div>
        <aside className="guide-related">
          <p className="eyebrow">Related</p>
          <Link className="card" href="/free-spotify-playlist-submission">
            <h3>Free Spotify playlist submission</h3>
            <p>Already know what you want? Browse every playlist accepting submissions.</p>
            <span className="card-link">Browse playlists →</span>
          </Link>
          <Link className="card" href="/learn/why-playlist-curators-reject-songs">
            <h3>Why curators reject songs</h3>
            <p>Each decline reason in our review workflow, and what to do next.</p>
            <span className="card-link">Read the guide →</span>
          </Link>
          <Link className="card" href="/submit">
            <h3>Submit without choosing</h3>
            <p>Submit once and routing suggests the playlists your song fits.</p>
            <span className="card-link">Submit your track →</span>
          </Link>
        </aside>
      </div>
    </main>
  );
}
