# The Starred Bill price snapshots: method

Started 27 October 2026 (Phase 1). This is how the quarterly price snapshots are taken and how two of them are compared, so
that a later Starred Bill Price Index ("Michelin prices are up 6% in a year") rests on a method anyone can repeat.

## Taking a snapshot

Once a quarter, on a clean checkout of `main`:

1. `python3 scripts/price_dates.py --write`: brings every restaurant's `priceChangedAt` / `lunchChangedAt` up to date from
   git (it only moves dates forward). Commit if anything changed.
2. `python3 build.py --snapshot 2027-Q1`: writes `content/price-snapshots/2027-Q1.json` and refuses to overwrite one that
   exists. Commit it on its own ("Take the 2027-Q1 price snapshot").

Take each one in the quarter's first month where possible (the 2026-Q4 snapshot was taken on 27 October 2026), and after
any big price update rather than in the middle of one.

## What a snapshot holds

`about`: the quarter, the day it was taken, the method version (`method`, now 1), the commit it was taken from (with
`+edits` if restaurant files had uncommitted changes, which shouldn't happen), the exchange-rate date and the count.

`restaurants`: every restaurant with a star on that day, by its id (the file name, which never changes), with its stars,
country, page (`place`), currency and cuisine category, and for `dinner` and `lunch` where recorded:

| Field | Meaning |
|---|---|
| `price` | Per person, in the restaurant's own currency, before service, as recorded in our file |
| `type` | `menu` (a set or tasting menu), `spend` (a typical spend, mainly mainland China) or `main` (one main course) |
| `wine` | The wine pairing per person, where listed |
| `sourceKind` | `restaurant`, `booking`, `guide`, `press`, `member` or `none` (see README, "Price dates and provenance") |
| `verifiedAt` | The last day someone genuinely checked this price at its source |
| `changedAt` | The last day our record of it changed (from git) |
| `basis` | `published` (as the source gave it) or `derived` (worked out by us from it) |

Nothing converted, estimated or summed is stored: no exchange rates applied, no service added, no estimated wine.

## Comparing two snapshots

The comparison is **like for like**: the same restaurants, the same meal, the same kind of price, in the same currency.

1. **The cohort.** A restaurant and meal count when, in both snapshots, the meal has `type: menu`, the same currency and
   `basis: published`. Restaurants that closed, lost their stars or are new in the later snapshot are left out of the
   price change and reported separately (how many left, how many joined, and what the newcomers cost).
2. **Observed changes only, for the headline.** A price that was neither rechecked (`verifiedAt`) nor changed (`changedAt`)
   between the two snapshot days tells us nothing about whether it moved, and counting it as "no change" would understate
   rises. The headline figure uses only restaurants whose meal was checked or changed between the two days (the
   *observed* cohort). A second figure over every restaurant in the cohort (the *recorded* cohort) is shown beside it,
   always labelled.
3. **The measure.** For each restaurant, the ratio of the later price to the earlier. The index is the median ratio
   (and the geometric mean, as a check), in local currency, so exchange rates never move it. By country, city or star
   level, the same median over that group's restaurants; a group needs at least 10 restaurants to be reported.
4. **Odd ratios.** A ratio below 0.5 or above 2 usually means a different menu was recorded (a lunch price filed as dinner,
   a shorter menu). It's listed for checking, never dropped silently, and counted only once confirmed.
5. **Star levels.** A restaurant is grouped by its stars in the earlier snapshot; one that gained or lost a star is still
   compared, and the report says how many changed level.
6. **Wine.** Pairings are compared the same way, as their own index, over restaurants that list one in both snapshots.

## Reporting

Every published figure says: the two quarters, the cohort size (observed and recorded), the share of prices taken from
restaurants' own websites, and that prices are before service. Converted figures (for example "London vs Paris in US
dollars") say which day's exchange rates they use and are kept apart from the like-for-like change.

## Changing the method

Change this method only by raising `SNAPSHOT_METHOD` in build.py and describing the change here with its date. Older
snapshots stay as they were taken; comparisons across a method change say so.
