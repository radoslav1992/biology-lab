// 3D cell viewer (/cells/3d/): the info card and list entry for every structure the models can focus, built at page
// build time (the share-link helpers are re-exported from cell3d-share.mjs). Pure data and functions only: the Three.js
// scenes live in cell3d-models.mjs / cell3d-viewer.mjs and load lazily.
// Every fact printed for a structure comes from organelles.mjs (atlas pages, the organelle chart, and the cell types).
import { organelles, organelleChart, cellTypes } from './organelles.mjs';
import { CELLS } from './cell3d-share.mjs';

export { CELL_KINDS, CELLS, DEFAULT_STATE, parseShareState, serializeShareState, cell3dHref } from './cell3d-share.mjs';

const chartRow = name => {
  const row = organelleChart.find(r => r[0] === name);
  if (!row) throw new Error(`organelleChart has no row "${name}"`);
  const [, slug, job, animal, plant, membranes] = row;
  return { slug, job, animal, plant, membranes };
};
const extra = (kind, name) => {
  const e = cellTypes[kind].extras.find(x => x[0] === name);
  if (!e) throw new Error(`cellTypes.${kind} has no extra "${name}"`);
  return { description: e[1], note: e[2] };
};

// Structures in the 3D models that have no atlas page. Their text is the site's own: the cell-type extras drawn in
// the 2D diagram, the organelle chart on /cells/, and the nucleus entry for the nucleolus.
const nucleusFn = organelles.nucleus.functions.find(f => f[0] === 'Builds ribosome parts');
export const NON_ATLAS = {
  nucleolus: { name: 'Nucleolus', chart: 'Nucleolus', type: 'Region inside the nucleus · no membrane', intro: `${nucleusFn[1]}. It sits inside the nucleus and has no membrane of its own.`, href: '/cells/nucleus/', cta: 'Open the nucleus page' },
  centrioles: { name: 'Centrioles', chart: 'Centrioles', extra: ['animal', 'Centrioles'], href: '/cells/#organelle-chart', cta: 'See the organelle chart' },
  // The glycolysis numbers are the mitochondrion entry's own (2 ATP in the cytoplasm, about 28 more in the mitochondrion).
  cytoplasm: { name: 'Cytoplasm', chart: 'Cytoplasm', type: 'Cell fluid · no membrane', intro: 'The cytoplasm is the fluid that fills the cell around the organelles, where glycolysis and many other reactions happen. Glycolysis there yields just 2 ATP per glucose; the mitochondria make about 28 more.', href: '/learn/cellular-respiration/', cta: 'Read the lesson: cellular respiration' },
  'cell-wall': { name: 'Cell wall', chart: 'Cell wall', extra: ['plant', 'Cell wall'], href: '/cells/cell-membrane/', cta: 'Compare with the cell membrane' },
  'central-vacuole': { name: 'Central vacuole', chart: 'Vacuole', extra: ['plant', 'Central vacuole'], href: '/cells/#organelle-chart', cta: 'See the organelle chart' },
};

// The two ER regions are separate pieces of the model but share one atlas page.
const ER_PARTS = {
  'rough-er': { name: 'Rough ER', chart: 'Rough endoplasmic reticulum' },
  'smooth-er': { name: 'Smooth ER', chart: 'Smooth endoplasmic reticulum' },
};

// Colors follow the 2D CellDiagram palette (used for the list swatches and the labels).
export const COLORS = {
  nucleus: '#7b4b8a', nucleolus: '#5b2f6b', 'rough-er': '#4b86b4', 'smooth-er': '#8dbbe0', ribosome: '#173226',
  'golgi-apparatus': '#356a94', mitochondrion: '#f6c453', lysosome: '#e2703a', centrioles: '#c9bc94', cytoplasm: '#f1dfa6',
  'cell-membrane': '#2f8a5b', chloroplast: '#4caf6e', 'cell-wall': '#226b45', 'central-vacuole': '#a9c6de',
};
// Names that read better in a list than the atlas title (plural where the model shows many).
const LIST_NAMES = { mitochondrion: 'Mitochondria', ribosome: 'Ribosomes', lysosome: 'Lysosomes', chloroplast: 'Chloroplasts' };

/** Atlas slug a structure belongs to, or null for a structure with no atlas page. */
export function atlasSlug(id) {
  if (organelles[id]) return id;
  if (ER_PARTS[id]) return 'endoplasmic-reticulum';
  return null;
}

/** Everything the info panel shows for one structure: title, type line, intro, 2–3 fact rows and one link. */
export function structureInfo(id) {
  const slug = atlasSlug(id);
  if (slug) {
    const o = organelles[slug];
    const er = ER_PARTS[id];
    const chart = er ? chartRow(er.chart) : chartRow(organelleChart.find(r => r[1] === slug)[0]);
    const pick = key => o.properties.find(p => p[0] === key);
    const rows = [['Main job', chart.job], ...(er ? [pick('Structure'), pick('Typical size')] : [pick('Typical size') || pick('Thickness'), pick('Number per cell')])].filter(Boolean);
    return { id, slug, title: er ? `${er.name} (${er.chart.toLowerCase()})` : o.title, name: er ? er.name : LIST_NAMES[slug] || o.title, type: o.type, intro: o.intro, rows, href: `/cells/${slug}/`, cta: `Open the ${o.title.toLowerCase()} page`, color: COLORS[id] };
  }
  const n = NON_ATLAS[id];
  if (!n) throw new Error(`unknown 3D structure "${id}"`);
  const c = chartRow(n.chart);
  const e = n.extra ? extra(...n.extra) : null;
  const rows = [['Main job', c.job], ['Membranes', c.membranes], ['Animal cell / plant cell', `${c.animal} / ${c.plant}`]];
  return { id, slug: null, title: n.name, name: n.name, type: e ? e.note : n.type, intro: e ? e.description : n.intro, rows, href: n.href, cta: n.cta, color: COLORS[id] };
}

/** Structures of one model with the fields the list and the viewer need. */
export function cellStructures(kind) {
  return (CELLS[kind] || CELLS.animal).map(id => structureInfo(id));
}

