# The Starred Bill: notes for Claude

Compares dinner, lunch and wine pairing prices at Michelin-starred restaurants, with a page per country, region and city. Live at https://starredbill.com (GitHub repo sbarnard310/starred-bill). Each country's pages offer English plus its main official language (Chinese and Cantonese for Taiwan, Hong Kong and Macau, Chinese also for Singapore at the owner's request; French, Japanese, Spanish, Italian, Korean so far); the homepage, account and privacy pages are English only. README.md documents every data field. Keep it in step when fields change.

## How it's built
- `content/` is the data, edited by the owner in Pages CMS (app.pagescms.org) or on GitHub. There is one JSON file per restaurant in `content/restaurants/<country>/`, one per place in `content/places/`, plus `currencies.json` and `site.json`.
- `content/world-starred.json` lists every Michelin-starred restaurant in the world: name, stars, position and Michelin link. It drives the outlined "no prices yet" pins on the homepage map. It also gives the homepage's "Pick a country" cards for countries without a page yet (star counts and a button that frames them on the map); `WORLD_COUNTRIES` in build.py maps the guide's country names to our ids and English/Chinese names, and the build lists any new country it doesn't know. Below the cards, `content/no-stars.json` lists the UN member countries with no starred restaurant, by region, with an optional `note`/`noteZh` on why (most simply have no MICHELIN Guide; checked 4 Oct 2026 from the guide's own search, where only Saudi Arabia has a guide without stars). The build hides any country that has gained stars and asks for it to be deleted from that file. The cards can be filtered by continent (`CONTINENTS` in build.py; the build lists any country missing from it) and sorted A–Z, by starred restaurants, or by three-, two- or one-star restaurants, high to low or (clicking the chosen button again) low to high; the counts used come from the whole guide (`guide` on each country, from world-starred.json), since our pages may cover only some cities, and cards show that guide total when it's larger. Our own restaurants are matched by name and position (`same_restaurant` in build.py) and shown as filled pins with prices instead. To refresh it after big guide releases, follow `scripts/michelin_world.js` and `scripts/receive.py`. guide.michelin.com blocks curl, so the extraction runs in a browser tab and is posted to a local receiver.
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
- Languages: the owner's rule (4 Oct 2026) is English plus the country's main official language only. Don't add Chinese unless it's that language (Taiwan, Hong Kong, Macau) or the owner asked for it (Singapore keeps Chinese). Countries whose language the site doesn't have yet stay English only until it's added (Arabic for Qatar is on hold; Danish isn't added). A country with no `languages` is English only (`DEFAULT_LANGUAGES` in build.py), and pages with one language hide the switch. Older Chinese text (`...Zh` fields) stays in the data but isn't shown where Chinese isn't offered. `LANGS` in common.js (en, zh, yue Cantonese, fr, ja Japanese, es Spanish, it Italian, ko Korean). A country's `languages` sets its pages' buttons. A visitor's choice is kept across pages, and pages without it fall back (yue to zh, others to en). Translated fields use the suffixes Zh, Yue, Fr, Ja, Es, It and Ko, read through `pick()`. Every new UI string needs adding to all eight `I18N` dictionaries (en, zh, yue, fr, ja, es, ko, it). A new language also needs: `LANGS`, the build's `LANGUAGES` and `LANG_SUFFIXES`, a `CUISINE_..` map, `MONTHS`, an `inSentence..` rule in build.py if names take a preposition, and copies of the Fr fields in `.pages.yml`. Japanese text uses Noto Sans/Serif JP via `:lang(ja)` in site.css, Korean Noto Sans/Serif KR via `:lang(ko)`. In the preview pane, the site's service worker can't reach the local server, so pages lose their styles after the first load: unregister it (javascript_tool) before each check.
- Check changes in English and the page's other language (e.g. `?lang=fr`), in each currency, on Dinner and Lunch, and at phone width (no sideways scroll).
- Link previews: every page has Open Graph tags with a 1200×630 picture from `src/og/<place id>.png` (else the nearest place above, else `default.png`). After adding or renaming places, run `python3 scripts/og_images.py` on the Mac (it draws them with macOS AppKit via `scripts/og_images.js`) and commit the new pictures.
- Structured data (JSON-LD, `json_ld()` in build.py): each place page lists its breadcrumb trail and its starred restaurants (name, address, position, cuisine, Michelin award, tasting-menu price); the homepage says it's a WebSite. Google ratings stay out of it, as Google doesn't allow copied ratings.
- Publish: commit to `main` and push. The `gh` CLI is at `/usr/local/bin/gh` (add it to PATH). Watch the run with `gh run list --workflow deploy.yml` / `gh run watch`.
- Commit messages: a short imperative subject. Never commit `_site/`.

## Data rules
- A restaurant file's name is its id, and visitors' wishlists store it. Never rename a published restaurant file.
- Prices are numbers in the country's currency, per person, before service. Record where each price came from:
  - `sourceType`: `site` (the restaurant's own website), `press` (a review or booking site) or `none`.
  - `source`: the link.
  - The lunch equivalents are `lunchSourceType` and `lunchSource`.
- When a restaurant loses its stars or closes, keep it: set `stars` to 0 and fill in `status`, `formerStars` and `statusNote`.
- A restaurant's `city` is a place id. It shows on that place and on every place above it, plus any `group` that includes them. A region or country can hold restaurants directly: Hong Kong, Macau, Singapore, Ireland, and UK restaurants outside the cities we cover. These sit in their county where it has a page (e.g. `yorkshire`, `cumbria`, `perthshire`), otherwise in their nation (`england`, `scotland`, `wales`, `northern-ireland` or `channel-islands`), with "Town, County" in `area`. Every ceremonial county in England has a page (Yorkshire is one page for all four Yorkshire counties; London and Bristol are cities directly under England). When a city page is added (e.g. York inside Yorkshire), move its restaurants' `city` to it.
- US cities sit inside their state (Illinois, California, Florida, New York State), so a state page can grow when more of its cities are added. Washington DC sits directly under the United States. Los Angeles includes Santa Monica, Beverly Hills, West Hollywood, Culver City, Encino and Long Beach; Miami includes Miami Beach, Coral Gables and North Miami. Each state (or DC) sets its own `starsText` for its guide.
- Copenhagen sits inside Denmark and includes the starred restaurants in Hellerup, Gentofte and Holte (the Michelin guide's "Copenhagen area"). Danish prices already include service and 25% VAT. Singapore menus are priced "++": show the listed price, before the 10% service charge and 9% GST, as the Singapore page explains. Restaurants that closed since the previous guide stay listed with `status: closed`.
- Web addresses nest the whole chain, e.g. `/uk/england/london/`. A `district` sits inside a city (New York's five boroughs); restaurants there show "Neighbourhood, Borough" on the city page. Moving a page means adding its old address to the place's `redirectFrom`, which builds a forwarding page.
- Each country's currency must be in `content/currencies.json`.
- Sources used so far:
  - Stars, addresses and map positions: guide.michelin.com, extracted in the browser.
  - Google ratings: Places API (New) Text Search, sending `Referer: https://starredbill.com/` because the key only accepts set websites.
  - Prices: restaurant websites first, then recent reviews and booking sites.
  - Prices in the US: Tock pages (exploretock.com/<slug>) carry each menu's price in the page; OpenTable experience pages show prices including the service charge, so take the base amount (`minUnitAmount`) instead. OpenTable starts refusing after a few dozen quick fetches.
  - Prices in Japan: many top restaurants publish none. OMAKASE JapanEatinerary (omakaseje.com) restaurant pages list each course in yen, mostly including tax and service; read them with fetch() from inside an omakaseje.com browser tab, as it rate-limits heavy use. Pocket Concierge pages render in the browser after a moment. omakase.in and Tabelog show a Cloudflare check, so they can't be read, but search results quote their prices.

## Accounts
Free accounts let people keep their wishlist on every device and tick off restaurants they've been to ("been there").
- Supabase project `uvdaclbhskkukyngikhq` (London) holds sign-in and one table, `saved`: one row per person per restaurant (`wishlist`, `visited`, `visited_on`), keyed on the restaurant's file name. Its row-level security lets each person read and change only their own rows. `supabase/schema.sql` creates it (run in Supabase's SQL Editor); `delete_my_account()` lets someone delete themselves.
- `src/assets/account.js` loads the Supabase library from jsDelivr only when someone is signed in or signing in, signs in by an emailed 6-digit code (typed into the sign-in box, so it works inside the home-screen app, whose storage is separate from the browser's) or the email's link, or Google, and keeps the browser copies (`starredbill-wishlist`, `starredbill-visited` in localStorage) in step with the account. Pages keep reading the browser copies through `loadWishlist()` / `loadVisited()` and save through `setWishlist()` / `setVisited()` in common.js, which fire `sb:wishlist` / `sb:visited` events; `sb:account` fires when someone signs in or out.
- The first time a browser meets an account, anything saved while signed out is merged in; after that the account is the record. Changes wait in `starredbill-pending` until sent. Signing out clears both lists from that browser.
- Signed out, the wishlist works and stays in the browser; "been there" asks the person to sign up.
- The free Supabase plan pauses after about a week without activity, so `.github/workflows/supabase-keepalive.yml` asks the database one question every three days (it can also be run by hand from the Actions tab).
- `/account/` (account.html + account-page.js) shows stats, milestones, progress by destination, both lists, and download / sign out / delete. `/privacy/` (privacy.html + info-page.js) is the privacy notice in English and Chinese; update it if what's stored changes.
- In Supabase, Authentication › URL Configuration allows starredbill.com, www and localhost:8799. Google sign-in uses a Google Cloud OAuth client; sign-in emails go through Resend's SMTP from starredbill.com (set up 3 Oct 2026). Both sign-in emails (Magic Link and Confirm signup, under Authentication › Emails › Templates) use `supabase/email-template.html`, which shows the code (`{{ .Token }}`) above the link.

## Visit statistics
- Umami Cloud (cloud.umami.is, the owner's account) counts visits without cookies, so there's no cookie banner. Its script tag is in the `<head>` of every template in `src/` (place, home, account, privacy, 404), with `data-domains` set so local previews aren't counted.
- Clicks are sent as events by `track()` in common.js (and account.js for sign-ins): outbound (price source, Google Maps, other), share, language, currency, meal, search, near-me, jump-to-map, wishlist, been-there, sign-in-opened, sign-in-link-sent, sign-in-code, sign-in-google, sign-in, account-created. Never send emails or other personal details. New buttons worth counting get a `track()` call too, and the privacy page's "Visit statistics" paragraph must stay true.
- Google Search Console covers starredbill.com as a Domain property (DNS TXT at Namecheap), with the sitemap submitted.
- Google Analytics 4 (Measurement ID G-GE1KG403N4, `GA_ID` in common.js) runs alongside Umami, but only on starredbill.com and only after the visitor clicks Accept on the cookie banner (`renderCookieBar`, choice kept in localStorage `starredbill-consent`). Reject removes its `_ga` cookies. The privacy page's "Change cookie choice" button reopens the banner. `track()` sends every event to both, with hyphens turned into underscores for Google (account-created also sends Google's `sign_up`).
- The owner's devices aren't counted: opening any page with `?notrack=1` sets Umami's `umami.disabled` in that browser, which also stops Google Analytics and hides the cookie banner (`NOTRACK` in common.js); `?notrack=0` undoes it.
- New accounts: Supabase › Authentication › Users lists every account; Umami's "account-created" event shows them next to visits.

## Google Maps key
It's a browser key in `src/assets/common.js`, restricted to these addresses:
- `https://starredbill.com/*`
- `https://www.starredbill.com/*`
- `https://sbarnard310.github.io/*`
- `http://localhost:8799/*`

It's used for the maps (Maps JavaScript API) and restaurant photos (Places API (New)). The Google Cloud project is on the free trial, so quotas can't be capped yet. If it's upgraded, set daily caps.

## Planned work
- The owner's to-do list for the site is a Claude artifact: https://claude.ai/artifact/Axt5P5PtjBJ1R7VUziDPeL. Items live in its database, collection `tasks` (fields: title, section = destinations | features | fixes | updates | you, priority = now | next | later, status = todo | doing | done, notes, createdAt, doneAt). Read it with the ArtifactData tool when asked "what's next?", add items when asked, and when you finish a job that's on it, set its status to done (with doneAt).
- Alerts for wishlisted restaurants (star or price changes, booking-window reminders): next, building on accounts. Ideas are in `docs/accounts-plan.md`.

## Updates log
The same artifact has an "Updates log" tab: a dated record of every fix and every change to prices, restaurants, stars and pages. It lives in the same database, collection `log` (fields: title, kind = fix | prices | restaurants | stars | pages, notes, at, commit, createdAt).
- After every push that fixes something or changes prices, restaurants, stars or pages, add an entry with the ArtifactData tool. This includes new destinations, star changes, closures and moved pages. New features go on the to-do list instead (marked done), not here.
- One entry per change the owner would recognise. The title says what changed and where, in plain English, e.g. "Updated lunch prices for 12 London restaurants" or "Added Chicago: 25 starred restaurants". Put extra detail in `notes`.
- `at` is the commit time in UTC (`2026-10-03T13:02:25Z`), `commit` its short hash, and the doc id `<YYYY-MM-DD>-<short-slug>`.
- After `git pull --rebase`, if it brought in the owner's Pages CMS edits (commit message ending "(via Pages CMS)") that aren't logged yet, add them too, reading the diff to say what changed. Skip edits that were undone straight away.

## Destination queue
The to-do list's "New destinations" items carry "Queue N of 8" in their notes (Spain, Italy, Kyoto/Osaka/Nara, Seoul and Bangkok, the quick-win cities, the rest of France, Germany, mainland China). When the owner starts a new chat with "next destination", "carry on" or similar, read the list, take the lowest-numbered queue item still marked `todo` (one marked `doing` belongs to another chat), set it to `doing`, build it the way the existing destinations were built, publish, add the updates-log entry, then mark it `done` with `doneAt`. Big countries start with their main cities; note in the item what's left.

## Working in several chats at once
The owner may run several Claude chats on this site at the same time, filed under the "Starred Bill" sections in the Code tab sidebar (Main, New destinations, Features, Fixes & price updates).
- Run `git pull --rebase` before starting work and again before every push; other chats and Pages CMS also push to `main`.
- Keep each chat to its own area. Adding a destination mostly touches new files in `content/`; features and fixes touch `src/` and `build.py`. Two chats editing `build.py`, `common.js` or `site.css` at the same time will clash, so finish and push one before starting the other.
- If a push or rebase hits a conflict, resolve it carefully (keep both sides' changes), rebuild, test, then push.

