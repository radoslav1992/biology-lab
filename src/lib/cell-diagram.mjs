// The site's reference cell drawings: one animal cell and one plant cell in a 720 × 460 viewBox, built from the
// geometry below. CellDiagram.astro draws them as the labeled atlas diagram (names beside numbered badges, every
// organelle a link); LabelQuiz.astro draws the same cells with `pointers: true` for the label-the-cell quiz
// (a numbered badge with a leader line that ends on the structure, the name hidden until it is revealed).
import { organelles, cellTypes } from './organelles.mjs';
import { text, line, rect, circle, ellipse, path, group } from './svg.mjs';

const C = { ink: '#173226', leaf: '#2f8a5b', leafDark: '#226b45', leafLight: '#8fcfa5', mint: '#e6f2e8', coral: '#e2703a', sun: '#f6c453', amber: '#a9761c', sky: '#4b86b4', skyDark: '#356a94', skyLight: '#a9c6de', plum: '#7b4b8a', plumLight: '#ead9ef', cream: '#fff3d6', white: '#ffffff', hi: '#ffe1cd' };
const STYLE = {
  nucleus: { stroke: C.plum, fill: C.plumLight },
  mitochondrion: { stroke: C.amber, fill: C.sun },
  chloroplast: { stroke: C.leaf, fill: C.leafLight },
  ribosome: { stroke: C.ink, fill: C.ink },
  'endoplasmic-reticulum': { stroke: C.sky, fill: C.skyLight },
  'golgi-apparatus': { stroke: C.skyDark, fill: C.cream },
  lysosome: { stroke: '#c9582a', fill: '#f9dccb' },
  'cell-membrane': { stroke: C.ink, fill: 'none' },
  extra: { stroke: C.leafDark, fill: C.mint },
};
const deg = a => a * Math.PI / 180;
const ept = (cx, cy, rx, ry, a) => [cx + rx * Math.cos(deg(a)), cy + ry * Math.sin(deg(a))];
const r1 = n => Math.round(n * 10) / 10;
/** Axis-aligned elliptical arc from angle a0 to a1 (degrees, clockwise on screen). */
const arc = (cx, cy, rx, ry, a0, a1) => { const [x0, y0] = ept(cx, cy, rx, ry, a0), [x1, y1] = ept(cx, cy, rx, ry, a1); return `M ${r1(x0)} ${r1(y0)} A ${rx} ${ry} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${r1(x1)} ${r1(y1)}`; };
const shapeAttrs = (s, hi, width = 2.2) => ({ fill: hi ? C.hi : s.fill, stroke: hi ? C.coral : s.stroke, width: hi ? 4 : width });

function nucleus(cx, cy, rx, ry, hi) {
  const s = STYLE.nucleus, a = shapeAttrs(s, hi, 2.4);
  let d = ellipse(cx, cy, rx, ry, { ...a, dash: '22 5' }).replace('<ellipse', '<ellipse class="cell-shape"');
  d += ellipse(cx, cy, rx - 6, ry - 6, { fill: 'none', stroke: hi ? C.coral : s.stroke, width: 1.4, opacity: 0.7 });
  // chromatin threads
  const w = rx * 0.55, h = ry * 0.5, k = rx / 78;
  d += path(`M ${r1(cx - w)} ${r1(cy - h * 0.1)} c ${14 * k} -18 ${26 * k} 10 ${40 * k} -6 s ${22 * k} -22 ${38 * k} -4 s ${12 * k} 20 ${28 * k} 8`, { stroke: hi ? C.coral : s.stroke, width: 1.8, opacity: 0.55 });
  d += path(`M ${r1(cx - w + 6)} ${r1(cy + h * 0.85)} c ${16 * k} -14 ${24 * k} 12 ${42 * k} 0 s ${20 * k} -16 ${36 * k} -2`, { stroke: hi ? C.coral : s.stroke, width: 1.8, opacity: 0.55 });
  d += circle(r1(cx + rx * 0.3), r1(cy + ry * 0.28), r1(Math.min(rx, ry) * 0.24), { fill: hi ? C.coral : s.stroke, stroke: 'none', width: 0, opacity: 0.55 });
  return d;
}
function mitochondrion(cx, cy, rx, ry, rot, hi) {
  const s = STYLE.mitochondrion, a = shapeAttrs(s, hi);
  const irx = rx - 5, iry = ry - 5;
  let d = ellipse(0, 0, rx, ry, a).replace('<ellipse', '<ellipse class="cell-shape"');
  d += ellipse(0, 0, irx, iry, { fill: 'none', stroke: hi ? C.coral : s.stroke, width: 1.2, opacity: 0.8 });
  const n = Math.max(3, Math.round(rx / 11));
  for (let i = 0; i < n; i++) {
    const x = -irx + (i + 1) * (2 * irx) / (n + 1), edge = iry * Math.sqrt(Math.max(0, 1 - (x / irx) ** 2)), depth = iry * 0.65;
    const top = i % 2 === 0;
    const y0 = top ? -edge : edge, y1 = top ? -edge + depth : edge - depth, sweep = top ? 0 : 1;
    d += path(`M ${r1(x - 3)} ${r1(y0)} L ${r1(x - 3)} ${r1(y1)} A 3 3 0 0 ${sweep} ${r1(x + 3)} ${r1(y1)} L ${r1(x + 3)} ${r1(y0)}`, { stroke: hi ? C.coral : s.stroke, width: 1.5 });
  }
  return group(d, { transform: `translate(${cx} ${cy}) rotate(${rot})` });
}
function chloroplast(cx, cy, rx, ry, rot, hi) {
  const s = STYLE.chloroplast, a = shapeAttrs(s, hi);
  let d = ellipse(0, 0, rx, ry, a).replace('<ellipse', '<ellipse class="cell-shape"');
  d += ellipse(0, 0, rx - 5, ry - 5, { fill: 'none', stroke: hi ? C.coral : s.stroke, width: 1.2, opacity: 0.8 });
  const stacks = [-rx * 0.5, -rx * 0.05, rx * 0.42];
  const ink = hi ? '#c9582a' : C.leafDark;
  stacks.forEach((x, i) => {
    const y = i % 2 === 0 ? -1 : 2, count = 4;
    for (let k = 0; k < count; k++) d += rect(x - 7, y - 7 + k * 4, 14, 2.6, { fill: ink, stroke: 'none', width: 0, rx: 1.3 });
    if (i < stacks.length - 1) d += line(x + 7, y, stacks[i + 1] - 7, i % 2 === 0 ? 4 : 1, { color: ink, width: 1.2, opacity: 0.8 });
  });
  return group(d, { transform: `translate(${cx} ${cy}) rotate(${rot})` });
}
function golgi(cx, cy, hi) {
  const s = STYLE['golgi-apparatus'], stroke = hi ? C.coral : s.stroke, fill = hi ? C.hi : s.fill;
  let d = '';
  const layers = 5;
  for (let i = 0; i < layers; i++) {
    const w = 52 + i * 7, y = cy - 22 + i * 11, x0 = cx - w / 2, x1 = cx + w / 2, bow = 6 + i * 1.2;
    d += path(`M ${x0} ${y} C ${x0 + w * 0.25} ${y - bow} ${x1 - w * 0.25} ${y - bow} ${x1} ${y} C ${x1 - w * 0.25} ${y + 4.5} ${x0 + w * 0.25} ${y + 4.5} ${x0} ${y} Z`, { fill, stroke, width: hi ? 3 : 1.8 }).replace('<path', `<path class="${i === layers - 1 ? 'cell-shape' : ''}"`);
  }
  // vesicles: two arriving at the cis face (top), three budding from the trans face (bottom)
  [[cx - 20, cy - 34], [cx + 16, cy - 36]].forEach(([x, y]) => { d += circle(x, y, 4, { fill, stroke, width: 1.6 }); });
  [[cx - 36, cy + 34], [cx - 4, cy + 38], [cx + 30, cy + 36]].forEach(([x, y]) => { d += circle(x, y, 4.5, { fill, stroke, width: 1.6 }); });
  return d;
}
function lysosome(cx, cy, r, hi) {
  const s = STYLE.lysosome, a = shapeAttrs(s, hi, 2);
  let d = circle(cx, cy, r, a).replace('<circle', '<circle class="cell-shape"');
  [[-0.4, -0.3], [0.3, -0.35], [-0.1, 0.15], [0.4, 0.3], [-0.45, 0.35]].forEach(([dx, dy]) => { d += circle(r1(cx + dx * r), r1(cy + dy * r), 1.8, { fill: hi ? C.coral : s.stroke, stroke: 'none', width: 0, opacity: 0.75 }); });
  return d;
}
function ribosomes(cx, cy, hi) {
  const fill = hi ? C.coral : C.ink;
  const pts = [[-18, -10], [-6, -16], [8, -12], [19, -4], [14, 8], [2, 14], [-11, 12], [-20, 3], [-4, -2], [7, 2]];
  let d = circle(cx, cy, 30, { fill: 'transparent', stroke: 'none', width: 0 });
  if (hi) d += circle(cx, cy, 28, { fill: C.hi, stroke: C.coral, width: 4, dash: '4 6' }).replace('<circle', '<circle class="cell-shape"');
  pts.forEach(([dx, dy]) => { d += circle(cx + dx, cy + dy, 2.6, { fill, stroke: 'none', width: 0, opacity: 0.9 }); });
  // a polysome: several ribosomes threaded on one mRNA. The strand is two cubic segments (the second mirrors the
  // first's control point, as the path's "s" command does); each ribosome sits on the curve at parameter t.
  const x0 = cx - 36, y0 = cy + 28;
  const segs = [[[0, 0], [12, -8], [24, 8], [36, 0]], [[36, 0], [48, -8], [58, -8], [70, 0]]];
  const bez = (t, [p0, p1, p2, p3]) => [0, 1].map(i => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t * t * p2[i] + t ** 3 * p3[i]);
  d += path(`M ${x0} ${y0} c 12 -8 24 8 36 0 s 22 -8 34 0`, { stroke: hi ? C.coral : C.sky, width: 1.2, opacity: 0.8 });
  segs.forEach(seg => [0.18, 0.5, 0.82].forEach(t => { const [x, y] = bez(t, seg); d += circle(r1(x0 + x), r1(y0 + y), 2.6, { fill, stroke: 'none', width: 0, opacity: 0.9 }); }));
  return d;
}
/** Rough ER: concentric arcs around the nucleus, studded with ribosomes, joined to the nuclear envelope. */
function roughER(cx, cy, rx, ry, a0, a1, layers, hi, connectAt) {
  const s = STYLE['endoplasmic-reticulum'], stroke = hi ? C.coral : s.stroke;
  let d = '';
  for (let k = 1; k <= layers; k++) {
    const RX = rx + 13 * k, RY = ry + 11 * k;
    d += path(arc(cx, cy, RX, RY, a0, a1), { stroke, width: hi ? 3.5 : 2.4 }).replace('<path', `<path class="${k === layers ? 'cell-shape' : ''}"`);
    for (let a = a0 + 6, i = 0; a < a1; a += 9, i++) {
      const side = i % 2 === 0 ? 4 : -4;
      const [x, y] = ept(cx, cy, RX + side, RY + side * RY / RX, a);
      d += circle(r1(x), r1(y), 2.3, { fill: hi ? C.coral : C.ink, stroke: 'none', width: 0, opacity: 0.85 });
    }
  }
  if (connectAt !== undefined) { const [x0, y0] = ept(cx, cy, rx, ry, connectAt), [x1, y1] = ept(cx, cy, rx + 13, ry + 11, connectAt); d += line(r1(x0), r1(y0), r1(x1), r1(y1), { color: stroke, width: 2 }); }
  return d;
}
function smoothER(paths, hi) {
  const stroke = hi ? C.coral : STYLE['endoplasmic-reticulum'].stroke;
  return paths.map(p => path(p, { stroke, width: hi ? 3.2 : 2.4 })).join('');
}
function centrioles(cx, cy) {
  const s = STYLE.extra;
  const tube = (x, y, w, h) => rect(x, y, w, h, { fill: C.white, stroke: C.ink, width: 1.6, rx: 2 }) + [0.3, 0.5, 0.7].map(f => w > h ? line(x + 2, y + h * f, x + w - 2, y + h * f, { color: C.ink, width: 0.9, opacity: 0.6 }) : line(x + w * f, y + 2, x + w * f, y + h - 2, { color: C.ink, width: 0.9, opacity: 0.6 })).join('');
  return group(tube(cx - 16, cy - 4, 26, 9) + tube(cx + 12, cy - 12, 9, 26), { 'data-extra': 'centrioles' }) + circle(cx + 4, cy + 2, 0, { fill: s.fill, stroke: 'none', width: 0 });
}
function label(n, name, x, y, color, hi, opts = {}) {
  const tx = opts.tx ?? (opts.side === 'left' ? x - 17 : x + 17), ty = opts.ty ?? y + 4.5, anchor = opts.side === 'left' ? 'end' : 'start';
  let d = '';
  if (opts.lead) d += line(x, y, opts.lead[0], opts.lead[1], { color: hi ? C.coral : color, width: 1.4, opacity: 0.9 });
  if (hi) {
    const w = Math.round(name.length * 7.8 + 20), rx0 = anchor === 'end' ? tx - w + 9 : tx - 9;
    d += rect(rx0, ty - 16, w, 24, { fill: C.coral, stroke: C.white, width: 1.5, rx: 12 });
    d += text(tx, ty, name, { color: C.white, size: 13.5, weight: 700, anchor, cls: 'cell-callout' });
    d += circle(x, y, 12, { fill: C.coral, stroke: C.white, width: 2 });
    d += text(x, y + 4.5, String(n), { color: C.white, size: 12.5, weight: 700 });
  } else {
    d += circle(x, y, 11, { fill: C.white, stroke: color, width: 2 });
    d += text(x, y + 4.2, String(n), { color: C.ink, size: 12, weight: 700 });
    d += text(tx, ty, name, { color: C.ink, size: 13, weight: 600, anchor, cls: 'cell-name' });
  }
  return group(d, { class: 'cell-label' });
}
const link = (slug, title, inner, hi) => `<a href="/cells/${slug}/" data-organelle="${slug}"${hi ? ' data-highlight="true"' : ''} aria-label="${title}: open the atlas page"><title>${title}</title>${inner}</a>`;
/**
 * Quiz pointer: a numbered badge at `at`, a leader line to `tip` (a point on the structure itself) ending in a dot, and
 * the structure's name beside the badge. With no `tip` the badge sits on the structure. The name is in the markup but
 * hidden by LabelQuiz.astro's CSS until the pointer is revealed.
 */
function pointer({ n, id, name, at, tip, side = 'right', tx }) {
  const [x, y] = at, anchor = side === 'left' ? 'end' : 'start';
  let d = '';
  if (tip) d += line(x, y, tip[0], tip[1], { color: C.ink, width: 1.6 }).replace('<line', '<line class="cell-pointer-line"') + circle(tip[0], tip[1], 3.2, { fill: C.ink, stroke: C.white, width: 1 }).replace('<circle', '<circle class="cell-pointer-tip"');
  d += circle(x, y, 12, { fill: C.white, stroke: C.ink, width: 2 }).replace('<circle', '<circle class="cell-pointer-badge"');
  d += text(x, y + 4.6, String(n), { color: C.ink, size: 13, weight: 700, cls: 'cell-pointer-number' });
  d += text(tx ?? (side === 'left' ? x - 18 : x + 18), y + 4.6, name, { color: C.ink, size: 13, weight: 600, anchor, cls: 'cell-pointer-name' });
  return group(d, { class: 'cell-pointer', 'data-pointer': n, 'data-structure': id, 'data-tip': (tip || at).join(',') });
}

/**
 * Draw one reference cell. Returns SVG inner markup plus the numbered key that goes under it.
 * With `pointers: true` the organelles are plain groups (`data-structure`), the atlas labels are replaced by quiz
 * pointers drawn on top, and `pointers` lists them: [{ n, id, name, at, tip }], numbered like the atlas key.
 */
export function drawCell(kind, { highlight, pointers = false } = {}) {
  const cell = cellTypes[kind] || cellTypes.animal;
  const items = [], marks = [];
  let n = 0;
  const parts = [];
  const hi = slug => !pointers && highlight === slug;
  // Each structure: its drawing, the atlas label (x, y, color, options) and the quiz pointer (badge position, tip, name side).
  const add = (slug, name, art, atlas, quiz) => {
    n += 1; const o = organelles[slug]; items.push({ n, slug, name: o.title, note: o.type, color: STYLE[slug].stroke });
    if (pointers) { parts.push(group(art, { 'data-structure': slug })); marks.push({ n, id: slug, name, ...quiz }); }
    else parts.push(link(slug, o.title, art + label(n, name, atlas[0], atlas[1], atlas[2], hi(slug), atlas[3]), hi(slug)));
  };
  const addExtra = ([name, note, short], art, atlas, quiz) => {
    n += 1; items.push({ n, slug: null, name, note: short || note.split(/[;,]/)[0], color: '#9bb4a4' });
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (pointers) { parts.push(group(art, { 'data-structure': id })); marks.push({ n, id, name, ...quiz }); }
    else parts.push(group(art + label(n, name, atlas[0], atlas[1], atlas[2], false, atlas[3]), { 'data-extra': id }));
  };
  const membrane = d => {
    const h = hi('cell-membrane');
    return path(d, { fill: 'none', stroke: 'transparent', width: 18 }) + path(d, { fill: 'none', stroke: h ? C.coral : C.ink, width: h ? 6 : 4.5 }).replace('<path', '<path class="cell-shape"') + path(d, { fill: 'none', stroke: h ? C.hi : C.cream, width: 1.4, opacity: 0.9 });
  };
  const cytoplasm = kind === 'plant' ? '#fbf7ea' : '#fff8e8';
  if (kind === 'plant') {
    const wallD = 'M 60 86 Q 60 40 106 40 L 554 40 Q 600 40 600 86 L 600 374 Q 600 420 554 420 L 106 420 Q 60 420 60 374 Z';
    const memD = 'M 74 90 Q 74 54 110 54 L 550 54 Q 586 54 586 90 L 586 370 Q 586 406 550 406 L 110 406 Q 74 406 74 370 Z';
    parts.push(path(wallD, { fill: '#e9f3ea', stroke: 'none', width: 0 }));
    parts.push(path(memD, { fill: cytoplasm, stroke: 'none', width: 0 }));
    // central vacuole sits behind everything else; its caption would give the answer away in the quiz
    const vacD = 'M 240 240 C 240 176 302 140 380 140 C 458 140 520 176 520 240 C 520 304 458 340 380 340 C 302 340 240 304 240 240 Z';
    const vacInner = path(vacD, { fill: C.sky, stroke: 'none', width: 0, opacity: 0.18 }) + path(vacD, { fill: 'none', stroke: C.sky, width: 2 }) + (pointers ? '' : text(380, 254, 'stores water, ions, pigments and waste', { color: C.skyDark, size: 12, weight: 500 }));
    add('nucleus', 'Nucleus', nucleus(175, 244, 56, 50, hi('nucleus')), [146, 222, C.plum], { at: [150, 226] });
    add('mitochondrion', 'Mitochondrion', mitochondrion(400, 378, 40, 17, 4, hi('mitochondrion')) + mitochondrion(558, 312, 32, 14, 84, hi('mitochondrion')), [458, 372, C.amber], { at: [470, 376], tip: [428, 380] });
    add('chloroplast', 'Chloroplast', chloroplast(334, 84, 44, 20, -6, hi('chloroplast')) + chloroplast(466, 110, 44, 20, 5, hi('chloroplast')) + chloroplast(558, 214, 42, 19, 84, hi('chloroplast')), [322, 122, C.leaf], { at: [318, 128], tip: [332, 90] });
    add('ribosome', 'Ribosomes', ribosomes(548, 100, hi('ribosome')), [536, 76, C.ink, { side: 'left' }], { at: [512, 70], tip: [530, 90], side: 'left' });
    add('endoplasmic-reticulum', 'Endoplasmic reticulum', roughER(175, 244, 56, 50, 205, 300, 2, hi('endoplasmic-reticulum'), 300) + smoothER(['M 112 166 C 100 140 128 128 116 104 S 150 96 172 106', 'M 130 150 C 150 140 160 160 182 148 S 212 124 236 138', 'M 160 122 C 176 110 190 126 208 112 S 232 98 248 110'], hi('endoplasmic-reticulum')), [116, 78, C.sky], { at: [104, 74], tip: [131.2, 92.2] });
    add('golgi-apparatus', 'Golgi apparatus', golgi(186, 350, hi('golgi-apparatus')), [244, 352, C.skyDark], { at: [244, 352], tip: [213, 349.5] });
    add('cell-membrane', 'Cell membrane', membrane(memD), [586, 150, C.ink, { tx: 602 }], { at: [548, 154], tip: [586, 154], tx: 612 });
    addExtra(cell.extras[0], path(wallD, { fill: 'none', stroke: C.leafDark, width: 10, opacity: 0.85 }) + path(wallD, { fill: 'none', stroke: C.leafLight, width: 2, dash: '10 8', opacity: 0.9 }), [600, 250, C.leafDark, { tx: 616 }], { at: [634, 250], tip: [600, 250] });
    addExtra(cell.extras[1], vacInner, [300, 176, C.skyDark], { at: [300, 176] });
    // the vacuole must sit under the organelles: move it to the front of the list, after the backgrounds
    const vac = parts.pop(); parts.splice(2, 0, vac);
  } else {
    const memD = 'M 92 236 C 92 132 196 62 340 60 C 478 58 598 122 600 224 C 602 320 506 404 356 408 C 206 412 92 344 92 236 Z';
    parts.push(path(memD, { fill: cytoplasm, stroke: 'none', width: 0 }));
    add('nucleus', 'Nucleus', nucleus(250, 218, 78, 68, hi('nucleus')), [208, 178, C.plum], { at: [224, 186] });
    add('mitochondrion', 'Mitochondrion', mitochondrion(505, 340, 50, 22, -20, hi('mitochondrion')) + mitochondrion(285, 96, 34, 15, -8, hi('mitochondrion')), [548, 296, C.amber, { side: 'left' }], { at: [548, 296], tip: [522, 328], side: 'left' });
    add('ribosome', 'Ribosomes', ribosomes(473, 118, hi('ribosome')), [432, 100, C.ink, { side: 'left' }], { at: [432, 100], tip: [467, 102], side: 'left' });
    add('endoplasmic-reticulum', 'Endoplasmic reticulum', roughER(250, 218, 78, 68, 118, 250, 3, hi('endoplasmic-reticulum'), 250) + smoothER(['M 158 306 C 150 330 172 340 160 366 S 196 386 214 372', 'M 176 318 C 196 330 188 352 212 356 S 244 346 258 366', 'M 196 300 C 222 306 226 330 250 328 S 270 342 280 326'], hi('endoplasmic-reticulum')), [232, 372, C.sky], { at: [84, 44], tip: ept(250, 218, 117, 101, 228).map(r1) });
    add('golgi-apparatus', 'Golgi apparatus', golgi(410, 186, hi('golgi-apparatus')), [346, 258, C.skyDark], { at: [346, 258], tip: [373, 208] });
    add('lysosome', 'Lysosome', lysosome(392, 296, 15, hi('lysosome')) + lysosome(338, 126, 12, hi('lysosome')) + lysosome(488, 270, 11, hi('lysosome')), [372, 326, '#c9582a'], { at: [366, 340], tip: [392, 296] });
    add('cell-membrane', 'Cell membrane', membrane(memD), [440, 397, C.ink], { at: [484, 420], tip: [457.7, 391] });
    addExtra(cell.extras[0], centrioles(556, 246), [538, 216, C.ink, { side: 'left' }], { at: [538, 216], tip: [553, 246.5], side: 'left' });
  }
  if (pointers) parts.push(...marks.map(pointer));
  return { svg: parts.join(''), items, pointers: marks.map(({ n, id, name, at, tip }) => ({ n, id, name, at, tip: tip || at })) };
}
