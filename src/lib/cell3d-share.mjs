// Share-link state for the 3D cell viewer (/cells/3d/?cell=plant&focus=nucleus&explode=0.6) and the list of structures
// each model can focus. No imports, so the page script can use it without pulling in the organelle text.

export const CELL_KINDS = ['animal', 'plant'];

// Focusable structures per model, in list order. Atlas slugs where a page exists; the rest are described in cell3d.mjs.
export const CELLS = {
  animal: ['nucleus', 'nucleolus', 'rough-er', 'smooth-er', 'ribosome', 'golgi-apparatus', 'mitochondrion', 'lysosome', 'centrioles', 'cytoplasm', 'cell-membrane'],
  plant: ['cell-wall', 'cell-membrane', 'central-vacuole', 'nucleus', 'nucleolus', 'chloroplast', 'mitochondrion', 'rough-er', 'smooth-er', 'golgi-apparatus', 'ribosome', 'cytoplasm'],
};
export const DEFAULT_STATE = Object.freeze({ cell: 'animal', focus: null, explode: 0, cut: true });
// Friendly spellings people type or that other pages link with.
const ALIASES = { 'endoplasmic-reticulum': 'rough-er', er: 'rough-er', 'rough-endoplasmic-reticulum': 'rough-er', 'smooth-endoplasmic-reticulum': 'smooth-er', mitochondria: 'mitochondrion', ribosomes: 'ribosome', lysosomes: 'lysosome', chloroplasts: 'chloroplast', golgi: 'golgi-apparatus', membrane: 'cell-membrane', 'plasma-membrane': 'cell-membrane', vacuole: 'central-vacuole', wall: 'cell-wall', centriole: 'centrioles' };
const normalizeId = value => {
  const key = String(value ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  const id = ALIASES[key] || key;
  return CELLS.animal.includes(id) || CELLS.plant.includes(id) ? id : null;
};

/**
 * Read a query string (or URLSearchParams) into a complete, valid state. Unknown or malformed values fall back to the
 * defaults instead of failing. A focus that only exists in the other cell switches the cell (a chloroplast link always
 * opens the plant cell), because showing what the link points at is friendlier than dropping it.
 */
export function parseShareState(search = '') {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(String(search).replace(/^[^?]*\?/, '').replace(/#.*$/, ''));
  const rawCell = String(params.get('cell') ?? '').trim().toLowerCase();
  let cell = CELL_KINDS.includes(rawCell) ? rawCell : DEFAULT_STATE.cell;
  const focus = normalizeId(params.get('focus'));
  if (focus && !CELLS[cell].includes(focus)) cell = CELL_KINDS.find(k => CELLS[k].includes(focus));
  const ex = Number.parseFloat(params.get('explode'));
  const explode = Number.isFinite(ex) ? Math.round(Math.min(1, Math.max(0, ex)) * 100) / 100 : DEFAULT_STATE.explode;
  const rawCut = String(params.get('cut') ?? '').trim().toLowerCase();
  const cut = ['0', 'false', 'off', 'no'].includes(rawCut) ? false : DEFAULT_STATE.cut;
  return { cell, focus, explode, cut };
}

/** Turn a state into a query string (with the leading "?"), leaving out values that equal the defaults except the cell. */
export function serializeShareState(state = {}) {
  const s = parseShareState(new URLSearchParams({ cell: state.cell ?? '', focus: state.focus ?? '', explode: String(state.explode ?? ''), cut: state.cut === false ? '0' : '' }));
  const params = new URLSearchParams({ cell: s.cell });
  if (s.focus) params.set('focus', s.focus);
  if (s.explode > 0) params.set('explode', String(s.explode));
  if (!s.cut) params.set('cut', '0');
  return `?${params}`;
}

/** Link from an atlas page to the same organelle in 3D: the chloroplast opens the plant cell, the rest the animal cell. */
export function cell3dHref(slug) {
  const id = normalizeId(slug);
  if (!id) return '/cells/3d/';
  const cell = CELLS.animal.includes(id) ? 'animal' : 'plant';
  return `/cells/3d/${cell === 'plant' ? `?cell=plant&focus=${slug}` : `?focus=${slug}`}`;
}
