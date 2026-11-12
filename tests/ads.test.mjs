// Ad configuration: ads are switched off (no unit keys), and the loader stays tied to the production domain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ads, adsEnabled, anyAds } from '../src/lib/ads.mjs';
import { site } from '../src/lib/site.mjs';

const UNITS = ['leaderboard', 'mobile', 'rectangle'];

test('ads are switched off: no unit keys are set and no slot is enabled', () => {
  for (const unit of UNITS) assert.equal(ads[unit], '', 'Ads are off. Before setting keys again, restore the advertising sections of the privacy, about and teacher pages.');
  assert.deepEqual(adsEnabled, { leaderboard: false, rectangle: false });
  assert.equal(anyAds, false);
});

test('ads load over https from the production domain only', () => {
  assert.equal(new URL(ads.host).protocol, 'https:');
  assert.equal(ads.domain, new URL(site.url).hostname);
});
