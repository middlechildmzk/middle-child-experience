import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'CuratorOS — Submit once. Reach the right playlists.',
  description: 'A neutral playlist submission marketplace connecting artists with verified independent curators.',
  robots: { index: false, follow: false },
};

export default function CuratorOSPage() {
  return (
    <div
      id="curatoros-shell"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        overflow: 'auto',
        background: '#FCFCFA',
      }}
    >
      <link rel="stylesheet" href="/curatoros/styles.css" />
      <div id="app">
        <div style={{ maxWidth: 760, margin: '72px auto', padding: 32, border: '1px solid #111', background: '#FCFCFA', color: '#111' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.08em' }}>CuratorOS</div>
          <h1 style={{ fontSize: 42, margin: '12px 0' }}>Loading CuratorOS interface…</h1>
          <p>The marketplace shell loaded. The interactive client is starting.</p>
        </div>
      </div>
      <Script id="curatoros-loader" src="/curatoros/loader.js" strategy="afterInteractive" />
    </div>
  );
}
