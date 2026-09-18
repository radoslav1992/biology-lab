// Enzyme kinetics explorer: the Michaelis–Menten equation with competitive and noncompetitive inhibition.
import { fmt, positive, nonNegative, palette } from '../format.mjs';
import { text, line, rect, circle, polyline, chart, curve } from '../svg.mjs';

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = n => String(n).split('').map(ch => SUP[ch] ?? ch).join('');
// Superscript scientific notation (2.5 × 10⁻⁹) for values that plain decimals would print as 2.5e-9 or as a 13-digit string.
const sci = v => { let e = Math.floor(Math.log10(Math.abs(v))), mant = Number((v / 10 ** e).toPrecision(3)); if (Math.abs(mant) >= 10) { mant = Number((mant / 10).toPrecision(3)); e += 1; } else if (Math.abs(mant) < 1) { mant = Number((mant * 10).toPrecision(3)); e -= 1; } return mant === 1 ? `10${sup(e)}` : `${mant} × 10${sup(e)}`; };
const wide = v => v !== 0 && (Math.abs(v) < 1e-6 || Math.abs(v) >= 1e9); // outside the range where plain decimals read well
const num = v => v === 0 ? '0' : wide(v) ? sci(v) : Math.abs(v) >= 1 ? fmt(v, 3) : String(Number(v.toPrecision(3)));
const short = v => v === 0 ? '0' : wide(v) ? sci(v) : String(Number(v.toPrecision(3)));
const r1 = v => Math.round(v * 10) / 10;
// Round an axis maximum up to a tidy number so tick labels stay readable.
const nice = v => { if (!(v > 0)) return 1; const base = 10 ** Math.floor(Math.log10(v)); for (const k of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (k * base >= v - 1e-12) return k * base; return 10 * base; };
const MODE_LABEL = { none: 'No inhibitor', competitive: 'Competitive inhibitor', noncompetitive: 'Noncompetitive inhibitor' };

export const definition = {
  slug: 'enzyme-kinetics',
  title: 'Enzyme kinetics explorer (Michaelis–Menten)',
  seoTitle: 'Michaelis-Menten Enzyme Kinetics Calculator & Km Explorer',
  category: 'Molecular',
  icon: '∿',
  description: 'Calculate reaction rate from Vmax, Km, and substrate concentration, then add a competitive or noncompetitive inhibitor and watch the saturation curve change.',
  keywords: 'michaelis menten vmax km substrate concentration reaction rate competitive noncompetitive inhibitor saturation curve',
  meta: 'Saturation curve · inhibitors',
  fields: [
    { key: 'vmax', label: 'Maximum rate Vmax', unit: 'µmol/min', value: 100, min: 0.001, max: 1000000, step: 'any' },
    { key: 'km', label: 'Michaelis constant Km', unit: 'mM', value: 2, min: 0.001, max: 1000000, step: 'any' },
    { key: 's', label: 'Substrate concentration [S]', unit: 'mM', value: 5, min: 0, max: 1000000, step: 'any' },
    { key: 'i', label: 'Inhibitor concentration [I]', unit: 'mM', value: 1, min: 0, max: 1000000, step: 'any' },
    { key: 'ki', label: 'Inhibition constant Ki', unit: 'mM', value: 1, min: 0.001, max: 1000000, step: 'any' },
  ],
  modes: [['none', 'No inhibitor'], ['competitive', 'Competitive inhibitor'], ['noncompetitive', 'Noncompetitive inhibitor']],
  fieldsByMode: { none: ['vmax', 'km', 's'], competitive: ['vmax', 'km', 's', 'i', 'ki'], noncompetitive: ['vmax', 'km', 's', 'i', 'ki'] },
  presets: [
    { label: '[S] = Km (half of Vmax)', values: { vmax: 100, km: 2, s: 2 }, mode: 'none' },
    { label: 'Saturating: [S] = 10 × Km', values: { vmax: 100, km: 2, s: 20 }, mode: 'none' },
    { label: 'Hexokinase (Km ≈ 0.05 mM) at 5 mM glucose', values: { vmax: 100, km: 0.05, s: 5 }, mode: 'none' },
    { label: 'Competitive: [I] = Ki', values: { vmax: 100, km: 2, s: 2, i: 1, ki: 1 }, mode: 'competitive' },
    { label: 'Competitive, outcompeted by 10 × Km substrate', values: { vmax: 100, km: 2, s: 20, i: 1, ki: 1 }, mode: 'competitive' },
    { label: 'Noncompetitive: [I] = Ki', values: { vmax: 100, km: 2, s: 2, i: 1, ki: 1 }, mode: 'noncompetitive' },
  ],
  formula: 'V = Vmax [S] / (Km + [S])',
  note: 'Units are illustrative (mM and µmol/min); any consistent units work. A competitive inhibitor raises the apparent Km to Km(1 + [I]/Ki) and leaves Vmax unchanged; a pure noncompetitive inhibitor lowers the apparent Vmax to Vmax/(1 + [I]/Ki) and leaves Km unchanged.',
  lesson: 'enzymes',
  caption: 'Rate against substrate concentration · dashed guides mark Km and ½ Vmax · the faint curve is the uninhibited enzyme',
  diagramLabel: 'Michaelis–Menten saturation curve of reaction rate against substrate concentration with the current point, Km, and half of Vmax marked',
  controlsTitle: 'Your enzyme',
  explanationTitle: 'How the equation works',
};

export function explore(values, mode = 'none') {
  if (!MODE_LABEL[mode]) throw new Error('Choose a supported inhibition mode.');
  const { vmax, km, s } = values;
  positive([vmax, km], 1000000);
  nonNegative([s], 1000000);
  const inhibited = mode !== 'none';
  let i = 0, ki = 1, alpha = 1;
  if (inhibited) {
    i = values.i; ki = values.ki;
    nonNegative([i], 1000000);
    positive([ki], 1000000);
    alpha = 1 + i / ki;
  }
  const kmApp = mode === 'competitive' ? km * alpha : km;
  const vmaxApp = mode === 'noncompetitive' ? vmax / alpha : vmax;
  const v = vmaxApp * s / (kmApp + s);
  const v0 = vmax * s / (km + s);
  const pctOfVmax = v / vmax * 100;
  const metrics = [
    { label: 'Reaction rate V', value: `${num(v)} µmol/min` },
    { label: 'Percent of Vmax', value: `${fmt(pctOfVmax, 1)}%` },
    { label: 'Apparent Km', value: `${num(kmApp)} mM` },
    { label: 'Apparent Vmax', value: `${num(vmaxApp)} µmol/min` },
  ];
  if (inhibited) metrics.push({ label: 'Rate without inhibitor', value: `${num(v0)} µmol/min` }, { label: 'Factor 1 + [I]/Ki', value: num(alpha) });
  else metrics.push({ label: '[S] needed for 90% of Vmax', value: `${num(9 * km)} mM` });
  const steps = [];
  if (mode === 'competitive') steps.push(`A competitive inhibitor binds the active site, so it changes only how much substrate is needed: apparent Km = Km × (1 + [I]/Ki) = ${num(km)} × (1 + ${num(i)}/${num(ki)}) = ${num(km)} × ${num(alpha)} = ${num(kmApp)} mM. Vmax stays ${num(vmax)} µmol/min.`);
  if (mode === 'noncompetitive') steps.push(`A noncompetitive inhibitor binds away from the active site and switches enzyme molecules off regardless of substrate, so it lowers the ceiling: apparent Vmax = Vmax / (1 + [I]/Ki) = ${num(vmax)} / (1 + ${num(i)}/${num(ki)}) = ${num(vmax)} / ${num(alpha)} = ${num(vmaxApp)} µmol/min. Km stays ${num(km)} mM.`);
  steps.push(`Substitute into the Michaelis–Menten equation: V = Vmax [S] / (Km + [S]) = ${num(vmaxApp)} × ${num(s)} / (${num(kmApp)} + ${num(s)}) = ${num(vmaxApp * s)} / ${num(kmApp + s)} = ${num(v)} µmol/min${inhibited ? ' (using the apparent constants)' : ''}.`);
  if (s === 0) steps.push('With no substrate present the rate is 0: the enzyme has nothing to convert, whatever its Vmax.');
  else if (Math.abs(s - kmApp) < 1e-9 * Math.max(1, kmApp)) steps.push(`Because [S] equals ${inhibited ? 'the apparent ' : ''}Km, the rate is exactly half of ${inhibited ? 'the apparent ' : ''}Vmax: ${num(v)} = ${num(vmaxApp)} / 2. That is the definition of Km — the substrate concentration at which half of the active sites are occupied on average.`);
  else steps.push(`That is ${fmt(pctOfVmax, 1)}% of Vmax. ${s < kmApp ? 'Below Km the curve is nearly linear: doubling [S] almost doubles the rate because most active sites are empty.' : s >= 10 * kmApp ? 'At 10 × Km or more the enzyme is close to saturated: nearly every active site is busy, so extra substrate barely raises the rate.' : 'Between Km and 10 × Km the curve bends: active sites are filling up and each extra millimole of substrate buys less speed.'}`);
  if (inhibited) steps.push(mode === 'competitive'
    ? `Without inhibitor the rate would be ${num(v0)} µmol/min. Because the inhibitor and substrate compete for the same site, raising [S] far above the apparent Km (${num(kmApp)} mM) overcomes the inhibition and the reaction can still approach Vmax = ${num(vmax)} µmol/min.`
    : `Without inhibitor the rate would be ${num(v0)} µmol/min. No amount of extra substrate rescues a noncompetitive inhibitor, because the inhibited enzyme molecules are out of action whether or not substrate is bound; the rate can never exceed the apparent Vmax of ${num(vmaxApp)} µmol/min.`);
  else steps.push(`To reach 90% of Vmax, solve 0.9 = [S] / (Km + [S]) to get [S] = 9 × Km = ${num(9 * km)} mM; reaching 99% would need 99 × Km. The curve approaches Vmax but never touches it.`);
  return { metrics, steps, model: { mode, vmax, km, s, i, ki, alpha, kmApp, vmaxApp, v, v0 } };
}

export function diagram(m) {
  const inhibited = m.mode !== 'none';
  const xMax = nice(Math.max(m.s * 1.25, 6 * m.kmApp, 6 * m.km));
  const yMax = nice(m.vmax * 1.12);
  const box = { left: 90, top: 64, width: 590, height: 350 };
  const c = chart({ box, x: [0, xMax], y: [0, yMax], xLabel: 'Substrate concentration [S] (mM)', yLabel: 'Reaction rate V (µmol/min)', xTicks: 4, yTicks: 4, xFormat: short, yFormat: short });
  let out = c.grid;
  const plain = x => m.vmax * x / (m.km + x), app = x => m.vmaxApp * x / (m.kmApp + x);
  const round = pts => pts.map(p => p.map(r1));
  const mainColor = inhibited ? palette.coral : palette.leaf, mainDark = inhibited ? palette.coralDark : palette.leafDark;
  // With [I] = 0 the inhibited curve coincides with the uninhibited one, so the comparison guides are drawn only when the inhibitor actually shifts it.
  const comparison = inhibited && m.alpha > 1;
  if (comparison) {
    out += polyline(round(curve(plain, [0, xMax], c.px, c.py, 160)), { stroke: palette.leafLight, width: 2.5, dash: '7 5' });
    if (m.km <= xMax) out += line(r1(c.px(m.km)), r1(c.py(0)), r1(c.px(m.km)), r1(c.py(m.vmax / 2)), { color: palette.leafLight, width: 1.5, dash: '3 4' });
    if (m.mode === 'noncompetitive') {
      const vy0 = r1(c.py(m.vmax));
      out += line(box.left, vy0, box.left + box.width, vy0, { color: palette.leafLight, width: 1.5, dash: '3 4' });
      // Label the uninhibited ceiling only when it sits clear of the apparent-Vmax label drawn below it.
      if (c.py(m.vmaxApp) - c.py(m.vmax) >= 14) out += text(box.left + box.width - 6, vy0 - 6, `Vmax without inhibitor = ${short(m.vmax)}`, { size: 12, anchor: 'end', color: palette.leafDark });
    }
  }
  out += polyline(round(curve(app, [0, xMax], c.px, c.py, 160)), { stroke: mainColor, width: 3.5 });
  // Vmax asymptote and the Km / half-Vmax guides.
  const vy = r1(c.py(m.vmaxApp));
  out += line(box.left, vy, box.left + box.width, vy, { color: palette.muted, width: 1.5, dash: '5 4' });
  out += text(box.left + box.width - 6, vy - 6, `${inhibited ? 'apparent ' : ''}Vmax = ${short(m.vmaxApp)}`, { size: 12, anchor: 'end', color: palette.ink, weight: 600 });
  const kx = r1(c.px(m.kmApp)), hy = r1(c.py(m.vmaxApp / 2));
  if (m.kmApp <= xMax) {
    out += line(kx, r1(c.py(0)), kx, hy, { color: palette.plum, width: 1.5, dash: '5 4' }) + line(box.left, hy, kx, hy, { color: palette.plum, width: 1.5, dash: '5 4' });
    out += text(kx + 6, r1((c.py(0) + hy) / 2), `${inhibited ? 'apparent ' : ''}Km = ${short(m.kmApp)} mM`, { size: 12, anchor: 'start', color: palette.plum, weight: 600 });
    out += text(box.left + 6, hy - 6, '½ Vmax', { size: 12, anchor: 'start', color: palette.plum, weight: 600 });
  }
  // Current operating point.
  const px = r1(c.px(m.s)), py = r1(c.py(m.v)), leftSide = px < box.left + box.width / 2;
  out += circle(px, py, 7, { fill: palette.white, stroke: mainDark, width: 3 });
  out += text(leftSide ? px + 12 : px - 12, py - 12, `[S] = ${short(m.s)} mM · V = ${short(m.v)}`, { size: 12, anchor: leftSide ? 'start' : 'end', color: mainDark, weight: 700 });
  // Legend and mode title.
  const legend = [];
  if (comparison) legend.push([palette.leaf, 'Uninhibited (for comparison)']);
  if (inhibited) legend.push([mainColor, `With ${MODE_LABEL[m.mode].toLowerCase()} · [I]/Ki = ${short(m.i / m.ki)}${comparison ? '' : ' (no inhibition)'}`]);
  else legend.push([palette.leaf, 'Michaelis–Menten curve']);
  legend.forEach(([color, label], k) => { const x = box.left + k * 236; out += line(x, 34, x + 28, 34, { color, width: 3.5 }) + text(x + 36, 38, label, { size: 12, anchor: 'start', color: palette.ink }); });
  if (!inhibited) out += rect(box.left + 300, 22, 250, 24, { fill: palette.mint, stroke: palette.leaf, width: 1, rx: 6 }) + text(box.left + 425, 38, `Vmax = ${short(m.vmax)} · Km = ${short(m.km)} mM`, { size: 12, weight: 600, color: palette.leafDark });
  return out;
}
