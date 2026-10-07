import test from 'node:test';
import assert from 'node:assert/strict';
import { guideBySlug } from '../../lib/learn-guides';
import { uniqueTaxonomy, taxonomyKey } from '../../lib/playlist-fit';
import { isCuratorOS, playlistCuratorLabel, routingConsent } from '../../lib/playlist-identity';
import { editorialSocial } from '../../lib/editorial-social';

const house = { network_owner_type: 'partner', bvss_curator_profiles: { handle: 'curatoros', display_name: 'CuratorOS' } };
const external = { network_owner_type: 'partner', bvss_curator_profiles: { handle: 'outside', display_name: 'Outside Music' } };
test('partner storage category cannot imply independence or in-house ownership', () => {
  assert.equal(isCuratorOS(house), true);
  assert.equal(isCuratorOS(external), false);
  assert.equal(isCuratorOS({ network_owner_type: 'partner' }), false);
  assert.equal(playlistCuratorLabel(external), 'Outside Music');
  assert.equal(playlistCuratorLabel({network_owner_type:'partner'}), 'Verified playlist curator');
  assert.equal(playlistCuratorLabel({network_owner_type:'bvss'}), 'BVSS FVM');
});
test('consent names actual in-house and other recipients', () => {
  assert.equal(routingConsent([]).available, false);
  assert.equal(routingConsent([house]).label, 'Also send to matched CuratorOS playlists');
  assert.match(routingConsent([house]).detail, /in-house CuratorOS team/);
  assert.match(routingConsent([house, external]).detail, /Outside Music/);
  assert.doesNotMatch(JSON.stringify(routingConsent([house, external])), /independent/i);
});
test('shared filter taxonomy collapses casing, spacing and punctuation variants', () => {
  const result = uniqueTaxonomy(['Emotional','emotional',' Dreamy ','dreamy','Festival','festival','Night-Drive','night drive']);
  assert.equal(result.length, 4);
  assert.equal(new Set(result.map(taxonomyKey)).size, result.length);
});
test('eligible unreleased songs are not rejected solely for a short editorial lead time', () => {
  for (const slug of ['how-to-get-on-spotify-playlists', 'how-to-pitch-playlist-curators','free-spotify-promotion']) {
    const text = JSON.stringify(guideBySlug.get(slug));
    assert.match(text, /recommends at least 7 days/);
    assert.match(text, /Release Radar/);
    assert.match(text, /eligib/);
    assert.doesNotMatch(text, /only take unreleased.*7 days|must.*7 days before release/);
  }
});
test('royalty qualification and editorial credibility remain explicit', () => {
  const streams = JSON.stringify(guideBySlug.get('how-to-get-more-spotify-streams'));
  assert.match(streams, /recorded-music royalty pool/);
  assert.match(streams, /minimum number of unique listeners/);
  assert.match(streams, /do not apply to publishing royalties/);
  assert.doesNotMatch(JSON.stringify(guideBySlug.get('spotify-promotion-scams')), /scams we see most often/i);
  assert.doesNotMatch(JSON.stringify(guideBySlug.get('find-spotify-playlist-curators')), /they are not taking submissions right now/i);
});
test('free-options and platform-model articles do not promise an unprovided ranking', () => {
  for (const slug of ['best-free-music-promotion-sites','best-spotify-playlist-submission-sites']) {
    const guide=guideBySlug.get(slug)!;
    assert.ok(guide);
    assert.doesNotMatch(guide.seoTitle, /\bBest\b/);
  }
});
test('landing and hub social metadata have their own image routes', () => {
  for (const path of ['/free-spotify-playlist-submission','/learn']) {
    const social = editorialSocial('Specific title','Specific description',path);
    assert.equal((social.openGraph as any).url,path);
    assert.equal((social.openGraph as any).images[0].url,path+'/opengraph-image');
    assert.equal((social.twitter as any).card,'summary_large_image');
  }
});

test('known legacy status copy is corrected without rewriting other history', async () => {
  const { publicStatusDetail } = await import('../../supabase/functions/_shared/public-status');
  const legacy='Your track entered the BVSS FVM review queue and may also be routed to approved independent curators when there is a strong fit.';
  assert.doesNotMatch(publicStatusDetail(legacy)!,/independent curators/);
  assert.match(publicStatusDetail(legacy)!,/curator playlists you opted into/);
  assert.equal(publicStatusDetail('Each curator decides independently.'),'Each curator decides independently.');
  assert.equal(publicStatusDetail(null),null);
});
