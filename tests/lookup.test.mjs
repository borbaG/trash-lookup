import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeIndex, normalize, search, verifiedItems } from '../search.js';

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const data = await json('../data/waste-items.json');
const pending = await json('../data/pending-items.json');
const categories = await json('../data/categories.json');
const items = verifiedItems(data.items);
const index = makeIndex(items);

test('verified data has unique IDs, known destinations and county sources', () => {
  assert.equal(items.length, data.items.length);
  assert.equal(new Set(items.map(item => item.id)).size, items.length);
  assert.equal(verifiedItems(pending).length, 0);
  assert.equal(verifiedItems([{ verification_status: 'pending', category: 'residual' }]).length, 0);
  for (const item of items) {
    assert.match(item.id, /^[a-z0-9-]+$/);
    assert.ok(item.name_en && item.name_de);
    assert.match(item.verified_at, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.verified_at <= data.updated_at);
    const branches = item.clarification?.options;
    assert.ok(['www.landkreis-kusel.de', 'www.wsb-landkreis-kusel.de'].includes(new URL(item.source_url).hostname));
    assert.equal(Boolean(item.category), !branches);
    if (branches) {
      assert.ok(item.clarification.question && branches.length >= 2);
      assert.equal(new Set(branches.map(branch => branch.label)).size, branches.length);
    }
    for (const destination of branches || [item]) {
      const url = new URL(destination.source_url);
      assert.equal(url.protocol, 'https:');
      assert.ok(['www.landkreis-kusel.de', 'www.wsb-landkreis-kusel.de'].includes(url.hostname));
      assert.ok(Object.hasOwn(categories, destination.category));
      assert.ok(destination.instructions_en);
      assert.ok(Array.isArray(destination.warnings));
    }
  }
});

test('English, German, synonyms, punctuation and minor misspellings', () => {
  for (const [query, id, category] of [
    ['banana peel', 'fruit', 'organic'],
    ['KÜHLSCHRANK', 'fridge', 'electronics'],
    ['Kuehlschrank', 'fridge', 'electronics'],
    ['AA-battery!', 'battery', 'batteries'],
    ['yoghurt cup', 'yogurt', 'packaging'],
    ['KÜHL SCHRANK', 'fridge', 'electronics'],
    ['nappy', 'diaper', 'residual'],
    ['Gurkenglas', 'pickle-jar', 'glass'],
    ['toatser', 'toaster', 'electronics'],
    ['Feuerlöscher', 'fire-extinguisher', 'hazardous']
  ]) {
    const [match] = search(index, query);
    assert.equal(match?.item.id, id, query);
    assert.equal(match.item.category, category);
  }
  assert.equal(normalize('  STRAẞE!  '), 'strasse');
  assert.equal(search(index, '??').length, 0);
  assert.equal(search(index, 'xqzvnomatch').length, 0);
  const matches = search(index, 'bike');
  assert.equal(matches[0].item.id, 'bike');
  assert.equal(matches[0].score, 100);
  assert.equal(matches.length, new Set(matches.map(hit => hit.item.id)).size);
});

test('conditional rows have no default destination', () => {
  for (const [query, expected] of [
    ['glass bottle', ['deposit', 'glass']],
    ['cardboard', ['paper', 'residual']],
    ['pizza box', ['paper', 'residual']],
    ['egg carton', ['paper', 'organic']],
    ['Styropor', ['packaging', 'landfill']],
    ['Spraydose', ['packaging', 'hazardous']]
  ]) {
    const [{ item, score }] = search(index, query);
    assert.equal(score, 100);
    assert.equal(item.category, null);
    assert.deepEqual(item.clarification.options.map(option => option.category), expected);
  }
});
