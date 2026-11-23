# Trash Lookup Phase 4 completion report

Reviewed 23 November 2026 against deployed baseline `18c2957`.

| Database measure | Phase 3 | Phase 4 |
| --- | ---: | ---: |
| Verified household items | 720 | 1,000 |
| English search terms | 1,897 | 2,537 |
| German search terms | 1,567 | 2,140 |
| Pending items | 39 | 39 |

The 280 additions comprise 279 new scoped concepts and one promotion from the pending list. All 720 baseline IDs remain. Counts treat case-folded and Unicode-normalized names and synonyms as unique terms per language. Synonyms do not count as catalog entries.

New coverage includes food scraps, empty lightweight sales packaging, transparent-sack glass containers, cardboard packaging, personal care and dental items, small toys and crafts, powered accessories, pet products, textiles, bulky furniture, and workshop residues. New verified entries identify their source page and the local material rule used. The search implementation and application interface retain their existing behavior. The cache version is v4.

## Pending review

All 39 prior pending items have a [recorded decision and rationale](benchmarks/phase4-pending-review.json). One moved to verified, 38 remain from the previous list, and one new record preserves the unresolved case for a damaged battery of unspecified type. Damaged household lithium batteries now tell users to contact battery-return staff, describe the damage, and follow their handover instructions. The verified entry links to the county separate collection guide and records the federal handling guidance separately. No damaged battery has a household-waste or unattended drop-box recommendation. [Federal Environment Agency battery guidance](https://www.umweltbundesamt.de/umwelttipps-fuer-den-alltag/batterien-akkus-richtig-nutzen-fachgerecht)

Coffee capsules with grounds, generic lined cups, toys of unknown composition, unidentified cables, and damaged integrated batteries remain high-value gaps. The catalog covers a fully emptied aluminum capsule when it is identified as accepted lightweight packaging, and an empty lined cup when it is known to be sales packaging. A generic phrase does not establish either scope. The county's alphabetical listing and detailed guide give different directions for electrical cables, so unidentified cable variants remain pending.

All seven distinct source URLs used by verified entries, branches or the battery handling note returned HTTP 200 after redirects. The principal local guidance is the [2026 Abfallratgeber](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/abfall-app-abfallkalender-abfallbroschuere/bro-abfallkalender-2026-ansicht-final.pdf?cid=i0y), [Landkreis Kusel Abfall-ABC](https://www.landkreis-kusel.de/buergerservice/leistungen/RLP:entry:2231062:ANLR-VLR/abfall-abc/) and [Landkreis Kusel Entsorgung](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/entsorgung/).

## Frozen family benchmark

The [310-query Phase 4 benchmark](benchmarks/phase4-frozen.json) is separate from the earlier 336-query benchmark. It contains 93 authored household searches and 217 previously unused phrases sampled from the baseline catalog, including German and English names. It was frozen before the original run and held byte-for-byte unchanged. SHA-256 is `16fe0fd41bb80ebcb9674d5fe694e2db2f5ce7563b47d3e94ffd82ee1fe2f8e0`. The initial expansion and subsequent synonym improvements were scored on the same set. Because the results informed the synonym work, the final score measures regression coverage on this set.

| Outcome | Original Phase 3 | Phase 4 before synonym corrections | Phase 4 final | Final share |
| --- | ---: | ---: | ---: | ---: |
| Correct verified answer | 217 | 236 | 282 | 90.97% |
| Correct clarification path | 2 | 2 | 7 | 2.26% |
| Safe unresolved | 91 | 72 | 21 | 6.77% |
| Incorrect or misleading | 0 | 0 | 0 | 0.00% |
| Actionable coverage | 219 | 238 | 289 | 93.23% |

Classification accuracy among the 282 direct disposal answers was **282/282**. Of 284 scenarios with a frozen direct-answer expectation, 282 got one. The remaining two safely withheld a destination. “Used roll on antiperspirant glass container” does not establish that the container is empty. “Spülmittel Kanister mit Rest” does not establish that the cleaner is hazardous. The fixture preserves both original expectations. All seven expected clarification scenarios passed.

Run `node benchmarks/evaluate-phase4.mjs` at the repository root to reproduce the current per-scenario results.

## Validation and performance

- All 12 automated tests passed, including both family benchmarks, duplicate IDs and normalized canonical names, exact-match conflicts, sources, categories, clarification branches, pending suppression and offline cache contents.
- Edge verified the v3-to-v4 update under `/trash-lookup/`. It reread the expanded database offline, tested the new battery handover and ketchup packet, and withheld a disposal answer for USB-C cable. It also exercised the bilingual search, typo results, A–Z and category navigation, clarification UI, manifest, and 390 px and 1,440 px layouts. No browser-console errors were recorded.
- The verified JSON is 693,500 bytes before compression. In local desktop Edge at a mobile viewport, its cached resource request took 1.60 ms and eight representative search input and render updates took 0.20–3.80 ms. These local measurements do not establish performance on a low-end phone or a mobile network.
