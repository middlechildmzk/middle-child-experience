import type { Metadata } from 'next';

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
      <div id="app" />
      <script type="module" src="/curatoros/app.js" />
    </div>
  );
}
