import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { normalize } from '../search.js';
import { runBenchmark } from '../benchmarks/evaluate.mjs';

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const data = await json('../data/waste-items.json');
const pending = await json('../data/pending-items.json');
const scenarios = await json('../benchmarks/family-scenarios.json');

test('Phase 3 additions have a local rule and pending records document a review', () => {
  const additions = data.items.filter(item => item.verification_basis);
  assert.ok(additions.length >= 180);
  for (const item of additions) {
    assert.ok(['explicit_local','local_material_rule'].includes(item.verification_basis));
    assert.ok(item.supporting_rule?.trim());
    assert.equal(new URL(item.source_url).hostname,'www.landkreis-kusel.de');
    assert.equal(new URL(item.source_url).protocol,'https:');
    for (const url of item.supporting_source_urls || []) {
      assert.equal(new URL(url).hostname,'www.landkreis-kusel.de');
    }
  }
  for (const item of pending) assert.ok(item.review_reason?.trim());
});

test('family searches verify the intended item, choices and unresolved cases', async () => {
  assert.ok(scenarios.length >= 300);
  assert.equal(new Set(scenarios.map(scenario=>normalize(scenario.query))).size,scenarios.length);
  const {counts, results} = await runBenchmark();
  assert.ok(counts.safe_unresolved > 20);
  assert.ok(counts.correct_clarification > 15);
  for (const result of results) {
    assert.ok(result.intended_items.every(Boolean), result.query);
    if (['granola bar wrapper', 'Schokoriegelverpackung'].includes(result.query)) {
      assert.equal(result.top_item, 'snack-wrapper-material');
      assert.equal(result.visible_disposition, 'question');
      continue;
    }
    const expected = {verified:'correct_verified',clarification:'correct_clarification',unresolved:'safe_unresolved'}[result.expected_outcome];
    assert.equal(result.outcome, expected, result.query + ' ranked ' + result.top_item);
    if (expected === 'safe_unresolved') {
      assert.equal(result.safely_reports_insufficient_information, true);
      assert.equal(result.classification_correct, null);
    } else {
      assert.equal(result.item_found, true);
    }
  }
});

test('service worker caches the complete database and serves it with the network disabled', async () => {
  const scope = 'https://borbag.github.io/trash-lookup/';
  const handlers = new Map();
  const appCache = new Map();
  const deleted = [];
  let offline = false;
  const fetch = async request => {
    if (offline) throw Error('offline');
    const url = new URL(request.url);
    const body = await readFile(new URL('../'+url.pathname.slice('/trash-lookup/'.length),import.meta.url));
    return new Response(body);
  };
  const cache = {
    addAll: async requests => {
      for(const request of requests) appCache.set(request.url,await fetch(request));
    },
    match: async url => appCache.get(url)?.clone()
  };
  const script = await readFile(new URL('../service-worker.js',import.meta.url),'utf8');
  runInNewContext(script,{
    URL,Request,fetch,self:{registration:{scope},addEventListener:(event,handler)=>handlers.set(event,handler),clients:{claim:async()=>{}}},
    caches:{open:async()=>cache,keys:async()=>['trash-lookup:'+scope+':v2','other-app'],delete:async key=>deleted.push(key)}
  });
  let job;
  const waitUntil = promise => { job = promise; };
  handlers.get('install')({waitUntil});
  await job;
  handlers.get('activate')({waitUntil});
  await job;
  assert.deepEqual(deleted,['trash-lookup:'+scope+':v2']);
  offline = true;
  for (const [file, expected] of [
    ['data/waste-items.json',data.items.length],
    ['data/pending-items.json',pending.length],
    ['data/categories.json',null]
  ]) {
    handlers.get('fetch')({request:new Request(scope+file),respondWith:waitUntil});
    const result = await (await job).json();
    if (expected !== null) assert.equal((result.items || result).length,expected);
    else assert.equal(result.glass.name_de,'Altglas · Transparenter Sack');
  }
});
