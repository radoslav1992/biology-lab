// Adsterra ad units. Ads are switched off: the unit keys are empty, so AdSlot renders nothing (no markup,
// no script, no requests) and AdFree does not run. The privacy, about and teacher pages say Biology Lab has
// no ads: update them before setting keys again (tests/ads.test.mjs fails as a reminder).
// Ads load only on `domain`, so local and preview builds stay ad-free.
export const ads = {
  domain: 'thebiologylab.org',
  host: 'https://bauval.org',
  leaderboard: '', // 728×90, wide screens
  mobile: '', // 320×50, phones
  rectangle: '', // 300×250
};

// The leaderboard needs both its desktop and phone sizes.
export const adsEnabled = {
  leaderboard: Boolean(ads.leaderboard && ads.mobile),
  rectangle: Boolean(ads.rectangle),
};
export const anyAds = Object.values(adsEnabled).some(Boolean);
