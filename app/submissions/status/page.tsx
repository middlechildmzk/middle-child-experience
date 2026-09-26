import type { Metadata } from 'next';
import SubmissionStatus from './SubmissionStatus';

export const metadata: Metadata = {
  title: 'Submission Status',
  robots: { index: false, follow: false },
};

export default async function SubmissionStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main>
      <section className="shell page-hero">
        <p className="eyebrow">Artist submission</p>
        <h1>Track your review.</h1>
        <p className="lead">
          This private page shows recorded BVSS FVM and curator-network workflow events for one submission.
        </p>
      </section>
      <section className="section">
        <div className="shell"><SubmissionStatus token={token} /></div>
      </section>
    </main>
  );
}
