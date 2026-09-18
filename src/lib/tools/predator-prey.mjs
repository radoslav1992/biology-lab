// Predator–prey explorer: the Lotka–Volterra equations integrated with RK4, with equilibrium, swings, and cycle period.
import { fmt, palette } from '../format.mjs';
import { text, line, rect, polyline, chart } from '../svg.mjs';
import { lotkaVolterra, lotkaVolterraBounds } from '../population.mjs';

const field = (key, label, unit, value, min, max, step = 'any') => ({ key, label, unit, value, min, max, step });
const rate = v => fmt(v, v < 0.01 ? 6 : 4);
const MAX_STEPS = 200000;

export const definition = {
  slug: 'predator-prey',
  title: 'Predator–prey simulator (Lotka–Volterra)',
  seoTitle: 'Predator–Prey Simulator — Lotka–Volterra Population Cycles',
  category: 'Ecology',
  icon: '∿',
  description: 'Simulate prey and predator populations with the Lotka–Volterra equations: set the four rates, watch the boom-and-bust cycles, and find the equilibrium point.',
  keywords: 'lotka volterra predator prey cycle lynx hare oscillation equilibrium population dynamics differential equations',
  meta: 'RK4 simulation · cycle period',
  fields: [
    field('prey0', 'Starting prey x₀', '', 50, 0.01, 10000),
    field('predators0', 'Starting predators y₀', '', 8, 0.01, 10000),
    field('alpha', 'Prey growth rate α', 'per time unit', 0.6, 0.001, 5),
    field('beta', 'Predation rate β', 'per predator per time unit', 0.05, 0.00001, 5),
    field('delta', 'Predator efficiency δ', 'per prey per time unit', 0.01, 0.00001, 5),
    field('gamma', 'Predator death rate γ', 'per time unit', 0.3, 0.001, 5),
    field('duration', 'Run length', 'time units', 60, 1, 200),
  ],
  presets: [
    { label: 'Textbook example', values: { prey0: 8, predators0: 4, alpha: 1.1, beta: 0.4, delta: 0.1, gamma: 0.4, duration: 50 } },
    { label: 'Start at equilibrium', values: { prey0: 30, predators0: 12, alpha: 0.6, beta: 0.05, delta: 0.01, gamma: 0.3, duration: 60 } },
    { label: 'Slow predators', values: { prey0: 50, predators0: 8, alpha: 0.6, beta: 0.05, delta: 0.005, gamma: 0.15, duration: 100 } },
  ],
  formula: 'dx/dt = αx − βxy   ·   dy/dt = δxy − γy',
  note: 'x = prey, y = predators. Without predators the prey grow exponentially; without prey the predators die off exponentially. The equilibrium is x* = γ/δ prey and y* = α/β predators. Pick the time unit (weeks, years) and population unit (animals, thousands) that fit your case.',
  lesson: 'population-growth',
  caption: 'Green: prey · Orange: predators · dashed lines: the equilibrium the populations cycle around',
  diagramLabel: 'Time-series chart of prey and predator populations oscillating around their equilibrium values',
  controlsTitle: 'Your rates',
  explanationTitle: 'Reading the cycles',
};

export function explore(values) {
  const { alpha, beta, delta, gamma, duration } = values;
  const params = { prey: values.prey0, predators: values.predators0, alpha, beta, delta, gamma };
  // Size the RK4 step from the exact swing of the orbit so the integration stays accurate for any inputs.
  const bounds = lotkaVolterraBounds(params);
  const L = Math.max(alpha, gamma, beta * bounds.maxPredators, delta * bounds.maxPrey, Math.sqrt(alpha * delta * bounds.maxPrey), Math.sqrt(gamma * beta * bounds.maxPredators));
  const steps = Math.ceil(duration / Math.min(duration / 2000, 0.05 / L));
  if (!Number.isFinite(steps) || steps > MAX_STEPS) throw new Error('These values make the populations swing too fast or too far to simulate accurately over this run. Lower the rates, start closer to the equilibrium, or shorten the run.');
  const sim = lotkaVolterra(params, { dt: duration / steps, steps });
  const { series, equilibrium: eq } = sim;
  const steady = sim.maxPrey - sim.minPrey <= 1e-6 * sim.maxPrey && sim.maxPredators - sim.minPredators <= 1e-6 * sim.maxPredators;
  const peaks = [];
  for (let i = 1; i < series.length - 1; i++) if (series[i][1] > series[i - 1][1] && series[i][1] >= series[i + 1][1]) peaks.push(series[i][0]);
  const period = !steady && peaks.length >= 2 ? (peaks[peaks.length - 1] - peaks[0]) / (peaks.length - 1) : null;
  const linearPeriod = 2 * Math.PI / Math.sqrt(alpha * gamma);
  const x0 = values.prey0, y0 = values.predators0;
  const metrics = [
    { label: 'Equilibrium prey x* = γ/δ', value: fmt(eq.prey, 2) },
    { label: 'Equilibrium predators y* = α/β', value: fmt(eq.predators, 2) },
    { label: 'Prey in this run (min – max)', value: `${fmt(sim.minPrey, 2)} – ${fmt(sim.maxPrey, 2)}` },
    { label: 'Predators in this run (min – max)', value: `${fmt(sim.minPredators, 2)} – ${fmt(sim.maxPredators, 2)}` },
    { label: 'Cycle period (prey peak to peak)', value: steady ? 'No cycle: steady' : period === null ? 'Longer than this run' : `${fmt(period, 2)} time units` },
    { label: 'Small-swing period 2π/√(αγ)', value: `${fmt(linearPeriod, 2)} time units` },
  ];
  const steps_ = [
    `Prey: dx/dt = αx − βxy = ${rate(alpha)}x − ${rate(beta)}xy. Predators: dy/dt = δxy − γy = ${rate(delta)}xy − ${rate(gamma)}y. At the start (x = ${fmt(x0, 2)}, y = ${fmt(y0, 2)}) the prey change by ${fmt(alpha * x0 - beta * x0 * y0, 2)} and the predators by ${fmt(delta * x0 * y0 - gamma * y0, 2)} per time unit.`,
    `Set both rates to zero to find the equilibrium. x(α − βy) = 0 gives y* = α/β = ${rate(alpha)} / ${rate(beta)} = ${fmt(eq.predators, 2)} predators, and y(δx − γ) = 0 gives x* = γ/δ = ${rate(gamma)} / ${rate(delta)} = ${fmt(eq.prey, 2)} prey. ${steady ? 'You started exactly there, so both populations hold steady.' : 'Starting anywhere else, the populations orbit around this point instead of settling on it: the model has no damping.'}`,
    steady
      ? `Nudge either population away from the equilibrium and the cycle begins: with a small push the period would be 2π/√(αγ) = 2π/√(${rate(alpha)} × ${rate(gamma)}) = ${fmt(linearPeriod, 2)} time units.`
      : `Over ${fmt(duration, 1)} time units the prey ranged from ${fmt(sim.minPrey, 2)} to ${fmt(sim.maxPrey, 2)} and the predators from ${fmt(sim.minPredators, 2)} to ${fmt(sim.maxPredators, 2)}. Predators peak about a quarter of a cycle after the prey: plentiful prey feed more predators, the predators eat the prey down, then starve, and the prey recover.`,
    steady
      ? 'The classic Lotka–Volterra model has no carrying capacity, no refuges and no chance events, so the equilibrium is neutrally stable: any disturbance sets off a cycle that neither grows nor dies away.'
      : `${period === null ? `Fewer than two prey peaks fit in this run, so the period is longer than ${fmt(duration, 1)} time units; lengthen the run to measure it.` : `Prey peaks came ${fmt(period, 2)} time units apart.`} Close to the equilibrium the period is 2π/√(αγ) = ${fmt(linearPeriod, 2)} time units; bigger swings take longer because the populations spend time at very low numbers. Real populations, such as the snowshoe hare and Canada lynx, also feel carrying capacity, refuges and weather, so their cycles are noisier than this idealized picture.`,
  ];
  const every = Math.max(1, Math.floor(series.length / 800));
  const sampled = series.filter((_, i) => i % every === 0 || i === series.length - 1).map(([t, x, y]) => [t, x, y]);
  return { metrics, steps: steps_, model: { series: sampled, equilibrium: eq, maxPrey: sim.maxPrey, minPrey: sim.minPrey, maxPredators: sim.maxPredators, minPredators: sim.minPredators, duration } };
}

const niceMax = v => { const m = Math.max(1e-9, v) * 1.06; const mag = 10 ** Math.floor(Math.log10(m)); return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(s => s * mag >= m) || 10) * mag; };
const niceTicks = max => [6, 5, 4, 8, 10, 3].find(n => Math.abs(max / n - Math.round(max / n)) < 1e-9) || 5;

export function diagram(m) {
  const yMax = niceMax(Math.max(m.maxPrey, m.maxPredators, m.equilibrium.prey, m.equilibrium.predators));
  const box = { left: 84, top: 58, width: 596, height: 364 };
  const c = chart({ box, x: [0, m.duration], y: [0, yMax], xTicks: niceTicks(m.duration), yTicks: 5, xLabel: 'Time (units of your choice)', yLabel: 'Population size', xFormat: v => fmt(v, m.duration < 12 ? 1 : 0), yFormat: v => fmt(v, yMax < 10 ? 2 : yMax < 100 ? 1 : 0) });
  let out = c.grid;
  const clampY = v => Math.min(yMax, Math.max(0, v));
  out += line(box.left, c.py(clampY(m.equilibrium.prey)), box.left + box.width, c.py(clampY(m.equilibrium.prey)), { color: palette.leafDark, width: 1.5, dash: '7 6', opacity: 0.7 });
  out += line(box.left, c.py(clampY(m.equilibrium.predators)), box.left + box.width, c.py(clampY(m.equilibrium.predators)), { color: palette.coralDark, width: 1.5, dash: '7 6', opacity: 0.7 });
  out += polyline(m.series.map(([t, x]) => [c.px(t), c.py(clampY(x))]), { stroke: palette.leaf, width: 3 });
  out += polyline(m.series.map(([t, , y]) => [c.px(t), c.py(clampY(y))]), { stroke: palette.coral, width: 3 });
  out += rect(box.left, 16, 336, 26, { fill: palette.white, stroke: palette.line, width: 1, rx: 6 });
  out += line(box.left + 12, 29, box.left + 32, 29, { color: palette.leaf, width: 3 }) + text(box.left + 38, 33, `Prey · x* = ${fmt(m.equilibrium.prey, 2)}`, { size: 12, anchor: 'start', color: palette.ink });
  out += line(box.left + 158, 29, box.left + 178, 29, { color: palette.coral, width: 3 }) + text(box.left + 184, 33, `Predators · y* = ${fmt(m.equilibrium.predators, 2)}`, { size: 12, anchor: 'start', color: palette.ink });
  out += text(box.left + box.width, 33, `prey ${fmt(m.minPrey, 1)}–${fmt(m.maxPrey, 1)} · predators ${fmt(m.minPredators, 1)}–${fmt(m.maxPredators, 1)}`, { size: 12, anchor: 'end' });
  return out;
}
