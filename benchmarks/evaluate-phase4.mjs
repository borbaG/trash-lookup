import { readFile } from 'node:fs/promises';
import { makeIndex, verifiedItems } from '../search.js';
import { evaluateScenario } from './evaluate.mjs';

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const [data, pending, scenarios] = await Promise.all([
  json('../data/waste-items.json'), json('../data/pending-items.json'), json('./phase4-frozen.json')
]);
const index = makeIndex(verifiedItems(data.items));
const pendingTerms = new Set(makeIndex(pending).flatMap(entry => entry.names));
const start = performance.now();
const results = scenarios.map(scenario => evaluateScenario(scenario, index, pendingTerms));
const duration = performance.now() - start;
const counts = Object.fromEntries(['correct_verified','correct_clarification','safe_unresolved','incorrect_or_misleading']
  .map(outcome => [outcome, results.filter(result => result.outcome === outcome).length]));
console.log(JSON.stringify({counts, milliseconds:duration, results}, null, 2));
