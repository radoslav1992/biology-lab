// Chi-square goodness-of-fit explorer for Mendelian ratios (3:1, 1:1, 1:2:1, 9:3:3:1).
import { fmt, palette } from '../format.mjs';
import { text, line, rect, chart } from '../svg.mjs';
import { chiSquare } from '../genetics.mjs';

const RATIOS = { '3:1': [3, 1], '1:1': [1, 1], '1:2:1': [1, 2, 1], '9:3:3:1': [9, 3, 3, 1] };
const CLASS_NAMES = {
  '3:1': ['dominant phenotype', 'recessive phenotype'],
  '1:1': ['first class', 'second class'],
  '1:2:1': ['homozygous (one parent type)', 'heterozygous (intermediate)', 'homozygous (other parent type)'],
  '9:3:3:1': ['both traits dominant', 'first dominant, second recessive', 'first recessive, second dominant', 'both traits recessive'],
};
const SHORT = { '3:1': ['Dominant', 'Recessive'], '1:1': ['Class 1', 'Class 2'], '1:2:1': ['Homozygous 1', 'Heterozygous', 'Homozygous 2'], '9:3:3:1': ['Dom · Dom', 'Dom · rec', 'rec · Dom', 'rec · rec'] };
const field = (key, label, value) => ({ key, label, value, min: 0, max: 1000000, step: 1 });

export const definition = {
  slug: 'chi-square-test',
  title: 'Chi-square test for genetics',
  seoTitle: 'Chi-Square Test Calculator for Genetics — Punnett Ratios',
  category: 'Genetics',
  icon: 'χ²',
  description: 'Test whether observed offspring counts fit a 3:1, 1:1, 1:2:1 or 9:3:3:1 Mendelian ratio: χ², degrees of freedom, critical value, p-value and verdict.',
  keywords: 'chi square goodness of fit mendel expected observed critical value p value degrees of freedom',
  meta: 'Goodness of fit · α = 0.05',
  fields: [
    field('o1', 'Observed count · class 1', 705),
    field('o2', 'Observed count · class 2', 224),
    field('o3', 'Observed count · class 3', 0),
    field('o4', 'Observed count · class 4', 0),
  ],
  modes: [['3:1', '3 : 1 (monohybrid F₂)'], ['1:1', '1 : 1 (test cross)'], ['1:2:1', '1 : 2 : 1 (incomplete dominance)'], ['9:3:3:1', '9 : 3 : 3 : 1 (dihybrid F₂)']],
  fieldsByMode: { '3:1': ['o1', 'o2'], '1:1': ['o1', 'o2'], '1:2:1': ['o1', 'o2', 'o3'], '9:3:3:1': ['o1', 'o2', 'o3', 'o4'] },
  presets: [
    { label: 'Mendel: 705 purple : 224 white', values: { o1: 705, o2: 224 }, mode: '3:1' },
    { label: 'Mendel: 5,474 round : 1,850 wrinkled', values: { o1: 5474, o2: 1850 }, mode: '3:1' },
    { label: 'Mendel: 6,022 yellow : 2,001 green', values: { o1: 6022, o2: 2001 }, mode: '3:1' },
    { label: 'Poor fit: 250 : 150', values: { o1: 250, o2: 150 }, mode: '3:1' },
    { label: 'Test cross: 52 : 48', values: { o1: 52, o2: 48 }, mode: '1:1' },
    { label: 'Snapdragons: 28 red : 55 pink : 17 white', values: { o1: 28, o2: 55, o3: 17 }, mode: '1:2:1' },
    { label: 'Mendel dihybrid: 315 : 108 : 101 : 32', values: { o1: 315, o2: 108, o3: 101, o4: 32 }, mode: '9:3:3:1' },
  ],
  formula: 'χ² = Σ (O − E)² / E',
  note: 'Expected counts come from the chosen ratio and your total. Compare χ² with the α = 0.05 critical value for df = classes − 1. Use whole-number counts; the test is most reliable when every expected count is at least 5.',
  lesson: 'mendelian-inheritance',
  caption: 'Green: observed counts · Orange: expected counts from the ratio',
  diagramLabel: 'Grouped bar chart comparing observed and expected offspring counts for each phenotype class',
  controlsTitle: 'Your observed counts',
  explanationTitle: 'How the test works',
};

export function explore(values, mode = '3:1') {
  const ratioParts = RATIOS[mode];
  if (!ratioParts) throw new Error('Choose a supported ratio.');
  const keys = definition.fieldsByMode[mode];
  const observed = keys.map(k => values[k]);
  const r = chiSquare(observed, ratioParts);
  const names = CLASS_NAMES[mode], sum = ratioParts.reduce((s, x) => s + x, 0);
  const pLabel = r.pValue < 0.001 ? '< 0.001' : fmt(r.pValue, 3);
  const metrics = [
    { label: 'Chi-square (χ²)', value: fmt(r.chi2, 3) },
    { label: 'Degrees of freedom', value: String(r.df) },
    { label: 'Critical value (α = 0.05)', value: fmt(r.critical, 3) },
    { label: 'p-value', value: pLabel },
    { label: 'Verdict', value: r.reject ? 'Reject the ratio' : `Fits ${r.ratioLabel}` },
    { label: 'Total observed', value: fmt(r.total, 0) },
  ];
  const steps = [
    `Add the counts: n = ${observed.map(o => fmt(o, 0)).join(' + ')} = ${fmt(r.total, 0)}. For a ${r.ratioLabel} ratio the expected counts are ${r.expected.map((e, i) => `E${i + 1} = ${fmt(r.total, 0)} × ${ratioParts[i]}/${sum} = ${fmt(e, 2)} (${names[i]})`).join('; ')}.`,
    `Square each difference and divide by the expected count: ${r.contributions.map((c, i) => `(${fmt(observed[i], 0)} − ${fmt(r.expected[i], 2)})² / ${fmt(r.expected[i], 2)} = ${fmt(c, 3)}`).join('; ')}.`,
    `χ² = ${r.contributions.map(c => fmt(c, 3)).join(' + ')} = ${fmt(r.chi2, 3)}, with df = ${observed.length} − 1 = ${r.df} degrees of freedom (one fewer than the number of classes).`,
    r.reject
      ? `The α = 0.05 critical value for df = ${r.df} is ${fmt(r.critical, 3)}. Because ${fmt(r.chi2, 3)} > ${fmt(r.critical, 3)} (p ${pLabel.startsWith('<') ? pLabel : '≈ ' + pLabel}), a deviation this large would occur by chance less than 5% of the time: reject the ${r.ratioLabel} hypothesis and look for another explanation, such as linkage, lethality, or a different inheritance pattern.`
      : `The α = 0.05 critical value for df = ${r.df} is ${fmt(r.critical, 3)}. Because ${fmt(r.chi2, 3)} ≤ ${fmt(r.critical, 3)} (p ≈ ${pLabel}), the deviation is within the range chance alone produces: do not reject the ${r.ratioLabel} hypothesis. The data are consistent with the predicted ratio.`,
  ];
  return { metrics, steps, model: { labels: SHORT[mode], observed: r.observed, expected: r.expected, chi2: r.chi2, critical: r.critical, df: r.df, reject: r.reject, ratioLabel: r.ratioLabel } };
}

const niceMax = v => { const m = Math.max(1, v) * 1.18; const mag = 10 ** Math.floor(Math.log10(m)); const step = mag / 2; return Math.ceil(m / step) * step; };

export function diagram(model) {
  const k = model.observed.length;
  const top = niceMax(Math.max(...model.observed, ...model.expected));
  const box = { left: 84, top: 56, width: 596, height: 344 };
  const c = chart({ box, x: [0, k], y: [0, top], xTicks: k, yTicks: 5, xFormat: () => '', yFormat: v => fmt(v, 0), yLabel: 'Offspring count' });
  let out = c.grid;
  const groupWidth = box.width / k, barWidth = Math.min(64, groupWidth * 0.3), gap = 8;
  const base = c.py(0);
  model.observed.forEach((o, i) => {
    const e = model.expected[i], center = box.left + groupWidth * (i + 0.5);
    const ox = center - barWidth - gap / 2, ex = center + gap / 2;
    const oh = base - c.py(o), eh = base - c.py(e);
    out += rect(ox, base - oh, barWidth, oh, { fill: palette.leaf, stroke: palette.leafDark, width: 1.5, rx: 4 });
    out += rect(ex, base - eh, barWidth, eh, { fill: palette.coral, stroke: palette.coralDark, width: 1.5, rx: 4, opacity: 0.9 });
    out += text(ox + barWidth / 2, Math.min(base - oh, base) - 8, fmt(o, 0), { size: 12, weight: 700, color: palette.leafDark });
    out += text(ex + barWidth / 2, Math.min(base - eh, base) - 8, fmt(e, 1), { size: 12, weight: 700, color: palette.coralDark });
    out += text(center, base + 22, model.labels[i], { size: 13, weight: 600, color: palette.ink });
  });
  out += rect(box.left, 18, 132, 24, { fill: palette.white, stroke: palette.line, width: 1, rx: 6 }) + rect(box.left + 10, 25, 10, 10, { fill: palette.leaf, stroke: palette.leafDark, width: 1, rx: 2 }) + text(box.left + 26, 34, 'Observed', { size: 12, anchor: 'start', color: palette.ink });
  out += rect(box.left + 76, 25, 10, 10, { fill: palette.coral, stroke: palette.coralDark, width: 1, rx: 2 }) + text(box.left + 92, 34, 'Expected', { size: 12, anchor: 'start', color: palette.ink });
  const verdict = model.reject ? `χ² = ${fmt(model.chi2, 3)} > ${fmt(model.critical, 3)} · reject ${model.ratioLabel}` : `χ² = ${fmt(model.chi2, 3)} ≤ ${fmt(model.critical, 3)} · fits ${model.ratioLabel}`;
  out += rect(box.left + box.width - 288, 18, 288, 24, { fill: model.reject ? '#fdeee6' : palette.mint, stroke: model.reject ? palette.coral : palette.leaf, width: 1, rx: 6 }) + text(box.left + box.width - 144, 34, verdict, { size: 12, weight: 600, color: model.reject ? palette.coralDark : palette.leafDark });
  out += line(box.left, base, box.left + box.width, base, { color: palette.muted, width: 1.5 });
  out += text(box.left + box.width / 2, box.top + box.height + 68, `df = ${model.df} · α = 0.05`, { size: 12 });
  return out;
}
