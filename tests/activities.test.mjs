// Classroom activities: every printed answer must match the site's own calculations, and every step must use a real preset.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { activities, standards, findActivity, activityFor } from '../src/lib/activities.mjs';
import { explorations, findExploration } from '../src/lib/explorations.mjs';
import { cellTypes } from '../src/lib/organelles.mjs';
import { INPUT_STRANDS } from '../src/lib/molecular.mjs';

const TOOL_ROUTES = new Set(['/population-growth-calculator/', '/dna-transcription-translation/', '/codon-chart/', '/punnett-square-calculator/', '/hardy-weinberg-calculator/', '/cells/', ...explorations.map(t => `/tools/${t.slug}/`)]);
const source = name => readFileSync(new URL(`../src/components/${name}.astro`, import.meta.url), 'utf8');
// A value counts as printed only as a whole token: “1” must not match inside “1,976” or “0.1”.
const printedIn = (text, shown) => new RegExp(`(?<![\\d.,])${shown.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\d]|[.,]\\d)`).test(text);
const punnettPresets = (() => { const line = source('PunnettSquare').match(/const PRESETS[^=]*= (\{.*\});/)[1]; return Function(`return ${line}`)(); })();

test('twelve activities with unique ids, slug-consistent paths and real tool pages', () => {
  assert.equal(activities.length, 12);
  assert.equal(new Set(activities.map(a => a.id)).size, 12);
  assert.equal(new Set(activities.map(a => a.path)).size, 12);
  for (const a of activities) {
    assert.ok(TOOL_ROUTES.has(a.tool.href), `${a.id}: ${a.tool.href}`);
    assert.equal(a.path, `${a.tool.href}activity/`, a.id);
    assert.equal(findActivity(a.id), a);
    assert.equal(activityFor(a.tool.href), a);
  }
});

test('each activity has a goal, grade band, time, 3–5 steps and 5–7 questions', () => {
  for (const a of activities) {
    assert.ok(a.title.endsWith(' Activity') && a.topic && a.goal.length > 60, a.id);
    assert.match(a.grade, /^Grades (\d+)–(\d+)$/, a.id);
    const [, from, to] = a.grade.match(/(\d+)–(\d+)/).map(Number);
    assert.ok(from >= 6 && to <= 12 && from < to, `${a.id} grade band`);
    assert.ok(a.minutes >= 15 && a.minutes <= 30, `${a.id} minutes`);
    assert.ok(a.steps.length >= 3 && a.steps.length <= 5, `${a.id} steps`);
    assert.ok(a.questions.length >= 5 && a.questions.length <= 7, `${a.id} questions`);
    for (const q of a.questions) {
      assert.ok(q.q.endsWith('?') || q.q.endsWith('.'), `${a.id}: ${q.q}`);
      assert.ok(q.a.length > 40, `${a.id}: short answer`);
      assert.ok(Number.isInteger(q.lines) && q.lines >= 1 && q.lines <= 4, `${a.id}: lines`);
    }
  }
});

test('standards are real NGSS codes from the map, used only where listed', () => {
  for (const code of Object.keys(standards)) assert.match(code, /^(MS|HS)-LS[1-4]-\d$/);
  const used = new Set(activities.flatMap(a => a.standards));
  for (const code of used) assert.ok(standards[code], code);
  assert.deepEqual([...used].sort(), Object.keys(standards).sort(), 'every listed standard is used');
  assert.deepEqual(activities.filter(a => a.ap).map(a => a.id).sort(), ['chi-square-test', 'hardy-weinberg', 'water-potential']);
});

test('every preset a step names exists in the tool, and the steps name it', () => {
  for (const a of activities) {
    const steps = a.steps.join(' ');
    for (const [from, label] of a.uses) {
      const [kind, name] = from.split(':');
      if (kind === 'explorer') assert.ok(findExploration(name).presets.some(p => p.label === label), `${a.id}: ${name} preset ${label}`);
      else if (kind === 'component') assert.ok(source(name).includes(`'${label}'`), `${a.id}: ${name} preset ${label}`);
      else if (kind === 'punnett') assert.ok(punnettPresets[name].some(([x, y]) => `${x} × ${y}` === label), `${a.id}: Punnett ${name} preset ${label}`);
      else if (kind === 'cell') assert.equal(cellTypes[name].title, label, `${a.id}: cell type ${name}`);
      else assert.fail(`${a.id}: unknown source ${from}`);
      assert.ok(steps.includes(`“${label}”`), `${a.id}: steps should name “${label}”`);
    }
  }
  assert.ok(findActivity('dna-to-protein').steps.join(' ').includes(INPUT_STRANDS.template));
});

test('results tables are complete: one value per column, from the tool’s readouts', () => {
  for (const a of activities) {
    assert.ok(a.table.setting && a.table.columns.length >= 1 && a.table.rows.length >= 3 && a.table.rows.length <= 8, a.id);
    for (const [label, cells] of a.table.rows) {
      assert.ok(label, a.id);
      assert.equal(cells.length, a.table.columns.length, `${a.id}: ${label}`);
      for (const cell of cells) assert.ok(typeof cell === 'string' && cell.trim() && !/NaN|undefined|Infinity/.test(cell), `${a.id}: ${label} → ${cell}`);
    }
  }
});

test('every number printed in a question or answer matches the site’s own calculation to the printed precision', () => {
  let checked = 0;
  for (const a of activities) for (const q of a.questions) {
    for (const [shown, value] of q.checks) {
      assert.ok(printedIn(`${q.q} ${q.a}`, shown), `${a.id}: “${shown}” is not in the question or answer “${q.a}”`);
      if (typeof value === 'number') {
        const decimals = (shown.split('.')[1] || '').length;
        const printed = Number(shown.replace(/,/g, ''));
        assert.ok(Number.isFinite(printed), `${a.id}: ${shown} is not a number`);
        assert.ok(Math.abs(printed - value) <= 0.5 * 10 ** -decimals + 1e-9, `${a.id}: printed ${shown}, model gives ${value}`);
      } else assert.equal(shown, value, `${a.id}: printed ${shown}, model gives ${value}`);
      checked++;
    }
    for (const term of q.mentions || []) assert.ok(q.a.toLowerCase().includes(term.toLowerCase()), `${a.id}: answer should mention ${term}`);
  }
  assert.ok(checked >= 150, `only ${checked} printed values checked`);
});

test('answer-key tables show the values the tools display for those settings', () => {
  const row = (id, label) => findActivity(id).table.rows.find(r => r[0] === label)[1];
  assert.deepEqual(row('cell-size', 'Cube, s = 1 µm'), ['6 µm²', '1 µm³', '6 per µm']);
  assert.deepEqual(row('punnett-square', 'Aa × Aa'), ['1 : 2 : 1', '3 : 1', '25%']);
  assert.deepEqual(row('hardy-weinberg', 'Counts 30 · 60 · 10'), ['0.6', '0.4', '0.48 (48%)', '6.25']);
  assert.deepEqual(row('water-potential', 'Turgid plant cell (0.3 M, Ψp = +0.5 MPa)'), ['−0.743 MPa', '+0.5 MPa', '−0.243 MPa']);
  assert.deepEqual(row('bacterial-growth', 'E. coli · 20 min'), ['12', '4.1 × 10^6', '3.32 h']);
  assert.deepEqual(row('chi-square-test', 'Mendel: 705 purple : 224 white').slice(0, 3), ['0.391', '1', '3.841']);
  assert.deepEqual(row('dna-to-protein', 'Start–stop demo'), ['39 nt', '7', 'UGA at codon 8']);
});
