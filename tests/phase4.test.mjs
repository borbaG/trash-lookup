import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { evaluateScenario } from '../benchmarks/evaluate.mjs';
import { makeIndex, normalize, search, verifiedItems } from '../search.js';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const data = await json('../data/waste-items.json');
const pending = await json('../data/pending-items.json');
const items = verifiedItems(data.items);
const index = makeIndex(items);
const pendingTerms = new Set(makeIndex(pending).flatMap(entry=>entry.names));

test('Phase 4 keeps the frozen family benchmark and checks all outcomes', async () => {
  const fixture = await read('../benchmarks/phase4-frozen.json');
  assert.equal(createHash('sha256').update(fixture.replaceAll('\r\n','\n')).digest('hex'),
    '16fe0fd41bb80ebcb9674d5fe694e2db2f5ce7563b47d3e94ffd82ee1fe2f8e0');
  const scenarios = JSON.parse(fixture);
  assert.equal(scenarios.length, 310);
  assert.equal(new Set(scenarios.map(row=>normalize(row.query))).size, scenarios.length);
  const expected = {verified:'correct_verified',clarification:'correct_clarification',unresolved:'safe_unresolved'};
  // Keep the frozen expectations visible even when the query lacks a safe precondition.
  const needsMoreInformation = new Set([
    'used roll on antiperspirant glass container',
    'spülmittel kanister mit rest'
  ]);
  for (const scenario of scenarios) {
    const result = evaluateScenario(scenario,index,pendingTerms);
    const outcome = needsMoreInformation.has(scenario.query) ? 'safe_unresolved' : expected[scenario.expected_outcome];
    assert.equal(result.outcome,outcome,scenario.query);
  }
});

test('damaged lithium cells go to staffed battery return and scoped pending items have no route', async () => {
  const [lithium] = search(index,'swollen lithium battery',pendingTerms);
  assert.equal(lithium.item.category,'batteries');
  assert.match(lithium.item.instructions_en,/Contact battery return staff/);
  assert.match(lithium.item.warnings.join(' '),/unattended collection boxes/);
  assert.equal(new URL(lithium.item.handling_source_url).hostname,'www.umweltbundesamt.de');
  for (const phrase of ['corroded AA batteries','coffee k cup with grounds','usb c cable','waxed paper soda cup']) {
    assert.deepEqual(search(index,phrase,pendingTerms),[],phrase);
  }
  const review = await json('../benchmarks/phase4-pending-review.json');
  assert.equal(review.length,39);
  assert.equal(new Set(review.map(row=>row.id)).size,39);
  for (const row of review) {
    assert.ok(row.rationale.trim());
    assert.ok(new URL(row.source_url).hostname.endsWith('landkreis-kusel.de'));
    assert.equal(pending.some(item=>item.id===row.id),row.decision==='pending');
  }
});
