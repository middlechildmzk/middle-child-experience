#!/usr/bin/env node
/**
 * Bridge read-only guard (Architecture Pack §7 — "CI no-write check").
 *
 * Fails the build if anything under lib/bridge/ or lib/bridge-contract/
 * introduces a write path: a non-GET HTTP method, a request body, a
 * Supabase client, a PostgREST mutation or RPC, a write-capable BVSS edge
 * function, or a network call from a file that isn't an approved reader.
 *
 * Comments are stripped before matching (string-aware), so documentation
 * that *names* a forbidden thing ("no POST", "bvss-submit is out of
 * scope") does not trip the guard — only code does.
 *
 * Usage:
 *   node scripts/check-bridge-readonly.mjs            # scan the repo
 *   node scripts/check-bridge-readonly.mjs --json     # machine output
 * Exports `scanSource` for the self-test in lib/bridge/__tests__.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCAN_ROOTS = ['lib/bridge', 'lib/bridge-contract'];

/** Only these files may perform network I/O; both are GET-only readers. */
export const NETWORK_ALLOWLIST = new Set([
  'lib/bridge/postgrest-read.ts',
  'lib/bridge/adapters/bvss.ts',
]);

/** @type {{ id: string; description: string; pattern: RegExp }[]} */
export const RULES = [
  {
    id: 'non-get-method',
    description: 'HTTP method other than GET',
    pattern: /\bmethod\s*:(?!\s*['"`]GET['"`])/i,
  },
  {
    id: 'mutating-method-literal',
    description: 'POST/PUT/PATCH/DELETE method literal',
    pattern: /['"`](POST|PUT|PATCH|DELETE)['"`]/i,
  },
  {
    id: 'request-body',
    description: 'request body (reads never send one)',
    pattern: /\bbody\s*:/,
  },
  {
    id: 'supabase-client',
    description: 'supabase-js client (exposes insert/update/delete/rpc)',
    pattern: /@supabase\/supabase-js|\bcreateClient\s*\(/,
  },
  {
    id: 'postgrest-mutation',
    description: 'PostgREST/query-builder mutation call',
    pattern: /\.(insert|update|upsert|delete)\s*\(/,
  },
  {
    id: 'rpc',
    description: 'RPC invocation',
    pattern: /\.rpc\s*\(|\/rest\/v1\/rpc\b|['"`/]rpc\//,
  },
  {
    id: 'write-edge-function',
    description: 'write-capable or authenticated BVSS edge function',
    pattern: /['"`/]bvss-(submit|event|media|admin|admin-password-setup|network-admin|soundcharts-sync|curator)(?=['"`/?])/,
  },
  {
    id: 'alt-transport',
    description: 'non-fetch transport or method override',
    pattern: /XMLHttpRequest|sendBeacon|\baxios\b|x-http-method-override|['"`]Prefer['"`]\s*:/i,
  },
  {
    id: 'service-role-public-env',
    description: 'server key read from a NEXT_PUBLIC_* variable',
    pattern: /NEXT_PUBLIC_[A-Z_]*(SERVICE|READ_KEY|SECRET)/,
  },
];

const NETWORK_CALL = /\bfetch\s*\(/;

/**
 * Remove // and /* *\/ comments while leaving string/template contents
 * intact (so `'https://…'` is not truncated).
 */
export function stripComments(source) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < source.length) {
    const c = source[i];
    const n = source[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') {
        out += n ?? '';
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '/' && n === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') out += '\n';
        i += 1;
      }
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    out += c;
    i += 1;
  }
  return out;
}

/** Scan one file's source. Returns findings with 1-based line numbers. */
export function scanSource(source, file) {
  const code = stripComments(source);
  const lines = code.split('\n');
  const findings = [];
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings.push({ file, line: index + 1, rule: rule.id, description: rule.description, text: line.trim() });
      }
    }
    if (NETWORK_CALL.test(line) && !NETWORK_ALLOWLIST.has(file)) {
      findings.push({
        file,
        line: index + 1,
        rule: 'network-outside-reader',
        description: 'network call outside the approved GET-only readers',
        text: line.trim(),
      });
    }
  });
  return findings;
}

function walk(dir, repoRoot, files) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, repoRoot, files);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(name)) files.push(relative(repoRoot, full).split(sep).join('/'));
  }
  return files;
}

export function scanRepo(repoRoot) {
  const files = SCAN_ROOTS.flatMap((root) => walk(join(repoRoot, root), repoRoot, []));
  const findings = files.flatMap((file) => scanSource(readFileSync(join(repoRoot, file), 'utf8'), file));
  return { files, findings };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const repoRoot = fileURLToPath(new URL('..', import.meta.url));
  const { files, findings } = scanRepo(repoRoot);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ scanned: files.length, findings }, null, 2));
  } else if (findings.length === 0) {
    console.log(`bridge read-only guard: OK — ${files.length} files scanned, no write paths.`);
  } else {
    console.error(`bridge read-only guard: ${findings.length} violation(s)`);
    for (const f of findings) console.error(`  ${f.file}:${f.line}  [${f.rule}] ${f.description}\n      ${f.text}`);
  }
  if (files.length === 0) {
    console.error('bridge read-only guard: scanned 0 files — refusing to pass vacuously.');
    process.exit(1);
  }
  process.exit(findings.length === 0 ? 0 : 1);
}
