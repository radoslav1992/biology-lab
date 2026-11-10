// Writes public/llms.txt, the plain-text guide to this site for AI assistants
// (https://llmstxt.org). ChatGPT is one of the site's main sources of visitors,
// and it can only recommend a tool it can read a description of.
//
// Every line comes from a built page: its <title> and meta description, for
// each URL in the sitemap. Run it after changing titles or descriptions:
//
//   npm run build && npm run llms
//
// tests/llms.test.mjs fails if a tool is missing from the file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NAME = "Biology Lab";
const INTRO = "Free biology virtual labs, calculators and interactive tools for students and teachers: Punnett squares, DNA to mRNA to protein, population growth, cell size, enzyme kinetics and a 3D cell, with concept notes, practice questions, printable worksheets and teacher answer keys. Everything runs in the browser with no account. From the makers of Interactive Periodic Table.";
const CONTACT = "info@thebiologylab.org";
const SISTERS = [
  ['Interactive Periodic Table', 'https://interactiveperiodictable.net/'],
  ['Astronomy Lab', 'https://theastronomylab.com/'],
  ['Biology Lab', 'https://thebiologylab.org/'],
  ['Earth Science Lab', 'https://earthsciencelab.org/'],
  ['Geometry Lab', 'https://geometrylab.net/'],
  ['Physics Lab', 'https://thephysicslab.org/'],
  ['KidsCode', 'https://kidscode.dev/'],
  ['Cell by Cell', 'https://cellbycell.app/'],
];

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');
const sitemap = path.join(dist, 'sitemap-0.xml');
if (!fs.existsSync(sitemap)) throw new Error('Run `npm run build` first: dist/sitemap-0.xml is missing.');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = text => text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) =>
  code[0] === '#'
    ? String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)))
    : ENTITIES[code.toLowerCase()] ?? match);
const brand = /\s*[|–—-]\s*(The )?(Astronomy|Biology|Geometry|Physics) Lab\s*$/;

const urls = [...fs.readFileSync(sitemap, 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
const origin = new URL(urls[0]).origin;
const pages = urls.map(url => {
  const route = new URL(url).pathname;
  const html = fs.readFileSync(path.join(dist, route, 'index.html'), 'utf8');
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)[1]).trim().replace(brand, '');
  const description = decode(html.match(/<meta name="description" content="([\s\S]*?)"/)[1]).trim();
  return { route, title, description };
});

// Which heading a page goes under. Anything not matched is a tool.
function section(route) {
  if (route === '/') return null;
  if (route.endsWith('/activity/') || /^\/(teachers|worksheets|practice|printable-diagrams)\//.test(route)) return 'Classroom';
  if (route.startsWith('/learn/')) return 'Lessons';
  if (/^\/(planets|shapes|cells)\//.test(route) && !['/cells/3d/', '/cells/label-the-cell/'].includes(route)) return 'Reference';
  if (/^\/(formulas|physics-symbols|units|library|codon-chart)\//.test(route)) return 'Reference';
  if (/^\/(about|privacy)\//.test(route)) return 'About';
  return 'Tools';
}

const order = ['Tools', 'Lessons', 'Reference', 'Classroom', 'About'];
const depth = route => route.split('/').length;
const lines = [`# ${NAME}`, '', `> ${INTRO}`, ''];
for (const heading of order) {
  // Hub pages first, then alphabetical by path.
  const group = pages.filter(p => section(p.route) === heading)
    .sort((a, b) => depth(a.route) - depth(b.route) || (a.route < b.route ? -1 : a.route > b.route ? 1 : 0));
  if (!group.length) continue;
  lines.push(`## ${heading}`, '');
  for (const p of group) lines.push(`- [${p.title}](${origin}${p.route}): ${p.description}`);
  if (heading === 'About' && CONTACT) lines.push(`- Contact: ${CONTACT}`);
  lines.push('');
}
const sisters = SISTERS.filter(([, url]) => !url.startsWith(origin));
lines.push('## Optional', '', `- ${sisters.map(([name, url]) => `[${name}](${url})`).join(', ')}: Sister learning apps from the same makers.`, '');

fs.writeFileSync(path.join(root, 'public', 'llms.txt'), lines.join('\n'));
console.log(`Wrote public/llms.txt: ${pages.length} pages from the sitemap.`);
