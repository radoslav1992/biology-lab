// Molecular biology helpers shared by the DNA translator, practice questions, and worksheets.
// Conventions: DNA and RNA strings are written 5'→3' unless a function says otherwise. The coding
// (sense) strand carries the same sequence as the mRNA with T in place of U; the template strand is
// its complement and is what RNA polymerase actually reads, 3'→5'. Everything is pure and browser-safe.
export const MAX_LENGTH = 3000;
export const START_CODON = 'AUG';
export const STOP_CODONS = Object.freeze(['UAA', 'UAG', 'UGA']);
export const DEFAULT_SEQUENCE = 'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG';

/** Side-chain classes used to color amino acids (the grouping most introductory textbooks use). */
export const SIDE_CHAIN_TYPES = Object.freeze({
  nonpolar: 'Nonpolar (hydrophobic)',
  polar: 'Polar, uncharged',
  basic: 'Positively charged (basic)',
  acidic: 'Negatively charged (acidic)',
  stop: 'Stop signal',
});

/** The 20 standard amino acids: one-letter code, three-letter abbreviation, full name, side-chain class. */
export const AMINO_ACIDS = Object.freeze([
  { letter: 'A', abbr: 'Ala', name: 'Alanine', type: 'nonpolar' },
  { letter: 'R', abbr: 'Arg', name: 'Arginine', type: 'basic' },
  { letter: 'N', abbr: 'Asn', name: 'Asparagine', type: 'polar' },
  { letter: 'D', abbr: 'Asp', name: 'Aspartic acid', type: 'acidic' },
  { letter: 'C', abbr: 'Cys', name: 'Cysteine', type: 'polar' },
  { letter: 'Q', abbr: 'Gln', name: 'Glutamine', type: 'polar' },
  { letter: 'E', abbr: 'Glu', name: 'Glutamic acid', type: 'acidic' },
  { letter: 'G', abbr: 'Gly', name: 'Glycine', type: 'nonpolar' },
  { letter: 'H', abbr: 'His', name: 'Histidine', type: 'basic' },
  { letter: 'I', abbr: 'Ile', name: 'Isoleucine', type: 'nonpolar' },
  { letter: 'L', abbr: 'Leu', name: 'Leucine', type: 'nonpolar' },
  { letter: 'K', abbr: 'Lys', name: 'Lysine', type: 'basic' },
  { letter: 'M', abbr: 'Met', name: 'Methionine', type: 'nonpolar' },
  { letter: 'F', abbr: 'Phe', name: 'Phenylalanine', type: 'nonpolar' },
  { letter: 'P', abbr: 'Pro', name: 'Proline', type: 'nonpolar' },
  { letter: 'S', abbr: 'Ser', name: 'Serine', type: 'polar' },
  { letter: 'T', abbr: 'Thr', name: 'Threonine', type: 'polar' },
  { letter: 'W', abbr: 'Trp', name: 'Tryptophan', type: 'nonpolar' },
  { letter: 'Y', abbr: 'Tyr', name: 'Tyrosine', type: 'polar' },
  { letter: 'V', abbr: 'Val', name: 'Valine', type: 'nonpolar' },
].map(Object.freeze));

export const STOP = Object.freeze({ letter: '*', abbr: 'Stop', name: 'Stop', type: 'stop' });
export const AMINO_ACID_BY_LETTER = Object.freeze(Object.fromEntries(AMINO_ACIDS.map(a => [a.letter, a])));

// The standard genetic code in the conventional order: first base U, C, A, G; second base U, C, A, G;
// third base U, C, A, G. Read it as 16 rows of four: UUU UUC UUA UUG = F F L L, UCU…UCG = S S S S, and so on.
const BASES = 'UCAG';
const STANDARD_CODE = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';

/** All 64 RNA codons mapped to {name, abbr, letter, type}; the three stop codons map to STOP. */
export const CODON_TABLE = Object.freeze(Object.fromEntries([...STANDARD_CODE].map((letter, i) => {
  const codon = BASES[Math.floor(i / 16)] + BASES[Math.floor(i / 4) % 4] + BASES[i % 4];
  return [codon, letter === '*' ? STOP : AMINO_ACID_BY_LETTER[letter]];
})));

const listLetters = letters => letters.length > 1 ? `${letters.slice(0, -1).join(', ')}, and ${letters[letters.length - 1]}` : letters[0];

/**
 * Normalize a typed or pasted sequence: drop FASTA header lines, whitespace, and position numbers, then
 * uppercase. Throws a friendly Error for an empty sequence, one longer than MAX_LENGTH, or any letter
 * outside the alphabet (naming the first offender).
 */
export function cleanSequence(input, alphabet = 'ACGT') {
  const letters = [...String(alphabet).toUpperCase()];
  const allowed = new Set(letters);
  const raw = String(input ?? '').split(/\r?\n/).filter(line => !line.trimStart().startsWith('>')).join('').toUpperCase().replace(/[\s\d]/g, '');
  if (!raw) throw new Error(`Enter a sequence using the letters ${listLetters(letters)}.`);
  if (raw.length > MAX_LENGTH) throw new Error(`That sequence is ${raw.length.toLocaleString('en-US')} nucleotides long. Paste ${MAX_LENGTH.toLocaleString('en-US')} nucleotides or fewer.`);
  for (const ch of raw) {
    if (allowed.has(ch)) continue;
    const hint = ch === 'U' && !allowed.has('U') ? ' This box expects DNA: if you have an mRNA sequence, swap each U for T.'
      : ch === 'T' && !allowed.has('T') ? ' RNA uses U in place of T.'
        : ch === 'N' ? ' N marks an unknown base, which cannot be paired or translated.' : '';
    throw new Error(`"${ch}" is not a valid base here. Use only ${listLetters(letters)}.${hint}`);
  }
  return raw;
}

const PAIR = { A: 'T', T: 'A', C: 'G', G: 'C' };

/** Watson–Crick complement of a DNA strand, written in the same left-to-right order (so 5'→3' becomes 3'→5'). */
export const complement = dna => cleanSequence(dna).replace(/[ACGT]/g, base => PAIR[base]);

/** The complementary strand read in its own 5'→3' direction: the string you would get by sequencing the other strand. */
export const reverseComplement = dna => complement(dna).split('').reverse().join('');

/** Transcription: mRNA has the coding strand's sequence with uracil in place of thymine. */
export const transcribe = codingStrand => cleanSequence(codingStrand).replace(/T/g, 'U');

/** The template (antisense) strand aligned under the coding strand, i.e. written 3'→5'. */
export const templateStrand = codingStrand => complement(codingStrand);

/** Back-transcription: turn an mRNA sequence into the coding strand of DNA (U → T). */
export const toCodingStrand = rna => cleanSequence(rna, 'ACGU').replace(/U/g, 'T');

const checkFrame = frame => { if (![0, 1, 2].includes(frame)) throw new Error('Choose reading frame 1, 2, or 3.'); };

/** Split mRNA into complete triplets starting at offset `frame` (0, 1, or 2). Leftover bases are ignored. */
export function codons(rna, frame = 0) {
  const seq = cleanSequence(rna, 'ACGU');
  checkFrame(frame);
  const out = [];
  for (let i = frame; i + 3 <= seq.length; i += 3) out.push(seq.slice(i, i + 3));
  return out;
}

/** Index (0-based) of the first AUG anywhere in the mRNA, or -1. The ribosome's small subunit scans for it from the 5' end. */
export const findStartCodon = rna => cleanSequence(rna, 'ACGU').indexOf(START_CODON);

/**
 * Translate mRNA in a reading frame. Returns [{codon, amino, index, position}] where `index` is the 1-based codon
 * number in the frame and `position` the 1-based nucleotide where the codon starts. Translation stops after the
 * first stop codon (which is included). With fromStartCodon, codons before the first AUG in the frame are skipped;
 * if the frame has no AUG the result is empty.
 */
export function translate(rna, { frame = 0, fromStartCodon = false } = {}) {
  const list = codons(rna, frame);
  const start = fromStartCodon ? list.indexOf(START_CODON) : 0;
  if (start < 0) return [];
  const peptide = [];
  for (let i = start; i < list.length; i++) {
    const codon = list[i];
    const amino = CODON_TABLE[codon];
    peptide.push({ codon, amino, index: i + 1, position: frame + i * 3 + 1 });
    if (amino.letter === '*') break;
  }
  return peptide;
}

/** Convenience: transcribe a DNA coding strand and translate the result. */
export const translateDna = (codingStrand, options) => translate(transcribe(codingStrand), options);

/** Counts of each base in a DNA or RNA sequence, e.g. {A, C, G, T}. */
export function composition(seq) {
  const s = cleanSequence(seq, 'ACGTU');
  const counts = { A: 0, C: 0, G: 0 };
  counts[s.includes('U') && !s.includes('T') ? 'U' : 'T'] = 0;
  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
  return counts;
}

/** Fraction of bases that are G or C (0 to 1). GC pairs have three hydrogen bonds, so GC-rich DNA melts at a higher temperature. */
export function gcContent(seq) {
  const s = cleanSequence(seq, 'ACGTU');
  let gc = 0;
  for (const ch of s) if (ch === 'G' || ch === 'C') gc++;
  return gc / s.length;
}

/**
 * Primer melting temperature in °C. Short oligos (fewer than 14 nt) use the Wallace rule, Tm = 2(A+T) + 4(G+C).
 * Longer sequences use the salt-adjusted basic formula Tm = 64.9 + 41 × (G+C − 16.4) / N, valid around 50 mM Na+.
 */
export function meltingTemperature(seq) {
  const s = cleanSequence(seq, 'ACGTU');
  const n = s.length;
  let gc = 0;
  for (const ch of s) if (ch === 'G' || ch === 'C') gc++;
  if (n < 14) return 2 * (n - gc) + 4 * gc;
  return 64.9 + 41 * (gc - 16.4) / n;
}

/** Summarize a translate() result: residue count (stop excluded), one-letter and three-letter strings, and termination info. */
export function proteinSummary(peptide) {
  const residues = peptide.filter(p => p.amino.letter !== '*');
  const last = peptide[peptide.length - 1];
  const terminated = Boolean(last && last.amino.letter === '*');
  return {
    length: residues.length,
    letters: residues.map(p => p.amino.letter).join(''),
    abbrs: residues.map(p => p.amino.abbr).join('-'),
    codonsRead: peptide.length,
    terminated,
    stopCodon: terminated ? last.codon : null,
    stopIndex: terminated ? last.index : null,
    startsWithMet: residues.length > 0 && residues[0].amino.letter === 'M',
  };
}

/**
 * Compare two coding strands of equal length base by base and codon by codon in a frame. Returns
 * {substitutions:[{position, from, to}], codonChanges:[{codon, from, to, aminoFrom, aminoTo, effect}]} where
 * effect is 'silent' (same amino acid), 'missense' (different amino acid), 'nonsense' (new stop), or 'stop-loss'.
 */
export function compareCodingStrands(reference, variant, frame = 0) {
  const a = cleanSequence(reference), b = cleanSequence(variant);
  if (a.length !== b.length) throw new Error('Compare sequences of the same length so each base lines up with its partner.');
  const substitutions = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) substitutions.push({ position: i + 1, from: a[i], to: b[i] });
  const ca = codons(transcribe(a), frame), cb = codons(transcribe(b), frame);
  const codonChanges = [];
  ca.forEach((codon, i) => {
    if (codon === cb[i]) return;
    const aminoFrom = CODON_TABLE[codon], aminoTo = CODON_TABLE[cb[i]];
    const effect = aminoFrom.letter === aminoTo.letter ? 'silent' : aminoTo.letter === '*' ? 'nonsense' : aminoFrom.letter === '*' ? 'stop-loss' : 'missense';
    codonChanges.push({ codon: i + 1, from: codon, to: cb[i], aminoFrom, aminoTo, effect });
  });
  return { substitutions, codonChanges };
}
