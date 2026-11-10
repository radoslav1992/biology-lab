import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CODON_TABLE, AMINO_ACIDS, STOP_CODONS, MAX_LENGTH, DEFAULT_SEQUENCE,
  cleanSequence, complement, reverseComplement, transcribe, templateStrand, toCodingStrand,
  codons, translate, translateDna, findStartCodon, gcContent, meltingTemperature, composition,
  proteinSummary, compareCodingStrands, sequenceHref, parseSequenceHref,
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

test('any strand a student has converts to the coding strand, and anticodons pair with codons', async () => {
  const { codingStrandFrom, anticodons, transcribe, translate, proteinSummary, codons, INPUT_STRANDS } = await import('../src/lib/molecular.mjs');
  assert.deepEqual(Object.keys(INPUT_STRANDS), ['coding', 'template', 'template53', 'mrna']);
  assert.equal(codingStrandFrom('atg gcc', 'coding'), 'ATGGCC');
  assert.equal(transcribe(codingStrandFrom('TAC', 'template')), 'AUG'); // template 3'-TAC-5' → mRNA 5'-AUG-3'
  assert.equal(transcribe(codingStrandFrom('AGT', 'template')), 'UCA'); // the classic exam question: template AGT → codon UCA
  assert.equal(transcribe(codingStrandFrom('CAT', 'template53')), 'AUG'); // the same template read 5'→3'
  assert.equal(codingStrandFrom('AUGUGG', 'mrna'), 'ATGTGG');
  assert.equal(codons(transcribe(codingStrandFrom('TACGGTAGTACC', 'template'))).length, 4);
  assert.equal(proteinSummary(translate(transcribe(codingStrandFrom('AACUAUGUGGCAU', 'mrna')), { fromStartCodon: true, frame: 1 })).abbrs, 'Met-Trp-His');
  assert.equal(anticodons('AUGGCU'), 'UACCGA');
  assert.throws(() => codingStrandFrom('ATG', 'protein'), /coding, template, or mRNA/);
  assert.throws(() => codingStrandFrom('AUG', 'template'), /choose mRNA as the input/);
});

test('sequence links round-trip through the URL fragment', () => {
  const href = sequenceHref('/dna-transcription-translation/', 'TACGGACTT', 'template');
  assert.equal(href, '/dna-transcription-translation/#seq=TACGGACTT&strand=template');
  assert.deepEqual(parseSequenceHref(href.slice(href.indexOf('#'))), { seq: 'TACGGACTT', kind: 'template', fromStartCodon: false });
  assert.deepEqual(parseSequenceHref(sequenceHref('', 'AACUAUGUGGCAU', 'mrna', { fromStartCodon: true })), { seq: 'AACUAUGUGGCAU', kind: 'mrna', fromStartCodon: true });
  assert.deepEqual(parseSequenceHref('#seq=ATG&strand=protein'), { seq: 'ATG', kind: 'coding', fromStartCodon: false }, 'an unknown strand type falls back to coding');
  assert.deepEqual(parseSequenceHref('#seq=ATG&strand=toString'), { seq: 'ATG', kind: 'coding', fromStartCodon: false });
  assert.equal(parseSequenceHref('#worked-examples'), null);
  assert.equal(parseSequenceHref('#seq='), null);
  assert.equal(parseSequenceHref(undefined), null);
  assert.equal(parseSequenceHref('#seq=' + 'A'.repeat(MAX_LENGTH + 50)).seq.length, MAX_LENGTH);
});

test('the worked examples on the converter page translate as printed', async () => {
  const { codingStrandFrom, anticodons } = await import('../src/lib/molecular.mjs');
  const mrna = (seq, kind) => transcribe(codingStrandFrom(seq, kind));
  assert.equal(mrna('TACGGACTT', 'template'), 'AUGCCUGAA');
  assert.deepEqual(abbrs(translate('AUGCCUGAA')), ['Met', 'Pro', 'Glu']);
  assert.equal(anticodons('AUGCCUGAA'), 'UACGGACUU');
  assert.equal(mrna('GCGATACCGTTA', 'coding'), 'GCGAUACCGUUA');
  assert.deepEqual(abbrs(translate('GCGAUACCGUUA')), ['Ala', 'Ile', 'Pro', 'Leu']);
  assert.deepEqual(abbrs(translate('AUGUUGCAGCACUAG')), ['Met', 'Leu', 'Gln', 'His', 'Stop']);
  assert.equal(mrna('AGT', 'template'), 'UCA');
});

test('tRNA anticodons: one per translated codon, written 3′→5′ under the codon or 5′→3′ reversed, none for a stop', async () => {
  const { anticodonFor, anticodonRow, anticodons, ANTICODON_DIRECTIONS } = await import('../src/lib/molecular.mjs');
  assert.deepEqual(Object.keys(ANTICODON_DIRECTIONS), ['3to5', '5to3']);
  // the start codon 5′-AUG-3′ is read by 3′-UAC-5′, which is 5′-CAU-3′
  assert.equal(anticodonFor('AUG'), 'UAC');
  assert.equal(anticodonFor('AUG', '3to5'), 'UAC');
  assert.equal(anticodonFor('AUG', '5to3'), 'CAU');
  assert.equal(anticodonFor('GCC'), 'CGG');
  assert.equal(anticodonFor('GCC', '5to3'), 'GGC');
  assert.equal(anticodonFor('gcu', '5to3'), 'AGC');
  assert.equal(anticodonFor('UUU'), 'AAA');
  // every sense codon: the 3′→5′ form pairs base for base, and the 5′→3′ form is that string reversed
  const pair = { A: 'U', U: 'A', G: 'C', C: 'G' };
  let sense = 0;
  for (const codon of Object.keys(CODON_TABLE)) {
    if (STOP_CODONS.includes(codon)) { assert.equal(anticodonFor(codon), null, codon); assert.equal(anticodonFor(codon, '5to3'), null, codon); continue; }
    sense++;
    const paired = anticodonFor(codon), reversed = anticodonFor(codon, '5to3');
    assert.equal(paired, [...codon].map(b => pair[b]).join(''), codon);
    assert.equal(paired, anticodons(codon), codon);
    assert.equal(reversed, [...paired].reverse().join(''), codon);
    // pairing the anticodon back gives the codon: the reverse complement of the 5′→3′ anticodon
    assert.equal([...reversed].reverse().map(b => pair[b]).join(''), codon, codon);
  }
  assert.equal(sense, 61);
  // a translated message: the stop codon has no tRNA, and nothing after it is read
  const peptide = translate('AUGGCUUAAGGG');
  assert.deepEqual(anticodonRow(peptide), ['UAC', 'CGA', null]);
  assert.deepEqual(anticodonRow(peptide, '5to3'), ['CAU', 'AGC', null]);
  assert.deepEqual(anticodonRow(translate(transcribe(DEFAULT_SEQUENCE))), ['UAC', 'CGG', 'UAA', 'CAU', 'UAC', 'CCG', 'GCG', null]);
  assert.deepEqual(anticodonRow(translate(transcribe(DEFAULT_SEQUENCE)), '5to3'), ['CAU', 'GGC', 'AAU', 'UAC', 'CAU', 'GCC', 'GCG', null]);
  assert.deepEqual(anticodonRow([]), []);
  assert.throws(() => anticodonFor('AU'), /exactly three bases/);
  assert.throws(() => anticodonFor('AUGG'), /exactly three bases/);
  assert.throws(() => anticodonFor('ATG'), /not a valid base/);
  assert.throws(() => anticodonFor(''), /Enter a sequence/);
  assert.throws(() => anticodonFor('AUG', 'sideways'), /3′ → 5′ or 5′ → 3′/);
});

test('DNA replication returns the complementary strand with the right 5′ and 3′ ends', async () => {
  const { replicate, basePairs } = await import('../src/lib/molecular.mjs');
  const r = replicate('ATGC');
  assert.deepEqual(r.original, { seq: 'ATGC', left: '5′', right: '3′' });
  assert.deepEqual(r.copy, { seq: 'TACG', left: '3′', right: '5′' });
  assert.equal(r.copy53, 'GCAT');
  assert.equal(r.copy53, reverseComplement('ATGC'));
  assert.equal(r.original53, 'ATGC');
  assert.deepEqual([r.at, r.gc, r.hydrogenBonds], [2, 2, 10]);
  // a strand written 3′→5′: the new strand under it already reads 5′→3′ from left to right
  const t = replicate('TACGGC', '3to5');
  assert.deepEqual(t.original, { seq: 'TACGGC', left: '3′', right: '5′' });
  assert.deepEqual(t.copy, { seq: 'ATGCCG', left: '5′', right: '3′' });
  assert.equal(t.copy53, 'ATGCCG');
  assert.equal(t.original53, 'CGGCAT');
  // the same double helix whichever strand and whichever direction you start from
  assert.equal(replicate(t.original53).copy53, t.copy53);
  assert.equal(replicate(t.copy53).copy53, t.original53);
  for (const seq of [DEFAULT_SEQUENCE, 'AGTCCGATA', 'A', 'GGGCCC']) {
    const copy = replicate(seq);
    assert.equal(copy.copy.seq.length, seq.length);
    assert.equal(replicate(copy.copy53).copy53, seq, 'copying the copy restores the original');
    assert.equal(copy.at + copy.gc, seq.length);
    assert.equal(copy.hydrogenBonds, 2 * copy.at + 3 * copy.gc);
    for (let i = 0; i < seq.length; i++) assert.ok(['AT', 'TA', 'GC', 'CG'].includes(seq[i] + copy.copy.seq[i]), `${seq[i]}–${copy.copy.seq[i]}`);
  }
  assert.deepEqual(basePairs(DEFAULT_SEQUENCE), { at: 17, gc: 22, hydrogenBonds: 100 });
  assert.deepEqual(basePairs('AAAA'), { at: 4, gc: 0, hydrogenBonds: 8 });
  assert.deepEqual(basePairs('GC'), { at: 0, gc: 2, hydrogenBonds: 6 });
  assert.equal(replicate(' at gc\n12').copy.seq, 'TACG', 'input is cleaned like every other sequence');
  assert.throws(() => replicate('AUGC'), /expects DNA/);
  assert.throws(() => replicate(''), /Enter a sequence/);
  assert.throws(() => replicate('ATGN'), /unknown base/);
  assert.throws(() => replicate('ATGC', 'up'), /5′ → 3′ or 3′ → 5′/);
  assert.throws(() => replicate('A'.repeat(MAX_LENGTH + 1)), /or fewer/);
  assert.throws(() => basePairs('AUG'), /expects DNA/);
});

test('reverse transcription turns an mRNA into the DNA template and coding strands', async () => {
  const { reverseTranscribe, codingStrandFrom } = await import('../src/lib/molecular.mjs');
  const r = reverseTranscribe('AUGGCU');
  assert.deepEqual(r, { mrna: 'AUGGCU', template: 'TACCGA', template53: 'AGCCAT', coding: 'ATGGCT', at: 3, gc: 3, hydrogenBonds: 15 });
  // transcribing the DNA again gives back the mRNA, from either strand
  assert.equal(transcribe(r.coding), r.mrna);
  assert.equal(transcribe(codingStrandFrom(r.template, 'template')), r.mrna);
  assert.equal(transcribe(codingStrandFrom(r.template53, 'template53')), r.mrna);
  assert.equal(r.template, templateStrand(toCodingStrand('AUGGCU')));
  const demo = reverseTranscribe(transcribe(DEFAULT_SEQUENCE));
  assert.equal(demo.coding, DEFAULT_SEQUENCE);
  assert.equal(demo.template53, reverseComplement(DEFAULT_SEQUENCE));
  assert.throws(() => reverseTranscribe('ATGGCT'), /RNA uses U/);
  assert.throws(() => reverseTranscribe(''), /Enter a sequence/);
});

test('example links can open the replication mode, and plain links are unchanged', async () => {
  const { TOOL_MODES } = await import('../src/lib/molecular.mjs');
  assert.deepEqual(Object.keys(TOOL_MODES), ['translate', 'replicate']);
  const href = sequenceHref('', 'AGTCCGATA', 'coding', { mode: 'replicate' });
  assert.equal(href, '#seq=AGTCCGATA&strand=coding&mode=replicate');
  assert.deepEqual(parseSequenceHref(href), { seq: 'AGTCCGATA', kind: 'coding', fromStartCodon: false, mode: 'replicate' });
  assert.equal(sequenceHref('', 'ATG', 'coding', { mode: 'translate' }), '#seq=ATG&strand=coding');
  assert.equal(sequenceHref('', 'ATG', 'coding'), '#seq=ATG&strand=coding');
  assert.deepEqual(parseSequenceHref('#seq=ATG&strand=coding&mode=anything'), { seq: 'ATG', kind: 'coding', fromStartCodon: false });
});

test('the new worked examples, the replication section and the FAQ print what the functions return', async () => {
  const { readFileSync } = await import('node:fs');
  const { replicate, reverseTranscribe, anticodonRow, anticodonFor } = await import('../src/lib/molecular.mjs');
  const { faqs } = await import('../src/lib/faqs.mjs');
  const page = readFileSync(new URL('../src/pages/dna-transcription-translation.astro', import.meta.url), 'utf8');
  // worked example: mRNA 5′-AUG GCU UAA-3′ to tRNA
  assert.ok(page.includes("const toTrna = 'AUGGCUUAA'"));
  assert.deepEqual(anticodonRow(translate('AUGGCUUAA')), ['UAC', 'CGA', null]);
  assert.deepEqual(anticodonRow(translate('AUGGCUUAA'), '5to3'), ['CAU', 'AGC', null]);
  assert.deepEqual(abbrs(translate('AUGGCUUAA')), ['Met', 'Ala', 'Stop']);
  // worked example and table: the complementary strand of 5′-AGT CCG ATA-3′
  assert.ok(page.includes("replicate('AGTCCGATA')") && page.includes("reverseTranscribe('AUGGCU')"));
  const copied = replicate('AGTCCGATA');
  assert.deepEqual([copied.copy.seq, copied.copy.left, copied.copy.right, copied.copy53, copied.at, copied.gc], ['TCAGGCTAT', '3′', '5′', 'TATCGGACT', 5, 4]);
  // the title, H1 and URL of the page are unchanged
  assert.ok(page.includes('<Layout title="DNA to mRNA to Protein Converter: Transcription & Translation"'));
  assert.ok(page.includes('<h1>DNA to mRNA to protein converter: transcription and translation tool</h1>'));
  const description = page.match(/<Layout title="[^"]+"[^>]* description="([^"]+)"/)[1];
  assert.ok(description.length >= 120 && description.length <= 155, `description ${description.length}`);
  assert.match(description, /tRNA anticodons/);
  assert.match(description, /DNA replication/);
  // FAQ answers
  const answer = start => faqs['dna-transcription-translation'].find(f => f.question.startsWith(start)).answer;
  const trna = answer('How do you convert mRNA to tRNA');
  assert.ok(trna.includes(`5′-AUG-3′ is read by the anticodon 3′-${anticodonFor('AUG')}-5′`));
  assert.ok(trna.includes(`5′-GCC-3′ by 3′-${anticodonFor('GCC')}-5′`));
  assert.ok(trna.includes(`3′-${anticodonFor('AUG')}-5′ is 5′-${anticodonFor('AUG', '5to3')}-3′`));
  for (const stop of STOP_CODONS) assert.ok(trna.includes(stop));
  const copy = replicate('ATGC');
  assert.ok(answer('How do you find the complementary strand in DNA replication').includes(`For the strand 5′-ATGC-3′ the new strand is ${copy.copy.left}-${copy.copy.seq}-${copy.copy.right}, which reads 5′-${copy.copy53}-3′`));
  const back = reverseTranscribe('AUGGCU');
  assert.ok(answer('How do you convert mRNA to DNA').includes(`The mRNA 5′-${back.mrna}-3′ gives the coding strand 5′-${back.coding}-3′ and the template strand 3′-${back.template}-5′`));
});
