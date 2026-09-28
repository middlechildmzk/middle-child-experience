# bridge-contract

Canonical **read contract** for the One Campaign pilot (Promotion Intelligence
Bridge, Architecture Pack §4).

## What this is

The shared kernel seed: TypeScript entities (Artist, Release, Track, Campaign,
PromotionTarget, TargetSource, Playlist, Curator, Submission/Pitch, Status,
Outcome, Placement, Evidence, Relationship, Metric), the provenance envelope
every normalized record carries (`source_system`, `source_id`, `source_ref`,
`observed_at`/`updated_at`, `authority`, provenance label, `evidence_ref`,
`confidence`, `note`), the `Normalized<T>` wrapper that always preserves native
raw values, and the 10-state normalized status lifecycle.

Pure types + tiny helpers. **Zero runtime dependencies.**

## Rules (§5)

- Adapters copy verbatim from sources: provenance label defaults to
  `imported`. Nothing in this package promotes a record to `verified` —
  only a source-system write or explicit human review can.
- Native statuses are mapped, never merged, never guessed. Unmapped values
  surface as `unknown` with the native value preserved.
- Missing stays missing. Never estimated.

## Ownership (§8)

This package lives in `middle-child-experience` because the pilot UI is its
only consumer in tranche one — co-location avoids premature cross-repo
package plumbing. It is explicitly designed to move to ArtistOS (or its own
versioned repo) once the §1 verdict lands and a second consumer exists.
Do not fork it; do not add a second contract.
