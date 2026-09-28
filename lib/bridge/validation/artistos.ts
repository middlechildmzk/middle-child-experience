/**
 * ArtistOS boundary schemas — columns and CHECK constraints read from the
 * live `artistos-core` catalog (information_schema + pg_constraint)
 * 2026-09-28. Only columns the adapter selects are listed; the adapter
 * requests exactly these via an explicit select list.
 */

import { z } from 'zod';
import { zCount, zId, zStringArray, zTimestamp } from './core';

export const ARTISTOS_COLUMNS = {
  artists: ['id', 'workspace_id', 'name', 'aliases', 'genre_tags', 'spotify_url', 'created_at'],
  releases: [
    'id', 'artist_id', 'title', 'featured_artist', 'release_date', 'distributor',
    'label', 'isrc', 'upc', 'status', 'spotify_url', 'created_at', 'workspace_id',
  ],
  campaigns: [
    'id', 'release_id', 'name', 'status', 'start_date', 'end_date', 'goals',
    'created_at', 'workspace_id',
  ],
  campaign_targets: [
    'id', 'campaign_id', 'target_kind', 'target_id', 'status', 'added_at',
    'updated_at', 'notes', 'workspace_id',
  ],
  campaign_submissions: [
    'id', 'workspace_id', 'campaign_id', 'release_id', 'campaign_target_id',
    'property_id', 'professional_profile_id', 'submission_mode', 'status',
    'match_score', 'match_reasons', 'response_due_at', 'submitted_at',
    'completed_at', 'created_at', 'updated_at',
    // artist_message, fee_cents, terms intentionally NOT selected: the pilot
    // does not need them and pitch text stays out of reads until the UI
    // has a server-only rendering path.
  ],
  playlist_placements: [
    'id', 'release_id', 'platform_id', 'playlist_name', 'playlist_url',
    'external_playlist_id', 'followers', 'track_position', 'added_at',
    'removed_at', 'source_type', 'confidence', 'risk_state',
    'verification_state', 'last_verified_at', 'created_at', 'updated_at',
    // contact_name / contact_email / owner_* intentionally NOT selected (PII).
  ],
  evidence_records: [
    'id', 'artist_id', 'evidence_type', 'source_type', 'source_uri',
    'confidence', 'confidence_score', 'observed_at', 'captured_at',
    'content_hash', 'supersedes_id', 'revoked_at', 'release_id', 'campaign_id',
    'verification_level', 'verification_status', 'contradiction_state',
  ],
  outcomes: [
    'id', 'campaign_id', 'release_id', 'organization_id', 'property_id',
    'outcome_type', 'outcome_date', 'url', 'confidence', 'created_at',
  ],
} as const;

export type ArtistosTable = keyof typeof ARTISTOS_COLUMNS;

export const artistosArtistRowSchema = z.looseObject({
  id: zId,
  workspace_id: zId,
  name: z.string().min(1),
  aliases: zStringArray.nullable(),
  genre_tags: zStringArray.nullable(),
  spotify_url: z.string().nullable(),
  created_at: zTimestamp,
});

export const artistosReleaseRowSchema = z.looseObject({
  id: zId,
  artist_id: zId,
  title: z.string().min(1),
  featured_artist: z.string().nullable(),
  release_date: zTimestamp.nullable(),
  distributor: z.string().nullable(),
  label: z.string().nullable(),
  isrc: z.string().nullable(),
  upc: z.string().nullable(),
  status: z.string().min(1),
  spotify_url: z.string().nullable(),
  created_at: zTimestamp,
  workspace_id: z.string().nullable(),
});

export const artistosCampaignRowSchema = z.looseObject({
  id: zId,
  release_id: zId,
  name: z.string().min(1),
  status: z.string().min(1),
  start_date: zTimestamp.nullable(),
  end_date: zTimestamp.nullable(),
  goals: z.string().nullable(),
  created_at: zTimestamp,
  workspace_id: z.string().nullable(),
});

export const artistosCampaignTargetRowSchema = z.looseObject({
  id: zId,
  campaign_id: zId,
  target_kind: z.enum(['person', 'organization', 'property']),
  target_id: zId,
  // Native lifecycle — string, mapped via the artistos_campaign_target
  // namespace; unmapped values surface as `unknown`.
  status: z.string().min(1),
  added_at: zTimestamp,
  updated_at: zTimestamp,
  notes: z.string().nullable(),
  workspace_id: z.string().nullable(),
});

export const artistosCampaignSubmissionRowSchema = z.looseObject({
  id: zId,
  workspace_id: zId,
  campaign_id: zId,
  release_id: zId,
  campaign_target_id: zId,
  property_id: zId,
  professional_profile_id: z.string().nullable(),
  submission_mode: z.enum(['marketplace', 'outreach']),
  status: z.string().min(1),
  match_score: z.number().int().min(0).max(100),
  match_reasons: z.unknown(),
  response_due_at: zTimestamp.nullable(),
  submitted_at: zTimestamp.nullable(),
  completed_at: zTimestamp.nullable(),
  created_at: zTimestamp,
  updated_at: zTimestamp,
});

export const artistosPlacementRowSchema = z.looseObject({
  id: zId,
  release_id: z.string().nullable(),
  platform_id: z.string().nullable(),
  playlist_name: z.string().min(1),
  playlist_url: z.string().nullable(),
  external_playlist_id: z.string().nullable(),
  // bigint; NULL on all 57 live rows 2026-09-28. This is the playlist's
  // follower count at last observation — NOT at placement time.
  followers: zCount.nullable(),
  track_position: z.number().int().nullable(),
  added_at: zTimestamp.nullable(),
  removed_at: zTimestamp.nullable(),
  source_type: z.string().min(1),
  confidence: z.number().min(0).max(1).nullable(),
  risk_state: z.string().min(1),
  verification_state: z.string().min(1),
  last_verified_at: zTimestamp.nullable(),
  created_at: zTimestamp,
  updated_at: zTimestamp,
});

export const artistosEvidenceRowSchema = z.looseObject({
  id: zId,
  artist_id: z.string().nullable(),
  evidence_type: z.string().min(1),
  source_type: z.enum(['url', 'api_response', 'uploaded_file', 'human_attestation', 'system_observation']),
  source_uri: z.string().nullable(),
  // Live column is TEXT with a CHECK (verified|supported|weak|unknown) —
  // not a number. The numeric score lives in confidence_score.
  confidence: z.enum(['verified', 'supported', 'weak', 'unknown']),
  confidence_score: z.number().min(0).max(1).nullable(),
  observed_at: zTimestamp,
  captured_at: zTimestamp,
  content_hash: z.string().nullable(),
  supersedes_id: z.string().nullable(),
  revoked_at: zTimestamp.nullable(),
  release_id: z.string().nullable(),
  campaign_id: z.string().nullable(),
  verification_level: z.string().min(1),
  verification_status: z.enum(['pending', 'verified', 'failed', 'expired', 'superseded']),
  contradiction_state: z.enum(['clear', 'possible', 'conflicting', 'resolved']),
});

export const artistosOutcomeRowSchema = z.looseObject({
  id: zId,
  campaign_id: z.string().nullable(),
  release_id: z.string().nullable(),
  organization_id: z.string().nullable(),
  property_id: z.string().nullable(),
  // Live values: press_mention | playlist_add | creator_use. No CHECK
  // constraint exists, so validated as a string.
  outcome_type: z.string().min(1),
  outcome_date: zTimestamp.nullable(),
  url: z.string().nullable(),
  confidence: z.string().nullable(),
  created_at: zTimestamp,
});

export type ArtistosArtistRow = z.infer<typeof artistosArtistRowSchema>;
export type ArtistosReleaseRow = z.infer<typeof artistosReleaseRowSchema>;
export type ArtistosCampaignRow = z.infer<typeof artistosCampaignRowSchema>;
export type ArtistosCampaignTargetRow = z.infer<typeof artistosCampaignTargetRowSchema>;
export type ArtistosCampaignSubmissionRow = z.infer<typeof artistosCampaignSubmissionRowSchema>;
export type ArtistosPlacementRow = z.infer<typeof artistosPlacementRowSchema>;
export type ArtistosEvidenceRow = z.infer<typeof artistosEvidenceRowSchema>;
export type ArtistosOutcomeRow = z.infer<typeof artistosOutcomeRowSchema>;
