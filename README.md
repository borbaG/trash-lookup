# Trash Lookup

Family-friendly German waste sorting lookup for Landkreis Kusel. Search in English or German, browse by category or alphabetically, or use the bin guide. The static app runs on GitHub Pages with no build step, accounts, or remote runtime dependencies.

## Run and test locally

Use an HTTP server because browser modules and service workers require one. To emulate the GitHub Pages project path, name the checkout `trash-lookup` and run `python -m http.server 8000` from its parent directory. Open `http://localhost:8000/trash-lookup/`. For the automated tests, run `node --test` from the checkout with Node.js 22 or later.

The first online visit installs a service worker that caches the app shell and verified database. Check offline mode after the worker has taken control. Increment `VERSION` in `service-worker.js` whenever a precached file changes. The browser installs updated assets in a new cache, then activates it once tabs using the old version close. Recents are stored on the current browser or installed app.

## Data and contributions

`data/waste-items.json` contains `schema_version`, an ISO `updated_at` date and an `items` array. Each item has the following fields.

| Field | Meaning |
| --- | --- |
| `id` | Stable, unique lowercase slug |
| `name_en`, `name_de` | Item labels in English and German |
| `synonyms_en`, `synonyms_de` | Search terms for the same item, including ordinary spelling variants |
| `category`, `instructions_en`, `warnings` | Destination ID from `data/categories.json`, English instructions and any warnings |
| `clarification` | `null` for direct results, otherwise a `question` and an `options` array. Each option has `label`, `category`, `instructions_en`, `warnings` and `source_url`. For a conditional item, leave the item-level category null and its instructions empty. |
| `source_url`, `verification_status`, `verified_at` | Official evidence, status and date reviewed (YYYY-MM-DD) |

Check every destination and clarification branch against official guidance. Use a precisely scoped item name and synonyms. For instance, search terms for packaging glass should not also name drinking glasses. If sources disagree, use current county material when it explicitly covers the case, otherwise leave it pending. Store drafts in `data/pending-items.json` using the same item fields, with pending status and a null category and verification date. The app loads only the verified directory and checks the verification status before adding an item to the search index. Update the database date and service worker version after publishing verified changes.

- [Landkreis Kusel waste services](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/)
- [County Abfall-ABC](https://www.wsb-landkreis-kusel.de/buergerservice/leistungen/RLP:entry:2231062:ANLR-VLR/abfall-abc/)
- [County Entsorgung guidance](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/entsorgung/)
- [2026 Abfallratgeber](https://www.landkreis-kusel.de/buergerservice-und-verwaltung/themen/abfallwirtschaft/abfall-app-abfallkalender-abfallbroschuere/bro-abfallkalender-2026-ansicht-final.pdf?cid=i0y)

Kusel collects glass packaging in a transparent sack. The guide uses the locally applicable bin, collection service or drop-off destination. It lists a verified route for each supported condition. Some items have additional options in the linked guidance.

## GitHub Pages

Push the source files to `main` in [borbaG/trash-lookup](https://github.com/borbaG/trash-lookup). In **Settings → Pages**, select **Deploy from a branch**, then **main** and **/ (root)**. Leave the custom domain blank. After the Pages deployment succeeds, open [Trash Lookup](https://borbag.github.io/trash-lookup/).
