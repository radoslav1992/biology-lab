// Adsterra configuration: unit keys must be well-formed and distinct, and ads must target the production domain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ads } from '../src/lib/ads.mjs';
import { site } from '../src/lib/site.mjs';

const UNITS = ['native', 'leaderboard', 'mobile', 'rectangle'];

test('every ad unit key is 32 lowercase hex characters and unique', () => {
  for (const unit of UNITS) assert.match(ads[unit], /^[0-9a-f]{32}$/, `${unit} key`);
  assert.equal(new Set(UNITS.map(unit => ads[unit])).size, UNITS.length);
});

test('ads load over https from the production domain only', () => {
  assert.equal(new URL(ads.host).protocol, 'https:');
  assert.equal(ads.domain, new URL(site.url).hostname);
});
