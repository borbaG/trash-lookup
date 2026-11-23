# Phase 3 family search coverage

The [family scenarios](benchmarks/family-scenarios.json) cover 336 distinct normalized queries. They include English and German phrases, spelling variants, misspellings, names used by visiting American families, material ambiguity, and items with no verified route. Expected routes were written with the applicable local collection rule. The benchmark was used to develop and verify the expansion, so the measured rates describe this regression set.

| Observed outcome | Scenarios | Share of all queries |
| --- | ---: | ---: |
| Correct verified disposal answer | 276 | 82.14% |
| Correct clarification or material choices | 21 | 6.25% |
| Safe unresolved | 39 | 11.61% |
| Incorrect or misleading | 0 | 0.00% |

**Actionable coverage was 297 of 336 queries (88.39%).** Of the 276 scenarios with a direct disposal expectation, 276 returned the expected result. All 21 ambiguity scenarios returned the expected options. Of the 39 unresolved scenarios, 39 returned the missing-item message. A safe unresolved result contributes no disposal answer.

The [evaluator](benchmarks/evaluate.mjs) runs the same search function and exact-match rules as the app. It records the intended item, whether it appeared, the top result, whether the visible lookup would show a destination, a question, a list, or the missing-item message, and whether the destination or clarification branches agree with the scenario. For typo suggestions it checks the destination of the first suggested item on selection. An unrelated suggestion cannot count as success. For material choices represented by several records it checks the expected set of exact matches. Those cases require user selection before a destination is shown.

## Timing and functional checks

- The 720-record database was 462,142 bytes before transfer compression. Over four passes through the 336 scenarios on the development machine, median search time was **1.14 ms** and p95 was **1.32 ms**. These measurements cover the search function.
- Desktop Edge at a 390 px mobile viewport loaded the cached verified database resource in **2.10 ms**. Eight representative search input and DOM updates took **0.20–3.20 ms**. These local timings do not estimate mobile network or low-end device performance.
- Edge installed cache v2 from the Phase 2 checkout, discovered and installed v3, activated it after the old page closed, and removed v2. It then reloaded the v3 app offline under `/trash-lookup/`, resolved the new bubble-mailer clarification, found a textile and a battery, and safely handled a pending e-bike.
- The browser also exercised initial load, A–Z, recycling category navigation, recents, dark mode and manifest scope, with zero JavaScript or browser-console errors.
- `node --test` passed 10 tests. The tests check original search behavior, database integrity, evidence and pending review fields, canonical names, expected ambiguous terms, clarification routes, all 336 scenarios and offline cache contents.

Run `node benchmarks/evaluate.mjs` from the checkout to regenerate the per-scenario results and search timings.
