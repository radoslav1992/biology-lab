// Population ecology models: exponential and logistic growth, bacterial doubling, trophic energy transfer,
// and Lotka–Volterra predator–prey dynamics. Pure functions; every input is validated with a friendly Error.
import { fmt } from './format.mjs';

const check = (condition, message) => { if (!condition) throw new Error(message); };
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const finiteNumber = (v, name) => check(isNum(v), `${name} must be a finite number.`);
const positiveNumber = (v, name) => check(isNum(v) && v > 0, `${name} must be greater than 0.`);
const nonNegativeNumber = (v, name) => check(isNum(v) && v >= 0, `${name} cannot be negative.`);

export const MODELS = ['exponential', 'logistic'];
export const TROPHIC_LEVELS = ['Producers', 'Primary consumers', 'Secondary consumers', 'Tertiary consumers', 'Quaternary consumers'];
const checkModel = model => check(MODELS.includes(model), 'Choose the exponential or the logistic model.');

/** Format a population size: plain digits up to a million, then scientific notation such as "1.05 × 10^9". */
export function formatCount(n, digits = 3) {
  finiteNumber(n, 'Value');
  if (Math.abs(n) <= 1e6) return fmt(n, digits);
  const exponent = Math.floor(Math.log10(Math.abs(n)));
  let mantissa = n / 10 ** exponent;
  // Rounding can push 9.9995 up to 10.00; renormalize so the mantissa stays in [1, 10).
  if (Math.abs(Number(mantissa.toFixed(2))) >= 10) return `${fmt(mantissa / 10, 2)} × 10^${exponent + 1}`;
  return `${fmt(mantissa, 2)} × 10^${exponent}`;
}

/** Exponential growth N(t) = N₀·e^(rt). r may be negative (decline) or zero (no change). */
export function exponential(N0, r, t) {
  positiveNumber(N0, 'The starting population N₀');
  finiteNumber(r, 'The growth rate r');
  nonNegativeNumber(t, 'Time t');
  const N = N0 * Math.exp(r * t);
  check(Number.isFinite(N), 'That growth overflows the calculator: use a smaller rate r or a shorter time t.');
  return N;
}

/** Logistic growth N(t) = K / (1 + ((K − N₀)/N₀)·e^(−rt)). Populations above K decline toward K. */
export function logistic(N0, r, K, t) {
  positiveNumber(N0, 'The starting population N₀');
  finiteNumber(r, 'The growth rate r');
  positiveNumber(K, 'The carrying capacity K');
  nonNegativeNumber(t, 'Time t');
  check(r >= 0, 'The logistic model describes growth toward K, so r must be 0 or greater. Use the exponential model for a shrinking population.');
  return K / (1 + ((K - N0) / N0) * Math.exp(-r * t));
}

/** Doubling time ln 2 / r for a positive per-capita rate r. */
export function doublingTime(r) {
  check(isNum(r) && r > 0, 'A doubling time only exists when the growth rate r is greater than 0.');
  return Math.LN2 / r;
}

/** Instantaneous growth rate dN/dt: rN for exponential growth, rN(1 − N/K) for logistic growth. */
export function growthRate(model, N, r, K) {
  checkModel(model);
  nonNegativeNumber(N, 'The population N');
  finiteNumber(r, 'The growth rate r');
  if (model === 'exponential') return r * N;
  positiveNumber(K, 'The carrying capacity K');
  return r * N * (1 - N / K);
}

/** Sample a growth curve from t = 0 to tMax as [[t, N], …] with steps + 1 points. */
export function growthSeries(model, { N0, r, K } = {}, tMax, steps = 200) {
  checkModel(model);
  positiveNumber(tMax, 'The time span');
  check(Number.isInteger(steps) && steps >= 1 && steps <= 20000, 'Use between 1 and 20,000 steps.');
  const N = model === 'exponential' ? tt => exponential(N0, r, tt) : tt => logistic(N0, r, K, tt);
  return Array.from({ length: steps + 1 }, (_, i) => { const tt = tMax * i / steps; return [tt, N(tt)]; });
}

// Word-problem helpers. A percentage rate p is a fraction per time period (12% per year → 0.12) compounded once per
// period, N(t) = N₀(1 + p)^t; the same number read as a continuous rate r gives N₀e^(rt), which grows slightly faster.
const percentRate = p => check(isNum(p) && p > -1, 'The growth rate must be greater than −100%.');

/** Discrete (compound) growth at a fixed percentage per period: N(t) = N₀(1 + p)^t. */
export function compoundGrowth(N0, p, t) {
  positiveNumber(N0, 'The starting population N₀');
  percentRate(p);
  nonNegativeNumber(t, 'Time t');
  const N = N0 * (1 + p) ** t;
  check(Number.isFinite(N), 'That growth overflows the calculator: use a smaller rate or a shorter time.');
  return N;
}

/**
 * Time for a population to go from N₀ to N at a fixed rate: t = ln(N/N₀) / ln(1 + p) when the rate is a percentage
 * compounded each period, or t = ln(N/N₀) / r when it is a continuous rate. A falling target needs a negative rate.
 */
export function timeToReach(N0, N, rate, { continuous = false } = {}) {
  positiveNumber(N0, 'The starting population N₀');
  positiveNumber(N, 'The target population N');
  if (continuous) finiteNumber(rate, 'The growth rate r'); else percentRate(rate);
  check(rate !== 0, 'With a growth rate of 0 the population never changes, so it never reaches a different size.');
  check(N === N0 || (N > N0) === (rate > 0), N > N0 ? 'The target is larger than N₀, so the growth rate must be positive.' : 'The target is smaller than N₀, so the population has to shrink: enter a negative growth rate.');
  return Math.log(N / N0) / (continuous ? rate : Math.log1p(rate));
}

/** Average growth rate between two counts t periods apart: percentage p = (N/N₀)^(1/t) − 1 and continuous r = ln(N/N₀) / t. */
export function growthRateFromCounts(N0, N, t) {
  positiveNumber(N0, 'The starting population N₀');
  positiveNumber(N, 'The later population N');
  positiveNumber(t, 'The time between the counts');
  const r = Math.log(N / N0) / t;
  return { percent: Math.expm1(r), r };
}

/** Doubling time at a percentage rate p: exact ln 2 / ln(1 + p), continuous ln 2 / p, and the rule of 70 estimate 70 / (100p). */
export function doublingTimes(p) {
  check(isNum(p) && p > 0, 'A doubling time only exists when the growth rate is greater than 0.');
  return { exact: Math.LN2 / Math.log1p(p), continuous: Math.LN2 / p, ruleOf70: 0.7 / p };
}

/** A population that doubles every Td: after t it has doubled t / Td times, so N = N₀ × 2^(t/Td). */
export function afterDoublings(N0, Td, t) {
  positiveNumber(N0, 'The starting population N₀');
  positiveNumber(Td, 'The doubling time');
  nonNegativeNumber(t, 'Time t');
  const doublings = t / Td;
  const N = N0 * 2 ** doublings;
  check(Number.isFinite(N), 'That population is too large to calculate. Use fewer doublings.');
  return { doublings, N };
}

/** Binary fission: after elapsed/generation doublings, N = N₀ · 2^generations. Generations may be fractional. */
export function bacterialGrowth(N0, generationMinutes, elapsedMinutes) {
  positiveNumber(N0, 'The starting number of cells');
  positiveNumber(generationMinutes, 'The generation time');
  nonNegativeNumber(elapsedMinutes, 'The elapsed time');
  const generations = elapsedMinutes / generationMinutes;
  check(generations <= 500, 'That is more than 500 generations, far beyond what any culture can sustain. Shorten the time or lengthen the generation time.');
  const N = N0 * 2 ** generations;
  check(Number.isFinite(N), 'That population is too large to calculate. Use fewer generations or fewer starting cells.');
  return { generations, N };
}

/** Generation (doubling) time in minutes from a starting count, a final count, and the elapsed minutes. */
export function generationTime(N0, N, elapsedMinutes) {
  positiveNumber(N0, 'The starting number of cells');
  positiveNumber(N, 'The final number of cells');
  positiveNumber(elapsedMinutes, 'The elapsed time');
  check(N > N0, 'The final population must be larger than the starting population for a generation time to exist.');
  return elapsedMinutes / Math.log2(N / N0);
}

/** Energy at each trophic level when a fraction (typically 0.1) passes from one level to the next. */
export function energyPyramid(producerEnergy, levels, efficiencyFraction) {
  positiveNumber(producerEnergy, 'The producer energy');
  check(Number.isInteger(levels) && levels >= 2 && levels <= 5, 'Use 2 to 5 trophic levels.');
  check(isNum(efficiencyFraction) && efficiencyFraction > 0 && efficiencyFraction <= 1, 'Transfer efficiency must be a fraction between 0 and 1 (enter 10% as 0.1).');
  const list = Array.from({ length: levels }, (_, i) => ({ level: i + 1, name: TROPHIC_LEVELS[i], energy: producerEnergy * efficiencyFraction ** i }));
  const transfers = list.slice(1).map((entry, i) => ({ from: list[i].name, to: entry.name, lost: list[i].energy - entry.energy }));
  return { levels: list, lost: producerEnergy - list[levels - 1].energy, transfers };
}

const checkLotkaVolterra = ({ prey, predators, alpha, beta, delta, gamma } = {}) => {
  positiveNumber(prey, 'The starting prey population');
  positiveNumber(predators, 'The starting predator population');
  positiveNumber(alpha, 'The prey growth rate α');
  positiveNumber(beta, 'The predation rate β');
  positiveNumber(delta, 'The predator efficiency δ');
  positiveNumber(gamma, 'The predator death rate γ');
};

/**
 * Exact swing of a Lotka–Volterra orbit, from the conserved quantity V = δx − γ ln x + βy − α ln y.
 * Prey extremes occur where y = α/β and predator extremes where x = γ/δ, so each is a root of a convex function.
 */
export function lotkaVolterraBounds(params) {
  checkLotkaVolterra(params);
  const { prey, predators, alpha, beta, delta, gamma } = params;
  const xStar = gamma / delta, yStar = alpha / beta;
  const V0 = delta * prey - gamma * Math.log(prey) + beta * predators - alpha * Math.log(predators);
  const solve = (g, target, center) => {
    // g is convex with its minimum at center; find the roots of g(v) = target on each side of it.
    const bisect = (lo, hi) => { for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (g(mid) < target) { if (mid > center) lo = mid; else hi = mid; } else if (mid > center) hi = mid; else lo = mid; } return (lo + hi) / 2; };
    let hi = center * 2; for (let i = 0; i < 400 && g(hi) < target; i++) hi *= 2;
    let lo = center / 2; for (let i = 0; i < 2000 && g(lo) < target; i++) lo /= 2;
    return [bisect(lo, center), bisect(center, hi)];
  };
  const [minPrey, maxPrey] = solve(x => delta * x - gamma * Math.log(x), V0 - (beta * yStar - alpha * Math.log(yStar)), xStar);
  const [minPredators, maxPredators] = solve(y => beta * y - alpha * Math.log(y), V0 - (delta * xStar - gamma * Math.log(xStar)), yStar);
  return { minPrey, maxPrey, minPredators, maxPredators, equilibrium: { prey: xStar, predators: yStar } };
}

/**
 * Lotka–Volterra predator–prey model integrated with classical fourth-order Runge–Kutta at a fixed step.
 * dx/dt = αx − βxy (prey), dy/dt = δxy − γy (predators). Equilibrium at x* = γ/δ, y* = α/β.
 */
export function lotkaVolterra(params, { dt = 0.01, steps = 5000 } = {}) {
  checkLotkaVolterra(params);
  positiveNumber(dt, 'The time step');
  check(Number.isInteger(steps) && steps >= 1 && steps <= 1000000, 'Use between 1 and 1,000,000 steps.');
  const { prey, predators, alpha, beta, delta, gamma } = params;
  const f = (x, y) => [alpha * x - beta * x * y, delta * x * y - gamma * y];
  let x = prey, y = predators;
  const series = [[0, x, y]];
  let maxPrey = x, minPrey = x, maxPredators = y, minPredators = y;
  for (let i = 1; i <= steps; i++) {
    const k1 = f(x, y);
    const k2 = f(x + dt / 2 * k1[0], y + dt / 2 * k1[1]);
    const k3 = f(x + dt / 2 * k2[0], y + dt / 2 * k2[1]);
    const k4 = f(x + dt * k3[0], y + dt * k3[1]);
    x += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    check(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= 1e12 && y <= 1e12, 'The simulation became unstable with these values. Use a smaller time step, smaller rates, or a shorter run.');
    series.push([i * dt, x, y]);
    if (x > maxPrey) maxPrey = x; if (x < minPrey) minPrey = x;
    if (y > maxPredators) maxPredators = y; if (y < minPredators) minPredators = y;
  }
  return { series, equilibrium: { prey: gamma / delta, predators: alpha / beta }, maxPrey, minPrey, maxPredators, minPredators };
}
