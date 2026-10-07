// `partner` is a routing/storage category, not a claim of independence.
type CuratedPlaylist = {
  network_owner_type?: string;
  bvss_curator_profiles?: { handle?: string; display_name?: string } | null;
};

/** Curator profiles (no playlist context): is this the in-house CuratorOS team? */
export function isHouseCurator(handle: string | null | undefined) {
  return handle === 'curatoros';
}

export function isCuratorOS(playlist: CuratedPlaylist) {
  return playlist.network_owner_type === 'partner'
    && playlist.bvss_curator_profiles?.handle === 'curatoros';
}

export function playlistCuratorName(playlist: CuratedPlaylist) {
  if (playlist.network_owner_type === 'bvss') return 'BVSS FVM';
  if (isCuratorOS(playlist)) return 'CuratorOS';
  return playlist.bvss_curator_profiles?.display_name || 'Verified playlist curator';
}

export function playlistCuratorLabel(playlist: CuratedPlaylist) {
  return isCuratorOS(playlist)
    ? 'CuratorOS · In-house curation team'
    : playlistCuratorName(playlist);
}

export function routingConsent(playlists: CuratedPlaylist[]) {
  const partners = playlists.filter((p) => p.network_owner_type === 'partner');
  const house = partners.some(isCuratorOS);
  const otherNames = [...new Set(partners.filter((p) => !isCuratorOS(p)).map(playlistCuratorName))];
  return {
    available: partners.length > 0,
    label: house ? (otherNames.length ? 'Also send to matched CuratorOS and other curator playlists' : 'Also send to matched CuratorOS playlists') : 'Also send to matched curator playlists',
    detail: [
      house ? 'The in-house CuratorOS team may receive your song when it fits.' : '',
      otherNames.length ? 'Other eligible recipients: ' + otherNames.join(', ') + '.' : '',
      'Optional. Only verified, routing-enabled playlists. No guaranteed placement.',
    ].filter(Boolean).join(' '),
  };
}
