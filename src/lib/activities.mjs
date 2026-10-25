// Classroom activities: one printable student activity per tool, plus a teacher answer key. `ap` marks topics that AP Biology
// courses commonly cover (a description, not an endorsement).
// Every table cell in an answer key is the tool's own readout for that setting (computed below with the same functions the
// pages use). Each `checks` entry pairs a number or term printed in an answer with the value the site's modules compute;
// tests/activities.test.mjs fails if a printed answer drifts from the model.
import { explore, findExploration } from './explorations.mjs';
import { punnett, bloodTypeCross, hardyWeinberg, chiSquare } from './genetics.mjs';
import { DEFAULT_SEQUENCE, CODON_TABLE, STOP_CODONS, AMINO_ACID_BY_LETTER, codingStrandFrom, transcribe, codons, anticodons, translate, proteinSummary, compareCodingStrands } from './molecular.mjs';
import { logistic, exponential, doublingTime, timeToReach, afterDoublings, doublingTimes, formatCount } from './population.mjs';
import { organelleChart, cellTypes } from './organelles.mjs';
import { fmt, pct } from './format.mjs';
import { R as GAS_CONSTANT, solutePotential, kelvin } from './tools/water-potential.mjs';

// NGSS performance expectations referenced below, paraphrased.
export const standards = {
  'MS-LS1-1': 'Conduct an investigation to provide evidence that living things are made of cells.',
  'MS-LS1-2': 'Develop and use a model to describe the function of a cell as a whole and how parts of cells contribute to it.',
  'MS-LS3-2': 'Model why asexual reproduction gives genetically identical offspring and sexual reproduction gives genetic variation.',
  'HS-LS1-1': 'Explain how the structure of DNA determines the structure of proteins, which carry out the essential functions of life.',
  'HS-LS2-1': 'Use mathematical representations to support explanations of factors that affect the carrying capacity of ecosystems.',
  'HS-LS3-3': 'Apply concepts of statistics and probability to explain the variation and distribution of expressed traits in a population.',
};

// ---------- Readout helpers: the same functions and formatting the tool pages use ----------
/** Every metric an explorer shows for a setting, keyed by its label. */
function readouts(slug, mode, values) {
  const tool = findExploration(slug);
  const defaults = Object.fromEntries(tool.fields.map(f => [f.key, f.value]));
  return Object.fromEntries(explore(slug, { ...defaults, ...values }, mode).metrics.map(m => [m.label, m.value]));
}
/** Readouts for one of an explorer's named presets. */
function preset(slug, label) {
  const p = findExploration(slug).presets.find(x => x.label === label);
  if (!p) throw new Error(`${slug} has no preset “${label}”.`);
  return readouts(slug, p.mode, p.values);
}
/** Pick readouts by label, failing the build if the tool stops showing one. */
function pick(metrics, labels) {
  return labels.map(label => { if (!(label in metrics)) throw new Error(`No readout “${label}”.`); return metrics[label]; });
}
const spaced = seq => seq.match(/.{1,3}/g).join(' ');
// Population growth calculator tiles (PopulationGrowth.astro): whole individuals from 1,000 up.
const individuals = n => formatCount(n, Math.abs(n) >= 1000 ? 0 : 3);
// Hardy-Weinberg tiles (HardyWeinberg.astro): a frequency with its percentage.
const freq = x => `${fmt(x, 4)} (${pct(x, 2)})`;
// DNA translator tiles (DnaTranslator.astro), translating from nucleotide 1 in frame 1.
function dnaTiles(dna) {
  const rna = transcribe(dna), peptide = translate(rna), summary = proteinSummary(peptide);
  return [`${dna.length} nt`, String(summary.length), summary.terminated ? `${summary.stopCodon} at codon ${summary.stopIndex}` : peptide.length ? 'None in frame' : '—'];
}
const cross = (a, b) => { const r = punnett(a, b); return [r.genotypeRatio, r.phenotypeRatio, pct(r.recessiveFraction, 2)]; };
const bloodCross = (a, b) => { const r = bloodTypeCross(a, b); return [r.genotypeRatio, r.phenotypeRatio, pct(r.typeOFraction, 2)]; };
const hw = input => { const r = hardyWeinberg(input); return [fmt(r.p, 4), fmt(r.q, 4), freq(r.twoPq), r.chiSquare === undefined ? '—' : fmt(r.chiSquare, 3)]; };
const chart = name => { const row = organelleChart.find(r => r[0] === name); if (!row) throw new Error(`No organelle chart row ${name}.`); return [row[2], row[3], row[4]]; };

// ---------- Values quoted in the answers ----------
const town = timeToReach(20000, 210000, 0.12), townContinuous = timeToReach(20000, 210000, 0.12, { continuous: true });
const sixty = afterDoublings(1100, 60, 180), world = doublingTimes(0.013);
const rabbits5 = logistic(24, 1, 2000, 5), rabbits15 = logistic(24, 1, 2000, 15);
const demoRna = transcribe(DEFAULT_SEQUENCE), demo = proteinSummary(translate(demoRna));
const HBB = 'ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCC', HBS = 'ATGGTGCATCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCC';
const sickle = compareCodingStrands(HBB, HBS), sickleCodon = sickle.codonChanges[0];
const templateRna = transcribe(codingStrandFrom('TACGGACTT', 'template'));
const codonsFor = abbr => Object.entries(CODON_TABLE).filter(([, a]) => a.abbr === abbr).map(([codon]) => codon);
const peptide = proteinSummary(translate('AUGGCAUUCUAG'));
const tacCodon = transcribe(codingStrandFrom('TAC', 'template'));
const mono = punnett('Aa', 'Aa'), testCross = punnett('Aa', 'aa'), dihybrid = punnett('AaBb', 'AaBb'), blood = bloodTypeCross('AO', 'BO');
const mendel = chiSquare([705, 224], [3, 1]), poorFit = chiSquare([250, 150], [3, 1]), snapdragon = chiSquare([28, 55, 17], [1, 2, 1]), dihybridFit = chiSquare([315, 108, 101, 32], [9, 3, 3, 1]);
const hw09 = hardyWeinberg({ q2: 0.09 }), cf = hardyWeinberg({ q2: 0.0004 }), excess = hardyWeinberg({ counts: { AA: 30, Aa: 60, aa: 10 } });
const T25 = kelvin(25), sucrose = solutePotential(1, 0.1, T25), salt = solutePotential(2, 0.3, T25), turgidS = solutePotential(1, 0.3, T25), turgid = turgidS + 0.5;
const nacl05 = solutePotential(2, 0.5, T25), rbc = solutePotential(1, 0.3, kelvin(37));
const mm = (vmax, km, s) => vmax * s / (km + s);
const plantOnly = organelleChart.filter(r => r[3] === 'No' && r[4] === 'Yes').map(r => r[0]);
const animalOnly = organelleChart.filter(r => r[3] === 'Yes' && r[4] === 'No').map(r => r[0]);
const doubleMembrane = organelleChart.filter(r => r[5].startsWith('Double')).map(r => r[0]);

export const activities = [
{
  id: 'population-growth', path: '/population-growth-calculator/activity/', tool: { name: 'Population growth calculator', href: '/population-growth-calculator/' },
  title: 'Population Growth Activity', topic: 'Ecology', grade: 'Grades 9–12', minutes: 25, standards: ['HS-LS2-1'],
  goal: 'Use compound, exponential and logistic growth models to predict population size and doubling time, solve percentage-growth word problems, and explain the effect of carrying capacity.',
  uses: [['explorer:population-word-problems', '20,000 at 12%/yr → 210,000'], ['explorer:population-word-problems', '1,100 doubling every 60 yr, in 180 yr'], ['explorer:population-word-problems', '6.17 billion, r = 0.013'], ['component:PopulationGrowth', 'Rabbits on an island']],
  steps: [
    'In the word-problem solver further down the page, press “20,000 at 12%/yr → 210,000”. Record the time to reach N and the answer shown for a continuous rate.',
    'Press “1,100 doubling every 60 yr, in 180 yr” and record the population after 180 years.',
    'Press “6.17 billion, r = 0.013”. Record the doubling time for a continuous rate and the rule of 70 estimate.',
    'Scroll back up to the growth-curve calculator and press “Rabbits on an island” (logistic growth, K = 2,000). Record N after 15 years, then set Time t to 5 and record N again.',
  ],
  table: { setting: 'What to find', columns: ['Your result'], rows: [
    ['Years for 20,000 to reach 210,000 at 12% per year', pick(preset('population-word-problems', '20,000 at 12%/yr → 210,000'), ['Time to reach N'])],
    ['The same problem if 0.12 is a continuous rate', pick(preset('population-word-problems', '20,000 at 12%/yr → 210,000'), ['If 0.12 is a continuous rate r'])],
    ['Population of 1,100 after 180 years, doubling every 60 years', pick(preset('population-word-problems', '1,100 doubling every 60 yr, in 180 yr'), ['Population after 180 years'])],
    ['Doubling time if r = 0.013 is a continuous rate', pick(preset('population-word-problems', '6.17 billion, r = 0.013'), ['Doubling time if r = 0.013 is continuous'])],
    ['Rule of 70 estimate for 1.3% per year', pick(preset('population-word-problems', '6.17 billion, r = 0.013'), ['Rule of 70 estimate'])],
    ['Rabbits on an island: N after 15 years', [individuals(rabbits15)]],
    ['Rabbits on an island: N after 5 years', [individuals(rabbits5)]],
  ] },
  questions: [
    { q: 'Write the equation for the town problem using N = N₀(1 + r)^t, then show how taking logarithms gives the time. Round to the nearest year.', lines: 3,
      a: '210,000 = 20,000 × 1.12^t, so 1.12^t = 10.5. Taking natural logs: t = ln 10.5 ÷ ln 1.12 = 2.3514 ÷ 0.11333 = 20.75 years, about 21 years.',
      checks: [['10.5', 210000 / 20000], ['2.3514', Math.log(10.5)], ['0.11333', Math.log1p(0.12)], ['20.75', town], ['21', Math.round(town)]] },
    { q: 'Why is the continuous-rate answer (N = N₀e^(rt)) shorter than the compound answer for the same 12%?', lines: 2,
      a: 'Continuous growth compounds every instant, so e^0.12 = 1.1275: an effective 12.75% a year instead of 12%. Faster effective growth reaches 210,000 sooner, in 19.59 years instead of 20.75.',
      checks: [['1.1275', Math.exp(0.12)], ['12.75', Math.expm1(0.12) * 100], ['19.59', townContinuous], ['20.75', town]] },
    { q: 'A town of 1,100 doubles every 60 years. Without the calculator, explain why it has 8,800 people after 180 years.', lines: 2,
      a: '180 ÷ 60 = 3 doublings, and each doubling multiplies the population by 2, so N = 1,100 × 2³ = 1,100 × 8 = 8,800.',
      checks: [['3', sixty.doublings], ['8,800', sixty.N]] },
    { q: 'The rule of 70 says doubling time ≈ 70 ÷ (percent growth rate). How close is it to the exact answer for a continuous rate r = 0.013, and why does it work?', lines: 2,
      a: '70 ÷ 1.3 = 53.85 years, compared with ln 2 ÷ 0.013 = 53.32 years: about half a year apart. It works because ln 2 ≈ 0.693, which is close to 0.70.',
      checks: [['53.85', world.ruleOf70], ['53.32', world.continuous], ['0.693', Math.LN2]] },
    { q: 'Compare the rabbit population after 5 and after 15 years. Why does it grow so much in the first 5 years but barely change after 15? Use the term carrying capacity.', lines: 3,
      a: 'After 5 years N ≈ 1,286 (64.3% of K) and after 15 years N ≈ 2,000, essentially the carrying capacity K = 2,000. Early on resources are plentiful and growth is nearly exponential; as N approaches K, competition for food and space slows per-capita growth to almost zero.',
      checks: [['1,286', rabbits5], ['64.3', rabbits5 / 2000 * 100], ['2,000', rabbits15]] },
    { q: 'Challenge: logistic growth is fastest at N = K/2. For the rabbits, about when is that, and what is the fastest growth rate rK/4?', lines: 3,
      a: 't = ln((K − N₀) ÷ N₀) ÷ r = ln(1,976 ÷ 24) ÷ 1 = 4.41 years. The fastest growth is rK/4 = 1 × 2,000 ÷ 4 = 500 rabbits per year. The calculator shows both as Time to reach K/2 and Fastest growth.',
      checks: [['1,976', 2000 - 24], ['4.41', Math.log((2000 - 24) / 24)], ['500', 1 * 2000 / 4]] },
  ],
},
{
  id: 'dna-to-protein', path: '/dna-transcription-translation/activity/', tool: { name: 'DNA to mRNA converter', href: '/dna-transcription-translation/' },
  title: 'DNA to Protein Activity', topic: 'Molecular', grade: 'Grades 9–12', minutes: 25, standards: ['HS-LS1-1'],
  goal: 'Transcribe DNA into mRNA, translate codons into amino acids with tRNA anticodons, and explain how one base substitution causes sickle-cell hemoglobin.',
  uses: [['component:DnaTranslator', 'Start–stop demo'], ['component:DnaTranslator', 'β-globin (normal GAG)'], ['component:DnaTranslator', 'Sickle cell (GTG)']],
  steps: [
    'Press “Start–stop demo”. Record the length, the number of amino acids and the stop codon shown under the diagram.',
    'Press “β-globin (normal GAG)” and then “Sickle cell (GTG)”. Record the same three readouts for each, and compare codon 7 in the two chains of amino acids.',
    'Under What did you paste?, choose DNA template strand, 3′ → 5′. Type TACGGACTT and write down the mRNA and the amino acids for question 5.',
  ],
  table: { setting: 'Sequence', columns: ['Length', 'Amino acids', 'Stop codon'], rows: [
    ['Start–stop demo', dnaTiles(DEFAULT_SEQUENCE)],
    ['β-globin (normal GAG)', dnaTiles(HBB)],
    ['Sickle cell (GTG)', dnaTiles(HBS)],
  ] },
  questions: [
    { q: 'The demo’s coding strand begins 5′-ATG GCC-3′. Write the matching mRNA and tRNA anticodons for these two codons, and name the amino acids.', lines: 3,
      a: 'mRNA 5′-AUG GCC-3′ (copy the coding strand, with U in place of T). Anticodons 3′-UAC CGG-5′. AUG is methionine (Met, the start codon) and GCC is alanine (Ala).',
      checks: [['AUG GCC', spaced(demoRna.slice(0, 6))], ['UAC CGG', spaced(anticodons(demoRna).slice(0, 6))], ['Met', CODON_TABLE.AUG.abbr], ['Ala', CODON_TABLE.GCC.abbr]] },
    { q: 'How many codons does the 39-nucleotide demo contain, and why does its protein have only 7 amino acids?', lines: 2,
      a: '39 ÷ 3 = 13 codons, but the ribosome stops at the UGA stop codon, codon 8. A stop codon codes for no amino acid, so only codons 1–7 are translated: Met-Ala-Ile-Val-Met-Gly-Arg.',
      checks: [['39', DEFAULT_SEQUENCE.length], ['13', codons(demoRna).length], ['UGA', demo.stopCodon], ['8', demo.stopIndex], ['7', demo.length], ['Met-Ala-Ile-Val-Met-Gly-Arg', demo.abbrs]] },
    { q: 'Compare codon 7 of normal β-globin and of sickle-cell β-globin. What is the base change, and how does it change the protein?', lines: 3,
      a: 'Codon 7 changes from GAG to GUG, caused by an A → T substitution at nucleotide 20 of the DNA. GAG codes for glutamic acid (Glu) and GUG for valine (Val), so one amino acid changes: a missense mutation.',
      checks: [['GAG', sickleCodon.from], ['GUG', sickleCodon.to], ['20', sickle.substitutions[0].position], ['Glu', sickleCodon.aminoFrom.abbr], ['Val', sickleCodon.aminoTo.abbr], ['missense', sickleCodon.effect]] },
    { q: 'The sickle-cell protein is still 14 amino acids long here. Why does a substitution change only one amino acid, while deleting one base would change every codon after it?', lines: 3,
      a: 'A substitution swaps one base but leaves every codon in its group of three, so only codon 7 changes and the chain stays 14 amino acids long. Deleting a base shifts the reading frame, so every later codon is read in a new set of three: a frameshift.',
      checks: [['14', proteinSummary(translate(transcribe(HBS))).length]] },
    { q: 'You typed the template strand 3′-TACGGACTT-5′. What mRNA and amino acid sequence did you get?', lines: 2,
      a: 'mRNA 5′-AUG CCU GAA-3′ (each base pairs with its complement, with U opposite A). It codes for Met-Pro-Glu.',
      checks: [['AUG CCU GAA', spaced(templateRna)], ['Met-Pro-Glu', proteinSummary(translate(templateRna)).abbrs]] },
    { q: 'Challenge: valine is nonpolar, while glutamic acid is acidic and carries a negative charge. Suggest why this one change makes hemoglobin molecules stick together.', lines: 3,
      a: 'The charged glutamic acid on the protein’s surface helps keep hemoglobin dissolved. Valine is nonpolar (hydrophobic), so when oxygen is low the new patch sticks to a hydrophobic pocket on a neighboring hemoglobin molecule. The molecules join into long fibers that bend red blood cells into a sickle shape.',
      checks: [['nonpolar', AMINO_ACID_BY_LETTER.V.type]] },
  ],
},
{
  id: 'codon-chart', path: '/codon-chart/activity/', tool: { name: 'Codon chart', href: '/codon-chart/' },
  title: 'Codon Chart Activity', topic: 'Molecular', grade: 'Grades 9–12', minutes: 15, standards: ['HS-LS1-1'],
  goal: 'Read the genetic code from a codon chart, find every codon for an amino acid, and explain why 64 codons code for only 20 amino acids.',
  uses: [],
  steps: [
    'For each codon in the table, find its first base in the left column, its second base in the next column and its third base along the top of the chart. Record the amino acid’s three-letter and one-letter codes.',
    'Type Leu into Find a codon or an amino acid and count how many cells light up. Then try Met, Trp and stop.',
    'Use the chart to answer the translation questions, stopping at the first stop codon.',
  ],
  table: { setting: 'mRNA codon', columns: ['Amino acid (three-letter)', 'One-letter code'], rows: ['UGG', 'AUG', 'GCA', 'UUC', 'CCU', 'GAA', 'UAG'].map(c => [c, [CODON_TABLE[c].abbr, CODON_TABLE[c].letter === '*' ? 'none (stop)' : CODON_TABLE[c].letter]]) },
  questions: [
    { q: 'How many codons code for leucine (Leu)? How many code for methionine (Met) and for tryptophan (Trp)?', lines: 2,
      a: 'Leucine has 6 codons: UUA, UUG, CUU, CUC, CUA and CUG. Methionine (AUG) and tryptophan (UGG) have just 1 each.',
      checks: [['6', codonsFor('Leu').length], ['UUA, UUG, CUU, CUC, CUA and CUG', codonsFor('Leu').join(', ').replace(/, (\w+)$/, ' and $1')], ['1', codonsFor('Met').length], ['1', codonsFor('Trp').length]] },
    { q: 'Translate the mRNA 5′-AUG GCA UUC UAG-3′ into amino acids.', lines: 2,
      a: 'AUG = Met (the start codon), GCA = Ala and UUC = Phe. UAG is a stop codon, so the chain ends there: Met-Ala-Phe, 3 amino acids.',
      checks: [['Met-Ala-Phe', peptide.abbrs], ['3', peptide.length]] },
    { q: 'There are 64 codons but only 20 amino acids. How many codons code for amino acids, and what do the others do?', lines: 2,
      a: '61 codons code for amino acids and 3 (UAA, UAG and UGA) are stop signals. Most amino acids have more than one codon, so the code is redundant (degenerate).',
      checks: [['61', 64 - STOP_CODONS.length], ['3', STOP_CODONS.length], ['UAA, UAG and UGA', STOP_CODONS.join(', ').replace(/, (\w+)$/, ' and $1')]] },
    { q: 'Which three amino acids have six codons each?', lines: 1,
      a: 'Leucine, serine and arginine (Leu, Ser and Arg).',
      checks: [['Leu', codonsFor('Leu').length === 6 ? 'Leu' : ''], ['Ser', codonsFor('Ser').length === 6 ? 'Ser' : ''], ['Arg', codonsFor('Arg').length === 6 ? 'Arg' : '']] },
    { q: 'A DNA template strand reads 3′-TAC-5′. Which mRNA codon and amino acid does it give, and why must you transcribe it before using the chart?', lines: 2,
      a: 'The mRNA codon is AUG (each base pairs with its complement, with U opposite A), which codes for methionine, the start codon. The chart lists mRNA codons, so looking up TAC directly gives the wrong answer.',
      checks: [['AUG', tacCodon], ['methionine', CODON_TABLE[tacCodon].name.toLowerCase()]] },
    { q: 'Challenge: a mutation changes the codon UGG to UGA. What happens to the protein?', lines: 2,
      a: 'UGG codes for tryptophan, but UGA is a stop codon, so translation ends early. This nonsense mutation gives a shortened protein that usually does not work.',
      checks: [['tryptophan', CODON_TABLE.UGG.name.toLowerCase()], ['stop', CODON_TABLE.UGA.abbr.toLowerCase()]] },
  ],
},
{
  id: 'punnett-square', path: '/punnett-square-calculator/activity/', tool: { name: 'Punnett square calculator', href: '/punnett-square-calculator/' },
  title: 'Punnett Square Activity', topic: 'Genetics', grade: 'Grades 7–10', minutes: 20, standards: ['MS-LS3-2', 'HS-LS3-3'],
  goal: 'Predict genotype and phenotype ratios for monohybrid, dihybrid and blood-type crosses, and explain why a Punnett square gives probabilities rather than guarantees.',
  uses: [['punnett:mono', 'Aa × Aa'], ['punnett:mono', 'Aa × aa'], ['punnett:di', 'AaBb × AaBb'], ['punnett:blood', 'AO × BO']],
  steps: [
    'On the Monohybrid tab, press “Aa × Aa”. Record the genotype ratio, the phenotype ratio and the chance of the recessive phenotype. Repeat with “Aa × aa”.',
    'Type AA for Parent 1 and aa for Parent 2, and record the results.',
    'Switch to the Dihybrid tab and press “AaBb × AaBb”. Record the results.',
    'Switch to the Blood type tab and press “AO × BO”. Record the genotype ratio, the blood-type ratio and the chance of type O.',
  ],
  table: { setting: 'Cross', columns: ['Genotype ratio', 'Phenotype ratio', 'Chance of recessive (type O)'], rows: [
    ['Aa × Aa', cross('Aa', 'Aa')], ['Aa × aa', cross('Aa', 'aa')], ['AA × aa', cross('AA', 'aa')], ['AaBb × AaBb', cross('AaBb', 'AaBb')], ['AO × BO (blood type)', bloodCross('AO', 'BO')],
  ] },
  questions: [
    { q: 'Two Aa parents have three children who all show the dominant trait. What is the chance that their fourth child shows the recessive trait? Explain.', lines: 2,
      a: '25%, the same as for every child. Each fertilization is independent, so earlier children do not change the odds: 1 box out of 4 in the Punnett square is aa.',
      checks: [['25', mono.recessiveFraction * 100], ['4', mono.boxes]] },
    { q: 'Why does the test cross Aa × aa give a 1 : 1 ratio, and how could a breeder use a test cross to tell an AA parent from an Aa parent?', lines: 3,
      a: 'The aa parent makes only a gametes, so each child shows which allele came from the other parent: half dominant, half recessive (1 : 1). A dominant-looking parent that produces any recessive offspring in a test cross must be Aa; an AA parent gives only dominant offspring (AA × aa gives all Aa).',
      checks: [['1 : 1', testCross.phenotypeRatio]] },
    { q: 'For AaBb × AaBb, what fraction of the 16 boxes shows both recessive traits? Write it as a fraction and as a percentage, and give the phenotype ratio.', lines: 2,
      a: 'Only 1 of the 16 boxes (aabb), so 1/16 = 6.25%. The phenotype ratio is 9 : 3 : 3 : 1.',
      checks: [['16', dihybrid.boxes], ['6.25', dihybrid.recessiveFraction * 100], ['9 : 3 : 3 : 1', dihybrid.phenotypeRatio]] },
    { q: 'Check your dihybrid answer with the rule of multiplication: what is the chance of aa, of bb, and of both together?', lines: 2,
      a: 'Each gene on its own is an Aa × Aa cross, so P(aa) = 1/4 and P(bb) = 1/4. Because the genes assort independently, P(aabb) = 1/4 × 1/4 = 1/16 = 6.25%.',
      checks: [['6.25', mono.recessiveFraction ** 2 * 100]] },
    { q: 'A type A parent (AO) and a type B parent (BO) have children. Which blood types can the children have, and with what probability?', lines: 3,
      a: 'All four: A (AO), B (BO), AB and O (OO), each with a 25% chance, a 1 : 1 : 1 : 1 ratio. Neither parent is type O, but both carry the recessive O allele, so a type O child is possible.',
      checks: [['25', blood.typeOFraction * 100], ['1 : 1 : 1 : 1', blood.phenotypeRatio]] },
    { q: 'Challenge: from Aa × Aa crosses Mendel counted 705 purple and 224 white flowers. Is that close to 3 : 1? Check it with the chi-square calculator.', lines: 3,
      a: 'Yes. Expected counts are 929 × 3/4 = 696.75 purple and 929 × 1/4 = 232.25 white. The chi-square test gives χ² = 0.391, below the critical value 3.841, so the counts fit a 3 : 1 ratio.',
      checks: [['929', mendel.total], ['696.75', mendel.expected[0]], ['232.25', mendel.expected[1]], ['0.391', mendel.chi2], ['3.841', mendel.critical]] },
  ],
},
{
  id: 'hardy-weinberg', path: '/hardy-weinberg-calculator/activity/', tool: { name: 'Hardy-Weinberg calculator', href: '/hardy-weinberg-calculator/' },
  title: 'Hardy-Weinberg Activity', topic: 'Genetics', grade: 'Grades 10–12', minutes: 25, standards: ['HS-LS3-3'], ap: true,
  goal: 'Calculate allele and genotype frequencies with p + q = 1 and p² + 2pq + q² = 1, estimate how common carriers are, and use a chi-square test to decide whether a population is in equilibrium.',
  uses: [['component:HardyWeinberg', 'q² = 0.09'], ['component:HardyWeinberg', 'Cystic fibrosis ≈ 1 in 2,500'], ['component:HardyWeinberg', '49 · 42 · 9 (fits)'], ['component:HardyWeinberg', '30 · 60 · 10 (heterozygote excess)']],
  steps: [
    'Choose From recessive phenotype frequency q² and press “q² = 0.09”. Record p, q and 2pq.',
    'Press “Cystic fibrosis ≈ 1 in 2,500” and record the same values.',
    'Choose From observed genotype counts. Press “49 · 42 · 9 (fits)” and then “30 · 60 · 10 (heterozygote excess)”. Record p, q, 2pq and χ² for each.',
  ],
  table: { setting: 'Population', columns: ['p', 'q', '2pq (carriers)', 'χ² (counts only)'], rows: [
    ['q² = 0.09', hw({ q2: 0.09 })], ['Cystic fibrosis (q² = 1 in 2,500)', hw({ q2: 0.0004 })], ['Counts 49 · 42 · 9', hw({ counts: { AA: 49, Aa: 42, aa: 9 } })], ['Counts 30 · 60 · 10', hw({ counts: { AA: 30, Aa: 60, aa: 10 } })],
  ] },
  questions: [
    { q: 'In a population, 9% of individuals show a recessive trait. Show how to find q, p and the frequency of carriers.', lines: 3,
      a: 'Only aa individuals show the trait, so q² = 0.09 and q = √0.09 = 0.3. Then p = 1 − 0.3 = 0.7, and carriers are 2pq = 2 × 0.7 × 0.3 = 0.42, or 42% of the population.',
      checks: [['0.3', hw09.q], ['0.7', hw09.p], ['0.42', hw09.twoPq], ['42', hw09.twoPq * 100]] },
    { q: 'Cystic fibrosis affects about 1 in 2,500 newborns of European ancestry. What fraction of people are carriers? Give it as “about 1 in …”.', lines: 3,
      a: 'q² = 1 ÷ 2,500 = 0.0004, so q = 0.02 and p = 0.98. Carriers: 2pq = 2 × 0.98 × 0.02 = 0.0392, about 3.92% or roughly 1 in 26 people.',
      checks: [['0.0004', cf.q2], ['0.02', cf.q], ['0.98', cf.p], ['0.0392', cf.twoPq], ['3.92', cf.twoPq * 100], ['26', Math.round(1 / cf.twoPq)]] },
    { q: 'Why are there so many more carriers of cystic fibrosis than people who have it?', lines: 2,
      a: 'Most copies of a rare recessive allele are hidden in heterozygotes. With q = 0.02, carriers (2pq = 0.0392) outnumber affected people (q² = 0.0004) by 98 to 1, so selection against the affected phenotype removes the allele only very slowly.',
      checks: [['98', cf.twoPq / cf.q2]] },
    { q: 'For the counts 30 AA, 60 Aa and 10 aa, calculate p and the counts you would expect if the population were in equilibrium.', lines: 3,
      a: 'p = (2 × 30 + 60) ÷ (2 × 100) = 120 ÷ 200 = 0.6, so q = 0.4. Expected counts: AA = 0.36 × 100 = 36, Aa = 0.48 × 100 = 48 and aa = 0.16 × 100 = 16.',
      checks: [['120', excess.dominantAlleles], ['0.6', excess.p], ['0.4', excess.q], ['36', excess.expected.AA], ['48', excess.expected.Aa], ['16', excess.expected.aa]] },
    { q: 'Use χ² to decide whether the 30 · 60 · 10 population is in Hardy-Weinberg equilibrium. What might cause the excess of heterozygotes?', lines: 3,
      a: 'χ² = (30 − 36)²/36 + (60 − 48)²/48 + (10 − 16)²/16 = 1 + 3 + 2.25 = 6.25. With df = 1 the critical value is 3.841, and 6.25 is larger, so the population is not in equilibrium. Selection favoring heterozygotes (heterozygote advantage), non-random mating or migration could produce extra Aa individuals.',
      checks: [['2.25', excess.contributions.aa], ['6.25', excess.chiSquare], ['3.841', excess.critical]] },
    { q: 'List the five conditions for Hardy-Weinberg equilibrium. Which one does heterozygote advantage break?', lines: 3,
      a: 'A very large population, random mating, no mutation, no migration (gene flow) and no natural selection. Heterozygote advantage is a form of natural selection, so it breaks the “no selection” condition.',
      checks: [] },
  ],
},
{
  id: 'cell-size', path: '/tools/cell-size/activity/', tool: { name: findExploration('cell-size').title, href: '/tools/cell-size/' },
  title: 'Cell Size & SA:V Ratio Activity', topic: 'Cells', grade: 'Grades 7–10', minutes: 20, standards: [],
  goal: 'Calculate the surface area, volume and surface-area-to-volume ratio of model cells, and explain why most cells stay small.',
  uses: [['explorer:cell-size', 'Bacterium (1 µm across)'], ['explorer:cell-size', 'Animal cell (20 µm across)'], ['explorer:cell-size', 'Frog egg (1,000 µm across)'], ['explorer:cell-size', 'Plant cell (50 µm across)']],
  steps: [
    'Choose Cube-shaped cell and set Side length s to 1. Record the surface area, volume and SA : V ratio.',
    'Repeat with side lengths of 2 µm and 4 µm.',
    'Choose Spherical cell and press “Bacterium (1 µm across)”, “Animal cell (20 µm across)” and “Frog egg (1,000 µm across)” in turn. Record each result.',
    'For the challenge, press “Plant cell (50 µm across)” to check your answer.',
  ],
  table: { setting: 'Cell', columns: ['Surface area', 'Volume', 'SA : V ratio'], rows: [
    ['Cube, s = 1 µm', pick(readouts('cell-size', 'cube', { side: 1 }), ['Surface area', 'Volume', 'SA : V ratio'])],
    ['Cube, s = 2 µm', pick(readouts('cell-size', 'cube', { side: 2 }), ['Surface area', 'Volume', 'SA : V ratio'])],
    ['Cube, s = 4 µm', pick(readouts('cell-size', 'cube', { side: 4 }), ['Surface area', 'Volume', 'SA : V ratio'])],
    ['Bacterium (sphere, r = 0.5 µm)', pick(preset('cell-size', 'Bacterium (1 µm across)'), ['Surface area', 'Volume', 'SA : V ratio'])],
    ['Animal cell (sphere, r = 10 µm)', pick(preset('cell-size', 'Animal cell (20 µm across)'), ['Surface area', 'Volume', 'SA : V ratio'])],
    ['Frog egg (sphere, r = 500 µm)', pick(preset('cell-size', 'Frog egg (1,000 µm across)'), ['Surface area', 'Volume', 'SA : V ratio'])],
  ] },
  questions: [
    { q: 'What happened to the SA : V ratio each time you doubled the side of the cube? Use SA : V = 6 / s to explain.', lines: 2,
      a: 'It halved each time: 6, then 3, then 1.5 per µm. Surface area grows with s² but volume grows with s³, so the ratio 6s² ÷ s³ = 6/s falls as s grows.',
      checks: [['6', 6 / 1], ['3', 6 / 2], ['1.5', 6 / 4]] },
    { q: 'Calculate the surface area, volume and SA : V ratio of a spherical cell with a radius of 10 µm. Show your working.', lines: 3,
      a: 'SA = 4πr² = 4 × π × 10² = 1,256.6 µm². V = 4⁄3 πr³ = 4⁄3 × π × 10³ = 4,188.8 µm³. SA : V = 3/r = 0.3 per µm.',
      checks: [['1,256.6', 4 * Math.PI * 100], ['4,188.8', 4 / 3 * Math.PI * 1000], ['0.3', 3 / 10]] },
    { q: 'The bacterium has an SA : V ratio of 6 per µm and the frog egg 0.006 per µm. How many times larger is the bacterium’s ratio, and what does that mean for supplying each cell by diffusion?', lines: 3,
      a: '6 ÷ 0.006 = 1,000 times larger. Each cubic micrometer of the bacterium has 1,000 times more membrane for exchange, so diffusion supplies it easily. The center of the frog egg is 500 µm from the membrane, so the egg relies on its stored yolk and divides into many smaller cells as the embryo develops.',
      checks: [['6', 3 / 0.5], ['0.006', 3 / 500], ['1,000', (3 / 0.5) / (3 / 500)], ['500', 500]] },
    { q: 'Predict what happens to a cell’s SA : V ratio if it doubles in diameter, then check with the SA : V if twice as large readout.', lines: 2,
      a: 'It halves. For the 20 µm animal cell the ratio drops from 0.3 to 0.15 per µm, because doubling every length multiplies surface area by 4 but volume by 8.',
      checks: [['0.3', 3 / 10], ['0.15', 3 / 20], ['4', 2 ** 2], ['8', 2 ** 3]] },
    { q: 'Give two ways that real cells increase their surface area without becoming smaller, with an example of each.', lines: 3,
      a: 'Folding or extending the membrane, such as the microvilli on intestinal cells or root hairs on plant root cells. Taking a long, thin or flattened shape, such as neurons or the biconcave discs of red blood cells.',
      checks: [] },
    { q: 'Challenge: a cube-shaped cell has an SA : V ratio of 0.12 per µm. How long is its side?', lines: 2,
      a: 'SA : V = 6/s, so s = 6 ÷ 0.12 = 50 µm. The “Plant cell (50 µm across)” preset confirms 0.12 per µm.',
      checks: [['0.12', 6 / 50], ['50', 6 / 0.12]] },
  ],
},
{
  id: 'water-potential', path: '/tools/water-potential/activity/', tool: { name: findExploration('water-potential').title, href: '/tools/water-potential/' },
  title: 'Water Potential & Osmosis Activity', topic: 'Cells', grade: 'Grades 11–12', minutes: 20, standards: [], ap: true,
  goal: 'Calculate solute potential with Ψs = −iCRT and water potential with Ψ = Ψs + Ψp, and predict which way water moves by osmosis.',
  uses: [['explorer:water-potential', '0.1 M sucrose at 25 °C'], ['explorer:water-potential', '0.3 M NaCl (i = 2) at 25 °C'], ['explorer:water-potential', 'Turgid plant cell (0.3 M, Ψp = +0.5 MPa)'], ['explorer:water-potential', 'Compare: plant cell vs 0.5 M NaCl'], ['explorer:water-potential', 'Compare: red blood cell vs pure water']],
  steps: [
    'On the Single solution tab, press “0.1 M sucrose at 25 °C”, then “0.3 M NaCl (i = 2) at 25 °C” and “Turgid plant cell (0.3 M, Ψp = +0.5 MPa)”. Record Ψs, Ψp and Ψ for each.',
    'Switch to Compare two cells and press “Compare: plant cell vs 0.5 M NaCl”. Note Ψ for both cells and the net water movement.',
    'Press “Compare: red blood cell vs pure water” and note the same readouts.',
  ],
  table: { setting: 'Solution', columns: ['Solute potential Ψs', 'Pressure potential Ψp', 'Water potential Ψ'], rows: [
    '0.1 M sucrose at 25 °C', '0.3 M NaCl (i = 2) at 25 °C', 'Turgid plant cell (0.3 M, Ψp = +0.5 MPa)',
  ].map(label => [label, pick(preset('water-potential', label), ['Solute potential Ψs', 'Pressure potential Ψp', 'Water potential Ψ'])]) },
  questions: [
    { q: 'Show how the calculator finds Ψs for 0.1 M sucrose at 25 °C, using Ψs = −iCRT with R = 0.00831 L·MPa/(mol·K).', lines: 3,
      a: 'i = 1 (sucrose does not ionize), C = 0.1 mol/L and T = 25 + 273.15 = 298.15 K, so Ψs = −1 × 0.1 × 0.00831 × 298.15 = −0.248 MPa.',
      checks: [['0.00831', GAS_CONSTANT], ['298.15', T25], ['0.248', -sucrose]] },
    { q: 'Why is Ψs for 0.3 M NaCl six times more negative than for 0.1 M sucrose?', lines: 2,
      a: 'The concentration is 3 times higher, and NaCl splits into Na⁺ and Cl⁻ ions (i = 2), which doubles the number of solute particles again: 3 × 2 = 6. Ψs = −1.487 MPa compared with −0.248 MPa.',
      checks: [['6', salt / sucrose], ['1.487', -salt], ['0.248', -sucrose]] },
    { q: 'The turgid plant cell has Ψp = +0.5 MPa. What is its water potential, and what does the positive pressure potential represent?', lines: 2,
      a: 'Ψ = Ψs + Ψp = −0.743 + 0.5 = −0.243 MPa. The positive Ψp is turgor pressure: the cell wall pushing back on the swollen cell, which raises its water potential.',
      checks: [['0.743', -turgidS], ['0.243', -turgid]] },
    { q: 'The plant cell (Ψ = −0.243 MPa) is placed in 0.5 M NaCl. Which way does water move, and what happens to the cell?', lines: 3,
      a: 'The NaCl solution has Ψ = −2.478 MPa, lower than the cell’s −0.243 MPa, so water leaves the cell (water moves from higher to lower water potential). The cell loses turgor and can plasmolyze, its membrane pulling away from the wall.',
      checks: [['2.478', -nacl05], ['0.243', -turgid]] },
    { q: 'A red blood cell (Ψ = −0.773 MPa at 37 °C) is placed in pure water (Ψ = 0). Predict what happens, and explain why a plant cell in pure water does not do the same.', lines: 3,
      a: 'Water moves into the red blood cell, from 0 MPa toward −0.773 MPa. With no cell wall, pressure cannot build up to stop it, so the cell swells and can burst (hemolysis). A plant cell’s wall lets Ψp rise until the water potentials inside and outside are equal, so the cell becomes turgid instead of bursting.',
      checks: [['0.773', -rbc]] },
    { q: 'Challenge: what concentration of sucrose at 25 °C has the same water potential as the turgid plant cell (−0.243 MPa)?', lines: 2,
      a: 'Set −iCRT = −0.243 with i = 1: C = 0.243 ÷ (0.00831 × 298.15) = 0.098 mol/L, about 0.1 M.',
      checks: [['0.243', -turgid], ['0.098', -turgid / (GAS_CONSTANT * T25)]] },
  ],
},
{
  id: 'enzyme-kinetics', path: '/tools/enzyme-kinetics/activity/', tool: { name: findExploration('enzyme-kinetics').title, href: '/tools/enzyme-kinetics/' },
  title: 'Enzyme Kinetics Activity', topic: 'Molecular', grade: 'Grades 11–12', minutes: 20, standards: [],
  goal: 'Use the Michaelis–Menten equation to find reaction rates from Vmax, Km and substrate concentration, and compare how competitive and noncompetitive inhibitors change an enzyme.',
  uses: [['explorer:enzyme-kinetics', '[S] = Km (half of Vmax)'], ['explorer:enzyme-kinetics', 'Saturating: [S] = 10 × Km'], ['explorer:enzyme-kinetics', 'Competitive: [I] = Ki'], ['explorer:enzyme-kinetics', 'Competitive, outcompeted by 10 × Km substrate'], ['explorer:enzyme-kinetics', 'Noncompetitive: [I] = Ki'], ['explorer:enzyme-kinetics', 'Hexokinase (Km ≈ 0.05 mM) at 5 mM glucose']],
  steps: [
    'On the No inhibitor tab, press “[S] = Km (half of Vmax)” and then “Saturating: [S] = 10 × Km”. Record V, the apparent Km and the apparent Vmax.',
    'Switch to Competitive inhibitor and press “Competitive: [I] = Ki”, then “Competitive, outcompeted by 10 × Km substrate”. Record the same readouts.',
    'Switch to Noncompetitive inhibitor and press “Noncompetitive: [I] = Ki”. Record the same readouts.',
    'For the challenge, go back to No inhibitor and press “Hexokinase (Km ≈ 0.05 mM) at 5 mM glucose”.',
  ],
  table: { setting: 'Setting', columns: ['Reaction rate V', 'Apparent Km', 'Apparent Vmax'], rows: [
    '[S] = Km (half of Vmax)', 'Saturating: [S] = 10 × Km', 'Competitive: [I] = Ki', 'Competitive, outcompeted by 10 × Km substrate', 'Noncompetitive: [I] = Ki',
  ].map(label => [label, pick(preset('enzyme-kinetics', label), ['Reaction rate V', 'Apparent Km', 'Apparent Vmax'])]) },
  questions: [
    { q: 'When [S] = Km, the rate was exactly half of Vmax. Use V = Vmax[S] ÷ (Km + [S]) to show why.', lines: 2,
      a: 'With [S] = Km, V = Vmax × Km ÷ (Km + Km) = Vmax ÷ 2. Here 100 × 2 ÷ (2 + 2) = 50 µmol/min.',
      checks: [['50', mm(100, 2, 2)]] },
    { q: 'Raising [S] from 2 mM to 20 mM (10 times as much) only raised the rate from 50 to about 90.9 µmol/min. Why not 10 times faster?', lines: 3,
      a: 'At high [S] almost every active site is already occupied, so the enzyme is close to saturation and the rate levels off toward Vmax = 100 µmol/min: V = 100 × 20 ÷ (2 + 20) = 90.9 µmol/min.',
      checks: [['50', mm(100, 2, 2)], ['90.9', mm(100, 2, 20)], ['100', 100]] },
    { q: 'How did the competitive inhibitor change the apparent Km and Vmax, and why?', lines: 3,
      a: 'The apparent Km doubled from 2 to 4 mM, but Vmax stayed at 100 µmol/min. A competitive inhibitor competes with the substrate for the active site, so more substrate is needed to reach half speed, but enough substrate can still outcompete it.',
      checks: [['4', 2 * (1 + 1 / 1)], ['100', 100]] },
    { q: 'With the competitive inhibitor present, what happened to the rate when [S] rose to 20 mM? What does this show?', lines: 2,
      a: 'The rate rose from 33.3 to 83.3 µmol/min, close to the uninhibited 90.9. Flooding the enzyme with substrate overcomes a competitive inhibitor.',
      checks: [['33.3', mm(100, 4, 2)], ['83.3', mm(100, 4, 20)], ['90.9', mm(100, 2, 20)]] },
    { q: 'How did the noncompetitive inhibitor change Km and Vmax? Why can’t adding more substrate overcome it?', lines: 3,
      a: 'Vmax halved from 100 to 50 µmol/min while Km stayed at 2 mM, so the rate at [S] = Km fell to 25 µmol/min. The inhibitor binds elsewhere on the enzyme, not at the active site, and stops it working whether or not substrate is bound, so more substrate cannot reverse it.',
      checks: [['50', 100 / (1 + 1 / 1)], ['25', mm(50, 2, 2)]] },
    { q: 'Challenge: hexokinase has a Km of about 0.05 mM, and cells contain about 5 mM glucose. At what percentage of Vmax does it run?', lines: 2,
      a: 'V ÷ Vmax = [S] ÷ (Km + [S]) = 5 ÷ (0.05 + 5) = 0.990, so about 99% of Vmax. Glucose is at 100 times Km, so the enzyme is almost saturated.',
      checks: [['0.990', 5 / 5.05], ['99', 5 / 5.05 * 100], ['100', 5 / 0.05]] },
  ],
},
{
  id: 'bacterial-growth', path: '/tools/bacterial-growth/activity/', tool: { name: findExploration('bacterial-growth').title, href: '/tools/bacterial-growth/' },
  title: 'Bacterial Growth & Doubling Time Activity', topic: 'Cells', grade: 'Grades 9–12', minutes: 20, standards: [],
  goal: 'Model bacterial growth by binary fission with N = N₀ × 2ⁿ, calculate generation time from two counts, and explain why real cultures stop growing exponentially.',
  uses: [['explorer:bacterial-growth', 'E. coli · 20 min'], ['explorer:bacterial-growth', 'Vibrio natriegens · 10 min'], ['explorer:bacterial-growth', 'M. tuberculosis · 20 h'], ['explorer:bacterial-growth', 'Measured: 100 → 6,400 in 2 h']],
  steps: [
    'On Find the final population, press “E. coli · 20 min”. Record the number of generations, the final cells and the time to one million cells.',
    'Press “Vibrio natriegens · 10 min” and then “M. tuberculosis · 20 h”, and record the same readouts.',
    'Switch to Find the generation time and press “Measured: 100 → 6,400 in 2 h” to check your answer to question 4.',
  ],
  table: { setting: 'Culture (1,000 cells to start)', columns: ['Generations n', 'Final cells N', 'Time to one million cells'], rows: [
    'E. coli · 20 min', 'Vibrio natriegens · 10 min', 'M. tuberculosis · 20 h',
  ].map(label => [label, pick(preset('bacterial-growth', label), ['Generations n', 'Final cells N', 'Time to one million cells'])]) },
  questions: [
    { q: 'E. coli divides every 20 minutes. How many generations fit into 4 hours, and how many cells do 1,000 become? Show the calculation.', lines: 3,
      a: 'n = t ÷ g = 240 ÷ 20 = 12 generations, so N = 1,000 × 2¹² = 1,000 × 4,096 = 4,096,000 cells, about 4.1 × 10⁶.',
      checks: [['12', 240 / 20], ['4,096', 2 ** 12], ['4,096,000', 1000 * 2 ** 12]] },
    { q: 'Vibrio natriegens divides twice as fast, every 10 minutes. Does it make twice as many cells in 4 hours? Explain.', lines: 3,
      a: 'No, far more. It completes 24 generations instead of 12, so it grows by 2²⁴ instead of 2¹²: 2¹² = 4,096 times as many cells, about 1.68 × 10¹⁰.',
      checks: [['24', 240 / 10], ['4,096', 2 ** 24 / 2 ** 12], ['1.68', 1000 * 2 ** 24 / 1e10]] },
    { q: 'M. tuberculosis divides only about every 20 hours. How long do 1,000 cells take to reach a million? How does this help explain why tuberculosis develops slowly?', lines: 3,
      a: 'It needs log₂(1,000,000 ÷ 1,000) = 9.97 generations, which takes 9.97 × 20 h ≈ 199 hours, about 8.3 days. Because the bacteria multiply so slowly, an infection takes weeks to months to build up, and lab cultures take weeks to grow.',
      checks: [['9.97', Math.log2(1000)], ['199', Math.log2(1000) * 20], ['8.3', Math.log2(1000) * 20 / 24]] },
    { q: 'A culture grew from 100 to 6,400 cells in 2 hours. Find the generation time.', lines: 2,
      a: '6,400 ÷ 100 = 64 = 2⁶, so 6 generations happened in 120 minutes: g = 120 ÷ 6 = 20 minutes.',
      checks: [['64', 6400 / 100], ['6', Math.log2(64)], ['20', 120 / Math.log2(64)]] },
    { q: 'Why does a real culture in a flask stop growing exponentially? Name the phase that follows the log phase.', lines: 2,
      a: 'Nutrients run out and waste products build up, so the division rate falls until new cells only replace those that die: the stationary phase. Eventually the culture enters the death phase.',
      checks: [] },
    { q: 'Challenge: on the log-scale graph, exponential growth is a straight line. Why?', lines: 2,
      a: 'log₁₀ N = log₁₀ N₀ + n × log₁₀ 2, and n grows in step with time, so log N rises by the same amount (0.301) every generation, which makes a straight line.',
      checks: [['0.301', Math.log10(2)]] },
  ],
},
{
  id: 'chi-square-test', path: '/tools/chi-square-test/activity/', tool: { name: findExploration('chi-square-test').title, href: '/tools/chi-square-test/' },
  title: 'Chi-Square Test Activity', topic: 'Genetics', grade: 'Grades 10–12', minutes: 20, standards: ['HS-LS3-3'], ap: true,
  goal: 'Use the chi-square goodness-of-fit test to decide whether offspring counts fit an expected Mendelian ratio, and explain what the result does and does not show.',
  uses: [['explorer:chi-square-test', 'Mendel: 705 purple : 224 white'], ['explorer:chi-square-test', 'Poor fit: 250 : 150'], ['explorer:chi-square-test', 'Snapdragons: 28 red : 55 pink : 17 white'], ['explorer:chi-square-test', 'Mendel dihybrid: 315 : 108 : 101 : 32']],
  steps: [
    'On the 3 : 1 tab, press “Mendel: 705 purple : 224 white” and then “Poor fit: 250 : 150”. Record χ², the degrees of freedom, the critical value and the verdict.',
    'Switch to the 1 : 2 : 1 tab and press “Snapdragons: 28 red : 55 pink : 17 white”. Record the same readouts.',
    'Switch to the 9 : 3 : 3 : 1 tab and press “Mendel dihybrid: 315 : 108 : 101 : 32”. Record the same readouts.',
  ],
  table: { setting: 'Data', columns: ['χ²', 'Degrees of freedom', 'Critical value', 'Verdict'], rows: [
    'Mendel: 705 purple : 224 white', 'Poor fit: 250 : 150', 'Snapdragons: 28 red : 55 pink : 17 white', 'Mendel dihybrid: 315 : 108 : 101 : 32',
  ].map(label => [label, pick(preset('chi-square-test', label), ['Chi-square (χ²)', 'Degrees of freedom', 'Critical value (α = 0.05)', 'Verdict'])]) },
  questions: [
    { q: 'For 705 purple : 224 white, calculate the expected counts for a 3 : 1 ratio and then χ².', lines: 3,
      a: 'The total is 929, so expected purple = 929 × 3/4 = 696.75 and white = 929 × 1/4 = 232.25. χ² = (705 − 696.75)²/696.75 + (224 − 232.25)²/232.25 = 0.098 + 0.293 = 0.391.',
      checks: [['929', mendel.total], ['696.75', mendel.expected[0]], ['232.25', mendel.expected[1]], ['0.098', (705 - mendel.expected[0]) ** 2 / mendel.expected[0]], ['0.293', (224 - mendel.expected[1]) ** 2 / mendel.expected[1]], ['0.391', mendel.chi2]] },
    { q: 'Why is the 250 : 150 result rejected, even though it may not look far from 3 : 1?', lines: 3,
      a: 'The expected counts are 300 and 100, so both classes are 50 away from expected, which is large relative to the expected 100: χ² = 2,500/300 + 2,500/100 = 8.33 + 25 = 33.33, far above 3.841. A χ² that large would happen by chance less than 0.1% of the time.',
      checks: [['300', poorFit.expected[0]], ['100', poorFit.expected[1]], ['8.33', 2500 / 300], ['25', 2500 / 100], ['33.33', poorFit.chi2], ['3.841', poorFit.critical]] },
    { q: 'How do you find the degrees of freedom? Why does the critical value change between the 3 : 1, 1 : 2 : 1 and 9 : 3 : 3 : 1 tests?', lines: 3,
      a: 'df = number of classes − 1: 1 for 3 : 1, 2 for 1 : 2 : 1 and 3 for 9 : 3 : 3 : 1. With more classes χ² adds up more terms, so a larger total can happen by chance and the critical value rises: 3.841, 5.991 and 7.815 at α = 0.05.',
      checks: [['3.841', mendel.critical], ['5.991', snapdragon.critical], ['7.815', dihybridFit.critical]] },
    { q: 'Do the snapdragon counts (28 red : 55 pink : 17 white) support incomplete dominance with a 1 : 2 : 1 ratio?', lines: 2,
      a: 'Yes. χ² = 3.42 with df = 2 is below the critical value 5.991 (p ≈ 0.181), so the differences could be due to chance and the data fit 1 : 2 : 1.',
      checks: [['3.42', snapdragon.chi2], ['5.991', snapdragon.critical], ['0.181', snapdragon.pValue]] },
    { q: 'A “fits” verdict does not prove the hypothesis is true. Explain what it does tell you.', lines: 2,
      a: 'It means the differences between observed and expected counts are small enough to be explained by chance (p > 0.05), so we fail to reject the hypothesis. Another ratio might fit as well, and small samples make almost any ratio hard to reject.',
      checks: [] },
    { q: 'Challenge: Mendel’s dihybrid counts give χ² = 0.47. Is that a good fit? What would a χ² of exactly 0 mean?', lines: 2,
      a: 'Yes: 0.47 is far below the critical value 7.815 for df = 3, with p ≈ 0.925. A χ² of 0 would mean the observed counts exactly equal the expected counts, which is very unlikely in real data.',
      checks: [['0.47', dihybridFit.chi2], ['7.815', dihybridFit.critical], ['0.925', dihybridFit.pValue]] },
  ],
},
{
  id: 'magnification', path: '/tools/magnification-calculator/activity/', tool: { name: findExploration('magnification-calculator').title, href: '/tools/magnification-calculator/' },
  title: 'Microscope Magnification Activity', topic: 'Lab skills', grade: 'Grades 7–10', minutes: 20, standards: ['MS-LS1-1'],
  goal: 'Calculate magnification, actual size and image size with M = image size ÷ actual size, convert between millimeters and micrometers, and work out total microscope magnification.',
  uses: [['explorer:magnification-calculator', '20 mm drawing at 400×'], ['explorer:magnification-calculator', 'Red blood cell: 7.5 µm drawn 7.5 mm wide'], ['explorer:magnification-calculator', 'Bacterium: 2 µm at 1,000×'], ['explorer:magnification-calculator', '10× eyepiece · 40× objective'], ['explorer:magnification-calculator', '10× eyepiece · 4× scanning objective']],
  steps: [
    'On Find actual size, press “20 mm drawing at 400×” and record the actual size.',
    'Switch to Find magnification and press “Red blood cell: 7.5 µm drawn 7.5 mm wide”. Record the magnification.',
    'Switch to Find image size and press “Bacterium: 2 µm at 1,000×”. Record the image size.',
    'Switch to Total magnification and press “10× eyepiece · 40× objective”, then “10× eyepiece · 4× scanning objective”. Record the total magnification and field of view each time.',
  ],
  table: { setting: 'What to find', columns: ['Your result'], rows: [
    ['Actual size of a 20 mm drawing at 400×', pick(preset('magnification-calculator', '20 mm drawing at 400×'), ['Actual size'])],
    ['Magnification of a 7.5 µm cell drawn 7.5 mm wide', pick(preset('magnification-calculator', 'Red blood cell: 7.5 µm drawn 7.5 mm wide'), ['Magnification'])],
    ['Image size of a 2 µm bacterium at 1,000×', pick(preset('magnification-calculator', 'Bacterium: 2 µm at 1,000×'), ['Image size'])],
    ['Total magnification: 10× eyepiece, 40× objective', pick(preset('magnification-calculator', '10× eyepiece · 40× objective'), ['Total magnification'])],
    ['Field of view at that magnification', pick(preset('magnification-calculator', '10× eyepiece · 40× objective'), ['Field of view'])],
    ['Total magnification: 10× eyepiece, 4× objective', pick(preset('magnification-calculator', '10× eyepiece · 4× scanning objective'), ['Total magnification'])],
    ['Field of view at that magnification', pick(preset('magnification-calculator', '10× eyepiece · 4× scanning objective'), ['Field of view'])],
  ] },
  questions: [
    { q: 'A drawing of a cell is 20 mm wide at 400× magnification. Show how to find the cell’s actual size in micrometers.', lines: 2,
      a: 'Convert first: 20 mm × 1,000 = 20,000 µm. Actual size = image size ÷ magnification = 20,000 ÷ 400 = 50 µm.',
      checks: [['20,000', 20 * 1000], ['50', 20000 / 400]] },
    { q: 'A red blood cell 7.5 µm across is drawn 7.5 mm wide. A student says the magnification is 1×. What mistake did they make, and what is the right answer?', lines: 2,
      a: 'They divided without converting to the same unit. 7.5 mm = 7,500 µm, so M = 7,500 ÷ 7.5 = 1,000×.',
      checks: [['7,500', 7.5 * 1000], ['1,000', 7500 / 7.5]] },
    { q: 'How large does a 2 µm bacterium appear at 1,000×?', lines: 1,
      a: 'Image size = actual size × magnification = 2 µm × 1,000 = 2,000 µm, which is 2 mm.',
      checks: [['2,000', 2 * 1000], ['2', 2000 / 1000]] },
    { q: 'What is the total magnification with a 10× eyepiece and a 40× objective? How many 50 µm cells fit across the 450 µm field of view?', lines: 2,
      a: 'Total magnification = 10 × 40 = 400×. 450 ÷ 50 = 9 cells fit across the field.',
      checks: [['400', 10 * 40], ['9', 450 / 50]] },
    { q: 'When you switch from the 4× objective to the 40× objective, the magnification rises 10 times. What happens to the field of view?', lines: 2,
      a: 'It shrinks 10 times, from 4,500 µm (4.5 mm) to 450 µm, so you see a smaller area in more detail.',
      checks: [['4,500', 4.5 * 1000], ['450', 0.45 * 1000]] },
    { q: 'Challenge: a scale bar on a micrograph is labeled 20 µm and measures 8 mm on the page. What is the magnification?', lines: 2,
      a: '8 mm = 8,000 µm, so M = 8,000 ÷ 20 = 400×.',
      checks: [['8,000', 8 * 1000], ['400', 8000 / 20]] },
  ],
},
{
  id: 'cell-organelles', path: '/cells/activity/', tool: { name: 'Cell atlas', href: '/cells/' },
  title: 'Cell Organelles Activity', topic: 'Cells', grade: 'Grades 6–8', minutes: 20, standards: ['MS-LS1-2'],
  goal: 'Identify the main organelles of animal and plant cells, describe what each one does, and explain how the parts of a cell work together.',
  uses: [['cell:animal', cellTypes.animal.title], ['cell:plant', cellTypes.plant.title]],
  steps: [
    'In the labeled diagram, choose “Animal cell”. Click any organelle to open its page if you need more detail.',
    'Choose “Plant cell” and look for the structures that appear.',
    'Use the diagram and the organelle chart below it to fill in the table.',
  ],
  table: { setting: 'Organelle', columns: ['Main function', 'In animal cells?', 'In plant cells?'], rows: ['Nucleus', 'Mitochondrion', 'Chloroplast', 'Ribosome', 'Golgi apparatus', 'Lysosome', 'Vacuole', 'Cell wall'].map(name => [name, chart(name)]) },
  questions: [
    { q: 'Which structures did you find in the plant cell but not in the animal cell?', lines: 2,
      a: 'Chloroplasts, a cell wall and one large central vacuole. Animal cells have no chloroplasts or cell wall, and only small, temporary vacuoles.',
      checks: [], mentions: [...plantOnly, 'Vacuole'] },
    { q: 'Which structure did you find in the animal cell but not in the plant cell?', lines: 2,
      a: 'Centrioles, which organize the spindle when the cell divides. Lysosomes are also rare in plant cells, where the vacuole does much of the digesting.',
      checks: [], mentions: animalOnly },
    { q: 'Plant cells have chloroplasts. Why do they also need mitochondria?', lines: 3,
      a: 'Chloroplasts use light energy to make sugar by photosynthesis, but mitochondria break that sugar down in aerobic respiration to make ATP, the energy the cell uses day and night. Both animal and plant cells have mitochondria.',
      checks: [] },
    { q: 'Which three organelles are surrounded by a double membrane?', lines: 1,
      a: 'The nucleus, the mitochondrion and the chloroplast.',
      checks: [], mentions: doubleMembrane },
    { q: 'Follow a protein that the cell will release. List the organelles it passes through, in order, starting with its gene.', lines: 3,
      a: 'Nucleus (the gene is copied into mRNA) → ribosome on the rough endoplasmic reticulum (the protein is built and folded) → Golgi apparatus (it is modified, sorted and packaged) → vesicle → cell membrane (released by exocytosis).',
      checks: [] },
    { q: 'Challenge: ribosomes have no membrane. Why does every living cell, even a bacterium, have ribosomes?', lines: 2,
      a: 'Ribosomes translate mRNA into protein, and every cell must make proteins to survive. Prokaryotes and eukaryotes both have ribosomes, even though prokaryotes lack membrane-bound organelles.',
      checks: [] },
  ],
},
];

export const findActivity = id => activities.find(a => a.id === id);
/** The activity whose tool page is at href (e.g. '/tools/cell-size/'), if any. */
export const activityFor = href => activities.find(a => a.tool.href === href);
