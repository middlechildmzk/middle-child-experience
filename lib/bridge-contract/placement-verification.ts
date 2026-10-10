/**
 * Read-side evidence guard for the existing BVSS placement lifecycle.
 *
 * Accept / scheduled / added_reported / pending_verification are NOT live.
 * The production observation function records live only after an authorized
 * playlist snapshot contains the expected track. This pure guard makes
 * misleading cross-product "LIVE" labels harder to introduce accidentally.
 *
 * It does not grant write privileges or certify a provider snapshot; that
 * remains the BVSS owner's responsibility and the independent QA gate.
 */
export interface NetworkPlacementEvidence {
  status: string;
  playlist_id: string;
  spotify_track_id: string | null;
  verified_live_at: string | null;
  observed_track_id: string | null;
  verification_source: string | null;
  verification_evidence: unknown;
}

const OBSERVATION_SOURCES: ReadonlySet<string> = new Set(['spotify_owner_api', 'soundcharts_tracklist']);

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * UI display eligibility only. A valid result means a verified observation
 * was recorded in BVSS, not that a fresh independent live check was run now.
 */
export function hasVerifiedLivePlacement(p: NetworkPlacementEvidence): boolean {
  if (
    p.status !== 'live' ||
    !p.playlist_id ||
    !p.spotify_track_id ||
    !p.observed_track_id ||
    !p.verification_source ||
    !OBSERVATION_SOURCES.has(p.verification_source) ||
    typeof p.verified_live_at !== 'string' ||
    !Number.isFinite(Date.parse(p.verified_live_at)) ||
    !record(p.verification_evidence)
  ) return false;

  const e = p.verification_evidence;
  if (
    e.source !== p.verification_source ||
    e.playlist_id !== p.playlist_id ||
    e.spotify_track_id !== p.spotify_track_id ||
    typeof e.observed_at !== 'string' ||
    !Number.isFinite(Date.parse(e.observed_at)) ||
    Date.parse(e.observed_at) !== Date.parse(p.verified_live_at)
  ) return false;
  // A source-identified snapshot is required. A curator's assertion alone
  // never becomes streaming-platform observation evidence.
  return typeof e.snapshot_id === 'string' && e.snapshot_id.trim().length > 0;
}
