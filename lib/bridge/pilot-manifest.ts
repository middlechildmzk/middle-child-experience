/**
 * One Campaign pilot manifest — tranche one.
 *
 * The pilot campaign's identity lives in SOURCE CONTROL for tranche one.
 * It is not in CuratorFit (design-dormant — explicitly not temporary
 * campaign authority) and it is not a database record: no new DB
 * authority is created until the ArtistOS migration-ledger
 * reconciliation lands and the final authority verdict is issued.
 *
 * When that verdict lands, the campaign identity moves into ArtistOS
 * `campaigns` (PARTIALLY AUTHORITATIVE, §1) and this manifest becomes a
 * historical pointer. Until then, treat every field below as pilot
 * scaffolding, not production truth.
 *
 * Provenance: everything here is `suggested` (§5) unless a field cites
 * a source system.
 */

/** Which system, if any, is the campaign's database authority right now. */
export type PilotCampaignAuthority =
  | 'none-source-controlled-manifest'
  | 'artistos-campaigns';

export interface PilotSingle {
  /** Do NOT assume "Never Alone" — the single is unannounced. */
  title: string | null;
  release_date: string | null;
  isrc: string | null;
  /** → ArtistOS releases.id once the ledger check completes. */
  artistos_release_id: string | null;
}

export interface PilotManifest {
  pilot: 'one-campaign';
  artist: 'Middle Child';
  single: PilotSingle;
  campaign_authority: PilotCampaignAuthority;
  /** Human-readable reason the authority is where it is. */
  authority_note: string;
}

export const PILOT_MANIFEST: PilotManifest = {
  pilot: 'one-campaign',
  artist: 'Middle Child',
  single: {
    title: null,
    release_date: null,
    isrc: null,
    artistos_release_id: null,
  },
  campaign_authority: 'none-source-controlled-manifest',
  authority_note:
    'Tranche one: campaign identity is source-controlled only. CuratorFit ' +
    'is design-dormant and is not campaign authority. Moves to ArtistOS ' +
    'campaigns after the migration-ledger reconciliation verdict.',
};
