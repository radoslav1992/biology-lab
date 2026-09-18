// Dilution calculator: C₁V₁ = C₂V₂ for a stock volume or final concentration, plus serial dilutions.
import { fmt, positive, wholeNumbers, palette } from '../format.mjs';
import { text, line, rect, path, arrow } from '../svg.mjs';

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = n => String(n).split('').map(ch => SUP[ch] ?? ch).join('');
// Superscript scientific notation (2.5 × 10⁻⁹) for values that plain decimals would print as 2.5e-9 or as a 13-digit string.
const sci = v => { let e = Math.floor(Math.log10(Math.abs(v))), mant = Number((v / 10 ** e).toPrecision(3)); if (Math.abs(mant) >= 10) { mant = Number((mant / 10).toPrecision(3)); e += 1; } else if (Math.abs(mant) < 1) { mant = Number((mant * 10).toPrecision(3)); e -= 1; } return mant === 1 ? `10${sup(e)}` : `${mant} × 10${sup(e)}`; };
const wide = v => v !== 0 && (Math.abs(v) < 1e-6 || Math.abs(v) >= 1e9); // outside the range where plain decimals read well
const num = v => v === 0 ? '0' : wide(v) ? sci(v) : Math.abs(v) >= 1 ? fmt(v, 3) : String(Number(v.toPrecision(3)));
// Concentrations span many orders of magnitude in a serial dilution, so use scientific notation outside 0.001–1,000,000.
export const conc = v => {
  if (v === 0) return '0';
  const a = Math.abs(v);
  return a >= 1e-3 && a < 1e6 ? Number(v.toPrecision(4)).toLocaleString('en-US', { maximumFractionDigits: 10 }) : sci(v);
};
const r1 = v => Math.round(v * 10) / 10;

export const definition = {
  slug: 'dilution-calculator',
  title: 'Dilution calculator (C₁V₁ = C₂V₂)',
  seoTitle: 'Dilution Calculator (C1V1 = C2V2) — Stock, Final & Serial',
  category: 'Lab skills',
  icon: '⚗',
  description: 'Solve C₁V₁ = C₂V₂ for the stock volume or final concentration, get the diluent to add, and plan serial dilutions with the concentration after every step.',
  keywords: 'dilution calculator c1v1 c2v2 stock solution diluent serial dilution factor molarity lab',
  meta: 'Stock · final · serial',
  fields: [
    { key: 'c1', label: 'Stock concentration C₁', unit: 'M, mM, mg/mL, %, ×…', value: 10, min: 0.000001, max: 1000000, step: 'any' },
    { key: 'c2', label: 'Final concentration C₂', unit: 'same unit as C₁', value: 1, min: 0.000001, max: 1000000, step: 'any' },
    { key: 'v1', label: 'Stock volume V₁', unit: 'mL', value: 10, min: 0.001, max: 1000000, step: 'any' },
    { key: 'v2', label: 'Final volume V₂', unit: 'mL', value: 100, min: 0.001, max: 1000000, step: 'any' },
    { key: 'factor', label: 'Dilution factor per step', unit: '×', value: 10, min: 2, max: 1000, step: 1 },
    { key: 'steps', label: 'Number of dilution steps', unit: '', value: 3, min: 1, max: 10, step: 1 },
  ],
  modes: [['stock', 'Find stock volume V₁'], ['final', 'Find final concentration C₂'], ['serial', 'Serial dilution']],
  fieldsByMode: { stock: ['c1', 'c2', 'v2'], final: ['c1', 'v1', 'v2'], serial: ['c1', 'factor', 'steps'] },
  presets: [
    { label: '10 M → 1 M in 100 mL', values: { c1: 10, c2: 1, v2: 100 }, mode: 'stock' },
    { label: '5× buffer → 1× in 50 mL', values: { c1: 5, c2: 1, v2: 50 }, mode: 'stock' },
    { label: 'Ethanol 95% → 70% in 500 mL', values: { c1: 95, c2: 70, v2: 500 }, mode: 'stock' },
    { label: '2 mL of 1 M made up to 50 mL', values: { c1: 1, v1: 2, v2: 50 }, mode: 'final' },
    { label: 'Serial 1 : 10, three steps', values: { c1: 10, factor: 10, steps: 3 }, mode: 'serial' },
    { label: 'Serial 1 : 2, eight steps (microplate)', values: { c1: 1, factor: 2, steps: 8 }, mode: 'serial' },
  ],
  formula: 'C₁V₁ = C₂V₂ · serial: C after n steps = C₁ / factorⁿ',
  note: 'Any concentration unit works (M, mM, mg/mL, %, ×) as long as C₁ and C₂ share it; volumes are in mL. The equation assumes volumes add and the solute is conserved. In the lab, add the stock first, then diluent up to the final volume.',
  lesson: 'lab-measurements',
  caption: 'Fill heights are proportional to volume and shading to concentration · in serial mode each tube is one shade step lighter than the last',
  diagramLabel: 'Illustration of laboratory vessels showing stock, diluent, and final solution volumes, or a row of serial-dilution tubes with fading shading',
  controlsTitle: 'Your solutions',
  explanationTitle: 'How the calculation works',
};

export function explore(values, mode = 'stock') {
  if (mode === 'stock') {
    const { c1, c2, v2 } = values;
    positive([c1, c2, v2], 1000000);
    if (c2 > c1) throw new Error('The final concentration cannot be higher than the stock — diluting only makes a solution weaker.');
    const v1 = c2 * v2 / c1, diluent = v2 - v1, factor = c1 / c2;
    const metrics = [
      { label: 'Stock volume V₁', value: `${num(v1)} mL` },
      { label: 'Diluent to add', value: `${num(diluent)} mL` },
      { label: 'Dilution factor', value: `${num(factor)}× (1 : ${num(factor)})` },
      { label: 'Final concentration C₂', value: conc(c2) },
    ];
    const steps = [
      `Rearrange C₁V₁ = C₂V₂ for the unknown: V₁ = C₂V₂ / C₁ = (${conc(c2)} × ${num(v2)} mL) / ${conc(c1)} = ${num(v1)} mL of stock.`,
      diluent > 0
        ? `Diluent = V₂ − V₁ = ${num(v2)} − ${num(v1)} = ${num(diluent)} mL of water or buffer. Measure the ${num(v1)} mL of stock first, then make the total up to ${num(v2)} mL.`
        : 'The final concentration equals the stock, so no diluent is needed: simply measure out the required volume of stock.',
      `Dilution factor = C₁ / C₂ = ${conc(c1)} / ${conc(c2)} = ${num(factor)}, so this is a 1 : ${num(factor)} dilution — 1 part stock in ${num(factor)} parts of final solution. Check: C₁V₁ = ${conc(c1)} × ${num(v1)} = ${conc(c1 * v1)} and C₂V₂ = ${conc(c2)} × ${num(v2)} = ${conc(c2 * v2)} — the same amount of solute, in whatever concentration unit you used.`,
    ];
    return { metrics, steps, model: { mode, c1, c2, v1, v2, diluent, factor } };
  }
  if (mode === 'final') {
    const { c1, v1, v2 } = values;
    positive([c1, v1, v2], 1000000);
    if (v1 > v2) throw new Error('The stock volume cannot be larger than the final volume.');
    const c2 = c1 * v1 / v2, diluent = v2 - v1, factor = v2 / v1;
    const metrics = [
      { label: 'Final concentration C₂', value: conc(c2) },
      { label: 'Dilution factor', value: `${num(factor)}× (1 : ${num(factor)})` },
      { label: 'Diluent added', value: `${num(diluent)} mL` },
      { label: 'Stock volume V₁', value: `${num(v1)} mL` },
    ];
    const steps = [
      `Rearrange C₁V₁ = C₂V₂ for the unknown: C₂ = C₁V₁ / V₂ = (${conc(c1)} × ${num(v1)} mL) / ${num(v2)} mL = ${conc(c2)}, in the same unit as C₁ (M, mM, %, or whatever you entered).`,
      `The stock was diluted by a factor of V₂ / V₁ = ${num(v2)} / ${num(v1)} = ${num(factor)}, using ${num(diluent)} mL of diluent, so the concentration falls by the same factor: ${conc(c1)} / ${num(factor)} = ${conc(c2)}.`,
      'The amount of solute never changes during a dilution — only the volume it is spread through. That is why the products C × V on each side are equal.',
    ];
    return { metrics, steps, model: { mode, c1, c2, v1, v2, diluent, factor } };
  }
  if (mode === 'serial') {
    const { c1, factor, steps: n } = values;
    positive([c1, factor, n], 1000000);
    wholeNumbers([factor, n]);
    if (factor < 2 || factor > 1000) throw new Error('Use a dilution factor from 2 to 1,000 per step.');
    if (n > 10) throw new Error('Plan at most 10 steps.');
    const series = Array.from({ length: n + 1 }, (_, k) => c1 / factor ** k);
    const total = factor ** n;
    const metrics = [
      { label: 'Total dilution factor', value: `${conc(total)}× (1 : ${conc(total)})` },
      { label: 'Final concentration', value: conc(series[n]) },
      { label: 'After step 1', value: conc(series[1]) },
      { label: 'Transfer per step', value: `1 part + ${num(factor - 1)} part${factor === 2 ? '' : 's'} diluent` },
      { label: 'Concentration series', value: series.map(conc).join(' → ') },
    ];
    const steps = [
      `Each step divides the concentration by ${num(factor)}: transfer 1 part into ${num(factor - 1)} part${factor === 2 ? '' : 's'} diluent (for example 1 mL into ${num(factor - 1)} mL), mix well, then take the next sample from the tube you just made.`,
      `Concentrations, in the unit of the stock: ${series.map((c, k) => `${k === 0 ? 'stock' : 'step ' + k} = ${conc(c)}`).join(' · ')}.`,
      `Total dilution factor = ${num(factor)}${sup(n)} = ${conc(total)}, so the last tube is a 1 : ${conc(total)} dilution of the stock: ${conc(c1)} / ${conc(total)} = ${conc(series[n])}.`,
    ];
    if (total >= 100) steps.push(`Why go in steps? A single 1 : ${conc(total)} dilution would mean pipetting a tiny volume into a huge one, which is inaccurate or impossible; ${num(n)} steps of 1 : ${num(factor)} reach the same result with ordinary volumes. Pipetting errors compound, though, so mix thoroughly and change tips between tubes.`);
    return { metrics, steps, model: { mode, c1, factor, steps: n, series, total } };
  }
  throw new Error('Choose a supported dilution mode.');
}

// A beaker with a pouring lip; the liquid fills a fraction of its height.
const beaker = (x, y, w, h, frac, fill, opacity) => {
  const r = 14, lip = 9, inner = h - 16;
  const level = r1(y + h - Math.max(0, Math.min(1, frac)) * inner);
  let out = '';
  if (frac > 0) out += path(`M ${x + 2} ${level} H ${x + w - 2} V ${y + h - r} Q ${x + w - 2} ${y + h - 2} ${x + w - 2 - r} ${y + h - 2} H ${x + 2 + r} Q ${x + 2} ${y + h - 2} ${x + 2} ${y + h - r} Z`, { fill, stroke: 'none', width: 0, opacity });
  out += path(`M ${x - lip} ${y} L ${x} ${y + 7} V ${y + h - r} Q ${x} ${y + h} ${x + r} ${y + h} H ${x + w - r} Q ${x + w} ${y + h} ${x + w} ${y + h - r} V ${y + 7} L ${x + w + lip} ${y}`, { stroke: palette.ink, width: 2.5 });
  for (let k = 1; k <= 4; k++) { const ty = r1(y + h - k * inner / 4); out += line(x + 8, ty, x + (k % 2 ? 20 : 28), ty, { color: palette.muted, width: 1.2 }); }
  return out;
};

// A test tube with a rounded bottom.
const tube = (x, y, w, h, frac, fill, opacity) => {
  const r = w / 2, level = r1(y + h - Math.max(0, Math.min(1, frac)) * (h - 18));
  let out = '';
  if (frac > 0) out += path(`M ${x + 2} ${level} H ${x + w - 2} V ${y + h - r} A ${r - 2} ${r - 2} 0 0 1 ${x + 2} ${y + h - r} Z`, { fill, stroke: 'none', width: 0, opacity });
  out += path(`M ${x - 5} ${y} H ${x + w + 5} M ${x} ${y} V ${y + h - r} A ${r} ${r} 0 0 0 ${x + w} ${y + h - r} V ${y}`, { stroke: palette.ink, width: 2.2 });
  return out;
};

export function diagram(m) {
  let out = '';
  if (m.mode === 'serial') {
    const n = m.steps + 1, spacing = Math.min(112, 660 / n), w = Math.min(52, spacing * 0.5), h = 190;
    const start = 360 - spacing * (n - 1) / 2, y = 130;
    out += text(360, 40, `1 : ${num(m.factor)} serial dilution · ${num(m.steps)} step${m.steps === 1 ? '' : 's'} · total 1 : ${conc(m.total)}`, { size: 15, weight: 700, color: palette.ink });
    out += text(360, 62, `Transfer 1 part into ${num(m.factor - 1)} part${m.factor === 2 ? '' : 's'} diluent each step · each tube is ${num(m.factor)}× more dilute than the last`, { size: 12 });
    out += text(360, 80, 'Shading fades one step at a time (a log scale), not in proportion to concentration', { size: 12 });
    m.series.forEach((c, k) => {
      const cx = r1(start + k * spacing), x = r1(cx - w / 2);
      const opacity = r1(0.08 + 0.87 * (1 - k / m.steps)) ;
      out += tube(x, y, r1(w), h, 0.72, palette.sky, Math.max(0.08, opacity));
      out += text(cx, y - 12, k === 0 ? 'stock' : `step ${k}`, { size: 12, color: palette.ink, weight: 600 });
      const row = n > 6 && k % 2 ? 46 : 26;
      out += text(cx, y + h + row, conc(c), { size: 12, color: palette.ink, weight: 600 });
      if (k < m.steps) out += arrow(r1(cx + w / 2 + 4), y + 70, r1(cx + spacing - w / 2 - 4), y + 70, { color: palette.coral, width: 2 }) + text(r1(cx + spacing / 2), y + 60, `÷ ${num(m.factor)}`, { size: 12, color: palette.coralDark, weight: 600 });
    });
    out += text(360, 430, `Final tube: ${conc(m.series[m.steps])} = ${conc(m.c1)} ÷ ${num(m.factor)}${sup(m.steps)} (in the unit of the stock)`, { size: 14, weight: 700, color: palette.leafDark });
    out += text(360, 456, 'Real-world use: standard curves, bacterial plate counts, antibody titers, and drug concentration series.', { size: 12 });
    return out;
  }
  const { c1, c2, v1, v2, diluent } = m;
  const fillMax = 0.86, w = 150, h = 250, y = 120;
  const shade = Math.max(0.12, 0.9 * c2 / c1);
  out += text(360, 40, m.mode === 'stock' ? `Make ${num(v2)} mL at C₂ = ${conc(c2)} from a stock at C₁ = ${conc(c1)}` : `${num(v1)} mL of stock (C₁ = ${conc(c1)}) made up to ${num(v2)} mL`, { size: 15, weight: 700, color: palette.ink });
  out += text(360, 62, `C₁V₁ = C₂V₂ → ${conc(c1)} × ${num(v1)} = ${conc(c2)} × ${num(v2)}`, { size: 12 });
  const vessels = [
    { x: 60, frac: fillMax * v1 / v2, fill: palette.leafDark, opacity: 0.9, title: 'Stock', lines: [`C₁ = ${conc(c1)}`, `V₁ = ${num(v1)} mL`] },
    { x: 285, frac: fillMax * diluent / v2, fill: palette.sky, opacity: 0.35, title: 'Diluent (water or buffer)', lines: [`V₂ − V₁ = ${num(diluent)} mL`, 'no solute'] },
    { x: 510, frac: fillMax, fill: palette.leafDark, opacity: shade, title: 'Final solution', lines: [`C₂ = ${conc(c2)}`, `V₂ = ${num(v2)} mL`] },
  ];
  vessels.forEach(v => {
    out += beaker(v.x, y, w, h, v.frac, v.fill, r1(v.opacity));
    out += text(v.x + w / 2, y - 16, v.title, { size: 13, weight: 700, color: palette.ink });
    v.lines.forEach((t, i) => out += text(v.x + w / 2, y + h + 26 + i * 20, t, { size: 12, color: palette.ink, weight: i === 0 ? 600 : 400 }));
  });
  out += text(247, y + 130, '+', { size: 28, weight: 700, color: palette.muted });
  out += arrow(455, y + 122, 495, y + 122, { color: palette.coral, width: 3 });
  const vline = r1(y + h - fillMax * (h - 16));
  out += line(60 + 4, vline, 60 + w - 4, vline, { color: palette.coralDark, width: 1.5, dash: '4 4' }) + text(60 + w / 2, vline - 6, `V₂ mark (${num(v2)} mL)`, { size: 12, color: palette.coralDark });
  out += text(360, 470, `Dilution factor ${num(m.factor)} · the solute in ${num(v1)} mL of stock is spread through ${num(v2)} mL`, { size: 13, weight: 600, color: palette.leafDark });
  out += text(360, 494, 'Fill height ∝ volume · shading ∝ concentration · C₁ and C₂ in the unit you entered', { size: 12 });
  return out;
}
