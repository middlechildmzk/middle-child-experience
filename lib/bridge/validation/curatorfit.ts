/**
 * CuratorFit boundary schemas — from middlechildmzk/curatorfit
 * supabase/schema.sql (V1.1, repo HEAD c675dd3).
 *
 * LIVE STATUS (2026-09-28): no CuratorFit database is deployed. None of
 * `promotion_targets`, `curator_profiles`, `submissions`, `tracks` exist in
 * any connected Supabase project (artistos-core checked via
 * information_schema). `campaigns` / `campaign_targets` in artistos-core are
 * ArtistOS tables with different columns — never read them as CuratorFit.
 * These schemas therefore describe the DDL shape, not an observed read shape.
 */

import { z } from 'zod';
import { zCount, zId, zStringArray, zTimestamp } from './core';

/** schema.sql enums, verbatim. */
export const CURATORFIT_TARGET_TYPE = [
  'spotify_playlist', 'soundcloud_channel', 'youtube_channel', 'tiktok_creator',
  'blog', 'radio', 'label', 'sync_library',
] as const;
export const CURATORFIT_TARGET_STATUS = [
  'seed', 'unclaimed', 'claimed', 'verified', 'partner', 'approved',
  'needs_info', 'paused', 'opted_out', 'rejected', 'removed',
] as const;
export const CURATORFIT_RISK_LEVEL = ['low', 'medium', 'review', 'blocked'] as const;

export const CURATORFIT_COLUMNS = {
  promotion_targets: [
    'id', 'curator_id', 'type', 'external_id', 'url', 'slug', 'name',
    'description', 'genre', 'genres', 'moods', 'fit_tags', 'audience_size_label',
    'audience_count', 'contact_method', 'submission_rules', 'fit_notes',
    'risk_notes', 'source_url', 'verification_notes', 'last_reviewed_at',
    'status', 'risk_level', 'trust_score', 'update_signal', 'last_checked_at',
    'created_at', 'updated_at',
  ],
  curator_profiles: [
    'id', 'display_name', 'bio', 'website_url', 'instagram_url', 'tiktok_url',
    'youtube_url', 'accepted_genres', 'accepted_channels', 'hard_nos', 'status',
    'created_at', 'updated_at',
    // contact_email intentionally NOT selected (PII).
  ],
  campaign_targets: [
    'id', 'campaign_id', 'promotion_target_id', 'playlist_id', 'channel',
    'fit_score', 'pitch_status', 'response_notes', 'follow_up_at', 'created_at',
    // pitch_text intentionally NOT selected until a server-only render path exists.
  ],
  submissions: [
    'id', 'campaign_id', 'promotion_target_id', 'playlist_id', 'status',
    'curator_feedback', 'submitted_at', 'reviewed_at', 'created_at',
  ],
} as const;

export type CuratorfitTable = keyof typeof CURATORFIT_COLUMNS;

export const curatorfitPromotionTargetRowSchema = z.looseObject({
  id: zId,
  curator_id: z.string().nullable(),
  type: z.enum(CURATORFIT_TARGET_TYPE),
  external_id: z.string().nullable(),
  url: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  genre: z.string().nullable(),
  genres: zStringArray.nullable(),
  moods: zStringArray.nullable(),
  fit_tags: zStringArray.nullable(),
  audience_size_label: z.string().nullable(),
  audience_count: zCount.nullable(),
  contact_method: z.string().nullable(),
  submission_rules: z.string().nullable(),
  fit_notes: z.string().nullable(),
  risk_notes: z.string().nullable(),
  source_url: z.string().nullable(),
  verification_notes: z.string().nullable(),
  last_reviewed_at: zTimestamp.nullable(),
  status: z.enum(CURATORFIT_TARGET_STATUS),
  risk_level: z.enum(CURATORFIT_RISK_LEVEL),
  trust_score: z.number().int().min(0).max(100),
  update_signal: z.string().nullable(),
  last_checked_at: zTimestamp.nullable(),
  created_at: zTimestamp,
  updated_at: zTimestamp,
});

export const curatorfitCuratorProfileRowSchema = z.looseObject({
  id: zId,
  display_name: z.string().min(1),
  bio: z.string().nullable(),
  website_url: z.string().nullable(),
  instagram_url: z.string().nullable(),
  tiktok_url: z.string().nullable(),
  youtube_url: z.string().nullable(),
  accepted_genres: zStringArray.nullable(),
  accepted_channels: z.array(z.enum(CURATORFIT_TARGET_TYPE)).nullable(),
  hard_nos: zStringArray.nullable(),
  status: z.enum(CURATORFIT_TARGET_STATUS),
  created_at: zTimestamp,
  updated_at: zTimestamp,
});

export const curatorfitCampaignTargetRowSchema = z.looseObject({
  id: zId,
  campaign_id: zId,
  promotion_target_id: zId,
  playlist_id: z.string().nullable(),
  channel: z.enum(CURATORFIT_TARGET_TYPE).nullable(),
  fit_score: z.number().int(),
  // Native `submission_status` enum — string here so unmapped values
  // surface as `unknown` instead of failing the read.
  pitch_status: z.string().min(1),
  response_notes: z.string().nullable(),
  follow_up_at: zTimestamp.nullable(),
  created_at: zTimestamp,
});

export const curatorfitSubmissionRowSchema = z.looseObject({
  id: zId,
  campaign_id: z.string().nullable(),
  promotion_target_id: z.string().nullable(),
  playlist_id: z.string().nullable(),
  status: z.string().min(1),
  curator_feedback: z.string().nullable(),
  submitted_at: zTimestamp.nullable(),
  reviewed_at: zTimestamp.nullable(),
  created_at: zTimestamp,
});

export type CuratorfitPromotionTargetRow = z.infer<typeof curatorfitPromotionTargetRowSchema>;
export type CuratorfitCuratorProfileRow = z.infer<typeof curatorfitCuratorProfileRowSchema>;
export type CuratorfitCampaignTargetRow = z.infer<typeof curatorfitCampaignTargetRowSchema>;
export type CuratorfitSubmissionRow = z.infer<typeof curatorfitSubmissionRowSchema>;
