import type { Metadata } from 'next';
import OneCampaignWorkbench from './OneCampaignWorkbench';

export const metadata: Metadata = {
  title: 'One Campaign',
  robots: { index: false, follow: false },
};

export default function OneCampaignPage() {
  return (
    <main className="shell one-campaign-page">
      <OneCampaignWorkbench />
    </main>
  );
}
