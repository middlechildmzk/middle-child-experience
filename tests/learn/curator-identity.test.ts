// Follow-up to #52: curator directory and profile pages describe the in-house
// CuratorOS team accurately, and non-ranking articles do not ask "which is best".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guideBySlug } from '../../lib/learn-guides';
import { isHouseCurator } from '../../lib/playlist-identity';

const read = (path: string) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('in-house curator detection', () => {
  assert.equal(isHouseCurator('curatoros'), true);
  assert.equal(isHouseCurator('outside'), false);
  assert.equal(isHouseCurator(null), false);
});

test('curator pages never call the in-house team independent', () => {
  const pages = [read('app/curators/page.tsx'), read('app/curators/[handle]/page.tsx'), read('app/page.tsx')].join('\n');
  for (const banned of [
    /Independent curators\. One accountable network/,
    /verified independent playlist curators/i,
    /Independent (playlist )?curator (participating|in the BVSS)/,
    /independent editorial consideration/i,
  ]) assert.doesNotMatch(pages, banned);
  const profile = read('app/curators/[handle]/page.tsx');
  assert.match(profile, /'@type': isHouseCurator\(curator\.handle\) \? 'Organization' : 'Person'/);
  assert.match(read('app/curators/page.tsx'), /in-house CuratorOS team/);
});

test('non-ranking articles do not ask which platform is best', () => {
  for (const slug of ['best-free-music-promotion-sites', 'best-spotify-playlist-submission-sites']) {
    const guide = guideBySlug.get(slug)!;
    assert.ok(guide.faq.some((item) => /We do not rank/.test(item.answer)));
    for (const item of guide.faq) assert.doesNotMatch(item.question, /\bbest\b/i);
  }
});
