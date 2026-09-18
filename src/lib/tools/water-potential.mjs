// Water potential explorer: Ψ = Ψs + Ψp with Ψs = −iCRT, for one solution or two cells side by side.
import { fmt, nonNegative, palette } from '../format.mjs';
import { text, line, rect, circle, ellipse, arrow } from '../svg.mjs';

export const R = 0.00831; // L·MPa/(mol·K)
export const kelvin = celsius => celsius + 273.15;
export const solutePotential = (i, c, T) => -i * c * R * T; // MPa
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = n => String(n).split('').map(ch => SUP[ch] ?? ch).join('');
// Superscript scientific notation (2.5 × 10⁻⁹) for values that plain decimals would print as 2.5e-9 or as a 13-digit string.
const sci = v => { let e = Math.floor(Math.log10(Math.abs(v))), mant = Number((v / 10 ** e).toPrecision(3)); if (Math.abs(mant) >= 10) { mant = Number((mant / 10).toPrecision(3)); e += 1; } else if (Math.abs(mant) < 1) { mant = Number((mant * 10).toPrecision(3)); e -= 1; } return mant === 1 ? `10${sup(e)}` : `${mant} × 10${sup(e)}`; };
const wide = v => v !== 0 && (Math.abs(v) < 1e-6 || Math.abs(v) >= 1e9); // outside the range where plain decimals read well
const num = v => v === 0 ? '0' : wide(v) ? sci(v) : Math.abs(v) >= 1 ? fmt(v, 3) : String(Number(v.toPrecision(3)));
// Signed megapascals with a true minus sign, e.g. −0.248 or +0.5.
const mpa = v => Math.abs(v) < 5e-4 ? '0' : (v < 0 ? '−' : '+') + fmt(Math.abs(v), 3);
const r1 = v => Math.round(v * 10) / 10;

export const definition = {
  slug: 'water-potential',
  title: 'Water potential & osmosis calculator',
  seoTitle: 'Water Potential Calculator (Ψ = Ψs + Ψp) — Osmosis Direction',
  category: 'Cells',
  icon: '≋',
  description: 'Calculate solute potential (−iCRT) and water potential in MPa from molarity, temperature, and pressure, then compare two cells to see which way water moves.',
  keywords: 'water potential calculator solute potential pressure potential osmosis icrt megapascals turgor plasmolysis',
  meta: 'Ψ = Ψs + Ψp · compare cells',
  fields: [
    { key: 'i', label: 'Ionization constant i', unit: '1 sucrose · 2 NaCl · 3 CaCl₂', value: 1, min: 1, max: 10, step: 'any' },
    { key: 'c', label: 'Molar concentration C', unit: 'mol/L', value: 0.1, min: 0, max: 10, step: 'any' },
    { key: 't', label: 'Temperature', unit: '°C', value: 25, min: -20, max: 120, step: 'any' },
    { key: 'p', label: 'Pressure potential Ψp', unit: 'MPa', value: 0, min: -5, max: 5, step: 'any' },
    { key: 'iA', label: 'Cell A · ionization constant i', unit: '', value: 1, min: 1, max: 10, step: 'any' },
    { key: 'cA', label: 'Cell A · concentration', unit: 'mol/L', value: 0.3, min: 0, max: 10, step: 'any' },
    { key: 'pA', label: 'Cell A · pressure potential Ψp', unit: 'MPa', value: 0.5, min: -5, max: 5, step: 'any' },
    { key: 'iB', label: 'Cell B · ionization constant i', unit: '', value: 2, min: 1, max: 10, step: 'any' },
    { key: 'cB', label: 'Cell B · concentration', unit: 'mol/L', value: 0.5, min: 0, max: 10, step: 'any' },
    { key: 'pB', label: 'Cell B · pressure potential Ψp', unit: 'MPa', value: 0, min: -5, max: 5, step: 'any' },
  ],
  modes: [['single', 'Single solution'], ['compare', 'Compare two cells']],
  fieldsByMode: { single: ['i', 'c', 't', 'p'], compare: ['t', 'iA', 'cA', 'pA', 'iB', 'cB', 'pB'] },
  presets: [
    { label: '0.1 M sucrose at 25 °C', values: { i: 1, c: 0.1, t: 25, p: 0 }, mode: 'single' },
    { label: '0.3 M NaCl (i = 2) at 25 °C', values: { i: 2, c: 0.3, t: 25, p: 0 }, mode: 'single' },
    { label: 'Turgid plant cell (0.3 M, Ψp = +0.5 MPa)', values: { i: 1, c: 0.3, t: 25, p: 0.5 }, mode: 'single' },
    { label: 'Compare: plant cell vs 0.5 M NaCl', values: { t: 25, iA: 1, cA: 0.3, pA: 0.5, iB: 2, cB: 0.5, pB: 0 }, mode: 'compare' },
    { label: 'Compare: red blood cell vs pure water', values: { t: 37, iA: 1, cA: 0.3, pA: 0, iB: 1, cB: 0, pB: 0 }, mode: 'compare' },
    { label: 'Compare: two cells at equilibrium', values: { t: 25, iA: 1, cA: 0.4, pA: 0.5, iB: 2, cB: 0.2, pB: 0.5 }, mode: 'compare' },
  ],
  formula: 'Ψ = Ψs + Ψp · Ψs = −iCRT · R = 0.00831 L·MPa/(mol·K) · T in kelvin',
  note: 'Pure water at atmospheric pressure has Ψ = 0 MPa; dissolved solutes always make Ψs negative. Water moves by osmosis from higher to lower water potential. Enter i = 1 for sugars, 2 for NaCl, 3 for CaCl₂ (complete dissociation assumed).',
  lesson: 'cell-transport',
  caption: 'Dot density and shading show solute concentration · the arrow shows net water movement toward the lower water potential',
  diagramLabel: 'Diagram of one or two cells shaded by solute concentration with an arrow showing the direction of net water movement and water potential values in megapascals',
  controlsTitle: 'Your solutions',
  explanationTitle: 'How the calculation works',
};

const checkI = (i, name) => { if (!Number.isFinite(i) || i < 1 || i > 10) throw new Error(`${name}: use an ionization constant from 1 (sucrose) to 10.`); };
const checkP = (p, name) => { if (!Number.isFinite(p) || p < -5 || p > 5) throw new Error(`${name}: enter a pressure potential from −5 to 5 MPa.`); };
const solution = (i, c, p, T, name) => { checkI(i, name); nonNegative([c], 10); checkP(p, name); const psiS = solutePotential(i, c, T); return { i, c, p, psiS, psi: psiS + p, osm: i * c }; };
const showS = (s, T) => `Ψs = −iCRT = −(${num(s.i)})(${num(s.c)} mol/L)(0.00831 L·MPa/mol·K)(${num(T)} K) = ${mpa(s.psiS)} MPa`;

export function explore(values, mode = 'single') {
  const t = values.t;
  if (!Number.isFinite(t) || t < -20 || t > 120) throw new Error('Temperature: enter a value from −20 to 120 °C.');
  const T = kelvin(t);
  const tempStep = `Convert to kelvin: T = ${num(t)} °C + 273.15 = ${num(T)} K. Gas-law style equations need an absolute temperature.`;
  if (mode === 'single') {
    const s = solution(values.i, values.c, values.p, T, 'Solution');
    const metrics = [
      { label: 'Solute potential Ψs', value: `${mpa(s.psiS)} MPa` },
      { label: 'Pressure potential Ψp', value: `${mpa(s.p)} MPa` },
      { label: 'Water potential Ψ', value: `${mpa(s.psi)} MPa` },
      { label: 'Osmotic pressure (iCRT)', value: `${num(-s.psiS)} MPa` },
      { label: 'Temperature', value: `${num(T)} K` },
    ];
    const steps = [
      tempStep,
      `${showS(s, T)}. ${s.c === 0 ? 'Pure water has no solute, so Ψs = 0.' : 'Dissolved particles lower the free energy of water, so Ψs is always negative; more particles (higher i × C) make it more negative.'}`,
      `Ψ = Ψs + Ψp = ${mpa(s.psiS)} + (${mpa(s.p)}) = ${mpa(s.psi)} MPa.`,
      s.psi < -5e-4
        ? `Pure water in an open container has Ψ = 0 MPa. Because ${mpa(s.psi)} MPa is lower, water would move by osmosis from pure water into this solution — or into a cell with these values, which would swell (an animal cell) or become turgid (a plant cell, whose wall pushes back and raises Ψp).`
        : s.psi > 5e-4
          ? `Ψ = ${mpa(s.psi)} MPa is higher than pure water (0 MPa): pressure is pushing water out faster than the solutes attract it, so water would leave this cell into pure water until Ψ falls to 0.`
          : 'Ψ = 0 MPa, the same as pure water: there is no net water movement. In a plant cell this is full turgor, where the wall pressure exactly balances the solute potential.',
    ];
    return { metrics, steps, model: { mode, T, cells: [{ name: 'Cell', ...s }], reference: 0, direction: s.psi < -5e-4 ? 'in' : s.psi > 5e-4 ? 'out' : 'none', diff: Math.abs(s.psi) } };
  }
  if (mode === 'compare') {
    const a = solution(values.iA, values.cA, values.pA, T, 'Cell A'), b = solution(values.iB, values.cB, values.pB, T, 'Cell B');
    const diff = Math.abs(a.psi - b.psi), tie = diff < 5e-4;
    const direction = tie ? 'none' : a.psi > b.psi ? 'A→B' : 'B→A';
    const movement = tie ? 'None (equilibrium)' : direction === 'A→B' ? 'Cell A → cell B' : 'Cell B → cell A';
    const metrics = [
      { label: 'Ψ · cell A', value: `${mpa(a.psi)} MPa` },
      { label: 'Ψ · cell B', value: `${mpa(b.psi)} MPa` },
      { label: 'Net water movement', value: movement },
      { label: 'Difference in Ψ', value: `${num(diff)} MPa` },
      { label: 'Ψs · cell A', value: `${mpa(a.psiS)} MPa` },
      { label: 'Ψs · cell B', value: `${mpa(b.psiS)} MPa` },
    ];
    const steps = [
      tempStep,
      `Cell A: ${showS(a, T)}; Ψ = Ψs + Ψp = ${mpa(a.psiS)} + (${mpa(a.p)}) = ${mpa(a.psi)} MPa.`,
      `Cell B: ${showS(b, T)}; Ψ = Ψs + Ψp = ${mpa(b.psiS)} + (${mpa(b.p)}) = ${mpa(b.psi)} MPa.`,
      tie
        ? `Both cells have the same water potential (${mpa(a.psi)} MPa), so there is no net water movement: they are at osmotic equilibrium even if their molar concentrations differ, because only the total Ψ = Ψs + Ψp matters: the particle concentration i × C or the pressure potential makes up the difference.`
        : `Water moves from higher to lower water potential. Ψ(${direction === 'A→B' ? 'A' : 'B'}) = ${mpa(direction === 'A→B' ? a.psi : b.psi)} MPa is higher than Ψ(${direction === 'A→B' ? 'B' : 'A'}) = ${mpa(direction === 'A→B' ? b.psi : a.psi)} MPa, so net water flows from cell ${direction === 'A→B' ? 'A to cell B' : 'B to cell A'} until the potentials equalize. The driving difference is ${num(diff)} MPa; the ${direction === 'A→B' ? 'receiving cell B' : 'receiving cell A'} gains water and the other loses it.`,
    ];
    return { metrics, steps, model: { mode, T, cells: [{ name: 'Cell A', ...a }, { name: 'Cell B', ...b }], direction, diff } };
  }
  throw new Error('Choose a supported mode.');
}

// Deterministic solute dots so the same inputs always draw the same picture.
const dots = (cx, cy, rx, ry, count) => {
  let seed = 7, out = '';
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  for (let k = 0; k < count; k++) {
    const a = rnd() * 2 * Math.PI, r = Math.sqrt(rnd()) * 0.86;
    out += circle(r1(cx + r * rx * Math.cos(a)), r1(cy + r * ry * Math.sin(a)), 3, { fill: palette.plum, stroke: 'none', width: 0, opacity: 0.85 });
  }
  return out;
};

const cellArt = (cx, cy, s) => {
  const wallW = 220, wallH = 170, shade = r1(0.12 + 0.75 * Math.min(1, s.osm / 1.2));
  let out = rect(cx - wallW / 2, cy - wallH / 2, wallW, wallH, { fill: palette.mint, stroke: s.p > 0 ? palette.leafDark : palette.leafLight, width: s.p > 0 ? 5 : 3, rx: 30, opacity: 0.6 });
  const rx = s.p > 0 ? 98 : 84, ry = s.p > 0 ? 72 : 60;
  out += ellipse(cx, cy, rx, ry, { fill: palette.sky, stroke: palette.ink, width: 2, opacity: shade });
  out += ellipse(cx, cy, rx, ry, { fill: 'none', stroke: palette.ink, width: 2 });
  out += dots(cx, cy, rx, ry, Math.round(Math.min(70, s.osm * 45)));
  // A white pill keeps the label legible at any shade: a dilute cell's ellipse is nearly transparent over the mint wall.
  const label = `Ψ = ${mpa(s.psi)} MPa`, lw = r1(label.length * 8.2 + 18);
  out += rect(r1(cx - lw / 2), cy - 11, lw, 24, { fill: palette.white, stroke: 'none', width: 0, rx: 12, opacity: 0.9 });
  out += text(cx, cy + 6, label, { size: 14, weight: 700, color: palette.ink });
  return out;
};

const caption = (cx, y, s) => text(cx, y, s.name, { size: 13, weight: 700, color: palette.ink })
  + text(cx, y + 20, `i = ${num(s.i)} · C = ${num(s.c)} mol/L`, { size: 12 })
  + text(cx, y + 40, `Ψs = ${mpa(s.psiS)} · Ψp = ${mpa(s.p)} MPa`, { size: 12, color: palette.ink })
  + text(cx, y + 62, `Ψ = ${mpa(s.psi)} MPa`, { size: 14, weight: 700, color: palette.leafDark });

export function diagram(m) {
  let out = '';
  if (m.mode === 'single') {
    const s = m.cells[0], cx = 360, cy = 240;
    out += rect(60, 80, 600, 320, { fill: palette.skyLight, stroke: palette.sky, width: 2, rx: 18, opacity: 0.45 });
    out += text(cx, 40, 'A cell bathed in pure water (Ψ = 0 MPa)', { size: 15, weight: 700, color: palette.ink });
    out += text(cx, 62, `Solution inside: ${num(s.c)} mol/L · i = ${num(s.i)} · ${num(m.T)} K`, { size: 12 });
    out += text(120, 104, 'Pure water · Ψ = 0 MPa', { size: 12, anchor: 'start', color: palette.sky, weight: 600 });
    out += cellArt(cx, cy, s);
    const arrows = m.direction === 'in' ? [[110, cy, 235, cy], [610, cy, 485, cy]] : m.direction === 'out' ? [[235, cy, 110, cy], [485, cy, 610, cy]] : [];
    arrows.forEach(([x1, y1, x2, y2]) => out += arrow(x1, y1, x2, y2, { color: palette.coral, width: 3 }));
    out += text(cx, 372, m.direction === 'in' ? `Net water movement: into the cell (Ψ inside ${mpa(s.psi)} &lt; 0 outside)` : m.direction === 'out' ? `Net water movement: out of the cell (Ψ inside ${mpa(s.psi)} &gt; 0 outside)` : 'No net water movement: Ψ inside = Ψ outside = 0', { size: 13, weight: 600, color: palette.coralDark });
    out += caption(cx, 428, { ...s, name: s.c === 0 ? 'Pure water inside' : 'Solution inside the cell' });
    return out;
  }
  const [a, b] = m.cells, ax = 190, bx = 530, cy = 230;
  out += text(360, 40, 'Water moves toward the lower water potential', { size: 15, weight: 700, color: palette.ink });
  out += text(360, 62, `Both cells at ${num(m.T)} K · dot density shows solute concentration`, { size: 12 });
  out += cellArt(ax, cy, a) + cellArt(bx, cy, b);
  if (m.direction === 'A→B') out += arrow(310, cy, 410, cy, { color: palette.coral, width: 4 });
  else if (m.direction === 'B→A') out += arrow(410, cy, 310, cy, { color: palette.coral, width: 4 });
  else out += line(312, cy, 408, cy, { color: palette.muted, width: 3, dash: '6 6' }) + text(360, cy - 14, '⇌', { size: 20, color: palette.muted });
  out += text(360, cy + 34, m.direction === 'none' ? 'equilibrium' : 'net water', { size: 12, weight: 600, color: palette.coralDark });
  out += text(360, cy + 50, m.direction === 'none' ? 'ΔΨ = 0' : `ΔΨ = ${num(m.diff)} MPa`, { size: 12, weight: 600, color: palette.coralDark });
  out += caption(ax, 356, a) + caption(bx, 356, b);
  out += text(360, 470, m.direction === 'A→B' ? 'Cell B gains water · cell A loses water' : m.direction === 'B→A' ? 'Cell A gains water · cell B loses water' : 'No net gain or loss on either side', { size: 13, weight: 600, color: palette.leafDark });
  out += text(360, 492, 'Thick wall = positive pressure potential (turgor)', { size: 12 });
  return out;
}
