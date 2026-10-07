// Fit Checker matcher contract. Runs in CI with the learn gate.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  describeReasons,
  FIT_WEIGHTS,
  fitVocabulary,
  isFitEligible,
  matchPlaylists,
  MAX_MOODS,
  moodsForGenre,
  scorePlaylist,
  type FitPlaylist,
} from '../../lib/playlist-fit.ts';

let order = 0;
function playlist(overrides: Partial<FitPlaylist> & { slug: string }): FitPlaylist {
  order += 1;
  return {
    id: overrides.slug,
    spotify_playlist_id: '',
    spotify_uri: '',
    spotify_url: '',
    canonical_name: overrides.slug,
    subtitle: '',
    description: '',
    cover_asset_url: null,
    primary_genre: 'Pop',
    secondary_genres: [],
    moods: [],
    activities: [],
    seo_keywords: [],
    anchor_artists: [],
    target_track_count: 50,
    current_track_count: null,
    current_follower_count: null,
    follower_count_source: null,
    follower_count_observed_at: null,
    last_editorial_update_at: null,
    submission_status: 'open',
    update_cadence: 'weekly',
    middle_child_eligible: false,
    subflower_eligible: false,
    lifecycle_state: 'active',
    curation_philosophy: '',
    submission_criteria: '',
    display_order: order,
    updated_at: '2026-10-07',
    network_owner_type: 'bvss',
    curator_id: null,
    verification_status: 'verified',
    network_routing_enabled: true,
    ...overrides,
  };
}

const futureBass = playlist({ slug: 'future-bass', primary_genre: 'Future Bass', secondary_genres: ['Melodic Bass'], moods: ['Emotional', 'Melancholic'], activities: ['late night'] });
const melodic = playlist({ slug: 'melodic', primary_genre: 'Melodic Bass', secondary_genres: ['Future Bass'], moods: ['Emotional', 'Uplifting'], activities: ['driving'] });
const sad = playlist({ slug: 'sad-songs', primary_genre: 'Sad Songs', secondary_genres: ['Indie Pop'], moods: ['Melancholic', 'Emotional'], activities: ['late night'] });
const pop = playlist({ slug: 'pop', primary_genre: 'Pop', secondary_genres: ['Dance Pop'], moods: ['Happy'], activities: ['party'] });
const all = [futureBass, melodic, sad, pop];

test('weights keep the agreed order of strength', () => {
  assert.ok(FIT_WEIGHTS.primaryGenre > FIT_WEIGHTS.secondaryGenre);
  assert.ok(FIT_WEIGHTS.secondaryGenre > FIT_WEIGHTS.mood);
  // A primary-genre match alone outranks a secondary match with every supporting signal.
  assert.ok(FIT_WEIGHTS.primaryGenre > FIT_WEIGHTS.secondaryGenre + MAX_MOODS * FIT_WEIGHTS.mood + FIT_WEIGHTS.activity);
});

test('exact primary-genre match ranks first', () => {
  const results = matchPlaylists(all, { genre: 'Future Bass' });
  assert.equal(results[0].playlist.slug, 'future-bass');
  assert.equal(results[0].label, 'Good fit');
  assert.equal(results[0].score, FIT_WEIGHTS.primaryGenre);
});

test('matching is case and punctuation insensitive', () => {
  assert.equal(matchPlaylists(all, { genre: 'future-bass' })[0].playlist.slug, 'future-bass');
});

test('secondary-genre match is a weaker genre signal', () => {
  const result = scorePlaylist(melodic, { genre: 'Future Bass' });
  assert.ok(result);
  assert.equal(result.label, 'Possible fit');
  assert.equal(result.score, FIT_WEIGHTS.secondaryGenre);
  assert.deepEqual(result.reasons, [{ kind: 'secondaryGenre', values: ['Future Bass'] }]);
});

test('moods support a genre match and count once each', () => {
  const result = scorePlaylist(futureBass, { genre: 'Future Bass', moods: ['Emotional', 'emotional', 'Melancholic'] });
  assert.ok(result);
  assert.equal(result.label, 'Strong fit');
  assert.equal(result.score, FIT_WEIGHTS.primaryGenre + 2 * FIT_WEIGHTS.mood);
});

test('mood-only overlap needs two supporting signals and is never more than possible', () => {
  assert.equal(scorePlaylist(sad, { genre: 'Techno', moods: ['Melancholic'] }), null);
  const result = scorePlaylist(sad, { genre: 'Techno', moods: ['Melancholic', 'Emotional'] });
  assert.ok(result);
  assert.equal(result.label, 'Possible fit');
});

test('activity is a supporting signal', () => {
  const withActivity = scorePlaylist(melodic, { genre: 'Future Bass', activity: 'Driving' });
  assert.ok(withActivity);
  assert.equal(withActivity.label, 'Good fit');
  assert.equal(withActivity.score, FIT_WEIGHTS.secondaryGenre + FIT_WEIGHTS.activity);
  assert.deepEqual(withActivity.reasons.at(-1), { kind: 'activity', values: ['driving'] });
});

test('multiple matching inputs add up and lift the label', () => {
  const result = scorePlaylist(futureBass, { genre: 'Future Bass', moods: ['Emotional'], activity: 'late night' });
  assert.ok(result);
  assert.equal(result.label, 'Strong fit');
  assert.equal(result.score, FIT_WEIGHTS.primaryGenre + FIT_WEIGHTS.mood + FIT_WEIGHTS.activity);
  assert.equal(describeReasons(result.reasons), 'Primary genre: Future Bass · Mood: Emotional · Moment: late night');
});

test('only the first three moods are used', () => {
  const many = playlist({ slug: 'many', primary_genre: 'House', moods: ['A', 'B', 'C', 'D'] });
  const result = scorePlaylist(many, { genre: 'House', moods: ['A', 'B', 'C', 'D'] });
  assert.equal(result?.score, FIT_WEIGHTS.primaryGenre + MAX_MOODS * FIT_WEIGHTS.mood);
});

test('ties break by display order, then slug, never by followers', () => {
  const big = playlist({ slug: 'big', primary_genre: 'House', display_order: 20, current_follower_count: 900000 });
  const small = playlist({ slug: 'small', primary_genre: 'House', display_order: 10, current_follower_count: 12 });
  const sameOrderB = playlist({ slug: 'b-house', primary_genre: 'House', display_order: 30 });
  const sameOrderA = playlist({ slug: 'a-house', primary_genre: 'House', display_order: 30 });
  const slugs = matchPlaylists([big, sameOrderB, small, sameOrderA], { genre: 'House' }).map((r) => r.playlist.slug);
  assert.deepEqual(slugs, ['small', 'big', 'a-house', 'b-house']);
  // Same input, same output.
  assert.deepEqual(matchPlaylists([sameOrderA, small, big, sameOrderB], { genre: 'House' }).map((r) => r.playlist.slug), slugs);
});

test('label outranks raw score', () => {
  const possible = playlist({ slug: 'possible', primary_genre: 'Other', secondary_genres: ['House'] });
  const good = playlist({ slug: 'good', primary_genre: 'House' });
  assert.deepEqual(matchPlaylists([possible, good], { genre: 'House' }).map((r) => r.label), ['Good fit', 'Possible fit']);
});

test('no-match state returns nothing rather than forcing results', () => {
  assert.deepEqual(matchPlaylists(all, { genre: 'Polka', moods: ['Happy'] }), []);
  assert.deepEqual(matchPlaylists(all, { genre: '' }), []);
});

test('closed, paused, inactive, unverified and unrouted playlists are excluded', () => {
  const excluded = [
    playlist({ slug: 'closed', primary_genre: 'House', submission_status: 'closed' }),
    playlist({ slug: 'paused', primary_genre: 'House', submission_status: 'paused' }),
    playlist({ slug: 'archived', primary_genre: 'House', lifecycle_state: 'archived' }),
    playlist({ slug: 'experimental', primary_genre: 'House', lifecycle_state: 'experimental' }),
    playlist({ slug: 'unverified', primary_genre: 'House', verification_status: 'pending' }),
    playlist({ slug: 'unrouted', primary_genre: 'House', network_routing_enabled: false }),
  ];
  assert.deepEqual(matchPlaylists(excluded, { genre: 'House' }), []);
  assert.deepEqual(fitVocabulary(excluded).genres, []);
});

test('respects a playlist’s own unreleased and hard-no rules', () => {
  const noUnreleased = playlist({ slug: 'released-only', primary_genre: 'House', accepts_unreleased: false });
  const hardNo = playlist({ slug: 'no-sad', primary_genre: 'House', hard_no_tags: ['Sad'] });
  assert.equal(matchPlaylists([noUnreleased], { genre: 'House', releaseState: 'unreleased' }).length, 0);
  assert.equal(matchPlaylists([noUnreleased], { genre: 'House' }).length, 1);
  assert.equal(matchPlaylists([hardNo], { genre: 'House', moods: ['sad'] }).length, 0);
  assert.equal(isFitEligible(hardNo), true);
});

test('changing inputs changes results', () => {
  const first = matchPlaylists(all, { genre: 'Future Bass' }).map((r) => r.playlist.slug);
  const second = matchPlaylists(all, { genre: 'Pop', moods: ['Happy'] }).map((r) => r.playlist.slug);
  assert.notDeepEqual(first, second);
  assert.equal(second[0], 'pop');
});

test('vocabulary is the canonical registry vocabulary, de-duplicated', () => {
  const variant = playlist({ slug: 'variant', primary_genre: 'House', activities: ['Late Night'] });
  const vocab = fitVocabulary([...all, variant]);
  assert.ok(vocab.genres.includes('Future Bass') && vocab.genres.includes('Dance Pop'));
  assert.equal(vocab.activities.filter((a) => a.toLowerCase() === 'late night').length, 1);
  assert.deepEqual(moodsForGenre(all, 'Future Bass'), ['Emotional', 'Melancholic', 'Uplifting']);
});

test('reason text never contains prediction language', () => {
  for (const result of matchPlaylists(all, { genre: 'Future Bass', moods: ['Emotional'], activity: 'late night' })) {
    assert.doesNotMatch(describeReasons(result.reasons), /accept|probab|guarantee|stream|algorithm|quality|%/i);
  }
});

test('tool copy carries the disclosure and never predicts outcomes', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../../app/tools/playlist-fit-checker/page.tsx', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../../app/tools/playlist-fit-checker/FitChecker.tsx', import.meta.url), 'utf8');
  assert.ok(ui.includes(
    'Playlist fit is based on the genre, mood and listening context you selected. It is not a quality rating and does not predict whether a curator will place the track.',
  ));
  for (const source of [page, ui]) {
    assert.doesNotMatch(source, /likely to be accepted|acceptance probability|guaranteed fit|likely streams|algorithmic potential|quality score|% match|current_follower_count/i);
    assert.doesNotMatch(source, /—/);
  }
  assert.match(page, /'@type': 'WebPage'/);
  assert.doesNotMatch(page, /SoftwareApplication|FAQPage/);
  assert.match(page, /canonical: PATH/);
});
