# Phase 3 database expansion

Reviewed 23 November 2026 against the Phase 2 baseline, commit `c5cff70`.

| Measure | Phase 2 | Phase 3 |
| --- | ---: | ---: |
| Verified records | 538 | 720 |
| Pending records | 28 | 39 |
| English search terms | 1,506 | 1,897 |
| German search terms | 1,192 | 1,567 |

The 182 additions comprise 178 new concepts and four promotions from the existing pending list. All 538 baseline IDs were retained. The target of 2,000 leaves 1,280 verified items to add. Search-term counts include canonical names and synonyms deduplicated by language after Unicode normalization, case folding and trimming.

## What was added

- Foil and plastic packaging, food pouches and cartons, plain cardboard packaging, and glass cosmetic containers. Bubble mailers, frozen dinner boxes and paper-backed blister packs use the existing clarification interface when the material or separation changes the route.
- Manual razor heads, brush heads without electronics, cosmetic containers, hygiene items, plastic toys and school supplies.
- Powered household devices, chargers, battery toys, intact household cells, and replacement batteries with a documented scope.
- Food scraps, green waste, textiles, bulky indoor furniture, holiday waste, pet accessories and hazardous workshop leftovers.

Each addition records an English and German name, supporting rule, source URL, verification date and the evidence type. Of the additions, 1 uses an explicit local listing and 181 apply a verified local rule to a scoped item. The database uses Kusel’s transparent sack for qualifying glass packaging and yellow sack for qualifying lightweight packaging. Cables with unclear construction and damaged or swollen batteries remain pending.

## Pending review

All 28 previous pending records were reviewed. Four moved to verified and 24 remain pending. Fifteen additional unresolved household queries bring the pending total to 39. Each remaining row has a review reason. The previously pending rows also link to the local guidance considered.

| Resolved item | Local route |
| --- | --- |
| Plastic-containing tea bag after the tea is removed | Residual waste |
| Ordinary used compostable plastic bin liner | Residual waste |
| Partially filled medication blister | Umweltmobil |
| Leftover mixed wallpaper adhesive | Umweltmobil |

The first two rows apply the organic-bin exclusions on page 19 together with the ordinary household plastics rule on page 21. The other two use the medication and adhesive listings on page 30.

## Sources and remaining gaps

All six distinct HTTPS source URLs used by verified records and branches returned HTTP 200 after following redirects. The additions draw on the official 2026 guide and county drop-off information. The official alphabetical and disposal guides remain the foundation for retained records.

- [2026 Abfallratgeber](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/abfall-app-abfallkalender-abfallbroschuere/bro-abfallkalender-2026-ansicht-final.pdf?cid=i0y)
- [Landkreis Kusel Abfall-ABC](https://www.landkreis-kusel.de/buergerservice/leistungen/RLP:entry:2231062:ANLR-VLR/abfall-abc/)
- [Landkreis Kusel Entsorgung](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/entsorgung/)
- [County drop-off locations](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/anlieferstellen/)

The county guidance establishes collection routes for named categories and examples. Further useful expansion requires exact material and condition information for coffee pods, lined takeaway cups, mixed-material toys and craft supplies, specialized batteries, and child car seats. The older alphabetical listing and detailed 2026 guide differ on loose cables. Powered charger blocks use the electronics rule, while an unspecified loose cable stays unresolved. The available county guidance did not establish a handoff for damaged lithium cells.

See [family search coverage](PHASE-3-SEARCH.md) for the benchmark, measured results and offline tests.
