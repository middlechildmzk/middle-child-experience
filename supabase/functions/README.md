# BVSS deployed Edge Functions — source parity snapshot

These 12 function sources were recovered directly from the deployed Supabase project `artistos-core` (`myrtdfyjoxvtubusrrmf`) during the 2026-09-28 integration pass.

## Safety boundary

This directory is a **source-control recovery snapshot**. Recovery did not redeploy, modify, or invoke any mutating function. Before any future deployment, compare the deployed function version + `ezbr_sha256` against `DEPLOYED_MANIFEST.json` and review the diff explicitly.

Supabase reports `verify_jwt=false` for all 12 functions. That does **not** mean all 12 are public. The deployed source implements the effective access boundary at application level.

## Effective access classes

| Function | Effective boundary | Mutates |
|---|---|---:|
| bvss-playlists | public GET | no |
| bvss-submit | public POST, IP/UA-hash rate limit | yes |
| bvss-event | public POST analytics event | yes |
| bvss-admin | bearer user JWT + bvss_admin_users membership | yes |
| bvss-media | public rate-limited upload-slot action; authenticated/authorized download action | yes |
| bvss-curator | bearer user JWT; curator-scoped actions | yes |
| bvss-curators-public | public GET | no |
| bvss-submission-status | public GET with high-entropy artist status token | no |
| bvss-network-admin | bearer user JWT + bvss_admin_users membership | yes |
| bvss-track-lookup | public GET; Spotify credentials remain server-side | no |
| bvss-soundcharts-sync | POST with x-bvss-sync-token checked by SHA-256 | yes |
| bvss-admin-password-setup | allowed origin + one-time setup token + admin membership | yes |

## Notable audit findings

- `bvss-admin`, `bvss-network-admin`, and `bvss-curator` perform explicit Supabase user-token validation even though platform JWT verification is disabled.
- `bvss-soundcharts-sync` uses a dedicated sync token whose hash is stored in BVSS integration configuration.
- `bvss-submit` and public upload-slot creation use persisted rate-limit rows keyed by a SHA-256 requester fingerprint.
- `bvss-event` is intentionally public but currently has no comparable persisted rate limit; abuse would primarily pollute first-party analytics rather than grant data access.
- `bvss-submission-status` uses the submission's UUID status token as its capability boundary.
- The functions use service-role access internally, so keeping exact deployed source in version control is important for future security review.

## Deployment rule

Do not treat presence in this directory as authorization to deploy. A future deploy should require:

1. deployed version/hash comparison;
2. reviewed source diff;
3. auth-boundary review for the affected function;
4. explicit production approval.
