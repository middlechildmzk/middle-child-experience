# BVSS migrations in the shared artistos-core ledger

These migrations are applied to the shared `artistos-core` Supabase project.
The ordered authority for every migration in that ledger, whichever repository
owns it, is `supabase/CROSS_REPO_MIGRATION_MANIFEST.json` in
[middlechildmzk/artistos](https://github.com/middlechildmzk/artistos).

## Adding a BVSS migration

1. Write the migration here on a branch.
2. Open a PR in **artistos** that adds it to `pending` in the manifest
   (`proposed_version`, `name`, `owning_repository: middle-child-experience`,
   `repository_path`, `tranche`, `status: not_applied`, `canonical_sha256`).
   ArtistOS CI passes while the file has not landed here yet; it reports the
   entry as "pending, not yet landed".
3. Merge the artistos PR.
4. This repository's CI (`foundation-tests.yml`) checks every migration file
   here against the manifest on artistos `main`: an undeclared file or a hash
   mismatch fails. Once step 3 is merged, merge this PR.
5. After the migration is applied to production, recapture the ledger in
   artistos (see its `supabase/migrations/README.md`) so the entry moves from
   `pending` to `applied`.

Editing a declared migration after step 3 changes its canonical hash; update
the manifest entry in artistos first.
