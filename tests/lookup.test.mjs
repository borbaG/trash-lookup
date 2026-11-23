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
const pendingTerms = new Set(makeIndex(pending).flatMap(entry => entry.names));
const countyHosts = ['www.landkreis-kusel.de', 'www.wsb-landkreis-kusel.de'];

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
    assert.ok(countyHosts.includes(new URL(item.source_url).hostname));
    assert.equal(Boolean(item.category), !branches);
    if (branches) {
      assert.ok(item.clarification.question && branches.length >= 2);
      assert.equal(new Set(branches.map(branch => branch.label)).size, branches.length);
    }
    for (const destination of branches || [item]) {
      const url = new URL(destination.source_url);
      assert.equal(url.protocol, 'https:');
      const federalDepositSource = destination.category === 'deposit'
        && url.hostname === 'www.gesetze-im-internet.de' && url.pathname === '/verpackdg/__46.html';
      assert.ok(countyHosts.includes(url.hostname) || federalDepositSource);
      assert.ok(Object.hasOwn(categories, destination.category));
      assert.ok(destination.instructions_en);
      assert.ok(Array.isArray(destination.warnings));
    }
  }
});

test('canonical names are distinct and pending records cannot route disposal', () => {
  assert.equal(new Set([...items, ...pending].map(item => item.id)).size, items.length + pending.length);
  for (const lang of ['en', 'de']) {
    const names = items.map(item => normalize(item['name_' + lang]));
    assert.ok(names.every(Boolean));
    assert.equal(new Set(names).size, names.length);
  }
  for (const item of pending) {
    assert.ok(item.name_en && item.name_de);
    assert.equal(item.verification_status, 'pending');
    for (const property of ['category', 'source_url', 'verified_at', 'clarification']) {
      assert.equal(item[property], null, item.id + ': ' + property);
    }
    assert.equal(item.instructions_en, '');
  }
  assert.ok(search(index, 'e-bike').some(hit => hit.item.id === 'ebike-battery'));
  assert.deepEqual(search(index, 'e-bike', pendingTerms), []);
  assert.deepEqual(search(index, 'coffee pod', pendingTerms), []);
  assert.equal(search(index, 'Katzenstreu', pendingTerms).length, 2);
});

test('shared exact terms resolve to deliberate choices with explicit conditions', () => {
  const expected = [
    [['light bulb', 'Lampe als Leuchtmittel'], ['cfl', 'incandescent-bulb', 'led']],
    [['cat litter', 'kitty litter', 'Katzenstreu'], ['bio-litter', 'cat-litter']],
    [['recliner', 'Sessel', 'Fernsehsessel'], ['armchair', 'electric-armchair']],
    [['bottle', 'Flasche'], ['glass-bottle', 'plastic-drink-packaging']],
    [['water bottle', 'Wasserflasche'], ['glass-bottle', 'plastic-drink-bottle', 'plastic-drink-packaging']],
    [['cooking oil', 'Speiseöl'], ['cooking-oil', 'solid-cooking-fat']],
    [['bread bag', 'Brottüte'], ['bread-paper-bag', 'bread-wrapper']],
    [['cream jar'], ['glass-cream-pot', 'plastic-cream-pot']],
    [['shampoo bottle', 'Shampooflasche'], ['glass-shampoo-bottle', 'plastic-shampoo']],
    [['paint brush', 'Pinsel'], ['dried-paint-brush', 'wet-paint-brush']]
  ];
  const exactTerms = new Map();
  for (const {item, names} of index) {
    for (const name of names) exactTerms.set(name, [...(exactTerms.get(name) || []), item.id]);
  }
  const actual = Object.fromEntries([...exactTerms].filter(([, ids]) => ids.length > 1)
    .map(([term, ids]) => [term, ids.sort()]));
  const allowed = Object.fromEntries(expected.flatMap(([terms, ids]) => terms.map(term => [normalize(term), ids])));
  assert.deepEqual(actual, allowed);
  for (const [term, ids] of Object.entries(allowed)) {
    const results = search(index, term, pendingTerms);
    assert.deepEqual(results.filter(result => result.score === 100).map(result => result.item.id).sort(), ids);
  }
});

test('representative expanded searches match the correct item across household areas', () => {
  for (const [query, id, category] of [
    ['Kaffeesatz', 'coffee-grounds', 'organic'],
    ['crisps packet', 'chip-bag', 'packaging'],
    ['Q-tip', 'cotton-swab', 'residual'],
    ['Wattestäbchen', 'cotton-swab', 'residual'],
    ['Spülmittelflasche', 'dish-soap-bottle', 'packaging'],
    ['copy paper', 'printer-paper', 'paper'],
    ['Klemmbaustein', 'plastic-building-brick', 'residual'],
    ['Kapuzenpulli', 'hoodie', 'textiles'],
    ['Blu-ray player', 'dvd-player', 'electronics'],
    ['oily rag', 'oily-rag', 'hazardous'],
    ['Mason jar', 'reusable-canning-jar', 'residual'],
    ['Nudelreste', 'cooked-pasta', 'organic'],
    ['used cooking oil', 'cooking-oil', 'hazardous'],
    ['e-bike battery', 'ebike-battery', 'landfill'],
    ['old pills', 'expired-tablets', 'hazardous']
  ]) {
    const [match, next] = search(index, query, pendingTerms);
    assert.equal(match?.score, 100, query);
    assert.equal(match.item.id, id, query);
    assert.equal(match.item.category, category, query);
    assert.notEqual(next?.score, 100, query);
  }
});

test('new clarification branches resolve empty containers, Pfand, shoes and glass jars', () => {
  for (const [query, expected] of [
    ['soda can', ['deposit', 'packaging']],
    ['PET bottle', ['deposit', 'packaging']],
    ['Putzmittelflasche', ['packaging', 'hazardous']],
    ['paint bucket', ['packaging', 'residual']],
    ['shoes', ['textiles', 'residual']],
    ['glass jar', ['glass', 'residual']]
  ]) {
    const [{item, score}] = search(index, query, pendingTerms);
    assert.equal(score, 100, query);
    assert.equal(item.category, null, query);
    assert.deepEqual(item.clarification.options.map(option => option.category), expected, query);
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
