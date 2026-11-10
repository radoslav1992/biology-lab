// Answer checking and scoring for the label-the-cell quiz. No imports, so the page's script stays small: the question
// data (label-quiz.mjs) is built on the server and handed to the browser as JSON.

/** Lowercase a typed answer and drop punctuation, extra spaces and a leading “the” or “a”, so “The Golgi-apparatus ” matches “golgi apparatus”. */
export const normalize = text => String(text ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim().replace(/^(the|an|a) /, '');

/** Number of single-letter insertions, deletions or substitutions that turn a into b. */
export function editDistance(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

/**
 * Mark a typed answer for one quiz item: 'correct' when it matches one of the item's accepted names, 'close' when it is
 * a spelling slip away from one (one letter for names of 6–8 letters, two for longer names) and is not the name of
 * another structure in the round, 'wrong' otherwise, and 'empty' for a blank. `items` is the whole round.
 */
export function checkAnswer(typed, item, items = [item]) {
  const answer = normalize(typed);
  if (!answer) return 'empty';
  const accepted = item.accept.map(normalize);
  if (accepted.includes(answer)) return 'correct';
  if (items.some(other => other !== item && other.accept.map(normalize).includes(answer))) return 'wrong';
  const close = accepted.some(name => name.length >= 6 && editDistance(answer, name) <= (name.length >= 9 ? 2 : 1));
  return close ? 'close' : 'wrong';
}

/**
 * Score a round. `results` holds one entry per question: 'correct', 'wrong' (answered wrongly), 'shown' (the answer was
 * revealed before the student answered) or null (not answered yet). Only 'correct' earns a point.
 */
export function scoreRound(results) {
  const total = results.length;
  const correct = results.filter(r => r === 'correct').length;
  const left = results.filter(r => r == null).length;
  const missed = results.flatMap((r, i) => r === 'wrong' || r === 'shown' ? [i] : []);
  return { total, correct, answered: total - left - results.filter(r => r === 'shown').length, left, missed, percent: total ? Math.round(correct / total * 100) : 0, complete: total > 0 && left === 0 };
}

/** A shuffled copy of a list (Fisher–Yates); pass a random function to make it repeatable in tests. */
export function shuffled(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
