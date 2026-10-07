
import type { FollowerHealth } from './source-health';

export const playlistApiBase =
  process.env.NEXT_PUBLIC_BVSS_API_BASE ||
  'https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1';

export const supabaseUrl =
  process.env.NEXT_PUBLIC_BVSS_SUPABASE_URL ||
  'https://myrtdfyjoxvtubusrrmf.supabase.co';

export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_BVSS_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_128ongB0ItsEwmef_F1zTg_YnxFX6M8';

export type PlaylistRecord = {
  id: string;
  slug: string;
  spotify_playlist_id: string;
  spotify_uri: string;
  spotify_url: string;
  canonical_name: string;
  subtitle: string;
  description: string;
  cover_asset_url: string | null;
  primary_genre: string;
  secondary_genres: string[];
  moods: string[];
  activities: string[];
  seo_keywords: string[];
  anchor_artists: string[];
  target_track_count: number;
  current_track_count: number | null;
  current_follower_count: number | null;
  follower_count_source: string | null;
  follower_count_observed_at: string | null;
  /** Source health for followers; absent until the provenance migration is live. */
  follower_health?: FollowerHealth | null;
  last_editorial_update_at: string | null;
  submission_status: 'open' | 'paused' | 'closed';
  update_cadence: string;
  middle_child_eligible: boolean;
  subflower_eligible: boolean;
  lifecycle_state: 'active' | 'experimental' | 'archived';
  curation_philosophy: string;
  submission_criteria: string;
  display_order: number;
  updated_at: string;
  network_owner_type: 'bvss' | 'partner';
  curator_id: string | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  network_routing_enabled: boolean;
  bvss_curator_profiles?: {
    handle: string;
    display_name: string;
    status: string;
    public_profile: boolean;
  } | null;
};

export type PlaylistTrack = {
  spotify_track_id: string;
  track_name: string | null;
  artists: string[];
  spotify_url: string | null;
  artwork_url: string | null;
  position: number | null;
  added_at: string | null;
};

export async function getPlaylists(): Promise<PlaylistRecord[]> {
  const response = await fetch(playlistApiBase + '/bvss-playlists', {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Playlist registry unavailable');
  const body = await response.json();
  return body.playlists || [];
}

export async function getPlaylist(slug: string): Promise<{ playlist: PlaylistRecord; highlights: PlaylistTrack[] } | null> {
  const response = await fetch(playlistApiBase + '/bvss-playlists?slug=' + encodeURIComponent(slug), {
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Playlist unavailable');
  return response.json();
}

export function relatedPlaylists(current: PlaylistRecord, all: PlaylistRecord[]) {
  const currentGenres = new Set([current.primary_genre, ...current.secondary_genres].map((value) => value.toLowerCase()));
  return all
    .filter((item) => item.id !== current.id)
    .map((item) => {
      const genres = [item.primary_genre, ...item.secondary_genres].map((value) => value.toLowerCase());
      const genreOverlap = genres.filter((value) => currentGenres.has(value)).length;
      const moodOverlap = item.moods.filter((value) => current.moods.map((m) => m.toLowerCase()).includes(value.toLowerCase())).length;
      return { item, affinity: genreOverlap * 3 + moodOverlap };
    })
    .sort((a, b) => b.affinity - a.affinity || a.item.display_order - b.item.display_order)
    .slice(0, 4)
    .map(({ item }) => item);
}

/**
 * Public network counts, always derived from the live registry.
 * BVSS FVM = network_owner_type 'bvss'; CuratorOS = 'partner' (one house
 * curator profile today, so never describe these as independent curators).
 * Returns null when the registry could not be read: callers must then omit
 * numbers rather than print a fallback.
 */
export function networkSummary(playlists: PlaylistRecord[]) {
  const active = playlists.filter((playlist) => playlist.lifecycle_state === 'active');
  if (!active.length) return null;
  const bvss = active.filter((playlist) => playlist.network_owner_type === 'bvss').length;
  const curatorOS = active.filter((playlist) => playlist.network_owner_type === 'partner').length;
  const openForSubmissions = active.filter((playlist) => playlist.submission_status === 'open').length;
  return { total: active.length, bvss, curatorOS, openForSubmissions };
}

export function describeNetwork(summary: NonNullable<ReturnType<typeof networkSummary>>) {
  if (!summary.curatorOS) return summary.total + ' BVSS FVM playlists';
  if (!summary.bvss) return summary.total + ' CuratorOS playlists';
  return summary.total + ' playlists across BVSS FVM (' + summary.bvss + ') and CuratorOS (' + summary.curatorOS + ')';
}
