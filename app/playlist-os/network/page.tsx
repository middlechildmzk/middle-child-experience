import type { Metadata } from 'next';
import NetworkAdminPanel from './NetworkAdminPanel';

export const metadata: Metadata = {
  title: 'Curator Network Admin',
  robots: { index: false, follow: false },
};

export default function NetworkAdminPage() {
  return <main className="shell os-page"><NetworkAdminPanel /></main>;
}
