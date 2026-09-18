// Cross-module integrity: every slug, route, FAQ key, and lesson reference must agree with the site map.
import test from 'node:test';
import assert from 'node:assert/strict';
import { explorations, explore, explorationDiagram, defaultMode } from '../src/lib/explorations.mjs';
import { catalog } from '../src/lib/catalog.mjs';
import { lessons } from '../src/lib/lessons.mjs';
import { organelles } from '../src/lib/organelles.mjs';
import { faqs } from '../src/lib/faqs.mjs';
import { QUESTIONS, makeRound } from '../src/lib/practice.mjs';
import { learningApps, relatedLearning, currentApp } from '../src/lib/learning-apps.mjs';
import { site } from '../src/lib/site.mjs';

const LESSONS = ['cell-theory', 'prokaryotes-vs-eukaryotes', 'cell-transport', 'dna-structure', 'transcription-and-translation', 'mitosis-and-meiosis', 'mendelian-inheritance', 'hardy-weinberg-principle', 'natural-selection', 'enzymes', 'photosynthesis', 'cellular-respiration', 'population-growth', 'energy-flow-in-ecosystems', 'surface-area-to-volume', 'lab-measurements'];
const TOOLS = ['cell-size', 'enzyme-kinetics', 'dilution-calculator', 'magnification-calculator', 'water-potential', 'bacterial-growth', 'energy-pyramid', 'chi-square-test', 'predator-prey'];
const ORGANELLES = ['nucleus', 'mitochondrion', 'chloroplast', 'ribosome', 'endoplasmic-reticulum', 'golgi-apparatus', 'lysosome', 'cell-membrane'];
const FLAGSHIP = ['/punnett-square-calculator/', '/hardy-weinberg-calculator/', '/dna-transcription-translation/', '/population-growth-calculator/'];
const STATIC = ['/', '/tools/', '/cells/', '/practice/', '/worksheets/', '/printable-diagrams/', '/learn/', '/about/'];
const ROUTES = new Set([...STATIC, ...FLAGSHIP, ...TOOLS.map(s => `/tools/${s}/`), ...ORGANELLES.map(s => `/cells/${s}/`), ...LESSONS.map(s => `/learn/${s}/`)]);
const resolves = href => { const clean = href.split('#')[0]; return clean === '' || ROUTES.has(clean); };

test('lessons match the site map in order with unique slugs', () => {
  assert.deepEqual(lessons.map(l => l.slug), LESSONS);
  for (const l of lessons) { for (const key of ['title', 'subtitle', 'formula', 'body', 'example', 'pitfall', 'href', 'cta', 'icon']) assert.ok(l[key], `${l.slug} missing ${key}`); assert.ok(resolves(l.href), `${l.slug} href ${l.href}`); for (const r of l.related || []) assert.ok(LESSONS.includes(r), `${l.slug} related ${r}`); }
});
test('explorers match the site map and link to real lessons', () => {
  assert.deepEqual(explorations.map(t => t.slug), TOOLS);
  for (const t of explorations) { assert.ok(LESSONS.includes(t.lesson), `${t.slug} lesson ${t.lesson}`); assert.ok(t.title && t.description && t.formula && t.note && t.category && t.icon, t.slug); assert.ok(t.fields.length >= 1); for (const f of t.fields) assert.ok(f.key && f.label && Number.isFinite(f.value) && f.value >= f.min && f.value <= f.max, `${t.slug} field ${f.key}`); }
});
test('every explorer mode and preset produces finite metrics, steps, and a clean diagram', () => {
  for (const t of explorations) {
    const defaults = Object.fromEntries(t.fields.map(f => [f.key, f.value]));
    const modes = t.modes ? t.modes.map(m => m[0]) : [defaultMode(t)];
    for (const mode of modes) { const r = explore(t.slug, defaults, mode); assert.ok(r.metrics.length >= 3, `${t.slug}/${mode} metrics`); assert.ok(r.steps.length >= 2, `${t.slug}/${mode} steps`); const svg = explorationDiagram(t.slug, r.model); assert.ok(svg.length > 100, `${t.slug}/${mode} diagram`); assert.doesNotMatch(svg, /NaN|Infinity|undefined/, `${t.slug}/${mode} diagram`); for (const m of r.metrics) assert.doesNotMatch(String(m.value), /NaN|Infinity|undefined/, `${t.slug}/${mode} ${m.label}`); }
    for (const p of t.presets || []) { const r = explore(t.slug, { ...defaults, ...p.values }, p.mode || modes[0]); assert.doesNotMatch(explorationDiagram(t.slug, r.model), /NaN|Infinity|undefined/, `${t.slug} preset ${p.label}`); }
  }
});
test('organelles match the site map and link to real lessons and each other', () => {
  assert.deepEqual(Object.keys(organelles), ORGANELLES);
  for (const [slug, o] of Object.entries(organelles)) { assert.ok(LESSONS.includes(o.lesson), `${slug} lesson`); for (const r of o.related) assert.ok(ORGANELLES.includes(r) && r !== slug, `${slug} related ${r}`); assert.ok(o.title && o.type && o.intro && o.example && o.pitfall, slug); assert.ok(o.properties.length >= 3 && o.functions.length >= 2, slug); }
});
test('FAQ sets exist for every page that renders one and link internally', () => {
  const expected = ['home', ...FLAGSHIP.map(h => h.replaceAll('/', '')), ...TOOLS, ...ORGANELLES, 'printable-diagrams'];
  for (const key of expected) { assert.ok(Array.isArray(faqs[key]) && faqs[key].length >= 2, `faq ${key}`); for (const item of faqs[key]) { assert.ok(item.question.endsWith('?'), `${key}: ${item.question}`); assert.ok(item.answer.length > 80, `${key}: short answer`); assert.ok(resolves(item.href), `${key} href ${item.href}`); assert.ok(item.label, `${key} label`); } }
  assert.equal(Object.keys(faqs).length, expected.length);
});
test('catalog covers every tool once and every href resolves', () => {
  assert.equal(new Set(catalog.map(t => t.href)).size, catalog.length);
  for (const t of catalog) assert.ok(resolves(t.href), t.href);
  for (const href of [...FLAGSHIP, ...TOOLS.map(s => `/tools/${s}/`), '/cells/', '/practice/', '/worksheets/', '/printable-diagrams/', '/learn/']) assert.ok(catalog.some(t => t.href === href), href);
});
test('practice bank has 100 unique questions, 20 per topic, four unique choices each', () => {
  assert.equal(QUESTIONS.length, 100);
  assert.equal(new Set(QUESTIONS.map(q => q.q)).size, 100);
  for (const topic of ['cells', 'genetics', 'molecular', 'ecology', 'physiology']) { assert.equal(QUESTIONS.filter(q => q.topic === topic).length, 20, topic); assert.equal(makeRound(topic, 20).length, 20); }
  for (const q of QUESTIONS) { assert.equal(q.choices.length, 4, q.q); assert.equal(new Set(q.choices).size, 4, q.q); assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, q.q); assert.ok(q.why && q.why.length > 15, q.q); }
});
test('learning apps and cross-site links are consistent', () => {
  assert.equal(currentApp, 'biology');
  const me = learningApps.find(a => a.id === 'biology');
  assert.equal(me.url, site.url);
  for (const key of Object.keys(relatedLearning)) assert.ok(LESSONS.includes(key), key);
});
test('SEO metadata stays within snippet limits', () => {
  for (const t of explorations) { assert.ok((t.seoTitle || t.title).length <= 70, `${t.slug} title length`); assert.ok(t.description.length >= 80 && t.description.length <= 170, `${t.slug} description length ${t.description.length}`); }
  for (const l of lessons) assert.ok(l.title.length <= 60, `${l.slug} title length`);
});
