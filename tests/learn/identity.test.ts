// Public identity guard: the rendered site (app/) presents BVSS FVM as the
// publisher and Middle Child as the artist. The personal name may appear only
// in the legal songwriting credit on the Never Alone page.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = new URL('../../app/', import.meta.url).pathname;
const ALLOWED = [{ file: 'never-alone/page.tsx', text: '<dd>Daniel Lawrence Larson</dd>' }];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|mdx?|json)$/.test(entry) ? [path] : [];
  });
}

test('no personal name in public site code outside the legal credit', () => {
  const hits: string[] = [];
  for (const path of files(root)) {
    const rel = path.slice(root.length);
    let source = readFileSync(path, 'utf8');
    for (const allowed of ALLOWED) if (allowed.file === rel) source = source.replace(allowed.text, '');
    source.split('\n').forEach((line, index) => {
      if (/\blarson\b/i.test(line)) hits.push(rel + ':' + (index + 1));
    });
  }
  assert.deepEqual(hits, []);
});

test('organization schema has no founder or member person', () => {
  const layout = readFileSync(join(root, 'layout.tsx'), 'utf8');
  assert.doesNotMatch(layout, /founder:/);
  assert.doesNotMatch(layout, /member:\s*\{\s*'@type': 'Person'/);
  assert.match(layout, /creator: 'BVSS FVM'/);
  assert.match(layout, /description: 'Independent music discovery, playlist curation, artist submissions and promotion resources\.'/);
});
