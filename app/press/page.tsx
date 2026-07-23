import type { Metadata } from 'next';
import '../launch-kit.css';

export const metadata: Metadata = {
  title: 'Press Kit | Middle Child',
  description: 'Official Middle Child press bio, release facts, artist positioning, and contact-ready information.',
};

export default function PressPage() {
  return (
    <main className="press-page">
      <header className="press-hero">
        <a href="/" className="brand-back">← Back to the experience</a>
        <p className="eyebrow">Official press kit · 2026</p>
        <h1>Middle Child</h1>
        <p>Emotional electronic music from Minneapolis.</p>
      </header>

      <section className="press-section press-columns">
        <div><p className="eyebrow">Short bio</p><h2>Music for people carrying more than they show.</h2></div>
        <div className="press-copy"><p>Middle Child is the emotional electronic project of Minneapolis artist and producer Dan Larson. The sound blends melodic bass, atmospheric future bass, cinematic low-end warmth, guitar textures, and wounded-but-hopeful songwriting.</p></div>
      </section>

      <section className="press-section press-columns">
        <div><p className="eyebrow">Full bio</p><h2>A project built from feeling, survival, and hope.</h2></div>
        <div className="press-copy">
          <p>Middle Child began in 2014 after more than a decade of guitar, bands, rap, beat-making, electronic production, and DJing. It became Dan Larson’s outlet for self-expression, therapy, and connecting with listeners navigating mental health, substance-use struggles, grief, and faith.</p>
          <p>The project’s 2017 chapter included “Awaken,” “Miracle,” “Bliss,” “Mercy,” and “YOU,” earning support across electronic-music media and reaching listeners around the world. “Mercy” has grown toward one million Spotify streams.</p>
          <p>“Never Alone,” featuring Dan’s own lowly sunday vocal alias, marks Middle Child’s return after years away. Shaped by depression, grief, healing, faith, and a cancer diagnosis, the song moves from isolation toward the realization that even in the darkest moments, we may be more held than we realize.</p>
        </div>
      </section>

      <section className="press-section">
        <p className="eyebrow">Never Alone · release facts</p>
        <div className="facts-grid">
          <article><span>Artist</span><strong>Middle Child</strong></article>
          <article><span>Featured alias</span><strong>lowly sunday</strong></article>
          <article><span>Release date</span><strong>July 31, 2026</strong></article>
          <article><span>Label</span><strong>BVSS FVM</strong></article>
          <article><span>UPC</span><strong>882877618355</strong></article>
          <article><span>Genres</span><strong>Melodic Bass / Future Bass</strong></article>
        </div>
      </section>

      <section className="press-section press-quote">
        <p>“Some songs are released. Some are survived.”</p>
      </section>

      <section className="press-section press-columns">
        <div><p className="eyebrow">Approved descriptors</p><h2>How to describe the project.</h2></div>
        <div className="tag-list"><span>Emotional electronic</span><span>Melodic bass</span><span>Cinematic future bass</span><span>Atmospheric</span><span>Wounded but hopeful</span><span>Faith-adjacent</span><span>Guitar warmth</span><span>Bass-forward</span></div>
      </section>

      <section className="press-section press-actions">
        <a className="button primary" href="https://distrokid.com/hyperfollow/middlechild7/never-alone-feat-low-sunday/" target="_blank" rel="noreferrer">Open release page ↗</a>
        <a className="button ghost" href="/brand">Open brand kit →</a>
      </section>

      <footer className="brand-kit-footer"><a href="/">Return home</a><span>Middle Child / BVSS FVM · 2026</span></footer>
    </main>
  );
}
