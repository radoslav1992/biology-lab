// Bacterial growth explorer: binary fission, generations, doubling (generation) time, and a semi-log growth curve.
import { fmt, palette } from '../format.mjs';
import { text, line, circle, polyline, rect, chart } from '../svg.mjs';
import { bacterialGrowth, generationTime, formatCount } from '../population.mjs';

const field = (key, label, unit, value, min, max, step = 'any') => ({ key, label, unit, value, min, max, step });
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = n => String(n).split('').map(ch => ch === '-' ? '⁻' : SUP[Number(ch)]).join('');
/** Whole cells once the count is large; two decimals for tiny model values such as 11.31 cells. */
const cells = n => formatCount(n, n >= 1000 ? 0 : 2);
/** Minutes as a readable duration: "45 min", "3.32 h", "7 days". */
export const duration = m => m < 90 ? `${fmt(m, 1)} min` : m < 2880 ? `${fmt(m / 60, 2)} h` : `${fmt(m / 1440, 2)} days`;

export const definition = {
  slug: 'bacterial-growth',
  title: 'Bacterial growth & doubling time',
  seoTitle: 'Bacterial Growth Calculator — Generations & Doubling Time',
  category: 'Cells',
  icon: '2ⁿ',
  description: 'Find how many cells a bacterial culture holds after any number of doublings, or work out the generation time from two counts, with a log-scale growth curve.',
  keywords: 'binary fission generation time doubling time exponential e coli log phase growth rate constant colony forming units',
  meta: 'Binary fission · log-scale curve',
  fields: [
    field('n0', 'Starting cells N₀', 'cells', 100, 1, 1e12, 1),
    field('generation', 'Generation time g', 'minutes', 20, 1, 100000),
    field('elapsed', 'Elapsed time t', 'minutes', 120, 0, 1000000),
    field('n', 'Final cells N', 'cells', 6400, 1, 1e15),
  ],
  modes: [['final', 'Find the final population'], ['gtime', 'Find the generation time']],
  fieldsByMode: { final: ['n0', 'generation', 'elapsed'], gtime: ['n0', 'n', 'elapsed'] },
  presets: [
    { label: 'E. coli · 20 min', values: { n0: 1000, generation: 20, elapsed: 240 }, mode: 'final' },
    { label: 'Vibrio natriegens · 10 min', values: { n0: 1000, generation: 10, elapsed: 240 }, mode: 'final' },
    { label: 'M. tuberculosis · 20 h', values: { n0: 1000, generation: 1200, elapsed: 10080 }, mode: 'final' },
    { label: 'Measured: 100 → 6,400 in 2 h', values: { n0: 100, n: 6400, elapsed: 120 }, mode: 'gtime' },
  ],
  formula: 'N = N₀ × 2ⁿ,  where n = t / g',
  note: 'g is the generation (doubling) time and n is the number of generations in time t. The formula describes the log (exponential) phase of a culture; in a real flask growth slows as nutrients run out and waste builds up, and the curve levels off into the stationary phase.',
  lesson: 'prokaryotes-vs-eukaryotes',
  caption: 'Log-scale axis: a straight line means exponential growth · dots mark completed generations',
  diagramLabel: 'Semi-log chart of bacterial cell number against time with each completed generation marked by a dot',
  controlsTitle: 'Your culture',
  explanationTitle: 'How the count is found',
};

export function explore(values, mode = 'final') {
  const n0 = values.n0, elapsed = values.elapsed;
  let g, generations, N;
  if (mode === 'gtime') {
    g = generationTime(n0, values.n, elapsed);
    N = values.n;
    generations = Math.log2(N / n0);
  } else {
    g = values.generation;
    ({ generations, N } = bacterialGrowth(n0, g, elapsed));
  }
  const perHour = 60 / g, log10N = Math.log10(N);
  const generationsToMillion = n0 < 1e6 ? Math.log2(1e6 / n0) : null;
  const toMillion = generationsToMillion === null ? null : generationsToMillion * g;
  const millionText = toMillion === null ? 'Already ≥ 10⁶ at the start' : duration(toMillion);
  const millionStep = toMillion === null
    ? `The culture already starts with ${formatCount(n0)} cells, at or above one million, so no wait is needed to reach that milestone.`
    : `To reach one million cells from ${fmt(n0, 0)}, the culture needs log₂(10⁶ / ${fmt(n0, 0)}) = ${fmt(generationsToMillion, 2)} generations, which takes ${fmt(generationsToMillion, 2)} × ${fmt(g, 2)} min ≈ ${duration(toMillion)}.`;
  const metrics = mode === 'gtime'
    ? [
      { label: 'Generation time g', value: `${fmt(g, 2)} min` },
      { label: 'Generations n', value: fmt(generations, 3) },
      { label: 'Growth rate constant k', value: `${fmt(perHour, 3)} per h` },
      { label: 'log₁₀ N', value: fmt(log10N, 3) },
      { label: 'Time to one million cells', value: millionText },
    ]
    : [
      { label: 'Generations n', value: fmt(generations, 3) },
      { label: 'Final cells N', value: cells(N) },
      { label: 'log₁₀ N', value: fmt(log10N, 3) },
      { label: 'Growth rate constant k', value: `${fmt(perHour, 3)} per h` },
      { label: 'Time to one million cells', value: millionText },
    ];
  const steps = mode === 'gtime'
    ? [
      `The population grew by a factor of N / N₀ = ${cells(N)} / ${fmt(n0, 0)} = ${fmt(N / n0, 3)} in ${duration(elapsed)}.`,
      `Each generation doubles the count, so the number of generations is n = log₂(${fmt(N / n0, 3)}) = ${fmt(generations, 3)}. (Using base-10 logs: n = 3.32 × log₁₀(${fmt(N / n0, 3)}) = 3.32 × ${fmt(Math.log10(N / n0), 3)}.)`,
      `Generation time g = t / n = ${fmt(elapsed, 1)} min ÷ ${fmt(generations, 3)} = ${fmt(g, 2)} min (${duration(g)}). The growth rate constant k = n / t = ${fmt(perHour, 3)} generations per hour.`,
      millionStep,
    ]
    : [
      `Count the generations: n = t / g = ${fmt(elapsed, 1)} min ÷ ${fmt(g, 2)} min = ${fmt(generations, 3)} doublings${Number.isInteger(generations) ? '' : ' (the last one is only partly complete)'}.`,
      `Every generation doubles the count: N = N₀ × 2ⁿ = ${fmt(n0, 0)} × 2^${fmt(generations, 3)} = ${fmt(n0, 0)} × ${formatCount(2 ** generations, 2)} = ${cells(N)} cells.`,
      `In log form, log₁₀ N = log₁₀ N₀ + n × log₁₀ 2 = ${fmt(Math.log10(n0), 3)} + ${fmt(generations, 3)} × 0.301 = ${fmt(log10N, 3)}. Because the log of N rises by the same amount every generation, exponential growth plots as a straight line on a log-scale axis.`,
      `The growth rate constant k = 1 / g = ${fmt(perHour, 3)} generations per hour. ${millionStep}`,
    ];
  return { metrics, steps, model: { n0, g, elapsed, N, generations, mode } };
}

export function diagram(m) {
  const xMax = m.elapsed > 0 ? m.elapsed : m.g;
  const logN0 = Math.log10(m.n0), logEnd = logN0 + (xMax / m.g) * Math.LOG10E * Math.LN2;
  const yMin = Math.floor(logN0);
  const span = Math.max(1, Math.ceil(logEnd - yMin - 1e-9));
  const step = Math.ceil(span / 8), yTicks = Math.ceil(span / step), yMax = yMin + yTicks * step;
  const box = { left: 90, top: 46, width: 590, height: 376 };
  const c = chart({ box, x: [0, xMax], y: [yMin, yMax], xTicks: 6, yTicks, xLabel: 'Time (minutes)', yLabel: 'Number of cells (log scale)', xFormat: v => fmt(v, xMax < 12 ? 1 : 0), yFormat: v => `10${sup(Math.round(v))}` });
  let out = c.grid;
  const logAt = t => logN0 + (t / m.g) * Math.log10(2);
  // A millionth-cell milestone line, when it falls inside the plotted range.
  if (yMin <= 6 && yMax >= 6) out += line(box.left, c.py(6), box.left + box.width, c.py(6), { color: palette.sky, width: 1.5, dash: '6 5', opacity: 0.8 }) + text(box.left + box.width - 6, c.py(6) - 6, '1,000,000 cells', { size: 12, anchor: 'end', color: palette.sky, weight: 600 });
  // Exponential growth is a straight line on a semi-log plot.
  out += polyline([[c.px(0), c.py(logN0)], [c.px(xMax), c.py(logAt(xMax))]], { stroke: palette.leaf, width: 3 });
  const completed = Math.floor(xMax / m.g + 1e-9), every = Math.max(1, Math.ceil(completed / 30));
  for (let i = 1; i <= completed; i += every) {
    const t = i * m.g, X = c.px(t), Y = c.py(logAt(t));
    out += line(X, Y, X, box.top + box.height, { color: palette.leafLight, width: 1, dash: '3 4' });
    out += circle(X, Y, 4.5, { fill: palette.white, stroke: palette.leafDark, width: 2 });
    if (completed <= 12) out += text(X, Y - 11, String(i), { size: 12, color: palette.leafDark, weight: 600 });
  }
  const endX = c.px(m.elapsed), endY = c.py(Math.log10(m.N));
  out += circle(endX, endY, 6, { fill: palette.coral, stroke: palette.white, width: 2 });
  const labelAnchor = m.elapsed > xMax * 0.6 ? 'end' : 'start', dx = labelAnchor === 'end' ? -12 : 12;
  out += text(endX + dx, endY + (endY < box.top + 30 ? 22 : -12), `N = ${cells(m.N)} cells`, { size: 13, anchor: labelAnchor, color: palette.coralDark, weight: 700 });
  out += rect(box.left, 12, 250, 24, { fill: palette.white, stroke: palette.line, width: 1, rx: 6 }) + text(box.left + 10, 29, `${fmt(m.generations, 2)} generations · g = ${fmt(m.g, 1)} min`, { size: 12, anchor: 'start', color: palette.ink, weight: 600 });
  out += text(box.left + box.width, 29, `N₀ = ${cells(m.n0)} cells`, { size: 12, anchor: 'end', color: palette.muted });
  return out;
}
