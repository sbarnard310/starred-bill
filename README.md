# The Starred Bill

Compare dinner, lunch and wine pairing prices at Michelin-starred restaurants, city by city, in English and each country's main official language (Chinese, French, Japanese, Spanish, Korean…).

Live at https://starredbill.com

- Homepage with a world map, destination cards, search and your wishlist: https://starredbill.com/
- A page for every country, region and city, e.g. https://starredbill.com/uk/england/london/, https://starredbill.com/ireland/ or https://starredbill.com/taiwan/
- Add `?lang=en` for English. Taiwan, Hong Kong and Macau offer Chinese (`?lang=zh`), Hong Kong and Macau also Cantonese (`?lang=yue`), France and Monaco French (`?lang=fr`), Japan Japanese (`?lang=ja`), Spain Spanish (`?lang=es`) Italy Italian (`?lang=it`) and South Korea Korean (`?lang=ko`), Denmark Danish (`?lang=da`), Sweden Swedish (`?lang=sv`), Iceland Icelandic (`?lang=is`) Andorra Catalan (`?lang=ca`) and Thailand Thai (`?lang=th`). Since 5 Oct 2026 also: Germany, Austria, Liechtenstein German (`?lang=de`); Switzerland German, French and Italian; Belgium Dutch (`?lang=nl`) and French; the Netherlands Dutch; Luxembourg French and German; Portugal and Brazil Portuguese (`?lang=pt`); mainland China Simplified Chinese (`?lang=zhs`); Norway Norwegian (`?lang=nb`); Finland Finnish (`?lang=fi`); Poland Polish (`?lang=pl`); Czechia Czech (`?lang=cs`); Hungary Hungarian (`?lang=hu`); Slovenia Slovenian (`?lang=sl`); Croatia Croatian (`?lang=hr`); Serbia Serbian in Cyrillic (`?lang=sr`); Greece Greek (`?lang=el`); Türkiye Turkish (`?lang=tr`); Lithuania, Latvia and Estonia Lithuanian, Latvian and Estonian (`?lang=lt`, `lv`, `et`); Malta Maltese (`?lang=mt`); Malaysia Malay (`?lang=ms`); the Philippines Filipino (`?lang=fil`); Vietnam Vietnamese (`?lang=vi`); Qatar and the UAE Arabic (`?lang=ar`), which turns the page right to left.

## How it fits together

```
content/                 the data (edit these, ideally through Pages CMS)
  restaurants/<country>/<restaurant>.json   one file per restaurant
  places/<place>.json    one file per country, region, city or collection
  guides/<guide>.json    one file per explainer article, published at /guides/<guide>/
  currencies.json        currency symbols and fallback exchange rates
  site.json              site-wide settings (when prices were last checked)
src/                     the design (templates, styles and scripts)
build.py                 turns content/ + src/ into the finished site in _site/
.pages.yml               the editing forms for Pages CMS
.github/workflows/       GitHub runs build.py on every push and publishes the result
```

Each restaurant is stored once, in its city. It then appears on that city's page and on every page above it (region, country), plus any collection that includes it. So a London restaurant shows on London, England and United Kingdom without being entered three times.

The Near me page (`/near-me/`) is built from the same restaurant files, so it needs no data of its own: every starred restaurant with a map position appears on it automatically. Link to it with `?q=` and a place to open it already searched, e.g. `/near-me/?q=Bath`.

The Help me pick page (`/pick/`) reads the same data: six questions (where, lunch or dinner, budget, stars, food, dietary needs), then a best match, a best value and a wildcard. Its "food mood" groups come from each restaurant's `cuisine` (`MOODS` in `src/assets/pick.js`), its value pick from `dinner`, `lunch`, `wine` and `lunchWine`, and its wildcard prefers a recent `change`. Link to it with `?w=` and a page's address to answer the first question, e.g. `/pick/?w=/uk/england/london/`.

## Places

Every file in `content/places/` has an `id` (lower-case, hyphens, used in the web address), a `type`, a `name` and an optional `nameZh`.

| type | needs | web address |
|---|---|---|
| `country` | `currency` (e.g. `"GBP"`) | `/uk/` |
| `region` | `parent`: a country or region id | `/uk/england/` |
| `city` | `parent`: a country or region id | `/uk/england/london/` |
| `district` | `parent`: a city id | `/usa/new-york-state/new-york/manhattan/` |
| `group` | `includes`: a list of country, region or city ids | `/taiwan/southern-taiwan/` if all in one country, otherwise `/riviera/` |

A region or city's address follows everything above it, so a Yorkshire region inside England would be `/uk/england/yorkshire/`, and York inside it `/uk/england/yorkshire/york/`. If a page moves, list its old address in `redirectFrom` (e.g. London has `["/uk/london/"]`) and old links keep working.

Restaurants don't need a city page of their own: one outside the cities we cover can sit in its region or country (`city` set to e.g. `england` or `ireland`), with the town and county in `area`, e.g. "Aughton, Lancashire".

Groups are for areas that overlap the main structure, such as "the Riviera" (France and Italy) or "Northern England". Every place gets a page. One with no starred restaurants yet says so and links up to the nearest place that has some (e.g. Dorset links to England), so it's ready for its first star.

Optional `languages`, set on a country: the language buttons its pages offer (English and Chinese unless set). The rule is English, Chinese and the country's official language: Hong Kong and Macau add Cantonese, France French, Japan Japanese, Spain Spanish and Italy Italian. Any text field can have a `...Zh`, `...Yue` (Cantonese), `...Fr`, `...Ja` (Japanese), `...Es` (Spanish) or `...It` (Italian) version; Cantonese falls back to the Chinese text, and a missing translation falls back to English. French, Spanish and Italian place names also have `inSentenceFr`, `inSentenceEs` and `inSentenceIt`, the name with its preposition ("à Paris", "en el País Vasco", "nel Lazio"); Spanish defaults to "en" + the name, and Italian to "a" + a city or "in" + a country or region. The languages added on 5 Oct 2026 use the suffixes `Zhs`, `De`, `Nl`, `Pt`, `Nb`, `Fi`, `Pl`, `Cs`, `Hu`, `Sl`, `Hr`, `Sr`, `El`, `Tr`, `Lt`, `Lv`, `Et`, `Mt`, `Ms`, `Fil`, `Vi` and `Ar` (e.g. `nameDe`, `introZhs`, `dinnerNoteFil`, `areaAr`). German, Dutch, Portuguese, Norwegian, Malay, Filipino, Vietnamese and Arabic ("في الدوحة") build the mid-sentence name from a preposition ("in München", "no Porto" set by hand); the others decline names, so every place offering them must set it (`inSentenceFi` "Helsingissä", `inSentencePl` "w Polsce"), and the build says which are missing.

Optional `title`, `description` and `lead`, English only and never passed down: a place's own page title (up to 61 characters), search-result snippet (up to 155) and opening sentence, replacing the generated ones. Use them for pages that answer a question first, e.g. Boston's "Michelin Star Restaurants in Boston: Are There Any? (2026)" (Brief 15), and refresh them after each guide.

Optional text, set on a country and used by everything inside it unless a region or city sets its own: `inSentence` (the name mid-sentence, e.g. "the UK"), `intro`, `serviceText`, `sourcesText`, `starsText`, each with a `...Zh` version for Chinese.

## Restaurants

One file per restaurant in `content/restaurants/<country>/`. The file name is its id (e.g. `the-ledbury.json`) and is used for wishlists, so don't rename it once published.

| field | meaning |
|---|---|
| `name`, `nameZh`, `nameJa`, `nameZhs` | restaurant name (on Chinese pages, a restaurant with only `nameJa` shows it under the English name; `nameZhs` is the Simplified Chinese name for mainland China, from the MICHELIN Guide) |
| `city` | id of its city in `content/places/` |
| `area`, `areaZh`, `areaJa`, `address`, `addressZh`, `addressJa` | neighbourhood and full address |
| `stars` | 1, 2 or 3 |
| `cuisine`, `cuisineZh`, `cuisineJa` | Michelin's cuisine label; a new one creates a new filter button. Other languages use the MICHELIN Guide's own label where set (`cuisineDe`, `cuisineNl`, `cuisineFr`, `cuisineIt`, `cuisinePt`, `cuisineTr`, `cuisineZhs`), otherwise the language's `CUISINE_..` map |
| `rating`, `reviews`, `ratingNote` | Google rating out of 5 and number of reviews |
| `dinner` | dinner price per person in the country's currency, as a number |
| `dinnerType` | `menu` (tasting or set menu), `main` (typical main course) or `spend` (typical spend) |
| `dinnerNote`, `dinnerNoteZh` | what the price covers |
| `wine` | cheapest wine pairing, as a number |
| `noPairing` | `true` when the restaurant doesn't offer a wine pairing (checked on its own website); receipts, the wishlist bill and Compare then say "no pairing offered" rather than "no pairing listed". Leave `wine` and `lunchWine` out |
| `source`, `sourceType` | link to where the price came from; `site`, `press` or `none` |
| `lunch`, `lunchType`, `lunchNote`, `lunchNoteZh`, `lunchWine`, `lunchSource`, `lunchSourceType` | the same for lunch |
| `noLunch` | `true` when there's no lunch service |
| `change`, `changeNote`, `changeNoteZh`, `changeDate` | recent star change: `new`, `up` or `down`, and when (`2026-02`) |
| `status`, `formerStars`, `statusNote`, `statusNoteZh` | only for restaurants no longer starred: `lost`, `closed` or `changed` |
| `notice`, `noticeZh` | a current notice, e.g. temporarily closed |
| `website`, `lat`, `lng`, `placeId` | website, map position and Google place id (for the photo) |
| `chef`, `chefSource` | head chef, and where the name came from: `michelin`, `site` (the restaurant's website), `press` (recent reviews, interviews, hotel or booking pages such as OMAKASE, checked by hand) or `manual` (never overwritten). The MICHELIN refresh replaces any but `manual` when the guide names a chef |
| `diets` | dietary options from the MICHELIN Guide: any of `vegetarian-only`, `vegetarian-menu`, `vegetarian`, `vegan`, `gluten-free`, `halal`, `kosher` |
| `michelinId` | the restaurant's record id in the MICHELIN Guide, so refreshes match it exactly |

Leave out any field you don't have.

Restaurants listed in `RESTAURANT_PAGES` (build.py) also get a page of their own at `/restaurants/<file name>/`, built from the same fields: the prices as a till receipt and a bill with service, the stars, chef, cuisine, dietary options, Google rating, how the dinner price compares with the same stars nearby, the starred restaurants within 5 km and a FAQ. Destination pages and guide tables link to it. Its link-preview picture is its till receipt, drawn by `python3 scripts/restaurant_images.py` on the Mac into `src/og/restaurants/<id>.png` (run it again after changing a restaurant page's prices).

These optional fields appear only on a restaurant's own page; each part of the page is left out until they're filled in (Le Bernardin has them all):

| field | meaning |
|---|---|
| `menus` | every menu, each with `name`, `meal` (`dinner`, `lunch` or `lounge`, i.e. the bar or lounge), `price`, optional `wine` (its pairing), `courses` and `note`. Drives "Menus and prices", "Cheaper ways in" and the answer's "cheapest way in" |
| `menusSource`, `menusChecked` | where the menus came from and the day they were checked (`2026-10-09`) |
| `priceHistory` | past prices of the main dinner menu: `date` (`2019-10`), `price`, optional `wine` and `source` (e.g. an Internet Archive copy of the restaurant's menu page). Drawn as a bar chart with today's price added |
| `starsSince` | the year it first held its current number of stars, e.g. `2005` |
| `dressCode`, `booking`, `bookingUrl`, `cancellation`, `children` | "Before you go": plain sentences from the restaurant's own website; `bookingUrl` is its booking page (Resy, Tock, OpenTable… are named on the button) |
| `infoSource`, `infoChecked` | where those came from and the day they were checked |

Chefs and dietary options are refreshed from the MICHELIN Guide with `python3 scripts/michelin_details.py fetch` then `apply` (see the script for `review` and `chefs FILE`).

Opening hours live in `content/opening-hours.json`, written by `python3 scripts/michelin_details.py hours` (after `fetch`) from the MICHELIN Guide, not edited by hand: `checked` (the day they were fetched) and `hours`, one string per restaurant file name, Monday first, days split by `;`, each day's sittings by `,`, e.g. `";1200-1430,1800-2230;…"` (closed on Monday). Restaurants the guide gives no hours for are left out (all of Japan and most of mainland China). The guide often records only a day's first sitting, so the site trusts which days a restaurant opens, but shows times only for days with two sittings or a dinner one. Near me's "Open on" filter reads them (`/data/hours.json`), and restaurant pages show them under "Opening hours" (or "Open", days only). `scripts/chef_from_sites.py` gathers chef mentions from restaurants' own websites for checking by hand.

## Guides

Each file in `content/guides/` is one article at `/guides/<file name>/`, listed on `/guides/`. They're English only, in US or UK spelling as the content brief says.

| Field | What it is |
|---|---|
| `id` | the web address, same as the file name; never change it once published |
| `h1` | the headline |
| `title`, `description` | what search results show (up to 60 and 155 characters; the build stops if they're longer) |
| `summary` | one line for the Guides page |
| `section` | the Guides page group it sits in: `stars` (Understanding the stars), `where` (Where to find them) or `no-stars` (No stars yet); guides without one go under "More guides". "What is a Michelin star?" always leads the page on its own (`GUIDE_PILLAR` in build.py) |
| `figure` | a short key figure for its card on the Guides page, shown on a scrap of receipt paper beside the reading time, e.g. `{{n3UK}} in the UK, dinner from {{cheapest3UKPrice}}` (figures as in the body) |
| `imageAlt` | describes the featured picture, for screen readers and link previews. The picture isn't a field: it's `src/img/guides/<id>.jpg` (1600×900, top of the guide), `<id>-card.jpg` (800×450, the Guides page) and `<id>-og.jpg` (1200×630, link previews and the Article data), made from a full-size `<id>-src.jpg` by `python3 scripts/guide_images.py <id>`, in the house style in `docs/image-style.md`. A guide without a picture shows none and uses the site's default link preview |
| `places` | optional place ids (e.g. `["london"]`) where the guide leads the destination page's "Related guides" box, on that place and every place inside it. Without it, the box still finds the guide on any destination page its article (tables included) links to, and adds the world three-star list to pages with a three-star restaurant and the by-country guide everywhere (`related_guides()` in build.py; up to 6, English pages only) |
| `published`, `updated` | dates like `2026-10-05`; change `updated` whenever you edit |
| `lang` | `en-US` or `en-GB` |
| `body` | the article, in HTML |
| `keywords` | the searches the page targets, from its content brief, main one first; written into the page's keywords meta tag and Article data. The build lists any that don't appear in the title, headline, article or FAQ (ignoring case, punctuation and small words such as "a", "the" and "in") |
| `faq` | questions (`q`) and answers (`a`), shown under the article and given to Google as an FAQ |
| `picks` | optional write-ups for ranked lists: `restaurant` (a restaurant's file name) and `text` (HTML). `{{table:popular-top10}}` shows the ten most reviewed starred restaurants with their write-ups; the build names any of the ten without one |

Figures in the body and FAQ written in double curly brackets are worked out from the restaurant data each time the site is built, so they never go stale: `{{total}}`, `{{n1}}`, `{{n2}}`, `{{n3}}` (starred restaurants), `{{countries}}`, `{{topCountry}}`/`{{topCountryN}}`, `{{secondCountry}}`, `{{thirdCountry}}` (most starred restaurants), `{{top3Country}}`/`{{top3N}}`, `{{second3Country}}`/`{{second3N}}` (most three-star), `{{price1}}`–`{{price3}}` and `{{range1}}`–`{{range3}}` (median dinner tasting menu and middle half, in US dollars), `{{lunch1}}`–`{{lunch3}}`, `{{wine1}}`–`{{wine3}}`, `{{priced}}`, `{{oneIn3}}`, `{{guideYear}}` and `{{checked}}` (from `site.json`). For the list guides there are also `{{n3UK}}`, `{{n3London}}`, `{{ukTotal}}`, `{{londonTotal}}`, `{{usTotal}}`, `{{usStates}}`, `{{n3us}}`, `{{topState}}`/`{{topStateN}}` (and `second…`, `third…`), `{{new3}}`/`{{lost3}}` (restaurants that gained or lost a third star this year, from `change`, `changeDate` and `formerStars`), `{{cheapest3}}`, `{{cheapest3Place}}` and `{{cheapest3Price}}` (also with `UK` or `London` after `cheapest3`), and per country `{{in_<id>}}`, `{{n3_<id>}}` and `{{split_<id>}}` with hyphens written as underscores (`{{in_new_zealand}}`, `{{split_uk}}` = "165 one-star, 23 two-star and 10 three-star"). For the Indian guides: `{{indianTotal}}`, `{{indian1}}`–`{{indian3}}`, `{{indianSplit}}` ("1 three-star, 5 two-star and 17 one-star"), `{{indianCountries}}`, `{{indianCities}}` and `{{indianTopCity}}`/`{{indianTopCityN}}`, counting every starred restaurant whose cuisine says Indian plus `INDIAN_ALSO` in build.py (Thevar, which the MICHELIN Guide's own list of its starred Indian restaurants includes). Any restaurant's dinner or lunch price can go in a sentence as `{{dinner:<restaurant id>}}` or `{{lunch:<restaurant id>}}`, e.g. `{{dinner:gaa}}` = "฿6,200 (about $185)". `{{stars:<id>,<id>,…}}` adds up the stars a list of restaurants holds today, and `{{starred:<id>,<id>,…}}` counts how many still hold any (lost or closed ones count nothing), e.g. Gordon Ramsay's total in the celebrity chefs guide.

Whole tables built from the restaurant data go on a line of their own: `{{table:countries}}` and `{{table:us-states}}` (sortable star counts), `{{table:three-star-jump}}` (links to each country), `{{table:three-star}}` (every three-star restaurant by country, linked to its MICHELIN Guide page), `{{table:three-star-uk}}`, `{{table:three-star-london}}`, and `{{table:three-star-changes}}` (also `-uk` and `-london`): the new and lost three stars this year. `{{table:indian}}` lists every starred Indian restaurant with its city, stars, head chef and dinner price, and `{{table:indian-london}}` London's, with area and set lunch. For the chefs guide, `{{table:chefs}}` ranks every head chef of two or more starred restaurants with `CHEF_TABLE_MIN` (4) or more stars between them, and `{{table:chef-names}}` the chefs in `CHEF_NAMES` (build.py) by the stars on restaurants carrying their name or that they run, naming the head chef where it's someone else; both show each restaurant and the cheapest dinner menu among them. A restaurant's `chef` can name several, joined by "and", "&" or "/". Their figures are `{{chefTop}}`, `{{chefTopStars}}`, `{{chefTopN}}` (and `chefSecond…`), `{{chefNamed}}` (restaurants with a head chef named), `{{chefMulti}}` (chefs heading two or more), `{{chefListed}}`, `{{chefMin}}`, `{{chefTwoThree}}`/`{{chefTwoThreeNames}}` (chefs running two three-star restaurants), `{{names_<key>}}`, `{{names_<key>N}}` and `{{names_<key>3}}` for each `CHEF_NAMES` key (stars, restaurants and three-star restaurants, e.g. `{{names_ducasse}}`), `{{nameTop}}` (with `Stars`, `N`) and `{{nameLiving}}` (the same, leaving out `CHEFS_DECEASED`). `{{table:celebrity-chefs}}` lists the TV chefs in `CELEBRITY_CHEFS` (build.py, each with its restaurant ids) by the stars their restaurants hold today, in the same layout. The popularity rankings (Top Michelin star restaurants in the world) rank starred restaurants by their number of Google reviews (`rating`, `reviews`): `{{table:popular-50}}` (top 50), `popular-rated` (best rated with at least `RATED_MIN` reviews, 1,000), `popular-best-3` (best rated three-stars), `popular-1`, `-2` and `-3` (most reviewed at each level), `popular-value` (most reviewed with a meal for `VALUE_USD`, $100, or less and a rating of 4.5+), `popular-countries` (the most reviewed in each country) and `popular-top10`. Their figures are `{{popTop}}`, `{{popTopPlace}}`, `{{popTopReviews}}`, `{{popN}}`, `{{popReviews}}`, `{{pop50Min}}`, `{{pop50One}}`, `{{pop50Three}}`, `{{pop50Countries}}`, `{{pop50Lead}}`/`{{pop50LeadN}}`, `{{pop1Top}}`–`{{pop3Top}}` (with `Reviews`), `{{ratedTop}}` (with `Place`, `Rating`, `Reviews`), `{{ratedN}}`, `{{ratedMin}}`, `{{best3Top}}`/`{{best3TopRating}}`, `{{valueUSD}}`, `{{valueRating}}` and `{{ratingsChecked}}` (`RATINGS_CHECKED` in build.py: change it when the Google ratings are refreshed). For the kosher and halal guides, `{{table:diet-kosher-cities}}` and `{{table:diet-halal-cities}}` list the towns and cities with the most starred restaurants carrying that `diets` tag (`DIET_CITIES_MAX`, 15), with their stars and lowest tasting menu, and `{{table:diet-kosher-paris}}` (and the other places in `DIET_LISTS`, build.py) every tagged restaurant in that place. Their figures are `{{kosherTotal}}`, `{{kosherSplit}}`, `{{kosher3}}`, `{{kosherCountries}}`, `{{kosherCities}}`, `{{kosherPct}}` (share of all starred restaurants) and `{{kosher_<place id>}}` (tagged restaurants in any place, e.g. `{{kosher_new_york}}`), and the same with `halal`. The tags are the MICHELIN Guide's "Kosher options" and "Halal options", what restaurants say they can offer, not certification: never call a restaurant kosher or halal certified without a link to the certifier's register. Each table carries its own dated note.

A link written `<a data-guide="green-michelin-star">…</a>` becomes a link once that guide exists, and plain text until then.

The ceremony dates guide (`/guides/michelin-guide-ceremony-dates/`) reads `content/ceremonies.json`, one entry per MICHELIN Guide (editable in Pages CMS as "Ceremony dates"):

| Field | What it is |
|---|---|
| `id` | a short name, e.g. `great-britain-ireland`; the guide's row is `#cer-<id>` |
| `name` | e.g. "MICHELIN Guide Great Britain & Ireland" |
| `places` | the place ids it covers (and everything inside them). The build lists any country with starred restaurants that no guide covers |
| `show` | optional: the places to name and link instead, e.g. the cities rather than the states |
| `guide`, `showName`, `continent` | for a guide with no place page yet (South Australia): one of our guides to link, the name to show, and its continent |
| `usual` | the month(s) it's usually held, read after "usually in" |
| `ceremonies` | past ceremonies, newest first: `date` (`2026-02-09`), `where` (left out when unknown), `online` (true when the stars were published online with no ceremony) and `source` (a link) |
| `next` | the next ceremony once Michelin announces it (same fields). When its day comes the page treats it as the latest, and the build asks for it to be moved into `ceremonies` |
| `expected` | optional year-month the next is due, when that isn't a year after the last (Greece) |
| `starsUpdated` | the day our restaurant files caught up with this guide. While its latest ceremony is newer, the page shows "We're updating our pages" and every build prints a reminder |
| `checked` | the month we last looked for a newer date |
| `note` | an optional sentence shown under the guide's name |

Its tables are `{{table:ceremonies}}` (every guide by continent), `{{table:ceremonies-next}}` (announced dates in order, then guides whose turn comes within `CEREMONY_AHEAD_DAYS` with last year's date), `{{table:ceremonies-recent}}` (the last `CEREMONY_RECENT_DAYS`, with whether our pages have caught up) and `{{table:ceremonies-calendar}}` (the year at a glance). Its figures are `{{cerGuides}}`, `{{cerNext}}`, `{{cerNextDate}}`, `{{cerNextWhere}}`, `{{cerBusy}}` (the busiest months) and `{{cerSay_<id>}}`, a sentence on a guide's next (or last) ceremony with hyphens as underscores, e.g. `{{cerSay_northeast_cities}}`.

## Editing

The easiest way is Pages CMS: go to https://app.pagescms.org, sign in with GitHub and open **starred-bill**. Restaurants, Places, Guides, Currencies and Site settings each have a form; click **Save** and the site updates within a couple of minutes.

You can also edit a file on GitHub (pencil icon) and click **Commit changes**. Either way GitHub rebuilds the site and it's live within a couple of minutes. If something in the data is wrong, such as a misspelt city id or a price typed as `"£95"`, the build stops, the live site stays as it was, and the **Actions** tab says exactly what to fix.

## Previewing on a Mac

```bash
python3 build.py
python3 -m http.server 8799 -d _site
```

Then open http://localhost:8799. Nothing needs installing.
