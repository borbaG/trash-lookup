import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { makeIndex, search, verifiedItems } from '../search.js';

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const sorted = values => [...values].sort().join(',');

export function evaluateScenario(scenario, index, pendingTerms) {
  const hits = search(index, scenario.query, pendingTerms);
  const [first, second] = hits;
  const exact = hits.filter(hit => hit.score === 100);
  const top = first?.item;
  const itemFound = hits.some(hit => scenario.item_ids.includes(hit.item.id));
  const inline = first?.score === 100 && second?.score !== 100;
  let outcome = 'incorrect_or_misleading';
  let classificationCorrect = null;
  if (!top) {
    outcome = 'safe_unresolved';
  } else if (scenario.expected_outcome === 'verified' && scenario.item_ids.includes(top.id) && exact.length < 2) {
    classificationCorrect = !top.clarification && scenario.expected_destinations.includes(top.category);
    if (classificationCorrect) outcome = 'correct_verified';
  } else if (scenario.expected_outcome === 'clarification') {
    if (scenario.item_ids.length > 1 && !inline
      && sorted(exact.map(hit => hit.item.id)) === sorted(scenario.item_ids)) {
      outcome = 'correct_clarification';
    } else if (scenario.item_ids.length === 1 && exact.length < 2 && top.id === scenario.item_ids[0]) {
      classificationCorrect = !!top.clarification
        && sorted(top.clarification.options.map(option => option.category)) === sorted(scenario.expected_destinations);
      if (classificationCorrect) outcome = 'correct_clarification';
    }
  }
  return {
    ...scenario, item_found: itemFound, classification_correct: classificationCorrect,
    safely_reports_insufficient_information: !top, outcome,
    top_item: top?.id ?? null, top_score: first?.score ?? null,
    visible_disposition: !top ? 'missing' : inline ? top.clarification ? 'question' : 'destination' : 'search_results'
  };
}

export async function runBenchmark() {
  const [data, pending, scenarios] = await Promise.all([
    json('../data/waste-items.json'), json('../data/pending-items.json'), json('./family-scenarios.json')
  ]);
  const index = makeIndex(verifiedItems(data.items));
  const pendingTerms = new Set(makeIndex(pending).flatMap(entry => entry.names));
  const names = new Map([...data.items, ...pending].map(item => [item.id, item.name_en]));
  const results = scenarios.map(scenario => ({
    intended_items: scenario.item_ids.map(id => names.get(id)),
    ...evaluateScenario(scenario, index, pendingTerms)
  }));
  const counts = Object.fromEntries(['correct_verified','correct_clarification','safe_unresolved','incorrect_or_misleading']
    .map(outcome => [outcome, results.filter(result => result.outcome === outcome).length]));
  const timing = [];
  for (let repetition = 0; repetition < 4; repetition++) {
    for (const scenario of scenarios) {
      const start = performance.now();
      search(index, scenario.query, pendingTerms);
      timing.push(performance.now() - start);
    }
  }
  timing.sort((a,b)=>a-b);
  return { counts, results, timing_ms:{median:timing[Math.floor(timing.length*0.5)],p95:timing[Math.floor(timing.length*0.95)]} };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  console.log(JSON.stringify(await runBenchmark(), null, 2));
}
