// Public wording for who programs a playlist. One place, so no surface calls
// the in-house team "independent".
//
// Registry facts (verified 2026-10-07): network_owner_type 'bvss' = BVSS FVM;
// 'partner' = the CuratorOS curator profile, an in-house team that operates
// alongside BVSS FVM. No external curator has been approved. The registry has no
// ownership column for curators, so in-house profiles are listed here; any
// other approved partner curator is described as independent.
export const IN_HOUSE_CURATOR_HANDLES = new Set(['curatoros']);

export const CURATOROS_DESCRIPTION = 'the in-house CuratorOS team, which operates alongside BVSS FVM';

export type Ownership = 'bvss' | 'in_house' | 'external';

export function curatorOwnership(handle: string | null | undefined): Exclude<Ownership, 'bvss'> {
  // A partner playlist with no public profile can only be CuratorOS today.
  if (!handle || IN_HOUSE_CURATOR_HANDLES.has(handle)) return 'in_house';
  return 'external';
}

export function playlistOwnership(playlist: {
  network_owner_type: 'bvss' | 'partner';
  bvss_curator_profiles?: { handle?: string | null } | null;
}): Ownership {
  if (playlist.network_owner_type !== 'partner') return 'bvss';
  return curatorOwnership(playlist.bvss_curator_profiles?.handle);
}

/** Short label, e.g. for cards: "BVSS FVM", "CuratorOS (in-house team)", "Name (independent curator)". */
export function ownershipLabel(
  ownership: Ownership,
  curatorName?: string | null,
) {
  if (ownership === 'bvss') return 'BVSS FVM';
  if (ownership === 'in_house') return (curatorName || 'CuratorOS') + ' (in-house team)';
  return (curatorName || 'Curator') + ' (independent curator)';
}
