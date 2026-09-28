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
