import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessFit } from '../../supabase/functions/_shared/fit.ts';

const playlist = {
  primary_genre: 'Melodic Bass',
  secondary_genres: ['Future Bass'],
  seo_keywords: ['emotional bass'],
  moods: ['emotional', 'cinematic', 'euphoric'],
  anchor_artists: ['Illenium', 'Seven Lions'],
};

test('strong fit: multiple material aligned signals, no contradiction', () => {
  const r = assessFit({ genre: 'Melodic Bass', moods: ['emotional', 'cinematic'], comparable_artists: ['Illenium'] }, playlist);
  assert.equal(r.band, 'strong_fit');
  assert.equal(r.label, 'Strong fit');
  assert.equal(r.signals.filter((s) => s.kind === 'mismatch').length, 0);
});

test('worth a look: credible alignment with uncertainty', () => {
  const r = assessFit({ genre: 'Melodic Bass', moods: ['dark'], comparable_artists: ['Illenium'] }, playlist);
  assert.equal(r.band, 'worth_a_look');
  assert.ok(r.signals.some((s) => s.dimension === 'mood' && s.kind === 'mismatch'));
});

test('long shot: material genre mismatch outweighs other matches', () => {
  const r = assessFit({ genre: 'Tech House', moods: ['emotional', 'cinematic'], comparable_artists: ['Illenium'] }, playlist);
  assert.equal(r.band, 'long_shot');
  assert.ok(r.signals.some((s) => s.dimension === 'genre' && s.kind === 'mismatch' && s.material));
});

test('long shot: only weak (non-material) alignment', () => {
  const r = assessFit({ genre: 'Emotional Bass', moods: ['euphoric'], comparable_artists: ['Zedd'] }, playlist);
  assert.equal(r.band, 'long_shot');
});

test('insufficient evidence: no band when only genre is comparable', () => {
  const r = assessFit({ genre: 'Melodic Bass', moods: [], comparable_artists: [] }, playlist);
  assert.equal(r.band, null);
  assert.equal(r.label, null);
  assert.ok(r.insufficient_reason);
  assert.equal(r.signals.length, 1, 'the genre signal stays visible');
});

test('band does not depend on how many chips there are', () => {
  const many = assessFit({ genre: 'Melodic Bass', moods: ['emotional'], comparable_artists: ['Zedd'] }, { ...playlist, moods: ['emotional'] });
  assert.equal(many.signals.length, 3);
  assert.equal(many.band, 'worth_a_look', '3 chips with only one material match is not strong');
});

test('every signal carries its basis', () => {
  const r = assessFit({ genre: 'Melodic Bass', moods: ['emotional', 'cinematic'], comparable_artists: ['Illenium'] }, playlist);
  for (const s of r.signals) assert.equal(s.basis, 'artist_attested_vs_curator_stated');
});
