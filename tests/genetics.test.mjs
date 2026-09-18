import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGenotype, normalizeGenotype, gametes, gameteList, punnett, bloodTypeCross, hardyWeinberg, chiSquare, chiSquarePValue, phenotypeOf, CHI_SQUARE_CRITICAL } from '../src/lib/genetics.mjs';
import { definition, explore, diagram } from '../src/lib/tools/chi-square-test.mjs';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} ≠ ${b}`);
const byName = list => Object.fromEntries(list.map(p => [p.phenotype, p]));

test('genotypes parse, normalize, and reject bad input with friendly errors', () => {
  assert.deepEqual(parseGenotype('Aa'), [['A', 'a']]);
  assert.deepEqual(parseGenotype(' aA bB '), [['a', 'A'], ['b', 'B']]);
  assert.equal(normalizeGenotype('aA'), 'Aa');
  assert.equal(normalizeGenotype('bBaA'), 'AaBb');
  assert.equal(normalizeGenotype('ccBbAA'), 'AABbcc');
  for (const bad of ['', 'A', 'Aaa', 'Ab', 'A1', 'A-a', 'AaAa', 'AaBbCcDd', 42, null]) assert.throws(() => parseGenotype(bad), Error, `should reject ${bad}`);
  assert.throws(() => parseGenotype('Ab'), /mixes two different genes/);
  assert.throws(() => parseGenotype('AaAa'), /used for two genes/);
});

test('gametes follow the law of segregation and independent assortment', () => {
  assert.deepEqual(gametes('Aa'), ['A', 'a']);
  assert.deepEqual(gametes('AA'), ['A']);
  assert.deepEqual(gametes('AaBb'), ['AB', 'Ab', 'aB', 'ab']);
  assert.deepEqual(gametes('AABb'), ['AB', 'Ab']);
  assert.deepEqual(gameteList('AABb'), ['AB', 'Ab', 'AB', 'Ab']);
  assert.equal(gametes('AaBbCc').length, 8);
  assert.equal(new Set(gametes('AaBbCc')).size, 8);
});

test('Aa x Aa gives 1:2:1 genotypes, 3:1 phenotypes, and a 25% recessive chance', () => {
  const r = punnett('Aa', 'Aa');
  assert.deepEqual(r.grid, [['AA', 'Aa'], ['Aa', 'aa']]);
  assert.equal(r.boxes, 4);
  assert.equal(r.genotypeRatio, '1 : 2 : 1');
  assert.equal(r.phenotypeRatio, '3 : 1');
  assert.deepEqual(r.genotypes.map(g => [g.genotype, g.count]), [['AA', 1], ['Aa', 2], ['aa', 1]]);
  assert.deepEqual(r.phenotypes.map(p => [p.phenotype, p.fraction]), [['Dominant A', 0.75], ['Recessive a', 0.25]]);
  close(r.recessiveFraction, 0.25);
});

test('trait names label phenotypes and classic monohybrid crosses come out right', () => {
  const r = punnett('Aa', 'Aa', { A: { dominant: 'Purple', recessive: 'White' } });
  assert.deepEqual(r.phenotypes.map(p => p.phenotype), ['Purple', 'White']);
  assert.equal(phenotypeOf('aa', { a: { recessive: 'white flowers' } }), 'White flowers');
  const cross = punnett('AA', 'aa');
  assert.equal(cross.boxes, 4);
  assert.deepEqual(cross.genotypes.map(g => [g.genotype, g.fraction]), [['Aa', 1]]);
  assert.equal(cross.recessiveFraction, 0);
  const testCross = punnett('Aa', 'aa');
  assert.equal(testCross.phenotypeRatio, '1 : 1');
  assert.equal(testCross.genotypeRatio, '1 : 1');
  assert.deepEqual(punnett('AA', 'aa', {}, { unique: true }).grid, [['Aa']]);
});

test('AaBb x AaBb gives 16 boxes and the 9:3:3:1 dihybrid ratio', () => {
  const r = punnett('AaBb', 'AaBb');
  assert.equal(r.boxes, 16);
  assert.equal(r.grid.length, 4);
  assert.ok(r.grid.every(row => row.length === 4));
  assert.equal(r.phenotypeRatio, '9 : 3 : 3 : 1');
  assert.equal(r.genotypeRatio, '1 : 2 : 1 : 2 : 4 : 2 : 1 : 2 : 1');
  assert.equal(r.genotypes.length, 9);
  assert.equal(r.genotypes.find(g => g.genotype === 'AaBb').count, 4);
  assert.deepEqual(r.phenotypes.map(p => p.phenotype), ['Dominant A, dominant B', 'Dominant A, recessive b', 'Recessive a, dominant B', 'Recessive a, recessive b']);
  close(r.recessiveFraction, 1 / 16);
  assert.equal(punnett('AaBb', 'aabb').phenotypeRatio, '1 : 1 : 1 : 1');
  assert.equal(punnett('AABb', 'aaBb').phenotypeRatio, '3 : 1');
  assert.equal(punnett('bBAa', 'AaBb').boxes, 16);
  assert.equal(punnett('AaBbCc', 'AaBbCc').boxes, 64);
  assert.equal(punnett('AaBbCc', 'AaBbCc').phenotypeRatio, '27 : 9 : 9 : 3 : 9 : 3 : 3 : 1');
});

test('parents with different genes are rejected', () => {
  assert.throws(() => punnett('Aa', 'Bb'), /same genes/);
  assert.throws(() => punnett('AaBb', 'Aa'), /same genes/);
  assert.throws(() => punnett('Aa', 'A'), Error);
});

test('AO x BO gives 25% each of A, B, AB and O; AB x OO gives 50% A and 50% B', () => {
  const r = bloodTypeCross('AO', 'BO');
  assert.equal(r.boxes, 4);
  const p = byName(r.phenotypes);
  for (const type of ['A', 'B', 'AB', 'O']) close(p[type].fraction, 0.25);
  assert.equal(r.phenotypeRatio, '1 : 1 : 1 : 1');
  const s = byName(bloodTypeCross('AB', 'OO').phenotypes);
  close(s.A.fraction, 0.5); close(s.B.fraction, 0.5); assert.equal(s.O, undefined);
  const t = byName(bloodTypeCross('AO', 'AO').phenotypes);
  close(t.A.fraction, 0.75); close(t.O.fraction, 0.25);
  assert.deepEqual(bloodTypeCross('OA', 'bo').genotypes.map(g => g.genotype), ['AB', 'AO', 'BO', 'OO']);
  assert.deepEqual(bloodTypeCross('OA', 'ba').genotypes.map(g => g.genotype), ['AA', 'AB', 'AO', 'BO']);
  assert.throws(() => bloodTypeCross('AC', 'OO'), /ABO genotype/);
});

test('Rh factor combines with ABO: AO Dd x BO dd', () => {
  const r = bloodTypeCross('AO', 'BO', 'Dd', 'dd');
  assert.equal(r.boxes, 16);
  assert.ok(r.includesRh);
  const p = byName(r.phenotypes);
  for (const type of ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']) close(p[type].fraction, 1 / 8);
  const allPos = byName(bloodTypeCross('OO', 'OO', 'DD', 'dd').phenotypes);
  close(allPos['O+'].fraction, 1);
  assert.throws(() => bloodTypeCross('AO', 'BO', 'Dd'), /both parents/);
  assert.throws(() => bloodTypeCross('AO', 'BO', 'DD', 'Rh'), /Rh genotype/);
});

test('hardyWeinberg from q² = 0.09 gives q = 0.3, p = 0.7, 2pq = 0.42', () => {
  const r = hardyWeinberg({ q2: 0.09 });
  close(r.q, 0.3); close(r.p, 0.7); close(r.p2, 0.49); close(r.twoPq, 0.42); close(r.q2, 0.09);
  close(r.p2 + r.twoPq + r.q2, 1);
  close(hardyWeinberg({ p: 0.6 }).twoPq, 0.48);
  close(hardyWeinberg({ q: 0.02 }).twoPq, 0.0392);
  close(hardyWeinberg({ p2: 0.36 }).q, 0.4);
  for (const bad of [{ p: 1.2 }, { q: -0.1 }, { q2: NaN }, {}]) assert.throws(() => hardyWeinberg(bad), Error);
});

test('genotype counts consistent with Hardy-Weinberg are in equilibrium; a heterozygote excess is not', () => {
  const r = hardyWeinberg({ counts: { AA: 49, Aa: 42, aa: 9 } });
  assert.equal(r.n, 100);
  close(r.p, 0.7); close(r.q, 0.3);
  close(r.expected.AA, 49); close(r.expected.Aa, 42); close(r.expected.aa, 9);
  close(r.chiSquare, 0);
  assert.equal(r.df, 1);
  assert.equal(r.critical, 3.841);
  assert.ok(r.inEquilibrium);
  const off = hardyWeinberg({ counts: { AA: 30, Aa: 60, aa: 10 } });
  close(off.p, 0.6); close(off.chiSquare, 6.25);
  assert.equal(off.inEquilibrium, false);
  const mn = hardyWeinberg({ counts: { AA: 1787, Aa: 3037, aa: 1305 } });
  assert.ok(mn.inEquilibrium);
  assert.ok(mn.chiSquare < 0.1);
  assert.ok(hardyWeinberg({ counts: { AA: 10, Aa: 0, aa: 0 } }).inEquilibrium);
  for (const bad of [{ AA: 1.5, Aa: 0, aa: 0 }, { AA: 0, Aa: 0, aa: 0 }, { AA: -1, Aa: 2, aa: 3 }, { AA: 'x', Aa: 2, aa: 3 }]) assert.throws(() => hardyWeinberg({ counts: bad }), Error);
});

test('chiSquare([705,224],[3,1]) is about 0.39 and does not reject a 3:1 ratio', () => {
  const r = chiSquare([705, 224], [3, 1]);
  assert.equal(r.total, 929);
  close(r.expected[0], 696.75); close(r.expected[1], 232.25);
  close(r.chi2, 0.39, 0.005);
  assert.equal(r.df, 1);
  assert.equal(r.critical, 3.841);
  assert.equal(r.reject, false);
  assert.match(r.verdict, /Do not reject/);
  close(r.pValue, 0.532, 0.002);
  const bad = chiSquare([250, 150], [3, 1]);
  close(bad.chi2, 33.333, 0.001);
  assert.ok(bad.reject);
  assert.match(bad.verdict, /Reject/);
  const di = chiSquare([315, 108, 101, 32], [9, 3, 3, 1]);
  assert.equal(di.df, 3); assert.equal(di.critical, 7.815); close(di.chi2, 0.470, 0.001); assert.equal(di.reject, false);
  assert.deepEqual(Object.values(CHI_SQUARE_CRITICAL), [3.841, 5.991, 7.815, 9.488, 11.070, 12.592, 14.067, 15.507, 16.919]);
});

test('chi-square p-values match the 0.05 critical values and reject bad input', () => {
  close(chiSquarePValue(3.841, 1), 0.05, 1e-3);
  close(chiSquarePValue(5.991, 2), 0.05, 1e-3);
  close(chiSquarePValue(7.815, 3), 0.05, 1e-3);
  close(chiSquarePValue(16.919, 9), 0.05, 1e-3);
  close(chiSquarePValue(0, 1), 1);
  assert.ok(chiSquarePValue(100, 1) < 1e-10);
  assert.throws(() => chiSquarePValue(-1, 1), Error);
  assert.throws(() => chiSquare([1.5, 2], [3, 1]), /whole numbers/);
  assert.throws(() => chiSquare([0, 0], [3, 1]), /greater than zero/);
  assert.throws(() => chiSquare([5, 5, 5], [3, 1]), Error);
  assert.throws(() => chiSquare([5, -5], [1, 1]), Error);
  assert.throws(() => chiSquare([5, 5], [1, 0]), Error);
});

test('chi-square explorer default and every mode produce finite metrics and a clean diagram', () => {
  const defaults = Object.fromEntries(definition.fields.map(f => [f.key, f.value]));
  assert.ok(definition.seoTitle.length <= 65);
  assert.ok(definition.description.length <= 160);
  const modes = definition.modes.map(m => m[0]);
  assert.deepEqual(modes, ['3:1', '1:1', '1:2:1', '9:3:3:1']);
  for (const mode of ['', ...modes]) {
    const out = explore(defaults, mode || undefined);
    assert.ok(out.metrics.length >= 3 && out.metrics.length <= 6);
    for (const m of out.metrics) assert.ok(typeof m.value === 'string' && m.value.length > 0 && !/NaN|Infinity|undefined/.test(m.value), `${mode} ${m.label}`);
    assert.ok(out.steps.length >= 2 && out.steps.length <= 4);
    for (const v of [...out.model.observed, ...out.model.expected, out.model.chi2]) assert.ok(Number.isFinite(v));
    const svg = diagram(out.model);
    assert.ok(svg.includes('<rect') && svg.includes('<text'));
    assert.ok(!/NaN|Infinity|undefined/.test(svg), `diagram for ${mode} contains an invalid number`);
  }
  const mendel = explore({ o1: 705, o2: 224 }, '3:1');
  assert.equal(mendel.metrics.find(m => m.label.startsWith('Chi-square')).value, '0.391');
  assert.match(mendel.metrics.find(m => m.label === 'Verdict').value, /Fits/);
  for (const preset of definition.presets) {
    const out = explore({ ...defaults, ...preset.values }, preset.mode);
    assert.ok(!/NaN/.test(diagram(out.model)));
  }
  assert.throws(() => explore({ o1: 5, o2: 5 }, '2:1'), /supported ratio/);
});
