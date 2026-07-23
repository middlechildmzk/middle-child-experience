import type { Metadata } from 'next';
import '../launch-kit.css';

export const metadata: Metadata = {
  title: 'Middle Child Brand Kit',
  description: 'Official Middle Child artist identity, logo usage, colors, positioning, and social profile copy.',
};

const colors = [
  ['Midnight', '#05050A'],
  ['Deep Space', '#0D0D18'],
  ['Electric Blue', '#72A7FF'],
  ['Signal Violet', '#7B61FF'],
  ['Healing Magenta', '#D465FF'],
  ['Quiet Light', '#F5F3FF'],
];

export default function BrandPage() {
  return (
    <main className="brand-page">
      <header className="brand-kit-hero">
        <a href="/" className="brand-back">← Back to the experience</a>
        <p className="eyebrow">Official identity system</p>
        <h1>MIDDLE<br /><em>CHILD</em></h1>
        <p className="brand-kit-lede">Emotional electronic music for people carrying more than they show.</p>
      </header>

      <section className="brand-kit-section">
        <div className="brand-kit-grid">
          <div>
            <p className="eyebrow">Core positioning</p>
            <h2>Wounded, hopeful, cinematic.</h2>
          </div>
          <div className="brand-kit-copy">
            <p>Middle Child turns pain, faith, grief, mental health, and healing into melodic electronic music that feels intimate before it feels massive.</p>
            <p>The visual identity should always feel dark but alive: deep space, repaired light, subtle stars, glowing fractures, atmospheric motion, and restraint instead of EDM clichés.</p>
          </div>
        </div>
      </section>

      <section className="brand-kit-section brand-lockups">
        <p className="eyebrow">Primary marks</p>
        <div className="lockup-grid">
          <article className="lockup dark-lockup">
            <span className="brand-symbol">✦</span>
            <strong>MIDDLE CHILD</strong>
            <small>Primary horizontal wordmark</small>
          </article>
          <article className="lockup light-lockup">
            <span className="brand-symbol">✦</span>
            <strong>MIDDLE CHILD</strong>
            <small>Light-background wordmark</small>
          </article>
          <article className="lockup icon-lockup">
            <span className="brand-symbol large">✦</span>
            <small>Profile icon / favicon</small>
          </article>
        </div>
      </section>

      <section className="brand-kit-section">
        <p className="eyebrow">Color system</p>
        <div className="swatch-grid">
          {colors.map(([name, hex]) => (
            <div className="swatch" key={hex}>
              <span style={{ background: hex }} />
              <strong>{name}</strong>
              <small>{hex}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="brand-kit-section">
        <div className="brand-kit-grid">
          <div><p className="eyebrow">Social profile copy</p><h2>Ready to paste.</h2></div>
          <div className="social-copy-cards">
            <article><strong>Short bio</strong><p>Emotional electronic music for people carrying more than they show. New single “Never Alone” out July 31.</p></article>
            <article><strong>Standard bio</strong><p>Middle Child is a Minneapolis emotional electronic project blending melodic bass, cinematic atmosphere, guitar warmth, and wounded-but-hopeful songwriting.</p></article>
            <article><strong>One-line mission</strong><p>Turning pain into something that can hold another person.</p></article>
          </div>
        </div>
      </section>

      <section className="brand-kit-section">
        <div className="brand-kit-grid">
          <div><p className="eyebrow">Usage rules</p><h2>Keep it quiet. Keep it human.</h2></div>
          <div className="brand-rules">
            <p><strong>Do:</strong> use generous space, high contrast, subtle gradients, real emotional language, and a single clear focal point.</p>
            <p><strong>Avoid:</strong> neon overload, festival graphics, aggressive glitch effects, generic DJ imagery, fake spirituality, or claims that overstate what the music can do.</p>
            <p><strong>Name:</strong> always write the artist as “Middle Child.” Use “middlechildmzk” only when a username requires it.</p>
          </div>
        </div>
      </section>

      <footer className="brand-kit-footer"><a href="/">Return home</a><span>Middle Child / BVSS FVM · 2026</span></footer>
    </main>
  );
}
