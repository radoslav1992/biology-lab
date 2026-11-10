// Registry for the generic /tools/<slug>/ explorers. Each module exports {definition, explore, diagram}.
import * as cellSize from './tools/cell-size.mjs';
import * as enzymeKinetics from './tools/enzyme-kinetics.mjs';
import * as dilution from './tools/dilution-calculator.mjs';
import * as magnification from './tools/magnification-calculator.mjs';
import * as waterPotential from './tools/water-potential.mjs';
import * as bacterialGrowth from './tools/bacterial-growth.mjs';
import * as energyPyramid from './tools/energy-pyramid.mjs';
import * as chiSquare from './tools/chi-square-test.mjs';
import * as predatorPrey from './tools/predator-prey.mjs';
import * as wordProblems from './tools/population-word-problems.mjs';
const modules = [cellSize, enzymeKinetics, dilution, magnification, waterPotential, bacterialGrowth, energyPyramid, chiSquare, predatorPrey];
// Embedded explorers render inside a flagship page instead of getting their own /tools/<slug>/ route and catalog card.
const embedded = [wordProblems];
const bySlug = new Map([...modules, ...embedded].map(m => [m.definition.slug, m]));
export const explorations = modules.map(m => m.definition);
export const findExploration = slug => bySlug.get(slug)?.definition;
export const defaultMode = tool => tool.modes?.[0]?.[0] ?? '';
export const activeKeys = (tool, mode) => tool.fieldsByMode?.[mode] ?? tool.fields.map(f => f.key);
/**
 * Link that opens an explorer with a mode and values filled in, e.g. "/tools/cell-size/#try=sphere&radius=10".
 * The state lives in the URL fragment, so every link still points at the one canonical page.
 */
export function prefillHref(path, mode, values = {}) {
  return `${path}#${new URLSearchParams({ try: mode ?? '', ...values })}`;
}
/** Read a "#try=…" fragment back into { mode, values } for a tool; null when the fragment is not a prefill link. */
export function parsePrefill(hash, tool) {
  const params = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  if (!params.has('try')) return null;
  const wanted = params.get('try');
  const mode = tool.modes?.some(([value]) => value === wanted) ? wanted : defaultMode(tool);
  const values = {};
  for (const f of tool.fields) {
    const raw = params.get(f.key);
    if (raw === null || raw.trim() === '') continue;
    const v = Number(raw);
    if (Number.isFinite(v)) values[f.key] = v;
  }
  return { mode, values };
}
export function validateFields(tool, values, mode = defaultMode(tool)) {
  const keys = activeKeys(tool, mode);
  for (const f of tool.fields) {
    if (!keys.includes(f.key)) continue;
    const v = values[f.key];
    if (!Number.isFinite(v) || v < f.min || v > f.max) throw new Error(`${f.label}: enter a value from ${f.min} to ${f.max}.`);
    if (f.step === 1 && !Number.isInteger(v)) throw new Error(`${f.label}: use a whole number.`);
  }
}
export function explore(slug, values, mode) {
  const m = bySlug.get(slug);
  if (!m) throw new Error('Unknown tool.');
  const tool = m.definition, md = mode || defaultMode(tool);
  if (tool.modes && !tool.modes.some(([value]) => value === md)) throw new Error('Choose a supported mode.');
  validateFields(tool, values, md);
  return m.explore(values, md);
}
export function explorationDiagram(slug, model) {
  const m = bySlug.get(slug);
  if (!m) throw new Error('Unknown tool.');
  return m.diagram(model);
}
