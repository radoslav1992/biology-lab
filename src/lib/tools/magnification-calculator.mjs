// Magnification calculator: image size, actual size, magnification, total microscope magnification, and scale bars.
import { fmt, positive, palette } from '../format.mjs';
import { text, line, rect, circle, ellipse, polygon } from '../svg.mjs';

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = n => String(n).split('').map(ch => SUP[ch] ?? ch).join('');
// Superscript scientific notation (2.5 × 10⁻⁹) for values that plain decimals would print as 2.5e-9 or as a 13-digit string.
const sci = v => { let e = Math.floor(Math.log10(Math.abs(v))), mant = Number((v / 10 ** e).toPrecision(3)); if (Math.abs(mant) >= 10) { mant = Number((mant / 10).toPrecision(3)); e += 1; } else if (Math.abs(mant) < 1) { mant = Number((mant * 10).toPrecision(3)); e -= 1; } return mant === 1 ? `10${sup(e)}` : `${mant} × 10${sup(e)}`; };
const wide = v => v !== 0 && (Math.abs(v) < 1e-6 || Math.abs(v) >= 1e9); // outside the range where plain decimals read well
const num = v => v === 0 ? '0' : wide(v) ? sci(v) : Math.abs(v) >= 1 ? fmt(v, 3) : String(Number(v.toPrecision(3)));
const r1 = v => Math.round(v * 10) / 10;
const CELL = 50; // µm — the reference cell used in total-magnification mode
// Choose a scale-bar length of 1, 2, or 5 × 10ⁿ µm that is a comfortable fraction of the cell.
const niceBar = actual => { const t = actual / 2.5, base = 10 ** Math.floor(Math.log10(t)); return [5, 2, 1].map(k => k * base).find(v => v <= t) || base; };

export const definition = {
  slug: 'magnification-calculator',
  title: 'Magnification & scale bar calculator',
  seoTitle: 'Magnification Calculator — Actual Size, Image Size & Scale Bar',
  category: 'Lab skills',
  icon: '⌾',
  description: 'Find actual size, image size, or magnification with correct mm-to-µm conversion, work out total microscope magnification, and size a scale bar.',
  keywords: 'magnification calculator image size actual size scale bar micrometer millimeter eyepiece objective total magnification field of view',
  meta: 'I = A × M · scale bars',
  fields: [
    { key: 'image', label: 'Image (drawing or photo) size', unit: 'mm', value: 20, min: 0.001, max: 10000, step: 'any' },
    { key: 'mag', label: 'Magnification', unit: '×', value: 400, min: 0.01, max: 10000000, step: 'any' },
    { key: 'actual', label: 'Actual size', unit: 'µm', value: 50, min: 0.0001, max: 10000000, step: 'any' },
    { key: 'eyepiece', label: 'Eyepiece lens', unit: '×', value: 10, min: 1, max: 50, step: 'any' },
    { key: 'objective', label: 'Objective lens', unit: '×', value: 40, min: 1, max: 200, step: 'any' },
    { key: 'fov', label: 'Field of view at this magnification', unit: 'mm', value: 0.45, min: 0.0001, max: 100, step: 'any' },
  ],
  modes: [['actual', 'Find actual size'], ['magnification', 'Find magnification'], ['image', 'Find image size'], ['total', 'Total magnification']],
  fieldsByMode: { actual: ['image', 'mag'], magnification: ['image', 'actual'], image: ['actual', 'mag'], total: ['eyepiece', 'objective', 'fov'] },
  presets: [
    { label: '20 mm drawing at 400×', values: { image: 20, mag: 400 }, mode: 'actual' },
    { label: 'Red blood cell: 7.5 µm drawn 7.5 mm wide', values: { image: 7.5, actual: 7.5 }, mode: 'magnification' },
    { label: '100 µm cell under the 40× objective (400×)', values: { actual: 100, mag: 400 }, mode: 'image' },
    { label: 'Bacterium: 2 µm at 1,000×', values: { actual: 2, mag: 1000 }, mode: 'image' },
    { label: '10× eyepiece · 40× objective', values: { eyepiece: 10, objective: 40, fov: 0.45 }, mode: 'total' },
    { label: '10× eyepiece · 4× scanning objective', values: { eyepiece: 10, objective: 4, fov: 4.5 }, mode: 'total' },
    { label: '10× eyepiece · 100× oil immersion', values: { eyepiece: 10, objective: 100, fov: 0.18 }, mode: 'total' },
  ],
  formula: 'Magnification = image size ÷ actual size (same units) · 1 mm = 1,000 µm · Total = eyepiece × objective',
  note: 'Always convert to one unit before dividing: multiply millimeters by 1,000 to get micrometers. Magnification itself has no units. The field-of-view presets assume a typical field number of 18 mm.',
  lesson: 'lab-measurements',
  caption: 'A cell drawn to scale under a scale bar labeled with its real length · total mode shows how many 50 µm cells span the field of view',
  diagramLabel: 'Diagram of a cell beneath a labeled scale bar, or a microscope field of view crossed by a row of 50 micrometer cells',
  controlsTitle: 'Your measurements',
  explanationTitle: 'How the conversion works',
};

export function explore(values, mode = 'actual') {
  if (mode === 'total') {
    const { eyepiece, objective, fov } = values;
    positive([eyepiece, objective, fov], 1000000);
    const total = eyepiece * objective, fovUm = fov * 1000, cells = fovUm / CELL, whole = Math.floor(cells);
    const metrics = [
      { label: 'Total magnification', value: `${num(total)}×` },
      { label: 'Field of view', value: `${num(fovUm)} µm` },
      { label: 'Cells across (50 µm each)', value: `≈ ${fmt(cells, 1)}` },
      { label: 'Apparent size of a 50 µm cell', value: `${num(CELL * total / 1000)} mm` },
    ];
    const steps = [
      `Total magnification = eyepiece × objective = ${num(eyepiece)}× × ${num(objective)}× = ${num(total)}×. Each lens magnifies the image the other produces, so the factors multiply.`,
      `Field of view = ${num(fov)} mm × 1,000 = ${num(fovUm)} µm across the circle you see.`,
      `Cells across the field = ${num(fovUm)} µm ÷ 50 µm ≈ ${fmt(cells, 1)}, so about ${num(whole)} whole 50 µm cell${whole === 1 ? '' : 's'} fit side by side. Switching to an objective with 4 times the power shrinks the field diameter to a quarter, so roughly a quarter as many cells fit across (and a sixteenth as many fill the area).`,
      `A 50 µm cell viewed at ${num(total)}× appears as large as a ${num(CELL * total / 1000)} mm object held at normal reading distance — the same arithmetic you use for a drawing: image = actual × magnification.`,
    ];
    return { metrics, steps, model: { mode, eyepiece, objective, total, fov, fovUm, cells } };
  }
  let image, actual, mag; // image and actual in µm
  if (mode === 'actual') { positive([values.image, values.mag], 10000000); image = values.image * 1000; mag = values.mag; actual = image / mag; }
  else if (mode === 'magnification') { positive([values.image, values.actual], 10000000); image = values.image * 1000; actual = values.actual; mag = image / actual; }
  else if (mode === 'image') { positive([values.actual, values.mag], 10000000); actual = values.actual; mag = values.mag; image = actual * mag; }
  else throw new Error('Choose a supported magnification mode.');
  const bar = niceBar(actual), barMm = bar * mag / 1000;
  const tiles = {
    actualUm: { label: 'Actual size', value: `${num(actual)} µm` },
    actualMm: { label: 'Actual size (mm)', value: `${num(actual / 1000)} mm` },
    imageMm: { label: 'Image size', value: `${num(image / 1000)} mm` },
    imageUm: { label: 'Image size (µm)', value: `${num(image)} µm` },
    mag: { label: 'Magnification', value: `${num(mag)}×` },
    bar: { label: `Scale bar for ${num(bar)} µm`, value: `${num(barMm)} mm on the image` },
  };
  const order = mode === 'actual' ? ['actualUm', 'actualMm', 'imageUm', 'mag', 'bar'] : mode === 'magnification' ? ['mag', 'imageUm', 'actualUm', 'actualMm', 'bar'] : ['imageMm', 'imageUm', 'actualUm', 'mag', 'bar'];
  const metrics = order.map(k => tiles[k]);
  const steps = mode === 'actual'
    ? [
      `Convert the image size to micrometers so both sizes share a unit: ${num(values.image)} mm × 1,000 = ${num(image)} µm.`,
      `Actual size = image size ÷ magnification = ${num(image)} µm ÷ ${num(mag)} = ${num(actual)} µm (that is ${num(actual / 1000)} mm).`,
      `Sense check: a red blood cell is about 7.5 µm across, a typical plant cell 30–100 µm, and a bacterium 1–5 µm. ${actual < 0.2 ? 'A size this small is below the resolution of a light microscope (about 0.2 µm), so the image would need an electron microscope.' : actual > 1000 ? 'At more than 1 mm this object would be visible to the naked eye.' : 'This size sits comfortably in light-microscope territory.'}`,
    ]
    : mode === 'magnification'
      ? [
        `Convert the image size to micrometers: ${num(values.image)} mm × 1,000 = ${num(image)} µm. Never divide millimeters by micrometers directly — the answer would be 1,000 times too small.`,
        `Magnification = image size ÷ actual size = ${num(image)} µm ÷ ${num(actual)} µm = ${num(mag)}×. Magnification has no units because it is a ratio of two lengths.`,
        `Check by multiplying back: ${num(actual)} µm × ${num(mag)} = ${num(image)} µm = ${num(image / 1000)} mm, the image size you started with.`,
      ]
      : [
        `Image size = actual size × magnification = ${num(actual)} µm × ${num(mag)} = ${num(image)} µm.`,
        `Convert to millimeters for a drawing or print: ${num(image)} µm ÷ 1,000 = ${num(image / 1000)} mm.`,
        `A scale bar representing ${num(bar)} µm should be drawn ${num(barMm)} mm long on this image (${num(bar)} × ${num(mag)} ÷ 1,000). Scale bars are better than stating a magnification, because they stay correct if the picture is enlarged or shrunk.`,
      ];
  return { metrics, steps, model: { mode, actual, image, mag, bar, barMm } };
}

const cellArt = (cx, cy, w) => {
  const rx = w / 2, ry = w * 0.34;
  let out = ellipse(cx, cy, r1(rx), r1(ry), { fill: palette.mint, stroke: palette.leaf, width: 3 });
  out += circle(r1(cx - rx * 0.28), cy, r1(ry * 0.42), { fill: palette.leafLight, stroke: palette.leafDark, width: 2 });
  out += circle(r1(cx - rx * 0.34), r1(cy - ry * 0.08), r1(ry * 0.12), { fill: palette.leafDark, stroke: 'none', width: 0 });
  [[0.36, -0.42], [0.55, 0.28], [0.08, 0.62], [0.22, -0.7], [0.72, -0.1]].forEach(([fx, fy]) => { out += ellipse(r1(cx + rx * fx), r1(cy + ry * fy), r1(w * 0.048), r1(w * 0.022), { fill: palette.coral, stroke: palette.coralDark, width: 1, opacity: 0.85 }); });
  return out;
};

const panel = (x, y, label, value) => rect(x, y, 250, 54, { fill: palette.white, stroke: palette.line, width: 1.5, rx: 10 }) + text(x + 14, y + 21, label, { size: 12, anchor: 'start' }) + text(x + 14, y + 43, value, { size: 18, anchor: 'start', weight: 700, color: palette.ink });

export function diagram(m) {
  let out = '';
  if (m.mode === 'total') {
    const cx = 235, cy = 262, R = 176;
    out += text(cx, 40, `Field of view at ${num(m.total)}×`, { size: 15, weight: 700, color: palette.ink });
    out += circle(cx, cy, R + 10, { fill: '#22302a', stroke: 'none', width: 0 });
    out += circle(cx, cy, R, { fill: palette.paper, stroke: palette.ink, width: 2 });
    const n = m.cells, whole = Math.floor(n), w = 2 * R / n;
    if (whole >= 1 && w >= 6) {
      const r = r1(Math.min(w * 0.46, 40));
      for (let k = 0; k < whole; k++) out += circle(r1(cx - R + w * (k + 0.5)), cy, r, { fill: palette.mint, stroke: palette.leaf, width: 2 }) + circle(r1(cx - R + w * (k + 0.5)), cy, r1(r * 0.35), { fill: palette.leafLight, stroke: 'none', width: 0 });
    } else if (whole >= 1) {
      out += rect(cx - R, cy - 9, 2 * R, 18, { fill: palette.leafLight, stroke: palette.leaf, width: 1.5, rx: 9 }) + text(cx, cy - 18, `≈ ${num(whole)} cells side by side`, { size: 12, color: palette.leafDark, weight: 600 });
    } else {
      out += ellipse(cx, cy, R * 1.6, R * 1.1, { fill: palette.mint, stroke: palette.leaf, width: 3, opacity: 0.6 }) + text(cx, cy - R * 0.6, 'one 50 µm cell overflows the field', { size: 12, color: palette.leafDark, weight: 600 });
    }
    out += line(cx - R, cy + R * 0.55, cx + R, cy + R * 0.55, { color: palette.coralDark, width: 1.5, dash: '5 4' }) + line(cx - R, cy + R * 0.55 - 8, cx - R, cy + R * 0.55 + 8, { color: palette.coralDark, width: 1.5 }) + line(cx + R, cy + R * 0.55 - 8, cx + R, cy + R * 0.55 + 8, { color: palette.coralDark, width: 1.5 });
    out += text(cx, cy + R * 0.55 + 20, `${num(m.fovUm)} µm = ${num(m.fov)} mm`, { size: 13, weight: 700, color: palette.coralDark });
    out += text(cx, cy + R + 36, 'Each green disc is a 50 µm cell', { size: 12 });
    out += panel(440, 92, 'Eyepiece × objective', `${num(m.eyepiece)}× × ${num(m.objective)}×`);
    out += panel(440, 158, 'Total magnification', `${num(m.total)}×`);
    out += panel(440, 224, 'Field diameter', `${num(m.fovUm)} µm`);
    out += panel(440, 290, 'Cells across (50 µm)', `≈ ${fmt(m.cells, 1)}`);
    out += text(565, 380, 'Higher power → smaller, brighter-looking', { size: 12 });
    out += text(565, 398, 'detail but a narrower field of view', { size: 12 });
    return out;
  }
  const cx = 230, cy = 240, W = 320;
  out += text(cx, 40, `A ${num(m.actual)} µm cell at ${num(m.mag)}×`, { size: 15, weight: 700, color: palette.ink });
  out += cellArt(cx, cy, W);
  out += line(cx - W / 2, cy - W * 0.34 - 22, cx + W / 2, cy - W * 0.34 - 22, { color: palette.muted, width: 1, dash: '4 4' }) + text(cx, cy - W * 0.34 - 30, `actual width ${num(m.actual)} µm · image ${num(m.image / 1000)} mm`, { size: 12 });
  const barPx = r1(W * m.bar / m.actual), bx = r1(cx - barPx / 2), by = cy + W * 0.34 + 44;
  out += line(bx, by, bx + barPx, by, { color: palette.ink, width: 6, cap: 'butt' }) + line(bx, by - 9, bx, by + 9, { color: palette.ink, width: 2 }) + line(bx + barPx, by - 9, bx + barPx, by + 9, { color: palette.ink, width: 2 });
  out += text(cx, by + 26, `${num(m.bar)} µm`, { size: 14, weight: 700, color: palette.ink });
  out += text(cx, by + 46, `drawn ${num(m.barMm)} mm long at ${num(m.mag)}×`, { size: 12 });
  out += panel(440, 92, 'Actual size', `${num(m.actual)} µm`);
  out += panel(440, 158, 'Image size', `${num(m.image / 1000)} mm (${num(m.image)} µm)`);
  out += panel(440, 224, 'Magnification', `${num(m.mag)}×`);
  // The I / A × M formula triangle: cover the unknown to read the formula.
  const tri = [[500, 440], [630, 440], [565, 330]];
  out += polygon(tri, { fill: palette.cream, stroke: palette.sun, width: 2 }) + line(511, 400, 619, 400, { color: palette.sun, width: 2 });
  out += text(565, 384, 'I', { size: 20, weight: 700, color: palette.ink }) + text(540, 428, 'A', { size: 18, weight: 700, color: palette.ink }) + text(590, 428, 'M', { size: 18, weight: 700, color: palette.ink }) + text(565, 424, '×', { size: 14, color: palette.muted });
  out += text(565, 466, 'I = A × M · cover the unknown to read it', { size: 12 });
  out += text(565, 484, 'I image · A actual · M magnification', { size: 12 });
  return out;
}
