import type { Metadata } from 'next';
import Link from 'next/link';
import { siteUrl } from '../../lib/site-url';

const pageUrl = `${siteUrl}/licensing`;
const inquiryHref = 'mailto:hello@bvssfvm.com?subject=Licensing%20Inquiry';

export const metadata: Metadata = {
  title: 'Music Licensing & Sync | Middle Child / BVSS FVM',
  description: 'License Middle Child and BVSS FVM music for film, TV, games, trailers, podcasts, branded content, and creator projects. Availability and clearance are reviewed per track and use.',
  alternates: { canonical: pageUrl },
  keywords: [
    'Middle Child music licensing',
    'Middle Child sync licensing',
    'BVSS FVM licensing',
    'melodic bass sync music',
    'emotional electronic music licensing',
    'electronic music for film and TV',
  ],
  openGraph: {
    title: 'Music Licensing & Sync | Middle Child / BVSS FVM',
    description: 'Emotional electronic, melodic bass, and cinematic music for sync and creator projects. Clearance reviewed per track and use.',
    url: pageUrl,
    type: 'website',
    siteName: 'BVSS FVM',
  },
};

const uses = [
  ['Film & television', 'Emotional scenes, transitions, end credits, trailers, promos, and story-driven placements.'],
  ['Games & interactive', 'Cinematic moments, menus, reveals, emotional sequences, and electronic atmosphere.'],
  ['Brand & creator work', 'Campaigns, product films, YouTube, podcasts, social video, and other licensed creator uses.'],
  ['Trailers & promos', 'Builds, cathartic drops, tension-to-release arcs, and emotionally direct electronic production.'],
];

const inquiryFields = [
  'Track or sound you are interested in',
  'Project and company / production',
  'Media and intended use',
  'Territory',
  'Term / duration of license',
  'Placement length and context',
  'Timeline / air date',
  'Budget range, if known',
];

export default function LicensingPage() {
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: 'Music Licensing & Sync | Middle Child / BVSS FVM',
    description: metadata.description,
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: [
      { '@id': `${siteUrl}/#organization` },
      { '@id': `${siteUrl}/artists/middle-child#artist` },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />

      <section className="shell page-hero">
        <p className="eyebrow">Music licensing & sync</p>
        <h1>License Middle Child music for film, TV, games, trailers, podcasts, and creator work.</h1>
        <p className="lead">BVSS FVM is the official home for Middle Child catalog inquiries. Tell us what you are making, how the music will be used, and which track or sound fits the project.</p>
        <div className="actions">
          <a className="button" href={inquiryHref}>Start a licensing inquiry</a>
          <Link className="button button-secondary" href="/music">Explore the catalog</Link>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Sound</p>
          <h2>Emotional electronic music built for story.</h2>
          <p className="lead">Middle Child blends melodic bass, future bass, cinematic space, guitar warmth, intimate songwriting, and bass-forward production. The catalog ranges from fragile and reflective to wide, cathartic electronic moments.</p>
          <div className="grid">
            {uses.map(([title, copy]) => <article className="card" key={title}><h3>{title}</h3><p>{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Featured release</p>
          <h2>Never Alone</h2>
          <p className="lead">A melodic-bass release built around isolation, survival, hope, cinematic atmosphere, warm low end, guitar texture, and a cathartic drop that blooms rather than attacks.</p>
          <div className="actions">
            <Link className="button" href="/never-alone">Lyrics, credits & official audio</Link>
            <a className="button button-secondary" href="https://lnk.to/MiddlechildNeverAlone" target="_blank" rel="noreferrer">Listen everywhere</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Clearance</p>
          <h2>Availability and rights are reviewed per track and use.</h2>
          <p className="lead">Do not assume every BVSS FVM or Middle Child release is one-stop or pre-cleared for every use. Ownership, collaborators, publishing, featured performers, samples, exclusivity, and other restrictions can vary by recording. We will confirm the applicable clearance path before any license is finalized.</p>
          <div className="grid">
            <article className="card"><h3>What we can confirm</h3><p>Whether the requested track is available for the proposed use, which rights need to be cleared, what materials are available, and who needs to be part of the approval process.</p></article>
            <article className="card"><h3>What an inquiry is not</h3><p>An email inquiry is not a license, approval, quote, or representation that all rights are controlled by BVSS FVM. No use is authorized until the relevant rights and terms are confirmed in writing.</p></article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">What to send</p>
          <h2>A useful licensing inquiry answers these questions.</h2>
          <div className="grid">
            {inquiryFields.map((field) => <article className="card" key={field}><h3>{field}</h3></article>)}
          </div>
          <div className="actions"><a className="button" href={inquiryHref}>Email hello@bvssfvm.com</a><Link className="button button-secondary" href="/press">Middle Child press kit</Link></div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <p className="eyebrow">Catalog development</p>
          <h2>More permanent release pages are being added.</h2>
          <p className="lead">The BVSS FVM catalog is being documented with official credits, identifiers, release context, and listening links so music supervisors and partners can evaluate tracks from a first-party source.</p>
          <div className="actions"><Link className="button" href="/music">Browse Middle Child music</Link><Link className="button button-secondary" href="/artists/middle-child">About Middle Child</Link></div>
        </div>
      </section>
    </main>
  );
}
