# The Starred Bill: notes for Claude

Compares dinner, lunch and wine pairing prices at Michelin-starred restaurants, with a page per country, region and city. Live at https://starredbill.com (GitHub repo sbarnard310/starred-bill). English and Traditional Chinese throughout. README.md documents every data field. Keep it in step when fields change.

## How it's built
- `content/` is the data, edited by the owner in Pages CMS (app.pagescms.org) or on GitHub. There is one JSON file per restaurant in `content/restaurants/<country>/`, one per place in `content/places/`, plus `currencies.json` and `site.json`.
- `content/world-starred.json` lists every Michelin-starred restaurant in the world: name, stars, position and Michelin link. It drives the outlined "no prices yet" pins on the homepage map. Our own restaurants are matched by name and position (`same_restaurant` in build.py) and shown as filled pins with prices instead. To refresh it after big guide releases, follow `scripts/michelin_world.js` and `scripts/receive.py`. guide.michelin.com blocks curl, so the extraction runs in a browser tab and is posted to a local receiver.
- `src/` holds the HTML templates (`place.html`, `home.html`) and the shared `assets/`:
  - `common.js` has the settings, all English/Chinese wording (`I18N`) and helpers.
  - `place.js` runs destination pages and `home.js` runs the homepage.
  - `site.css` holds all styles.
- `build.py` uses only the standard library and must stay **Python 3.9 compatible**, because that's the Mac's version. It checks the data, then writes `_site/`: one page per place (places with no stars yet get a short "none yet" page), the homepage, the sitemap and the 404 page. Bad data stops the build with a plain-English list of problems.
- `.github/workflows/deploy.yml` builds and publishes on every push to `main`. Pages `build_type` is `workflow`, and the custom domain is set in the repo's Pages settings. DNS is at Namecheap.
- `.pages.yml` defines the Pages CMS forms. Any new data field needs adding there too (`settings.content.merge: true` keeps unknown keys). The editor saves blank fields as `""`, which `tidy()` in build.py drops.

## Working on it
- Preview: `python3 build.py && python3 -m http.server 8799 --bind 127.0.0.1 -d _site`, then use the browser pane at http://localhost:8799.
  - Port 8765 belongs to another site.
  - The Google key only allows localhost on 8799.
  - There's no node, npm or Homebrew on this Mac.
- Languages: `LANGS` in common.js (en, zh, yue Cantonese, fr). A country's `languages` sets its pages' buttons. A visitor's choice is kept across pages, and pages without it fall back (yue to zh, others to en). Translated fields use the suffixes Zh, Yue and Fr, read through `pick()`. Every new UI string needs adding to all four `I18N` dictionaries.
- Check changes in English and Chinese (`?lang=zh`), in each currency, on Dinner and Lunch, and at phone width (no sideways scroll).
- Publish: commit to `main` and push. The `gh` CLI is at `/usr/local/bin/gh` (add it to PATH). Watch the run with `gh run list --workflow deploy.yml` / `gh run watch`.
- Commit messages: a short imperative subject. Never commit `_site/`.

## Data rules
- A restaurant file's name is its id, and visitors' wishlists store it. Never rename a published restaurant file.
- Prices are numbers in the country's currency, per person, before service. Record where each price came from:
  - `sourceType`: `site` (the restaurant's own website), `press` (a review or booking site) or `none`.
  - `source`: the link.
  - The lunch equivalents are `lunchSourceType` and `lunchSource`.
- When a restaurant loses its stars or closes, keep it: set `stars` to 0 and fill in `status`, `formerStars` and `statusNote`.
- A restaurant's `city` is a place id. It shows on that place and on every place above it, plus any `group` that includes them. A region or country can hold restaurants directly: Hong Kong, Macau, Ireland, and UK restaurants outside the cities we cover. These sit in their county where it has a page (e.g. `yorkshire`, `cumbria`, `perthshire`), otherwise in their nation (`england`, `scotland`, `wales`, `northern-ireland` or `channel-islands`), with "Town, County" in `area`. Every ceremonial county in England has a page (Yorkshire is one page for all four Yorkshire counties; London and Bristol are cities directly under England). When a city page is added (e.g. York inside Yorkshire), move its restaurants' `city` to it.
- Web addresses nest the whole chain, e.g. `/uk/england/london/`. A `district` sits inside a city (New York's five boroughs); restaurants there show "Neighbourhood, Borough" on the city page. Moving a page means adding its old address to the place's `redirectFrom`, which builds a forwarding page.
- Each country's currency must be in `content/currencies.json`.
- Sources used so far:
  - Stars, addresses and map positions: guide.michelin.com, extracted in the browser.
  - Google ratings: Places API (New) Text Search, sending `Referer: https://starredbill.com/` because the key only accepts set websites.
  - Prices: restaurant websites first, then recent reviews and booking sites.

## Google Maps key
It's a browser key in `src/assets/common.js`, restricted to these addresses:
- `https://starredbill.com/*`
- `https://www.starredbill.com/*`
- `https://sbarnard310.github.io/*`
- `http://localhost:8799/*`

It's used for the maps (Maps JavaScript API) and restaurant photos (Places API (New)). The Google Cloud project is on the free trial, so quotas can't be capped yet. If it's upgraded, set daily caps.

## Planned work
- The owner's to-do list for the site is a Claude artifact: https://claude.ai/artifact/Axt5P5PtjBJ1R7VUziDPeL. Items live in its database, collection `tasks` (fields: title, section = destinations | features | fixes | updates | you, priority = now | next | later, status = todo | doing | done, notes, createdAt, doneAt). Read it with the ArtifactData tool when asked "what's next?", add items when asked, and when you finish a job that's on it, set its status to done (with doneAt).
- Free user accounts (wishlist on every device, a "been there" checklist, alerts): not built yet. The plan, open decisions and the owner's setup steps are in `docs/accounts-plan.md`.

## Updates log
The same artifact has an "Updates log" tab: a dated record of every fix and every change to prices, restaurants, stars and pages. It lives in the same database, collection `log` (fields: title, kind = fix | prices | restaurants | stars | pages, notes, at, commit, createdAt).
- After every push that fixes something or changes prices, restaurants, stars or pages, add an entry with the ArtifactData tool. This includes new destinations, star changes, closures and moved pages. New features go on the to-do list instead (marked done), not here.
- One entry per change the owner would recognise. The title says what changed and where, in plain English, e.g. "Updated lunch prices for 12 London restaurants" or "Added Chicago: 25 starred restaurants". Put extra detail in `notes`.
- `at` is the commit time in UTC (`2026-10-03T13:02:25Z`), `commit` its short hash, and the doc id `<YYYY-MM-DD>-<short-slug>`.
- After `git pull --rebase`, if it brought in the owner's Pages CMS edits (commit message ending "(via Pages CMS)") that aren't logged yet, add them too, reading the diff to say what changed. Skip edits that were undone straight away.

## Working in several chats at once
The owner may run several Claude chats on this site at the same time, filed under the "Starred Bill" sections in the Code tab sidebar (Main, New destinations, Features, Fixes & price updates).
- Run `git pull --rebase` before starting work and again before every push; other chats and Pages CMS also push to `main`.
- Keep each chat to its own area. Adding a destination mostly touches new files in `content/`; features and fixes touch `src/` and `build.py`. Two chats editing `build.py`, `common.js` or `site.css` at the same time will clash, so finish and push one before starting the other.
- If a push or rebase hits a conflict, resolve it carefully (keep both sides' changes), rebuild, test, then push.

