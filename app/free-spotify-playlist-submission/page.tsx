import type { Metadata } from 'next';
import Link from 'next/link';
import { freeSubmissionPage as page } from '../../lib/free-submission';
import { getPlaylists, networkSummary } from '../../lib/playlist-os';
import { siteUrl } from '../../lib/site-url';
import { networkFollowerTotals } from '../../lib/source-health';
import { GuideSectionBlock, GuideSources, RichText, SUBMIT_DISCLOSURE } from '../learn/GuideBlocks';
import PlaylistBrowser from '../playlists/PlaylistBrowser';

// Counts and submission status come from the live registry on every request.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: page.seoTitle },
  description: page.description,
  alternates: { canonical: page.path },
  openGraph: {
    title: page.seoTitle,
    description: page.description,
    url: page.path,
    type: 'website',
  },
};

export default async function FreeSpotifyPlaylistSubmissionPage() {
  const playlists = await getPlaylists().catch(() => []);
  const active = playlists.filter((playlist) => playlist.lifecycle_state === 'active');
  const open = active.filter((playlist) => playlist.submission_status === 'open');
  const summary = networkSummary(playlists);
  const followers = networkFollowerTotals(active);
  const pageUrl = siteUrl + page.path;

  // CollectionPage + an ItemList that mirrors the visible list below.
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': pageUrl + '#collection',
    name: page.title,
    description: page.description,
    url: pageUrl,
    dateModified: page.updated,
    isPartOf: { '@id': siteUrl + '/#website' },
    publisher: { '@id': siteUrl + '/#organization' },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Playlists accepting free submissions',
      numberOfItems: open.length,
      itemListElement: open.map((playlist, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: playlist.canonical_name,
        url: siteUrl + '/playlists/' + playlist.slug,
      })),
    },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BVSS FVM', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: page.title, item: pageUrl },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="shell page-hero">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">BVSS FVM</Link><span>›</span><span>{page.title}</span>
        </nav>
        <p className="eyebrow">BVSS FVM + CuratorOS playlists</p>
        <h1>{page.title}</h1>
        <p className="lead">{page.lead}</p>
        <p className="free-submission-disclosure">{SUBMIT_DISCLOSURE}</p>
        <div className="actions">
          <Link className="button" href="/submit">Submit your track</Link>
          <a className="button button-secondary" href="#playlists">Browse open playlists</a>
        </div>
        <p className="fit-checker-prompt">
          Not sure where your song fits? <Link className="inline-link" href="/tools/playlist-fit-checker">Use the Playlist Fit Checker</Link>.
        </p>
      </section>

      <section className="proof-strip" aria-label="Network overview">
        <div className="shell proof-grid">
          <div>
            <span>Open for submissions</span>
            <strong>{summary ? summary.openForSubmissions + ' playlists' : 'Live playlist list below'}</strong>
            {summary && summary.curatorOS > 0 && <small>{summary.bvss} BVSS FVM · {summary.curatorOS} CuratorOS</small>}
          </div>
          <div>
            <span>Measured audience{followers.counted ? ' · ' + followers.counted + ' of ' + followers.monitored + ' playlists' : ''}</span>
            <strong>{followers.counted ? followers.total.toLocaleString('en-US') + ' followers' : 'Measuring'}</strong>
          </div>
          <div>
            <span>Cost · decisions</span>
            <strong>Free · human curators</strong>
          </div>
        </div>
      </section>

      <div className="shell guide-layout free-submission-layout">
        <div className="guide-body">
          <GuideSectionBlock section={{ heading: 'How free submission works', paragraphs: [], steps: page.steps }} />
          <GuideSectionBlock
            section={{
              heading: 'What “free” means here',
              paragraphs: [
                'Free submission and free promotion are not the same thing. What is free is getting your song in front of a curator who actually listens. What happens next depends on whether it fits the playlist.',
              ],
              table: page.freeTable,
            }}
          />
        </div>
        <aside className="guide-related">
          <p className="eyebrow">Before you submit</p>
          <div className="card">
            <ul className="free-submission-checklist">
              {page.checklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <Link className="card" href="/learn/how-to-get-on-spotify-playlists">
            <h3>How to get on Spotify playlists</h3>
            <p>Editorial pitching, algorithmic playlists and independent curators, with Spotify’s actual rules.</p>
            <span className="card-link">Read the guide →</span>
          </Link>
          <Link className="card" href="/learn/how-we-review-playlist-submissions">
            <h3>How review works</h3>
            <p>What curators listen for, and what accept, hold and decline mean.</p>
            <span className="card-link">Read the guide →</span>
          </Link>
        </aside>
      </div>

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Editorial disclosure</p>
            <h2>Who runs these playlists.</h2>
          </div>
          <div className="free-submission-disclosure-list">
            {page.disclosure.map((paragraph) => <p className="muted" key={paragraph}><RichText text={paragraph} /></p>)}
          </div>
        </div>
      </section>

      <section className="section" id="playlists">
        <div className="shell">
          <p className="eyebrow">Playlists accepting submissions</p>
          <h2>Pick a lane, or let routing find it.</h2>
          <p className="muted">
            This list comes straight from our live playlist registry, so counts and submission status are current.
            Choosing a playlist pre-selects it in the submission form. You can add more there.
          </p>
          {open.length ? (
            <PlaylistBrowser playlists={open} mode="submit" />
          ) : (
            <div className="card">
              <h3>The playlist list is temporarily unavailable.</h3>
              <p>You can still submit. Routing will suggest playlists once the registry is back.</p>
              <Link className="button" href="/submit">Submit your track</Link>
            </div>
          )}
        </div>
      </section>


      <section className="section">
        <div className="shell">
          <p className="eyebrow">FAQ</p>
          <h2>Common questions.</h2>
          <div className="editorial-columns">
            {page.faq.map((item) => (
              <article className="card" key={item.question}>
                <h3>{item.question}</h3>
                <p><RichText text={item.answer} /></p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="shell guide-body">
        <GuideSources sources={page.sources} />
      </div>

      <section className="section final-cta">
        <div className="shell section-split">
          <div><p className="eyebrow">Ready when you are</p><h2>Send the song you want heard.</h2></div>
          <div>
            <p className="lead compact-lead">One submission, free, reviewed by a person for every playlist it fits.</p>
            <p className="free-submission-disclosure">{SUBMIT_DISCLOSURE}</p>
            <div className="actions">
              <Link className="button" href="/submit">Submit your track</Link>
              <Link className="button button-secondary" href="/playlists/collections">Browse collections</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
