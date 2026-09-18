// Shared formatting, validation, and palette helpers used by calculators, diagrams, and pages.
export const fmt = (n, digits = 3) => Math.abs(n) < 1e-10 ? '0' : Number(n.toFixed(digits)).toLocaleString('en-US', { maximumFractionDigits: digits });
export const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
export const pct = (fraction, digits = 1) => fmt(fraction * 100, digits) + '%';
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const positive = (values, max = 1e9) => { if (values.some(n => !Number.isFinite(n) || n <= 0 || n > max)) throw new Error(`Enter positive, finite values no greater than ${max.toLocaleString('en-US')}.`); };
export const nonNegative = (values, max = 1e9) => { if (values.some(n => !Number.isFinite(n) || n < 0 || n > max)) throw new Error(`Enter values from 0 to ${max.toLocaleString('en-US')}.`); };
export const wholeNumbers = values => { if (values.some(n => !Number.isInteger(n))) throw new Error('Use whole numbers for counts.'); };
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
/** Reduce a list of counts to a simplified ratio string, e.g. [9,3,3,1] -> "9 : 3 : 3 : 1". */
export const ratio = counts => { const g = counts.reduce((acc, n) => gcd(acc, n), 0) || 1; return counts.map(n => n / g).join(' : '); };
// Diagram colors shared by every SVG so the site reads as one system.
export const palette = {
  ink: '#173226', muted: '#5b6b62', leaf: '#2f8a5b', leafDark: '#226b45', leafLight: '#8fcfa5',
  coral: '#e2703a', coralDark: '#c9582a', sun: '#f6c453', sky: '#4b86b4', skyLight: '#a9c6de',
  plum: '#7b4b8a', line: '#d9e2da', grid: '#dfe8e0', mint: '#e6f2e8', cream: '#fff3d6', paper: '#fffdf7', white: '#ffffff',
};
