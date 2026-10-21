// Population growth word-problem solver, embedded on /population-growth-calculator/ (it has no /tools/ page of its own).
// A rate given as a percentage compounds once per period, N = N₀(1 + p)^t; every answer also shows the same number read
// as a continuous rate r in N₀e^(rt), because textbooks use both and the two differ slightly.
import { fmt, palette } from '../format.mjs';
import { text, line, circle, polyline, chart, curve } from '../svg.mjs';
import { compoundGrowth, timeToReach, growthRateFromCounts, doublingTimes, afterDoublings, formatCount } from '../population.mjs';

const field = (key, label, unit, value, min, max, step = 'any') => ({ key, label, unit, value, min, max, step });
// Word problems quote whole numbers such as 1,086,400, so digits stay plain up to a trillion.
const count = n => Math.abs(n) >= 1e12 ? formatCount(n) : fmt(n, Math.abs(n) >= 1000 ? 0 : 2);
const factor = f => formatCount(f, f >= 100 ? 1 : 4);
const years = t => { const s = fmt(t, 2); return `${s} ${s === '1' ? 'year' : 'years'}`; };
const rate = p => (Math.abs(p) * 100 > 1e6 ? formatCount(p * 100, 3) : fmt(p * 100, 3)) + '%';
const compact = v => { const a = Math.abs(v); if (a >= 1e15) return formatCount(v); if (a >= 1e12) return fmt(v / 1e12, 2) + 'T'; if (a >= 1e9) return fmt(v / 1e9, 2) + 'B'; if (a >= 1e6) return fmt(v / 1e6, 2) + 'M'; if (a >= 1e4) return fmt(v / 1e3, 1) + 'k'; return fmt(v, 2); };
// Round an axis end up to 1, 1.2, 1.5, 2, 2.5 … × 10ⁿ, and pick a tick count that divides it into whole steps.
const niceMax = v => { const m = Math.max(1e-9, v) * 1.08; const mag = 10 ** Math.floor(Math.log10(m)); return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(s => s * mag >= m) || 10) * mag; };
const niceTicks = max => [6, 5, 4, 8, 10, 3].find(n => Math.abs(max / n - Math.round(max / n)) < 1e-9) || 5;
/** Doubling time for a positive percentage rate, halving time for a negative one, as a metric tile. */
const doublingTile = p => p > 0 ? { label: 'Doubling time at this rate', value: years(doublingTimes(p).exact) } : p < 0 ? { label: 'Halving time at this rate', value: years(Math.log(0.5) / Math.log1p(p)) } : { label: 'Doubling time at this rate', value: 'Never (0% growth)' };

export const definition = {
  slug: 'population-word-problems',
  title: 'Population growth word-problem solver',
  seoTitle: 'Population Growth Word Problem Solver — Time, Rate & Doubling',
  category: 'Ecology',
  icon: '%',
  description: 'Solve population growth word problems: the years needed to reach a target at a % growth rate, the population after t years, doubling time, or the growth rate itself.',
  keywords: 'how long will it take population percent per year doubling time rule of 70 growth rate per capita natural increase',
  meta: 'Compound and continuous growth',
  fields: [
    field('n0', 'Starting population N₀', 'individuals', 20000, 1, 1e12),
    field('n', 'Target or later population N', 'individuals', 210000, 1, 1e15),
    field('rate', 'Growth rate', '% per year', 12, -99, 1000),
    field('t', 'Time t', 'years', 10, 0, 100000),
    field('td', 'Doubling time', 'years', 60, 0.01, 1000000),
  ],
  modes: [['time', 'Years to reach N'], ['future', 'Population after t'], ['doubling', 'Doubling time'], ['doublings', 'Doubles every…'], ['rate', 'Find the rate']],
  fieldsByMode: { time: ['n0', 'n', 'rate'], future: ['n0', 'rate', 't'], doubling: ['n0', 'rate'], doublings: ['n0', 'td', 't'], rate: ['n0', 'n', 't'] },
  presets: [
    { label: '20,000 at 12%/yr → 210,000', values: { n0: 20000, n: 210000, rate: 12 }, mode: 'time' },
    { label: '2,000 at 2.5%/yr → 2,700', values: { n0: 2000, n: 2700, rate: 2.5 }, mode: 'time' },
    { label: '6.17 billion, r = 0.013', values: { n0: 6170000000, rate: 1.3 }, mode: 'doubling' },
    { label: '1,100 doubling every 60 yr, in 180 yr', values: { n0: 1100, td: 60, t: 180 }, mode: 'doublings' },
    { label: '67,900 doubling every 21 yr, in 84 yr', values: { n0: 67900, td: 21, t: 84 }, mode: 'doublings' },
    { label: 'US census 1960 → 2020', values: { n0: 179323175, n: 331449281, t: 60 }, mode: 'rate' },
  ],
  formula: 'N = N₀(1 + r)^t   ·   t = ln(N / N₀) ÷ ln(1 + r)',
  note: 'Enter the rate as a percentage per time period: 12 for 12% per year, −3 for a 3% decline. “Grows by 12% per year” means compound growth, N₀(1 + 0.12)^t; if your problem gives a continuous rate r and uses e, read the continuous answer shown alongside. Any time unit works as long as the rate and the time use the same one.',
  lesson: 'population-growth',
  caption: 'Solid curve: growth compounded once a year · dashed curve: the same number as a continuous rate',
  diagramLabel: 'Line chart of population size against time for the word problem, marking the starting population, the target or result, and the answer',
  controlsTitle: 'Your word problem',
  explanationTitle: 'Solve it step by step',
};

export function explore(values, mode = 'time') {
  const n0 = values.n0, p = values.rate / 100;
  if (mode === 'time') {
    const n = values.n, t = timeToReach(n0, n, p), tc = timeToReach(n0, n, p, { continuous: true }), ratio = n / n0;
    return {
      metrics: [
        { label: 'Time to reach N', value: years(t) },
        { label: 'To the nearest year', value: years(Math.round(t)) },
        { label: 'Growth factor N / N₀', value: `${factor(ratio)}×` },
        { label: `If ${fmt(p, 4)} is a continuous rate r`, value: years(tc) },
        doublingTile(p),
      ],
      steps: [
        `Growth of ${rate(p)} per year multiplies the population by 1 + r = ${fmt(1 + p, 4)} every year, so N = N₀(1 + r)^t. Set N equal to the target: ${count(n)} = ${count(n0)} × ${fmt(1 + p, 4)}^t.`,
        `Divide both sides by N₀: ${fmt(1 + p, 4)}^t = ${count(n)} ÷ ${count(n0)} = ${factor(ratio)}. Take the natural log of both sides to bring t down: t × ln(${fmt(1 + p, 4)}) = ln(${factor(ratio)}).`,
        `So t = ln(${factor(ratio)}) ÷ ln(${fmt(1 + p, 4)}) = ${fmt(Math.log(ratio), 4)} ÷ ${fmt(Math.log1p(p), 5)} = ${years(t)}, which rounds to ${years(Math.round(t))}. Check: ${count(n0)} × ${fmt(1 + p, 4)}^${fmt(t, 2)} ≈ ${count(compoundGrowth(n0, p, t))}.`,
        `If the problem gives ${fmt(p, 4)} as a continuous rate (N = N₀e^(rt)), solve t = ln(N / N₀) ÷ r = ${fmt(Math.log(ratio), 4)} ÷ ${fmt(p, 4)} = ${years(tc)} instead.`,
      ],
      model: { mode, n0, p, target: n, t, xMax: t > 0 ? niceMax(t) : 1 },
    };
  }
  if (mode === 'future') {
    const t = values.t, N = compoundGrowth(n0, p, t), Nc = n0 * Math.exp(p * t), continuous = Number.isFinite(Nc) ? count(Nc) : 'too large to show';
    return {
      metrics: [
        { label: `Population after ${years(t)}`, value: count(N) },
        { label: 'Growth factor (1 + r)^t', value: `${factor(N / n0)}×` },
        { label: 'Change from N₀', value: `${N >= n0 ? '+' : '−'}${count(Math.abs(N - n0))}` },
        { label: `If ${fmt(p, 4)} is a continuous rate r`, value: continuous },
        doublingTile(p),
      ],
      steps: [
        `Each year the population is multiplied by 1 + r = 1 + ${fmt(p, 4)} = ${fmt(1 + p, 4)}${p < 0 ? ', so it shrinks' : ''}. After t years that is t multiplications: N = N₀(1 + r)^t.`,
        `N = ${count(n0)} × ${fmt(1 + p, 4)}^${fmt(t, 3)} = ${count(n0)} × ${factor((1 + p) ** t)} = ${count(N)}.`,
        `Read as a continuous rate, N = N₀e^(rt) = ${count(n0)} × e^(${fmt(p, 4)} × ${fmt(t, 3)}) = ${continuous}. Continuous growth runs ${p >= 0 ? 'slightly ahead' : 'slightly lower'} because each instant’s change compounds immediately instead of once a year.`,
      ],
      model: { mode, n0, p, target: N, t, xMax: t > 0 ? t : 1 },
    };
  }
  if (mode === 'doubling') {
    const d = doublingTimes(p);
    return {
      metrics: [
        { label: `Doubling time at ${rate(p)} per year`, value: years(d.exact) },
        { label: `Doubling time if r = ${fmt(p, 4)} is continuous`, value: years(d.continuous) },
        { label: 'Rule of 70 estimate', value: years(d.ruleOf70) },
        { label: 'Population after one doubling', value: count(2 * n0) },
        { label: `After three doublings (${years(3 * d.exact)})`, value: count(8 * n0) },
      ],
      steps: [
        `A population has doubled when (1 + r)^t = 2, so t = ln 2 ÷ ln(1 + r) = 0.6931 ÷ ln(${fmt(1 + p, 4)}) = 0.6931 ÷ ${fmt(Math.log1p(p), 5)} = ${years(d.exact)}.`,
        `If the problem gives r = ${fmt(p, 4)} as a continuous rate (N = N₀e^(rt)), the doubling time is ln 2 ÷ r = 0.6931 ÷ ${fmt(p, 4)} = ${years(d.continuous)}.`,
        `The rule of 70 is the mental-math version: 70 ÷ ${fmt(p * 100, 3)} = ${years(d.ruleOf70)}. It works because ln 2 ≈ 0.693 and ln(1 + r) ≈ r for small r, so it is close below about 10% per year and drifts at larger rates.`,
        `From ${count(n0)}, the population reaches ${count(2 * n0)} after one doubling, ${count(4 * n0)} after two and ${count(8 * n0)} after three, ${years(3 * d.exact)} from now if the rate holds.`,
      ],
      model: { mode, n0, p, td: d.exact, xMax: niceMax(3 * d.exact) },
    };
  }
  if (mode === 'doublings') {
    const td = values.td, t = values.t, { doublings, N } = afterDoublings(n0, td, t);
    return {
      metrics: [
        { label: `Population after ${years(t)}`, value: count(N) },
        { label: 'Number of doublings t ÷ Td', value: fmt(doublings, 3) },
        { label: 'Growth factor 2ⁿ', value: `${factor(2 ** doublings)}×` },
        { label: 'Same growth as a yearly rate', value: rate(2 ** (1 / td) - 1) },
        { label: 'Continuous rate r = ln 2 ÷ Td', value: `${fmt(Math.LN2 / td, 5)} per year` },
      ],
      steps: [
        `Count the doublings: n = t ÷ Td = ${fmt(t, 3)} ÷ ${fmt(td, 3)} = ${fmt(doublings, 3)}${Number.isInteger(doublings) ? '' : ' (the last one only partly complete)'}.`,
        `Each doubling multiplies the population by 2, so N = N₀ × 2ⁿ = ${count(n0)} × 2^${fmt(doublings, 3)} = ${count(n0)} × ${factor(2 ** doublings)} = ${count(N)}.`,
        `The same growth written as a rate: 2^(1/Td) − 1 = ${rate(2 ** (1 / td) - 1)} per year compounded yearly, or a continuous rate r = ln 2 ÷ Td = 0.6931 ÷ ${fmt(td, 3)} = ${fmt(Math.LN2 / td, 5)} per year.`,
      ],
      model: { mode, n0, td, target: N, t, xMax: Math.max(t, td) },
    };
  }
  const n = values.n, t = values.t, { percent, r } = growthRateFromCounts(n0, n, t), ratio = n / n0;
  return {
    metrics: [
      { label: 'Growth rate per year', value: rate(percent) },
      { label: 'Continuous (per-capita) rate r', value: `${fmt(r, 5)} per year` },
      { label: 'Growth factor N / N₀', value: `${factor(ratio)}×` },
      doublingTile(percent),
    ],
    steps: [
      `The population changed by a factor of N ÷ N₀ = ${count(n)} ÷ ${count(n0)} = ${factor(ratio)} in ${years(t)}.`,
      `For compound growth, (1 + r)^t = ${factor(ratio)}, so 1 + r = ${factor(ratio)}^(1/${fmt(t, 3)}) = ${fmt(1 + percent, 5)}: an average rate of ${rate(percent)} per year.`,
      `The continuous, per-capita rate is r = ln(N / N₀) ÷ t = ${fmt(Math.log(ratio), 4)} ÷ ${fmt(t, 3)} = ${fmt(r, 5)} per year: on average each individual adds ${fmt(r, 5)} individuals a year once births and deaths are netted out.`,
    ],
    model: { mode, n0, p: percent, target: n, t, xMax: t },
  };
}

export function diagram(m) {
  const fn = m.mode === 'doublings' ? x => m.n0 * 2 ** (x / m.td) : x => m.n0 * (1 + m.p) ** x;
  const ghost = m.mode === 'doublings' ? null : x => m.n0 * Math.exp(m.p * x);
  const marks = m.mode === 'doubling' ? [1, 2, 3].map(k => [k * m.td, m.n0 * 2 ** k]) : [[m.t, m.target]];
  const top = niceMax(Math.max(m.n0, fn(m.xMax), ...marks.map(([, y]) => y)));
  const box = { left: 92, top: 40, width: 590, height: 382 };
  const xTicks = niceTicks(m.xMax), digits = Math.max(0, Math.ceil(-Math.log10(m.xMax / xTicks)) + 1);
  const c = chart({ box, x: [0, m.xMax], y: [0, top], xTicks, yTicks: 5, xLabel: 'Time (years)', yLabel: 'Population N', xFormat: v => fmt(v, digits), yFormat: compact });
  let out = c.grid;
  if (ghost) {
    const pts = [];
    for (let i = 0; i <= 200; i++) { const x = m.xMax * i / 200, y = ghost(x); if (!Number.isFinite(y) || y > top) break; pts.push([c.px(x), c.py(y)]); }
    if (pts.length > 1) out += polyline(pts, { stroke: palette.leafLight, width: 2, dash: '6 5' });
  }
  if (m.mode === 'doubling') {
    marks.forEach(([x, y], i) => {
      out += line(box.left, c.py(y), c.px(x), c.py(y), { color: palette.muted, width: 1, dash: '4 5' }) + line(c.px(x), c.py(y), c.px(x), box.top + box.height, { color: palette.leafLight, width: 1, dash: '3 4' });
      out += text(box.left + 8, c.py(y) - 7, `×${2 ** (i + 1)} = ${compact(y)}`, { size: 12, anchor: 'start', color: palette.ink, weight: 600 });
    });
  } else if (m.mode === 'doublings') {
    const whole = Math.floor(m.xMax / m.td + 1e-9), every = Math.max(1, Math.ceil(whole / 24));
    for (let k = 1; k <= whole; k += every) out += circle(c.px(k * m.td), c.py(fn(k * m.td)), 4.5, { fill: palette.white, stroke: palette.leafDark, width: 2 });
  } else if (m.mode === 'time') {
    out += line(box.left, c.py(m.target), box.left + box.width, c.py(m.target), { color: palette.coral, width: 1.5, dash: '7 6' }) + text(box.left + 8, c.py(m.target) - 8, `Target N = ${compact(m.target)}`, { size: 12, anchor: 'start', weight: 600, color: palette.coralDark });
    out += line(c.px(m.t), c.py(m.target), c.px(m.t), box.top + box.height, { color: palette.coral, width: 1, dash: '3 4' });
  }
  out += polyline(curve(fn, [0, m.xMax], c.px, c.py, 240), { stroke: palette.leaf, width: 3 });
  out += circle(c.px(0), c.py(m.n0), 5, { fill: palette.white, stroke: palette.leafDark, width: 2 }) + text(c.px(0) + 10, c.py(m.n0) + (c.py(m.n0) > box.top + box.height - 30 ? -12 : 18), `N₀ = ${compact(m.n0)}`, { size: 12, anchor: 'start', color: palette.leafDark, weight: 600 });
  for (const [x, y] of marks) {
    const X = c.px(x), Y = c.py(y), right = X > box.left + box.width * 0.6;
    out += circle(X, Y, 6, { fill: palette.coral, stroke: palette.white, width: 2 });
    if (m.mode !== 'doubling') out += text(X + (right ? -10 : 10), Y < box.top + 30 ? Y + 22 : Y - 12, m.mode === 'time' ? `t = ${fmt(x, 2)} years` : `N = ${compact(y)}`, { size: 13, anchor: right ? 'end' : 'start', weight: 700, color: palette.coralDark });
  }
  return out;
}
