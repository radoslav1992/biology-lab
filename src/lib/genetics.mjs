// Genetics helpers: Punnett squares (1–3 genes, complete dominance), ABO/Rh blood-type crosses,
// Hardy-Weinberg equilibrium, and the chi-square goodness-of-fit test. Pure functions, no DOM.
import { fmt, ratio, wholeNumbers, nonNegative } from './format.mjs';

const MAX_LOCI = 3;
const isUpper = ch => ch === ch.toUpperCase();
// Write the dominant (uppercase) allele first: aA -> Aa, aa -> aa, AA -> AA.
const orderPair = (a, b) => (a === b || isUpper(a)) ? a + b : b + a;
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Parse "Aa", "AaBb", "aaBbCC" into loci [[allele1, allele2], ...] exactly as typed. Throws friendly errors. */
export function parseGenotype(input) {
  if (typeof input !== 'string') throw new Error('Type a genotype such as Aa or AaBb.');
  const s = input.replace(/\s+/g, '');
  if (!s) throw new Error('Type a genotype such as Aa or AaBb.');
  if (!/^[A-Za-z]+$/.test(s)) throw new Error('Genotypes use letters only: an uppercase letter for a dominant allele and the same letter in lowercase for a recessive allele (Aa, AaBb).');
  if (s.length % 2) throw new Error('Each gene needs two alleles, so a genotype has an even number of letters (Aa, AaBb, AaBbCc).');
  if (s.length / 2 > MAX_LOCI) throw new Error('This calculator handles one to three genes, so use at most six letters (for example AaBbCc).');
  const loci = [], seen = new Set();
  for (let i = 0; i < s.length; i += 2) {
    const a = s[i], b = s[i + 1];
    if (a.toUpperCase() !== b.toUpperCase()) throw new Error(`"${a}${b}" mixes two different genes. Write both alleles of one gene with the same letter, like Aa or BB, before moving to the next gene.`);
    const key = a.toUpperCase();
    if (seen.has(key)) throw new Error(`The letter ${key} is used for two genes. Give every gene its own letter (AaBb, not AaAa).`);
    seen.add(key);
    loci.push([a, b]);
  }
  return loci;
}

// Loci sorted alphabetically by gene letter, dominant allele written first within each locus.
function normalizedLoci(genotype) {
  const loci = Array.isArray(genotype) ? genotype : parseGenotype(genotype);
  return loci.map(([a, b]) => orderPair(a, b).split('')).sort((x, y) => x[0].toUpperCase() < y[0].toUpperCase() ? -1 : 1);
}

/** Canonical spelling: gene letters in alphabetical order, dominant allele first ("bBaA" -> "AaBb"). */
export const normalizeGenotype = genotype => normalizedLoci(genotype).map(l => l.join('')).join('');

/** Gene letters (uppercase) of a genotype in canonical order, e.g. "AaBb" -> ["A", "B"]. */
export const geneLetters = genotype => normalizedLoci(genotype).map(l => l[0].toUpperCase());

/** Every gamete a parent can make, one entry per allele combination (2ⁿ entries, repeats kept): "AABb" -> ["AB","Ab","AB","Ab"]. */
export function gameteList(genotype) {
  return normalizedLoci(genotype).reduce((acc, [a, b]) => acc.flatMap(g => [g + a, g + b]), ['']);
}

/** Unique gametes in a stable order: "AaBb" -> ["AB", "Ab", "aB", "ab"], "AABb" -> ["AB", "Ab"]. */
export const gametes = genotype => [...new Set(gameteList(genotype))];

const combineGametes = (g1, g2) => g1.split('').map((a, i) => orderPair(a, g2[i])).join('');

/** "D" for a locus showing the dominant trait, "r" for recessive, per gene: "AaBb" -> "DD", "Aabb" -> "Dr". */
export const phenotypeKey = genotype => normalizedLoci(genotype).map(([a]) => isUpper(a) ? 'D' : 'r').join('');

const normalizeTraits = (traits = {}) => Object.fromEntries(Object.entries(traits).map(([k, v]) => [String(k).toUpperCase(), v || {}]));

/** Human label for a phenotype key. Default "Dominant A, recessive b"; with traits {A:{dominant:'Purple',recessive:'White'}} -> "Purple". */
export function phenotypeLabel(key, letters, traits = {}) {
  const t = normalizeTraits(traits);
  const parts = key.split('').map((k, i) => {
    const L = letters[i], trait = t[L] || {};
    const dom = String(trait.dominant ?? '').trim(), rec = String(trait.recessive ?? '').trim();
    return k === 'D' ? (dom || `dominant ${L}`) : (rec || `recessive ${L.toLowerCase()}`);
  });
  return capitalize(parts.join(', '));
}

/** Phenotype label of a single genotype under complete dominance. */
export const phenotypeOf = (genotype, traits = {}) => phenotypeLabel(phenotypeKey(genotype), geneLetters(genotype), traits);

function tally(grid, classify) {
  const counts = new Map();
  for (const row of grid) for (const cell of row) counts.set(cell, (counts.get(cell) || 0) + 1);
  const boxes = grid.length * (grid[0]?.length || 0);
  const genotypes = [...counts.keys()].sort().map(genotype => ({ genotype, count: counts.get(genotype), fraction: counts.get(genotype) / boxes }));
  const classes = new Map();
  for (const g of genotypes) {
    const c = classify(g.genotype);
    if (!classes.has(c.key)) classes.set(c.key, { ...c, count: 0, fraction: 0, genotypes: [] });
    const entry = classes.get(c.key);
    entry.count += g.count; entry.genotypes.push(g.genotype);
  }
  const phenotypes = [...classes.values()].sort((a, b) => a.order - b.order).map(p => ({ ...p, fraction: p.count / boxes }));
  return { boxes, genotypes, phenotypes, genotypeRatio: ratio(genotypes.map(g => g.count)), phenotypeRatio: ratio(phenotypes.map(p => p.count)) };
}

/**
 * Cross two parents with the same genes under complete dominance.
 * Rows are parent 1 gametes, columns are parent 2 gametes, so a monohybrid cross always has 4 boxes and a dihybrid cross 16,
 * exactly as the square is drawn by hand. Pass {unique:true} to collapse repeated gametes of homozygous parents.
 * traits: {A:{dominant:'Purple', recessive:'White'}} names the phenotypes; otherwise labels read "Dominant A" / "Recessive a".
 */
export function punnett(parent1, parent2, traits = {}, { unique = false } = {}) {
  const letters1 = geneLetters(parent1), letters2 = geneLetters(parent2);
  if (letters1.join('') !== letters2.join('')) throw new Error(`Both parents must carry the same genes. Parent 1 uses ${letters1.join(', ')} and parent 2 uses ${letters2.join(', ')}. Use the same letters, for example AaBb × aaBb.`);
  const letters = letters1, n = letters.length;
  const gametes1 = unique ? gametes(parent1) : gameteList(parent1);
  const gametes2 = unique ? gametes(parent2) : gameteList(parent2);
  const grid = gametes1.map(g1 => gametes2.map(g2 => combineGametes(g1, g2)));
  const classify = genotype => {
    const key = phenotypeKey(genotype);
    // Sort order: all-dominant first, all-recessive last (9 : 3 : 3 : 1 order for a dihybrid cross).
    return { key, phenotype: phenotypeLabel(key, letters, traits), order: parseInt(key.replace(/D/g, '0').replace(/r/g, '1'), 2) };
  };
  const result = tally(grid, classify);
  const recessive = result.phenotypes.find(p => p.key === 'r'.repeat(n));
  return {
    parent1: normalizeGenotype(parent1), parent2: normalizeGenotype(parent2), letters, loci: n,
    gametes1, gametes2, uniqueGametes1: gametes(parent1), uniqueGametes2: gametes(parent2), grid,
    ...result,
    recessiveFraction: recessive ? recessive.fraction : 0,
    dominantFraction: 1 - (recessive ? recessive.fraction : 0),
  };
}

// ---------- ABO / Rh blood types ----------
export const ABO_GENOTYPES = ['AA', 'AO', 'BB', 'BO', 'AB', 'OO'];
export const RH_GENOTYPES = ['DD', 'Dd', 'dd'];
const ABO_ORDER = { A: 0, B: 1, O: 2 };
const orderAbo = s => s.split('').sort((a, b) => ABO_ORDER[a] - ABO_ORDER[b]).join('');

export function normalizeAbo(genotype) {
  const s = String(genotype ?? '').replace(/\s+/g, '').toUpperCase().replace(/I/g, '');
  if (!/^[ABO]{2}$/.test(s)) throw new Error('Choose an ABO genotype: AA, AO, BB, BO, AB, or OO.');
  return orderAbo(s);
}
export function normalizeRh(genotype) {
  const s = String(genotype ?? '').replace(/\s+/g, '');
  if (!/^[Dd]{2}$/.test(s)) throw new Error('Choose an Rh genotype: DD, Dd, or dd.');
  return orderPair(s[0], s[1]);
}
/** ABO phenotype of a genotype: AA/AO -> A, BB/BO -> B, AB -> AB, OO -> O (Iᴬ and Iᴮ are codominant, i is recessive). */
export const aboPhenotype = genotype => { const g = normalizeAbo(genotype); return g === 'OO' ? 'O' : g === 'AB' ? 'AB' : g[0]; };
/** Rh phenotype: any D allele gives Rh-positive. */
export const rhPhenotype = genotype => normalizeRh(genotype).includes('D') ? '+' : '-';

/**
 * Cross two parents by ABO genotype and, optionally, Rh genotype (DD, Dd, dd).
 * Cells read "AO" or "AO Dd"; phenotypes are "A", "B", "AB", "O" or "A+", "A-", ... when Rh is included.
 */
export function bloodTypeCross(abo1, abo2, rh1, rh2) {
  const a1 = normalizeAbo(abo1), a2 = normalizeAbo(abo2);
  const includesRh = rh1 != null || rh2 != null;
  if (includesRh && (rh1 == null || rh2 == null)) throw new Error('Choose an Rh genotype for both parents, or leave both blank.');
  const r1 = includesRh ? normalizeRh(rh1) : null, r2 = includesRh ? normalizeRh(rh2) : null;
  const gam = (abo, rh) => includesRh ? abo.split('').flatMap(x => rh.split('').map(y => x + ' ' + y)) : abo.split('');
  const gametes1 = gam(a1, r1), gametes2 = gam(a2, r2);
  const combine = (g1, g2) => {
    const [x1, y1] = g1.split(' '), [x2, y2] = g2.split(' ');
    return orderAbo(x1 + x2) + (includesRh ? ' ' + orderPair(y1, y2) : '');
  };
  const grid = gametes1.map(g1 => gametes2.map(g2 => combine(g1, g2)));
  const ABO_PHENO_ORDER = ['A', 'B', 'AB', 'O'];
  const classify = genotype => {
    const [abo, rh] = genotype.split(' ');
    const aboP = aboPhenotype(abo), rhP = includesRh ? rhPhenotype(rh) : '';
    return { key: aboP + rhP, phenotype: aboP + rhP, abo: aboP, rh: rhP, order: ABO_PHENO_ORDER.indexOf(aboP) * 2 + (rhP === '-' ? 1 : 0) };
  };
  const result = tally(grid, classify);
  const typeO = result.phenotypes.filter(p => p.abo === 'O').reduce((s, p) => s + p.fraction, 0);
  return { parent1: a1 + (includesRh ? ' ' + r1 : ''), parent2: a2 + (includesRh ? ' ' + r2 : ''), abo1: a1, abo2: a2, rh1: r1, rh2: r2, includesRh, gametes1, gametes2, uniqueGametes1: [...new Set(gametes1)], uniqueGametes2: [...new Set(gametes2)], grid, ...result, typeOFraction: typeO };
}

// ---------- Chi-square ----------
/** Upper-tail critical values of the chi-square distribution at α = 0.05, indexed by degrees of freedom. */
export const CHI_SQUARE_CRITICAL = { 1: 3.841, 2: 5.991, 3: 7.815, 4: 9.488, 5: 11.070, 6: 12.592, 7: 14.067, 8: 15.507, 9: 16.919 };

// Lanczos approximation of ln Γ(x), accurate to ~1e-15 for x > 0.
function lnGamma(x) {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
// Regularized lower incomplete gamma P(a, x) by series (x < a + 1) or continued fraction.
function gammaP(a, x) {
  if (x <= 0) return 0;
  const prefix = Math.exp(-x + a * Math.log(x) - lnGamma(a));
  if (x < a + 1) {
    let term = 1 / a, sum = term;
    for (let n = 1; n < 1000; n++) { term *= x / (a + n); sum += term; if (Math.abs(term) < Math.abs(sum) * 1e-16) break; }
    return sum * prefix;
  }
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return 1 - prefix * h;
}
/** Probability of a chi-square statistic at least this large under the null hypothesis (upper-tail p-value). */
export function chiSquarePValue(chi2, df) {
  if (!Number.isFinite(chi2) || chi2 < 0 || !Number.isInteger(df) || df < 1) throw new Error('The p-value needs χ² ≥ 0 and a whole number of degrees of freedom.');
  return Math.min(1, Math.max(0, 1 - gammaP(df / 2, chi2 / 2)));
}

/**
 * Chi-square goodness-of-fit test of observed counts against an expected ratio such as [3, 1] or [9, 3, 3, 1].
 * Uses α = 0.05 and df = categories − 1. Returns expected counts, each (O − E)²/E term, χ², df, critical value, p-value, and a verdict.
 */
export function chiSquare(observed, expectedRatio) {
  if (!Array.isArray(observed) || !Array.isArray(expectedRatio) || observed.length < 2) throw new Error('Provide at least two observed counts and a matching expected ratio.');
  if (observed.length !== expectedRatio.length) throw new Error(`The ratio has ${expectedRatio.length} parts but ${observed.length} observed counts were given.`);
  nonNegative(observed, 1e9);
  wholeNumbers(observed);
  if (expectedRatio.some(r => !Number.isFinite(r) || r <= 0)) throw new Error('Every part of the expected ratio must be a positive number.');
  const total = observed.reduce((s, n) => s + n, 0);
  if (total <= 0) throw new Error('Enter at least one observed count greater than zero.');
  const df = observed.length - 1;
  const critical = CHI_SQUARE_CRITICAL[df];
  if (!critical) throw new Error('This test supports up to 10 categories (df ≤ 9).');
  const ratioSum = expectedRatio.reduce((s, r) => s + r, 0);
  const expected = expectedRatio.map(r => total * r / ratioSum);
  const contributions = observed.map((o, i) => (o - expected[i]) ** 2 / expected[i]);
  const chi2 = contributions.reduce((s, c) => s + c, 0);
  const reject = chi2 > critical;
  const pValue = chiSquarePValue(chi2, df);
  const label = ratio(expectedRatio);
  const verdict = reject
    ? `χ² = ${fmt(chi2, 3)} is greater than the critical value ${fmt(critical, 3)} (df = ${df}, α = 0.05), so the observed counts differ significantly from a ${label} ratio. Reject the hypothesis.`
    : `χ² = ${fmt(chi2, 3)} does not exceed the critical value ${fmt(critical, 3)} (df = ${df}, α = 0.05), so the deviation from a ${label} ratio is what chance alone could produce. Do not reject the hypothesis.`;
  return { observed: [...observed], expectedRatio: [...expectedRatio], ratioLabel: label, total, expected, contributions, chi2, df, critical, pValue, reject, verdict };
}

// ---------- Hardy-Weinberg ----------
const unitFraction = (value, name) => { if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${name} must be a number from 0 to 1.`); };

/**
 * Hardy-Weinberg allele and genotype frequencies from one of: {p}, {q}, {q2}, {p2}, or {counts:{AA, Aa, aa}}.
 * With counts it also returns observed and expected counts, χ² (df = 1, critical 3.841), a p-value, and inEquilibrium.
 */
export function hardyWeinberg(input = {}) {
  let p, source, extra = {};
  if (input.counts) {
    const AA = Number(input.counts.AA), Aa = Number(input.counts.Aa), aa = Number(input.counts.aa);
    nonNegative([AA, Aa, aa], 1e9);
    wholeNumbers([AA, Aa, aa]);
    const n = AA + Aa + aa;
    if (n <= 0) throw new Error('Enter genotype counts for at least one individual.');
    p = (2 * AA + Aa) / (2 * n);
    source = 'counts';
    const q = 1 - p;
    const expected = { AA: p * p * n, Aa: 2 * p * q * n, aa: q * q * n };
    const observed = { AA, Aa, aa };
    const contributions = Object.fromEntries(['AA', 'Aa', 'aa'].map(k => [k, expected[k] > 0 ? (observed[k] - expected[k]) ** 2 / expected[k] : 0]));
    const chi = contributions.AA + contributions.Aa + contributions.aa;
    extra = { n, alleles: 2 * n, dominantAlleles: 2 * AA + Aa, recessiveAlleles: 2 * aa + Aa, observed, expected, contributions, chiSquare: chi, df: 1, critical: 3.841, pValue: chiSquarePValue(chi, 1), inEquilibrium: chi <= 3.841 };
  } else if (input.q2 !== undefined) { unitFraction(input.q2, 'q² (recessive phenotype frequency)'); p = 1 - Math.sqrt(input.q2); source = 'q2'; }
  else if (input.p2 !== undefined) { unitFraction(input.p2, 'p² (homozygous dominant frequency)'); p = Math.sqrt(input.p2); source = 'p2'; }
  else if (input.q !== undefined) { unitFraction(input.q, 'q (recessive allele frequency)'); p = 1 - input.q; source = 'q'; }
  else if (input.p !== undefined) { unitFraction(input.p, 'p (dominant allele frequency)'); p = input.p; source = 'p'; }
  else throw new Error('Provide p, q, q², or genotype counts.');
  const q = 1 - p;
  return { source, p, q, p2: p * p, twoPq: 2 * p * q, q2: q * q, dominantPhenotype: p * p + 2 * p * q, ...extra };
}
