import type { Metadata } from 'next';
import Link from 'next/link';
import { guides, guidesByTopic } from '../../lib/learn-guides';
import { siteUrl } from '../../lib/site-url';
import { socialMeta } from '../../lib/social-meta';

export const metadata: Metadata = {
  title: 'Spotify Promotion & Playlist Guides',
  description: 'First-party guides from BVSS FVM curators: getting on Spotify playlists, free promotion that works, how submissions are reviewed, and genre curation.',
  alternates: { canonical: '/learn' },
  ...socialMeta(
    'Spotify Promotion & Playlist Guides | BVSS FVM',
    'First-party guides from BVSS FVM curators: getting on Spotify playlists, free promotion that works, how submissions are reviewed, and genre curation.',
    '/learn',
  ),
};

export default function LearnPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': siteUrl + '/learn#collection',
    name: 'BVSS FVM Guides for Independent Artists',
    description: 'First-party editorial guides from the BVSS FVM playlist network.',
    url: siteUrl + '/learn',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: guides.length,
      itemListElement: guides.map((guide, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: guide.title,
        url: siteUrl + '/learn/' + guide.slug,
      })),
    },
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="shell page-hero">
        <p className="eyebrow">BVSS FVM editorial</p>
        <h1>Music promotion, explained by the people curating it.</h1>
        <p className="lead">
          Practical guides to Spotify playlists, promotion and release strategy, written from the curator side of the inbox, plus the sounds and standards behind the BVSS FVM playlist network.
        </p>
        <div className="actions">
          <Link className="button" href="/playlists">Explore playlists</Link>
          <Link className="button button-secondary" href="/submit">Submit music</Link>
        </div>
      </section>

      <section className="section">
        <div className="shell section-split">
          <div>
            <p className="eyebrow">Why this exists</p>
            <h2>Curation should be explainable.</h2>
          </div>
          <div>
            <p className="lead compact-lead">
              BVSS FVM uses these guides to document how our playlist lanes are actually defined: what separates similar genres, how mood-based playlists are sequenced, and what happens when an artist submits a track.
            </p>
            <p className="muted">
              They are written from our own curation practice rather than pretending every electronic-music label uses the same taxonomy. When a playlist evolves, the corresponding guide can evolve with it.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Guides</p>
          <h2>Useful context, not keyword filler.</h2>
          {guidesByTopic().map((group) => (
            <div className="learn-topic" key={group.topic}>
              <h3 className="learn-topic-heading">{group.topic}</h3>
              <div className="grid guide-grid">
                {group.guides.map((guide) => (
                  <Link className="card card-feature" href={'/learn/' + guide.slug} key={guide.slug}>
                    <h3>{guide.title}</h3>
                    <p>{guide.description}</p>
                    <span className="card-link">Read the guide →</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
