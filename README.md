# Biology Lab

A complete static Astro website for interactive biology. All calculations run in the browser; there are no API keys, accounts, databases, or paid model calls. It is the biology sibling of [Geometry Lab](https://geometrylab.net) and shares its design system, page patterns, and SEO structure.

## Tools

- Punnett square calculator: monohybrid, dihybrid, and ABO/Rh blood-type crosses with color-coded grids, genotype and phenotype ratios, and worked steps. A compact version lives on the homepage.
- DNA transcription and translation: coding strand → template strand → mRNA → codons → amino acids, with reading frames, start-codon option, GC content, melting temperature, reverse complement, and a full 64-codon genetic code chart.
- Population growth calculator: exponential and logistic models with a live graph, doubling time, growth rate, and carrying-capacity milestones.
- Hardy–Weinberg calculator: allele and genotype frequencies from p, q², or observed counts, with a chi-square equilibrium test.
- Nine additional explorers: cell size (surface-area-to-volume), enzyme kinetics (Michaelis–Menten with inhibitors), dilutions (C₁V₁ = C₂V₂ and serial dilutions), magnification and scale bars, water potential and osmosis, bacterial growth and doubling time, energy pyramids and the 10% rule, chi-square tests for genetic ratios, and a predator–prey (Lotka–Volterra) simulator.
- Cell atlas: an interactive animal/plant cell diagram and eight organelle guides, each with structure, functions, a worked example, a common misconception, related organelles, and FAQs.
- Sixteen concept notes with a key equation, explanation, worked example, and pitfall, plus three guided learning paths.
- Practice studio: eight-question rounds drawn from 100 questions across cells, genetics, molecular biology, ecology, and physiology, with explanations, mistake review, focused retries, and device-local best scores.
- Worksheet builder with 8, 12, or 20 questions and an optional answer key.
- Printable diagrams: animal and plant cells to label, Punnett square grids, and a pedigree chart, with answer keys, SVG download, and print/PDF.
- Searchable catalog of every tool and collection, and prerendered FAQs (with FAQPage structured data) on the homepage, every calculator, every organelle page, and the printables page.

## Development

Requires Node.js 22 LTS or newer.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

The production output is `dist/`. JavaScript is delivered only for interactive components; lessons, FAQs, the codon chart, and the cell atlas remain readable without it. Tests cover genetics ratios, Hardy–Weinberg and chi-square values, the genetic code, growth models, every explorer's modes and presets, the practice bank, and cross-module link integrity.

## Configuration

`src/lib/site.mjs` holds the site-wide settings:

- `url`: the canonical production domain. The production domain is `https://thebiologylab.org`; canonical links, Open Graph URLs, robots.txt, and the sitemap use it. Keep the `biology` entry in `src/lib/learning-apps.mjs` in sync when changing domains.
- `analyticsId`: a Google Analytics 4 measurement ID. When it is empty, no analytics script is rendered at all.
- `contactEmail`: shown in the footer and on the About page.

No advertising scripts are installed. The layout leaves the page structure clean so ad slots can be added later to `src/layouts/Layout.astro` or individual pages.

## Deploy to Cloudflare Workers (Git integration)

This is a static Astro site. The root `wrangler.jsonc` tells Workers to upload `dist/`; it does not need a Worker script or an Astro server adapter. HTML routes use trailing slashes to match Astro's canonical URLs, and missing pages use the generated `404.html`.

Configure the connected Worker with:

- Root directory: repository root (`/`).
- Build command: `npm run build`.
- Deploy command: `npx wrangler deploy`.
- Non-production branch deploy command: `npx wrangler versions upload`.
- Node.js version: 22 (`NODE_VERSION=22`; also specified in `.nvmrc`).

The configured Worker name is `biology-lab`. If the existing Worker in Cloudflare has a different name, update `name` in `wrangler.jsonc` to match it. Use the branch containing this configuration for preview builds, then merge it into the configured production branch.

To validate the deployment configuration locally without uploading:

```sh
npm ci
npm run build
npx wrangler deploy --dry-run
```

Both deployment commands read the assets directory from the same configuration. Build first so `dist/` exists. Retrying an old commit without this file will still fail with “Missing entry-point to Worker script or to assets directory”.

References: [Workers static assets configuration](https://developers.cloudflare.com/workers/static-assets/binding/) and [HTML routing](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/).

## Deploy to Cloudflare Pages

1. Push this source to the GitHub repository.
2. In Cloudflare Pages, connect the repository and select the production branch.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Set `NODE_VERSION=22`.
6. Add the custom domain and make sure `url` in `src/lib/site.mjs` matches it, then rebuild.

No migrations or runtime bindings are required.

## Design and content

Warm paper surfaces, deep forest-green typography, leaf-green controls, and coral/sun accents: the same studio system as Geometry Lab with a biology palette. A live homepage experiment (the Punnett square) sits beside a compact introduction; tool, organelle, and lesson cards use line-drawn SVG previews. Responsive desktop/mobile layouts, labeled controls, visible focus indicators, reduced-motion support, native disclosure FAQs, and live calculation feedback.

Google Fonts supplies DM Sans and Manrope; system fonts are fallbacks. Calculator inputs, including typed DNA sequences, stay on-device. The About page explains model assumptions, rounding, local storage, and external font requests, and notes that nothing on the site is medical advice.

## Source structure

- `src/lib/genetics.mjs`, `molecular.mjs`, `population.mjs`: independently tested biology calculations.
- `src/lib/tools/*.mjs`: one module per generic explorer (`definition`, `explore`, `diagram`), registered in `src/lib/explorations.mjs`.
- `src/lib/organelles.mjs`, `lessons.mjs`, `practice.mjs`, `faqs.mjs`, `catalog.mjs`: editorial content and site map.
- `src/lib/format.mjs`, `svg.mjs`: shared formatting, validation, palette, and SVG chart helpers.
- `src/components`: Astro markup and progressively enhanced custom elements.
- `src/pages`: prerendered routes.
- `src/styles/global.css`: shared layout primitives and A4 print styles.
- `src/styles/studio.css`: the shared visual theme, responsive layouts, and practice states.
- `tests/*.test.mjs`: calculation and content regression tests.

For printables, use A4 or Letter paper at 100% scale, disable browser headers/footers, and verify the 20 mm reference line.

Do not commit `node_modules`, `dist`, `.env`, or local runtime files.
