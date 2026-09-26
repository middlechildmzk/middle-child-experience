
import type { Metadata } from 'next';
import PlaylistOSAdmin from './PlaylistOSAdmin';

export const metadata: Metadata = {
  title: 'Playlist OS',
  robots: { index: false, follow: false },
};

export default function PlaylistOSPage() {
  return <main className="shell os-page"><PlaylistOSAdmin /></main>;
}
