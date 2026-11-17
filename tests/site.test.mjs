// Checks on the built site in dist/: the sitemap lists exactly the indexable pages, robots tags and canonicals agree,
// internal links resolve with trailing slashes and never use http://, every indexable page is within two clicks of the
// home page, hubs link all their children, and titles and descriptions fit search snippets.
// Run `npm run build` first (`npm run check` does both); without dist/ these tests are skipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../src/lib/site.mjs';
import { isIndexable } from '../src/lib/indexing.mjs';
import { catalog } from '../src/lib/catalog.mjs';
import { lessons } from '../src/lib/lessons.mjs';
import { organelles } from '../src/lib/organelles.mjs';
import { relatedTools, calculatorLessons } from '../src/lib/related.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const built = existsSync(join(dist, 'sitemap-0.xml'));
const skip = built ? false : 'dist/ not built: run `npm run build` first';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, c) => c[0] === '#' ? String.fromCodePoint(c[1].toLowerCase() === 'x' ? parseInt(c.slice(2), 16) : Number(c.slice(1))) : ENTITIES[c.toLowerCase()] ?? m);
const walk = dir => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

function load() {
  const files = walk(dist);
  const assets = new Set(files.map(f => '/' + relative(dist, f).split('\\').join('/')));
  const pages = {};
  for (const f of files.filter(f => f.endsWith('.html'))) {
    const rel = relative(dist, f).split('\\').join('/');
    const path = rel === '404.html' ? '/404/' : '/' + rel.replace(/index\.html$/, '');
    const html = readFileSync(f, 'utf8');
    pages[path] = {
      html,
      title: decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] ?? ''),
      description: decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? ''),
      robots: (html.match(/<meta name="robots" content="([^"]*)"/) || [])[1] ?? '',
      canonical: decode((html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] ?? ''),
      hrefs: [...html.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)].map(m => decode(m[1])),
    };
  }
  const sitemap = [...readFileSync(join(dist, 'sitemap-0.xml'), 'utf8').matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1]);
  return { pages, assets, sitemap };
}
const data = built ? load() : null;
const origin = new URL(site.url).origin;
/** Site path for an internal href, or null for external, mailto and same-page links. */
const internalPath = href => {
  if (/^(mailto:|tel:|#|javascript:)/.test(href)) return null;
  const u = new URL(href, origin + '/');
  return u.hostname === new URL(origin).hostname ? u.pathname : null;
};
const noindex = page => /noindex/.test(page.robots);

test('the sitemap lists exactly the indexable pages, once each, as https URLs with trailing slashes', { skip }, () => {
  const { pages, sitemap } = data;
  assert.equal(new Set(sitemap).size, sitemap.length, 'duplicate sitemap URLs');
  for (const url of sitemap) assert.ok(url.startsWith(origin + '/') && url.endsWith('/'), url);
  const indexable = Object.keys(pages).filter(p => !noindex(pages[p])).map(p => origin + p).sort();
  assert.deepEqual([...sitemap].sort(), indexable);
  for (const url of sitemap) assert.ok(!noindex(pages[new URL(url).pathname]), `noindex page in sitemap: ${url}`);
});

test('robots tags follow src/lib/indexing.mjs; activities, answer keys and the 404 page are noindex, follow', { skip }, () => {
  for (const [path, page] of Object.entries(data.pages)) {
    assert.equal(noindex(page), !isIndexable(path), `${path}: ${page.robots}`);
    assert.match(page.robots, /(^|,)\s*follow/, `${path} must stay follow`);
  }
  for (const path of ['/punnett-square-calculator/activity/', '/tools/cell-size/activity/', '/cells/activity/', '/teachers/answers/cell-size/']) assert.ok(noindex(data.pages[path]), path);
});

test('every page has a self-referencing https canonical with a trailing slash', { skip }, () => {
  for (const [path, page] of Object.entries(data.pages)) assert.equal(page.canonical, origin + path, path);
});

test('internal links resolve, use trailing slashes, and nothing links over http://', { skip }, () => {
  const { pages, assets } = data;
  for (const [path, page] of Object.entries(pages)) {
    assert.doesNotMatch(page.html, /(href|src|content)="http:\/\//, `${path} has an http:// URL`);
    for (const href of page.hrefs) {
      const target = internalPath(href);
      if (target === null) continue;
      if (/\.[a-z0-9]+$/i.test(target)) { assert.ok(assets.has(target), `${path} links missing file ${href}`); continue; }
      assert.ok(target.endsWith('/'), `${path} links ${href} without a trailing slash`);
      assert.ok(pages[target], `${path} links ${href}, which is not built`);
    }
  }
});

test('every indexable page is within two clicks of the home page', { skip }, () => {
  const { pages } = data;
  const depth = { '/': 0 }, queue = ['/'];
  while (queue.length) {
    const p = queue.shift();
    for (const href of pages[p].hrefs) { const t = internalPath(href); if (t && pages[t] && depth[t] === undefined) { depth[t] = depth[p] + 1; queue.push(t); } }
  }
  for (const p of Object.keys(pages).filter(p => !noindex(pages[p]))) assert.ok(depth[p] !== undefined && depth[p] <= 2, `${p} is ${depth[p] ?? 'not reachable'} clicks from home`);
});

test('hub pages link every child page', { skip }, () => {
  const links = path => new Set(data.pages[path].hrefs.map(internalPath).filter(Boolean));
  const tools = links('/tools/'), learn = links('/learn/'), cells = links('/cells/');
  for (const t of catalog) assert.ok(tools.has(t.href), `/tools/ is missing ${t.href}`);
  for (const l of lessons) assert.ok(learn.has(`/learn/${l.slug}/`), `/learn/ is missing ${l.slug}`);
  for (const slug of Object.keys(organelles)) assert.ok(cells.has(`/cells/${slug}/`), `/cells/ is missing ${slug}`);
  for (const href of ['/cells/3d/', '/cells/label-the-cell/']) assert.ok(cells.has(href), `/cells/ is missing ${href}`);
});

test('tools link their sibling tools and concept notes, and the notes link back', { skip }, () => {
  const links = path => new Set(data.pages[path].hrefs.map(internalPath).filter(Boolean));
  for (const [href, siblings] of Object.entries(relatedTools)) for (const [target] of siblings) assert.ok(links(href).has(target), `${href} should link ${target}`);
  for (const [href, slugs] of Object.entries(calculatorLessons)) for (const slug of slugs) {
    assert.ok(links(`/learn/${slug}/`).has(href), `/learn/${slug}/ should link ${href}`);
  }
});

test('titles and descriptions fit search snippets and are unique', { skip }, () => {
  const titles = new Map(), descriptions = new Map();
  for (const [path, page] of Object.entries(data.pages)) {
    if (noindex(page)) continue;
    assert.ok(page.title.length >= 15 && page.title.length <= 60, `${path} title is ${page.title.length} characters: ${page.title}`);
    assert.ok(page.description.length >= 110 && page.description.length <= 160, `${path} description is ${page.description.length} characters`);
    assert.ok(!titles.has(page.title), `${path} repeats the title of ${titles.get(page.title)}`);
    assert.ok(!descriptions.has(page.description), `${path} repeats the description of ${descriptions.get(page.description)}`);
    titles.set(page.title, path); descriptions.set(page.description, path);
  }
  for (const slug of lessons.map(l => l.slug)) assert.doesNotMatch(data.pages[`/learn/${slug}/`].description, /…$/, `${slug} description is truncated`);
});

test('the population calculator answers the doubling question in its prerendered HTML', { skip }, () => {
  const page = data.pages['/population-growth-calculator/'];
  assert.ok(page.title.length <= 60 && /doubling/i.test(page.title), page.title);
  assert.ok(page.description.length >= 120 && page.description.length <= 155, `description is ${page.description.length} characters`);
  assert.match(page.description, /doubles every 41 years/);
  const text = decode(page.html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  assert.match(text, /P = P₀ × 2\^\(t ÷ T\)/);
  assert.match(text, /A city doubles its size every 41 years\. If the population is currently 700,000, what will the population be in 123 years\?/);
  assert.match(text, /123 ÷ 41 = 3/);
  assert.match(text, /700,000 × 8 = 5,600,000/);
  assert.ok(page.hrefs.includes('#try=doublings&n0=700000&td=41&t=123'), 'the example opens in the solver');
  assert.ok(text.indexOf('Population doubling formula') < text.indexOf('Population growth word-problem solver'), 'the doubling answer comes before the solver');
});

test('related tools name real catalog pages and never the page itself', () => {
  const hrefs = new Set(catalog.map(t => t.href));
  for (const [href, siblings] of Object.entries(relatedTools)) {
    assert.ok(hrefs.has(href), href);
    assert.ok(siblings.length >= 2 && siblings.length <= 3, `${href} lists ${siblings.length}`);
    for (const [target, why] of siblings) { assert.ok(hrefs.has(target) && target !== href, `${href} -> ${target}`); assert.match(why, /^[A-Z].{30,}\.$/, `${href} -> ${target} reason`); }
  }
  for (const [href, slugs] of Object.entries(calculatorLessons)) { assert.ok(hrefs.has(href), href); for (const slug of slugs) assert.ok(lessons.some(l => l.slug === slug), `${href} lesson ${slug}`); }
});
