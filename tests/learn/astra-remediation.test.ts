// Regression coverage for Astra QA findings (2026-10-07). Each test names the
// finding it protects.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { guides, guideBySlug, type LearnGuide } from '../../lib/learn-guides.ts';
import { freeSubmissionPage } from '../../lib/free-submission.ts';
import { curatorOwnership, ownershipLabel, playlistOwnership } from '../../lib/network-ownership.ts';

const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

function texts(guide: LearnGuide): string[] {
  const out = [guide.title, guide.seoTitle, guide.description, guide.lead];
  for (const section of guide.sections) {
    out.push(section.heading, ...section.paragraphs, ...(section.bullets ?? []));
    for (const step of section.steps ?? []) out.push(step.title, step.body);
    if (section.table) out.push(section.table.caption, ...section.table.rows.flat());
    if (section.callout) out.push(section.callout.title ?? '', section.callout.body ?? '');
  }
  for (const item of guide.faq) out.push(item.question, item.answer);
  return out;
}
const allGuideText = guides.flatMap(texts);
const p1Text = JSON.stringify(freeSubmissionPage);

test('pitch timing: 7 days is never stated as a hard editorial eligibility cutoff', () => {
  const hardCutoff = /(must|has to|have to) be (pitched )?at least 7 days|only (take|consider) unreleased songs pitched at least 7 days|It must be at least 7 days/i;
  for (const text of [...allGuideText, p1Text]) assert.doesNotMatch(text, hardCutoff, text);
  // Every Spotify 7-day mention carries its real meaning: Release Radar, editor listening time, or "ideally".
  for (const text of [...allGuideText, p1Text]) {
    // Questions are answered in the next string; the answer must carry the meaning.
    if (!/7 days/.test(text) || /\?$/.test(text) || /Groov|reply|nonresponse|7 days apart/i.test(text)) continue;
    assert.match(text, /Release Radar|ideally|asks for|so editors have time|as early as you can/i, text);
  }
  const faq = guideBySlug.get('how-to-get-on-spotify-playlists')!.faq.find((item) => /less than 7 days/.test(item.question));
  assert.ok(faq, 'P2 answers the under-7-days question');
  assert.match(faq.answer, /unreleased, not on a set number of days/);
});

test('P2 table separates Release Radar from Discover Weekly and Daily Mix', () => {
  const rows = guideBySlug.get('how-to-get-on-spotify-playlists')!.sections.flatMap((s) => s.table?.rows ?? []);
  const radar = rows.find((row) => row[0].startsWith('Release Radar'));
  const algo = rows.find((row) => /Discover Weekly/.test(row[0]));
  assert.ok(radar && algo);
  assert.match(radar[2], /Pitch an unreleased song at least 7 days before release/);
  assert.doesNotMatch(algo[0], /Release Radar/);
  assert.match(algo[2], /No pitch exists/);
});

test('CuratorOS is never presented as independent curators', () => {
  const sources = [
    'app/submit/SubmissionForm.tsx',
    'app/submissions/status/SubmissionStatus.tsx',
    'app/curators/page.tsx',
    'app/curators/[handle]/page.tsx',
    'app/curatoros/[[...path]]/page.tsx',
    'app/page.tsx',
    'app/tools/playlist-fit-checker/FitChecker.tsx',
  ].map(read).join('\n');
  for (const banned of [
    /matched independent curators/i,
    /Approved independent curator/i,
    /Independent curators\. One accountable network/i,
    /verified independent (playlist )?curators/i,
    /routed to that curator for independent review/i,
    /independent editorial consideration/i,
  ]) assert.doesNotMatch(sources, banned);
  assert.match(read('app/submit/SubmissionForm.tsx'), /Also send to matching CuratorOS playlists/);
  for (const text of allGuideText) assert.doesNotMatch(text, /including \[ours\]|including every playlist in the BVSS FVM/i, text);
});

test('ownership helper distinguishes BVSS FVM, in-house CuratorOS and external curators', () => {
  assert.equal(curatorOwnership('curatoros'), 'in_house');
  assert.equal(curatorOwnership(null), 'in_house');
  assert.equal(curatorOwnership('someone-else'), 'external');
  assert.equal(playlistOwnership({ network_owner_type: 'bvss' }), 'bvss');
  assert.equal(playlistOwnership({ network_owner_type: 'partner', bvss_curator_profiles: { handle: 'curatoros' } }), 'in_house');
  assert.equal(playlistOwnership({ network_owner_type: 'partner', bvss_curator_profiles: { handle: 'jane' } }), 'external');
  assert.equal(ownershipLabel('in_house', 'CuratorOS'), 'CuratorOS (in-house team)');
  assert.equal(ownershipLabel('external', 'Jane'), 'Jane (independent curator)');
  assert.equal(ownershipLabel('bvss'), 'BVSS FVM');
});

test('no first-party frequency claims', () => {
  for (const text of allGuideText) assert.doesNotMatch(text, /we see most|scams we see|most often we|in most submissions/i, text);
  const p4 = guideBySlug.get('spotify-promotion-scams')!;
  assert.ok(p4.sections.some((s) => s.heading === 'Common scam patterns'));
});

test('royalty threshold always includes the unique-listener requirement', () => {
  for (const text of allGuideText) {
    if (/1,000 streams/.test(text)) assert.match(text, /unique listeners/, text);
  }
});

test('P5 does not infer intent from a missing contact', () => {
  const p5 = texts(guideBySlug.get('find-spotify-playlist-curators')!).join('\n');
  assert.doesNotMatch(p5, /no published channel, they are not taking submissions|not asking for submissions right now/i);
  assert.match(p5, /scrap/i);
});

test('pages that do not rank do not use "Best" in titles or FAQ questions', () => {
  for (const slug of ['best-free-music-promotion-sites', 'best-spotify-playlist-submission-sites']) {
    const guide = guideBySlug.get(slug)!;
    assert.ok(texts(guide).some((text) => /do not rank/i.test(text)));
    assert.doesNotMatch(guide.seoTitle + ' ' + guide.title, /\bbest\b/i);
    for (const item of guide.faq) assert.doesNotMatch(item.question, /\bbest\b/i);
  }
  // P7 no longer duplicates P11's paid-model comparison.
  assert.ok(!guideBySlug.get('best-free-music-promotion-sites')!.sections.some((s) => /Groover/.test(s.heading)));
});

test('mobile navigation replaces the hidden desktop nav', () => {
  const css = read('app/globals.css');
  const layout = read('app/layout.tsx');
  const menu = read('app/MobileMenu.tsx');
  assert.match(layout, /<MobileMenu items=\{nav/);
  assert.match(css, /@media\(max-width:850px\)\{\s*\.site-header\{grid-template-columns:1fr auto auto;gap:10px\}\s*\.mobile-menu-toggle\{display:inline-flex/);
  for (const needle of [/aria-expanded=\{open\}/, /aria-controls=\{panelId\}/, /'Escape'/, /buttonRef\.current\?\.focus\(\)/, /pointerdown/, /aria-label="Mobile navigation"/]) {
    assert.match(menu, needle);
  }
});

test('Released/Unreleased uses a labelled toggle group, not a fake tablist', () => {
  const form = read('app/submit/SubmissionForm.tsx');
  assert.doesNotMatch(form, /role="tablist"/);
  assert.match(form, /role="group" aria-label="Is the song released\?"/);
  assert.equal((form.match(/aria-pressed=\{mode === '(released|unreleased)'\}/g) || []).length, 2);
});

test('P1 filters use the shared taxonomy normalisation', () => {
  const browser = read('app/playlists/PlaylistBrowser.tsx');
  assert.match(browser, /uniqueTaxonomy/);
  assert.match(browser, /taxonomyKey\(genre\)/);
  assert.doesNotMatch(browser, /new Set\(values/);
});

test('P1, /learn and P14 have page-specific social metadata', () => {
  assert.match(read('app/free-spotify-playlist-submission/page.tsx'), /socialMeta\(page\.seoTitle, page\.description, page\.path\)/);
  assert.match(read('app/learn/page.tsx'), /socialMeta\(\s*'Spotify Promotion & Playlist Guides \| BVSS FVM'/);
  assert.match(read('app/tools/playlist-fit-checker/page.tsx'), /socialMeta\(SEO_TITLE, DESCRIPTION, PATH\)/);
});
