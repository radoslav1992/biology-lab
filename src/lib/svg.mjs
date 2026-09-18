// Tiny SVG string helpers for diagrams rendered into a 720 × 520 viewBox.
import { palette, fmt } from './format.mjs';
const attrs = o => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => ` ${k}="${v}"`).join('');
export const text = (x, y, value, { color = palette.muted, size = 14, anchor = 'middle', weight = 400, cls, baseline } = {}) => `<text x="${x}" y="${y}" text-anchor="${anchor}"${cls ? ` class="${cls}"` : ''}${baseline ? ` dominant-baseline="${baseline}"` : ''} fill="${color}" style="fill:${color};font-size:${size}px;font-weight:${weight}">${value}</text>`;
export const line = (x1, y1, x2, y2, { color = palette.leaf, width = 2, dash, opacity, cap = 'round' } = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="${cap}"${dash ? ` stroke-dasharray="${dash}"` : ''}${opacity !== undefined ? ` opacity="${opacity}"` : ''}/>`;
export const rect = (x, y, w, h, { fill = palette.mint, stroke = palette.leaf, width = 2, rx = 0, opacity, dash } = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${opacity !== undefined ? ` opacity="${opacity}"` : ''}${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
export const circle = (cx, cy, r, { fill = palette.mint, stroke = palette.leaf, width = 2, opacity, dash } = {}) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${opacity !== undefined ? ` opacity="${opacity}"` : ''}${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
export const ellipse = (cx, cy, rx, ry, { fill = palette.mint, stroke = palette.leaf, width = 2, opacity, dash } = {}) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"${opacity !== undefined ? ` opacity="${opacity}"` : ''}${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
export const path = (d, { fill = 'none', stroke = palette.leaf, width = 2, dash, opacity, join = 'round', cap = 'round' } = {}) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="${join}" stroke-linecap="${cap}"${dash ? ` stroke-dasharray="${dash}"` : ''}${opacity !== undefined ? ` opacity="${opacity}"` : ''}/>`;
export const polygon = (points, { fill = palette.mint, stroke = palette.leaf, width = 2, opacity } = {}) => `<polygon points="${points.map(p => p.join(',')).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"${opacity !== undefined ? ` opacity="${opacity}"` : ''}/>`;
export const polyline = (points, { stroke = palette.leaf, width = 3, dash, opacity } = {}) => `<polyline points="${points.map(p => p.join(',')).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}${opacity !== undefined ? ` opacity="${opacity}"` : ''}/>`;
export const group = (inner, o = {}) => `<g${attrs(o)}>${inner}</g>`;
export const arrow = (x1, y1, x2, y2, { color = palette.coral, width = 2.5 } = {}) => { const a = Math.atan2(y2 - y1, x2 - x1), h = 11; return line(x1, y1, x2, y2, { color, width }) + `<path d="M ${x2} ${y2} L ${x2 - h * Math.cos(a - 0.45)} ${y2 - h * Math.sin(a - 0.45)} L ${x2 - h * Math.cos(a + 0.45)} ${y2 - h * Math.sin(a + 0.45)} Z" fill="${color}"/>`; };
/**
 * Build a plotting area with linear scales and optional grid and axis labels.
 * box: {left, top, width, height}; domain: {x:[min,max], y:[min,max]}.
 */
export function chart({ box = { left: 80, top: 40, width: 600, height: 400 }, x, y, xLabel = '', yLabel = '', xTicks = 5, yTicks = 5, xFormat = fmt, yFormat = fmt } = {}) {
  const [x0, x1] = x, [y0, y1] = y;
  const px = v => box.left + (v - x0) / ((x1 - x0) || 1) * box.width;
  const py = v => box.top + box.height - (v - y0) / ((y1 - y0) || 1) * box.height;
  let grid = '';
  for (let i = 0; i <= xTicks; i++) { const v = x0 + (x1 - x0) * i / xTicks, X = px(v); grid += line(X, box.top, X, box.top + box.height, { color: palette.grid, width: 1 }) + text(X, box.top + box.height + 22, xFormat(v), { size: 12 }); }
  for (let i = 0; i <= yTicks; i++) { const v = y0 + (y1 - y0) * i / yTicks, Y = py(v); grid += line(box.left, Y, box.left + box.width, Y, { color: palette.grid, width: 1 }) + text(box.left - 10, Y + 4, yFormat(v), { size: 12, anchor: 'end' }); }
  grid += line(box.left, box.top + box.height, box.left + box.width, box.top + box.height, { color: palette.muted, width: 1.5 }) + line(box.left, box.top, box.left, box.top + box.height, { color: palette.muted, width: 1.5 });
  if (xLabel) grid += text(box.left + box.width / 2, box.top + box.height + 46, xLabel, { size: 13, weight: 600, color: palette.ink });
  if (yLabel) grid += `<text transform="translate(${box.left - 58} ${box.top + box.height / 2}) rotate(-90)" text-anchor="middle" fill="${palette.ink}" style="fill:${palette.ink};font-size:13px;font-weight:600">${yLabel}</text>`;
  return { px, py, grid, box };
}
/** Sample a function over [a,b] into SVG-ready points using chart scales. */
export const curve = (fn, [a, b], px, py, samples = 200) => Array.from({ length: samples + 1 }, (_, i) => { const v = a + (b - a) * i / samples; return [px(v), py(fn(v))]; });
