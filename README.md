# The Starred Bill

Compare dinner, lunch and wine pairing prices at Michelin-starred restaurants, city by city, in English and each country's main official language (Chinese, French, Japanese, Spanish, Korean…).

Live at https://starredbill.com

- Homepage with a world map, destination cards, search and your wishlist: https://starredbill.com/
- A page for every country, region and city, e.g. https://starredbill.com/uk/england/london/, https://starredbill.com/ireland/ or https://starredbill.com/taiwan/
- Add `?lang=en` for English. Taiwan, Hong Kong and Macau offer Chinese (`?lang=zh`), Hong Kong and Macau also Cantonese (`?lang=yue`), France and Monaco French (`?lang=fr`), Japan Japanese (`?lang=ja`), Spain Spanish (`?lang=es`) Italy Italian (`?lang=it`) and South Korea Korean (`?lang=ko`), Denmark Danish (`?lang=da`), Iceland Icelandic (`?lang=is`) and Andorra Catalan (`?lang=ca`).

## How it fits together

```
content/                 the data (edit these, ideally through Pages CMS)
  restaurants/<country>/<restaurant>.json   one file per restaurant
  places/<place>.json    one file per country, region, city or collection
  currencies.json        currency symbols and fallback exchange rates
  site.json              site-wide settings (when prices were last checked)
src/                     the design (templates, styles and scripts)
build.py                 turns content/ + src/ into the finished site in _site/
.pages.yml               the editing forms for Pages CMS
.github/workflows/       GitHub runs build.py on every push and publishes the result
```

Each restaurant is stored once, in its city. It then appears on that city's page and on every page above it (region, country), plus any collection that includes it. So a London restaurant shows on London, England and United Kingdom without being entered three times.

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

Optional `languages`, set on a country: the language buttons its pages offer (English and Chinese unless set). The rule is English, Chinese and the country's official language: Hong Kong and Macau add Cantonese, France French, Japan Japanese, Spain Spanish and Italy Italian. Any text field can have a `...Zh`, `...Yue` (Cantonese), `...Fr`, `...Ja` (Japanese), `...Es` (Spanish) or `...It` (Italian) version; Cantonese falls back to the Chinese text, and a missing translation falls back to English. French, Spanish and Italian place names also have `inSentenceFr`, `inSentenceEs` and `inSentenceIt`, the name with its preposition ("à Paris", "en el País Vasco", "nel Lazio"); Spanish defaults to "en" + the name, and Italian to "a" + a city or "in" + a country or region.

Optional text, set on a country and used by everything inside it unless a region or city sets its own: `inSentence` (the name mid-sentence, e.g. "the UK"), `intro`, `serviceText`, `sourcesText`, `starsText`, each with a `...Zh` version for Chinese.

## Restaurants

One file per restaurant in `content/restaurants/<country>/`. The file name is its id (e.g. `the-ledbury.json`) and is used for wishlists, so don't rename it once published.

| field | meaning |
|---|---|
| `name`, `nameZh`, `nameJa` | restaurant name (on Chinese pages, a restaurant with only `nameJa` shows it under the English name) |
| `city` | id of its city in `content/places/` |
| `area`, `areaZh`, `areaJa`, `address`, `addressZh`, `addressJa` | neighbourhood and full address |
| `stars` | 1, 2 or 3 |
| `cuisine`, `cuisineZh`, `cuisineJa` | Michelin's cuisine label; a new one creates a new filter button |
| `rating`, `reviews`, `ratingNote` | Google rating out of 5 and number of reviews |
| `dinner` | dinner price per person in the country's currency, as a number |
| `dinnerType` | `menu` (tasting or set menu), `main` (typical main course) or `spend` (typical spend) |
| `dinnerNote`, `dinnerNoteZh` | what the price covers |
| `wine` | cheapest wine pairing, as a number |
| `source`, `sourceType` | link to where the price came from; `site`, `press` or `none` |
| `lunch`, `lunchType`, `lunchNote`, `lunchNoteZh`, `lunchWine`, `lunchSource`, `lunchSourceType` | the same for lunch |
| `noLunch` | `true` when there's no lunch service |
| `change`, `changeNote`, `changeNoteZh`, `changeDate` | recent star change: `new`, `up` or `down`, and when (`2026-02`) |
| `status`, `formerStars`, `statusNote`, `statusNoteZh` | only for restaurants no longer starred: `lost`, `closed` or `changed` |
| `notice`, `noticeZh` | a current notice, e.g. temporarily closed |
| `website`, `lat`, `lng`, `placeId` | website, map position and Google place id (for the photo) |

Leave out any field you don't have.

## Editing

The easiest way is Pages CMS: go to https://app.pagescms.org, sign in with GitHub and open **starred-bill**. Restaurants, Places, Currencies and Site settings each have a form; click **Save** and the site updates within a couple of minutes.

You can also edit a file on GitHub (pencil icon) and click **Commit changes**. Either way GitHub rebuilds the site and it's live within a couple of minutes. If something in the data is wrong, such as a misspelt city id or a price typed as `"£95"`, the build stops, the live site stays as it was, and the **Actions** tab says exactly what to fix.

## Previewing on a Mac

```bash
python3 build.py
python3 -m http.server 8799 -d _site
```

Then open http://localhost:8799. Nothing needs installing.
