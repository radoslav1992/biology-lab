// Extra material for each concept note at /learn/<slug>/: the meta description (120–155 characters, written for the
// search result rather than cut from the body), four or five key terms with definitions, and two check-your-understanding
// questions with worked answers. Facts are kept to what an introductory biology course teaches; tests/lesson-notes.test.mjs
// checks that every lesson has an entry, the description lengths, and the arithmetic in the numeric answers.
export const lessonNotes = {
  'cell-theory': {
    description: 'Cell theory explained: the three statements from Schleiden, Schwann and Virchow, why viruses are not cells, and how many cells a human body holds.',
    terms: [
      ['Cell', 'The smallest unit that can carry out every process of life on its own: taking in energy, growing, responding and reproducing.'],
      ['Unicellular and multicellular', 'Made of a single cell (bacteria, yeast, amoebas) or of many cells that specialize and work together (plants, animals, most fungi).'],
      ['Spontaneous generation', 'The disproven idea that living things arise from nonliving matter, such as maggots from rotting meat.'],
      ['Biogenesis', 'The principle that living things come only from other living things; for cells it is Virchow’s “omnis cellula e cellula”.'],
    ],
    check: [
      ['Why did Pasteur’s swan-neck flask experiment support cell theory?', 'Boiled broth in a flask with a long, curved neck stayed free of microbes, because dust and microbes from the air settled in the bend. When the neck was broken off, microbes soon grew. They came from existing microbes, not from the broth itself, which is the third statement of cell theory: cells come only from pre-existing cells.'],
      ['Is a mature red blood cell, which has no nucleus, an exception to cell theory?', 'No. A human red blood cell loses its nucleus as it matures, but it formed by the division of a stem cell in the bone marrow, it is bounded by a membrane, and it still carries out metabolism. Without a nucleus it cannot divide again, which is why red blood cells are constantly replaced from the marrow.'],
    ],
  },
  'prokaryotes-vs-eukaryotes': {
    description: 'Prokaryotes vs eukaryotes: nucleus, organelles, 70S vs 80S ribosomes, cell size and division compared, with a bacterial growth example and endosymbiosis.',
    terms: [
      ['Nucleoid', 'The region of a prokaryotic cell where its chromosome lies, with no membrane around it.'],
      ['Plasmid', 'A small, circular DNA molecule separate from the main chromosome, often carrying genes such as antibiotic resistance.'],
      ['Binary fission', 'Asexual division of a prokaryote into two identical cells after its chromosome has been copied.'],
      ['Peptidoglycan', 'The mesh of sugars and short amino acid chains that makes up a bacterial cell wall; penicillin works by blocking its construction.'],
      ['Endosymbiosis', 'The theory that mitochondria and chloroplasts descend from bacteria that were engulfed by an ancestral cell and kept alive inside it.'],
    ],
    check: [
      ['A cell has DNA, ribosomes and a cell wall but no nucleus. Is it a plant cell?', 'No. Plant cells have a nucleus and other membrane-bound organelles. A cell without a nucleus is a prokaryote: a bacterium or an archaeon. DNA, ribosomes, cytoplasm and a cell membrane are found in every cell, so they do not tell the two groups apart.'],
      ['Which features of mitochondria support the endosymbiotic theory?', 'Mitochondria have two membranes, their own circular DNA, and 70S ribosomes like those of bacteria, and new mitochondria arise only by the division of existing ones, much like binary fission. Chloroplasts share all of these features.'],
    ],
  },
  'cell-transport': {
    description: 'Cell transport and osmosis explained: diffusion, facilitated diffusion, active transport and water potential Ψ = Ψs + Ψp, with a worked plant cell example.',
    terms: [
      ['Concentration gradient', 'A difference in concentration between two regions; passive transport always moves a substance down it.'],
      ['Hypertonic, hypotonic, isotonic', 'A solution with more, less, or the same solute concentration as the cell. An animal cell shrinks in a hypertonic solution and swells in a hypotonic one.'],
      ['Plasmolysis', 'A plant cell’s membrane pulling away from its wall as the cell loses water in a hypertonic solution.'],
      ['Turgor pressure', 'The pressure of a plant cell’s contents against its wall when the cell is full of water; it keeps nonwoody plants upright.'],
      ['Endocytosis and exocytosis', 'Taking material into the cell, or releasing it, by wrapping it in a vesicle of membrane.'],
    ],
    check: [
      ['Red blood cells are placed in distilled water. What happens to them?', 'Distilled water is hypotonic to the cells: it has the higher water potential. Water enters the cells by osmosis, and with no cell wall to resist the pressure they swell and burst, which is called hemolysis.'],
      ['Why does facilitated diffusion need no ATP when active transport does?', 'Facilitated diffusion only lets a substance move down its concentration gradient, through a channel or carrier protein, so the gradient itself supplies the energy. Active transport moves a substance against its gradient, and that takes energy, usually from ATP.'],
    ],
  },
  'dna-structure': {
    description: 'DNA structure explained: nucleotides, the antiparallel double helix, A–T and G–C base pairing by hydrogen bonds, and Chargaff’s rules worked with numbers.',
    terms: [
      ['Nucleotide', 'The building block of DNA: a deoxyribose sugar, a phosphate group and one of four bases.'],
      ['Purine and pyrimidine', 'Double-ring bases (adenine and guanine) and single-ring bases (cytosine and thymine, with uracil in RNA). Each base pair joins one of each.'],
      ['Antiparallel', 'Running in opposite directions: one strand runs 5′→3′ while its partner runs 3′→5′.'],
      ['Complementary base pairing', 'A always pairs with T and G with C, so the sequence of one strand fixes the sequence of the other.'],
      ['Chromatin', 'DNA wound around histone proteins, the form in which DNA is packed inside the nucleus.'],
    ],
    check: [
      ['A double-stranded DNA sample is 18% cytosine. What percentage is adenine?', 'Guanine equals cytosine, so G + C = 18% + 18% = 36%. The remaining 64% is A + T, split equally, so adenine is 32%.'],
      ['What is the complementary strand of 5′-GATTACA-3′?', 'Swap each base for its partner (A↔T, G↔C) and keep the strands antiparallel: 3′-CTAATGT-5′. Written in the usual 5′→3′ direction, that is 5′-TGTAATC-3′.'],
    ],
  },
  'transcription-and-translation': {
    description: 'Transcription and translation explained: RNA polymerase, mRNA processing, codons, tRNA anticodons and the ribosome, with a worked DNA-to-protein example.',
    terms: [
      ['Promoter', 'The DNA sequence where RNA polymerase binds to start transcribing a gene.'],
      ['Template strand', 'The DNA strand RNA polymerase reads. The mRNA has the same sequence as the other, coding strand, with U in place of T.'],
      ['Codon', 'Three mRNA bases that specify one amino acid or a stop signal; there are 64 codons in all.'],
      ['Anticodon', 'The three bases on a transfer RNA that pair with a codon on the mRNA.'],
      ['Intron and exon', 'Parts of a eukaryotic gene that are cut out of the pre-mRNA (introns) or kept and joined together (exons).'],
    ],
    check: [
      ['A template strand reads 3′-TAC GGA TTC-5′. What are the mRNA and the amino acids?', 'Pair each base, with U for A: the mRNA is 5′-AUG CCU AAG-3′. From the genetic code, AUG is methionine, CCU is proline and AAG is lysine, so the chain is Met–Pro–Lys.'],
      ['Why does translation stop at a stop codon?', 'No tRNA has an anticodon that pairs with UAA, UAG or UGA. Instead a protein called a release factor binds the stop codon, and the finished polypeptide is released from the ribosome.'],
    ],
  },
  'mitosis-and-meiosis': {
    description: 'Mitosis vs meiosis explained: the phases, chromosome numbers from 2n to 2n and 2n to n, crossing over and independent assortment, worked for human cells.',
    terms: [
      ['Homologous chromosomes', 'A matching pair of chromosomes, one from each parent, carrying the same genes in the same order, possibly as different alleles.'],
      ['Sister chromatids', 'The two identical copies of a chromosome made in S phase, held together at the centromere until anaphase.'],
      ['Diploid and haploid', 'Having two sets of chromosomes (2n, 46 in human body cells) or one set (n, 23 in human eggs and sperm).'],
      ['Crossing over', 'The exchange of segments between homologous chromosomes in prophase I, which creates new combinations of alleles.'],
      ['Cytokinesis', 'The division of the cytoplasm that follows nuclear division and separates the daughter cells.'],
    ],
    check: [
      ['A cell with 2n = 8 goes through meiosis. How many chromosomes does each gamete get, and how many combinations can independent assortment produce?', 'Each gamete is haploid, with n = 4 chromosomes. The 4 homologous pairs line up independently in metaphase I, so there are 2⁴ = 16 possible combinations of chromosomes, before crossing over adds even more variety.'],
      ['Which stage of meiosis separates homologous chromosomes, and which separates sister chromatids?', 'Anaphase I pulls the homologous chromosomes of each pair to opposite poles. Anaphase II separates sister chromatids, just as anaphase does in mitosis.'],
    ],
  },
  'mendelian-inheritance': {
    description: 'Mendelian inheritance explained: alleles, dominance, genotype vs phenotype, the laws of segregation and independent assortment, and 3:1 and 9:3:3:1 ratios.',
    terms: [
      ['Allele', 'One version of a gene, such as the allele for purple flowers or the allele for white flowers.'],
      ['Homozygous and heterozygous', 'Carrying two identical alleles of a gene (AA or aa) or two different ones (Aa).'],
      ['Genotype and phenotype', 'The alleles an organism carries, and the trait it shows as a result.'],
      ['Test cross', 'Crossing an individual with the dominant phenotype to a homozygous recessive one to find out whether it is AA or Aa.'],
      ['F1 and F2', 'The first and second filial generations: the offspring of the parental cross, and the offspring of crossing the F1 with each other.'],
    ],
    check: [
      ['Two heterozygous tall pea plants (Tt × Tt) produce 400 offspring. About how many are dwarf?', 'The cross gives 1 TT : 2 Tt : 1 tt, and only tt plants are dwarf, so about 1/4 of 400 = 100 plants are dwarf.'],
      ['A purple-flowered plant crossed with a white-flowered plant (pp) gives 52 purple and 48 white offspring. What is the purple parent’s genotype?', 'Pp. A PP parent could pass on only P, so every offspring would be purple. A roughly 1 : 1 ratio is what a test cross gives when the dominant-looking parent is heterozygous.'],
    ],
  },
  'hardy-weinberg-principle': {
    description: 'The Hardy-Weinberg principle explained: p + q = 1, p² + 2pq + q² = 1, the five conditions for equilibrium, and a worked cystic fibrosis carrier example.',
    terms: [
      ['Allele frequency', 'The share of all copies of a gene in a population that are one particular allele: p for the dominant allele, q for the recessive one.'],
      ['Gene pool', 'All the alleles of all the genes in a population.'],
      ['Genetic drift', 'Random changes in allele frequencies from one generation to the next, strongest in small populations.'],
      ['Gene flow', 'The movement of alleles between populations when individuals migrate and breed.'],
      ['Carrier', 'A heterozygote (Aa) that carries a recessive allele without showing the recessive trait.'],
    ],
    check: [
      ['In a population, 16% of individuals show a recessive trait. What are p, q, and the share of heterozygotes?', 'The recessive phenotype is q² = 0.16, so q = √0.16 = 0.4 and p = 1 − 0.4 = 0.6. Heterozygotes make up 2pq = 2 × 0.6 × 0.4 = 0.48, or 48% of the population.'],
      ['If q = 0.1, how do carriers compare in number with affected individuals?', 'Affected individuals are q² = 0.01, or 1%. Carriers are 2pq = 2 × 0.9 × 0.1 = 0.18, or 18%, so carriers are 18 times as common as people who show the trait. This is why a recessive allele can hide in a population for many generations.'],
    ],
  },
  'natural-selection': {
    description: 'Natural selection explained: variation, heritability and unequal reproduction, what fitness means, and directional, stabilizing and disruptive selection.',
    terms: [
      ['Fitness', 'An individual’s reproductive success: how many offspring it leaves compared with others in the same population.'],
      ['Adaptation', 'A heritable trait that improves survival or reproduction in a particular environment.'],
      ['Directional, stabilizing and disruptive selection', 'Selection that favors one extreme of a trait, the average, or both extremes at once.'],
      ['Genetic drift', 'Change in allele frequencies by chance rather than by fitness, strongest in small populations.'],
      ['Artificial selection', 'Humans choosing which individuals breed, as in dog breeds and crop plants.'],
    ],
    check: [
      ['Antibiotic-resistant bacteria become common in a patient after a course of antibiotics. Did the antibiotic cause the resistance?', 'No. Resistant variants were already present, through random mutation or genes picked up from other bacteria. The antibiotic killed the susceptible cells, so the resistant ones survived and multiplied. Selection changed how common resistance was; it did not create it.'],
      ['Human birth weight is a classic example of which kind of selection?', 'Stabilizing selection. Babies of very low or very high birth weight historically had higher death rates, so selection favored weights near the average and kept the range narrow.'],
    ],
  },
  enzymes: {
    description: 'Enzymes explained: active sites, activation energy, induced fit, Vmax and Km in the Michaelis-Menten equation, inhibitors, and the effects of heat and pH.',
    terms: [
      ['Active site', 'The pocket on an enzyme where the substrate binds and the reaction takes place.'],
      ['Substrate', 'The molecule an enzyme acts on.'],
      ['Denaturation', 'The loss of an enzyme’s three-dimensional shape, and with it the active site, caused by heat or extreme pH.'],
      ['Competitive inhibitor', 'A molecule that competes with the substrate for the active site. Enough substrate outcompetes it, so Vmax is unchanged but the apparent Km rises.'],
      ['Noncompetitive inhibitor', 'A molecule that binds elsewhere on the enzyme and lowers Vmax however much substrate is present.'],
    ],
    check: [
      ['An enzyme has Vmax = 60 µmol/min and Km = 4 mM. What is the rate at [S] = 4 mM and at [S] = 12 mM?', 'Use v = Vmax[S] / (Km + [S]). At 4 mM, v = 60 × 4 / (4 + 4) = 30 µmol/min, half of Vmax, because [S] equals Km. At 12 mM, v = 60 × 12 / (4 + 12) = 45 µmol/min.'],
      ['Why does raising the temperature first speed up an enzyme reaction and then stop it?', 'Warmer molecules move faster and collide more often, so the rate rises up to the optimum, about 37 °C for many human enzymes. Above it the enzyme starts to denature: its shape changes, the active site no longer fits the substrate, and the rate falls steeply.'],
    ],
  },
  photosynthesis: {
    description: 'Photosynthesis explained: the light-dependent reactions in the thylakoids, the Calvin cycle in the stroma, the overall equation, and what limits the rate.',
    terms: [
      ['Chlorophyll', 'The green pigment in the thylakoid membranes; it absorbs mainly blue and red light and reflects green.'],
      ['Thylakoid', 'A flattened membrane sac inside the chloroplast where the light-dependent reactions happen; stacks of thylakoids are called grana.'],
      ['Stroma', 'The fluid around the thylakoids, where the Calvin cycle fixes CO₂ into sugar.'],
      ['RuBisCO', 'The enzyme that attaches CO₂ to RuBP in the Calvin cycle, often called the most abundant protein on Earth.'],
      ['Limiting factor', 'Whichever of light intensity, CO₂ concentration or temperature is in shortest supply, and so sets the rate of photosynthesis.'],
    ],
    check: [
      ['Where does the oxygen given off in photosynthesis come from?', 'From water. Photosystem II splits water molecules (photolysis) and releases their oxygen as O₂. Experiments in the 1940s that gave plants water labeled with the isotope oxygen-18 found the label in the oxygen they released.'],
      ['A plant’s rate of photosynthesis stops rising when the light gets brighter. What could be limiting it now?', 'Another factor is in short supply: usually the CO₂ concentration, or a temperature too low for the Calvin cycle enzymes to keep up. Only raising the limiting factor will raise the rate.'],
    ],
  },
  'cellular-respiration': {
    description: 'Cellular respiration explained: glycolysis, the Krebs cycle and the electron transport chain, where each happens, the ATP yield, and life without oxygen.',
    terms: [
      ['ATP', 'Adenosine triphosphate, the molecule cells spend for energy; removing its last phosphate group releases energy for work.'],
      ['NADH and FADH₂', 'Electron carriers loaded in glycolysis and the Krebs cycle that deliver electrons to the electron transport chain.'],
      ['Chemiosmosis', 'Making ATP as hydrogen ions flow back across a membrane through the enzyme ATP synthase.'],
      ['Fermentation', 'Recycling NAD⁺ without oxygen so glycolysis can continue; muscle cells make lactate, yeast makes ethanol and CO₂.'],
      ['Aerobic and anaerobic', 'Respiration that uses oxygen to accept electrons at the end of the chain, and the routes cells fall back on when oxygen runs out.'],
    ],
    check: [
      ['How much ATP does one glucose give without oxygen, and why so little?', 'Just 2 ATP, from glycolysis. Without oxygen to accept electrons at the end of the electron transport chain, the chain and the Krebs cycle stop, and fermentation only recycles NAD⁺ so that glycolysis can keep running.'],
      ['Where does the CO₂ you breathe out come from?', 'From the mitochondria: 2 CO₂ per glucose are released when pyruvate is converted to acetyl-CoA, and 4 more in the Krebs cycle, six in all, matching the six carbons of glucose. The blood carries the CO₂ to the lungs.'],
    ],
  },
  'population-growth': {
    description: 'Exponential vs logistic population growth explained: r, carrying capacity K, doubling time ln 2 / r, J- and S-shaped curves, and worked examples.',
    terms: [
      ['Per capita growth rate (r)', 'Births minus deaths per individual per unit of time, written as a decimal.'],
      ['Carrying capacity (K)', 'The largest population an environment can sustain over time with the food, water and space it has.'],
      ['Doubling time', 'The time an exponentially growing population takes to double: ln 2 / r ≈ 0.693 / r.'],
      ['Density-dependent factor', 'A limit whose effect grows as the population becomes more crowded, such as food shortage, disease or competition.'],
      ['Logistic growth', 'Growth that slows as the population nears its carrying capacity, giving an S-shaped curve.'],
    ],
    check: [
      ['A city of 700,000 people doubles in size every 41 years. What will its population be in 123 years?', 'Count the doublings: 123 ÷ 41 = 3. The population doubles three times, so it is multiplied by 2³ = 8: 700,000 × 8 = 5,600,000 people. In general, P = P₀ × 2^(t ÷ T).'],
      ['In the logistic model with K = 1,000, at what population size is growth fastest?', 'At N = K/2 = 500. There, dN/dt = rN(1 − N/K) reaches its maximum value of rK/4; below 500 there are fewer individuals breeding, and above it there is less room left to grow.'],
    ],
  },
  'energy-flow-in-ecosystems': {
    description: 'Energy flow in ecosystems explained: producers, consumers, trophic levels, the 10% rule, and why an energy pyramid is always upright, worked with numbers.',
    terms: [
      ['Trophic level', 'An organism’s feeding position in a food chain: producer, primary consumer, secondary consumer and so on.'],
      ['Producer (autotroph)', 'An organism that makes its own food, usually by photosynthesis.'],
      ['Decomposer', 'An organism such as a fungus or bacterium that breaks down dead matter and wastes, returning nutrients to the soil.'],
      ['Food web', 'The network of interconnected food chains in an ecosystem.'],
      ['Biomagnification', 'The rise in concentration of persistent toxins such as mercury or DDT at each higher trophic level.'],
    ],
    check: [
      ['Producers in a field store 50,000 kJ of energy. With 10% transfer, how much reaches the secondary consumers?', 'About 5,000 kJ (10% of 50,000) reaches the primary consumers, and 10% of that, 500 kJ, reaches the secondary consumers.'],
      ['Why are food chains rarely longer than four or five levels?', 'Each step passes on only about 10% of the energy, so after four or five steps too little is left to support a population of top predators.'],
    ],
  },
  'surface-area-to-volume': {
    description: 'Surface area to volume ratio in cells: SA:V = 6/s for a cube and 3/r for a sphere, why it limits cell size, and how cells and organisms get around it.',
    terms: [
      ['Surface area', 'The total area of a cell’s outer membrane, across which everything enters and leaves.'],
      ['Diffusion distance', 'How far a molecule must travel. Diffusion is fast over a few micrometers but far too slow over millimeters.'],
      ['Microvilli', 'Tiny finger-like folds of the cell membrane that increase surface area, as on the cells lining the small intestine.'],
      ['Exchange surface', 'A specialized surface such as the alveoli of the lungs, fish gills or root hairs that gives a large organism enough area.'],
    ],
    check: [
      ['What is the SA:V ratio of a cube-shaped cell with sides of 2 µm, and of one with sides of 4 µm?', 'For the 2 µm cube, SA = 6 × 2² = 24 µm² and V = 2³ = 8 µm³, so SA:V = 3 : 1. For the 4 µm cube, SA = 96 µm² and V = 64 µm³, so SA:V = 1.5 : 1. Doubling the side halves the ratio, as 6 / s predicts.'],
      ['Why do elephants have large, thin ears?', 'A large animal has a low surface area to volume ratio, so it loses heat slowly. Thin ears full of blood vessels add a lot of surface for very little volume, which helps an elephant shed heat.'],
    ],
  },
  'lab-measurements': {
    description: 'Lab measurements explained: magnification = image ÷ actual size, converting mm, µm and nm, scale bars, resolution and C₁V₁ = C₂V₂ dilutions, with examples.',
    terms: [
      ['Magnification', 'How many times larger the image is than the real object.'],
      ['Resolution', 'The smallest distance between two points that can still be seen as separate: about 200 nm for a light microscope.'],
      ['Micrometer (µm)', 'One thousandth of a millimeter; most cells measure between 1 and 100 µm.'],
      ['Field of view', 'The circle of the specimen visible through the eyepiece; it gets smaller as the magnification goes up.'],
      ['Serial dilution', 'Repeating the same dilution step several times, such as three 1 : 10 dilutions for a total dilution of 1 : 1,000.'],
    ],
    check: [
      ['A drawing of a cell is 50 mm wide and the real cell is 25 µm wide. What is the magnification?', 'Put both sizes in the same unit first: 50 mm = 50,000 µm. Magnification = image size ÷ actual size = 50,000 ÷ 25 = ×2,000.'],
      ['How do you make 50 mL of a 0.2 M solution from a 1 M stock?', 'Rearrange C₁V₁ = C₂V₂: V₁ = C₂V₂ ÷ C₁ = 0.2 × 50 ÷ 1 = 10 mL of stock. Add 40 mL of water to bring the volume to 50 mL.'],
    ],
  },
};
