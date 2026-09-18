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
const modules = [cellSize, enzymeKinetics, dilution, magnification, waterPotential, bacterialGrowth, energyPyramid, chiSquare, predatorPrey];
const bySlug = new Map(modules.map(m => [m.definition.slug, m]));
export const explorations = modules.map(m => m.definition);
export const defaultMode = tool => tool.modes?.[0]?.[0] ?? '';
export const activeKeys = (tool, mode) => tool.fieldsByMode?.[mode] ?? tool.fields.map(f => f.key);
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
