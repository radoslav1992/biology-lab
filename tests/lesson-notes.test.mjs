// Concept-note extras (src/lib/lesson-notes.mjs): one entry per lesson, snippet-length descriptions, and answers whose
// arithmetic matches the question.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../src/lib/lessons.mjs';
import { lessonNotes } from '../src/lib/lesson-notes.mjs';
import { doublingSolution } from '../src/lib/population.mjs';

test('every concept note has a description, key terms and two questions', () => {
  assert.deepEqual(Object.keys(lessonNotes).sort(), lessons.map(l => l.slug).sort());
  const descriptions = new Set();
  for (const [slug, n] of Object.entries(lessonNotes)) {
    assert.ok(n.description.length >= 120 && n.description.length <= 155, `${slug} description is ${n.description.length} characters`);
    assert.ok(!descriptions.has(n.description), `${slug} description is not unique`);
    descriptions.add(n.description);
    assert.ok(n.terms.length >= 4, `${slug} has ${n.terms.length} key terms`);
    for (const [term, meaning] of n.terms) assert.ok(term && meaning.length > 30 && /[.!?]$/.test(meaning), `${slug}: ${term}`);
    assert.equal(n.check.length, 2, slug);
    for (const [q, a] of n.check) { assert.ok(q.endsWith('?'), `${slug}: ${q}`); assert.ok(a.length > 60, `${slug}: short answer`); }
  }
});

test('numeric answers in the concept-note questions are right', () => {
  const answer = (slug, i) => lessonNotes[slug].check[i][1];
  // DNA: 18% C → 32% A; complement of GATTACA.
  assert.equal((100 - 2 * 18) / 2, 32); assert.match(answer('dna-structure', 0), /adenine is 32%/);
  const pair = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const comp = [...'GATTACA'].map(b => pair[b]).join('');
  assert.match(answer('dna-structure', 1), new RegExp(`3′-${comp}-5′`));
  assert.match(answer('dna-structure', 1), new RegExp(`5′-${[...comp].reverse().join('')}-3′`));
  // Hardy-Weinberg.
  const q = Math.sqrt(0.16); assert.ok(Math.abs(2 * (1 - q) * q - 0.48) < 1e-12); assert.match(answer('hardy-weinberg-principle', 0), /0\.48, or 48%/);
  assert.ok(Math.abs(2 * 0.9 * 0.1 / (0.1 * 0.1) - 18) < 1e-9); assert.match(answer('hardy-weinberg-principle', 1), /18 times/);
  // Michaelis–Menten with Vmax 60, Km 4.
  const v = s => 60 * s / (4 + s); assert.equal(v(4), 30); assert.equal(v(12), 45);
  assert.match(answer('enzymes', 0), /= 30 µmol\/min.*= 45 µmol\/min/);
  // Meiosis, Mendel, SA:V, energy, magnification, dilution.
  assert.equal(2 ** (8 / 2), 16); assert.match(answer('mitosis-and-meiosis', 0), /2⁴ = 16/);
  assert.match(answer('mendelian-inheritance', 0), /400 = 100/);
  assert.equal(6 * 2 ** 2 / 2 ** 3, 3); assert.equal(6 * 4 ** 2 / 4 ** 3, 1.5);
  assert.match(answer('energy-flow-in-ecosystems', 0), /5,000 kJ.*500 kJ/);
  assert.equal(50 * 1000 / 25, 2000); assert.match(answer('lab-measurements', 0), /×2,000/);
  assert.equal(0.2 * 50 / 1, 10); assert.match(answer('lab-measurements', 1), /10 mL of stock.*40 mL/);
  // Population doubling, with the same function as the calculator.
  assert.equal(doublingSolution(700000, 41, 123).N, 5600000); assert.match(answer('population-growth', 0), /= 5,600,000 people/);
});
