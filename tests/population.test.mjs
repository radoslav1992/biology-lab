import test from 'node:test';
import assert from 'node:assert/strict';
import { exponential, logistic, doublingTime, growthRate, growthSeries, bacterialGrowth, generationTime, energyPyramid, lotkaVolterra, lotkaVolterraBounds, formatCount, TROPHIC_LEVELS } from '../src/lib/population.mjs';
import * as bacterial from '../src/lib/tools/bacterial-growth.mjs';
import * as pyramid from '../src/lib/tools/energy-pyramid.mjs';
import * as predatorPrey from '../src/lib/tools/predator-prey.mjs';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
const metric = (result, label) => result.metrics.find(m => m.label === label)?.value;
const defaults = tool => Object.fromEntries(tool.definition.fields.map(f => [f.key, f.value]));
const CLEAN = /NaN|Infinity|undefined/;

test('exponential growth matches the textbook example and rejects bad input', () => {
  close(exponential(100, 0.1, 10), 271.83, 0.01);
  close(exponential(1000, Math.LN2, 12), 1000 * 4096, 1e-6);
  close(exponential(500, -0.2, 5), 500 * Math.exp(-1), 1e-9);
  assert.equal(exponential(80, 0, 100), 80);
  for (const bad of [[0, 0.1, 1], [-5, 0.1, 1], [100, NaN, 1], [100, 0.1, -1], ['100', 0.1, 1]]) assert.throws(() => exponential(...bad), Error);
  assert.throws(() => exponential(100, 10, 1000), /overflow/);
});

test('logistic growth starts at N0, passes through the known value, and approaches K from either side', () => {
  assert.equal(logistic(100, 0.1, 1000, 0), 100);
  close(logistic(100, 0.1, 1000, 10), 231.97, 0.01);
  close(logistic(100, 0.1, 1000, 500), 1000, 1e-9);
  close(logistic(2000, 0.5, 1000, 100), 1000, 1e-9);
  assert.ok(logistic(2000, 0.5, 1000, 1) > 1000 && logistic(2000, 0.5, 1000, 1) < 2000);
  assert.equal(logistic(1000, 0.3, 1000, 7), 1000);
  close(logistic(24, 1, 2000, 15), 2000, 0.1);
  assert.throws(() => logistic(100, -0.1, 1000, 1), /r must be 0 or greater/);
  assert.throws(() => logistic(100, 0.1, 0, 1), Error);
  assert.throws(() => logistic(100, 0.1, 1000, -1), Error);
});

test('doubling time is ln 2 / r and only exists for positive r', () => {
  close(doublingTime(Math.LN2), 1);
  close(doublingTime(0.011), 63.013, 0.001);
  close(doublingTime(0.1), 6.931, 0.001);
  assert.throws(() => doublingTime(0), /greater than 0/);
  assert.throws(() => doublingTime(-0.5), Error);
  assert.throws(() => doublingTime(NaN), Error);
});

test('growth rate dN/dt follows rN and rN(1 − N/K), peaking at K/2', () => {
  close(growthRate('exponential', 271.83, 0.1), 27.183);
  close(growthRate('logistic', 500, 0.1, 1000), 25);
  close(growthRate('logistic', 1000, 0.1, 1000), 0);
  assert.ok(growthRate('logistic', 1200, 0.1, 1000) < 0);
  assert.ok(growthRate('logistic', 500, 0.1, 1000) > growthRate('logistic', 400, 0.1, 1000));
  assert.ok(growthRate('logistic', 500, 0.1, 1000) > growthRate('logistic', 600, 0.1, 1000));
  assert.throws(() => growthRate('linear', 10, 0.1), /exponential or the logistic/);
  assert.throws(() => growthRate('logistic', 10, 0.1, 0), Error);
});

test('growth series spans 0 to tMax with the requested number of steps', () => {
  const s = growthSeries('logistic', { N0: 100, r: 0.1, K: 1000 }, 10, 20);
  assert.equal(s.length, 21);
  assert.deepEqual(s[0], [0, 100]);
  close(s[20][0], 10);
  close(s[20][1], logistic(100, 0.1, 1000, 10));
  const e = growthSeries('exponential', { N0: 100, r: 0.1 }, 10, 5);
  close(e[5][1], exponential(100, 0.1, 10));
  assert.throws(() => growthSeries('exponential', { N0: 100, r: 0.1 }, 0, 5), Error);
  assert.throws(() => growthSeries('exponential', { N0: 100, r: 0.1 }, 10, 2.5), Error);
});

test('bacterial growth doubles once per generation and generation time inverts it', () => {
  assert.deepEqual(bacterialGrowth(1, 20, 60), { generations: 3, N: 8 });
  const half = bacterialGrowth(1, 20, 70);
  close(half.generations, 3.5);
  close(half.N, 2 ** 3.5);
  assert.deepEqual(bacterialGrowth(100, 20, 0), { generations: 0, N: 100 });
  close(generationTime(1, 8, 60), 20);
  close(generationTime(100, 6400, 120), 20);
  close(generationTime(1000, 4096000, 240), 20);
  assert.throws(() => generationTime(8, 8, 60), /larger than the starting/);
  assert.throws(() => generationTime(8, 4, 60), Error);
  assert.throws(() => generationTime(1, 8, 0), Error);
  assert.throws(() => bacterialGrowth(1, 1, 100000), /500 generations/);
  assert.throws(() => bacterialGrowth(0, 20, 60), Error);
  assert.throws(() => bacterialGrowth(1, 0, 60), Error);
});

test('energy pyramid applies the 10% rule level by level', () => {
  const r = energyPyramid(10000, 4, 0.1);
  assert.deepEqual(r.levels.map(l => l.name), ['Producers', 'Primary consumers', 'Secondary consumers', 'Tertiary consumers']);
  assert.deepEqual(r.levels.map(l => l.level), [1, 2, 3, 4]);
  r.levels.map(l => l.energy).forEach((e, i) => close(e, [10000, 1000, 100, 10][i]));
  close(r.lost, 9990);
  assert.equal(r.transfers.length, 3);
  close(r.transfers[0].lost, 9000);
  const five = energyPyramid(1000000, 5, 0.2);
  assert.equal(five.levels[4].name, 'Quaternary consumers');
  close(five.levels[4].energy, 1000000 * 0.2 ** 4);
  assert.equal(TROPHIC_LEVELS.length, 5);
  assert.throws(() => energyPyramid(10000, 1, 0.1), /2 to 5/);
  assert.throws(() => energyPyramid(10000, 6, 0.1), Error);
  assert.throws(() => energyPyramid(10000, 3.5, 0.1), Error);
  assert.throws(() => energyPyramid(10000, 4, 0), /between 0 and 1/);
  assert.throws(() => energyPyramid(10000, 4, 1.5), Error);
  assert.throws(() => energyPyramid(0, 4, 0.1), Error);
});

test('Lotka–Volterra stays constant at the equilibrium and cycles around it otherwise', () => {
  const eq = lotkaVolterra({ prey: 30, predators: 12, alpha: 0.6, beta: 0.05, delta: 0.01, gamma: 0.3 }, { dt: 0.01, steps: 6000 });
  close(eq.equilibrium.prey, 30);
  close(eq.equilibrium.predators, 12);
  close(eq.maxPrey, 30, 1e-6); close(eq.minPrey, 30, 1e-6); close(eq.maxPredators, 12, 1e-6); close(eq.minPredators, 12, 1e-6);
  assert.equal(eq.series.length, 6001);
  close(eq.series[6000][0], 60, 1e-9);
  const params = { prey: 50, predators: 8, alpha: 0.6, beta: 0.05, delta: 0.01, gamma: 0.3 };
  const run = lotkaVolterra(params, { dt: 0.005, steps: 12000 });
  // The orbit is closed: V = δx − γ ln x + βy − α ln y is conserved along the RK4 trajectory.
  const V = ([, x, y]) => 0.01 * x - 0.3 * Math.log(x) + 0.05 * y - 0.6 * Math.log(y);
  const v0 = V(run.series[0]);
  for (const point of run.series) close(V(point), v0, 1e-6);
  assert.ok(run.maxPrey > 55 && run.maxPrey < 65 && run.minPrey > 10 && run.minPrey < 15);
  const bounds = lotkaVolterraBounds(params);
  close(bounds.maxPrey, run.maxPrey, 1e-3);
  close(bounds.minPrey, run.minPrey, 1e-3);
  close(bounds.maxPredators, run.maxPredators, 1e-3);
  close(bounds.minPredators, run.minPredators, 1e-3);
  for (const bad of [{ ...params, prey: 0 }, { ...params, beta: -1 }, { ...params, gamma: NaN }, {}]) assert.throws(() => lotkaVolterra(bad, { dt: 0.01, steps: 10 }), Error);
  assert.throws(() => lotkaVolterra(params, { dt: 0, steps: 10 }), Error);
  assert.throws(() => lotkaVolterra(params, { dt: 0.01, steps: 10.5 }), Error);
  assert.throws(() => lotkaVolterra({ prey: 10000, predators: 10000, alpha: 5, beta: 5, delta: 5, gamma: 5 }, { dt: 0.5, steps: 50 }), /unstable/);
});

test('formatCount switches to scientific notation above one million', () => {
  assert.equal(formatCount(6400), '6,400');
  assert.equal(formatCount(1000000), '1,000,000');
  assert.equal(formatCount(1.05e9), '1.05 × 10^9');
  assert.equal(formatCount(4096000), '4.1 × 10^6');
  assert.equal(formatCount(9.9999e7), '1 × 10^8');
  assert.equal(formatCount(11.3137, 2), '11.31');
  assert.throws(() => formatCount(Infinity), Error);
});

test('every explorer mode and preset returns metrics, steps, and a clean diagram', () => {
  for (const tool of [bacterial, pyramid, predatorPrey]) {
    const d = tool.definition, values = defaults(tool);
    assert.ok((d.seoTitle || d.title).length <= 65, `${d.slug} title`);
    assert.ok(d.description.length >= 120 && d.description.length <= 160, `${d.slug} description ${d.description.length}`);
    const modes = d.modes ? d.modes.map(m => m[0]) : [''];
    for (const mode of modes) {
      const r = tool.explore(values, mode);
      assert.ok(r.metrics.length >= 3 && r.metrics.length <= 6, `${d.slug}/${mode} metrics`);
      assert.ok(r.steps.length >= 2, `${d.slug}/${mode} steps`);
      for (const m of r.metrics) assert.doesNotMatch(String(m.value), CLEAN, `${d.slug}/${mode} ${m.label}`);
      for (const s of r.steps) assert.doesNotMatch(s, CLEAN, `${d.slug}/${mode} step`);
      const svg = tool.diagram(r.model);
      assert.ok(svg.length > 500, `${d.slug}/${mode} diagram`);
      assert.doesNotMatch(svg, CLEAN, `${d.slug}/${mode} diagram`);
    }
    for (const p of d.presets || []) {
      const r = tool.explore({ ...values, ...p.values }, p.mode || modes[0]);
      assert.ok(r.metrics.length >= 3, `${d.slug} preset ${p.label}`);
      assert.doesNotMatch(tool.diagram(r.model), CLEAN, `${d.slug} preset ${p.label}`);
    }
  }
});

test('bacterial growth explorer solves both directions with textbook numbers', () => {
  const v = defaults(bacterial);
  const final = bacterial.explore(v, 'final');
  assert.equal(metric(final, 'Generations n'), '6');
  assert.equal(metric(final, 'Final cells N'), '6,400');
  assert.equal(metric(final, 'Growth rate constant k'), '3 per h');
  assert.equal(metric(final, 'log₁₀ N'), '3.806');
  const gtime = bacterial.explore(v, 'gtime');
  assert.equal(metric(gtime, 'Generation time g'), '20 min');
  assert.equal(metric(gtime, 'Generations n'), '6');
  const ecoli = bacterial.explore({ ...v, n0: 1000, generation: 20, elapsed: 240 }, 'final');
  assert.equal(metric(ecoli, 'Generations n'), '12');
  assert.equal(metric(ecoli, 'Final cells N'), '4.1 × 10^6');
  const rich = bacterial.explore({ ...v, n0: 2000000, generation: 30, elapsed: 60 }, 'final');
  assert.equal(metric(rich, 'Time to one million cells'), 'Already ≥ 10⁶ at the start');
  assert.doesNotMatch(bacterial.diagram(rich.model), CLEAN);
  assert.doesNotMatch(bacterial.diagram(bacterial.explore({ ...v, elapsed: 0 }, 'final').model), CLEAN);
  assert.throws(() => bacterial.explore({ ...v, n: 50 }, 'gtime'), /larger than the starting/);
  assert.throws(() => bacterial.explore({ ...v, generation: 1, elapsed: 100000 }, 'final'), /500 generations/);
});

test('energy pyramid explorer reports each level and the total loss', () => {
  const r = pyramid.explore(defaults(pyramid));
  assert.equal(metric(r, 'Producers (level 1)'), '10,000 kJ');
  assert.equal(metric(r, 'Primary consumers (level 2)'), '1,000 kJ');
  assert.equal(metric(r, 'Tertiary consumers (level 4)'), '10 kJ');
  assert.equal(metric(r, 'Total energy lost'), '9,990 kJ (99.9%)');
  const two = pyramid.explore({ energy: 500, levels: 2, efficiency: 20 });
  assert.equal(two.metrics.length, 3);
  assert.equal(metric(two, 'Primary consumers (level 2)'), '100 kJ');
  const five = pyramid.explore({ energy: 1000000, levels: 5, efficiency: 10 });
  assert.equal(five.metrics.length, 6);
  assert.equal(metric(five, 'Quaternary consumers (level 5)'), '100 kJ');
  assert.match(pyramid.diagram(five.model), /Quaternary consumers/);
});

test('explorer field limits print as plain numbers, never in exponent form', () => {
  for (const tool of [bacterial, pyramid, predatorPrey]) for (const f of tool.definition.fields) {
    assert.doesNotMatch(String(f.min), /e[+-]/, `${tool.definition.slug} ${f.key} min`);
    assert.doesNotMatch(String(f.max), /e[+-]/, `${tool.definition.slug} ${f.key} max`);
  }
  assert.equal(String(bacterial.definition.fields.find(f => f.key === 'n').max), '1000000000000000');
});

test('the textbook predator–prey preset orbits visibly around the equilibrium', () => {
  const p = predatorPrey.definition.presets[0];
  const r = predatorPrey.explore({ ...defaults(predatorPrey), ...p.values });
  assert.equal(metric(r, 'Equilibrium prey x* = γ/δ'), '4');
  assert.equal(metric(r, 'Equilibrium predators y* = α/β'), '2.75');
  assert.ok(r.model.minPrey > 1 && r.model.minPredators > 1, 'neither population sits near zero');
  assert.match(metric(r, 'Cycle period (prey peak to peak)'), /^10\.\d+ time units$/);
});

test('predator–prey explorer finds the equilibrium, the swing, and the cycle period', () => {
  const v = defaults(predatorPrey);
  const r = predatorPrey.explore(v);
  assert.equal(metric(r, 'Equilibrium prey x* = γ/δ'), '30');
  assert.equal(metric(r, 'Equilibrium predators y* = α/β'), '12');
  assert.match(metric(r, 'Cycle period (prey peak to peak)'), /^15\.\d+ time units$/);
  assert.equal(metric(r, 'Small-swing period 2π/√(αγ)'), '14.81 time units');
  assert.ok(r.model.series.length <= 1001 && r.model.series.length > 100);
  close(r.model.series[r.model.series.length - 1][0], 60, 1e-9);
  const steady = predatorPrey.explore({ ...v, prey0: 30, predators0: 12 });
  assert.equal(metric(steady, 'Cycle period (prey peak to peak)'), 'No cycle: steady');
  assert.equal(metric(steady, 'Prey in this run (min – max)'), '30 – 30');
  const short = predatorPrey.explore({ ...v, duration: 5 });
  assert.equal(metric(short, 'Cycle period (prey peak to peak)'), 'Longer than this run');
  assert.throws(() => predatorPrey.explore({ ...v, prey0: 10000, predators0: 10000, alpha: 5, beta: 5, delta: 5, gamma: 5 }), /swing too fast/);
});
