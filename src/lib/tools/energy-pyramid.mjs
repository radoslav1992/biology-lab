// Energy pyramid explorer: how much energy reaches each trophic level when only a fraction is passed on (the 10% rule).
import { fmt, pct, palette } from '../format.mjs';
import { text, line, polygon, arrow } from '../svg.mjs';
import { energyPyramid } from '../population.mjs';

const field = (key, label, unit, value, min, max, step = 'any') => ({ key, label, unit, value, min, max, step });
const FILLS = [palette.leaf, palette.sun, palette.coral, palette.sky, palette.plum];
const INK = [palette.white, palette.ink, palette.white, palette.white, palette.white];
const EXAMPLES = ['grass, algae, trees', 'grasshoppers, rabbits', 'frogs, small fish', 'hawks, large fish', 'eagles, orcas'];

export const definition = {
  slug: 'energy-pyramid',
  title: 'Energy pyramid & the 10% rule',
  seoTitle: 'Energy Pyramid Calculator — The 10% Rule Across Trophic Levels',
  category: 'Ecology',
  icon: '▲',
  description: 'Enter the energy captured by producers and a transfer efficiency to see how much reaches each consumer level, how much is lost, and why food chains stay short.',
  keywords: 'trophic level ten percent rule producers primary secondary tertiary consumers energy transfer efficiency food chain ecological pyramid',
  meta: '10% rule · 2 to 5 levels',
  fields: [
    field('energy', 'Energy stored in producers', 'kJ', 10000, 1, 1e9),
    field('levels', 'Number of trophic levels', '', 4, 2, 5, 1),
    field('efficiency', 'Transfer efficiency', '%', 10, 1, 50),
  ],
  presets: [
    { label: '10% rule', values: { energy: 10000, levels: 4, efficiency: 10 } },
    { label: 'Efficient pond · 20%', values: { energy: 10000, levels: 4, efficiency: 20 } },
    { label: 'Inefficient · 5%', values: { energy: 10000, levels: 4, efficiency: 5 } },
    { label: 'Five levels · 1,000,000 kJ', values: { energy: 1000000, levels: 5, efficiency: 10 } },
  ],
  formula: 'Eₙ₊₁ = efficiency × Eₙ   (10% rule: Eₙ₊₁ = 0.1 × Eₙ)',
  note: 'Roughly 10% of the energy stored in one trophic level ends up stored in the biomass of the next. The rest is released as heat by respiration or remains in uneaten material, feces and dead tissue that decomposers use. Real ecological efficiencies range from about 5% to 20%.',
  lesson: 'energy-flow-in-ecosystems',
  caption: 'Bar widths use a log scale so the top level stays visible · each bar shows the energy stored at that level',
  diagramLabel: 'Ecological pyramid of energy with one trapezoid per trophic level, labeled with the level name and its energy in kilojoules',
  controlsTitle: 'Your ecosystem',
  explanationTitle: 'Why the pyramid narrows',
};

export function explore(values) {
  const efficiency = values.efficiency / 100;
  const r = energyPyramid(values.energy, values.levels, efficiency);
  const first = r.levels[0], top = r.levels[r.levels.length - 1];
  const metrics = r.levels.map(l => ({ label: `${l.name} (level ${l.level})`, value: `${fmt(l.energy, 2)} kJ` }));
  metrics.push({ label: 'Total energy lost', value: `${fmt(r.lost, 2)} kJ (${pct(r.lost / first.energy, 2)})` });
  const chain = r.levels.slice(1).map((l, i) => `E${l.level} = ${fmt(r.levels[i].energy, 2)} × ${fmt(efficiency, 2)} = ${fmt(l.energy, 2)} kJ`).join('; ');
  const steps = [
    `Producers store ${fmt(first.energy, 2)} kJ from photosynthesis. Each transfer keeps ${fmt(values.efficiency, 1)}% (a fraction of ${fmt(efficiency, 2)}) of the energy stored in the level below: ${chain}.`,
    `In general Eₙ = E₁ × ${fmt(efficiency, 2)}^(n − 1). The top level, ${top.name.toLowerCase()}, holds ${fmt(top.energy, 2)} kJ, which is ${pct(top.energy / first.energy, 3)} of what the producers captured.`,
    `Energy lost along the chain: ${fmt(first.energy, 2)} − ${fmt(top.energy, 2)} = ${fmt(r.lost, 2)} kJ (${pct(r.lost / first.energy, 2)}). At every level most energy leaves as heat from cellular respiration, or stays in uneaten parts, feces and remains that feed decomposers instead of the next consumer.`,
    `Another level on top would receive only ${fmt(top.energy * efficiency, 2)} kJ. That shrinking supply is why food chains rarely run past four or five links, why top predators are rare, and why eating lower on the food chain feeds more people per hectare.`,
  ];
  return { metrics, steps, model: { levels: r.levels.map(l => ({ level: l.level, name: l.name, energy: l.energy })), efficiency: values.efficiency, lost: r.lost } };
}

export function diagram(m) {
  const n = m.levels.length, cx = 430, wMax = 400, wMin = 120;
  const logs = m.levels.map(l => Math.log10(l.energy));
  const hi = logs[0], lo = logs[n - 1] - 0.6;
  const width = e => wMin + (wMax - wMin) * (Math.log10(e) - lo) / (hi - lo);
  const bandH = Math.min(84, 360 / n), baseY = 470;
  let out = text(cx, 30, 'Energy stored at each trophic level', { size: 15, weight: 700, color: palette.ink });
  out += text(cx, 50, `${fmt(m.efficiency, 1)}% of each level's energy reaches the next · ${fmt(100 - m.efficiency, 1)}% is lost on the way`, { size: 12 });
  m.levels.forEach((l, i) => {
    const y1 = baseY - i * bandH, y0 = y1 - bandH + 4;
    const wb = width(l.energy), wt = i < n - 1 ? width(m.levels[i + 1].energy) : wb * 0.55;
    out += polygon([[cx - wb / 2, y1], [cx + wb / 2, y1], [cx + wt / 2, y0], [cx - wt / 2, y0]], { fill: FILLS[i], stroke: palette.white, width: 2, opacity: 0.95 });
    out += text(cx, y0 + (y1 - y0) / 2 + 5, `${fmt(l.energy, 2)} kJ`, { size: 14, weight: 700, color: INK[i] });
    out += text(24, y0 + (y1 - y0) / 2 - 2, `${l.level}. ${l.name}`, { size: 13, weight: 700, anchor: 'start', color: palette.ink });
    out += text(24, y0 + (y1 - y0) / 2 + 16, EXAMPLES[i], { size: 12, anchor: 'start', color: palette.muted });
    if (i < n - 1) {
      // The loss arrow leaves the boundary between two levels; its label sits beside the narrower band above it.
      const ax = cx + wt / 2 + 8, ay = y0 - 1;
      out += arrow(ax, ay, ax + 34, ay, { color: palette.coralDark, width: 2 });
      out += text(ax, ay - 17, `${fmt(100 - m.efficiency, 1)}% lost`, { size: 12, weight: 700, anchor: 'start', color: palette.coralDark });
      out += text(ax, ay - 4, 'heat & waste', { size: 12, anchor: 'start', color: palette.coralDark });
    }
  });
  const topY = baseY - n * bandH;
  out += arrow(cx, topY - 6, cx, topY - 34, { color: palette.leafDark, width: 2 });
  out += text(cx, topY - 40, `Sunlight → producers: ${fmt(m.levels[0].energy, 2)} kJ enters the chain`, { size: 12, color: palette.leafDark, weight: 600 });
  out += line(cx - wMax / 2 - 10, baseY + 6, cx + wMax / 2 + 10, baseY + 6, { color: palette.muted, width: 1.5 });
  out += text(cx, baseY + 26, `Total lost across ${n - 1} transfer${n > 2 ? 's' : ''}: ${fmt(m.lost, 2)} kJ · widths are on a log scale`, { size: 12 });
  return out;
}
