// Fit assessment for a submission against a playlist (Muse v1, 2026-10-04).
//
// The band is derived from evidence quality and material matches/mismatches,
// never from a numeric score or from counting reason chips:
//   strong_fit    multiple material aligned signals and no material contradiction
//   worth_a_look  credible alignment with meaningful uncertainty or mismatch
//   long_shot     limited alignment or a material mismatch
//   null          insufficient evidence (no band is shown)
//
// Every signal names its basis so the UI can separate verified facts from
// inferred fit. Inputs are the artist-attested submission fields and the
// curator-stated playlist profile; nothing here is a measurement.
//
// Pure module: no Deno or Node APIs (shared by edge functions and tests).

export type FitBand = 'strong_fit' | 'worth_a_look' | 'long_shot';

export type FitSignal = {
  dimension: 'genre' | 'mood' | 'comparable_artists';
  kind: 'aligned' | 'mismatch';
  material: boolean;
  detail: string;
  basis: 'artist_attested_vs_curator_stated';
};

export type FitAssessment = {
  band: FitBand | null;
  label: string | null;
  signals: FitSignal[];
  dimensions_evaluated: FitSignal['dimension'][];
  insufficient_reason: string | null;
};

export type FitSubmission = {
  genre?: string | null;
  moods?: string[] | null;
  comparable_artists?: string[] | null;
};

export type FitPlaylist = {
  primary_genre?: string | null;
  secondary_genres?: string[] | null;
  seo_keywords?: string[] | null;
  moods?: string[] | null;
  anchor_artists?: string[] | null;
};

export const FIT_LABEL: Record<FitBand, string> = {
  strong_fit: 'Strong fit',
  worth_a_look: 'Worth a look',
  long_shot: 'Long shot',
};

const norm = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const clean = (list: unknown) => (Array.isArray(list) ? list.map(norm).filter(Boolean) : []);

export function assessFit(submission: FitSubmission, playlist: FitPlaylist): FitAssessment {
  const signals: FitSignal[] = [];
  const evaluated: FitSignal['dimension'][] = [];

  // Genre lane: both sides always state one, so it is always evaluable.
  const genre = norm(submission.genre);
  const primary = norm(playlist.primary_genre);
  if (genre && primary) {
    evaluated.push('genre');
    if (genre === primary) {
      signals.push({ dimension: 'genre', kind: 'aligned', material: true, detail: 'Same primary genre: ' + playlist.primary_genre, basis: 'artist_attested_vs_curator_stated' });
    } else if (clean(playlist.secondary_genres).includes(genre)) {
      signals.push({ dimension: 'genre', kind: 'aligned', material: true, detail: 'Matches a secondary genre of this playlist', basis: 'artist_attested_vs_curator_stated' });
    } else if (clean(playlist.seo_keywords).some((k) => k.includes(genre) || genre.includes(k))) {
      signals.push({ dimension: 'genre', kind: 'aligned', material: false, detail: 'Genre overlaps this playlist\'s keywords, not its stated genres', basis: 'artist_attested_vs_curator_stated' });
    } else {
      signals.push({ dimension: 'genre', kind: 'mismatch', material: true, detail: 'Genre (' + submission.genre + ') is outside this playlist\'s stated lane (' + playlist.primary_genre + ')', basis: 'artist_attested_vs_curator_stated' });
    }
  }

  // Mood: evaluable only when both sides state moods.
  const moods = clean(submission.moods);
  const playlistMoods = clean(playlist.moods);
  if (moods.length && playlistMoods.length) {
    evaluated.push('mood');
    const hits = playlistMoods.filter((m) => moods.includes(m));
    if (hits.length >= 2) {
      signals.push({ dimension: 'mood', kind: 'aligned', material: true, detail: hits.length + ' shared moods', basis: 'artist_attested_vs_curator_stated' });
    } else if (hits.length === 1) {
      signals.push({ dimension: 'mood', kind: 'aligned', material: false, detail: '1 shared mood', basis: 'artist_attested_vs_curator_stated' });
    } else {
      signals.push({ dimension: 'mood', kind: 'mismatch', material: false, detail: 'No shared moods', basis: 'artist_attested_vs_curator_stated' });
    }
  }

  // Comparable artists: an overlap is material; no overlap is uncertainty, not contradiction.
  const artists = clean(submission.comparable_artists);
  const anchors = clean(playlist.anchor_artists);
  if (artists.length && anchors.length) {
    evaluated.push('comparable_artists');
    const hits = anchors.filter((a) => artists.includes(a));
    if (hits.length) {
      signals.push({ dimension: 'comparable_artists', kind: 'aligned', material: true, detail: hits.length + ' comparable artist' + (hits.length > 1 ? 's' : '') + ' shared with this playlist', basis: 'artist_attested_vs_curator_stated' });
    } else {
      signals.push({ dimension: 'comparable_artists', kind: 'mismatch', material: false, detail: 'No comparable artists in common', basis: 'artist_attested_vs_curator_stated' });
    }
  }

  if (evaluated.length < 2) {
    return { band: null, label: null, signals, dimensions_evaluated: evaluated, insufficient_reason: 'Only the genre lane can be compared; add moods or comparable artists for a fit read.' };
  }

  const materialAligned = signals.filter((s) => s.kind === 'aligned' && s.material).length;
  const anyAligned = signals.some((s) => s.kind === 'aligned');
  const materialMismatch = signals.some((s) => s.kind === 'mismatch' && s.material);
  const anyMismatch = signals.some((s) => s.kind === 'mismatch');

  let band: FitBand;
  if (materialMismatch || !anyAligned) band = 'long_shot';
  else if (materialAligned >= 2 && !anyMismatch) band = 'strong_fit';
  else if (materialAligned >= 1) band = 'worth_a_look';
  else band = 'long_shot';

  return { band, label: FIT_LABEL[band], signals, dimensions_evaluated: evaluated, insufficient_reason: null };
}
