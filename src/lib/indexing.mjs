// Which built pages search engines should index. astro.config.mjs filters the sitemap with isIndexable, the pages
// listed here pass `noindex` to the layout, and tests/site.test.mjs checks that the two agree on the built site.
//
// - /404/: the error page.
// - /teachers/answers/<id>/: teacher answer keys, linked only from /teachers/.
// - /…/activity/: the printable one-page student activities. They are blank worksheets (a results table and
//   write-in lines) of 300–500 words, and roughly a fifth of each one is wording shared with the other eleven, so
//   they are kept for teachers but out of the index: the tool page each one belongs to is the page that should
//   rank, and Google's crawl is better spent on the tools, organelle pages and concept notes.
export const noindexPatterns = [/^\/404\/$/, /^\/teachers\/answers\//, /\/activity\/$/];
/** path: a site path such as "/tools/cell-size/" (or a full URL). */
export const isIndexable = path => {
  const p = /^https?:/.test(path) ? new URL(path).pathname : path;
  return !noindexPatterns.some(re => re.test(p));
};
