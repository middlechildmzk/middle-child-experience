# bridge/adapters

Read-only adapters for the One Campaign pilot (Architecture Pack §7).
Each adapter is a separate module with its own source assumptions.

## bvss.ts — BVSS adapter

Reads from the deployed BVSS edge functions on `artistos-core`
(`myrtdfyjoxvtubusrrmf`), normalizing into `bridge-contract` types.

**Source assumptions (empirical audit 2026-09-28):**
- `bvss-playlists` — intentionally public GET (`/`, `/?slug=`). The
  playlist registry; AUTHORITATIVE (§1).
- `bvss-curators-public` — intentionally public GET (`/`, `/?handle=`).
  Curator directory; underlying tables are schema-only (0 rows live),
  so response stats may be zero.
- `bvss-track-lookup` — intentionally public GET (`/?q=`, `/?url=`).
  Response shape confirmed against the repo's own client type
  (SubmissionForm.tsx): singular `artist_name`, artwork, release date,
  explicit flag, album name — no `artists: string[]`. Artist credit maps
  to `Track.artist_credit`, never to `tags`. Authority `unresolved`
  (no canonical track table exists).
- `bvss-submission-status` — tokenized-public GET (`/?token=`). Schema
  unconfirmed; returned verbatim with provenance, NOT mapped to
  `SubmissionPitch` in tranche one.
- `bvss_playlist_metric_snapshots` / `bvss_playlist_placements` have no
  public endpoint. Their normalizers accept server-side rows
  (service_role reads stay server-side, §7.2). Placements are schema-only
  (0 rows live) — the normalizer maps only present fields.

**Never called here:** `bvss-admin`, `bvss-curator`, `bvss-network-admin`
(authenticated), `bvss-submit` / `bvss-event` / `bvss-media` (writes),
`bvss-soundcharts-sync` (service endpoint). See the module docstring for
the read-only guarantee.

**Server-only:** `bvss.ts` imports `../server-only`, which throws at
module evaluation in any client bundle — a Client Component cannot
accidentally pull the adapter (and future submission-status tokens /
service-role reads) into the browser. Deliberate stand-in for the
`server-only` npm package to avoid a new dependency in tranche one.

**Status mapping:** source-namespaced via `mapNativeStatus(native, source)`
in `bridge-contract` — BVSS / CuratorFit / ArtistOS vocabularies are
disjoint. ArtistOS values verified against the live migration DDL
(2026-09-28). Unknown stays unknown.

**Open items:** per-route rate-limit enforcement on the public endpoints
is PENDING-SOURCE (function source not exposed by the Management API).

---

## Tranche 2 — shared rules

- **Validation first.** Every external response/row is parsed with zod
  (`lib/bridge/validation/*`) before a normalizer sees it. Objects are
  loose (unknown native columns pass through to `raw`); native lifecycle
  statuses are strings so unmapped values become `unknown`, never a failed
  read; closed unions typed in the contract are enforced. One bad row fails
  the whole read with its index — no silent drops.
- **GET-only reads.** ArtistOS and CuratorFit go through
  `../postgrest-read.ts` (HTTP GET, explicit column lists, strict
  identifiers, no `*`). No supabase-js in the bridge.
- **CI guard.** `npm run bridge:check-readonly`
  (`scripts/check-bridge-readonly.mjs`, run by
  `.github/workflows/bridge-guard.yml`) fails on non-GET methods, request
  bodies, supabase-js, `.insert/.update/.upsert/.delete/.rpc`, write-capable
  BVSS edge functions, alternate transports, `NEXT_PUBLIC_*` server keys, and
  any `fetch(` outside `postgrest-read.ts` / `bvss.ts`. Self-tested in
  `tests/bridge/readonly-guard.test.mjs`.

## artistos.ts — ArtistOS adapter

Verdict **PARTIALLY AUTHORITATIVE** (`ARTISTOS_AUTHORITY_VERDICT`; flip only
when the migration-ledger reconciliation lands).

| Table | Live rows 2026-09-28 | Contract | Authority |
|---|---|---|---|
| artists | 2 | Artist | source-of-record |
| releases | 2 | Release | source-of-record |
| campaigns | 1 | Campaign | unresolved (pilot manifest owns campaign identity) |
| campaign_targets | 0 | SubmissionPitch (`artistos_campaign_target` namespace) | unresolved |
| campaign_submissions | 0 | SubmissionPitch (`artistos` namespace) | unresolved |
| playlist_placements | 57 | Placement | source-of-record |
| evidence_records | 27 | Evidence | source-of-record |
| outcomes | 19 | `ArtistosOutcomeRecord` (adapter-local — contract gap) | unresolved |

Config: `ARTISTOS_READ_KEY` (server-only, required) and optional
`ARTISTOS_SUPABASE_URL`. No anon-key fallback — RLS would return empty sets
that look like "no data".

Deliberate non-mappings: `playlist_placements.followers` is the playlist's
count at last observation, so it is **not** mapped to
`follower_count_at_placement`; `evidence_records.confidence` is a text grade,
so contract `confidence` comes from `confidence_score`; ArtistOS's native
`verification_state = 'verified'` is preserved but never promotes the
provenance label; `campaign_submissions.response_due_at` is not a follow-up
date. PII columns (`contact_*`, `owner_*`) and pitch text are never selected.

## curatorfit.ts — CuratorFit adapter

**Design-dormant** (`CURATORFIT_STATUS`). No CuratorFit database is
deployed: its tables exist in no connected Supabase project. Row schemas are
the repo DDL (`supabase/schema.sql` @ c675dd3). Every record is authority
`unresolved`; CuratorFit is not campaign authority.

Fetchers require `CURATORFIT_SUPABASE_URL` + `CURATORFIT_READ_KEY` and
refuse artistos-core outright (its `campaigns` / `campaign_targets` are
ArtistOS tables). Normalizers are usable today on DDL-shaped rows.

`trust_score` / `risk_level` / `risk_notes` have no contract field yet —
preserved in `raw` and summarized in the provenance note. `trust_score` is
not source confidence and is never mapped to `provenance.confidence`.
