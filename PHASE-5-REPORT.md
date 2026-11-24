# Phase 5 family vocabulary and search audit

Reviewed 24 November 2026 against `39cc5aa`.

The published Phase 4 catalog and local baseline matched byte-for-byte. In an Edge session with the Phase 4 worker, the exact query “candy wrapper” showed the plastic-wrapper route, while “Where does a candy wrapper go?” returned the missing-item message. The reported exact-query failure did not reproduce in that build. The longer query exposed a matching gap. The exact match also assumed plastic before the user specified a material.

The new lookup for candy and snack wrappers asks what the wrapper is made of and whether it is clean. Empty lightweight plastic, foil and bonded packaging use the yellow sack. Clean uncoated paper uses the paper bin, and heavily food-soiled paper goes into residual waste. The tests cover every requested snack term, its material-specific result or clarification and representative German variants. [Kusel disposal guidance](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/entsorgung/) · [2026 county guide, packaging](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/abfall-app-abfallkalender-abfallbroschuere/bro-abfallkalender-2026-ansicht-final.pdf?cid=i0y#page=15)

## Catalog and search

| Measure | Phase 4 | Phase 5 |
| --- | ---: | ---: |
| Verified entries | 1,000 | 1,004 |
| Unique English terms | 2,537 | 2,707 |
| Unique German terms | 2,140 | 2,173 |
| Pending entries | 39 | 70 |

The audit checked all 1,000 baseline records for evidence metadata, category and canonical integrity, and normalized alias overlap. Manual vocabulary review focused on the household groups in the brief. It changed synonyms on 58 baseline records, added 207 synonym assignments, and removed eight assignments that previously implied a material or condition. Unique term counts include canonical names and count a repeated term once per language. Every original record and its non-vocabulary data, including source references and verification metadata, was preserved.

Four missing concepts are handled through clarification records: material and cleanliness for candy and snack wrappers, material for takeaway containers, plastic content of tea bags, and electronics in broken plastic toys. Unresolved concepts include unknown chewing or craft materials, coated paper products, loose blades, unclear cleaner residues, and devices or packaging with unspecified contents. The expanded pending vocabulary prevents unrelated suggestions for concrete examples such as “coffee pods”, “crayons”, “glitter”, “cables”, and “plastic wrap”. Known packaging retains its own qualified lookup.

Search retains exact matches and existing fuzzy scoring. It understands common English and German disposal-question prefixes, ignores an initial article where applicable, and tries a conservative final-word plural fallback only against known exact terms. Unknown material and condition words are retained. Exact ties still show choices, and pending names suppress fuzzy suggestions. The existing pages, category colors, navigation, and dark mode are unchanged.

## Frozen family benchmark

The [425-query fixture](benchmarks/phase5-frozen.json) was frozen before corrections. It covers 219 purpose-written queries and 206 sampled household phrases from the catalog. It includes natural questions, American and German names, misspellings, ambiguous terms, and known gaps. Final results describe a regression set because the initial run informed the corrections. The fixture was held unchanged.

| Outcome | Before | After |
| --- | ---: | ---: |
| Correct disposal answers | 268 | 330 |
| Correct clarification paths | 8 | 56 |
| Safe unresolved results | 120 | 39 |
| Incorrect or misleading results | 29 | 0 |
| Actionable coverage | 64.94% | 90.82% |

One search with a direct-answer expectation, “plastic sandwich bread packaging bag,” still safely returned no answer. The phrase could mean a bread sales bag or a household sandwich bag. The shorter qualified bread-wrapper term remains available. The unmodified Phase 4 benchmark returned the same result before and after, with 282 correct disposal answers, 7 clarifications, 21 safe unresolved queries, and zero misleading results. Two Phase 3 terms, “granola bar wrapper” and “Schokoriegelverpackung,” now ask for material. The original fixture remains intact and the regression test explicitly checks that behavior.

## Testing and offline update

All 14 automated tests passed. Edge confirmed the v4-to-v5 worker update, offline reload, and all three wrapper branches, including English and German question phrasing. It also checked category browsing, A–Z, dark mode, mobile and desktop widths, manifest scope, pending lookup, and zero browser-console errors. Local search input and render updates took 0.10–4.40 ms in eight representative samples at mobile viewport size, with a 1.70 ms cached database request. These are desktop browser timings with an emulated mobile viewport.

Run `node benchmarks/evaluate-phase5.mjs` and `node benchmarks/evaluate-phase4.mjs` from the checkout to reproduce the benchmark outcomes.
