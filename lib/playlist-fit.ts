// Playlist Fit Checker: one pure, deterministic matcher shared by every
// surface that suggests playlists from a song description.
//
// Inputs are the artist's own description (genre, up to 3 moods, optional
// listening moment). Matching uses only canonical registry fields. It never
// uses follower counts, audio analysis or any acceptance signal, and the
// result is a fit label, not a quality or acceptance prediction.
import type { PlaylistRecord } from './playlist-os';

export const MAX_MOODS = 3;
export const TOP_RESULTS = 5;

/** Hidden weights. Order of strength is part of the product contract (tests cover it). */
export const FIT_WEIGHTS = {
  primaryGenre: 80,
  secondaryGenre: 30,
  mood: 10,
  activity: 10,
} as const;

export type FitLabel = 'Strong fit' | 'Good fit' | 'Possible fit';
const LABEL_ORDER: Record<FitLabel, number> = { 'Strong fit': 0, 'Good fit': 1, 'Possible fit': 2 };

export type FitInput = {
  genre: string;
  moods?: string[];
  activity?: string;
  /** Optional. Only used to respect a playlist's own accepts_unreleased rule. */
  releaseState?: 'released' | 'unreleased';
};

/** Routing fields the public registry may expose; absent means no restriction. */
type RoutingFields = {
  accepts_unreleased?: boolean | null;
  hard_no_tags?: string[] | null;
};

export type FitPlaylist = PlaylistRecord & RoutingFields;

export type FitReason = { kind: 'primaryGenre' | 'secondaryGenre' | 'mood' | 'activity'; values: string[] };

export type FitResult = {
  playlist: FitPlaylist;
  label: FitLabel;
  score: number;
  reasons: FitReason[];
};

export function taxonomyKey(value: string) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** De-duplicates by taxonomy key (first spelling wins) and sorts for display. */
export function uniqueTaxonomy(values: string[]) {
  const seen = new Map<string, string>();
  for (const raw of values) {
    const value = String(raw || '').trim();
    const key = taxonomyKey(value);
    if (key && !seen.has(key)) seen.set(key, value);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

/**
 * A playlist can be suggested only if it is active, open for submissions and,
 * where the record exposes them, verified, routing-enabled and not excluded by
 * its own unreleased or hard-no rules. Mirrors the live submit routing filter.
 */
export function isFitEligible(playlist: FitPlaylist, input?: FitInput) {
  if (playlist.lifecycle_state !== 'active') return false;
  if (playlist.submission_status !== 'open') return false;
  if (playlist.verification_status !== undefined && playlist.verification_status !== 'verified') return false;
  if (playlist.network_routing_enabled !== undefined && playlist.network_routing_enabled !== true) return false;
  if (input?.releaseState === 'unreleased' && playlist.accepts_unreleased === false) return false;
  if (input) {
    const hardNo = (playlist.hard_no_tags || []).map(taxonomyKey).filter(Boolean);
    const described = [input.genre, ...(input.moods || [])].map(taxonomyKey);
    if (hardNo.some((tag) => described.includes(tag))) return false;
  }
  return true;
}

/** Canonical vocabulary, derived from eligible playlists exactly like the submit form. */
export function fitVocabulary(playlists: FitPlaylist[]) {
  const eligible = playlists.filter((playlist) => isFitEligible(playlist));
  return {
    genres: uniqueTaxonomy(eligible.flatMap((p) => [p.primary_genre, ...(p.secondary_genres || [])])),
    moods: uniqueTaxonomy(eligible.flatMap((p) => p.moods || [])),
    activities: uniqueTaxonomy(eligible.flatMap((p) => p.activities || [])),
  };
}

/** Moods used by playlists in the chosen genre, so the picker suggests relevant ones first. */
export function moodsForGenre(playlists: FitPlaylist[], genre: string) {
  const key = taxonomyKey(genre);
  if (!key) return [];
  return uniqueTaxonomy(
    playlists
      .filter((p) => isFitEligible(p))
      .filter((p) => [p.primary_genre, ...(p.secondary_genres || [])].some((value) => taxonomyKey(value) === key))
      .flatMap((p) => p.moods || []),
  );
}

function overlap(selected: string[], available: string[]) {
  const keys = new Set(selected.map(taxonomyKey).filter(Boolean));
  // Report the playlist's own canonical spelling, once per key.
  return uniqueTaxonomy(available.filter((value) => keys.has(taxonomyKey(value))));
}

function labelFor(genreHit: 'primary' | 'secondary' | null, supporting: number): FitLabel | null {
  if (genreHit === 'primary') return supporting >= 1 ? 'Strong fit' : 'Good fit';
  if (genreHit === 'secondary') return supporting >= 1 ? 'Good fit' : 'Possible fit';
  // Without a genre match, only a clear mood/moment overlap counts.
  return supporting >= 2 ? 'Possible fit' : null;
}

export function scorePlaylist(playlist: FitPlaylist, input: FitInput): FitResult | null {
  const genreKey = taxonomyKey(input.genre);
  if (!genreKey || !isFitEligible(playlist, input)) return null;
  const moods = (input.moods || []).slice(0, MAX_MOODS);

  const reasons: FitReason[] = [];
  let score = 0;
  let genreHit: 'primary' | 'secondary' | null = null;

  if (taxonomyKey(playlist.primary_genre) === genreKey) {
    genreHit = 'primary';
    score += FIT_WEIGHTS.primaryGenre;
    reasons.push({ kind: 'primaryGenre', values: [playlist.primary_genre] });
  } else {
    const secondary = overlap([input.genre], playlist.secondary_genres || []);
    if (secondary.length) {
      genreHit = 'secondary';
      score += FIT_WEIGHTS.secondaryGenre;
      reasons.push({ kind: 'secondaryGenre', values: secondary });
    }
  }

  const moodHits = overlap(moods, playlist.moods || []);
  if (moodHits.length) {
    score += moodHits.length * FIT_WEIGHTS.mood;
    reasons.push({ kind: 'mood', values: moodHits });
  }

  const activityHits = input.activity ? overlap([input.activity], playlist.activities || []) : [];
  if (activityHits.length) {
    score += FIT_WEIGHTS.activity;
    reasons.push({ kind: 'activity', values: activityHits });
  }

  const label = labelFor(genreHit, moodHits.length + activityHits.length);
  return label ? { playlist, label, score, reasons } : null;
}

/**
 * All suggested playlists, best first. Order: label, then score, then the
 * registry's own display order, then slug. Follower counts are never used.
 */
export function matchPlaylists(playlists: FitPlaylist[], input: FitInput): FitResult[] {
  return playlists
    .map((playlist) => scorePlaylist(playlist, input))
    .filter((result): result is FitResult => result !== null)
    .sort((a, b) =>
      LABEL_ORDER[a.label] - LABEL_ORDER[b.label]
      || b.score - a.score
      || a.playlist.display_order - b.playlist.display_order
      || a.playlist.slug.localeCompare(b.playlist.slug));
}

const REASON_PREFIX: Record<FitReason['kind'], string> = {
  primaryGenre: 'Primary genre',
  secondaryGenre: 'Also covers',
  mood: 'Mood',
  activity: 'Moment',
};

/** "Primary genre: Future Bass · Mood: Emotional, Melancholic" */
export function describeReasons(reasons: FitReason[]) {
  return reasons.map((reason) => REASON_PREFIX[reason.kind] + ': ' + reason.values.join(', ')).join(' · ');
}
