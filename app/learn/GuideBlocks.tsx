import Link from 'next/link';
import type { ReactNode } from 'react';
import type { GuideCallout, GuideSection, GuideSource, GuideTable } from '../../lib/learn-guides';

// The only markup allowed in guide text: [label](href). Internal hrefs start
// with "/" and render as <Link>; external hrefs must be https and open in a
// new tab. Anything else stays literal text.
const LINK = /\[([^\]\n]+)\]\(((?:\/|https:\/\/)[^)\s]+)\)/g;

export function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const [whole, label, href] = match;
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    parts.push(
      href.startsWith('/') ? (
        <Link className="inline-link" href={href} key={index}>{label}</Link>
      ) : (
        <a className="inline-link" href={href} key={index} rel="noopener noreferrer" target="_blank">{label}</a>
      ),
    );
    last = index + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function Steps({ steps }: { steps: NonNullable<GuideSection['steps']> }) {
  return (
    <ol className="guide-steps">
      {steps.map((step) => (
        <li key={step.title}>
          <h3>{step.title}</h3>
          <p><RichText text={step.body} /></p>
        </li>
      ))}
    </ol>
  );
}

function Table({ table }: { table: GuideTable }) {
  return (
    <div className="guide-table-wrap" role="region" aria-label={table.caption} tabIndex={0}>
      <table className="guide-table">
        <caption>{table.caption}</caption>
        <thead>
          <tr>{table.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row"><RichText text={cell} /></th>
                ) : (
                  <td key={index}><RichText text={cell} /></td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Fixed disclosure: free submission is true, free promotion is not promised.
export const SUBMIT_DISCLOSURE = 'Free to submit. Human reviewed. No guaranteed placement.';

export function SubmitCallout({ title, body }: { title?: string; body?: string }) {
  return (
    <aside className="guide-callout guide-callout-submit" aria-label="Submit music">
      <p className="eyebrow">BVSS FVM + CuratorOS playlists</p>
      <h3>{title || 'Looking for playlists that accept free submissions?'}</h3>
      <p>
        <RichText
          text={
            body ||
            'BVSS FVM and CuratorOS operate a network of human-curated playlists across electronic, indie, pop, hip-hop, R&B, rock, country, mood and activity lanes. Submit one track and it is routed to the playlists it fits.'
          }
        />
      </p>
      <p className="guide-callout-disclosure">{SUBMIT_DISCLOSURE}</p>
      <div className="actions">
        <Link className="button" href="/submit">Submit your track</Link>
        <Link className="button button-secondary" href="/playlists">Explore playlists</Link>
      </div>
    </aside>
  );
}

function Callout({ callout }: { callout: GuideCallout }) {
  if (callout.kind === 'submit') return <SubmitCallout title={callout.title} body={callout.body} />;
  return (
    <aside className={'guide-callout guide-callout-' + callout.kind} role="note">
      <h3>{callout.title}</h3>
      <p><RichText text={callout.body} /></p>
    </aside>
  );
}

export function GuideSectionBlock({ section }: { section: GuideSection }) {
  return (
    <section className="guide-section">
      <h2>{section.heading}</h2>
      {section.paragraphs.map((paragraph) => <p key={paragraph}><RichText text={paragraph} /></p>)}
      {section.steps && <Steps steps={section.steps} />}
      {section.bullets && (
        <ul>{section.bullets.map((bullet) => <li key={bullet}><RichText text={bullet} /></li>)}</ul>
      )}
      {section.table && <Table table={section.table} />}
      {section.callout && <Callout callout={section.callout} />}
    </section>
  );
}

export function GuideSources({ sources }: { sources: GuideSource[] }) {
  return (
    <section className="guide-section guide-sources" aria-labelledby="sources-heading">
      <h2 id="sources-heading">Sources</h2>
      <ol>
        {sources.map((source) => (
          <li key={source.href}>
            <a href={source.href} rel="noopener noreferrer" target="_blank">{source.label}</a>
            <span className="muted"> · {source.publisher} · accessed {source.accessed}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
