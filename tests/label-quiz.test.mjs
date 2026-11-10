// Label-the-cell quiz: the pointers drawn on the two reference cells, the question data built from organelles.mjs,
// answer checking, scoring, and the page's title, description and FAQ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { drawCell } from '../src/lib/cell-diagram.mjs';
import { QUIZ_MODES, quizItems, labelItems, functionItems, wordBank } from '../src/lib/label-quiz.mjs';
import { normalize, editDistance, checkAnswer, scoreRound, shuffled } from '../src/lib/label-quiz-score.mjs';
import { organelles, organelleChart, cellTypes } from '../src/lib/organelles.mjs';
import { catalog } from '../src/lib/catalog.mjs';
import { faqs } from '../src/lib/faqs.mjs';

const KINDS = ['animal', 'plant'];
const slugify = name => name.toLowerCase().replace(/\s+/g, '-');
const structuresOf = kind => [...cellTypes[kind].organelles, ...cellTypes[kind].extras.map(e => slugify(e[0]))];
const count = (text, part) => text.split(part).length - 1;
const page = readFileSync(new URL('../src/pages/cells/label-the-cell.astro', import.meta.url), 'utf8');

test('every structure of a cell has exactly one pointer, numbered like the atlas key', () => {
  for (const kind of KINDS) {
    const quiz = drawCell(kind, { pointers: true }), atlas = drawCell(kind);
    const ids = quiz.pointers.map(p => p.id);
    assert.deepEqual([...ids].sort(), structuresOf(kind).sort(), `${kind}: one pointer per structure of the reference cell`);
    assert.equal(new Set(ids).size, ids.length, `${kind}: no structure has two pointers`);
    assert.deepEqual(quiz.pointers.map(p => p.n), ids.map((_, i) => i + 1), `${kind}: numbered 1 to ${ids.length}`);
    assert.deepEqual(quiz.pointers.map(p => p.n), atlas.items.map(item => item.n), `${kind}: same numbers as the atlas key`);
    assert.equal(count(quiz.svg, 'class="cell-pointer"'), ids.length, `${kind}: pointers drawn`);
    for (const p of quiz.pointers) {
      assert.equal(count(quiz.svg, `data-pointer="${p.n}"`), 1, `${kind}: pointer ${p.n} drawn once`);
      // one group for the structure's artwork and one for its pointer
      assert.equal(count(quiz.svg, `data-structure="${p.id}"`), 2, `${kind}: ${p.id}`);
      assert.ok(quiz.svg.includes(`data-pointer="${p.n}" data-structure="${p.id}" data-tip="${p.tip.join(',')}"`), `${kind}: pointer ${p.n} carries its tip`);
      for (const [x, y] of [p.at, p.tip]) assert.ok(x > 12 && x < 708 && y > 12 && y < 448, `${kind}: pointer ${p.n} is inside the 720 × 460 drawing`);
    }
    // badges do not sit on top of each other
    for (const a of quiz.pointers) for (const b of quiz.pointers) if (a.n < b.n) assert.ok(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) > 40, `${kind}: badges ${a.n} and ${b.n} overlap`);
  }
});

test('the quiz drawing gives nothing away, and the atlas drawing still links every organelle', () => {
  for (const kind of KINDS) {
    const quiz = drawCell(kind, { pointers: true }), atlas = drawCell(kind);
    assert.doesNotMatch(quiz.svg, /<a |href=|<title>|aria-label|stores water/, `${kind}: no links, titles or captions in the quiz drawing`);
    // each name appears once, as the pointer's hidden label
    for (const p of quiz.pointers) assert.equal(count(quiz.svg, `>${p.name}</text>`), 1, `${kind}: ${p.name}`);
    assert.equal(count(quiz.svg, 'class="cell-pointer-name"'), quiz.pointers.length);
    assert.doesNotMatch(atlas.svg, /cell-pointer/, `${kind}: the atlas drawing has no quiz pointers`);
    assert.equal(atlas.pointers.length, 0);
    for (const slug of cellTypes[kind].organelles) assert.equal(count(atlas.svg, `<a href="/cells/${slug}/" data-organelle="${slug}"`), 1, `${kind}: atlas link ${slug}`);
    assert.doesNotMatch(quiz.svg + atlas.svg, /NaN|undefined|Infinity/);
  }
});

test('plant-only and animal-only structures are in the right mode', () => {
  const animal = labelItems('animal').map(i => i.id), plant = labelItems('plant').map(i => i.id);
  assert.deepEqual(plant.filter(id => !animal.includes(id)), ['chloroplast', 'cell-wall', 'central-vacuole']);
  assert.deepEqual(animal.filter(id => !plant.includes(id)), ['lysosome', 'centrioles']);
  // nothing the organelle chart says a cell lacks is asked about in that cell
  for (const [kind, column] of [['animal', 3], ['plant', 4]]) {
    const absent = organelleChart.filter(row => row[column] === 'No').map(row => row[0]);
    assert.ok(absent.length >= 1, kind);
    for (const item of labelItems(kind)) assert.ok(!absent.includes(item.name), `${kind} cell should not ask for ${item.name}`);
  }
  assert.equal(animal.length, 8);
  assert.equal(plant.length, 9);
});

test('every function comes from the organelle chart in organelles.mjs', () => {
  const fn = functionItems();
  assert.equal(fn.length, organelleChart.length);
  assert.equal(new Set(fn.map(i => i.id)).size, fn.length);
  assert.equal(new Set(fn.map(i => i.job)).size, fn.length, 'no two organelles share a function, so each question has one answer');
  fn.forEach((item, i) => {
    const [name, slug, job, animal, plant] = organelleChart[i];
    assert.equal(item.name, name);
    assert.equal(item.job, `${job}.`);
    assert.equal(item.animal, animal);
    assert.equal(item.plant, plant);
    assert.equal(item.href, slug ? `/cells/${slug}/` : '/cells/#organelle-chart');
    if (slug) assert.ok(organelles[slug], `${name} links to a real organelle page`);
  });
  // label modes: the job printed after an answer is the chart's function for that structure (two rows for the ER)
  const chartJobs = organelleChart.map(row => row[2].toLowerCase());
  for (const kind of KINDS) for (const item of labelItems(kind)) {
    const used = chartJobs.filter(job => item.job.toLowerCase().includes(job));
    assert.equal(used.length, item.id === 'endoplasmic-reticulum' ? 2 : 1, `${kind} ${item.id}: ${item.job}`);
    const rows = organelleChart.filter(row => used.includes(row[2].toLowerCase()));
    for (const row of rows) assert.ok(row[1] === (organelles[item.id] ? item.id : ''), `${kind} ${item.id} uses the chart row for ${row[0]}`);
  }
  const er = labelItems('animal').find(i => i.id === 'endoplasmic-reticulum');
  assert.equal(er.job, 'Rough ER: folds and modifies proteins made by its ribosomes. Smooth ER: makes lipids, detoxifies drugs, stores calcium.');
  assert.equal(labelItems('plant').find(i => i.id === 'central-vacuole').job, `${organelleChart.find(r => r[0] === 'Vacuole')[2]}.`);
});

test('every answer links to its organelle page, or to the chart when it has none', () => {
  for (const [mode] of QUIZ_MODES) for (const item of quizItems(mode)) {
    assert.ok(item.name && item.job.endsWith('.') && item.linkLabel, `${mode} ${item.id}`);
    assert.equal(item.accept[0], item.name, `${mode} ${item.id}: its own name is accepted`);
    if (item.href === '/cells/#organelle-chart') assert.ok(!organelles[item.id], `${mode} ${item.id} has an atlas page and should link to it`);
    else { const slug = item.href.match(/^\/cells\/([a-z-]+)\/$/)[1]; assert.ok(organelles[slug], item.href); assert.equal(item.linkLabel, `${organelles[slug].title}: structure and function`); }
  }
  for (const kind of KINDS) for (const item of labelItems(kind)) if (organelles[item.id]) assert.equal(item.href, `/cells/${item.id}/`);
});

test('modes, word banks and invalid modes', () => {
  assert.deepEqual(QUIZ_MODES.map(m => m[0]), ['animal', 'plant', 'functions']);
  assert.equal(QUIZ_MODES[0][1], cellTypes.animal.title);
  assert.equal(QUIZ_MODES[1][1], cellTypes.plant.title);
  for (const [mode] of QUIZ_MODES) {
    const bank = wordBank(mode), names = quizItems(mode).map(i => i.name);
    assert.deepEqual(bank, [...names].sort((a, b) => a.localeCompare(b)), `${mode}: alphabetical, so the order gives no clue`);
    assert.equal(new Set(bank).size, bank.length, `${mode}: each name once`);
  }
  assert.throws(() => quizItems('fungus'), /animal cell, the plant cell, or function match/);
  assert.throws(() => labelItems('functions'), /Unknown cell type/);
  assert.throws(() => wordBank(''), /Choose/);
});

test('typed answers: accepted names, spelling slips and wrong answers', () => {
  const animal = labelItems('animal'), plant = labelItems('plant'), fn = functionItems();
  const of = (items, id) => items.find(i => i.id === id);
  const mark = (items, id, typed) => checkAnswer(typed, of(items, id), items);
  assert.equal(normalize('  The Golgi-Apparatus! '), 'golgi apparatus');
  assert.equal(normalize(null), '');
  assert.equal(editDistance('kitten', 'sitting'), 3);
  assert.equal(editDistance('', 'abc'), 3);
  assert.equal(editDistance('nucleus', 'nucleus'), 0);
  // every item's own name and listed alternatives are correct, in any case
  for (const items of [animal, plant, fn]) for (const item of items) for (const name of item.accept) {
    assert.equal(checkAnswer(name, item, items), 'correct', name);
    assert.equal(checkAnswer(` ${name.toUpperCase()} `, item, items), 'correct', name);
  }
  assert.equal(mark(animal, 'mitochondrion', 'mitochondria'), 'correct');
  assert.equal(mark(animal, 'endoplasmic-reticulum', 'rough ER'), 'correct');
  assert.equal(mark(animal, 'golgi-apparatus', 'the golgi body'), 'correct');
  assert.equal(mark(animal, 'cell-membrane', 'Plasma membrane'), 'correct');
  assert.equal(mark(plant, 'central-vacuole', 'vacuole'), 'correct');
  // spelling slips get a second try: one letter for short names, two for long ones
  assert.equal(mark(animal, 'mitochondrion', 'mitocondrion'), 'close');
  assert.equal(mark(animal, 'mitochondrion', 'mitocondrian'), 'close');
  assert.equal(mark(plant, 'chloroplast', 'cloroplast'), 'close');
  assert.equal(mark(animal, 'nucleus', 'nuclues'), 'wrong', 'two letters out in a seven-letter name');
  assert.equal(mark(animal, 'nucleus', 'nucleis'), 'close');
  assert.equal(mark(animal, 'lysosome', 'lisosome'), 'close');
  // another structure's name is wrong, never “close”, however similar it looks
  assert.equal(mark(fn, 'nucleolus', 'nucleus'), 'wrong');
  assert.equal(mark(fn, 'nucleus', 'nucleolus'), 'wrong');
  assert.equal(mark(fn, 'rough-endoplasmic-reticulum', 'smooth ER'), 'wrong');
  assert.equal(mark(fn, 'smooth-endoplasmic-reticulum', 'rough endoplasmic reticulum'), 'wrong');
  assert.equal(mark(plant, 'cell-membrane', 'cell wall'), 'wrong');
  assert.equal(mark(plant, 'cell-wall', 'cell membrane'), 'wrong');
  assert.equal(mark(animal, 'lysosome', 'ribosome'), 'wrong');
  assert.equal(mark(animal, 'nucleus', 'banana'), 'wrong');
  // in function match the ER has to be the right kind, and a short “ER” is not enough
  assert.equal(mark(fn, 'rough-endoplasmic-reticulum', 'ER'), 'wrong');
  assert.equal(mark(fn, 'rough-endoplasmic-reticulum', 'Rough ER'), 'correct');
  for (const blank of ['', '   ', null, undefined, '?!']) assert.equal(checkAnswer(blank, animal[0], animal), 'empty');
});

test('scoring counts only correct first answers', () => {
  assert.deepEqual(scoreRound([null, null, null]), { total: 3, correct: 0, answered: 0, left: 3, missed: [], percent: 0, complete: false });
  assert.deepEqual(scoreRound(['correct', 'wrong', null, 'correct']), { total: 4, correct: 2, answered: 3, left: 1, missed: [1], percent: 50, complete: false });
  assert.deepEqual(scoreRound(['correct', 'wrong', 'shown', 'correct', 'correct', 'correct', 'correct', 'correct']), { total: 8, correct: 6, answered: 7, left: 0, missed: [1, 2], percent: 75, complete: true });
  assert.equal(scoreRound(Array(8).fill('correct').with(1, 'wrong')).percent, 88, '7 of 8 rounds to 88%');
  assert.equal(scoreRound(Array(9).fill('shown')).correct, 0, 'showing the answers scores nothing');
  assert.deepEqual(scoreRound([]), { total: 0, correct: 0, answered: 0, left: 0, missed: [], percent: 0, complete: false });
  const perfect = scoreRound(Array(17).fill('correct'));
  assert.ok(perfect.complete && perfect.percent === 100 && perfect.missed.length === 0);
});

test('shuffling keeps every question exactly once and leaves the source alone', () => {
  const source = functionItems(), before = source.map(i => i.id);
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const mixed = shuffled(source, random);
  assert.deepEqual(source.map(i => i.id), before);
  assert.deepEqual(mixed.map(i => i.id).sort(), [...before].sort());
  assert.notDeepEqual(mixed.map(i => i.id), before);
  assert.deepEqual(shuffled([], random), []);
  assert.deepEqual(shuffled(['only']), ['only']);
});

test('page title, description, catalog entry and FAQ agree with the quiz data', () => {
  const title = page.match(/const title = '([^']+)'/)[1];
  const description = page.match(/const description = '([^']+)'/)[1];
  assert.ok(title.startsWith('Label the Cell') && title.length <= 60, `title ${title.length}`);
  assert.match(title, /Animal and Plant Cell Diagram Quiz/);
  assert.ok(description.length >= 120 && description.length <= 155, `description ${description.length}`);
  const entry = catalog.find(t => t.href === '/cells/label-the-cell/');
  assert.ok(entry && entry.category === 'Cells' && entry.description.length >= 80 && entry.description.length <= 170);
  const answers = faqs['label-the-cell'].map(f => f.answer);
  const find = start => answers.find(a => a.startsWith(start));
  const mentions = (answer, items) => { for (const item of items) assert.ok(answer.toLowerCase().includes(item.name.toLowerCase().replace(/s$/, '')), `FAQ should mention ${item.name}`); };
  const animal = labelItems('animal'), plant = labelItems('plant');
  assert.equal(animal.length, 8); mentions(find('Eight:'), animal);
  assert.equal(plant.length, 9); mentions(find('Nine:'), plant);
  assert.match(find('Eight:'), /Lysosomes and centrioles are the two that do not appear on the plant cell/);
  assert.match(find('Nine:'), /The chloroplast, the cell wall, and the central vacuole are the three that an animal cell does not have/);
  const match = find('Function match');
  assert.ok(match.includes(`all ${functionItems().length} rows`));
  assert.ok(match.includes(`“${functionItems().find(i => i.id === 'ribosome').job.replace(/\.$/, '')}”`), 'the quoted example is a real chart function');
  const drawn = new Set([...animal, ...plant].flatMap(i => i.accept.map(normalize)));
  for (const name of ['Nucleolus', 'Peroxisome', 'Vesicles', 'Cytoskeleton', 'Cytoplasm']) assert.ok(!drawn.has(normalize(name)) && functionItems().some(i => i.name === name), `${name} is in function match only`);
  // the alternatives the FAQ promises are really accepted
  const typed = find('Capital letters');
  for (const [id, alt] of [['mitochondrion', 'mitochondria'], ['endoplasmic-reticulum', 'ER'], ['golgi-apparatus', 'Golgi'], ['golgi-apparatus', 'Golgi body'], ['cell-membrane', 'plasma membrane'], ['central-vacuole', 'vacuole']]) {
    assert.ok(typed.includes(alt), alt);
    const items = id === 'central-vacuole' ? plant : animal;
    assert.equal(checkAnswer(alt, items.find(i => i.id === id), items), 'correct', alt);
  }
  // the printables page really offers the twelve-structure sheets the FAQ points to
  assert.ok(find('Yes. Press').includes('twelve structures each'));
  assert.ok(readFileSync(new URL('../src/pages/printable-diagrams.astro', import.meta.url), 'utf8').includes("meta: '12 structures · answer table'"));
});
