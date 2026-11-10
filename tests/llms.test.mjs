// public/llms.txt is the plain-text guide AI assistants read. It is generated from the built pages
// by `npm run build && npm run llms`; this test catches a tool that was added without regenerating it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalog } from '../src/lib/catalog.mjs';

const text = readFileSync(new URL('../public/llms.txt', import.meta.url), 'utf8');

test('llms.txt names the site, summarises it and lists every tool or hub on the home page', () => {
  assert.ok(text.startsWith('# Biology Lab\n\n> '), 'starts with the site name and a one-paragraph summary');
  for (const href of catalog.map(item => item.href)) {
    assert.ok(text.includes(`](https://thebiologylab.org${href}): `), `${href} is missing: run npm run build && npm run llms`);
  }
});

test('llms.txt links only to this site and its sister apps, each line with a description', () => {
  const sisters = ['interactiveperiodictable.net', 'theastronomylab.com', 'thebiologylab.org', 'earthsciencelab.org', 'geometrylab.net', 'thephysicslab.org', 'kidscode.dev'];
  for (const [, url] of text.matchAll(/\]\((https?:\/\/[^)]+)\)/g)) {
    assert.ok(url.startsWith('https://') && sisters.includes(new URL(url).hostname), url);
  }
  for (const line of text.split('\n').filter(l => l.startsWith('- [') && l.includes('https://thebiologylab.org'))) {
    assert.ok(/\): \S.{30,}$/.test(line), `no description: ${line.slice(0, 80)}`);
  }
});
