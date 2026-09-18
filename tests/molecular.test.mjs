import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CODON_TABLE, AMINO_ACIDS, STOP_CODONS, MAX_LENGTH, DEFAULT_SEQUENCE,
  cleanSequence, complement, reverseComplement, transcribe, templateStrand, toCodingStrand,
  codons, translate, translateDna, findStartCodon, gcContent, meltingTemperature, composition,
  proteinSummary, compareCodingStrands,
} from '../src/lib/molecular.mjs';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
const abbrs = peptide => peptide.map(p => p.amino.abbr);

test('the genetic code has 64 codons, exactly three stops, and 20 amino acids', () => {
  const codonList = Object.keys(CODON_TABLE);
  assert.equal(codonList.length, 64);
  assert.ok(codonList.every(c => /^[ACGU]{3}$/.test(c)));
  const stops = codonList.filter(c => CODON_TABLE[c].letter === '*');
  assert.deepEqual(stops.sort(), [...STOP_CODONS].sort());
  for (const s of STOP_CODONS) assert.deepEqual({ name: CODON_TABLE[s].name, abbr: CODON_TABLE[s].abbr, letter: CODON_TABLE[s].letter }, { name: 'Stop', abbr: 'Stop', letter: '*' });
  assert.equal(AMINO_ACIDS.length, 20);
  assert.equal(new Set(AMINO_ACIDS.map(a => a.letter)).size, 20);
  assert.equal(new Set(codonList.map(c => CODON_TABLE[c].letter)).size, 21);
});

test('well-known codon assignments and degeneracy match the standard code', () => {
  const expect = { AUG: 'Met', UGG: 'Trp', UUU: 'Phe', UUA: 'Leu', CUG: 'Leu', AUA: 'Ile', GAG: 'Glu', GUG: 'Val', GAU: 'Asp', AAA: 'Lys', CAU: 'His', CAA: 'Gln', UAU: 'Tyr', UGU: 'Cys', AGU: 'Ser', AGA: 'Arg', CGA: 'Arg', GGG: 'Gly', CCC: 'Pro', ACG: 'Thr', GCA: 'Ala', AAU: 'Asn' };
  for (const [codon, abbr] of Object.entries(expect)) assert.equal(CODON_TABLE[codon].abbr, abbr, codon);
  const count = abbr => Object.values(CODON_TABLE).filter(a => a.abbr === abbr).length;
  assert.equal(count('Met'), 1); assert.equal(count('Trp'), 1);
  for (const six of ['Leu', 'Ser', 'Arg']) assert.equal(count(six), 6);
  for (const four of ['Val', 'Pro', 'Thr', 'Ala', 'Gly']) assert.equal(count(four), 4);
  assert.equal(count('Ile'), 3);
  for (const two of ['Phe', 'Tyr', 'His', 'Gln', 'Asn', 'Lys', 'Asp', 'Glu', 'Cys']) assert.equal(count(two), 2);
});

test('ATGGCCTAA translates to Met, Ala, Stop', () => {
  const peptide = translate(transcribe('ATGGCCTAA'));
  assert.deepEqual(abbrs(peptide), ['Met', 'Ala', 'Stop']);
  assert.deepEqual(peptide.map(p => p.codon), ['AUG', 'GCC', 'UAA']);
  assert.deepEqual(peptide.map(p => p.position), [1, 4, 7]);
  assert.deepEqual(abbrs(translateDna('atg gcc taa')), ['Met', 'Ala', 'Stop']);
});

test('complement, reverse complement, and template strand of ATGC', () => {
  assert.equal(complement('ATGC'), 'TACG');
  assert.equal(reverseComplement('ATGC'), 'GCAT');
  assert.equal(templateStrand('ATGC'), 'TACG');
  assert.equal(reverseComplement(reverseComplement(DEFAULT_SEQUENCE)), DEFAULT_SEQUENCE);
  assert.equal(reverseComplement('AATT'), 'AATT', 'palindromic site is its own reverse complement');
});

test('transcription replaces T with U and nothing else; back-transcription undoes it', () => {
  assert.equal(transcribe('ATGCTTAG'), 'AUGCUUAG');
  assert.equal(transcribe('acgt'), 'ACGU');
  assert.equal(toCodingStrand('AUGCUUAG'), 'ATGCTTAG');
  assert.equal(transcribe(DEFAULT_SEQUENCE).length, DEFAULT_SEQUENCE.length);
});

test('GC content is a fraction', () => {
  assert.equal(gcContent('GGCC'), 1);
  assert.equal(gcContent('ATAT'), 0);
  close(gcContent('ATGC'), 0.5);
  close(gcContent(DEFAULT_SEQUENCE), 22 / 39);
  close(gcContent('GGCCUUAA'), 0.5, 'RNA input is accepted');
});

test('melting temperature: Wallace rule below 14 nt, basic formula from 14 nt upward', () => {
  assert.equal(meltingTemperature('ATGC'), 12);
  assert.equal(meltingTemperature('AAAA'), 8);
  assert.equal(meltingTemperature('GGGGGGGGGGGGG'), 52, '13 nt still uses the Wallace rule');
  const twenty = 'ATGGCCATTGTAATGGGCCG';
  assert.equal(twenty.length, 20);
  close(meltingTemperature(twenty), 64.9 + 41 * (11 - 16.4) / 20);
  close(meltingTemperature(twenty), 53.83);
  const fourteen = 'ATGCATGCATGCAT';
  close(meltingTemperature(fourteen), 64.9 + 41 * (6 - 16.4) / 14);
});

test('composition counts every base', () => {
  assert.deepEqual(composition('AACGT'), { A: 2, C: 1, G: 1, T: 1 });
  assert.deepEqual(composition('AUG'), { A: 1, C: 0, G: 1, U: 1 });
  const counts = composition(DEFAULT_SEQUENCE);
  assert.equal(counts.A + counts.C + counts.G + counts.T, 39);
});

test('reading frames 2 and 3 shift the codons and drop leftovers', () => {
  const rna = transcribe('ATGGCCTAAG');
  assert.deepEqual(codons(rna, 0), ['AUG', 'GCC', 'UAA']);
  assert.deepEqual(codons(rna, 1), ['UGG', 'CCU', 'AAG']);
  assert.deepEqual(codons(rna, 2), ['GGC', 'CUA']);
  assert.deepEqual(abbrs(translate(rna, { frame: 1 })), ['Trp', 'Pro', 'Lys']);
  assert.deepEqual(abbrs(translate(rna, { frame: 2 })), ['Gly', 'Leu']);
  assert.deepEqual(codons('AU'), []);
  assert.throws(() => codons(rna, 3), /frame 1, 2, or 3/);
});

test('fromStartCodon skips leading bases until the first AUG in the frame', () => {
  const rna = transcribe('GGGATGGCCTAA');
  assert.deepEqual(abbrs(translate(rna)), ['Gly', 'Met', 'Ala', 'Stop']);
  const fromStart = translate(rna, { fromStartCodon: true });
  assert.deepEqual(abbrs(fromStart), ['Met', 'Ala', 'Stop']);
  assert.equal(fromStart[0].position, 4);
  assert.equal(fromStart[0].index, 2);
  assert.deepEqual(translate(transcribe('GGGCCC'), { fromStartCodon: true }), []);
  assert.equal(findStartCodon('CCAUGG'), 2);
  assert.equal(findStartCodon('CCCGGG'), -1);
});

test('translation stops after the first stop codon and reports an open frame otherwise', () => {
  const peptide = translateDna(DEFAULT_SEQUENCE);
  assert.deepEqual(abbrs(peptide), ['Met', 'Ala', 'Ile', 'Val', 'Met', 'Gly', 'Arg', 'Stop']);
  const summary = proteinSummary(peptide);
  assert.equal(summary.length, 7);
  assert.equal(summary.letters, 'MAIVMGR');
  assert.equal(summary.abbrs, 'Met-Ala-Ile-Val-Met-Gly-Arg');
  assert.equal(summary.terminated, true);
  assert.equal(summary.stopCodon, 'UGA');
  assert.equal(summary.stopIndex, 8);
  assert.equal(summary.startsWithMet, true);
  const open = proteinSummary(translateDna('ATGAAA'));
  assert.equal(open.terminated, false);
  assert.equal(open.stopCodon, null);
  assert.equal(open.letters, 'MK');
  assert.deepEqual(proteinSummary([]), { length: 0, letters: '', abbrs: '', codonsRead: 0, terminated: false, stopCodon: null, stopIndex: null, startsWithMet: false });
});

test('cleanSequence normalizes case, whitespace, digits, and FASTA headers', () => {
  assert.equal(cleanSequence('>my gene\natg gcc\n 7 taa\r\n'), 'ATGGCCTAA');
  assert.equal(cleanSequence('acgu', 'ACGU'), 'ACGU');
});

test('invalid characters, empty input, and oversize sequences throw friendly errors', () => {
  assert.throws(() => cleanSequence('ATGXCC'), /"X" is not a valid base/);
  assert.throws(() => cleanSequence('ATGU'), /"U".*swap each U for T/);
  assert.throws(() => cleanSequence('AUGT', 'ACGU'), /"T".*RNA uses U/);
  assert.throws(() => cleanSequence(''), /Enter a sequence/);
  assert.throws(() => cleanSequence('  \n 12 '), /Enter a sequence/);
  assert.throws(() => cleanSequence('>header only'), /Enter a sequence/);
  assert.throws(() => cleanSequence(null), /Enter a sequence/);
  assert.equal(cleanSequence('A'.repeat(MAX_LENGTH)).length, MAX_LENGTH);
  assert.throws(() => cleanSequence('A'.repeat(MAX_LENGTH + 1)), /3,000 nucleotides or fewer/);
  assert.throws(() => translate('AUGXXX'), /"X"/);
  assert.throws(() => gcContent('   '), /Enter a sequence/);
});

test('sickle-cell point mutation: GAG to GTG at codon 7 is a missense change from Glu to Val', () => {
  const normal = 'ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCC';
  const sickle = 'ATGGTGCATCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCC';
  assert.equal(proteinSummary(translateDna(normal)).letters, 'MVHLTPEEKSAVTA');
  assert.equal(proteinSummary(translateDna(sickle)).letters, 'MVHLTPVEKSAVTA');
  const diff = compareCodingStrands(normal, sickle);
  assert.deepEqual(diff.substitutions, [{ position: 20, from: 'A', to: 'T' }]);
  assert.equal(diff.codonChanges.length, 1);
  const [change] = diff.codonChanges;
  assert.equal(change.codon, 7);
  assert.equal(change.from, 'GAG');
  assert.equal(change.to, 'GUG');
  assert.equal(change.aminoFrom.abbr, 'Glu');
  assert.equal(change.aminoTo.abbr, 'Val');
  assert.equal(change.effect, 'missense');
  assert.equal(compareCodingStrands('ATGAAA', 'ATGAAG').codonChanges[0].effect, 'silent');
  assert.equal(compareCodingStrands('ATGAAA', 'ATGTAA').codonChanges[0].effect, 'nonsense');
  assert.equal(compareCodingStrands('ATGTAA', 'ATGCAA').codonChanges[0].effect, 'stop-loss');
  assert.throws(() => compareCodingStrands('ATG', 'ATGA'), /same length/);
});

test('the insulin B chain fragment translates to Met-Phe-Val-Asn-Gln-His…', () => {
  const summary = proteinSummary(translateDna('ATGTTCGTGAACCAACACCTGTGCGGCTCACACCTGGTGGAAGCTCTC'));
  assert.equal(summary.letters, 'MFVNQHLCGSHLVEAL');
  assert.equal(summary.terminated, false);
});
