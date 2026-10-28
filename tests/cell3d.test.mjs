// 3D cell viewer (/cells/3d/): share-link state, the structures each model can focus, where their text comes from,
// the procedural scene itself, and the page's SEO limits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CELLS, CELL_KINDS, DEFAULT_STATE, parseShareState, serializeShareState, cell3dHref } from '../src/lib/cell3d-share.mjs';
import { NON_ATLAS, COLORS, atlasSlug, structureInfo, cellStructures } from '../src/lib/cell3d.mjs';
import { buildCell } from '../src/lib/cell3d-models.mjs';
import { organelles, organelleChart, cellTypes } from '../src/lib/organelles.mjs';

const ORGANELLES = Object.keys(organelles);
const ALL_IDS = [...new Set([...CELLS.animal, ...CELLS.plant])];

test('share state round-trips through the query string', () => {
  const states = [
    { cell: 'animal', focus: null, explode: 0, cut: true },
    { cell: 'plant', focus: 'nucleus', explode: 0.6, cut: true },
    { cell: 'plant', focus: 'chloroplast', explode: 1, cut: false },
    { cell: 'animal', focus: 'centrioles', explode: 0.25, cut: false },
    ...ALL_IDS.map((id, i) => ({ cell: CELLS.animal.includes(id) ? 'animal' : 'plant', focus: id, explode: (i % 5) / 4, cut: i % 2 === 0 })),
  ];
  for (const s of states) {
    const query = serializeShareState(s);
    assert.match(query, /^\?cell=(animal|plant)/, query);
    assert.deepEqual(parseShareState(query), s, query);
    assert.equal(serializeShareState(parseShareState(query)), query, 'serializing is stable');
  }
  assert.equal(serializeShareState({ cell: 'plant', focus: 'nucleus', explode: 0.6 }), '?cell=plant&focus=nucleus&explode=0.6');
  assert.equal(serializeShareState({}), '?cell=animal');
});

test('bad or missing share values fall back to friendly defaults', () => {
  assert.deepEqual(parseShareState(''), { ...DEFAULT_STATE });
  assert.deepEqual(parseShareState('?cell=banana&focus=heart&explode=lots&cut=maybe'), { ...DEFAULT_STATE });
  assert.equal(parseShareState('?explode=7').explode, 1, 'explode is clamped to 1');
  assert.equal(parseShareState('?explode=-2').explode, 0, 'explode is clamped to 0');
  assert.equal(parseShareState('?explode=0.123456').explode, 0.12, 'explode is rounded to hundredths');
  assert.equal(parseShareState('?explode=Infinity').explode, 0);
  assert.equal(parseShareState('?cell=PLANT').cell, 'plant', 'cell is case-insensitive');
  assert.equal(parseShareState('?cut=0').cut, false);
  assert.equal(parseShareState('?cut=off').cut, false);
  assert.equal(parseShareState('?cut=1').cut, true);
  // A focus that only one cell has opens that cell, even against an explicit cell parameter.
  assert.deepEqual(parseShareState('?focus=chloroplast'), { cell: 'plant', focus: 'chloroplast', explode: 0, cut: true });
  assert.equal(parseShareState('?cell=animal&focus=cell-wall').cell, 'plant');
  assert.equal(parseShareState('?cell=plant&focus=lysosome').cell, 'animal');
  assert.equal(parseShareState('?cell=plant&focus=centrioles').cell, 'animal');
  assert.equal(parseShareState('?cell=plant&focus=nucleus').cell, 'plant', 'a shared organelle keeps the chosen cell');
  // Friendly spellings and the atlas slug for the ER.
  assert.equal(parseShareState('?focus=endoplasmic-reticulum').focus, 'rough-er');
  assert.equal(parseShareState('?focus=Mitochondria').focus, 'mitochondrion');
  assert.equal(parseShareState('?focus=golgi').focus, 'golgi-apparatus');
  assert.equal(parseShareState('?focus=central%20vacuole').focus, 'central-vacuole');
  // Full URLs and URLSearchParams work too; unrelated parameters are ignored.
  assert.equal(parseShareState('https://thebiologylab.org/cells/3d/?classroom=1&cell=plant#top').cell, 'plant');
  assert.equal(parseShareState(new URLSearchParams('cell=plant&explode=0.5')).explode, 0.5);
});

test('atlas pages link to the same organelle in 3D', () => {
  for (const slug of ORGANELLES) {
    const href = cell3dHref(slug);
    assert.ok(href.startsWith('/cells/3d/?'), href);
    const s = parseShareState(href);
    assert.ok(s.focus && CELLS[s.cell].includes(s.focus), `${slug}: ${href}`);
    assert.equal(atlasSlug(s.focus), slug, `${slug} focuses its own structure`);
  }
  assert.equal(cell3dHref('chloroplast'), '/cells/3d/?cell=plant&focus=chloroplast');
  assert.equal(cell3dHref('nucleus'), '/cells/3d/?focus=nucleus');
  assert.equal(cell3dHref('unknown'), '/cells/3d/');
});

test('every focusable structure maps to an atlas slug or a documented non-atlas structure', () => {
  for (const id of ALL_IDS) {
    const slug = atlasSlug(id);
    assert.ok(slug ? ORGANELLES.includes(slug) : NON_ATLAS[id], `${id} is neither an atlas organelle nor documented in NON_ATLAS`);
    assert.ok(COLORS[id], `${id} has a color`);
  }
  for (const id of Object.keys(NON_ATLAS)) assert.ok(ALL_IDS.includes(id), `NON_ATLAS.${id} is used by a model`);
  // Every atlas organelle can be found in at least one model.
  for (const slug of ORGANELLES) assert.ok(ALL_IDS.some(id => atlasSlug(id) === slug), `${slug} appears in 3D`);
});

test('the models follow the reference cells: plant has wall, vacuole and chloroplasts; animal has centrioles and lysosomes', () => {
  for (const kind of CELL_KINDS) for (const slug of cellTypes[kind].organelles) assert.ok(CELLS[kind].some(id => atlasSlug(id) === slug), `${kind} has ${slug}`);
  assert.ok(CELLS.plant.includes('cell-wall') && CELLS.plant.includes('central-vacuole') && CELLS.plant.includes('chloroplast'));
  assert.ok(!CELLS.plant.includes('centrioles') && !CELLS.plant.includes('lysosome'), 'no centrioles or true lysosomes in the plant cell');
  assert.ok(CELLS.animal.includes('centrioles') && CELLS.animal.includes('lysosome'));
  assert.ok(!['cell-wall', 'central-vacuole', 'chloroplast'].some(id => CELLS.animal.includes(id)));
});

test('info cards use only the site’s own text', () => {
  const chartText = new Set(organelleChart.flatMap(r => [r[2], r[5], `${r[3]} / ${r[4]}`]));
  const extras = Object.values(cellTypes).flatMap(c => c.extras);
  for (const id of ALL_IDS) {
    const s = structureInfo(id);
    for (const key of ['title', 'name', 'type', 'intro', 'href', 'cta']) assert.ok(s[key], `${id} ${key}`);
    assert.ok(s.rows.length >= 2 && s.rows.length <= 3, `${id} shows 2–3 rows`);
    assert.ok(s.href.startsWith('/') && s.href.endsWith('/') || s.href.includes('/#'), `${id} href ${s.href}`);
    if (s.slug) {
      const o = organelles[s.slug];
      assert.equal(s.intro, o.intro, `${id} intro is the atlas intro`);
      assert.equal(s.type, o.type);
      assert.equal(s.href, `/cells/${s.slug}/`);
      assert.match(s.cta, /^Open the .+ page$/);
      for (const [k, v] of s.rows) assert.ok(chartText.has(v) || o.properties.some(p => p[0] === k && p[1] === v), `${id} row ${k}`);
    } else {
      for (const [, v] of s.rows) assert.ok(chartText.has(v), `${id} row "${v}" comes from the organelle chart`);
      const extra = extras.find(e => e[0] === s.title);
      if (extra) { assert.equal(s.intro, extra[1]); assert.equal(s.type, extra[2]); }
    }
  }
  assert.equal(cellStructures('plant').length, CELLS.plant.length);
  assert.equal(cellStructures('nonsense').length, CELLS.animal.length);
});

test('the procedural scenes contain exactly the focusable structures, each pickable and labeled', () => {
  for (const kind of CELL_KINDS) {
    const cell = buildCell(kind);
    assert.deepEqual([...cell.parts.keys()].sort(), [...CELLS[kind]].sort(), `${kind} scene parts`);
    const picked = new Set();
    cell.root.traverse(obj => { if (obj.isMesh) { assert.ok(CELLS[kind].includes(obj.userData.part), `${kind}: mesh without a known part (${obj.userData.part})`); picked.add(obj.userData.part); } });
    assert.deepEqual([...picked].sort(), [...CELLS[kind]].sort(), `${kind}: every structure has a pickable mesh`);
    let vertices = 0;
    cell.root.traverse(obj => { if (obj.isMesh) vertices += obj.geometry.attributes.position.count * (obj.isInstancedMesh ? obj.count : 1); });
    assert.ok(vertices < 300000, `${kind} stays light enough for a school laptop (${vertices} vertices)`);
    for (const e of [0, 0.5, 1]) {
      cell.update(e);
      for (const part of cell.parts.values()) {
        assert.ok(part.materials.length > 0, `${kind} ${part.id} materials`);
        const at = part.anchor.at(e, { copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }, addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this; }, add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; } });
        assert.ok([at.x, at.y, at.z].every(Number.isFinite), `${kind} ${part.id} anchor at ${e}`);
      }
    }
  }
});

test('the 3D page fits the SEO limits and has its own H1', () => {
  const page = readFileSync(new URL('../src/pages/cells/3d.astro', import.meta.url), 'utf8');
  const title = page.match(/const title = '([^']+)'/)[1];
  const description = page.match(/const description = '([^']+)'/)[1];
  assert.ok(title.length >= 50 && title.length <= 65, `title ${title.length}`);
  assert.match(title, /3D Animal and Plant Cell/);
  assert.ok(description.length >= 140 && description.length <= 160, `description ${description.length}`);
  const h1 = page.match(/<h1>([^<]+)<\/h1>/)[1];
  const index = readFileSync(new URL('../src/pages/cells/index.astro', import.meta.url), 'utf8');
  assert.notEqual(h1, index.match(/<h1>([^<]+)<\/h1>/)[1]);
  assert.match(page, /breadcrumbs=\{\[\['Cell organelles', '\/cells\/'\], \['3D cell', '\/cells\/3d\/'\]\]\}/);
  assert.equal((page.match(/<AdSlot/g) || []).length, 1, 'at most one ad slot in the content');
});
