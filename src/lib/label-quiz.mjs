// Question data for the label-the-cell quiz (/cells/label-the-cell/). Nothing here is new content: the structures in the
// two label modes are the pointers that cell-diagram.mjs draws on the atlas's reference cells, and every function is a
// row of the organelle chart in organelles.mjs. tests/label-quiz.test.mjs keeps the three in step.
import { organelles, organelleChart, cellTypes } from './organelles.mjs';
import { drawCell } from './cell-diagram.mjs';

export const QUIZ_MODES = Object.freeze([
  ['animal', 'Animal cell'],
  ['plant', 'Plant cell'],
  ['functions', 'Function match'],
]);

const slugify = name => name.toLowerCase().replace(/\s+/g, '-');
const lowerFirst = s => s.charAt(0).toLowerCase() + s.slice(1);
const CHART_LINK = { href: '/cells/#organelle-chart', linkLabel: 'See it in the organelle chart' };

// Which organelle chart rows describe each structure the diagrams point at. The drawings label the endoplasmic reticulum
// as one organelle (the chart splits it into rough and smooth) and call the plant cell's vacuole the central vacuole.
const CHART_ROWS = {
  nucleus: ['Nucleus'], mitochondrion: ['Mitochondrion'], chloroplast: ['Chloroplast'], ribosome: ['Ribosome'],
  'endoplasmic-reticulum': ['Rough endoplasmic reticulum', 'Smooth endoplasmic reticulum'],
  'golgi-apparatus': ['Golgi apparatus'], lysosome: ['Lysosome'], 'cell-membrane': ['Cell membrane'],
  centrioles: ['Centrioles'], 'cell-wall': ['Cell wall'], 'central-vacuole': ['Vacuole'],
};

// Other names a typed answer may use, keyed by structure id (label modes) or chart row id (function match).
const ALSO_ACCEPT = {
  mitochondrion: ['mitochondria'],
  chloroplast: ['chloroplasts'],
  ribosome: ['ribosome', 'ribosomes'],
  'endoplasmic-reticulum': ['ER', 'rough endoplasmic reticulum', 'rough ER', 'smooth endoplasmic reticulum', 'smooth ER'],
  'rough-endoplasmic-reticulum': ['rough ER', 'RER'],
  'smooth-endoplasmic-reticulum': ['smooth ER', 'SER'],
  'golgi-apparatus': ['Golgi', 'Golgi body', 'Golgi complex'],
  lysosome: ['lysosomes'],
  peroxisome: ['peroxisomes'],
  'cell-membrane': ['plasma membrane', 'cell surface membrane'],
  centrioles: ['centriole'],
  'central-vacuole': ['vacuole', 'large central vacuole', 'permanent vacuole'],
  vacuole: ['vacuoles', 'central vacuole'],
  vesicles: ['vesicle', 'transport vesicles'],
  cytoplasm: ['cytosol'],
};

const chartRow = name => { const row = organelleChart.find(r => r[0] === name); if (!row) throw new Error(`No organelle chart row “${name}”.`); return row; };
const link = slug => slug ? { href: `/cells/${slug}/`, linkLabel: `${organelles[slug].title}: structure and function` } : CHART_LINK;

/** The job printed after an answer: the chart's main function, or one clause per chart row when a structure has two. */
function jobFor(id) {
  const rows = (CHART_ROWS[id] || []).map(chartRow);
  if (!rows.length) throw new Error(`No organelle chart row for “${id}”.`);
  return rows.length === 1 ? `${rows[0][2]}.` : rows.map(r => `${r[0].replace('endoplasmic reticulum', 'ER')}: ${lowerFirst(r[2])}.`).join(' ');
}

/**
 * The numbered structures of one cell diagram, in pointer order:
 * [{ n, id, name, accept, job, href, linkLabel }]. `accept` lists the names a typed answer may use.
 */
export function labelItems(kind) {
  if (!cellTypes[kind]) throw new Error(`Unknown cell type “${kind}”.`);
  return drawCell(kind, { pointers: true }).pointers.map(p => ({
    n: p.n, id: p.id, name: p.name, accept: [p.name, ...(ALSO_ACCEPT[p.id] || [])], job: jobFor(p.id), ...link(organelles[p.id] ? p.id : ''),
  }));
}

/** One question per organelle chart row: [{ id, name, accept, job, href, linkLabel, animal, plant }]. */
export function functionItems() {
  return organelleChart.map(([name, slug, job, animal, plant]) => {
    const id = slugify(name);
    return { id, name, accept: [name, ...(ALSO_ACCEPT[id] || [])], job: `${job}.`, ...link(slug), animal, plant };
  });
}

/** Questions for a quiz mode: 'animal' or 'plant' (label the diagram) or 'functions' (match organelle to function). */
export function quizItems(mode) {
  if (mode === 'functions') return functionItems();
  if (mode === 'animal' || mode === 'plant') return labelItems(mode);
  throw new Error('Choose the animal cell, the plant cell, or function match.');
}

/** The word bank for a mode: every answer once, in alphabetical order. */
export const wordBank = mode => quizItems(mode).map(item => item.name).sort((a, b) => a.localeCompare(b));
