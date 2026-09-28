/**
 * @bvss/bridge-contract — canonical read contract for the One Campaign pilot.
 *
 * The shared kernel seed: typed entities + provenance envelope + the
 * normalized status lifecycle every adapter in the Promotion Intelligence
 * Bridge normalizes into. Designed to move to ArtistOS (or its own
 * versioned package) once a second consumer exists — see Architecture
 * Pack §8.
 */

export type {
  Authority,
  Normalized,
  NormalizedStatus,
  Provenance,
  ProvenanceLabel,
  SourceSystem,
} from './provenance';

export type {
  Artist,
  Campaign,
  Curator,
  Evidence,
  Metric,
  Outcome,
  Placement,
  Playlist,
  PromotionTarget,
  Relationship,
  Release,
  SubmissionPitch,
  TargetSource,
  Track,
} from './entities';

export {
  makeProvenance,
  mapNativeStatus,
  normalize,
  submissionWithUnknownStatus,
} from './helpers';

export type { StatusSource } from './helpers';
