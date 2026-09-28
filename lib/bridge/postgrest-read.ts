/**
 * GET-only PostgREST reader shared by the ArtistOS and CuratorFit adapters.
 *
 * Why not supabase-js here: the client exposes insert/update/upsert/delete/
 * rpc on the same object, so "read-only" would be a convention. This reader
 * can only issue HTTP GET against `/rest/v1/<table>` — there is no code path
 * that sends a body or a state-changing method. CI (scripts/check-bridge-
 * readonly.mjs) enforces that no mutation path is introduced under
 * lib/bridge/.
 *
 * Server-only: read keys (service_role or a read-scoped key) never reach a
 * client bundle. Env vars used by callers are deliberately NOT
 * `NEXT_PUBLIC_*`.
 */

import './server-only';

export interface PostgrestReadConfig {
  /** Project base URL, e.g. https://<ref>.supabase.co */
  url: string;
  /** Server-side key. Never a NEXT_PUBLIC_* value. */
  key: string;
}

export interface PostgrestReadQuery {
  /** Table or view name. Validated against a strict identifier pattern. */
  table: string;
  /** Explicit column list — never `*`, so reads are reviewable and PII
   *  columns (contact_email, etc.) are opted into, not leaked. */
  columns: readonly string[];
  /** Simple equality filters: column → value (sent as `eq.`). */
  eq?: Record<string, string>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

export class PostgrestReadError extends Error {
  readonly status?: number;
  readonly table: string;
  constructor(table: string, message: string, status?: number) {
    super(`PostgREST read: ${table}: ${message}`);
    this.name = 'PostgrestReadError';
    this.table = table;
    this.status = status;
  }
}

const IDENT = /^[a-z_][a-z0-9_]*$/;

function assertIdent(value: string, what: string, table: string): void {
  if (!IDENT.test(value)) {
    throw new PostgrestReadError(table, `invalid ${what}: ${JSON.stringify(value)}`);
  }
}

/** Build the GET URL. Exported for tests. */
export function buildReadUrl(config: PostgrestReadConfig, query: PostgrestReadQuery): string {
  const { table } = query;
  assertIdent(table, 'table', table);
  if (query.columns.length === 0) {
    throw new PostgrestReadError(table, 'explicit column list required');
  }
  query.columns.forEach((c) => assertIdent(c, 'column', table));
  const params = new URLSearchParams();
  params.set('select', query.columns.join(','));
  for (const [column, value] of Object.entries(query.eq ?? {})) {
    assertIdent(column, 'filter column', table);
    params.set(column, `eq.${value}`);
  }
  if (query.order) {
    assertIdent(query.order.column, 'order column', table);
    params.set('order', `${query.order.column}.${query.order.ascending === false ? 'desc' : 'asc'}`);
  }
  if (query.limit !== undefined) {
    if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 1000) {
      throw new PostgrestReadError(table, `limit out of range: ${query.limit}`);
    }
    params.set('limit', String(query.limit));
  }
  return `${config.url.replace(/\/+$/, '')}/rest/v1/${table}?${params.toString()}`;
}

/**
 * Read rows. Returns `unknown[]` on purpose: callers MUST validate at the
 * boundary (lib/bridge/validation) before normalizing.
 */
export async function readRows(
  config: PostgrestReadConfig,
  query: PostgrestReadQuery,
): Promise<unknown[]> {
  const url = buildReadUrl(config, query);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: 'application/json',
      },
    });
  } catch (cause) {
    throw new PostgrestReadError(query.table, `network failure: ${String(cause)}`);
  }
  if (!response.ok) {
    throw new PostgrestReadError(query.table, `HTTP ${response.status}`, response.status);
  }
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) {
    throw new PostgrestReadError(query.table, 'expected a JSON array of rows');
  }
  return payload;
}
