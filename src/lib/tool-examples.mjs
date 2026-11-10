// Worked examples shown under the /tools/<slug>/ explorers. Each one is a question as students phrase it, answered by the
// tool's own explore(): the steps and readouts are the strings the calculator prints for the same inputs, so the text cannot
// drift from the tool. `mode` and `values` also build the "#try=…" link that loads the example into the calculator.
import { explore, findExploration } from './explorations.mjs';
import { fmt } from './format.mjs';

/** Run a tool with its defaults plus the given values; return its steps and its readouts keyed by label. */
function solve(slug, mode, values) {
  const tool = findExploration(slug);
  const defaults = Object.fromEntries(tool.fields.map(f => [f.key, f.value]));
  const out = explore(slug, { ...defaults, ...values }, mode);
  const readout = Object.fromEntries(out.metrics.map(m => [m.label, m.value]));
  const read = label => { if (!(label in readout)) throw new Error(`${slug} has no readout “${label}”.`); return readout[label]; };
  return { steps: out.steps, read };
}

const builders = {
  'cell-size'() {
    const sphere = { radius: 10 }, cube = { side: 2 }, small = { side: 1 };
    const a = solve('cell-size', 'sphere', sphere), b = solve('cell-size', 'cube', cube), c = solve('cell-size', 'cube', small);
    return [
      { question: 'Calculate the surface area of a spherical cell with a radius of 10 µm. What is its surface area to volume ratio?', steps: a.steps.slice(0, 3), answer: `surface area ${a.read('Surface area')}, volume ${a.read('Volume')}, SA : V = ${a.read('SA : V ratio')} (the same as 0.3 : 1).`, mode: 'sphere', values: sphere },
      { question: 'A cube-shaped cell has sides of 2 µm. What are its surface area, its volume and its surface area to volume ratio?', steps: b.steps.slice(0, 3), answer: `surface area ${b.read('Surface area')}, volume ${b.read('Volume')}, SA : V = ${b.read('SA : V ratio')} (3 : 1).`, mode: 'cube', values: cube },
      { question: 'A cube-shaped cell grows from 1 µm to 2 µm on each side. What happens to its surface area to volume ratio?', steps: [`At 1 µm: surface area ${c.read('Surface area')}, volume ${c.read('Volume')}, so SA : V = ${c.read('SA : V ratio')}.`, `At 2 µm: surface area ${b.read('Surface area')}, volume ${b.read('Volume')}, so SA : V = ${b.read('SA : V ratio')}.`, 'Surface area went up 4 times but volume went up 8 times.'], answer: `the ratio halves, from ${c.read('SA : V ratio')} to ${c.read('SA : V if twice as large')}. A bigger cell has less membrane for each unit of volume.`, mode: 'cube', values: small },
    ];
  },
  'water-potential'() {
    const salt = { i: 2, c: 0.3, t: 35, p: 0 }, plant = { i: 1, c: 0.3, t: 25, p: 0.5 };
    const a = solve('water-potential', 'single', salt), b = solve('water-potential', 'single', plant);
    return [
      { question: 'Calculate the solute potential of a 0.3 M NaCl solution at 35 °C. Give your answer in bars.', steps: ['NaCl splits into two ions, Na⁺ and Cl⁻, so the ionization constant i = 2.', ...a.steps.slice(0, 2)], answer: `Ψs = ${a.read('Ψs in bars (R = 0.0831)')}, about −15.4 bars (${a.read('Solute potential Ψs')}).`, mode: 'single', values: salt },
      { question: 'A plant cell contains 0.3 M sucrose at 25 °C and has a pressure potential of +0.5 MPa. What is its water potential?', steps: b.steps.slice(1, 3), answer: `Ψ = ${b.read('Water potential Ψ')}. It is below zero, so the cell would still take up water from pure water (Ψ = 0).`, mode: 'single', values: plant },
    ];
  },
  'enzyme-kinetics'() {
    const fast = { vmax: 25, km: 0.5, s: 5 }, half = { vmax: 100, km: 2, s: 2 }, blocked = { vmax: 100, km: 2, s: 2, i: 1, ki: 1 };
    const a = solve('enzyme-kinetics', 'none', fast), b = solve('enzyme-kinetics', 'none', half), c = solve('enzyme-kinetics', 'competitive', blocked);
    return [
      { question: 'An enzyme has a Vmax of 25 µmol/min and a Km of 0.5 mM. What is the reaction rate at a substrate concentration of 5 mM?', steps: a.steps.slice(0, 2), answer: `V = ${a.read('Reaction rate V')}, about 23 µmol/min (${a.read('Percent of Vmax')} of Vmax).`, mode: 'none', values: fast },
      { question: 'An enzyme has a Vmax of 100 µmol/min and a Km of 2 mM. What is the rate when the substrate concentration equals Km?', steps: b.steps.slice(0, 2), answer: `V = ${b.read('Reaction rate V')}, exactly half of Vmax.`, mode: 'none', values: half },
      { question: 'The same enzyme (Vmax 100 µmol/min, Km 2 mM, [S] 2 mM) meets a competitive inhibitor at [I] = Ki = 1 mM. What is the new rate?', steps: c.steps.slice(0, 2), answer: `V = ${c.read('Reaction rate V')}, down from ${c.read('Rate without inhibitor')}. The apparent Km doubles to ${c.read('Apparent Km')}; Vmax is unchanged.`, mode: 'competitive', values: blocked },
    ];
  },
  'bacterial-growth'() {
    const coli = { n0: 1000, generation: 20, elapsed: 240 }, counts = { n0: 100, n: 6400, elapsed: 120 };
    const a = solve('bacterial-growth', 'final', coli), b = solve('bacterial-growth', 'gtime', counts);
    return [
      { question: 'E. coli divides every 20 minutes. Starting with 1,000 cells, how many cells are there after 4 hours?', steps: a.steps.slice(0, 2), answer: `${fmt(coli.n0 * 2 ** (coli.elapsed / coli.generation), 0)} cells (${a.read('Final cells N')}) after ${a.read('Generations n')} generations.`, mode: 'final', values: coli },
      { question: 'A bacterial culture grows from 100 cells to 6,400 cells in 2 hours. What is its generation (doubling) time?', steps: b.steps.slice(0, 3), answer: `${b.read('Generation time g')} per generation (${b.read('Generations n')} generations in 2 hours).`, mode: 'gtime', values: counts },
    ];
  },
};

/** Worked examples for a tool page: [{ question, steps, answer, mode, values }], or [] for tools that define none. */
export const toolExamples = slug => builders[slug]?.() ?? [];
export const toolsWithExamples = Object.keys(builders);
