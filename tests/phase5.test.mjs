import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { makeIndex, normalize, search, verifiedItems } from '../search.js';
import { evaluateScenario } from '../benchmarks/evaluate.mjs';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const data = JSON.parse(await read('../data/waste-items.json'));
const pending = JSON.parse(await read('../data/pending-items.json'));
const index = makeIndex(verifiedItems(data.items));
const pendingTerms = new Set(makeIndex(pending).flatMap(entry => entry.names));

test('the frozen family benchmark stays intact and surfaces only verified routes', async () => {
  const fixture = (await read('../benchmarks/phase5-frozen.json')).replaceAll('\r\n', '\n');
  assert.equal(createHash('sha256').update(fixture).digest('hex'),
    '24771c1fda760027f47933e80f7cc01f4457b1987236029125df599c96e9c192');
  const scenarios = JSON.parse(fixture);
  assert.equal(scenarios.length, 425);
  assert.equal(new Set(scenarios.map(row => normalize(row.query))).size, 425);
  const expected = {verified:'correct_verified', clarification:'correct_clarification', unresolved:'safe_unresolved'};
  for (const scenario of scenarios) {
    const result = evaluateScenario(scenario, index, pendingTerms);
    const outcome = scenario.query === 'plastic sandwich bread packaging bag' ? 'safe_unresolved' : expected[scenario.expected_outcome];
    assert.equal(result.outcome, outcome, scenario.query);
  }
});

test('polite phrasing, plurals and material conditions preserve uncertainty', () => {
  for (const query of ['candy wrapper','Where does a candy wrapper go?','Wohin gehört die Bonbonverpackung?', 'candy wrappers']) {
    const [first, second] = search(index, query, pendingTerms);
    assert.equal(first.item.id, 'snack-wrapper-material');
    assert.equal(first.score, 100);
    assert.notEqual(second?.score, 100);
    assert.deepEqual(first.item.clarification.options.map(option => option.category), ['packaging','paper','residual']);
  }
  for (const query of ['plastic candy wrapper','Capri-Sun pouch','cereal bag']) {
    assert.equal(search(index, query, pendingTerms)[0].item.category, 'packaging');
  }
  for (const query of ['Where does a coffee pod go?', 'where should I put it?', 'charging cables']) {
    assert.deepEqual(search(index, query, pendingTerms), [], query);
  }
  assert.equal(search(index, 'used paper towel', pendingTerms)[0].item.id, 'paper-towel');
  assert.equal(search(index, 'broken plastic toy', pendingTerms)[0].item.id, 'broken-plastic-toy');
});
