// Publication gate for /learn guides. Runs in CI before any guide can merge.
// Checks structure, dates, internal links and promise language. It does not
// judge quality; Astra's review does that.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { guides, learnTopics, type LearnGuide } from '../../lib/learn-guides.ts';
import { playlistCollections } from '../../lib/playlist-collections.ts';
import { freeSubmissionPage } from '../../lib/free-submission.ts';

const APP = path.resolve(import.meta.dirname, '../../app');
const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Static routes = every app/**/page.tsx without a [param] segment.
function staticRoutes(dir = APP, prefix = ''): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry.startsWith('[') || entry.startsWith('(') || entry.startsWith('_')) continue;
    const route = prefix + '/' + entry;
    if (existsSync(path.join(full, 'page.tsx'))) routes.push(route);
    routes.push(...staticRoutes(full, route));
  }
  return routes;
}

const known = new Set<string>(['/', ...staticRoutes()]);
for (const guide of guides) known.add('/learn/' + guide.slug);
for (const collection of playlistCollections) known.add('/playlists/collections/' + collection.slug);
// Dynamic records validated at render time (404 if missing), allowed by prefix.
const dynamicPrefixes = ['/playlists/', '/curators/'];

function allText(guide: LearnGuide): string[] {
  const text = [guide.title, guide.lead, guide.description];
  for (const section of guide.sections) {
    text.push(section.heading, ...section.paragraphs, ...(section.bullets ?? []));
    for (const step of section.steps ?? []) text.push(step.title, step.body);
    if (section.table) text.push(section.table.caption, ...section.table.columns, ...section.table.rows.flat());
    if (section.callout && 'body' in section.callout && section.callout.body) text.push(section.callout.body);
    if (section.callout?.title) text.push(section.callout.title);
  }
  for (const item of guide.faq) text.push(item.question, item.answer);
  return text;
}

function internalHrefs(guide: LearnGuide): string[] {
  const hrefs = guide.related.map((item) => item.href);
  for (const text of allText(guide)) for (const match of text.matchAll(LINK)) hrefs.push(match[2]);
  return hrefs.filter((href) => href.startsWith('/'));
}


function assertNoPromises(texts: string[]) {
  for (const text of texts) {
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const lower = sentence.toLowerCase();
      // Questions (FAQ prompts) may mention guarantees; statements must negate them.
      if (/\bguarantee[sd]?\b/.test(lower) && !sentence.trim().endsWith('?')) {
        assert.ok(/\b(no|not|never|cannot|can['’]t|doesn['’]t|does not|without|nobody|none|breaks?|violates?|illegitimate|avoid|scams?|against)\b/.test(lower), `unnegated guarantee: "${sentence}"`);
      }
      for (const banned of [/\b100% organic\b/, /\breal streams guaranteed\b/, /\bboost (your )?streams\b/, /\bgo viral\b/, /\binstant (streams|followers)\b/]) {
        assert.ok(!banned.test(lower), `banned phrasing: "${sentence}"`);
      }
      // Network size must come from the live registry, never from copy.
      assert.ok(!/\b\d{2,}\s+(active\s+|curated\s+|independent\s+)?(playlists|curators)\b/.test(lower), `hardcoded count: "${sentence}"`);
    }
  }
}

function assertLinksResolve(hrefs: string[]) {
  for (const href of hrefs.filter((value) => value.startsWith('/'))) {
    const route = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
    const ok = known.has(route) || dynamicPrefixes.some((prefix) => route.startsWith(prefix) && route.length > prefix.length);
    assert.ok(ok, `unknown internal link ${href}`);
  }
}

function linksIn(texts: string[]) {
  return texts.flatMap((text) => [...text.matchAll(LINK)].map((match) => match[2]));
}

test('guide slugs are unique and URL-safe', () => {
  const slugs = guides.map((guide) => guide.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const slug of slugs) assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

for (const guide of guides) {
  test(`${guide.slug}: metadata fits search snippets`, () => {
    assert.ok(guide.seoTitle.length <= 65, `seoTitle is ${guide.seoTitle.length} chars (max 65)`);
    assert.ok(guide.description.length >= 70 && guide.description.length <= 165, `description is ${guide.description.length} chars (70-165)`);
    assert.ok(learnTopics.includes(guide.topic));
  });

  test(`${guide.slug}: dates are valid and ordered`, () => {
    assert.match(guide.published, ISO);
    assert.match(guide.updated, ISO);
    assert.ok(guide.updated >= guide.published, 'updated is before published');
    assert.ok(!Number.isNaN(Date.parse(guide.published)));
  });

  test(`${guide.slug}: every internal link resolves`, () => {
    assertLinksResolve(internalHrefs(guide));
  });

  test(`${guide.slug}: link markup is well formed`, () => {
    for (const text of allText(guide)) {
      for (const match of text.matchAll(LINK)) {
        const href = match[2];
        assert.ok(href.startsWith('/') || href.startsWith('https://'), `link must be internal or https: ${href}`);
      }
      assert.ok(!/\]\s+\(/.test(text), `broken link markup in: ${text.slice(0, 80)}`);
    }
  });

  test(`${guide.slug}: no promise language or hardcoded counts`, () => {
    assertNoPromises(allText(guide));
  });

  test(`${guide.slug}: sources are complete`, () => {
    for (const source of guide.sources ?? []) {
      assert.ok(source.href.startsWith('https://'), `source must be https: ${source.href}`);
      assert.match(source.accessed, ISO);
      assert.ok(source.label && source.publisher);
    }
  });

  test(`${guide.slug}: has FAQ and related links`, () => {
    assert.ok(guide.faq.length >= 2, 'at least 2 FAQ items');
    assert.ok(guide.related.length >= 2, 'at least 2 related links');
  });
}

// /free-spotify-playlist-submission: same gate, applied to its copy module.
const p1 = freeSubmissionPage;
const p1Text = [
  p1.title, p1.lead, p1.description,
  ...p1.steps.flatMap((step) => [step.title, step.body]),
  p1.freeTable.caption, ...p1.freeTable.rows.flat(),
  ...p1.disclosure, ...p1.checklist,
  ...p1.faq.flatMap((item) => [item.question, item.answer]),
];

test('free submission page: metadata fits search snippets', () => {
  assert.ok(p1.seoTitle.length <= 65, `seoTitle is ${p1.seoTitle.length} chars`);
  assert.ok(p1.description.length >= 70 && p1.description.length <= 165, `description is ${p1.description.length} chars`);
  assert.match(p1.updated, ISO);
  assert.ok(existsSync(path.join(APP, p1.path.slice(1), 'page.tsx')), 'route file exists');
});

test('free submission page: no promise language or hardcoded counts', () => {
  assertNoPromises(p1Text);
});

test('free submission page: links resolve and sources are https', () => {
  assertLinksResolve(linksIn(p1Text));
  for (const source of p1.sources) assert.ok(source.href.startsWith('https://'));
});

test('free submission page: discloses who curates and that placement is not sold', () => {
  const all = p1Text.join(' ').toLowerCase();
  assert.ok(all.includes('not independent third-party curators'), 'CuratorOS house-curation disclosure');
  assert.ok(all.includes('not spotify editorial') || all.includes('none of these playlists are spotify editorial'), 'not Spotify editorial');
  assert.ok(/never sold/.test(all), 'placement is never sold');
});
