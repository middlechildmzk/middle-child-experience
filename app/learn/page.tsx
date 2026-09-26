import type { Metadata } from 'next';
import Link from 'next/link';
import { guides } from '../../lib/learn-guides';
import { siteUrl } from '../../lib/site-url';

export const metadata: Metadata = {
  title: 'Electronic Music Guides',
  description: 'First-party BVSS FVM guides to electronic genres, playlist curation, listening moods, and how independent artist submissions are reviewed.',
  alternates: { canonical: '/learn' },
};

export default function LearnPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': siteUrl + '/learn#collection',
    name: 'BVSS FVM Electronic Music Guides',
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
        <h1>Electronic music, explained by the people curating it.</h1>
        <p className="lead">
          First-party guides to the sounds, moods, sequencing decisions, and submission standards behind the BVSS FVM playlist network.
        </p>
        <div className="actions">
          <Link className="button" href="/playlists">Explore playlists</Link>
          <Link className="button button-secondary" href="/submit">Submit music</Link>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Guides</p>
          <h2>Useful context, not keyword filler.</h2>
          <div className="grid guide-grid">
            {guides.map((guide, index) => (
              <Link className="card card-feature" href={'/learn/' + guide.slug} key={guide.slug}>
                <span className="card-index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{guide.title}</h3>
                <p>{guide.description}</p>
                <span className="card-link">Read the guide →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
