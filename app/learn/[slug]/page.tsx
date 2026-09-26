import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guideBySlug, guides } from '../../../lib/learn-guides';
import { siteUrl } from '../../../lib/site-url';

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug.get(slug);
  if (!guide) return { title: 'Guide not found' };
  return {
    title: guide.seoTitle,
    description: guide.description,
    alternates: { canonical: '/learn/' + guide.slug },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: '/learn/' + guide.slug,
      type: 'article',
    },
  };
}

export default async function LearnGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug.get(slug);
  if (!guide) notFound();

  const pageUrl = siteUrl + '/learn/' + guide.slug;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': pageUrl + '#article',
    headline: guide.title,
    description: guide.description,
    url: pageUrl,
    datePublished: '2026-09-26',
    dateModified: '2026-09-26',
    author: { '@id': siteUrl + '/#organization' },
    publisher: { '@id': siteUrl + '/#organization' },
    mainEntityOfPage: pageUrl,
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BVSS FVM', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Learn', item: siteUrl + '/learn' },
      { '@type': 'ListItem', position: 3, name: guide.title, item: pageUrl },
    ],
  };
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <article>
        <header className="shell guide-hero">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">BVSS FVM</Link><span>›</span><Link href="/learn">Learn</Link><span>›</span><span>{guide.title}</span>
          </nav>
          <p className="eyebrow">{guide.eyebrow}</p>
          <h1>{guide.title}</h1>
          <p className="lead">{guide.lead}</p>
          <p className="muted">Published and reviewed by BVSS FVM · September 26, 2026</p>
        </header>

        <div className="shell guide-layout">
          <div className="guide-body">
            {guide.sections.map((section) => (
              <section className="guide-section" key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
                )}
              </section>
            ))}
          </div>

          <aside className="guide-related">
            <p className="eyebrow">Continue exploring</p>
            {guide.related.map((item) => (
              <Link className="card" href={item.href} key={item.href}>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
                <span className="card-link">Open →</span>
              </Link>
            ))}
          </aside>
        </div>

        <section className="section">
          <div className="shell">
            <p className="eyebrow">FAQ</p>
            <h2>Common questions.</h2>
            <div className="editorial-columns">
              {guide.faq.map((item) => (
                <article className="card" key={item.question}>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section final-cta">
          <div className="shell section-split">
            <div><p className="eyebrow">BVSS FVM playlist network</p><h2>Hear the curation in practice.</h2></div>
            <div>
              <p className="lead compact-lead">Browse the active playlists or submit one Spotify track for human editorial consideration across the network.</p>
              <div className="actions">
                <Link className="button" href="/playlists">Explore playlists</Link>
                <Link className="button button-secondary" href="/submit">Submit music</Link>
              </div>
            </div>
          </div>
        </section>
      </article>
    </main>
  );
}
