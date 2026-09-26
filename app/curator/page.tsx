import type { Metadata } from 'next';
import CuratorPortal from './CuratorPortal';

export const metadata: Metadata = {
  title: 'Curator Portal',
  robots: { index: false, follow: false },
};

export default function CuratorPortalPage() {
  return <main className="shell os-page"><CuratorPortal /></main>;
}
