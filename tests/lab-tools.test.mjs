import test from 'node:test';
import assert from 'node:assert/strict';
import * as cellSize from '../src/lib/tools/cell-size.mjs';
import * as enzyme from '../src/lib/tools/enzyme-kinetics.mjs';
import * as dilution from '../src/lib/tools/dilution-calculator.mjs';
import * as magnification from '../src/lib/tools/magnification-calculator.mjs';
import * as water from '../src/lib/tools/water-potential.mjs';

const modules = [cellSize, enzyme, dilution, magnification, water];
const EXPECTED = {
  'cell-size': { category: 'Cells', lesson: 'surface-area-to-volume' },
  'enzyme-kinetics': { category: 'Molecular', lesson: 'enzymes' },
  'dilution-calculator': { category: 'Lab skills', lesson: 'lab-measurements' },
  'magnification-calculator': { category: 'Lab skills', lesson: 'lab-measurements' },
  'water-potential': { category: 'Cells', lesson: 'cell-transport' },
};
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const defaults = tool => Object.fromEntries(tool.fields.map(f => [f.key, f.value]));
const modesOf = tool => tool.modes ? tool.modes.map(m => m[0]) : [''];
const metric = (result, label) => result.metrics.find(m => m.label === label)?.value;
const BAD = /NaN|Infinity|undefined|(?<![#\da-f])\d(?:\.\d+)?e[-+]?\d/; // the last alternative catches JavaScript E-notation such as 1e-9 or 2.5e-5 (the lookbehind skips hex colors like #e6f2e8)
// Mirror of validateFields in explorations.mjs, so these tests stay independent of the other explorer modules.
const validate = (tool, values, mode) => {
  const keys = tool.fieldsByMode?.[mode] ?? tool.fields.map(f => f.key);
  for (const f of tool.fields) {
    if (!keys.includes(f.key)) continue;
    const v = values[f.key];
    assert.ok(Number.isFinite(v) && v >= f.min && v <= f.max, `${tool.slug} ${mode} ${f.key}=${v} outside ${f.min}..${f.max}`);
    if (f.step === 1) assert.ok(Number.isInteger(v), `${tool.slug} ${f.key} must be an integer`);
  }
};
const checkResult = (m, r, label) => {
  assert.ok(r.metrics.length >= 3 && r.metrics.length <= 6, `${label}: ${r.metrics.length} metrics`);
  for (const t of r.metrics) { assert.equal(typeof t.label, 'string'); assert.equal(typeof t.value, 'string'); assert.doesNotMatch(t.value, BAD, `${label}: ${t.label} = ${t.value}`); }
  assert.ok(r.steps.length >= 2 && r.steps.length <= 4, `${label}: ${r.steps.length} steps`);
  for (const s of r.steps) assert.doesNotMatch(s, BAD, `${label}: ${s}`);
  const svg = m.diagram(r.model);
  assert.ok(svg.length > 500, `${label}: diagram too short`);
  assert.doesNotMatch(svg, BAD, `${label}: diagram contains a bad number`);
  assert.doesNotMatch(svg, /font-size:(\d|1[01])px/, `${label}: text below 12px`);
};

test('definitions follow the explorer contract (slug, SEO title, description, fields, modes, presets)', () => {
  for (const m of modules) {
    const t = m.definition, expected = EXPECTED[t.slug];
    assert.ok(expected, `unexpected slug ${t.slug}`);
    assert.equal(t.category, expected.category);
    assert.equal(t.lesson, expected.lesson);
    assert.ok(t.title.length > 10 && t.seoTitle.length <= 65, `${t.slug}: seoTitle ${t.seoTitle.length} chars`);
    assert.ok(t.description.length >= 120 && t.description.length <= 160, `${t.slug}: description ${t.description.length} chars`);
    for (const k of ['icon', 'keywords', 'meta', 'formula', 'note', 'caption', 'diagramLabel', 'controlsTitle', 'explanationTitle']) assert.equal(typeof t[k], 'string', `${t.slug}.${k}`);
    const keys = t.fields.map(f => f.key);
    assert.equal(new Set(keys).size, keys.length, `${t.slug}: duplicate field keys`);
    for (const f of t.fields) {
      assert.ok(f.label && Number.isFinite(f.value) && Number.isFinite(f.min) && Number.isFinite(f.max), `${t.slug}.${f.key}`);
      assert.ok(f.min < f.max && f.value >= f.min && f.value <= f.max, `${t.slug}.${f.key} default outside its range`);
      assert.ok(f.step === 'any' || f.step === 1, `${t.slug}.${f.key} step`);
    }
    const modes = modesOf(t);
    assert.equal(new Set(modes).size, modes.length);
    if (t.fieldsByMode) {
      assert.deepEqual(Object.keys(t.fieldsByMode).sort(), [...modes].sort(), `${t.slug}: fieldsByMode keys`);
      for (const list of Object.values(t.fieldsByMode)) for (const k of list) assert.ok(keys.includes(k), `${t.slug}: unknown field ${k} in fieldsByMode`);
    }
    for (const p of t.presets) {
      assert.ok(p.label && p.values && modes.includes(p.mode), `${t.slug}: preset ${p.label}`);
      for (const k of Object.keys(p.values)) assert.ok(keys.includes(k), `${t.slug}: preset ${p.label} sets unknown field ${k}`);
    }
  }
});

test('default values, every mode and every preset give 3-6 metrics, 2-4 steps and a clean diagram', () => {
  for (const m of modules) {
    const t = m.definition, d = defaults(t);
    for (const mode of modesOf(t)) {
      validate(t, d, mode);
      checkResult(m, m.explore(d, mode), `${t.slug}/${mode}`);
    }
    for (const p of t.presets) {
      const values = { ...d, ...p.values };
      validate(t, values, p.mode);
      checkResult(m, m.explore(values, p.mode), `${t.slug} preset "${p.label}"`);
    }
  }
});

test('extreme in-range values still give finite results and diagrams', () => {
  for (const m of modules) {
    const t = m.definition, d = defaults(t);
    for (const mode of modesOf(t)) {
      const keys = t.fieldsByMode?.[mode] ?? t.fields.map(f => f.key);
      for (const edge of ['min', 'max']) {
        const values = { ...d };
        for (const f of t.fields) if (keys.includes(f.key)) values[f.key] = f[edge];
        let r;
        try { r = m.explore(values, mode); } catch (e) { assert.ok(e instanceof Error && e.message.length > 10, `${t.slug}/${mode} ${edge}: unfriendly error`); continue; }
        checkResult(m, r, `${t.slug}/${mode} at ${edge}`);
      }
    }
  }
});

test('cube with side 1 µm has SA:V 6 and sphere with radius 3 µm has SA:V 1', () => {
  const cube = cellSize.explore({ side: 1, radius: 1 }, 'cube');
  close(cube.model.ratio, 6); close(cube.model.area, 6); close(cube.model.volume, 1); close(cube.model.depth, 0.5);
  assert.equal(metric(cube, 'SA : V ratio'), '6 per µm');
  const sphere = cellSize.explore({ side: 3, radius: 3 }, 'sphere');
  close(sphere.model.ratio, 1); close(sphere.model.area, 36 * Math.PI); close(sphere.model.volume, 36 * Math.PI); close(sphere.model.depth, 3);
  assert.equal(metric(sphere, 'SA : V ratio'), '1 per µm');
  assert.equal(metric(sphere, 'Surface area'), '113.097 µm²');
});

test('doubling a cell halves its SA:V ratio, and non-positive sizes are rejected', () => {
  const small = cellSize.explore({ side: 10, radius: 10 }, 'cube'), big = cellSize.explore({ side: 20, radius: 20 }, 'cube');
  close(big.model.ratio, small.model.ratio / 2); close(big.model.area, small.model.area * 4); close(big.model.volume, small.model.volume * 8);
  assert.equal(metric(small, 'SA : V if twice as large'), metric(big, 'SA : V ratio'));
  assert.ok(cellSize.diagram(small.model).includes('SA : V falls as size grows'));
  assert.throws(() => cellSize.explore({ side: 0, radius: 1 }, 'cube'), /positive/);
  assert.throws(() => cellSize.explore({ side: 1, radius: -2 }, 'sphere'), /positive/);
  assert.throws(() => cellSize.explore({ side: 1, radius: 1 }, 'pyramid'));
});

test('Michaelis-Menten rate at [S] = Km equals Vmax/2 and saturates at high [S]', () => {
  const half = enzyme.explore({ vmax: 100, km: 2, s: 2 }, 'none');
  close(half.model.v, 50); assert.equal(metric(half, 'Percent of Vmax'), '50%'); assert.equal(metric(half, 'Reaction rate V'), '50 µmol/min');
  assert.ok(half.steps.some(s => s.includes('half of Vmax')));
  close(enzyme.explore({ vmax: 100, km: 2, s: 18 }, 'none').model.v, 90);
  close(enzyme.explore({ vmax: 100, km: 2, s: 0 }, 'none').model.v, 0);
  assert.equal(metric(enzyme.explore({ vmax: 100, km: 2, s: 5 }, 'none'), '[S] needed for 90% of Vmax'), '18 mM');
});

test('a competitive inhibitor raises apparent Km only; a noncompetitive one lowers apparent Vmax only', () => {
  const base = { vmax: 100, km: 2, s: 2, i: 1, ki: 1 };
  const comp = enzyme.explore(base, 'competitive');
  close(comp.model.kmApp, 4); close(comp.model.vmaxApp, 100); close(comp.model.v, 100 * 2 / 6); close(comp.model.v0, 50);
  assert.equal(metric(comp, 'Apparent Km'), '4 mM'); assert.equal(metric(comp, 'Apparent Vmax'), '100 µmol/min');
  const nonc = enzyme.explore(base, 'noncompetitive');
  close(nonc.model.kmApp, 2); close(nonc.model.vmaxApp, 50); close(nonc.model.v, 25);
  assert.equal(metric(nonc, 'Apparent Vmax'), '50 µmol/min');
  close(enzyme.explore({ ...base, i: 0 }, 'competitive').model.v, 50); // no inhibitor present
  assert.ok(comp.model.v > nonc.model.v, 'at [S] = Km the competitive inhibitor hurts less');
  assert.ok(enzyme.diagram(comp.model).includes('apparent Km'));
  assert.throws(() => enzyme.explore({ vmax: 100, km: 0, s: 2 }, 'none'), /positive/);
  assert.throws(() => enzyme.explore({ ...base, ki: 0 }, 'competitive'), /positive/);
  assert.throws(() => enzyme.explore({ ...base, s: -1 }, 'none'));
  assert.throws(() => enzyme.explore(base, 'uncompetitive'));
});

test('diluting 10 M to 1 M in 100 mL needs 10 mL of stock and 90 mL of diluent', () => {
  const r = dilution.explore({ c1: 10, c2: 1, v2: 100 }, 'stock');
  close(r.model.v1, 10); close(r.model.diluent, 90); close(r.model.factor, 10);
  assert.equal(metric(r, 'Stock volume V₁'), '10 mL'); assert.equal(metric(r, 'Diluent to add'), '90 mL'); assert.equal(metric(r, 'Dilution factor'), '10× (1 : 10)');
  const f = dilution.explore({ c1: 1, v1: 2, v2: 50 }, 'final');
  close(f.model.c2, 0.04); close(f.model.factor, 25); assert.equal(metric(f, 'Final concentration C₂'), '0.04');
  const ethanol = dilution.explore({ c1: 95, c2: 70, v2: 500 }, 'stock');
  close(ethanol.model.v1, 500 * 70 / 95);
  assert.throws(() => dilution.explore({ c1: 1, c2: 10, v2: 100 }, 'stock'), /higher than the stock/);
  assert.throws(() => dilution.explore({ c1: 1, v1: 100, v2: 10 }, 'final'), /larger than the final/);
  assert.throws(() => dilution.explore({ c1: 0, c2: 0, v2: 100 }, 'stock'), /positive/);
});

test('a 1:10 serial dilution with three steps gives a total factor of 1,000', () => {
  const r = dilution.explore({ c1: 10, factor: 10, steps: 3 }, 'serial');
  assert.equal(r.model.total, 1000);
  assert.deepEqual(r.model.series, [10, 1, 0.1, 0.01]);
  assert.equal(metric(r, 'Total dilution factor'), '1,000× (1 : 1,000)');
  assert.equal(metric(r, 'Final concentration'), '0.01');
  assert.equal(metric(r, 'Concentration series'), '10 → 1 → 0.1 → 0.01');
  assert.equal(dilution.explore({ c1: 1, factor: 2, steps: 8 }, 'serial').model.total, 256);
  const tiny = dilution.explore({ c1: 1, factor: 10, steps: 6 }, 'serial');
  assert.equal(metric(tiny, 'Final concentration'), '10⁻⁶');
  assert.equal(dilution.conc(0.0025), '0.0025'); assert.equal(dilution.conc(2.5e-5), '2.5 × 10⁻⁵'); assert.equal(dilution.conc(1e30), '10³⁰');
  assert.throws(() => dilution.explore({ c1: 1, factor: 2.5, steps: 3 }, 'serial'), /whole/);
  assert.throws(() => dilution.explore({ c1: 1, factor: 1, steps: 3 }, 'serial'));
  assert.throws(() => dilution.explore({ c1: 1, factor: 10, steps: 11 }, 'serial'));
});

test('total magnification 10 × 40 = 400 and the field of view converts to cells', () => {
  const r = magnification.explore({ eyepiece: 10, objective: 40, fov: 0.45 }, 'total');
  close(r.model.total, 400); close(r.model.fovUm, 450); close(r.model.cells, 9);
  assert.equal(metric(r, 'Total magnification'), '400×'); assert.equal(metric(r, 'Field of view'), '450 µm'); assert.equal(metric(r, 'Cells across (50 µm each)'), '≈ 9');
  close(magnification.explore({ eyepiece: 10, objective: 4, fov: 4.5 }, 'total').model.cells, 90);
  assert.throws(() => magnification.explore({ eyepiece: 0, objective: 40, fov: 0.45 }, 'total'), /positive/);
});

test('a 20 mm image at 400× is a 50 µm cell, and the other modes agree', () => {
  const actual = magnification.explore({ image: 20, mag: 400 }, 'actual');
  close(actual.model.actual, 50); close(actual.model.image, 20000);
  assert.equal(metric(actual, 'Actual size'), '50 µm'); assert.equal(metric(actual, 'Actual size (mm)'), '0.05 mm');
  const mag = magnification.explore({ image: 20, actual: 50 }, 'magnification');
  close(mag.model.mag, 400); assert.equal(metric(mag, 'Magnification'), '400×');
  const image = magnification.explore({ actual: 50, mag: 400 }, 'image');
  close(image.model.image, 20000); assert.equal(metric(image, 'Image size'), '20 mm');
  assert.equal(image.model.bar, 20); close(image.model.barMm, 8); // a 20 µm bar is 8 mm long at 400×
  close(magnification.explore({ image: 7.5, actual: 7.5 }, 'magnification').model.mag, 1000);
  assert.ok(magnification.diagram(image.model).includes('20 µm'));
  assert.throws(() => magnification.explore({ image: 0, mag: 400 }, 'actual'), /positive/);
  assert.throws(() => magnification.explore({ image: 20, actual: 0 }, 'magnification'), /positive/);
  assert.throws(() => magnification.explore({ image: 20, mag: 400 }, 'zoom'));
});

test('0.1 M sucrose at 25 °C has a solute potential of about −0.248 MPa', () => {
  const r = water.explore({ i: 1, c: 0.1, t: 25, p: 0 }, 'single');
  close(r.model.cells[0].psiS, -0.1 * 0.00831 * 298.15, 1e-9);
  close(r.model.cells[0].psiS, -0.248, 5e-4);
  assert.equal(metric(r, 'Solute potential Ψs'), '−0.248 MPa'); assert.equal(metric(r, 'Water potential Ψ'), '−0.248 MPa'); assert.equal(metric(r, 'Temperature'), '298.15 K');
  assert.equal(r.model.direction, 'in');
  close(water.explore({ i: 2, c: 0.3, t: 25, p: 0 }, 'single').model.cells[0].psiS, -2 * 0.3 * 0.00831 * 298.15, 1e-9);
  const turgid = water.explore({ i: 1, c: 0.3, t: 25, p: 0.5 }, 'single');
  close(turgid.model.cells[0].psi, -0.3 * 0.00831 * 298.15 + 0.5, 1e-9);
  assert.equal(metric(turgid, 'Pressure potential Ψp'), '+0.5 MPa');
  assert.equal(water.explore({ i: 1, c: 0, t: 25, p: 0 }, 'single').model.direction, 'none');
  assert.equal(water.explore({ i: 1, c: 0.1, t: 25, p: 1 }, 'single').model.direction, 'out');
  close(water.kelvin(0), 273.15); assert.equal(water.R, 0.00831);
});

test('compare mode reports net water movement toward the cell with the lower water potential', () => {
  const aToB = water.explore({ t: 25, iA: 1, cA: 0.1, pA: 0, iB: 1, cB: 0.5, pB: 0 }, 'compare');
  assert.equal(aToB.model.direction, 'A→B'); assert.equal(metric(aToB, 'Net water movement'), 'Cell A → cell B');
  close(aToB.model.diff, 0.4 * 0.00831 * 298.15, 1e-9);
  assert.ok(aToB.model.cells[0].psi > aToB.model.cells[1].psi);
  const bToA = water.explore({ t: 25, iA: 1, cA: 0.5, pA: 0, iB: 1, cB: 0.1, pB: 0 }, 'compare');
  assert.equal(bToA.model.direction, 'B→A'); assert.equal(metric(bToA, 'Net water movement'), 'Cell B → cell A');
  // Pressure can reverse the direction set by solutes alone.
  const pressure = water.explore({ t: 25, iA: 1, cA: 0.1, pA: 0, iB: 1, cB: 0.5, pB: 2 }, 'compare');
  assert.equal(pressure.model.direction, 'B→A');
  const tie = water.explore({ t: 25, iA: 1, cA: 0.4, pA: 0.5, iB: 2, cB: 0.2, pB: 0.5 }, 'compare');
  assert.equal(tie.model.direction, 'none'); assert.equal(metric(tie, 'Net water movement'), 'None (equilibrium)');
  assert.ok(water.diagram(aToB.model).includes('Cell B gains water'));
  assert.throws(() => water.explore({ i: 0.5, c: 0.1, t: 25, p: 0 }, 'single'), /ionization/);
  assert.throws(() => water.explore({ i: 1, c: -1, t: 25, p: 0 }, 'single'));
  assert.throws(() => water.explore({ i: 1, c: 0.1, t: -300, p: 0 }, 'single'), /Temperature/);
  assert.throws(() => water.explore({ t: 25, iA: 1, cA: 0.1, pA: 9, iB: 1, cB: 0.1, pB: 0 }, 'compare'), /pressure/);
  assert.throws(() => water.explore({ i: 1, c: 0.1, t: 25, p: 0 }, 'triple'));
});

test('formatted values use superscript scientific notation instead of E-notation or 13-digit strings', () => {
  const tiny = magnification.explore({ actual: 0.0001, mag: 0.01 }, 'image');
  assert.equal(metric(tiny, 'Image size'), '10⁻⁹ mm');
  assert.equal(metric(tiny, 'Scale bar for 0.00002 µm'), '2 × 10⁻¹⁰ mm on the image');
  assert.equal(metric(magnification.explore({ image: 0.001, mag: 10000000 }, 'actual'), 'Actual size'), '10⁻⁷ µm');
  const huge = cellSize.explore({ side: 10000, radius: 10000 }, 'sphere');
  assert.equal(metric(huge, 'Volume'), '4.19 × 10¹² µm³');
  assert.equal(metric(huge, 'Surface area'), '1.26 × 10⁹ µm²');
  assert.equal(metric(cellSize.explore({ side: 20, radius: 500 }, 'sphere'), 'Volume'), '523,598,775.598 µm³');
  assert.doesNotMatch(magnification.diagram(tiny.model), BAD);
});

test('concentrations carry no hard-coded unit, so the % and × presets read correctly', () => {
  const ethanol = dilution.explore({ c1: 95, c2: 70, v2: 500 }, 'stock');
  assert.equal(metric(ethanol, 'Final concentration C₂'), '70');
  const unit = /\d M\b/, texts = svg => [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(x => x[1]).join('\n'); // text content only: path data uses M for moveto
  for (const t of ethanol.metrics) assert.doesNotMatch(t.value, unit);
  for (const s of ethanol.steps) assert.doesNotMatch(s, unit);
  assert.doesNotMatch(texts(dilution.diagram(ethanol.model)), unit);
  assert.ok(ethanol.steps[2].includes('35,000'), 'C₁V₁ = C₂V₂ check shows the equal products');
  const buffer = dilution.explore({ c1: 5, c2: 1, v2: 50 }, 'stock');
  assert.equal(metric(buffer, 'Stock volume V₁'), '10 mL'); assert.equal(metric(buffer, 'Final concentration C₂'), '1');
  for (const mode of ['final', 'serial']) {
    const r = dilution.explore({ c1: 1, v1: 2, v2: 50, factor: 2, steps: 8 }, mode);
    for (const t of r.metrics) assert.doesNotMatch(t.value, unit);
    for (const s of r.steps) assert.doesNotMatch(s, unit);
    assert.doesNotMatch(texts(dilution.diagram(r.model)), unit);
  }
  assert.notEqual(dilution.definition.fields.find(f => f.key === 'c1').unit, 'M');
});

test('an enzyme diagram with [I] = 0 draws one clean curve without overprinted comparison labels', () => {
  const base = { vmax: 100, km: 2, s: 2, i: 0, ki: 1 };
  const none = enzyme.diagram(enzyme.explore(base, 'noncompetitive').model);
  assert.ok(!none.includes('Vmax without inhibitor') && !none.includes('Uninhibited (for comparison)'));
  assert.ok(none.includes('apparent Vmax = 100') && none.includes('(no inhibition)'));
  const withI = enzyme.diagram(enzyme.explore({ ...base, i: 1 }, 'noncompetitive').model);
  assert.ok(withI.includes('Vmax without inhibitor = 100') && withI.includes('apparent Vmax = 50') && withI.includes('Uninhibited (for comparison)'));
  const comp0 = enzyme.diagram(enzyme.explore(base, 'competitive').model);
  assert.equal((comp0.match(/Km = 2 mM/g) || []).length, 1, 'a single Km guide at [I] = 0');
});

test('water potential diagram text is XML-safe and its explanation matches the equilibrium preset', () => {
  const single = water.diagram(water.explore({ i: 1, c: 0.1, t: 25, p: 0 }, 'single').model);
  assert.doesNotMatch(single.replace(/<[^>]+>/g, ''), /[<>]/, 'raw < or > inside SVG text');
  assert.ok(single.includes('&lt; 0 outside'));
  assert.ok(water.diagram(water.explore({ i: 1, c: 0.1, t: 25, p: 1 }, 'single').model).includes('&gt; 0 outside'));
  const dilute = water.diagram(water.explore({ t: 37, iA: 1, cA: 0.3, pA: 0, iB: 1, cB: 0, pB: 0 }, 'compare').model);
  assert.ok(!dilute.includes(`fill="#ffffff" style="fill:#ffffff`), 'no white text drawn directly over a nearly transparent cell');
  const tie = water.explore({ t: 25, iA: 1, cA: 0.4, pA: 0.5, iB: 2, cB: 0.2, pB: 0.5 }, 'compare');
  assert.ok(tie.steps[3].includes('i × C') && !tie.steps[3].includes('because pressure makes up'));
});
