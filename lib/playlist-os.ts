
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
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error('Playlist registry unavailable');
  const body = await response.json();
  return body.playlists || [];
}

export async function getPlaylist(slug: string): Promise<{ playlist: PlaylistRecord; highlights: PlaylistTrack[] } | null> {
  const response = await fetch(playlistApiBase + '/bvss-playlists?slug=' + encodeURIComponent(slug), {
    next: { revalidate: 300 },
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
