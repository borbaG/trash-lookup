# Trash Lookup Phase 2 database expansion

Baseline commit `44af6cb`. Review date 23 November 2026.

## Results

| Measure | Count |
| --- | ---: |
| Starting verified items | 166 |
| New verified items | 372 |
| Final verified items | 538 |
| Pending items | 28 |
| English search terms | 1,506 |
| German search terms | 1,192 |
| Verified items with clarification questions | 12 |
| Baseline records removed or merged | 0 |
| Overlapping or misfiled draft rows excluded during review | 9 |
| Shared normalized exact terms reviewed and covered by tests | 21 |
| Verified items still needed to reach 2,000 | 1462 |

Term counts include canonical names and synonyms, deduplicated independently by language after trimming, case folding, and Unicode normalization. They exclude pending terms. The retained baseline IDs preserve bookmarked items and recent searches. The draft review kept overlapping vocabulary on broader entries where useful, such as potato peels, fruit scraps, and fish bones. The washing-powder box draft was consolidated under paper when it is plain cardboard.

## Verified additions by household area

| Household area | Added |
| --- | ---: |
| Kitchen and food waste | 31 |
| Food packaging and containers | 51 |
| Bathroom and personal care | 30 |
| Cleaning and laundry | 20 |
| Paper, cardboard, and mail | 11 |
| Toys, school, and crafts | 20 |
| Clothing and textiles | 27 |
| Electronics and batteries | 93 |
| Garage, garden, and DIY | 46 |
| Miscellaneous household items | 43 |

## Source coverage

| Primary source recorded on the item | Verified items |
| --- | ---: |
| [Landkreis Kusel 2026 Abfallratgeber](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/abfall-app-abfallkalender-abfallbroschuere/bro-abfallkalender-2026-ansicht-final.pdf?cid=i0y) | 423 |
| Landkreis Kusel Abfall-ABC, across the [county site](https://www.landkreis-kusel.de/buergerservice/leistungen/RLP:entry:2231062:ANLR-VLR/abfall-abc/) and its [WSB mirror](https://www.wsb-landkreis-kusel.de/buergerservice/leistungen/RLP:entry:2231062:ANLR-VLR/abfall-abc/) | 95 |
| [Landkreis Kusel Entsorgung](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/entsorgung/) | 20 |

The 2026 guide supplies page-level evidence where possible. Two Pfand answer branches also link to the federal return rule. The corresponding local packaging branches link to Kusel guidance. Records for specific products inherit a county material rule only when their names and instructions identify the relevant material and condition. [VerpackDG § 46](https://www.gesetze-im-internet.de/verpackdg/__46.html)

## Classification review

- **Glass jars.** Commercial food jars go in the transparent sack. Reusable home-canning glass follows the separate residual-waste entry in the county’s guide. The generic jar search asks which type the user has.
- **Tea bags and kitchen paper.** The 2026 guide specifies plastic-free tea bags for the Biotonne. The record now states that condition and gives the route for the loose tea leaves. An older paper-towel listing and the detailed kitchen-roll guidance use different scopes. The app describes ordinary used kitchen roll for wrapping or absorbing food waste and keeps hazardous wipes outside that instruction.
- **Textiles and shoes.** The older alphabetical table lists both textile collection and residual waste. The current guide defines when each applies. The new records require textiles to be clean and dry for collection and ask about the condition of ordinary shoes.
- **Electrical accessories.** The alphabetical list and the 2026 guide differ on cables. A generic cable record was left out. The new passive wall-switch, socket, and adapter records follow the detailed 2026 instructions and identify the passive types.
- **Packaging vs. contents.** A cleaner bottle with product remaining follows the Umweltmobil branch, while completely empty plastic packaging can go in the yellow sack. Generic queries such as “light bulb,” “shampoo bottle,” and “cooking oil” present multiple exact matches when the wording could refer to different destinations.

## Validation

- `node --test` passed 7 of 7 tests, including the original search and clarification checks. The expanded tests check JSON parsing, canonical names, ID uniqueness, disposal categories, verification sources, clarification branches, deliberate exact-match overlaps, pending suppression, and searches across all ten household areas.
- An Edge smoke test passed with the site served at `/trash-lookup/`. It exercised mobile layout, dark mode, navigation, recents, bilingual and typo searches, pending queries, clarification choices, and the PWA manifest. After taking the browser offline, it reloaded the app, found an expanded textile record and a battery record, and still returned the missing-item message for a pending e-bike. The browser recorded zero JavaScript or console errors.
- The service worker cache version was incremented. The app shell, categories, expanded database and pending search terms are precached under the project path.

## Remaining coverage

The verified count is below 2,000 because the county’s lists are illustrative and because mixed materials, residues, and specialized drop-off rules can change the destination. The largest remaining gaps are mixed personal-care and household products, multilayer packaging, toy and craft materials, and nonstandard batteries. The pending list includes examples such as coffee capsules, disposable takeaway cups, unknown-material cat litter, and damaged lithium batteries. Exact pending terms do not receive a fuzzy disposal suggestion.

Useful next sources are the county’s current sorting guides, site-specific acceptance lists, and direct guidance from the Kreisverwaltung for unresolved items. The bilingual names in the pending list can be used to ask for the destination and any material or condition limits. [County sorting guides](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/abfalltrennhilfe-in-unterschiedlichen-sprachen/) · [County drop-off locations](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/anlieferstellen/) · [Referat 51 Abfallwirtschaft](https://www.landkreis-kusel.de/buergerservice/abteilungen/RLP:department:355684/referat-51-abfallwirtschaft/)
