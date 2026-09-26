import { playlistApiBase } from './playlist-os';

export type PublicCurator = {
  curator_id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  website_url: string | null;
  spotify_profile_url: string | null;
  social_links: Record<string, string>;
  genres: string[];
  moods: string[];
  verified_playlist_count: number;
  reviews_completed: number;
  accepted_count: number;
  rejected_count: number;
  held_count: number;
  median_response_hours: number | null;
  active_placements: number;
};

export type PublicCuratorPlaylist = {
  id: string;
  slug: string;
  spotify_playlist_id: string;
  spotify_url: string;
  canonical_name: string;
  subtitle: string;
  description: string;
  cover_asset_url: string | null;
  primary_genre: string;
  secondary_genres: string[];
  moods: string[];
  activities: string[];
  anchor_artists: string[];
  submission_status: 'open' | 'paused' | 'closed';
  update_cadence: string;
  curator_id: string;
  curator_handle: string;
  curator_name: string;
};

export async function getPublicCurators(): Promise<PublicCurator[]> {
  const response = await fetch(playlistApiBase + '/bvss-curators-public', { cache: 'no-store' });
  if (!response.ok) return [];
  const body = await response.json();
  return body.curators || [];
}

export async function getPublicCurator(handle: string): Promise<{ curator: PublicCurator; playlists: PublicCuratorPlaylist[] } | null> {
  const response = await fetch(
    playlistApiBase + '/bvss-curators-public?handle=' + encodeURIComponent(handle),
    { cache: 'no-store' },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Curator profile unavailable');
  return response.json();
}
