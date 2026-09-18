// Cell size explorer: surface area, volume, and the surface-area-to-volume ratio of a cube-shaped or spherical cell.
import { fmt, positive, palette } from '../format.mjs';
import { text, line, rect, circle, ellipse, polygon, polyline, chart, curve } from '../svg.mjs';

// Sizes span 0.01–10,000 µm, so tiny ratios need significant figures rather than a fixed 3 decimals.
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = n => String(n).split('').map(ch => SUP[ch] ?? ch).join('');
// Superscript scientific notation (2.5 × 10⁻⁹) for values that plain decimals would print as 2.5e-9 or as a 13-digit string.
const sci = v => { let e = Math.floor(Math.log10(Math.abs(v))), mant = Number((v / 10 ** e).toPrecision(3)); if (Math.abs(mant) >= 10) { mant = Number((mant / 10).toPrecision(3)); e += 1; } else if (Math.abs(mant) < 1) { mant = Number((mant * 10).toPrecision(3)); e -= 1; } return mant === 1 ? `10${sup(e)}` : `${mant} × 10${sup(e)}`; };
const wide = v => v !== 0 && (Math.abs(v) < 1e-6 || Math.abs(v) >= 1e9); // outside the range where plain decimals read well
const num = v => v === 0 ? '0' : wide(v) ? sci(v) : Math.abs(v) >= 1 ? fmt(v, 3) : String(Number(v.toPrecision(3)));
const short = v => v === 0 ? '0' : wide(v) ? sci(v) : String(Number(v.toPrecision(3)));
const r1 = v => Math.round(v * 10) / 10;

export const definition = {
  slug: 'cell-size',
  title: 'Cell size & surface-area-to-volume ratio',
  seoTitle: 'Surface Area to Volume Ratio Calculator — Why Cells Stay Small',
  category: 'Cells',
  icon: '◫',
  description: 'Enter a cell’s side length or radius to get its surface area, volume, and SA:V ratio with worked steps, and see why doubling the size halves the ratio.',
  keywords: 'surface area to volume ratio sa:v cube sphere diffusion why are cells small cell size calculator',
  meta: 'Cube or sphere · live ratio',
  fields: [
    { key: 'side', label: 'Side length s', unit: 'µm', value: 10, min: 0.01, max: 10000, step: 'any' },
    { key: 'radius', label: 'Radius r', unit: 'µm', value: 10, min: 0.01, max: 10000, step: 'any' },
  ],
  modes: [['cube', 'Cube-shaped cell'], ['sphere', 'Spherical cell']],
  fieldsByMode: { cube: ['side'], sphere: ['radius'] },
  presets: [
    { label: 'Bacterium (1 µm across)', values: { side: 1, radius: 0.5 }, mode: 'sphere' },
    { label: 'Animal cell (20 µm across)', values: { side: 20, radius: 10 }, mode: 'sphere' },
    { label: 'Plant cell (50 µm across)', values: { side: 50, radius: 25 }, mode: 'cube' },
    { label: 'Frog egg (1,000 µm across)', values: { side: 1000, radius: 500 }, mode: 'sphere' },
  ],
  formula: 'Cube: SA : V = 6s² / s³ = 6 / s · Sphere: SA : V = 4πr² / (4⁄3 πr³) = 3 / r',
  note: 'Lengths are in micrometers (µm): 1 µm = 0.001 mm. The presets give each cell’s diameter “across”, so the sphere radius is half of it. Real cells are rarely perfect cubes or spheres, but the trend is the same for any shape: SA : V falls as size grows.',
  lesson: 'surface-area-to-volume',
  caption: 'Left: your cell beside one twice as large · Right: SA : V versus size — the ratio keeps falling as a cell grows',
  diagramLabel: 'Diagram of the chosen cell next to a cell twice as large, with an inset graph of surface-area-to-volume ratio against size',
  controlsTitle: 'Your cell',
  explanationTitle: 'Why it works',
};

export function explore(values, mode = 'cube') {
  const isCube = mode === 'cube';
  if (!isCube && mode !== 'sphere') throw new Error('Choose a cube-shaped or a spherical cell.');
  const size = isCube ? values.side : values.radius;
  positive([size], 10000);
  const area = isCube ? 6 * size * size : 4 * Math.PI * size * size;
  const volume = isCube ? size ** 3 : (4 / 3) * Math.PI * size ** 3;
  const ratio = area / volume; // equals 6/s for a cube and 3/r for a sphere
  const depth = isCube ? size / 2 : size; // farthest point from the membrane: the center
  const big = size * 2, ratio2 = ratio / 2;
  const sym = isCube ? 's' : 'r';
  const metrics = [
    { label: 'Surface area', value: `${num(area)} µm²` },
    { label: 'Volume', value: `${num(volume)} µm³` },
    { label: 'SA : V ratio', value: `${num(ratio)} per µm` },
    { label: 'Surface to center', value: `${num(depth)} µm` },
    { label: 'SA : V if twice as large', value: `${num(ratio2)} per µm` },
  ];
  const steps = isCube
    ? [
      `Surface area = 6s² = 6 × (${num(size)} µm)² = ${num(area)} µm². A cube has six identical square faces.`,
      `Volume = s³ = (${num(size)} µm)³ = ${num(volume)} µm³.`,
      `SA : V = ${num(area)} ÷ ${num(volume)} = ${num(ratio)} per µm, which simplifies to 6 / s = 6 / ${num(size)}. Every cubic micrometer of cytoplasm is served by ${num(ratio)} µm² of membrane.`,
    ]
    : [
      `Surface area = 4πr² = 4π × (${num(size)} µm)² = ${num(area)} µm².`,
      `Volume = (4⁄3)πr³ = (4⁄3)π × (${num(size)} µm)³ = ${num(volume)} µm³.`,
      `SA : V = ${num(area)} ÷ ${num(volume)} = ${num(ratio)} per µm, which simplifies to 3 / r = 3 / ${num(size)}. Every cubic micrometer of cytoplasm is served by ${num(ratio)} µm² of membrane.`,
    ];
  steps.push(`Doubling ${sym} to ${num(big)} µm multiplies surface area by 2² = 4 and volume by 2³ = 8, so SA : V halves to ${num(ratio2)} per µm. The center of the bigger cell sits ${num(isCube ? big / 2 : big)} µm from the nearest membrane instead of ${num(depth)} µm — a longer trip for oxygen, nutrients, and waste that move by diffusion. That is why large cells divide, flatten, fold their membranes, or stay metabolically quiet, like a yolk-filled egg.`);
  return { metrics, steps, model: { shape: mode, size, area, volume, ratio, depth, k: isCube ? 6 : 3 } };
}

const cubeArt = (cx, cy, w, opts) => {
  const d = w * 0.32, x0 = r1(cx - (w + d) / 2), y0 = r1(cy - (w - d) / 2);
  const top = [[x0, y0], [x0 + d, y0 - d], [x0 + w + d, y0 - d], [x0 + w, y0]].map(p => p.map(r1));
  const side = [[x0 + w, y0], [x0 + w + d, y0 - d], [x0 + w + d, y0 + w - d], [x0 + w, y0 + w]].map(p => p.map(r1));
  const fc = [r1(x0 + w / 2), r1(y0 + w / 2)];
  return polygon(top, { fill: palette.leafLight, stroke: palette.leaf, width: 2, opacity: 0.9 })
    + polygon(side, { fill: palette.leaf, stroke: palette.leafDark, width: 2, opacity: 0.55 })
    + rect(x0, y0, r1(w), r1(w), { fill: palette.mint, stroke: palette.leaf, width: 2.5 })
    + line(fc[0], fc[1], r1(x0 + w), fc[1], { color: palette.coral, width: 2, dash: '5 4' })
    + circle(fc[0], fc[1], 3.5, { fill: palette.coral, stroke: palette.white, width: 1 })
    + text(r1(fc[0] + w / 4), r1(fc[1] - 8), opts.label, { size: 12, color: palette.coralDark, weight: 600 });
};

const sphereArt = (cx, cy, w, opts) => {
  const r = r1(w / 2);
  return circle(cx, cy, r, { fill: palette.mint, stroke: palette.leaf, width: 2.5 })
    + ellipse(r1(cx - r * 0.35), r1(cy - r * 0.38), r1(r * 0.28), r1(r * 0.16), { fill: palette.white, stroke: 'none', width: 0, opacity: 0.7 })
    + line(cx, cy, r1(cx + r), cy, { color: palette.coral, width: 2, dash: '5 4' })
    + circle(cx, cy, 3.5, { fill: palette.coral, stroke: palette.white, width: 1 })
    + text(r1(cx + r / 2), cy - 8, opts.label, { size: 12, color: palette.coralDark, weight: 600 });
};

export function diagram(m) {
  const isCube = m.shape === 'cube', sym = isCube ? 's' : 'r';
  const art = isCube ? cubeArt : sphereArt;
  let out = '';
  out += text(200, 36, 'Your cell beside one twice as large', { size: 15, weight: 700, color: palette.ink });
  out += text(200, 56, 'Surface area × 4 · Volume × 8 · SA : V × ½', { size: 12 });
  out += art(100, 250, 80, { label: isCube ? 's / 2' : 'r' });
  out += art(285, 250, 160, { label: isCube ? 's / 2' : 'r' });
  const labels = (cx, title, dim, ratio) => text(cx, 388, title, { size: 13, weight: 700, color: palette.ink })
    + text(cx, 408, dim, { size: 12, color: palette.muted })
    + text(cx, 428, `SA : V = ${num(ratio)} per µm`, { size: 12, color: palette.leafDark, weight: 600 });
  out += labels(100, 'Your cell', `${sym} = ${num(m.size)} µm`, m.ratio);
  out += labels(285, 'Twice as large', `${sym} = ${num(m.size * 2)} µm`, m.ratio / 2);
  out += text(200, 480, isCube ? 'Cube: SA : V = 6 / s' : 'Sphere: SA : V = 3 / r', { size: 13, weight: 600, color: palette.ink });
  out += text(200, 500, 'Bigger cell, less membrane per unit of cytoplasm', { size: 12 });
  // Inset: SA:V against size, sampled from a quarter of the current size to four times it.
  const box = { left: 470, top: 100, width: 210, height: 200 };
  const c = chart({ box, x: [0, 4 * m.size], y: [0, 4 * m.ratio], xLabel: `Size ${sym} (µm)`, yLabel: 'SA : V (per µm)', xTicks: 4, yTicks: 4, xFormat: short, yFormat: short });
  out += text(box.left + box.width / 2, 78, 'SA : V falls as size grows', { size: 13, weight: 700, color: palette.ink });
  out += c.grid;
  out += polyline(curve(v => m.k / v, [m.size / 4, 4 * m.size], c.px, c.py, 120).map(p => p.map(r1)), { stroke: palette.leaf, width: 3 });
  const mark = (x, y, color, label, dy) => line(r1(c.px(x)), r1(c.py(y)), r1(c.px(x)), r1(c.py(0)), { color, width: 1.5, dash: '4 4' })
    + circle(r1(c.px(x)), r1(c.py(y)), 6, { fill: palette.white, stroke: color, width: 3 })
    + text(r1(c.px(x) + 10), r1(c.py(y) + dy), label, { size: 12, anchor: 'start', color, weight: 600 });
  out += mark(m.size, m.ratio, palette.leafDark, 'you', -8);
  out += mark(2 * m.size, m.ratio / 2, palette.coralDark, '2×', -8);
  return out;
}
