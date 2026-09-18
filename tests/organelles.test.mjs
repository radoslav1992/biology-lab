// Cell atlas data: the fixed slug order and lessons, the entry shape the atlas pages rely on, and the SEO limits of the pages built from it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { organelles, cellTypes } from '../src/lib/organelles.mjs';

const ORDER = ['nucleus', 'mitochondrion', 'chloroplast', 'ribosome', 'endoplasmic-reticulum', 'golgi-apparatus', 'lysosome', 'cell-membrane'];
const LESSON = { nucleus: 'dna-structure', mitochondrion: 'cellular-respiration', chloroplast: 'photosynthesis', ribosome: 'transcription-and-translation', 'endoplasmic-reticulum': 'transcription-and-translation', 'golgi-apparatus': 'cell-transport', lysosome: 'enzymes', 'cell-membrane': 'cell-transport' };
const sentences = s => s.split(/(?<=[.!?])\s+/);
// These two helpers mirror the title and meta-description rules in src/pages/cells/[slug].astro; keep them in sync.
const TAILS = ['Structure, functions, size, and a common misconception.', 'Structure, functions, and a common misconception.', 'Structure and function.'];
const describe = o => { const first = sentences(o.intro)[0]; return o.intro.length <= 160 ? o.intro : TAILS.map(t => `${first} ${t}`).find(d => d.length <= 160) || first; };
const pageTitle = o => { const full = `${o.title}: Structure, Function & Location in the Cell`; return full.length <= 65 ? full : `${o.title}: Structure, Function & Location`; };
// Copied from src/pages/cells/index.astro.
const INDEX_TITLE = 'Cell Organelles: Interactive Diagram, Functions & Comparison';
const INDEX_DESCRIPTION = 'Explore a labeled animal and plant cell, then compare eight organelles by membranes, location, and job, from the nucleus and mitochondria to the cell membrane.';

test('slugs are in the fixed order with the fixed lessons', () => {
  assert.deepEqual(Object.keys(organelles), ORDER);
  for (const slug of ORDER) assert.equal(organelles[slug].lesson, LESSON[slug], slug);
});
test('every entry has the full shape the atlas pages read', () => {
  for (const [slug, o] of Object.entries(organelles)) {
    for (const key of ['title', 'type', 'foundIn', 'intro', 'properties', 'functions', 'example', 'pitfall', 'related', 'lesson', 'keywords']) assert.ok(o[key], `${slug} missing ${key}`);
    assert.ok(Array.isArray(o.foundIn) && o.foundIn.length >= 2, `${slug} foundIn`);
    assert.ok(o.properties.length >= 4 && o.properties.length <= 5, `${slug} properties ${o.properties.length}`);
    assert.ok(o.functions.length >= 2 && o.functions.length <= 4, `${slug} functions ${o.functions.length}`);
    for (const pair of [...o.properties, ...o.functions]) assert.ok(pair.length === 2 && pair[0] && pair[1], `${slug} pair ${pair}`);
    assert.equal(o.properties[0][0], 'Membranes', `${slug}: the comparison table on /cells/ reads the first property as the membrane row`);
    assert.ok(o.functions[0][0].length <= 48, `${slug}: the first function label is the "main job" column on /cells/ and must stay short`);
    assert.equal(o.related.length, 2, `${slug} related`);
    assert.equal(new Set(o.related).size, 2, `${slug} related are distinct`);
    for (const r of o.related) assert.ok(ORDER.includes(r) && r !== slug, `${slug} related ${r}`);
    assert.equal(sentences(o.intro).length, 2, `${slug} intro is two sentences`);
    assert.ok(o.example.length > 150 && o.pitfall.length > 100, `${slug} example/pitfall are substantial`);
    assert.ok(/\d/.test(o.example), `${slug} example has a number`);
    assert.equal(typeof o.keywords, 'string', `${slug} keywords`);
  }
});
test('page titles and descriptions fit the SEO limits and never end mid-sentence', () => {
  for (const [slug, o] of Object.entries(organelles)) {
    const title = pageTitle(o);
    assert.ok(title.length <= 65, `${slug} title ${title.length}`);
    assert.ok(title.includes(o.title), `${slug} title carries the organelle name`);
    const d = describe(o);
    assert.ok(d.length >= 120 && d.length <= 160, `${slug} description ${d.length}: ${d}`);
    assert.match(d, /[.!?]$/, `${slug} description ends a sentence: ${d}`);
    assert.doesNotMatch(d, /…/, `${slug} description is not truncated: ${d}`);
  }
  assert.ok(INDEX_TITLE.length <= 65, `index title ${INDEX_TITLE.length}`);
  assert.ok(INDEX_DESCRIPTION.length >= 120 && INDEX_DESCRIPTION.length <= 160, `index description ${INDEX_DESCRIPTION.length}`);
});
test('cell types reference real slugs and the plant cell has a chloroplast, wall, and vacuole', () => {
  for (const [kind, c] of Object.entries(cellTypes)) {
    assert.ok(c.title && c.description, kind);
    for (const s of c.organelles) assert.ok(ORDER.includes(s), `${kind} ${s}`);
    assert.equal(new Set(c.organelles).size, c.organelles.length, `${kind} unique`);
    assert.ok(c.organelles.includes('nucleus') && c.organelles.includes('cell-membrane'), kind);
    for (const extra of c.extras) assert.ok(extra.length === 3 && extra.every(Boolean), `${kind} extra ${extra[0]}`);
  }
  assert.ok(cellTypes.plant.organelles.includes('chloroplast'));
  assert.ok(!cellTypes.animal.organelles.includes('chloroplast'));
  assert.deepEqual(cellTypes.plant.extras.map(e => e[0]), ['Cell wall', 'Central vacuole']);
  assert.deepEqual(cellTypes.animal.extras.map(e => e[0]), ['Centrioles']);
  for (const o of ORDER) assert.ok(cellTypes.animal.organelles.includes(o) || cellTypes.plant.organelles.includes(o), `${o} appears in a cell`);
});
