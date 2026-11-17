// Sibling tools: on each calculator page, the two or three other tools a student working on the same problem is most
// likely to need next, each with the reason as a sentence. Concept notes and organelle pages are linked separately
// (every tool links its lesson, and organelle pages link the tool that names them), so this only joins tool to tool.
// tests/site.test.mjs checks that every target exists and that no tool lists itself.
export const relatedTools = {
  '/population-growth-calculator/': [
    ['/tools/bacterial-growth/', 'Bacteria double on a fixed schedule too: find a generation time from two plate counts.'],
    ['/tools/predator-prey/', 'See what happens when a growing population is also being eaten, in the Lotka–Volterra model.'],
    ['/tools/energy-pyramid/', 'Food sets a ceiling on numbers: only about 10% of the energy at one trophic level reaches the next.'],
  ],
  '/tools/cell-size/': [
    ['/tools/magnification-calculator/', 'Measure a real cell first: convert image size to actual size in µm with the magnification.'],
    ['/tools/water-potential/', 'What crosses that surface: work out which way water moves by osmosis.'],
  ],
  '/tools/enzyme-kinetics/': [
    ['/tools/dilution-calculator/', 'Make the substrate concentrations for a rate experiment with C₁V₁ = C₂V₂ or a serial dilution.'],
    ['/dna-transcription-translation/', 'Most enzymes are proteins: follow a gene from DNA to the amino acid chain that folds into one.'],
  ],
  '/tools/dilution-calculator/': [
    ['/tools/bacterial-growth/', 'Serial dilutions are how bacteria are counted: turn two counts into a doubling time.'],
    ['/tools/water-potential/', 'Use a solution’s molarity to find its solute potential with Ψs = −iCRT.'],
    ['/tools/enzyme-kinetics/', 'Plot reaction rate against the substrate concentrations you prepared.'],
  ],
  '/tools/magnification-calculator/': [
    ['/tools/cell-size/', 'Turn a measured cell size into surface area, volume and the SA:V ratio.'],
    ['/tools/dilution-calculator/', 'The other everyday lab calculation: diluting a stock solution.'],
  ],
  '/tools/water-potential/': [
    ['/tools/cell-size/', 'Why small cells exchange water and solutes faster: the surface area to volume ratio.'],
    ['/tools/dilution-calculator/', 'Make the sucrose or salt solutions for an osmosis practical from one stock.'],
  ],
  '/tools/bacterial-growth/': [
    ['/population-growth-calculator/', 'The same doubling arithmetic for towns and cities: N = N₀ × 2^(t/T) and percentage growth.'],
    ['/tools/dilution-calculator/', 'Plan the serial dilution that gives a countable plate.'],
  ],
  '/tools/energy-pyramid/': [
    ['/tools/predator-prey/', 'Watch predator and prey numbers cycle when one level feeds on the next.'],
    ['/population-growth-calculator/', 'Model how a population grows toward the carrying capacity its food supply allows.'],
  ],
  '/tools/chi-square-test/': [
    ['/punnett-square-calculator/', 'Get the expected ratio to test: cross two parents in a Punnett square.'],
    ['/hardy-weinberg-calculator/', 'Test whether a population’s genotype counts fit Hardy–Weinberg equilibrium.'],
  ],
  '/tools/predator-prey/': [
    ['/population-growth-calculator/', 'Each population on its own: exponential and logistic growth with a carrying capacity.'],
    ['/tools/energy-pyramid/', 'Why there are always fewer predators than prey: energy lost between trophic levels.'],
  ],
};

// Concept notes for the top-level calculators, main one first (the /tools/ explorers name theirs in their definition).
// Each lesson page links back to every calculator listed under it.
export const calculatorLessons = {
  '/punnett-square-calculator/': ['mendelian-inheritance', 'mitosis-and-meiosis'],
  '/hardy-weinberg-calculator/': ['hardy-weinberg-principle', 'natural-selection'],
  '/dna-transcription-translation/': ['transcription-and-translation', 'dna-structure'],
  '/codon-chart/': ['transcription-and-translation'],
  '/population-growth-calculator/': ['population-growth'],
  '/cells/': ['cell-theory', 'prokaryotes-vs-eukaryotes'],
};
