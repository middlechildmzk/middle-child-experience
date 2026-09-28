/**
 * BVSS boundary schemas — shapes from lib/playlist-os.ts, lib/curator-network.ts
 * and live `bvss_playlists` / `bvss_playlist_metric_snapshots` rows
 * (read 2026-09-28). Nullable where the live data or the repo type allows it.
 */

import { z } from 'zod';
import { zCount, zId, zStringArray, zTimestamp } from './core';

export const bvssPlaylistRecordSchema = z.looseObject({
  id: zId,
  slug: z.string().min(1),
  spotify_playlist_id: z.string(),
  spotify_url: z.string(),
  canonical_name: z.string().min(1),
  primary_genre: z.string(),
  secondary_genres: zStringArray,
  moods: zStringArray,
  anchor_artists: zStringArray,
  current_track_count: zCount.nullable(),
  current_follower_count: zCount.nullable(),
  follower_count_source: z.string().nullable(),
  follower_count_observed_at: zTimestamp.nullable(),
  submission_status: z.enum(['open', 'paused', 'closed']),
  update_cadence: z.string(),
  middle_child_eligible: z.boolean(),
  subflower_eligible: z.boolean(),
  lifecycle_state: z.enum(['active', 'experimental', 'archived']),
  submission_criteria: z.string().nullable().optional(),
  updated_at: zTimestamp,
  network_owner_type: z.enum(['bvss', 'partner']),
  curator_id: z.string().nullable(),
  verification_status: z.enum(['unverified', 'pending', 'verified', 'rejected']),
});

export const bvssPlaylistTrackSchema = z.looseObject({
  spotify_track_id: zId,
  track_name: z.string().nullable(),
  artists: zStringArray,
  spotify_url: z.string().nullable(),
});

export const bvssPlaylistsResponseSchema = z.looseObject({
  playlists: z.array(z.unknown()).optional(),
});

export const bvssPlaylistDetailResponseSchema = z.looseObject({
  playlist: z.unknown().optional(),
  highlights: z.array(z.unknown()).optional(),
});

export const bvssPublicCuratorSchema = z.looseObject({
  curator_id: zId,
  handle: z.string().min(1),
  display_name: z.string().min(1),
  bio: z.string().nullable(),
  website_url: z.string().nullable(),
  spotify_profile_url: z.string().nullable(),
  social_links: z.record(z.string(), z.string()),
  genres: zStringArray,
  moods: zStringArray,
  verified_playlist_count: zCount,
  reviews_completed: zCount,
  accepted_count: zCount,
  rejected_count: zCount,
  held_count: zCount,
  median_response_hours: z.number().nonnegative().nullable(),
  active_placements: zCount,
});

export const bvssPublicCuratorPlaylistSchema = z.looseObject({
  id: zId,
  slug: z.string().min(1),
  spotify_playlist_id: z.string(),
  spotify_url: z.string(),
  canonical_name: z.string().min(1),
  primary_genre: z.string(),
  secondary_genres: zStringArray,
  moods: zStringArray,
  anchor_artists: zStringArray,
  submission_status: z.enum(['open', 'paused', 'closed']),
  update_cadence: z.string(),
  curator_id: zId,
});

export const bvssCuratorsResponseSchema = z.looseObject({
  curators: z.array(z.unknown()).optional(),
});

export const bvssCuratorDetailResponseSchema = z.looseObject({
  curator: z.unknown().optional(),
  playlists: z.array(z.unknown()).optional(),
});

export const bvssTrackLookupHitSchema = z.looseObject({
  spotify_track_id: z.string().optional(),
  title: z.string().optional(),
  track_name: z.string().optional(),
  artist_name: z.string().nullable().optional(),
  spotify_url: z.string().optional(),
});

export const bvssTrackLookupResponseSchema = z.looseObject({
  tracks: z.array(z.unknown()).optional(),
  results: z.array(z.unknown()).optional(),
});

/** Tokenized status payload: schema unconfirmed — only require an object. */
export const bvssSubmissionStatusResponseSchema = z.looseObject({});

export const bvssMetricSnapshotRowSchema = z.looseObject({
  id: zId,
  playlist_id: zId,
  metric_date: zTimestamp,
  followers: zCount.nullable(),
  // 4,288 of ~4,347 live rows have track_count NULL (2026-09-28): nullable.
  track_count: zCount.nullable(),
  source: z.string().min(1),
  source_ref: z.string().nullable().optional(),
  observed_at: zTimestamp,
});
