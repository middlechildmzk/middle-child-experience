/**
 * Self-test for scripts/check-bridge-readonly.mjs: proves every rule fires
 * on a violating snippet, stays quiet on the approved read patterns, and
 * ignores forbidden words that only appear in comments.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanRepo, scanSource } from '../../scripts/check-bridge-readonly.mjs';

const rulesFor = (src, file = 'lib/bridge/adapters/new.ts') =>
  scanSource(src, file).map((f) => f.rule);

const VIOLATIONS = {
  'non-get-method': "const m = { method: verb };",
  'mutating-method-literal': "const verb = 'POST';",
  'request-body': 'const init = { body: JSON.stringify(x) };',
  'supabase-client': "import { createClient } from '@supabase/supabase-js';",
  'postgrest-mutation': "client.from('releases').update({ title: 'x' });",
  rpc: "client.rpc('do_thing');",
  'write-edge-function': "const path = '/bvss-submit';",
  'alt-transport': 'const xhr = new XMLHttpRequest();',
  'service-role-public-env': 'const k = process.env.NEXT_PUBLIC_ARTISTOS_READ_KEY;',
  'network-outside-reader': 'await fetch(url);',
};

for (const [rule, snippet] of Object.entries(VIOLATIONS)) {
  test(`guard fires: ${rule}`, () => {
    assert.ok(rulesFor(snippet).includes(rule), `${rule} did not fire on: ${snippet}`);
  });
}

test('guard allows GET via the approved readers', () => {
  const src = "const r = await fetch(url, { method: 'GET', cache: 'no-store' });";
  assert.deepEqual(rulesFor(src, 'lib/bridge/postgrest-read.ts'), []);
  assert.deepEqual(rulesFor(src, 'lib/bridge/adapters/bvss.ts'), []);
});

test('guard ignores forbidden words in comments but not in strings', () => {
  assert.deepEqual(rulesFor('// no POST, no .rpc(), bvss-submit is out of scope\n/* body: never */'), []);
  assert.ok(rulesFor("const u = 'https://x.co/rest/v1/rpc/fn';").includes('rpc'));
});

test('guard does not confuse read-only endpoints with write endpoints', () => {
  assert.deepEqual(rulesFor("const a = '/bvss-submission-status?token=';"), []);
  assert.deepEqual(rulesFor("const b = '/bvss-curators-public';"), []);
});

test('guard passes on the current repository and scans real files', () => {
  const { files, findings } = scanRepo(new URL('../..', import.meta.url).pathname);
  assert.ok(files.length >= 10, `scanned only ${files.length} files`);
  assert.deepEqual(findings, []);
});
