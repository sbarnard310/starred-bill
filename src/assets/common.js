// Shared by every page: settings, words in English, Traditional Chinese and the first eleven other languages, and small helpers.

// ---------- Settings ----------
// Google Maps Platform browser key, used for restaurant photos and the maps.
// Leave empty to show lettered placeholders and hide the maps.
const GOOGLE_MAPS_API_KEY = "AIzaSyA5AnpHOqFXxb6U3hDiXuAyQK2dIbZgLT4";
// Map pins run from light gold (one star) to deep bronze (three), with the star count printed inside.
// fill, ink and edge are the pin, its number and its outline; line and lineInk the outline and number of a hollow pin (no prices yet).
const MAP_PINS = {
  1: { fill: "#F0CF73", ink: "#3B2A05", edge: "#9A6F1E", line: "#C2953A", lineInk: "#7A5714" },
  2: { fill: "#8F651A", ink: "#FFFFFF", edge: "#FFFFFF", line: "#8F651A", lineInk: "#7A5714" },
  3: { fill: "#4A300A", ink: "#FFFFFF", edge: "#FFFFFF", line: "#4A300A", lineInk: "#4A300A" },
};
// Grey pins, numbered with the stars they had, for restaurants still open that lost their stars in the last three years (e.g. noma).
const LOST_PIN = { fill: "#D5D9D6", ink: "#56605A", edge: "#8B938E" };
const lostPin = (r) => r.status && r.status !== "closed" && r.formerStars && r.lat != null && r.lng != null &&
  (!r.changeDate || r.changeDate >= (new Date().getFullYear() - 3) + new Date().toISOString().slice(4, 7));
// The legend's little round pins, filled or hollow, coloured like the map's.
const legendPin = (s, hollow) => '<span class="pin-num' + (hollow ? " hollow" : "") + '" style="--pin:' + MAP_PINS[s][hollow ? "line" : "fill"] + ";color:" + MAP_PINS[s][hollow ? "lineInk" : "ink"] + '" aria-hidden="true">' + s + "</span>";
const legendLost = () => "<li>" + '<span class="pin-num" style="--pin:' + LOST_PIN.fill + ";color:" + LOST_PIN.ink + '" aria-hidden="true">✱</span><span>' + esc(t("formerTitle")) + "</span></li>";

// ---------- Words (English, Traditional Chinese, French, Cantonese, Japanese, Spanish and Italian) ----------
// {place} is the page's place name and {placeIn} the same name as it reads mid-sentence ("the UK").
// "one|many" picks the singular when {n} is 1.
const I18N = {
  en: {
    destGuide: "In the whole MICHELIN Guide: {n}",
    acctSentCode: "We've emailed a 6-digit code to {email}. Type it below to sign in here. (The link in the email works too, but in the home-screen app it opens your browser instead.)", acctCodeLabel: "Code from the email", acctVerify: "Sign in with code", acctVerifying: "Checking…", acctCodeWrong: "That code didn't work. Check it, or ask for a new one.", acctBadCode: "Type the 6-digit code from the email.",
    destHighLow: "high to low", destLowHigh: "low to high", destFlip: "Click again to reverse the order",
    destContLabel: "Continent", continents: { "europe": "Europe", "asia": "Asia", "middle-east": "Middle East", "americas": "Americas", "oceania": "Oceania" },
    destSortLabel: "Sort", destSortAZ: "A–Z", destSortMost: "Restaurants", destSortStars: "Restaurants with {n} star|Restaurants with {n} stars",
    noStarsTitle: "No Michelin stars yet", noStarsText: "These {n} countries have no Michelin-starred restaurant. For most, the reason is simply that the MICHELIN Guide doesn't cover them yet; where there's more to it (marked *), it's explained here.",
    destSoon: "No prices yet", destSoonMap: "See them on the map",
    destJump: "Jump to a country",
    notrackOn: "This browser is no longer counted in the visit statistics.", notrackOff: "This browser is counted in the visit statistics again.",
    destAreas: "Regions and cities", destRegions: "Regions", destCityList: "Cities",
    cookieText: "Can we use Google Analytics cookies to see how people use the site? Visits are counted without cookies either way.", cookieAccept: "Accept", cookieReject: "Reject", cookieSettings: "Change cookie choice",
    navCompare: "Compare", navMap: "Map", navStars: "By stars", navMethod: "Method", navContact: "Contact", navDestinations: "Destinations", navGuides: "Guides", navNear: "Near me", navPick: "Help me pick", wishlist: "Wishlist",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · Michelin Guide restaurants",
    heroTitle: "What a Michelin star <em>costs</em> in {placeIn}.",
    heroText: "Dinner, lunch and wine pairing prices per person at the starred restaurants in {placeIn}, side by side. Search by name or cuisine, filter by stars or cuisine, and save the ones you'd like to try to your wishlist.",
    crumbHome: "All destinations", explore: "Explore", exploreCities: "Cities in {country}", exploreDistricts: "Around {country}", alsoIn: "Also in",
    figCount: "Restaurants listed", figMin: "Cheapest dinner menu", figMax: "Priciest dinner menu", figMinLunch: "Cheapest lunch menu", figMaxLunch: "Priciest lunch menu",
    fMeal: "Meal", mealDinner: "Dinner", mealLunch: "Lunch", hNotesLunch: "Lunch notes", noLunch: "No lunch service", avgLunch: "avg lunch", infoLunch: "lunch",
    sortPriceAscLunch: "Lunch: low to high", sortPriceDescLunch: "Lunch: high to low",
    starCounts: "{3} three-star · {2} two-star · {1} one-star",
    compareTitle: "Every table, every price",
    compareText: "Switch between dinner and lunch below. Prices are for the tasting or set menu unless marked “per main” or “typical spend”, and the bars compare each menu with the most expensive on the list. Each price links to where it came from.",
    searchPh: "Search by restaurant, cuisine or area", searchPhShort: "Restaurant, cuisine or area", searchPhEx: "Search by restaurant, cuisine or area, e.g. “{ex}”",
    searchLabel: "Search restaurants by name, cuisine or area",
    sortLabel: "Sort restaurants",
    sortPriceAsc: "Dinner: low to high", sortPriceDesc: "Dinner: high to low", sortStars: "Most stars first", sortRating: "Google rating: highest first", sortName: "Name A–Z",
    fShow: "Show", fStars: "Michelin stars", fCuisine: "Cuisine",
    fDiet: "Dietary", dietVegOnly: "Vegetarian restaurant", dietVegMenu: "Vegetarian tasting menu", dietVeg: "Vegetarian options", dietVegan: "Vegan options", dietGf: "Gluten-free options", dietHalal: "Halal", dietKosher: "Kosher",
    badgeVegOnly: "Vegetarian", badgeVegMenu: "Veg menu", badgeVegan: "Vegan", chefLabel: "Chef {name}",
    exploreMore: "{n} more", exploreFewer: "Show fewer",
    filtersBtn: "Filters", filtersShowN: "Show {n} restaurant|Show {n} restaurants", filtersClear: "Clear all", cuisineSearchPh: "Find a cuisine", removeFilter: "Remove filter: {f}", sheetClose: "Close",
    showAll: "All restaurants", showChanges: "Recent star changes", showWish: "My wishlist",
    showChangesTitle: "Gained or lost a star in one of the last two Michelin Guides",
    all: "All", starsAria: "{n} Michelin star|{n} Michelin stars",
    hRestaurant: "Restaurant", hCuisine: "Cuisine", hStars: "Stars", hGoogle: "Google", hNotes: "Dinner notes", hPrice: "Price", hWine: "Wine pairing", hWish: "Wishlist",
    tableLabel: "Restaurant prices",
    reviews: "{n} reviews", ratingAria: "Google rating {r} out of 5",
    srcSite: "Restaurant website", srcPress: "Review source", srcTitle: "Where this price came from",
    perMain: "per main", typicalSpend: "typical spend", notListed: "Not listed",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · Table for 1", rcptDinnerOnly: "Dinner only", rcptNoPairing: "no pairing listed", rcptPlusWine: "+ wine {p}", rcptDinnerWine: "Dinner + wine", rcptLunchWine: "Lunch + wine", rcptChecked: "Checked {d}", rcptIncl: "Per person, service included", rcptPlus: "Per person, ++ (service and tax added)", rcptTaxTip: "Per person, before tax and tip", rcptTip: "Per person, before tip", rcptTax: "Per person, tax included",
    // The wishlist as one bill (homepage).
    billTitle: "Your wishlist as one bill", billIntro: "What everything you've saved would cost one person, with each country's usual service, tax and tips estimated on top.", billHead: "The Starred Bill · {meal} for 1", billWine: "Add wine pairings", billSubtotal: "Subtotal", billExtras: "Service, tax & tips (est.)", billTotal: "Total", billIncluded: "service included", billTax: "tax included", billBefore: "+{p}% service", billPlus: "++ adds about {p}%", billTaxTip: "tax and tip add about {p}%", billTip: "tip about {p}%", billNoLunch: "no lunch service, left out", billNoPrice: "no price yet, left out", billPerMain: "à la carte, left out", billCount: "Adds up {a} of {b} saved restaurant|Adds up {a} of {b} saved restaurants", billFoot: "Per person, before drinks unless wine is added. Service, tax and tips are estimates; check with each restaurant.", billConverted: "Converted at today's exchange rates.",
    findOnMaps: "Find {name} on Google Maps", findOnMapsTitle: "Find on Google Maps",
    showOnly: "Show only {cat}",
    chgNew: "New", chgTitle: "{note} in the {date} Michelin Guide",
    emptyWish: "None of your saved restaurants are in {placeIn}. Tap the heart on any restaurant to save it.",
    emptyPlace: "There are currently no restaurants with a Michelin star in {placeIn}, but we'll update this page as soon as one appears.",
    emptySee: "See the starred restaurant in {name}|See all {n} starred restaurants in {name}", exploreAll: "All areas",
    noMatch: "No restaurants match these filters.", clearFilters: "Clear search and filters",
    formerTitle: "No longer starred",
    formerNote: "Restaurants that were in the previous edition of this list but have since lost their stars, closed or changed. Shown for reference only.",
    formerly: "formerly", stLost: "Lost star", stClosed: "Closed", stChanged: "Changed",
    tapHint: "Tap a restaurant to see its full prices and details.",
    showing: "Showing {a} of {b} starred restaurants", showingFormer: ", plus {c} no longer starred",
    wishNote: "Your wishlist is saved in this browser only.",
    wishAdd: "Add {name} to your wishlist", wishRemove: "Remove {name} from your wishlist", wishAddT: "Add to wishlist", wishRemoveT: "Remove from wishlist",
    toastAdded: "Added {name} to your wishlist", toastRemoved: "Removed {name} from your wishlist", undo: "Undo",
    photo: "Photo", tempClosed: "Temporarily closed (Google)",
    mapTitle: "Every starred table on one map",
    mapText: "The pins follow the filters in the list above, so choose a star level, a cuisine or your wishlist and the map updates to match. Tap a pin for the price and a link to directions.",
    mapWait: "The map loads as you scroll here.", mapLabel: "Map of Michelin-starred restaurants",
    mapError: "The map couldn't load right now. The pin next to each restaurant in the list still opens it in Google Maps.",
    legendAria: "What the pin colours mean", legendItem: "{n} Michelin star|{n} Michelin stars",
    mapShowing: "Showing {n} restaurant on the map|Showing {n} restaurants on the map", mapNone: "No restaurants match the current filters",
    nearMe: "Near me", nearMeAria: "Show starred restaurants near my location", nearFinding: "Finding you…", youAreHere: "You are here",
    nearTitle: "Closest to you", nearAway: "{d} away", nearWorld: "See starred restaurants near you on the world map",
    nearNone: "None of the restaurants on this page is near you. The closest is {name}, {d} away.",
    nearDenied: "Location access is off. Allow it for this site in your browser settings, then try again.",
    nearFailed: "Couldn't find your location just now. Please try again.", nearUnsupported: "This browser can't share your location.",
    jumpMap: "Map", jumpMapAria: "Jump to the map",
    share: "Share", shareAria: "Share this page", shareTitle: "Share this page", shareCopy: "Copy link", shareCopied: "Link copied", shareEmail: "Email",
    accTitle: "Your account", accLoading: "Loading your account…", accOutText: "Sign in to see your wishlist and the restaurants you've been to, on any device. It's free.",
    accSignedInAs: "Signed in as {email}", accStatBeen: "Been there", accStatStars: "Stars collected", accStatThree: "Three-star restaurants", accStatCountries: "Countries",
    accMilestones: "Milestones", ms1: "First star", ms2: "First three-star", ms3: "10 restaurants", ms4: "25 restaurants", ms5: "3 countries", ms6: "50 stars collected", msGot: "(reached)",
    accWhere: "Where you've been", accOf: "{n} of {total}", accBeenTitle: "Been there", accBeenEmpty: "Nothing ticked off yet. Tap the ✓ next to any restaurant you've been to.",
    accDateAria: "Date you went to {name}", accRemove: "Remove", accWishTitle: "Your wishlist", accWishEmpty: "Your wishlist is empty. Tap the heart next to any restaurant to save it.",
    accMarkBeen: "Been there", accData: "Your data", accDataText: "Download everything we hold for your account, sign out on this device, or delete your account and both lists for good.",
    accDownload: "Download my data", accSignOut: "Sign out", accDelete: "Delete my account", accDeleteConfirm: "This deletes your account and both lists for good. It can't be undone.",
    accDeleteYes: "Delete for good", accDeleteNo: "Keep my account", accDeleted: "Your account has been deleted.", accDeleteFail: "Your account couldn't be deleted just now. Try again, or use the contact form.",
    acctSignIn: "Sign in", acctAccount: "Account", acctTitle: "Sign in or create a free account",
    acctWhy: "Keep your wishlist on every device and tick off the restaurants you've been to.",
    acctWhyBeen: "Create a free account to tick off the restaurants you've been to. It keeps your wishlist on every device too.",
    acctGoogle: "Continue with Google", acctOr: "or", acctEmailLabel: "Email address", acctSend: "Email me a sign-in code", acctSending: "Sending…",
    acctSent: "Check your email. We've sent a sign-in link to {email}. Open it on this device to finish signing in.",
    acctTooMany: "Too many sign-in emails just now. Wait a minute, then try again.", acctFailed: "That didn't work. Check the email address and try again.",
    acctBadEmail: "Enter a full email address, e.g. name@example.com.", acctSmall: "Free, and no password to remember. We only use your email to sign you in.",
    acctPrivacy: "Privacy notice", acctClose: "Close", acctWelcome: "You're signed in. Your wishlist now follows you to any device.",
    acctLinkExpired: "That sign-in link has expired or was already used. Tap Sign in to get a new one.",
    been: "Been there", beenAdd: "Mark {name} as been there", beenRemove: "Remove {name} from been there", beenAddT: "Mark as been there", beenRemoveT: "Remove from been there",
    toastBeen: "Marked {name} as been there", toastNotBeen: "Removed {name} from been there", showBeen: "Been there",
    beenProgress: "You've been to {n} of the {total} here.", wishNoteOut: "Your wishlist is saved on this device only.", wishNoteSignIn: "Sign in to keep it on every device", wishCompare: "Compare your saved restaurants side by side",
    wishNoteIn: "Your wishlist and been-there list are saved to your account.", wishCtaHome: "Your wishlist is saved on this device only. Sign up free to keep it on every device and tick off the restaurants you've been to.",
    wishCtaBtn: "Sign up free", wishSynced: "Saved to your account.", acctSee: "See your account",
    shareInsta: "For Instagram, copy the link and paste it into a story or message.",
    shareMore: "Instagram, Messages and more",
    shareTextPlace: "What a Michelin star costs in {placeIn}: dinner, lunch and wine pairing prices side by side.",
    shareTextHome: "What a Michelin star costs, city by city: dinner, lunch and wine pairing prices side by side.",
    infoDinner: "dinner", infoWine: "wine", infoGoogle: "on Google", infoOpen: "Open in Google Maps", infoNoPrice: "Price not listed",
    starsTitle: "How much each extra star adds",
    starsText: "Average menu price for the meal chosen above, grouped by Michelin stars. À la carte restaurants are counted but left out of the averages and ranges.",
    tierNames: ["One star", "Two stars", "Three stars"], avgDinner: "avg dinner", tRestaurants: "Restaurants", tRange: "Range", tRating: "Avg Google rating",
    tVs: "vs {n} star|vs {n} stars", tNoPrices: "No menu prices for these restaurants.", tNone: "No {tier} restaurants listed.",
    methodTitle: "How the prices are counted",
    m1Title: "Per person, before service",
    m1Text: "Every figure is for one guest and excludes service charge, which varies from country to country. Supplements such as caviar or truffle courses are left out. Prices shown in another currency use the day's exchange rate and are approximate.",
    m2Title: "Where prices come from",
    m2Text: "Dinner is the main tasting menu where there is one, and wine is the cheapest pairing for it. We take prices from each restaurant's own website where they're published, otherwise from recent reviews and booking sites. Lunch is the restaurant's set or tasting lunch menu, and the note says which days it's served.",
    m3Title: "Stars and Google rating",
    m3Text: "The Google reviews score out of 5 and the number of reviews, checked in October 2026. Stars come from the latest Michelin Guide for each country. A green ▲ marks a restaurant that gained a star in one of the last two guides; a red ▼ marks one that lost its star.",
    contactTitle: "Spotted a price change?",
    contactText: "Menus are repriced often. Tell us about an update, a restaurant we've missed, or a city you'd like covered next.",
    cName: "Name", cEmail: "Email", cTopic: "Topic", cTopicPrice: "Price update", cTopicSuggest: "Suggest a restaurant", cTopicCity: "Cover another city", cTopicOther: "Something else",
    cMsg: "Message", cMsgPh: "Tell us the restaurant, the new price and where you saw it.",
    cSend: "Send message", errName: "Enter your name.", errEmail: "Enter an email address like name@example.com.", errMsg: "Write a short message.",
    sent: "Thanks, {name}. Your email app should open with your message: just press Send. If it doesn't, write to hello@starredbill.com.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Prices and ratings checked October 2026. Check with each restaurant before booking.",
    rateLine: "Prices in {sym} are approximate, using the exchange rate on {date}: {sym}1 = {home}{rate}.",
    rateLineMixed: "Prices are converted to {sym} using the exchange rate on {date}, so they're approximate.",
    currencyAria: "Show prices in", crumbsAria: "Where you are", menuOpen: "Menu",
    // Homepage
    homeTitle: "The Starred Bill · Michelin-starred restaurant prices",
    homeEyebrow: "Michelin star restaurants, priced",
    homeH1: "What a Michelin star <em>costs</em>, city by city.",
    homeText: "Dinner, lunch and wine pairing prices per person at Michelin-starred restaurants, side by side and linked to where each price came from. Pick a destination, or explore the map.",
    figRestaurants: "Restaurants priced", figDestinations: "Destinations", figUpdated: "Prices checked", figUpdatedSub: "Dinner, lunch and wine pairings",
    citiesN: "{n} city|{n} cities",
    homeSearchPh: "Find a restaurant, cuisine or city", homeSearchLabel: "Find a restaurant, cuisine or city", searchNone: "Nothing matches “{q}” yet.",
    mapHomeTitle: "Every Michelin-starred restaurant in the world",
    mapHomeText: "Zoom in to see individual restaurants. Tap a pin for the dinner price and a link to compare it with the rest of the city.",
    destTitle: "Pick a country", destText: "Each destination has its own page with prices, filters, a map and star-by-star averages.",
    destRestaurants: "{n} starred restaurant|{n} starred restaurants", destFrom: "Dinner menus from {p}", destOpen: "Compare {place}",
    collectionsTitle: "Collections",
    wishTitle: "Your wishlist", wishText: "Restaurants you've saved from any destination.",
    wishEmptyHome: "Nothing saved yet. Tap the heart next to any restaurant on a destination page to save it here.",
    wishRemoveShort: "Remove",
    infoCompare: "Compare prices in {place}",
    clearSearch: "Clear search", photoView: "View a larger photo of {name}", photoClose: "Close",
    mapSearchPh: "Search the map: restaurant, city or country", mapSearchPhShort: "Restaurant, city or country", homeSearchPhShort: "Restaurant, cuisine or city", mapSearchLabel: "Search the map for a restaurant, city or country",
    mapHomeWorldText: "All {n} Michelin-starred restaurants in the world. Filled pins have full price comparisons on this site; outlined pins link to the MICHELIN Guide until we add their prices. Zoom in to see individual restaurants.",
    infoNoPricesYet: "No prices on The Starred Bill yet", infoMichelin: "MICHELIN Guide", legendHollow: "Outlined = no prices yet",
    installApp: "Install app",
    installTipIos: "To install: tap the Share button (the square with an arrow) in Safari, then choose “Add to Home Screen”."
  },
  zh: {
    destGuide: "米其林指南全國共 {n} 家",
    acctSentCode: "我們已將 6 位數驗證碼寄到 {email}。在下方輸入即可在這裡登入。（郵件中的連結也可以用，但在主畫面 App 中會改為開啟瀏覽器。）", acctCodeLabel: "郵件中的驗證碼", acctVerify: "用驗證碼登入", acctVerifying: "驗證中…", acctCodeWrong: "驗證碼無效。請檢查，或重新索取。", acctBadCode: "請輸入郵件中的 6 位數驗證碼。",
    destHighLow: "由多到少", destLowHigh: "由少到多", destFlip: "再按一次可反轉順序",
    destContLabel: "洲別", continents: { "europe": "歐洲", "asia": "亞洲", "middle-east": "中東", "americas": "美洲", "oceania": "大洋洲" },
    destSortLabel: "排序", destSortAZ: "依名稱", destSortMost: "餐廳數", destSortStars: "{n}星餐廳數",
    noStarsTitle: "尚無米其林星級的國家", noStarsText: "以下 {n} 個國家目前沒有米其林星級餐廳。多數只是因為米其林指南尚未涵蓋；若另有原因（標示 *），說明如下。",
    destSoon: "尚無價格", destSoonMap: "在地圖上查看",
    destJump: "跳至國家或地區",
    notrackOn: "此瀏覽器已不再計入瀏覽統計。", notrackOff: "此瀏覽器已重新計入瀏覽統計。",
    destAreas: "地區與城市", destRegions: "地區", destCityList: "城市",
    cookieText: "我們可以使用 Google Analytics Cookie 來了解大家如何使用本網站嗎？無論你怎麼選，我們都只以不使用 Cookie 的方式計算瀏覽量。", cookieAccept: "接受", cookieReject: "拒絕", cookieSettings: "更改 Cookie 選擇",
    navCompare: "比較", navMap: "地圖", navStars: "星級", navMethod: "說明", navContact: "聯絡我們", navDestinations: "目的地", navGuides: "指南", navNear: "我附近", navPick: "幫我挑選", wishlist: "願望清單",
    pageTitle: "The Starred Bill・{place}",
    heroEyebrow: "{place}・米其林指南餐廳",
    heroTitle: "在{place}，一顆米其林星<em>要價</em>多少？",
    heroText: "並列比較{place}米其林星級餐廳的每人晚餐、午餐與餐酒搭配價格。可依名稱或料理搜尋、依星級或料理篩選，也能把想去的餐廳加入願望清單。",
    crumbHome: "所有目的地", explore: "探索", exploreCities: "{country}的城市", exploreDistricts: "{country}各區", alsoIn: "也屬於",
    figCount: "星級餐廳", figMin: "最便宜晚餐套餐", figMax: "最貴晚餐套餐", figMinLunch: "最便宜午餐套餐", figMaxLunch: "最貴午餐套餐",
    fMeal: "餐期", mealDinner: "晚餐", mealLunch: "午餐", hNotesLunch: "午餐說明", noLunch: "不供應午餐", avgLunch: "平均午餐", infoLunch: "午餐",
    sortPriceAscLunch: "午餐：由低到高", sortPriceDescLunch: "午餐：由高到低",
    starCounts: "三星 {3} 家・二星 {2} 家・一星 {1} 家",
    compareTitle: "每張餐桌，每個價格",
    compareText: "可在下方切換晚餐與午餐。價格為品嚐或套餐價格，標示「每道主菜」或「人均消費」者除外；長條圖將各套餐與最貴者比較，每個價格都附有來源連結。",
    searchPh: "搜尋餐廳、料理或地區", searchPhShort: "餐廳、料理或地區", searchPhEx: "搜尋餐廳、料理或地區，例如「{ex}」",
    searchLabel: "依名稱、料理或地區搜尋餐廳",
    sortLabel: "排序",
    sortPriceAsc: "晚餐：由低到高", sortPriceDesc: "晚餐：由高到低", sortStars: "星級由高到低", sortRating: "Google 評分由高到低", sortName: "依名稱排序",
    fShow: "顯示", fStars: "米其林星級", fCuisine: "料理類型",
    fDiet: "飲食需求", dietVegOnly: "素食餐廳", dietVegMenu: "素食套餐", dietVeg: "提供素食", dietVegan: "提供純素", dietGf: "提供無麩質", dietHalal: "清真", dietKosher: "猶太潔食",
    badgeVegOnly: "素食", badgeVegMenu: "素食套餐", badgeVegan: "純素", chefLabel: "主廚 {name}",
    exploreMore: "另外 {n} 個", exploreFewer: "收起",
    filtersBtn: "篩選", filtersShowN: "顯示 {n} 間餐廳", filtersClear: "全部清除", cuisineSearchPh: "搜尋料理類型", removeFilter: "移除篩選：{f}", sheetClose: "關閉",
    showAll: "全部餐廳", showChanges: "近期星級變動", showWish: "我的願望清單",
    showChangesTitle: "在最近兩版米其林指南中獲得或失去星級",
    all: "全部", starsAria: "米其林 {n} 星",
    hRestaurant: "餐廳", hCuisine: "料理", hStars: "星級", hGoogle: "Google", hNotes: "晚餐說明", hPrice: "價格", hWine: "餐酒搭配", hWish: "願望清單",
    tableLabel: "餐廳價格",
    reviews: "{n} 則評論", ratingAria: "Google 評分 {r}（滿分 5）",
    srcSite: "餐廳官網", srcPress: "評論來源", srcTitle: "價格資料來源",
    perMain: "每道主菜", typicalSpend: "人均消費", notListed: "未公布",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · 1 位", rcptDinnerOnly: "僅供應晚餐", rcptNoPairing: "未列出餐酒搭配", rcptPlusWine: "+ 配酒 {p}", rcptDinnerWine: "晚餐 + 配酒", rcptLunchWine: "午餐 + 配酒", rcptChecked: "{d} 查核", rcptIncl: "每人價格，已含服務費", rcptPlus: "每人價格，另加 ++（服務費及稅）", rcptTaxTip: "每人價格，未含稅及小費", rcptTip: "每人價格，未含小費", rcptTax: "每人價格，已含稅",
    // The wishlist as one bill (homepage).
    billTitle: "把願望清單算成一張帳單", billIntro: "你收藏的所有餐廳一人吃一遍要花多少，並按各國習慣估算服務費、稅金和小費。", billHead: "The Starred Bill · {meal} 1 位", billWine: "加上餐酒搭配", billSubtotal: "小計", billExtras: "服務費、稅及小費（估）", billTotal: "總計", billIncluded: "已含服務費", billTax: "已含稅", billBefore: "+{p}% 服務費", billPlus: "++ 約加 {p}%", billTaxTip: "稅及小費約加 {p}%", billTip: "小費約 {p}%", billNoLunch: "不供應午餐，未計入", billNoPrice: "尚無價格，未計入", billPerMain: "單點，未計入", billCount: "已計入 {b} 家收藏餐廳中的 {a} 家", billFoot: "每人價格，未選配酒時不含飲品。服務費、稅金和小費皆為估算，請向各餐廳確認。", billConverted: "依今日匯率換算。",
    findOnMaps: "在 Google 地圖查看{name}", findOnMapsTitle: "在 Google 地圖查看",
    showOnly: "只顯示{cat}",
    chgNew: "新進", chgTitle: "{date}米其林指南：{note}",
    emptyWish: "你收藏的餐廳都不在{place}。點選任一餐廳的愛心即可加入願望清單。",
    emptyPlace: "{place}目前沒有米其林星級餐廳，一有餐廳摘星，我們就會更新此頁。",
    emptySee: "查看{name}的 {n} 家星級餐廳", exploreAll: "所有地區",
    noMatch: "沒有符合條件的餐廳。", clearFilters: "清除搜尋與篩選",
    formerTitle: "已不再是星級餐廳",
    formerNote: "曾列於本清單前一版、但之後失去星級、歇業或有所變動的餐廳，僅供參考。",
    formerly: "先前", stLost: "失去星級", stClosed: "已歇業", stChanged: "已變動",
    tapHint: "點選餐廳即可查看完整價格與詳細資訊。",
    showing: "顯示 {b} 家星級餐廳中的 {a} 家", showingFormer: "，另有 {c} 家已不再是星級",
    wishNote: "願望清單只儲存在這個瀏覽器中。",
    wishAdd: "將{name}加入願望清單", wishRemove: "將{name}從願望清單移除", wishAddT: "加入願望清單", wishRemoveT: "從願望清單移除",
    toastAdded: "已將{name}加入願望清單", toastRemoved: "已將{name}從願望清單移除", undo: "復原",
    photo: "照片", tempClosed: "暫停營業（Google）",
    mapTitle: "所有星級餐廳一圖看盡",
    mapText: "地圖上的標記會跟著上方清單的篩選條件變化：選擇星級、料理或願望清單，地圖就會同步更新。點選標記可查看價格與導航連結。",
    mapWait: "捲動到這裡時會載入地圖。", mapLabel: "米其林星級餐廳地圖",
    mapError: "地圖暫時無法載入。清單中每家餐廳旁的地標圖示仍可在 Google 地圖開啟。",
    legendAria: "地標顏色說明", legendItem: "米其林 {n} 星",
    mapShowing: "地圖上顯示 {n} 家餐廳", mapNone: "沒有符合目前篩選條件的餐廳",
    nearMe: "我附近", nearMeAria: "顯示我附近的星級餐廳", nearFinding: "正在定位…", youAreHere: "你的位置",
    nearTitle: "離你最近", nearAway: "距離 {d}", nearWorld: "在世界地圖上查看你附近的星級餐廳",
    nearNone: "此頁沒有餐廳在你附近，最近的是{name}，距離 {d}。",
    nearDenied: "位置存取已關閉。請在瀏覽器設定中允許本網站使用你的位置，然後再試一次。",
    nearFailed: "暫時無法取得你的位置，請再試一次。", nearUnsupported: "此瀏覽器無法分享你的位置。",
    jumpMap: "地圖", jumpMapAria: "跳到地圖",
    share: "分享", shareAria: "分享此頁", shareTitle: "分享此頁", shareCopy: "複製連結", shareCopied: "已複製連結", shareEmail: "電子郵件",
    accTitle: "你的帳戶", accLoading: "正在載入你的帳戶…", accOutText: "登入即可在任何裝置上查看你的願望清單和去過的餐廳。完全免費。",
    accSignedInAs: "已用 {email} 登入", accStatBeen: "去過", accStatStars: "累積星數", accStatThree: "三星餐廳", accStatCountries: "國家",
    accMilestones: "里程碑", ms1: "第一顆星", ms2: "第一家三星", ms3: "10 家餐廳", ms4: "25 家餐廳", ms5: "3 個國家", ms6: "累積 50 顆星", msGot: "（已達成）",
    accWhere: "你去過的地方", accOf: "{total} 家中的 {n} 家", accBeenTitle: "去過的餐廳", accBeenEmpty: "還沒有勾選任何餐廳。在你去過的餐廳旁點選 ✓ 即可。",
    accDateAria: "你去{name}的日期", accRemove: "移除", accWishTitle: "你的願望清單", accWishEmpty: "你的願望清單是空的。點選任一餐廳旁的愛心即可收藏。",
    accMarkBeen: "去過了", accData: "你的資料", accDataText: "下載我們為你帳戶保存的所有資料、在這部裝置上登出，或永久刪除你的帳戶與兩份清單。",
    accDownload: "下載我的資料", accSignOut: "登出", accDelete: "刪除我的帳戶", accDeleteConfirm: "這會永久刪除你的帳戶與兩份清單，且無法復原。",
    accDeleteYes: "永久刪除", accDeleteNo: "保留我的帳戶", accDeleted: "你的帳戶已刪除。", accDeleteFail: "目前無法刪除你的帳戶。請再試一次，或使用聯絡表單。",
    acctSignIn: "登入", acctAccount: "帳戶", acctTitle: "登入或建立免費帳戶",
    acctWhy: "在每部裝置上保留你的願望清單，並勾選你去過的餐廳。",
    acctWhyBeen: "建立免費帳戶，即可勾選你去過的餐廳，願望清單也會在每部裝置上同步。",
    acctGoogle: "使用 Google 繼續", acctOr: "或", acctEmailLabel: "電子郵件地址", acctSend: "寄給我登入驗證碼", acctSending: "寄送中…",
    acctSent: "請查看電子郵件。我們已將登入連結寄到 {email}，請在這部裝置上開啟以完成登入。",
    acctTooMany: "登入郵件寄送次數過多，請稍候一分鐘再試。", acctFailed: "未能完成，請檢查電子郵件地址後再試一次。",
    acctBadEmail: "請輸入完整的電子郵件地址，例如 name@example.com。", acctSmall: "免費，而且不必記密碼。我們只用你的電子郵件讓你登入。",
    acctPrivacy: "隱私權聲明", acctClose: "關閉", acctWelcome: "你已登入。你的願望清單現在會在每部裝置上同步。",
    acctLinkExpired: "這個登入連結已過期或已使用過，請點選「登入」取得新連結。",
    been: "去過了", beenAdd: "將{name}標示為去過", beenRemove: "取消{name}的去過標示", beenAddT: "標示為去過", beenRemoveT: "取消去過標示",
    toastBeen: "已將{name}標示為去過", toastNotBeen: "已取消{name}的去過標示", showBeen: "去過了",
    beenProgress: "這裡的 {total} 家餐廳中，你去過 {n} 家。", wishNoteOut: "你的願望清單只儲存在這部裝置上。", wishNoteSignIn: "登入即可在每部裝置上保留", wishCompare: "並排比較你收藏的餐廳",
    wishNoteIn: "你的願望清單與去過清單已儲存到你的帳戶。", wishCtaHome: "你的願望清單只儲存在這部裝置上。免費註冊，即可在每部裝置上保留，並勾選你去過的餐廳。",
    wishCtaBtn: "免費註冊", wishSynced: "已儲存到你的帳戶。", acctSee: "查看你的帳戶",
    shareInsta: "若要分享到 Instagram，請複製連結，再貼到限時動態或訊息中。",
    shareMore: "Instagram、訊息與更多",
    shareTextPlace: "在{place}，一顆米其林星要價多少？晚餐、午餐與餐酒搭配價格一次比較。",
    shareTextHome: "一顆米其林星要價多少？各城市晚餐、午餐與餐酒搭配價格一次比較。",
    infoDinner: "晚餐", infoWine: "餐酒搭配", infoGoogle: "Google 評分", infoOpen: "在 Google 地圖開啟", infoNoPrice: "價格未公布",
    starsTitle: "每多一顆星，要多花多少？",
    starsText: "依上方所選餐期、以米其林星級分組的套餐平均價格。單點餐廳計入家數，但不納入平均與價格區間。",
    tierNames: ["一星", "二星", "三星"], avgDinner: "平均晚餐", tRestaurants: "餐廳數", tRange: "價格區間", tRating: "Google 平均評分",
    tVs: "比{n}星", tNoPrices: "這些餐廳沒有套餐價格。", tNone: "目前沒有{tier}餐廳。",
    methodTitle: "價格如何計算",
    m1Title: "每人價格，未含服務費",
    m1Text: "所有金額均為每位客人的價格，不含各國標準不一的服務費，也不含魚子醬或松露等加價項目。以其他幣別顯示的價格依當日匯率換算，僅供參考。",
    m2Title: "價格從哪裡來",
    m2Text: "晚餐以主要品嚐套餐為準，餐酒搭配則取該套餐最便宜的選項。有公布價格的，以餐廳官網為準；否則參考近期評論與訂位網站。午餐以餐廳的午間套餐或品嚐套餐為準，說明欄會註明供應日。",
    m3Title: "星級與 Google 評分",
    m3Text: "Google 評分（滿分 5）與評論數於 2026 年 10 月查核；星級來自各國最新一版米其林指南。綠色 ▲ 代表在最近兩版指南中獲得星級；紅色 ▼ 代表失去星級。",
    contactTitle: "發現價格變動了嗎？",
    contactText: "菜單價格經常調整。歡迎告訴我們最新價格、我們遺漏的餐廳，或你希望我們接下來介紹的城市。",
    cName: "姓名", cEmail: "電子郵件", cTopic: "主題", cTopicPrice: "價格更新", cTopicSuggest: "推薦餐廳", cTopicCity: "介紹其他城市", cTopicOther: "其他",
    cMsg: "訊息", cMsgPh: "請告訴我們餐廳名稱、最新價格與資訊來源。",
    cSend: "送出訊息", errName: "請輸入姓名。", errEmail: "請輸入有效的電子郵件，例如 name@example.com。", errMsg: "請輸入簡短訊息。",
    sent: "謝謝你，{name}。你的電子郵件程式應該會開啟並帶入你的訊息，按「傳送」即可。若沒有開啟，請直接寄信至 hello@starredbill.com。",
    footEdition: "The Starred Bill・{place}",
    footNote: "價格與評分於 2026 年 10 月查核，訂位前請向餐廳確認。",
    rateLine: "{sym} 價格依 {date} 匯率換算，僅供參考：{sym}1 = {home}{rate}。",
    rateLineMixed: "價格依 {date} 匯率換算為 {sym}，僅供參考。",
    currencyAria: "價格顯示幣別", crumbsAria: "目前位置", menuOpen: "選單",
    homeTitle: "The Starred Bill・米其林星級餐廳價格",
    homeEyebrow: "米其林星級餐廳價格一覽",
    homeH1: "一顆米其林星<em>要價</em>多少？逐城比較。",
    homeText: "並列比較米其林星級餐廳的每人晚餐、午餐與餐酒搭配價格，每個價格都附上資料來源。選擇目的地，或從地圖開始探索。",
    figRestaurants: "已比價餐廳", figDestinations: "目的地", figUpdated: "價格查核", figUpdatedSub: "晚餐、午餐與餐酒搭配",
    citiesN: "{n} 座城市",
    homeSearchPh: "搜尋餐廳、料理或城市", homeSearchLabel: "搜尋餐廳、料理或城市", searchNone: "目前找不到「{q}」。",
    mapHomeTitle: "全球所有米其林星級餐廳",
    mapHomeText: "放大地圖即可看到個別餐廳。點選標記可查看晚餐價格，並連結到該城市的完整比較。",
    destTitle: "選擇國家或地區", destText: "每個目的地都有專屬頁面，提供價格、篩選、地圖與各星級平均。",
    destRestaurants: "{n} 家星級餐廳", destFrom: "晚餐套餐 {p} 起", destOpen: "比較{place}",
    collectionsTitle: "精選區域",
    wishTitle: "你的願望清單", wishText: "你在各目的地收藏的餐廳。",
    wishEmptyHome: "目前還沒有收藏。在任一目的地頁面點選餐廳旁的愛心，即可加入這裡。",
    wishRemoveShort: "移除",
    infoCompare: "比較{place}的價格",
    mapHomeWorldText: "全球 {n} 家米其林星級餐廳一圖看盡。實心標記代表本站已有完整價格比較；空心標記在我們加入價格前，會連結到米其林指南。放大地圖即可看到個別餐廳。",
    infoNoPricesYet: "本站尚未收錄價格", infoMichelin: "米其林指南", legendHollow: "空心 = 尚未比價",
    installApp: "加到主畫面",
    installTipIos: "安裝方式：點選 Safari 的分享按鈕（方框加箭頭），再選擇「加入主畫面」。",
    clearSearch: "清除搜尋", photoView: "查看{name}的大圖", photoClose: "關閉",
    mapSearchPh: "在地圖上搜尋餐廳、城市或國家", mapSearchPhShort: "餐廳、城市或國家", homeSearchPhShort: "餐廳、料理或城市", mapSearchLabel: "在地圖上搜尋餐廳、城市或國家"
  },
  fr: {
    destGuide: "Dans tout le Guide MICHELIN : {n}",
    acctSentCode: "Nous avons envoyé un code à 6 chiffres à {email}. Saisissez-le ci-dessous pour vous connecter ici. (Le lien de l'e-mail fonctionne aussi, mais dans l'app de l'écran d'accueil il ouvre votre navigateur.)", acctCodeLabel: "Code reçu par e-mail", acctVerify: "Se connecter avec le code", acctVerifying: "Vérification…", acctCodeWrong: "Ce code n'a pas fonctionné. Vérifiez-le ou demandez-en un nouveau.", acctBadCode: "Saisissez le code à 6 chiffres reçu par e-mail.",
    destHighLow: "du plus au moins", destLowHigh: "du moins au plus", destFlip: "Cliquez à nouveau pour inverser l'ordre",
    destContLabel: "Continent", continents: { "europe": "Europe", "asia": "Asie", "middle-east": "Moyen-Orient", "americas": "Amériques", "oceania": "Océanie" },
    destSortLabel: "Trier", destSortAZ: "A–Z", destSortMost: "Restaurants", destSortStars: "Restaurants {n} étoile|Restaurants {n} étoiles",
    noStarsTitle: "Pas encore d'étoile Michelin", noStarsText: "Ces {n} pays n'ont aucun restaurant étoilé. Le plus souvent, le Guide MICHELIN ne les couvre tout simplement pas encore ; quand il y a une autre raison (marqué *), elle est expliquée ici.",
    destSoon: "Pas encore de prix", destSoonMap: "Les voir sur la carte",
    destJump: "Aller à un pays",
    notrackOn: "Ce navigateur n'est plus compté dans les statistiques de visite.", notrackOff: "Ce navigateur est de nouveau compté dans les statistiques de visite.",
    destAreas: "Régions et villes", destRegions: "Régions", destCityList: "Villes",
    cookieText: "Pouvons-nous utiliser les cookies de Google Analytics pour comprendre comment le site est utilisé ? Les visites sont comptées sans cookies dans tous les cas.", cookieAccept: "Accepter", cookieReject: "Refuser", cookieSettings: "Modifier mon choix de cookies",
    navCompare: "Comparer", navMap: "Carte", navStars: "Par étoiles", navMethod: "Méthode", navContact: "Contact", navDestinations: "Destinations", navGuides: "Guides", navNear: "Près de moi", navPick: "Aidez-moi à choisir", wishlist: "Envies",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · Restaurants du Guide Michelin",
    heroTitle: "Combien <em>coûte</em> une étoile Michelin {placeIn} ?",
    heroText: "Les prix du dîner, du déjeuner et des accords mets-vins par personne dans les restaurants étoilés {placeIn}, côte à côte. Cherchez par nom ou par cuisine, filtrez par étoiles ou par cuisine, et ajoutez à vos envies les tables qui vous tentent.",
    crumbHome: "Toutes les destinations", explore: "Explorer", exploreCities: "Villes – {country}", exploreDistricts: "Quartiers – {country}", alsoIn: "Aussi dans",
    figCount: "Restaurants", figMin: "Menu du dîner le moins cher", figMax: "Menu du dîner le plus cher", figMinLunch: "Menu du déjeuner le moins cher", figMaxLunch: "Menu du déjeuner le plus cher",
    fMeal: "Repas", mealDinner: "Dîner", mealLunch: "Déjeuner", hNotesLunch: "Déjeuner", noLunch: "Pas de service le midi", avgLunch: "déjeuner moyen", infoLunch: "déjeuner",
    sortPriceAscLunch: "Déjeuner : du moins cher au plus cher", sortPriceDescLunch: "Déjeuner : du plus cher au moins cher",
    starCounts: "{3} trois étoiles · {2} deux étoiles · {1} une étoile",
    compareTitle: "Chaque table, chaque prix",
    compareText: "Passez du dîner au déjeuner ci-dessous. Les prix sont ceux du menu dégustation ou du menu, sauf mention « par plat » ou « dépense moyenne », et les barres comparent chaque menu au plus cher de la liste. Chaque prix renvoie à sa source.",
    searchPh: "Chercher un restaurant, une cuisine ou un quartier", searchPhShort: "Restaurant, cuisine ou quartier", searchPhEx: "Chercher un restaurant, une cuisine ou un quartier, ex. « {ex} »",
    searchLabel: "Chercher un restaurant par nom, cuisine ou quartier", sortLabel: "Trier les restaurants",
    sortPriceAsc: "Dîner : du moins cher au plus cher", sortPriceDesc: "Dîner : du plus cher au moins cher", sortStars: "Le plus d'étoiles d'abord", sortRating: "Note Google : la meilleure d'abord", sortName: "Nom de A à Z",
    fShow: "Afficher", fStars: "Étoiles Michelin", fCuisine: "Cuisine",
    fDiet: "Régime", dietVegOnly: "Restaurant végétarien", dietVegMenu: "Menu dégustation végétarien", dietVeg: "Options végétariennes", dietVegan: "Options véganes", dietGf: "Options sans gluten", dietHalal: "Halal", dietKosher: "Casher",
    badgeVegOnly: "Végétarien", badgeVegMenu: "Menu végé", badgeVegan: "Végan", chefLabel: "Chef {name}",
    exploreMore: "{n} de plus", exploreFewer: "Afficher moins",
    filtersBtn: "Filtres", filtersShowN: "Voir {n} restaurant|Voir {n} restaurants", filtersClear: "Tout effacer", cuisineSearchPh: "Chercher une cuisine", removeFilter: "Retirer le filtre : {f}", sheetClose: "Fermer",
    showAll: "Tous les restaurants", showChanges: "Changements récents", showWish: "Mes envies",
    showChangesTitle: "Étoile gagnée ou perdue dans l'un des deux derniers guides Michelin",
    all: "Tous", starsAria: "{n} étoile Michelin|{n} étoiles Michelin",
    hRestaurant: "Restaurant", hCuisine: "Cuisine", hStars: "Étoiles", hGoogle: "Google", hNotes: "Dîner", hPrice: "Prix", hWine: "Accord mets-vins", hWish: "Envies",
    tableLabel: "Prix des restaurants",
    reviews: "{n} avis", ratingAria: "Note Google : {r} sur 5",
    srcSite: "Site du restaurant", srcPress: "Source", srcTitle: "D'où vient ce prix",
    perMain: "par plat", typicalSpend: "dépense moyenne", notListed: "Non communiqué",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · Table pour 1", rcptDinnerOnly: "Dîner uniquement", rcptNoPairing: "pas d'accord mets-vins", rcptPlusWine: "+ vins {p}", rcptDinnerWine: "Dîner + vins", rcptLunchWine: "Déjeuner + vins", rcptChecked: "Vérifié : {d}", rcptIncl: "Par personne, service compris", rcptPlus: "Par personne, ++ (service et taxes en sus)", rcptTaxTip: "Par personne, hors taxes et pourboire", rcptTip: "Par personne, hors pourboire", rcptTax: "Par personne, taxes comprises",
    // The wishlist as one bill (homepage).
    billTitle: "Votre liste d'envies en une addition", billIntro: "Ce que coûteraient pour une personne tous les restaurants enregistrés, avec une estimation du service, des taxes et du pourboire habituels de chaque pays.", billHead: "The Starred Bill · {meal} pour 1", billWine: "Ajouter les accords mets-vins", billSubtotal: "Sous-total", billExtras: "Service, taxes et pourboire (est.)", billTotal: "Total", billIncluded: "service compris", billTax: "taxes comprises", billBefore: "+{p} % de service", billPlus: "++ : environ +{p} %", billTaxTip: "taxes et pourboire : environ +{p} %", billTip: "pourboire d'environ {p} %", billNoLunch: "pas de service le midi, non compté", billNoPrice: "pas encore de prix, non compté", billPerMain: "à la carte, non compté", billCount: "{a} restaurant compté sur {b}|{a} restaurants comptés sur {b}", billFoot: "Par personne, hors boissons sauf si les vins sont ajoutés. Service, taxes et pourboires sont estimés : vérifiez auprès de chaque restaurant.", billConverted: "Converti au taux de change du jour.",
    findOnMaps: "Trouver {name} sur Google Maps", findOnMapsTitle: "Voir sur Google Maps",
    showOnly: "Afficher seulement : {cat}",
    chgNew: "Nouveau", chgTitle: "{note} – Guide Michelin {date}",
    emptyWish: "Aucun de vos restaurants enregistrés ne se trouve {placeIn}. Touchez le cœur d'un restaurant pour l'ajouter.",
    emptyPlace: "Il n'y a pour l'instant aucun restaurant étoilé Michelin {placeIn}, mais nous mettrons cette page à jour dès qu'il y en aura un.",
    emptySee: "Voir le restaurant étoilé – {name}|Voir les {n} restaurants étoilés – {name}", exploreAll: "Toutes les zones",
    noMatch: "Aucun restaurant ne correspond à ces filtres.", clearFilters: "Effacer la recherche et les filtres",
    formerTitle: "Plus étoilés",
    formerNote: "Restaurants qui figuraient dans l'édition précédente de cette liste mais qui ont depuis perdu leurs étoiles, fermé ou changé. Affichés à titre indicatif.",
    formerly: "auparavant", stLost: "Étoile perdue", stClosed: "Fermé", stChanged: "Changé",
    tapHint: "Touchez un restaurant pour voir tous ses prix et détails.",
    showing: "{a} restaurants étoilés affichés sur {b}", showingFormer: ", plus {c} qui ne le sont plus",
    wishNote: "Vos envies sont enregistrées uniquement dans ce navigateur.",
    wishAdd: "Ajouter {name} à vos envies", wishRemove: "Retirer {name} de vos envies", wishAddT: "Ajouter à mes envies", wishRemoveT: "Retirer de mes envies",
    toastAdded: "{name} ajouté à vos envies", toastRemoved: "{name} retiré de vos envies", undo: "Annuler",
    photo: "Photo", tempClosed: "Fermé temporairement (Google)",
    mapTitle: "Toutes les tables étoilées sur une carte",
    mapText: "Les repères suivent les filtres de la liste ci-dessus : choisissez un niveau d'étoiles, une cuisine ou vos envies, et la carte s'adapte. Touchez un repère pour voir le prix et l'itinéraire.",
    mapWait: "La carte se charge quand vous arrivez ici.", mapLabel: "Carte des restaurants étoilés Michelin",
    mapError: "La carte n'a pas pu se charger. Le repère à côté de chaque restaurant de la liste l'ouvre toujours dans Google Maps.",
    legendAria: "Signification des couleurs des repères", legendItem: "{n} étoile Michelin|{n} étoiles Michelin",
    mapShowing: "{n} restaurant sur la carte|{n} restaurants sur la carte", mapNone: "Aucun restaurant ne correspond aux filtres",
    nearMe: "Autour de moi", nearMeAria: "Afficher les restaurants étoilés autour de moi", nearFinding: "Localisation…", youAreHere: "Vous êtes ici",
    nearTitle: "Les plus proches", nearAway: "à {d}", nearWorld: "Voir les restaurants étoilés autour de vous sur la carte du monde",
    nearNone: "Aucun restaurant de cette page n'est près de vous. Le plus proche est {name}, à {d}.",
    nearDenied: "L'accès à votre position est désactivé. Autorisez-le pour ce site dans les réglages du navigateur, puis réessayez.",
    nearFailed: "Impossible de vous localiser pour le moment. Réessayez.", nearUnsupported: "Ce navigateur ne peut pas partager votre position.",
    jumpMap: "Carte", jumpMapAria: "Aller à la carte",
    share: "Partager", shareAria: "Partager cette page", shareTitle: "Partager cette page", shareCopy: "Copier le lien", shareCopied: "Lien copié", shareEmail: "E-mail",
    accTitle: "Votre compte", accLoading: "Chargement de votre compte…", accOutText: "Connectez-vous pour retrouver vos envies et les restaurants où vous êtes allé, sur tous vos appareils. C'est gratuit.",
    accSignedInAs: "Connecté avec {email}", accStatBeen: "Restaurants visités", accStatStars: "Étoiles cumulées", accStatThree: "Trois étoiles", accStatCountries: "Pays",
    accMilestones: "Étapes", ms1: "Première étoile", ms2: "Premier trois étoiles", ms3: "10 restaurants", ms4: "25 restaurants", ms5: "3 pays", ms6: "50 étoiles cumulées", msGot: "(atteint)",
    accWhere: "Où vous êtes allé", accOf: "{n} sur {total}", accBeenTitle: "Restaurants visités", accBeenEmpty: "Rien de coché pour l'instant. Touchez le ✓ à côté d'un restaurant où vous êtes allé.",
    accDateAria: "Date de votre visite à {name}", accRemove: "Retirer", accWishTitle: "Vos envies", accWishEmpty: "Votre liste d'envies est vide. Touchez le cœur à côté d'un restaurant pour l'ajouter.",
    accMarkBeen: "J'y suis allé", accData: "Vos données", accDataText: "Téléchargez tout ce que nous conservons pour votre compte, déconnectez-vous de cet appareil, ou supprimez définitivement votre compte et vos deux listes.",
    accDownload: "Télécharger mes données", accSignOut: "Se déconnecter", accDelete: "Supprimer mon compte", accDeleteConfirm: "Cela supprime définitivement votre compte et vos deux listes. C'est irréversible.",
    accDeleteYes: "Supprimer définitivement", accDeleteNo: "Garder mon compte", accDeleted: "Votre compte a été supprimé.", accDeleteFail: "Votre compte n'a pas pu être supprimé pour le moment. Réessayez, ou utilisez le formulaire de contact.",
    acctSignIn: "Connexion", acctAccount: "Compte", acctTitle: "Connectez-vous ou créez un compte gratuit",
    acctWhy: "Retrouvez vos envies sur tous vos appareils et cochez les restaurants où vous êtes allé.",
    acctWhyBeen: "Créez un compte gratuit pour cocher les restaurants où vous êtes allé. Vos envies vous suivent aussi sur tous vos appareils.",
    acctGoogle: "Continuer avec Google", acctOr: "ou", acctEmailLabel: "Adresse e-mail", acctSend: "Recevoir un code de connexion par e-mail", acctSending: "Envoi…",
    acctSent: "Consultez vos e-mails. Nous avons envoyé un lien de connexion à {email}. Ouvrez-le sur cet appareil pour terminer.",
    acctTooMany: "Trop d'e-mails de connexion pour le moment. Attendez une minute, puis réessayez.", acctFailed: "Cela n'a pas fonctionné. Vérifiez l'adresse e-mail et réessayez.",
    acctBadEmail: "Saisissez une adresse e-mail complète, par exemple nom@exemple.fr.", acctSmall: "Gratuit, sans mot de passe à retenir. Votre e-mail ne sert qu'à vous connecter.",
    acctPrivacy: "Confidentialité", acctClose: "Fermer", acctWelcome: "Vous êtes connecté. Vos envies vous suivent désormais sur tous vos appareils.",
    acctLinkExpired: "Ce lien de connexion a expiré ou a déjà servi. Touchez Connexion pour en recevoir un nouveau.",
    been: "J'y suis allé", beenAdd: "Marquer {name} comme visité", beenRemove: "Retirer {name} des restaurants visités", beenAddT: "Marquer comme visité", beenRemoveT: "Retirer des restaurants visités",
    toastBeen: "{name} marqué comme visité", toastNotBeen: "{name} retiré des restaurants visités", showBeen: "Visités",
    beenProgress: "Vous êtes allé dans {n} des {total} restaurants ici.", wishNoteOut: "Vos envies sont enregistrées sur cet appareil uniquement.", wishNoteSignIn: "Connectez-vous pour les retrouver partout", wishCompare: "Comparer vos restaurants enregistrés côte à côte",
    wishNoteIn: "Vos envies et vos restaurants visités sont enregistrés dans votre compte.", wishCtaHome: "Vos envies sont enregistrées sur cet appareil uniquement. Créez un compte gratuit pour les retrouver partout et cocher les restaurants où vous êtes allé.",
    wishCtaBtn: "Créer un compte gratuit", wishSynced: "Enregistré dans votre compte.", acctSee: "Voir votre compte",
    shareInsta: "Pour Instagram, copiez le lien puis collez-le dans une story ou un message.",
    shareMore: "Instagram, Messages et plus",
    shareTextPlace: "Ce que coûte une étoile Michelin {placeIn} : prix du dîner, du déjeuner et des accords mets-vins, côte à côte.",
    shareTextHome: "Ce que coûte une étoile Michelin, ville par ville : prix du dîner, du déjeuner et des accords mets-vins.",
    infoDinner: "dîner", infoWine: "vins", infoGoogle: "sur Google", infoOpen: "Ouvrir dans Google Maps", infoNoPrice: "Prix non communiqué",
    starsTitle: "Ce que coûte chaque étoile de plus",
    starsText: "Prix moyen du menu pour le repas choisi plus haut, par nombre d'étoiles. Les restaurants à la carte sont comptés mais exclus des moyennes et des fourchettes.",
    tierNames: ["Une étoile", "Deux étoiles", "Trois étoiles"], avgDinner: "dîner moyen", tRestaurants: "Restaurants", tRange: "Fourchette", tRating: "Note Google moyenne",
    tVs: "par rapport à {n} étoile|par rapport à {n} étoiles", tNoPrices: "Aucun prix de menu pour ces restaurants.", tNone: "Aucun restaurant dans la catégorie {tier}.",
    methodTitle: "Comment les prix sont établis",
    m1Title: "Par personne",
    m1Text: "Chaque montant s'entend pour une personne. Les suppléments comme le caviar ou la truffe ne sont pas inclus. Les prix affichés dans une autre devise utilisent le taux de change du jour et sont approximatifs.",
    m2Title: "D'où viennent les prix",
    m2Text: "Le dîner correspond au menu dégustation principal lorsqu'il existe, et le vin à l'accord mets-vins le moins cher. Nous reprenons les prix du site de chaque restaurant lorsqu'ils sont publiés, sinon ceux d'avis récents et de sites de réservation.",
    m3Title: "Étoiles et note Google",
    m3Text: "La note Google sur 5 et le nombre d'avis ont été vérifiés en octobre 2026. Les étoiles proviennent du dernier Guide Michelin de chaque pays.",
    contactTitle: "Vous avez repéré un changement de prix ?",
    contactText: "Les menus changent souvent de prix. Signalez-nous une mise à jour, un restaurant oublié ou une ville que vous aimeriez voir ensuite.",
    cName: "Nom", cEmail: "E-mail", cTopic: "Sujet", cTopicPrice: "Mise à jour de prix", cTopicSuggest: "Suggérer un restaurant", cTopicCity: "Couvrir une autre ville", cTopicOther: "Autre",
    cMsg: "Message", cMsgPh: "Indiquez le restaurant, le nouveau prix et où vous l'avez vu.",
    cSend: "Envoyer", errName: "Indiquez votre nom.", errEmail: "Indiquez une adresse e-mail, par ex. nom@exemple.com.", errMsg: "Écrivez un court message.",
    sent: "Merci, {name}. Votre messagerie devrait s'ouvrir avec votre message : il suffit d'appuyer sur Envoyer. Sinon, écrivez à hello@starredbill.com.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Prix et notes vérifiés en octobre 2026. Renseignez-vous auprès de chaque restaurant avant de réserver.",
    rateLine: "Les prix en {sym} sont approximatifs, au taux de change du {date} : {sym}1 = {home}{rate}.",
    rateLineMixed: "Les prix sont convertis en {sym} au taux de change du {date} ; ils sont donc approximatifs.",
    currencyAria: "Afficher les prix en", crumbsAria: "Vous êtes ici", menuOpen: "Menu",
    wishTitle: "Vos envies", installApp: "Installer l'appli",
    installTipIos: "Pour l'installer : touchez le bouton Partager (le carré avec une flèche) dans Safari, puis « Sur l'écran d'accueil ».",
    clearSearch: "Effacer la recherche", photoView: "Agrandir la photo de {name}", photoClose: "Fermer"
  },
  yue: {
    destGuide: "米芝蓮指南全國共 {n} 間",
    acctSentCode: "我哋已經將 6 位數驗證碼寄咗去 {email}。喺下面輸入就可以喺呢度登入。（郵件入面嘅連結都用得，但喺主畫面 App 會改為打開瀏覽器。）", acctCodeLabel: "郵件入面嘅驗證碼", acctVerify: "用驗證碼登入", acctVerifying: "驗證緊…", acctCodeWrong: "驗證碼唔啱。請檢查，或者再索取一個。", acctBadCode: "請輸入郵件入面嘅 6 位數驗證碼。",
    destHighLow: "由多到少", destLowHigh: "由少到多", destFlip: "再㩒一次可以倒轉次序",
    destContLabel: "洲份", continents: { "europe": "歐洲", "asia": "亞洲", "middle-east": "中東", "americas": "美洲", "oceania": "大洋洲" },
    destSortLabel: "排序", destSortAZ: "按名稱", destSortMost: "餐廳數目", destSortStars: "{n}星餐廳數目",
    noStarsTitle: "未有米芝蓮星嘅國家", noStarsText: "以下 {n} 個國家暫時未有米芝蓮星級餐廳。大部分只係因為米芝蓮指南未有涵蓋；如果另有原因（標咗 *），會喺下面解釋。",
    destSoon: "未有價錢", destSoonMap: "喺地圖上睇",
    destJump: "跳去國家或地區",
    notrackOn: "呢個瀏覽器已經唔再計入瀏覽統計。", notrackOff: "呢個瀏覽器已經重新計入瀏覽統計。",
    destAreas: "地區同城市", destRegions: "地區", destCityList: "城市",
    cookieText: "我哋可唔可以用 Google Analytics Cookie 嚟了解大家點樣用呢個網站？無論你點揀，我哋都只會用唔使 Cookie 嘅方法計瀏覽量。", cookieAccept: "接受", cookieReject: "拒絕", cookieSettings: "更改 Cookie 選擇",
    navCompare: "比較", navMap: "地圖", navStars: "星級", navMethod: "點樣計", navContact: "聯絡我哋", navDestinations: "目的地", navGuides: "指南", navNear: "我附近", navPick: "幫我揀", wishlist: "心水清單",
    pageTitle: "The Starred Bill・{place}",
    heroEyebrow: "{place}・米芝蓮指南餐廳",
    heroTitle: "喺{place}，一粒米芝蓮星<em>要幾多錢</em>？",
    heroText: "將{place}米芝蓮星級餐廳每位嘅晚市、午市同配酒價錢放埋一齊比較。可以用名或者菜式搵、按星級或者菜式篩選，仲可以將想去嘅餐廳加入心水清單。",
    crumbHome: "所有目的地", explore: "探索", exploreCities: "{country}嘅城市", exploreDistricts: "{country}各區", alsoIn: "亦屬於",
    figCount: "星級餐廳", figMin: "最平晚市套餐", figMax: "最貴晚市套餐", figMinLunch: "最平午市套餐", figMaxLunch: "最貴午市套餐",
    fMeal: "餐期", mealDinner: "晚市", mealLunch: "午市", hNotesLunch: "午市備註", noLunch: "冇午市", avgLunch: "午市平均", infoLunch: "午市",
    sortPriceAscLunch: "午市：由平到貴", sortPriceDescLunch: "午市：由貴到平",
    starCounts: "三星 {3} 間・二星 {2} 間・一星 {1} 間",
    compareTitle: "每張枱，每個價錢",
    compareText: "喺下面可以轉晚市或者午市。價錢係品嚐菜單或者套餐價，標明「每道主菜」或者「人均消費」嘅除外；長條會將每個套餐同最貴嗰個比較，每個價錢都有來源連結。",
    searchPh: "搵餐廳、菜式或者地區", searchPhShort: "餐廳、菜式或地區", searchPhEx: "搵餐廳、菜式或者地區，例如「{ex}」",
    searchLabel: "用名、菜式或者地區搵餐廳", sortLabel: "排序",
    sortPriceAsc: "晚市：由平到貴", sortPriceDesc: "晚市：由貴到平", sortStars: "星數多嘅先", sortRating: "Google 評分高嘅先", sortName: "按名排序",
    fShow: "顯示", fStars: "米芝蓮星級", fCuisine: "菜式",
    fDiet: "飲食需要", dietVegOnly: "素食餐廳", dietVegMenu: "素食套餐", dietVeg: "有素食選擇", dietVegan: "有純素選擇", dietGf: "有無麩質選擇", dietHalal: "清真", dietKosher: "猶太潔食",
    badgeVegOnly: "素食", badgeVegMenu: "素食套餐", badgeVegan: "純素", chefLabel: "主廚 {name}",
    exploreMore: "仲有 {n} 個", exploreFewer: "收埋",
    filtersBtn: "篩選", filtersShowN: "睇 {n} 間餐廳", filtersClear: "全部清除", cuisineSearchPh: "搵菜式", removeFilter: "移除篩選：{f}", sheetClose: "關閉",
    showAll: "全部餐廳", showChanges: "最近星級變動", showWish: "我嘅心水清單",
    showChangesTitle: "喺最近兩版米芝蓮指南攞到或者甩咗星",
    all: "全部", starsAria: "米芝蓮 {n} 星",
    hRestaurant: "餐廳", hCuisine: "菜式", hStars: "星級", hGoogle: "Google", hNotes: "晚市備註", hPrice: "價錢", hWine: "配酒", hWish: "心水清單",
    tableLabel: "餐廳價錢",
    reviews: "{n} 個評論", ratingAria: "Google 評分 {r}（滿分 5）",
    srcSite: "餐廳官網", srcPress: "資料來源", srcTitle: "價錢嘅來源",
    perMain: "每道主菜", typicalSpend: "人均消費", notListed: "未有公布",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · 1 位", rcptDinnerOnly: "只做晚市", rcptNoPairing: "未有列出配酒", rcptPlusWine: "+ 配酒 {p}", rcptDinnerWine: "晚市 + 配酒", rcptLunchWine: "午市 + 配酒", rcptChecked: "{d} 核實", rcptIncl: "每位價錢，已包服務費", rcptPlus: "每位價錢，另加 ++（服務費同稅）", rcptTaxTip: "每位價錢，未計稅同貼士", rcptTip: "每位價錢，未計貼士", rcptTax: "每位價錢，已含稅",
    // The wishlist as one bill (homepage).
    billTitle: "將心水清單計成一張單", billIntro: "你收藏嘅餐廳一個人食晒要幾多錢，再按各地習慣估埋服務費、稅同貼士。", billHead: "The Starred Bill · {meal} 1 位", billWine: "加埋配酒", billSubtotal: "小計", billExtras: "服務費、稅同貼士（估）", billTotal: "總數", billIncluded: "已包服務費", billTax: "已含稅", billBefore: "+{p}% 服務費", billPlus: "++ 大約加 {p}%", billTaxTip: "稅同貼士大約加 {p}%", billTip: "貼士大約 {p}%", billNoLunch: "冇午市，冇計入", billNoPrice: "未有價錢，冇計入", billPerMain: "散點，冇計入", billCount: "計咗 {b} 間收藏餐廳入面嘅 {a} 間", billFoot: "每位價錢，冇揀配酒就唔包飲品。服務費、稅同貼士都係估計，請向餐廳確認。", billConverted: "按今日匯率換算。",
    findOnMaps: "喺 Google 地圖搵{name}", findOnMapsTitle: "喺 Google 地圖睇",
    showOnly: "淨係顯示{cat}",
    chgNew: "新上榜", chgTitle: "{date}米芝蓮指南：{note}",
    emptyWish: "你儲低嘅餐廳冇一間喺{place}。撳任何一間餐廳嘅心心就可以加入。",
    emptyPlace: "{place}暫時未有米芝蓮星級餐廳，一有餐廳攞到星，我哋就會更新呢版。",
    emptySee: "睇{name}嘅 {n} 間星級餐廳", exploreAll: "所有地區",
    noMatch: "冇餐廳符合呢啲篩選條件。", clearFilters: "清除搜尋同篩選",
    formerTitle: "已經冇星",
    formerNote: "曾經喺上一版清單出現、之後甩咗星、結業或者有變動嘅餐廳，只供參考。",
    formerly: "以前", stLost: "甩咗星", stClosed: "已結業", stChanged: "有變動",
    tapHint: "撳一間餐廳就睇到完整價錢同詳情。",
    showing: "{b} 間星級餐廳之中顯示緊 {a} 間", showingFormer: "，另外仲有 {c} 間已經冇星",
    wishNote: "心水清單只會儲喺呢個瀏覽器。",
    wishAdd: "將{name}加入心水清單", wishRemove: "將{name}移出心水清單", wishAddT: "加入心水清單", wishRemoveT: "移出心水清單",
    toastAdded: "已經將{name}加入心水清單", toastRemoved: "已經將{name}移出心水清單", undo: "還原",
    photo: "相片", tempClosed: "暫停營業（Google）",
    mapTitle: "所有星級餐廳一張地圖睇晒",
    mapText: "地圖上嘅標記會跟住上面清單嘅篩選改變：揀星級、菜式或者心水清單，地圖就會即刻更新。撳標記就睇到價錢同導航連結。",
    mapWait: "碌到呢度就會載入地圖。", mapLabel: "米芝蓮星級餐廳地圖",
    mapError: "地圖暫時載入唔到。清單入面每間餐廳旁邊嘅標記一樣可以喺 Google 地圖打開。",
    legendAria: "標記顏色代表咩", legendItem: "米芝蓮 {n} 星",
    mapShowing: "地圖上顯示緊 {n} 間餐廳", mapNone: "冇餐廳符合而家嘅篩選條件",
    nearMe: "我附近", nearMeAria: "顯示我附近嘅星級餐廳", nearFinding: "搵緊你喺邊…", youAreHere: "你喺度",
    nearTitle: "離你最近", nearAway: "距離 {d}", nearWorld: "喺世界地圖睇你附近嘅星級餐廳",
    nearNone: "呢版冇餐廳喺你附近，最近係{name}，距離 {d}。",
    nearDenied: "位置權限已經關咗。請喺瀏覽器設定允許呢個網站用你嘅位置，再試多次。",
    nearFailed: "暫時搵唔到你嘅位置，請再試多次。", nearUnsupported: "呢個瀏覽器分享唔到你嘅位置。",
    jumpMap: "地圖", jumpMapAria: "跳去地圖",
    share: "分享", shareAria: "分享呢版", shareTitle: "分享呢版", shareCopy: "複製連結", shareCopied: "已經複製咗連結", shareEmail: "電郵",
    accTitle: "你嘅帳戶", accLoading: "載入緊你嘅帳戶…", accOutText: "登入就可以喺任何裝置睇到你嘅心水清單同去過嘅餐廳。完全免費。",
    accSignedInAs: "已經用 {email} 登入", accStatBeen: "去過", accStatStars: "累積星數", accStatThree: "三星餐廳", accStatCountries: "國家",
    accMilestones: "里程碑", ms1: "第一粒星", ms2: "第一間三星", ms3: "10 間餐廳", ms4: "25 間餐廳", ms5: "3 個國家", ms6: "累積 50 粒星", msGot: "（已經達到）",
    accWhere: "你去過嘅地方", accOf: "{total} 間入面去過 {n} 間", accBeenTitle: "去過嘅餐廳", accBeenEmpty: "未剔過任何餐廳。喺你去過嘅餐廳旁邊撳 ✓ 就得。",
    accDateAria: "你去{name}嘅日期", accRemove: "移除", accWishTitle: "你嘅心水清單", accWishEmpty: "你嘅心水清單係空嘅。撳任何一間餐廳旁邊嘅心心就可以儲低。",
    accMarkBeen: "去過", accData: "你嘅資料", accDataText: "下載我哋為你帳戶保存嘅所有資料、喺呢部裝置登出，或者永久刪除你嘅帳戶同兩份清單。",
    accDownload: "下載我嘅資料", accSignOut: "登出", accDelete: "刪除我嘅帳戶", accDeleteConfirm: "咁會永久刪除你嘅帳戶同兩份清單，冇得復原。",
    accDeleteYes: "永久刪除", accDeleteNo: "保留我嘅帳戶", accDeleted: "你嘅帳戶已經刪除。", accDeleteFail: "暫時刪除唔到你嘅帳戶。請再試多次，或者用聯絡表格。",
    acctSignIn: "登入", acctAccount: "帳戶", acctTitle: "登入或者開個免費帳戶",
    acctWhy: "喺每部裝置都保留你嘅心水清單，仲可以剔低你去過嘅餐廳。",
    acctWhyBeen: "開個免費帳戶就可以剔低你去過嘅餐廳，心水清單亦會喺每部裝置同步。",
    acctGoogle: "用 Google 繼續", acctOr: "或者", acctEmailLabel: "電郵地址", acctSend: "寄登入驗證碼俾我", acctSending: "寄緊…",
    acctSent: "請睇下你嘅電郵。我哋已經將登入連結寄咗去 {email}，喺呢部裝置打開就可以完成登入。",
    acctTooMany: "登入電郵寄得太密，請等一分鐘再試。", acctFailed: "做唔到，請檢查電郵地址再試多次。",
    acctBadEmail: "請輸入完整嘅電郵地址，例如 name@example.com。", acctSmall: "免費，唔使記密碼。我哋只會用你嘅電郵嚟登入。",
    acctPrivacy: "私隱聲明", acctClose: "關閉", acctWelcome: "你已經登入。你嘅心水清單而家會喺每部裝置同步。",
    acctLinkExpired: "呢條登入連結已經過期或者用過，請撳「登入」攞條新嘅。",
    been: "去過", beenAdd: "將{name}標示為去過", beenRemove: "取消{name}嘅去過標示", beenAddT: "標示為去過", beenRemoveT: "取消去過標示",
    toastBeen: "已經將{name}標示為去過", toastNotBeen: "已經取消{name}嘅去過標示", showBeen: "去過",
    beenProgress: "呢度 {total} 間餐廳入面，你去過 {n} 間。", wishNoteOut: "你嘅心水清單只係儲喺呢部裝置。", wishNoteSignIn: "登入就可以喺每部裝置保留", wishCompare: "並排比較你心水嘅餐廳",
    wishNoteIn: "你嘅心水清單同去過清單已經儲咗喺你嘅帳戶。", wishCtaHome: "你嘅心水清單只係儲喺呢部裝置。免費登記就可以喺每部裝置保留，仲可以剔低你去過嘅餐廳。",
    wishCtaBtn: "免費登記", wishSynced: "已經儲咗喺你嘅帳戶。", acctSee: "睇你嘅帳戶",
    shareInsta: "想分享去 Instagram，就複製條連結，再貼落限時動態或者訊息度。",
    shareMore: "Instagram、訊息同更多",
    shareTextPlace: "喺{place}，一粒米芝蓮星要幾多錢？晚市、午市同配酒價錢一次過比較。",
    shareTextHome: "一粒米芝蓮星要幾多錢？各個城市晚市、午市同配酒價錢一次過比較。",
    infoDinner: "晚市", infoWine: "配酒", infoGoogle: "Google 評分", infoOpen: "喺 Google 地圖打開", infoNoPrice: "未有公布價錢",
    starsTitle: "每多一粒星，要多俾幾多錢？",
    starsText: "按上面所揀餐期、以米芝蓮星級分組嘅套餐平均價錢。單點餐廳會計入間數，但唔計入平均同價錢範圍。",
    tierNames: ["一星", "二星", "三星"], avgDinner: "晚市平均", tRestaurants: "餐廳數目", tRange: "價錢範圍", tRating: "Google 平均評分",
    tVs: "比{n}星", tNoPrices: "呢啲餐廳冇套餐價錢。", tNone: "暫時冇{tier}餐廳。",
    methodTitle: "價錢點樣計",
    m1Title: "每位價錢，未計服務費",
    m1Text: "所有價錢都係一位嘅價錢，未計服務費，亦唔包魚子醬或者松露等額外加錢嘅菜式。用其他貨幣顯示嘅價錢係按當日匯率計，只供參考。",
    m2Title: "價錢從邊度嚟",
    m2Text: "晚市以主要品嚐菜單為準，配酒就揀最平嗰個。有公布價錢嘅，我哋用餐廳官網；冇嘅話就參考最近嘅食評同訂座網站。",
    m3Title: "星級同 Google 評分",
    m3Text: "Google 評分（滿分5分）同評論數喺2026年10月核實過；星級嚟自每個地方最新一版米芝蓮指南。",
    contactTitle: "發現價錢有變？",
    contactText: "餐廳成日調整價錢。歡迎話俾我哋知最新價錢、我哋漏咗嘅餐廳，或者你想我哋下一個介紹嘅城市。",
    cName: "姓名", cEmail: "電郵", cTopic: "主題", cTopicPrice: "更新價錢", cTopicSuggest: "推介餐廳", cTopicCity: "介紹其他城市", cTopicOther: "其他",
    cMsg: "訊息", cMsgPh: "話俾我哋知係邊間餐廳、最新價錢同喺邊度見到。",
    cSend: "傳送訊息", errName: "請輸入姓名。", errEmail: "請輸入有效電郵，例如 name@example.com。", errMsg: "請寫一段簡短訊息。",
    sent: "多謝你，{name}。你嘅電郵程式應該會開啟並帶入你嘅訊息，撳「傳送」就得。如果冇開到，請直接寄去 hello@starredbill.com。",
    footEdition: "The Starred Bill・{place}",
    footNote: "價錢同評分喺2026年10月核實過，訂枱之前請向餐廳確認。",
    rateLine: "{sym} 價錢按 {date} 匯率計，只供參考：{sym}1 = {home}{rate}。",
    rateLineMixed: "價錢按 {date} 匯率換算成 {sym}，只供參考。",
    currencyAria: "價錢顯示貨幣", crumbsAria: "你而家喺度", menuOpen: "選單",
    wishTitle: "你嘅心水清單", installApp: "加到主畫面",
    installTipIos: "安裝方法：喺 Safari 撳分享掣（有箭咀嘅方格），再揀「加入主畫面」。",
    clearSearch: "清除搜尋", photoView: "睇{name}嘅大相", photoClose: "閂"
  },
  ja: {
    destGuide: "ミシュランガイド全体では{n}軒",
    acctSentCode: "{email} に6桁のコードを送りました。下に入力すると、ここでログインできます（メールのリンクも使えますが、ホーム画面のアプリではブラウザが開きます）。", acctCodeLabel: "メールのコード", acctVerify: "コードでログイン", acctVerifying: "確認中…", acctCodeWrong: "コードが正しくありません。確認するか、新しいコードを受け取ってください。", acctBadCode: "メールに記載の6桁のコードを入力してください。",
    destHighLow: "多い順", destLowHigh: "少ない順", destFlip: "もう一度押すと順序が逆になります",
    destContLabel: "地域", continents: { "europe": "ヨーロッパ", "asia": "アジア", "middle-east": "中東", "americas": "南北アメリカ", "oceania": "オセアニア" },
    destSortLabel: "並べ替え", destSortAZ: "名前順", destSortMost: "店数", destSortStars: "{n}つ星の店数",
    noStarsTitle: "ミシュランの星がまだない国", noStarsText: "以下の{n}か国には星付きレストランがありません。多くはミシュランガイドがまだ発行されていないためです。ほかの理由がある国（*印）はここで説明しています。",
    destSoon: "料金は未掲載", destSoonMap: "地図で見る",
    destJump: "国・地域へ移動",
    notrackOn: "このブラウザはアクセス統計に含まれなくなりました。", notrackOff: "このブラウザは再びアクセス統計に含まれます。",
    destAreas: "地域と都市", destRegions: "地域", destCityList: "都市",
    cookieText: "サイトの利用状況を把握するため、Google アナリティクスの Cookie を使用してもよろしいですか？どちらを選んでも、アクセス数は Cookie を使わずに計測します。", cookieAccept: "同意する", cookieReject: "拒否する", cookieSettings: "Cookie の設定を変更",
    navCompare: "比較", navMap: "地図", navStars: "星別", navMethod: "算出方法", navContact: "お問い合わせ", navDestinations: "エリア一覧", navGuides: "ガイド", navNear: "現在地周辺", navPick: "お店選び", wishlist: "お気に入り",
    pageTitle: "The Starred Bill・{place}",
    heroEyebrow: "{place}・ミシュランガイド掲載店",
    heroTitle: "{place}で、ミシュランの星は<em>いくら</em>？",
    heroText: "{place}の星付きレストランのディナー、ランチ、ペアリングの1人あたりの料金を並べて比較。店名や料理ジャンルで検索し、星の数やジャンルで絞り込めます。行きたい店はお気に入りに保存できます。",
    crumbHome: "すべてのエリア", explore: "エリアを見る", exploreCities: "{country}の都市", exploreDistricts: "{country}の各地区", alsoIn: "こちらにも掲載",
    figCount: "掲載店数", figMin: "最も安いディナーコース", figMax: "最も高いディナーコース", figMinLunch: "最も安いランチコース", figMaxLunch: "最も高いランチコース",
    fMeal: "食事", mealDinner: "ディナー", mealLunch: "ランチ", hNotesLunch: "ランチの備考", noLunch: "ランチ営業なし", avgLunch: "ランチ平均", infoLunch: "ランチ",
    sortPriceAscLunch: "ランチ：安い順", sortPriceDescLunch: "ランチ：高い順",
    starCounts: "三つ星 {3}軒・二つ星 {2}軒・一つ星 {1}軒",
    compareTitle: "すべての店、すべての料金",
    compareText: "下でディナーとランチを切り替えられます。料金はテイスティングコースまたはコース料理の価格です（「1品あたり」「予算の目安」と記載のものを除く）。バーは各コースを一覧で最も高いコースと比べたもので、料金はそれぞれ情報源にリンクしています。",
    searchPh: "店名・料理・エリアで検索", searchPhShort: "店名・料理・エリア", searchPhEx: "店名・料理・エリアで検索（例：{ex}）",
    searchLabel: "店名・料理ジャンル・エリアでレストランを検索",
    sortLabel: "並べ替え",
    sortPriceAsc: "ディナー：安い順", sortPriceDesc: "ディナー：高い順", sortStars: "星の多い順", sortRating: "Google評価の高い順", sortName: "店名順",
    fShow: "表示", fStars: "ミシュランの星", fCuisine: "料理ジャンル",
    fDiet: "食事制限", dietVegOnly: "ベジタリアン専門店", dietVegMenu: "ベジタリアンコース", dietVeg: "ベジタリアン対応", dietVegan: "ヴィーガン対応", dietGf: "グルテンフリー対応", dietHalal: "ハラール", dietKosher: "コーシャ",
    badgeVegOnly: "ベジタリアン", badgeVegMenu: "ベジコース", badgeVegan: "ヴィーガン", chefLabel: "シェフ {name}",
    exploreMore: "ほか{n}件", exploreFewer: "閉じる",
    filtersBtn: "絞り込み", filtersShowN: "{n}軒を表示", filtersClear: "すべてクリア", cuisineSearchPh: "料理ジャンルを検索", removeFilter: "絞り込みを解除：{f}", sheetClose: "閉じる",
    showAll: "すべての店", showChanges: "最近の星の変動", showWish: "お気に入り",
    showChangesTitle: "直近2回のミシュランガイドで星を獲得または失った店",
    all: "すべて", starsAria: "ミシュラン{n}つ星",
    hRestaurant: "レストラン", hCuisine: "料理", hStars: "星", hGoogle: "Google", hNotes: "ディナーの備考", hPrice: "料金", hWine: "ペアリング", hWish: "お気に入り",
    tableLabel: "レストランの料金",
    reviews: "{n}件", ratingAria: "Google評価 5点中{r}",
    srcSite: "公式サイト", srcPress: "情報源", srcTitle: "この料金の情報源",
    perMain: "1品あたり", typicalSpend: "予算の目安", notListed: "非公開",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · 1名様", rcptDinnerOnly: "ディナーのみ", rcptNoPairing: "ペアリング記載なし", rcptPlusWine: "+ ペアリング {p}", rcptDinnerWine: "ディナー + ペアリング", rcptLunchWine: "ランチ + ペアリング", rcptChecked: "{d} 確認", rcptIncl: "1人あたり・サービス料込み", rcptPlus: "1人あたり・++（サービス料・税別）", rcptTaxTip: "1人あたり・税・チップ別", rcptTip: "1人あたり・チップ別", rcptTax: "1人あたり・税込",
    // The wishlist as one bill (homepage).
    billTitle: "お気に入りを1枚の伝票に", billIntro: "保存したすべての店で1人が食事した場合の合計に、各国で一般的なサービス料・税・チップの目安を加えた金額です。", billHead: "The Starred Bill · {meal} 1名様", billWine: "ペアリングを追加", billSubtotal: "小計", billExtras: "サービス料・税・チップ（目安）", billTotal: "合計", billIncluded: "サービス料込み", billTax: "税込", billBefore: "サービス料 +{p}%", billPlus: "++ で約 {p}% 加算", billTaxTip: "税とチップで約 {p}% 加算", billTip: "チップ約 {p}%", billNoLunch: "ランチ営業なし（含まず）", billNoPrice: "料金未掲載（含まず）", billPerMain: "アラカルト（含まず）", billCount: "保存した {b} 軒のうち {a} 軒を合計", billFoot: "1人あたり、ペアリングを追加しない限り飲み物別。サービス料・税・チップは目安です。各店にご確認ください。", billConverted: "本日の為替レートで換算。",
    findOnMaps: "Googleマップで{name}を見る", findOnMapsTitle: "Googleマップで見る",
    showOnly: "{cat}だけを表示",
    chgNew: "新規", chgTitle: "{date}のミシュランガイド：{note}",
    emptyWish: "お気に入りに保存した店は{place}にはありません。店のハートをタップするとお気に入りに追加できます。",
    emptyPlace: "{place}には現在ミシュランの星付きレストランはありません。星を獲得した店が出しだい、このページを更新します。",
    emptySee: "{name}の星付きレストラン{n}軒を見る", exploreAll: "すべてのエリア",
    noMatch: "条件に合うレストランはありません。", clearFilters: "検索と絞り込みをクリア",
    formerTitle: "星を失った店",
    formerNote: "前回の一覧に掲載されていたものの、その後星を失った、閉店した、または変更があった店です。参考として掲載しています。",
    formerly: "以前", stLost: "星を喪失", stClosed: "閉店", stChanged: "変更",
    tapHint: "レストランをタップすると、料金と詳細がすべて表示されます。",
    showing: "星付きレストラン{b}軒中{a}軒を表示", showingFormer: "（ほかに星を失った店{c}軒）",
    wishNote: "お気に入りはこのブラウザにのみ保存されます。",
    wishAdd: "{name}をお気に入りに追加", wishRemove: "{name}をお気に入りから削除", wishAddT: "お気に入りに追加", wishRemoveT: "お気に入りから削除",
    toastAdded: "{name}をお気に入りに追加しました", toastRemoved: "{name}をお気に入りから削除しました", undo: "元に戻す",
    photo: "写真", tempClosed: "臨時休業中（Google）",
    mapTitle: "星付きレストランを地図で一覧",
    mapText: "地図のピンは上の一覧の絞り込みに連動します。星の数、料理ジャンル、お気に入りを選ぶと地図も切り替わります。ピンをタップすると料金と道順へのリンクが表示されます。",
    mapWait: "ここまでスクロールすると地図を読み込みます。", mapLabel: "ミシュラン星付きレストランの地図",
    mapError: "地図を読み込めませんでした。一覧の各店の横にあるピンからGoogleマップで開けます。",
    legendAria: "ピンの色の意味", legendItem: "ミシュラン{n}つ星",
    mapShowing: "地図に{n}軒を表示中", mapNone: "現在の条件に合うレストランはありません",
    nearMe: "現在地周辺", nearMeAria: "現在地の近くの星付きレストランを表示", nearFinding: "現在地を取得中…", youAreHere: "現在地",
    nearTitle: "近い順", nearAway: "{d}先", nearWorld: "世界地図で現在地の近くの星付きレストランを見る",
    nearNone: "このページの店は近くにありません。最も近いのは{name}（{d}）です。",
    nearDenied: "位置情報へのアクセスがオフになっています。ブラウザの設定でこのサイトに許可してから、もう一度お試しください。",
    nearFailed: "現在地を取得できませんでした。もう一度お試しください。", nearUnsupported: "このブラウザは位置情報を共有できません。",
    jumpMap: "地図", jumpMapAria: "地図へ移動",
    share: "共有", shareAria: "このページを共有", shareTitle: "このページを共有", shareCopy: "リンクをコピー", shareCopied: "コピーしました", shareEmail: "メール",
    accTitle: "アカウント", accLoading: "アカウントを読み込んでいます…", accOutText: "ログインすると、お気に入りと行ったレストランをどの端末でも見られます。無料です。",
    accSignedInAs: "{email} でログイン中", accStatBeen: "行った店", accStatStars: "獲得した星", accStatThree: "三つ星", accStatCountries: "国",
    accMilestones: "マイルストーン", ms1: "初めての星", ms2: "初めての三つ星", ms3: "10軒", ms4: "25軒", ms5: "3か国", ms6: "星50個", msGot: "（達成）",
    accWhere: "行った場所", accOf: "{total}軒中{n}軒", accBeenTitle: "行った店", accBeenEmpty: "まだチェックがありません。行ったレストランの横の ✓ をタップしてください。",
    accDateAria: "{name}に行った日", accRemove: "削除", accWishTitle: "お気に入り", accWishEmpty: "お気に入りはまだありません。レストランの横のハートをタップすると保存できます。",
    accMarkBeen: "行った", accData: "データ", accDataText: "アカウントの全データのダウンロード、この端末でのログアウト、アカウントと両方のリストの完全な削除ができます。",
    accDownload: "データをダウンロード", accSignOut: "ログアウト", accDelete: "アカウントを削除", accDeleteConfirm: "アカウントと両方のリストが完全に削除されます。元に戻せません。",
    accDeleteYes: "完全に削除", accDeleteNo: "削除しない", accDeleted: "アカウントを削除しました。", accDeleteFail: "現在アカウントを削除できません。もう一度お試しいただくか、お問い合わせフォームをご利用ください。",
    acctSignIn: "ログイン", acctAccount: "アカウント", acctTitle: "ログインまたは無料アカウント作成",
    acctWhy: "お気に入りをどの端末でも使えて、行ったレストランにチェックを付けられます。",
    acctWhyBeen: "無料アカウントを作ると、行ったレストランにチェックを付けられます。お気に入りもどの端末でも使えます。",
    acctGoogle: "Google で続ける", acctOr: "または", acctEmailLabel: "メールアドレス", acctSend: "ログイン用コードをメールで受け取る", acctSending: "送信中…",
    acctSent: "メールを確認してください。{email} にログイン用リンクを送りました。この端末で開くとログインが完了します。",
    acctTooMany: "ログイン用メールの送信が多すぎます。1分ほど待ってからもう一度お試しください。", acctFailed: "うまくいきませんでした。メールアドレスを確認して、もう一度お試しください。",
    acctBadEmail: "メールアドレスを正しく入力してください（例：name@example.com）。", acctSmall: "無料で、パスワードは不要です。メールアドレスはログインにのみ使います。",
    acctPrivacy: "プライバシーについて", acctClose: "閉じる", acctWelcome: "ログインしました。お気に入りがどの端末でも使えるようになりました。",
    acctLinkExpired: "このログイン用リンクは期限切れか、すでに使われています。「ログイン」から新しいリンクを受け取ってください。",
    been: "行った", beenAdd: "{name}を「行った」にする", beenRemove: "{name}の「行った」を外す", beenAddT: "「行った」にする", beenRemoveT: "「行った」を外す",
    toastBeen: "{name}を「行った」にしました", toastNotBeen: "{name}の「行った」を外しました", showBeen: "行った店",
    beenProgress: "ここにある{total}軒のうち{n}軒に行きました。", wishNoteOut: "お気に入りはこの端末にのみ保存されています。", wishNoteSignIn: "ログインするとどの端末でも使えます", wishCompare: "お気に入りのレストランを並べて比較",
    wishNoteIn: "お気に入りと行った店はアカウントに保存されています。", wishCtaHome: "お気に入りはこの端末にのみ保存されています。無料登録すると、どの端末でも使えて、行ったレストランにチェックを付けられます。",
    wishCtaBtn: "無料で登録", wishSynced: "アカウントに保存されています。", acctSee: "アカウントを見る",
    shareInsta: "Instagramでは、リンクをコピーしてストーリーズやメッセージに貼り付けてください。",
    shareMore: "Instagram、メッセージなど",
    shareTextPlace: "{place}でミシュランの星はいくら？ディナー、ランチ、ペアリングの料金を並べて比較。",
    shareTextHome: "ミシュランの星はいくら？都市ごとにディナー、ランチ、ペアリングの料金を並べて比較。",
    infoDinner: "ディナー", infoWine: "ペアリング", infoGoogle: "（Google）", infoOpen: "Googleマップで開く", infoNoPrice: "料金非公開",
    starsTitle: "星がひとつ増えると、いくら上がる？",
    starsText: "上で選んだ食事について、ミシュランの星の数ごとにコース料金の平均を出しています。アラカルト中心の店は軒数には含めますが、平均と価格帯からは除いています。",
    tierNames: ["一つ星", "二つ星", "三つ星"], avgDinner: "ディナー平均", tRestaurants: "店数", tRange: "価格帯", tRating: "Google平均評価",
    tVs: "{n}つ星との差", tNoPrices: "これらの店にはコース料金がありません。", tNone: "{tier}の店はまだありません。",
    methodTitle: "料金の算出方法",
    m1Title: "1人あたり・サービス料別",
    m1Text: "すべてお一人様の料金で、国によって異なるサービス料は含みません。キャビアやトリュフなどの追加料金も含みません。他の通貨での表示はその日の為替レートによる概算です。",
    m2Title: "料金の出典",
    m2Text: "ディナーはメインのテイスティングコース、ペアリングはそのコースの最も安いものです。料金は各店の公式サイトに掲載があればそれを、なければ最近のレビューや予約サイトを参照しています。ランチはランチコースまたはテイスティングコースで、提供日を備考に記載しています。",
    m3Title: "星とGoogle評価",
    m3Text: "Googleの評価（5点満点）とレビュー数は2026年10月に確認しました。星は各国の最新のミシュランガイドによるものです。緑の ▲ は直近2回のガイドで星を獲得した店、赤の ▼ は星を失った店を示します。",
    contactTitle: "料金の変更に気づきましたか？",
    contactText: "メニューの料金はよく改定されます。最新の料金、掲載漏れの店、次に取り上げてほしい都市などをお知らせください。",
    cName: "お名前", cEmail: "メールアドレス", cTopic: "内容", cTopicPrice: "料金の更新", cTopicSuggest: "レストランの提案", cTopicCity: "他の都市のリクエスト", cTopicOther: "その他",
    cMsg: "メッセージ", cMsgPh: "店名、新しい料金、どこで見たかを教えてください。",
    cSend: "送信", errName: "お名前を入力してください。", errEmail: "name@example.com のようなメールアドレスを入力してください。", errMsg: "メッセージを入力してください。",
    sent: "{name}さん、ありがとうございます。メッセージが入った状態でメールアプリが開きますので、そのまま送信してください。開かない場合は hello@starredbill.com までお送りください。",
    footEdition: "The Starred Bill・{place}",
    footNote: "料金と評価は2026年10月に確認しました。予約前に各店にご確認ください。",
    rateLine: "{sym}での料金は{date}の為替レートによる概算です：{sym}1 = {home}{rate}。",
    rateLineMixed: "料金は{date}の為替レートで{sym}に換算した概算です。",
    currencyAria: "料金の表示通貨", crumbsAria: "現在地", menuOpen: "メニュー",
    homeTitle: "The Starred Bill・ミシュラン星付きレストランの料金",
    homeEyebrow: "ミシュラン星付きレストランの料金",
    homeH1: "ミシュランの星は<em>いくら</em>？都市ごとに比較。",
    homeText: "ミシュラン星付きレストランのディナー、ランチ、ペアリングの1人あたりの料金を並べて比較。料金はそれぞれ情報源にリンクしています。エリアを選ぶか、地図から探してみてください。",
    figRestaurants: "掲載店数", figDestinations: "エリア", figUpdated: "料金確認", figUpdatedSub: "ディナー・ランチ・ペアリング",
    citiesN: "{n}都市",
    homeSearchPh: "店名・料理・都市で検索", homeSearchLabel: "店名・料理・都市で検索", searchNone: "「{q}」に一致するものはまだありません。",
    mapHomeTitle: "世界中のミシュラン星付きレストラン",
    mapHomeText: "拡大すると個々の店が表示されます。ピンをタップするとディナー料金と、その都市の比較ページへのリンクが表示されます。",
    destTitle: "国・地域を選ぶ", destText: "各エリアには料金、絞り込み、地図、星ごとの平均をまとめたページがあります。",
    destRestaurants: "星付きレストラン{n}軒", destFrom: "ディナーコース {p}〜", destOpen: "{place}を比較",
    collectionsTitle: "特集エリア",
    wishTitle: "お気に入り", wishText: "各エリアで保存した店です。",
    wishEmptyHome: "まだ保存した店はありません。各エリアのページで店の横のハートをタップすると、ここに追加されます。",
    wishRemoveShort: "削除",
    infoCompare: "{place}の料金を比較",
    clearSearch: "検索をクリア", photoView: "{name}の写真を拡大", photoClose: "閉じる",
    mapSearchPh: "地図を検索：店名・都市・国", mapSearchPhShort: "店名・都市・国", homeSearchPhShort: "店名・料理・都市", mapSearchLabel: "地図上でレストラン・都市・国を検索",
    mapHomeWorldText: "世界のミシュラン星付きレストラン全{n}軒。塗りつぶしのピンは当サイトで料金を比較できる店、白抜きのピンは料金を追加するまでミシュランガイドにリンクしています。拡大すると個々の店が表示されます。",
    infoNoPricesYet: "当サイトの料金はまだありません", infoMichelin: "ミシュランガイド", legendHollow: "白抜き＝料金未掲載",
    installApp: "アプリを追加",
    installTipIos: "追加方法：Safariの共有ボタン（矢印付きの四角）をタップし、「ホーム画面に追加」を選んでください。"
  },
  es: {
    destGuide: "En toda la Guía MICHELIN: {n}",
    acctSentCode: "Te hemos enviado un código de 6 cifras a {email}. Escríbelo abajo para iniciar sesión aquí. (El enlace del correo también sirve, pero en la app de la pantalla de inicio abre el navegador.)", acctCodeLabel: "Código del correo", acctVerify: "Entrar con el código", acctVerifying: "Comprobando…", acctCodeWrong: "Ese código no ha funcionado. Revísalo o pide uno nuevo.", acctBadCode: "Escribe el código de 6 cifras del correo.",
    destHighLow: "de más a menos", destLowHigh: "de menos a más", destFlip: "Vuelve a pulsar para invertir el orden",
    destContLabel: "Continente", continents: { "europe": "Europa", "asia": "Asia", "middle-east": "Oriente Medio", "americas": "América", "oceania": "Oceanía" },
    destSortLabel: "Ordenar", destSortAZ: "A–Z", destSortMost: "Restaurantes", destSortStars: "Restaurantes de {n} estrella|Restaurantes de {n} estrellas",
    noStarsTitle: "Aún sin estrellas Michelin", noStarsText: "Estos {n} países no tienen ningún restaurante con estrella. En la mayoría, la razón es que la Guía MICHELIN aún no los cubre; cuando hay algo más (marcado con *), se explica aquí.",
    destSoon: "Aún sin precios", destSoonMap: "Verlos en el mapa",
    destJump: "Ir a un país",
    notrackOn: "Este navegador ya no se cuenta en las estadísticas de visitas.", notrackOff: "Este navegador vuelve a contarse en las estadísticas de visitas.",
    destAreas: "Regiones y ciudades", destRegions: "Regiones", destCityList: "Ciudades",
    cookieText: "¿Podemos usar cookies de Google Analytics para saber cómo se usa el sitio? Las visitas se cuentan sin cookies en cualquier caso.", cookieAccept: "Aceptar", cookieReject: "Rechazar", cookieSettings: "Cambiar la elección de cookies",
    navCompare: "Comparar", navMap: "Mapa", navStars: "Por estrellas", navMethod: "Método", navContact: "Contacto", navDestinations: "Destinos", navGuides: "Guías", navNear: "Cerca de mí", navPick: "Ayúdame a elegir", wishlist: "Favoritos",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · Restaurantes de la Guía Michelin",
    heroTitle: "¿Cuánto <em>cuesta</em> una estrella Michelin {placeIn}?",
    heroText: "Precios por persona de la cena, el almuerzo y el maridaje en los restaurantes con estrella {placeIn}, uno al lado del otro. Busca por nombre o tipo de cocina, filtra por estrellas o cocina y guarda en tus favoritos los que quieras probar.",
    crumbHome: "Todos los destinos", explore: "Explorar", exploreCities: "Ciudades – {country}", exploreDistricts: "Barrios – {country}", alsoIn: "También en",
    figCount: "Restaurantes", figMin: "Menú de cena más barato", figMax: "Menú de cena más caro", figMinLunch: "Menú de almuerzo más barato", figMaxLunch: "Menú de almuerzo más caro",
    fMeal: "Servicio", mealDinner: "Cena", mealLunch: "Almuerzo", hNotesLunch: "Notas del almuerzo", noLunch: "No abre a mediodía", avgLunch: "almuerzo medio", infoLunch: "almuerzo",
    sortPriceAscLunch: "Almuerzo: de menor a mayor precio", sortPriceDescLunch: "Almuerzo: de mayor a menor precio",
    starCounts: "{3} con tres estrellas · {2} con dos · {1} con una",
    compareTitle: "Cada mesa, cada precio",
    compareText: "Cambia entre cena y almuerzo aquí abajo. Los precios son del menú degustación o del menú cerrado, salvo los marcados “por plato principal” o “gasto habitual”, y las barras comparan cada menú con el más caro de la lista. Cada precio enlaza a su fuente.",
    searchPh: "Busca un restaurante, una cocina o una zona", searchPhShort: "Restaurante, cocina o zona", searchPhEx: "Busca un restaurante, una cocina o una zona, p. ej. “{ex}”",
    searchLabel: "Buscar restaurantes por nombre, cocina o zona",
    sortLabel: "Ordenar restaurantes",
    sortPriceAsc: "Cena: de menor a mayor precio", sortPriceDesc: "Cena: de mayor a menor precio", sortStars: "Más estrellas primero", sortRating: "Nota de Google: de mayor a menor", sortName: "Nombre de la A a la Z",
    fShow: "Mostrar", fStars: "Estrellas Michelin", fCuisine: "Cocina",
    fDiet: "Dieta", dietVegOnly: "Restaurante vegetariano", dietVegMenu: "Menú degustación vegetariano", dietVeg: "Opciones vegetarianas", dietVegan: "Opciones veganas", dietGf: "Opciones sin gluten", dietHalal: "Halal", dietKosher: "Kosher",
    badgeVegOnly: "Vegetariano", badgeVegMenu: "Menú vegetariano", badgeVegan: "Vegano", chefLabel: "Chef {name}",
    exploreMore: "{n} más", exploreFewer: "Ver menos",
    filtersBtn: "Filtros", filtersShowN: "Ver {n} restaurante|Ver {n} restaurantes", filtersClear: "Borrar todo", cuisineSearchPh: "Buscar una cocina", removeFilter: "Quitar filtro: {f}", sheetClose: "Cerrar",
    showAll: "Todos los restaurantes", showChanges: "Cambios recientes de estrellas", showWish: "Mis favoritos",
    showChangesTitle: "Ganaron o perdieron una estrella en una de las dos últimas Guías Michelin",
    all: "Todas", starsAria: "{n} estrella Michelin|{n} estrellas Michelin",
    hRestaurant: "Restaurante", hCuisine: "Cocina", hStars: "Estrellas", hGoogle: "Google", hNotes: "Notas de la cena", hPrice: "Precio", hWine: "Maridaje", hWish: "Favoritos",
    tableLabel: "Precios de los restaurantes",
    reviews: "{n} reseña|{n} reseñas", ratingAria: "Nota de Google: {r} sobre 5",
    srcSite: "Web del restaurante", srcPress: "Fuente: reseña", srcTitle: "De dónde sale este precio",
    perMain: "por plato principal", typicalSpend: "gasto habitual", notListed: "No publicado",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · Mesa para 1", rcptDinnerOnly: "Solo cenas", rcptNoPairing: "sin maridaje publicado", rcptPlusWine: "+ maridaje {p}", rcptDinnerWine: "Cena + maridaje", rcptLunchWine: "Almuerzo + maridaje", rcptChecked: "Revisado: {d}", rcptIncl: "Por persona, servicio incluido", rcptPlus: "Por persona, ++ (servicio e impuestos aparte)", rcptTaxTip: "Por persona, sin impuestos ni propina", rcptTip: "Por persona, sin propina", rcptTax: "Por persona, impuestos incluidos",
    // The wishlist as one bill (homepage).
    billTitle: "Tu lista de favoritos en una sola cuenta", billIntro: "Lo que costarían para una persona todos los restaurantes guardados, con una estimación del servicio, los impuestos y la propina habituales de cada país.", billHead: "The Starred Bill · {meal} para 1", billWine: "Añadir maridajes", billSubtotal: "Subtotal", billExtras: "Servicio, impuestos y propinas (est.)", billTotal: "Total", billIncluded: "servicio incluido", billTax: "impuestos incluidos", billBefore: "+{p} % de servicio", billPlus: "++ suma un {p} % aprox.", billTaxTip: "impuestos y propina suman un {p} % aprox.", billTip: "propina de un {p} % aprox.", billNoLunch: "no abre a mediodía, no se suma", billNoPrice: "aún sin precio, no se suma", billPerMain: "a la carta, no se suma", billCount: "Suma {a} de {b} restaurante guardado|Suma {a} de {b} restaurantes guardados", billFoot: "Por persona, sin bebidas salvo que añadas los maridajes. Servicio, impuestos y propinas son estimaciones: confírmalos con cada restaurante.", billConverted: "Convertido al tipo de cambio de hoy.",
    findOnMaps: "Buscar {name} en Google Maps", findOnMapsTitle: "Buscar en Google Maps",
    showOnly: "Mostrar solo {cat}",
    chgNew: "Nuevo", chgTitle: "{note} en la Guía Michelin de {date}",
    emptyWish: "Ninguno de tus restaurantes guardados está {placeIn}. Toca el corazón de cualquier restaurante para guardarlo.",
    emptyPlace: "Ahora mismo no hay ningún restaurante con estrella Michelin {placeIn}, pero actualizaremos esta página en cuanto aparezca uno.",
    emptySee: "Ver el restaurante con estrella de {name}|Ver los {n} restaurantes con estrella de {name}", exploreAll: "Todas las zonas",
    noMatch: "Ningún restaurante coincide con estos filtros.", clearFilters: "Borrar búsqueda y filtros",
    formerTitle: "Ya sin estrella",
    formerNote: "Restaurantes que estaban en la edición anterior de esta lista pero que desde entonces han perdido sus estrellas, han cerrado o han cambiado. Se muestran solo como referencia.",
    formerly: "antes", stLost: "Perdió la estrella", stClosed: "Cerrado", stChanged: "Cambió",
    tapHint: "Toca un restaurante para ver todos sus precios y detalles.",
    showing: "Mostrando {a} de {b} restaurantes con estrella", showingFormer: ", más {c} ya sin estrella",
    wishNote: "Tus favoritos se guardan solo en este navegador.",
    wishAdd: "Añadir {name} a tus favoritos", wishRemove: "Quitar {name} de tus favoritos", wishAddT: "Añadir a favoritos", wishRemoveT: "Quitar de favoritos",
    toastAdded: "{name} añadido a tus favoritos", toastRemoved: "{name} quitado de tus favoritos", undo: "Deshacer",
    photo: "Foto", tempClosed: "Cerrado temporalmente (Google)",
    mapTitle: "Todas las mesas con estrella en un mapa",
    mapText: "Los marcadores siguen los filtros de la lista de arriba: elige un nivel de estrellas, una cocina o tus favoritos y el mapa se actualiza. Toca un marcador para ver el precio y cómo llegar.",
    mapWait: "El mapa se carga al llegar aquí.", mapLabel: "Mapa de restaurantes con estrella Michelin",
    mapError: "Ahora mismo no se ha podido cargar el mapa. El marcador junto a cada restaurante de la lista sigue abriéndolo en Google Maps.",
    legendAria: "Qué significan los colores de los marcadores", legendItem: "{n} estrella Michelin|{n} estrellas Michelin",
    mapShowing: "{n} restaurante en el mapa|{n} restaurantes en el mapa", mapNone: "Ningún restaurante coincide con los filtros actuales",
    nearMe: "Cerca de mí", nearMeAria: "Mostrar restaurantes con estrella cerca de mi ubicación", nearFinding: "Buscando tu ubicación…", youAreHere: "Estás aquí",
    nearTitle: "Los más cercanos", nearAway: "a {d}", nearWorld: "Ver restaurantes con estrella cerca de ti en el mapa mundial",
    nearNone: "Ninguno de los restaurantes de esta página está cerca de ti. El más cercano es {name}, a {d}.",
    nearDenied: "El acceso a la ubicación está desactivado. Permítelo para este sitio en los ajustes del navegador y vuelve a intentarlo.",
    nearFailed: "No hemos podido encontrar tu ubicación. Vuelve a intentarlo.", nearUnsupported: "Este navegador no puede compartir tu ubicación.",
    jumpMap: "Mapa", jumpMapAria: "Ir al mapa",
    share: "Compartir", shareAria: "Compartir esta página", shareTitle: "Compartir esta página", shareCopy: "Copiar enlace", shareCopied: "Enlace copiado", shareEmail: "Correo",
    accTitle: "Tu cuenta", accLoading: "Cargando tu cuenta…", accOutText: "Inicia sesión para ver tus favoritos y los restaurantes en los que has estado, en cualquier dispositivo. Es gratis.",
    accSignedInAs: "Sesión iniciada como {email}", accStatBeen: "Visitados", accStatStars: "Estrellas acumuladas", accStatThree: "Restaurantes de tres estrellas", accStatCountries: "Países",
    accMilestones: "Logros", ms1: "Primera estrella", ms2: "Primer tres estrellas", ms3: "10 restaurantes", ms4: "25 restaurantes", ms5: "3 países", ms6: "50 estrellas acumuladas", msGot: "(conseguido)",
    accWhere: "Dónde has estado", accOf: "{n} de {total}", accBeenTitle: "He estado", accBeenEmpty: "Aún no has marcado ninguno. Toca el ✓ junto a cualquier restaurante en el que hayas estado.",
    accDateAria: "Fecha en que fuiste a {name}", accRemove: "Quitar", accWishTitle: "Tus favoritos", accWishEmpty: "Tu lista de favoritos está vacía. Toca el corazón junto a cualquier restaurante para guardarlo.",
    accMarkBeen: "He estado", accData: "Tus datos", accDataText: "Descarga todo lo que guardamos de tu cuenta, cierra sesión en este dispositivo o borra tu cuenta y las dos listas para siempre.",
    accDownload: "Descargar mis datos", accSignOut: "Cerrar sesión", accDelete: "Borrar mi cuenta", accDeleteConfirm: "Esto borra tu cuenta y las dos listas para siempre. No se puede deshacer.",
    accDeleteYes: "Borrar para siempre", accDeleteNo: "Mantener mi cuenta", accDeleted: "Tu cuenta se ha borrado.", accDeleteFail: "Ahora mismo no se ha podido borrar tu cuenta. Inténtalo de nuevo o usa el formulario de contacto.",
    acctSignIn: "Iniciar sesión", acctAccount: "Cuenta", acctTitle: "Inicia sesión o crea una cuenta gratis",
    acctWhy: "Guarda tus favoritos en todos tus dispositivos y marca los restaurantes en los que has estado.",
    acctWhyBeen: "Crea una cuenta gratis para marcar los restaurantes en los que has estado. También guarda tus favoritos en todos tus dispositivos.",
    acctGoogle: "Continuar con Google", acctOr: "o", acctEmailLabel: "Correo electrónico", acctSend: "Envíame un código de acceso", acctSending: "Enviando…",
    acctSent: "Revisa tu correo. Hemos enviado un enlace de acceso a {email}. Ábrelo en este dispositivo para terminar de iniciar sesión.",
    acctTooMany: "Demasiados correos de acceso seguidos. Espera un minuto y vuelve a intentarlo.", acctFailed: "No ha funcionado. Revisa el correo electrónico y vuelve a intentarlo.",
    acctBadEmail: "Escribe un correo completo, p. ej. nombre@ejemplo.com.", acctSmall: "Gratis y sin contraseña que recordar. Solo usamos tu correo para que inicies sesión.",
    acctPrivacy: "Aviso de privacidad", acctClose: "Cerrar", acctWelcome: "Has iniciado sesión. Tus favoritos ya te siguen a cualquier dispositivo.",
    acctLinkExpired: "Ese enlace de acceso ha caducado o ya se ha usado. Toca Iniciar sesión para recibir uno nuevo.",
    been: "He estado", beenAdd: "Marcar que he estado en {name}", beenRemove: "Quitar {name} de los visitados", beenAddT: "Marcar como visitado", beenRemoveT: "Quitar de visitados",
    toastBeen: "{name} marcado como visitado", toastNotBeen: "{name} quitado de visitados", showBeen: "He estado",
    beenProgress: "Has estado en {n} de los {total} de aquí.", wishNoteOut: "Tus favoritos se guardan solo en este dispositivo.", wishNoteSignIn: "Inicia sesión para tenerlos en todos tus dispositivos", wishCompare: "Compara tus restaurantes guardados lado a lado",
    wishNoteIn: "Tus favoritos y los restaurantes visitados se guardan en tu cuenta.", wishCtaHome: "Tus favoritos se guardan solo en este dispositivo. Regístrate gratis para tenerlos en todos tus dispositivos y marcar los restaurantes en los que has estado.",
    wishCtaBtn: "Regístrate gratis", wishSynced: "Guardado en tu cuenta.", acctSee: "Ver tu cuenta",
    shareInsta: "Para Instagram, copia el enlace y pégalo en una historia o un mensaje.",
    shareMore: "Instagram, Mensajes y más",
    shareTextPlace: "Cuánto cuesta una estrella Michelin {placeIn}: precios de cena, almuerzo y maridaje, uno al lado del otro.",
    shareTextHome: "Cuánto cuesta una estrella Michelin, ciudad a ciudad: precios de cena, almuerzo y maridaje, uno al lado del otro.",
    infoDinner: "cena", infoWine: "vino", infoGoogle: "en Google", infoOpen: "Abrir en Google Maps", infoNoPrice: "Precio no publicado",
    starsTitle: "Cuánto suma cada estrella",
    starsText: "Precio medio del menú para el servicio elegido arriba, agrupado por estrellas Michelin. Los restaurantes a la carta se cuentan, pero no entran en las medias ni en los rangos.",
    tierNames: ["Una estrella", "Dos estrellas", "Tres estrellas"], avgDinner: "cena media", tRestaurants: "Restaurantes", tRange: "Rango", tRating: "Nota media en Google",
    tVs: "frente a {n} estrella|frente a {n} estrellas", tNoPrices: "No hay precios de menú para estos restaurantes.", tNone: "Ningún restaurante en la categoría {tier}.",
    methodTitle: "Cómo se cuentan los precios",
    m1Title: "Por persona, sin servicio",
    m1Text: "Cada importe es para un comensal y no incluye el servicio, que varía de un país a otro. No se cuentan suplementos como caviar o trufa. Los precios mostrados en otra moneda usan el tipo de cambio del día y son aproximados.",
    m2Title: "De dónde salen los precios",
    m2Text: "La cena es el menú degustación principal, si lo hay, y el vino es su maridaje más barato. Tomamos los precios de la web de cada restaurante cuando los publica y, si no, de reseñas recientes y webs de reservas. El almuerzo es el menú del mediodía del restaurante, y la nota indica qué días se sirve.",
    m3Title: "Estrellas y nota de Google",
    m3Text: "La nota de Google sobre 5 y el número de reseñas, consultados en octubre de 2026. Las estrellas son las de la última Guía Michelin de cada país. Un ▲ verde marca un restaurante que ganó una estrella en una de las dos últimas guías; un ▼ rojo, uno que la perdió.",
    contactTitle: "¿Has visto un cambio de precio?",
    contactText: "Los menús cambian de precio a menudo. Cuéntanos una actualización, un restaurante que se nos haya escapado o una ciudad que te gustaría ver aquí.",
    cName: "Nombre", cEmail: "Correo", cTopic: "Tema", cTopicPrice: "Cambio de precio", cTopicSuggest: "Sugerir un restaurante", cTopicCity: "Añadir otra ciudad", cTopicOther: "Otra cosa",
    cMsg: "Mensaje", cMsgPh: "Dinos el restaurante, el nuevo precio y dónde lo viste.",
    cSend: "Enviar mensaje", errName: "Escribe tu nombre.", errEmail: "Escribe un correo como nombre@ejemplo.com.", errMsg: "Escribe un mensaje corto.",
    sent: "Gracias, {name}. Tu aplicación de correo debería abrirse con tu mensaje: solo tienes que pulsar Enviar. Si no se abre, escribe a hello@starredbill.com.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Precios y notas consultados en octubre de 2026. Confirma con cada restaurante antes de reservar.",
    rateLine: "Los precios en {sym} son aproximados, con el tipo de cambio del {date}: {sym}1 = {home}{rate}.",
    rateLineMixed: "Los precios se convierten a {sym} con el tipo de cambio del {date}, así que son aproximados.",
    currencyAria: "Mostrar precios en", crumbsAria: "Dónde estás", menuOpen: "Menú",
    wishTitle: "Tus favoritos",
    clearSearch: "Borrar búsqueda", photoView: "Ver una foto más grande de {name}", photoClose: "Cerrar",
    installApp: "Instalar app",
    installTipIos: "Para instalarla: toca el botón Compartir (el cuadrado con una flecha) en Safari y elige “Añadir a pantalla de inicio”."
  },
  // Danish, Icelandic and Catalan cover the destination pages and the sign-in box. The homepage, account and
  // privacy pages are English only, so their keys aren't repeated here (t() falls back to English).
  da: {
    acctSentCode: "Vi har sendt en 6-cifret kode til {email}. Skriv den nedenfor for at logge ind her. (Linket i mailen virker også, men i appen på hjemmeskærmen åbner det din browser i stedet.)", acctCodeLabel: "Kode fra mailen", acctVerify: "Log ind med kode", acctVerifying: "Tjekker…", acctCodeWrong: "Koden virkede ikke. Tjek den, eller bed om en ny.", acctBadCode: "Skriv den 6-cifrede kode fra mailen.",
    notrackOn: "Denne browser tælles ikke længere med i besøgsstatistikken.", notrackOff: "Denne browser tælles med i besøgsstatistikken igen.",
    cookieText: "Må vi bruge cookies fra Google Analytics til at se, hvordan siden bruges? Besøg tælles uden cookies uanset hvad.", cookieAccept: "Accepter", cookieReject: "Afvis", cookieSettings: "Skift cookievalg",
    navCompare: "Sammenlign", navMap: "Kort", navStars: "Efter stjerner", navMethod: "Metode", navContact: "Kontakt", navDestinations: "Destinationer", navGuides: "Guider", navNear: "Nær mig", navPick: "Hjælp mig med at vælge", wishlist: "Ønskeliste",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · Michelinguide-restauranter",
    heroTitle: "Hvad en Michelinstjerne <em>koster</em> {placeIn}.",
    heroText: "Priser pr. person for middag, frokost og vinmenu på stjernerestauranterne {placeIn}, side om side. Søg på navn eller køkken, filtrer efter stjerner eller køkken, og gem dem, du gerne vil prøve, på din ønskeliste.",
    crumbHome: "Alle destinationer", explore: "Udforsk", exploreCities: "Byer i {country}", exploreDistricts: "Rundt om i {country}", alsoIn: "Også i",
    figCount: "Restauranter", figMin: "Billigste middagsmenu", figMax: "Dyreste middagsmenu", figMinLunch: "Billigste frokostmenu", figMaxLunch: "Dyreste frokostmenu",
    fMeal: "Måltid", mealDinner: "Middag", mealLunch: "Frokost", hNotesLunch: "Om frokosten", noLunch: "Ingen frokost", avgLunch: "gns. frokost", infoLunch: "frokost",
    sortPriceAscLunch: "Frokost: lav til høj", sortPriceDescLunch: "Frokost: høj til lav",
    starCounts: "{3} med tre stjerner · {2} med to · {1} med én",
    compareTitle: "Hvert bord, hver pris",
    compareText: "Skift mellem middag og frokost nedenfor. Priserne gælder smagsmenuen eller den faste menu, medmindre der står “pr. hovedret” eller “typisk forbrug”, og søjlerne sammenligner hver menu med den dyreste på listen. Hver pris linker til, hvor den kommer fra.",
    searchPh: "Søg på restaurant, køkken eller område", searchPhShort: "Restaurant, køkken eller område", searchPhEx: "Søg på restaurant, køkken eller område, fx “{ex}”",
    searchLabel: "Søg efter restauranter på navn, køkken eller område",
    sortLabel: "Sorter restauranter",
    sortPriceAsc: "Middag: lav til høj", sortPriceDesc: "Middag: høj til lav", sortStars: "Flest stjerner først", sortRating: "Google-bedømmelse: højest først", sortName: "Navn A–Å",
    fShow: "Vis", fStars: "Michelinstjerner", fCuisine: "Køkken",
    fDiet: "Kost", dietVegOnly: "Vegetarisk restaurant", dietVegMenu: "Vegetarisk smagsmenu", dietVeg: "Vegetariske muligheder", dietVegan: "Veganske muligheder", dietGf: "Glutenfri muligheder", dietHalal: "Halal", dietKosher: "Kosher",
    badgeVegOnly: "Vegetarisk", badgeVegMenu: "Vegetarmenu", badgeVegan: "Vegansk", chefLabel: "Køkkenchef {name}",
    exploreMore: "{n} mere", exploreFewer: "Vis færre",
    filtersBtn: "Filtre", filtersShowN: "Vis {n} restaurant|Vis {n} restauranter", filtersClear: "Ryd alle", cuisineSearchPh: "Find et køkken", removeFilter: "Fjern filter: {f}", sheetClose: "Luk",
    showAll: "Alle restauranter", showChanges: "Nye stjerneændringer", showWish: "Min ønskeliste",
    showChangesTitle: "Fik eller mistede en stjerne i en af de seneste to Michelinguider",
    all: "Alle", starsAria: "{n} Michelinstjerne|{n} Michelinstjerner",
    hRestaurant: "Restaurant", hCuisine: "Køkken", hStars: "Stjerner", hGoogle: "Google", hNotes: "Om middagen", hPrice: "Pris", hWine: "Vinmenu", hWish: "Ønskeliste",
    tableLabel: "Restaurantpriser",
    reviews: "{n} anmeldelser", ratingAria: "Google-bedømmelse {r} ud af 5",
    srcSite: "Restaurantens hjemmeside", srcPress: "Kilde", srcTitle: "Hvor prisen kommer fra",
    perMain: "pr. hovedret", typicalSpend: "typisk forbrug", notListed: "Ikke oplyst",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · Bord til 1", rcptDinnerOnly: "Kun middag", rcptNoPairing: "ingen vinmenu oplyst", rcptPlusWine: "+ vin {p}", rcptDinnerWine: "Middag + vin", rcptLunchWine: "Frokost + vin", rcptChecked: "Tjekket {d}", rcptIncl: "Pr. person, inkl. service", rcptPlus: "Pr. person, ++ (service og moms oveni)", rcptTaxTip: "Pr. person, før moms og drikkepenge", rcptTip: "Pr. person, før drikkepenge", rcptTax: "Pr. person, inkl. moms",
    findOnMaps: "Find {name} på Google Maps", findOnMapsTitle: "Find på Google Maps",
    showOnly: "Vis kun {cat}",
    chgNew: "Ny", chgTitle: "{note} i Michelinguiden fra {date}",
    emptyWish: "Ingen af dine gemte restauranter ligger {placeIn}. Tryk på hjertet ved en restaurant for at gemme den.",
    emptyPlace: "Der er i øjeblikket ingen restauranter med en Michelinstjerne {placeIn}, men vi opdaterer siden, så snart der kommer en.",
    emptySee: "Se stjernerestauranten i {name}|Se alle {n} stjernerestauranter i {name}", exploreAll: "Alle områder",
    noMatch: "Ingen restauranter passer til filtrene.", clearFilters: "Ryd søgning og filtre",
    formerTitle: "Har ikke længere stjerner",
    formerNote: "Restauranter, der var med i den forrige udgave af listen, men som siden har mistet deres stjerner, er lukket eller har ændret sig. Vises kun til orientering.",
    formerly: "tidligere", stLost: "Mistede stjerne", stClosed: "Lukket", stChanged: "Ændret",
    tapHint: "Tryk på en restaurant for at se alle priser og detaljer.",
    showing: "Viser {a} af {b} stjernerestauranter", showingFormer: " plus {c} uden stjerner",
    wishNote: "Din ønskeliste gemmes kun i denne browser.",
    wishAdd: "Føj {name} til din ønskeliste", wishRemove: "Fjern {name} fra din ønskeliste", wishAddT: "Føj til ønskeliste", wishRemoveT: "Fjern fra ønskeliste",
    toastAdded: "{name} er føjet til din ønskeliste", toastRemoved: "{name} er fjernet fra din ønskeliste", undo: "Fortryd",
    photo: "Foto", tempClosed: "Midlertidigt lukket (Google)",
    mapTitle: "Alle stjernerestauranter på ét kort",
    mapText: "Nålene følger filtrene i listen ovenfor, så vælg et antal stjerner, et køkken eller din ønskeliste, og kortet følger med. Tryk på en nål for at se prisen og få en rutevejledning.",
    mapWait: "Kortet indlæses, når du scroller hertil.", mapLabel: "Kort over restauranter med Michelinstjerner",
    mapError: "Kortet kunne ikke indlæses lige nu. Nålen ved hver restaurant i listen åbner den stadig i Google Maps.",
    legendAria: "Hvad nålenes farver betyder", legendItem: "{n} Michelinstjerne|{n} Michelinstjerner",
    mapShowing: "Viser {n} restaurant på kortet|Viser {n} restauranter på kortet", mapNone: "Ingen restauranter passer til de valgte filtre",
    nearMe: "Nær mig", nearMeAria: "Vis stjernerestauranter nær mig", nearFinding: "Finder dig…", youAreHere: "Du er her",
    nearTitle: "Tættest på dig", nearAway: "{d} væk", nearWorld: "Se stjernerestauranter nær dig på verdenskortet",
    nearNone: "Ingen af restauranterne på denne side ligger tæt på dig. Den nærmeste er {name}, {d} væk.",
    nearDenied: "Adgang til placering er slået fra. Tillad den for denne side i browserens indstillinger, og prøv igen.",
    nearFailed: "Kunne ikke finde din placering lige nu. Prøv igen.", nearUnsupported: "Denne browser kan ikke dele din placering.",
    jumpMap: "Kort", jumpMapAria: "Gå til kortet",
    share: "Del", shareAria: "Del denne side", shareTitle: "Del denne side", shareCopy: "Kopiér link", shareCopied: "Link kopieret", shareEmail: "Mail",
    acctSignIn: "Log ind", acctAccount: "Konto", acctTitle: "Log ind eller opret en gratis konto",
    acctWhy: "Hav din ønskeliste på alle enheder, og sæt flueben ved de restauranter, du har besøgt.",
    acctWhyBeen: "Opret en gratis konto for at sætte flueben ved de restauranter, du har besøgt. Så har du også din ønskeliste på alle enheder.",
    acctGoogle: "Fortsæt med Google", acctOr: "eller", acctEmailLabel: "Mailadresse", acctSend: "Send mig en loginkode", acctSending: "Sender…",
    acctSent: "Tjek din mail. Vi har sendt et loginlink til {email}. Åbn det på denne enhed for at logge ind.",
    acctTooMany: "For mange loginmails lige nu. Vent et minut, og prøv igen.", acctFailed: "Det lykkedes ikke. Tjek mailadressen, og prøv igen.",
    acctBadEmail: "Skriv en hel mailadresse, fx navn@example.com.", acctSmall: "Gratis og uden adgangskode. Vi bruger kun din mail til at logge dig ind.",
    acctPrivacy: "Privatlivspolitik", acctClose: "Luk", acctWelcome: "Du er logget ind. Din ønskeliste følger nu med på alle enheder.",
    acctLinkExpired: "Loginlinket er udløbet eller allerede brugt. Tryk på Log ind for at få et nyt.",
    been: "Har været der", beenAdd: "Markér {name} som besøgt", beenRemove: "Fjern {name} fra besøgte", beenAddT: "Markér som besøgt", beenRemoveT: "Fjern fra besøgte",
    toastBeen: "{name} er markeret som besøgt", toastNotBeen: "{name} er fjernet fra besøgte", showBeen: "Har været der",
    beenProgress: "Du har besøgt {n} af de {total} her.", wishNoteOut: "Din ønskeliste gemmes kun på denne enhed.", wishNoteSignIn: "Log ind for at have den på alle enheder", wishCompare: "Sammenlign dine gemte restauranter side om side",
    wishNoteIn: "Din ønskeliste og dine besøgte restauranter er gemt på din konto.", wishSynced: "Gemt på din konto.", acctSee: "Se din konto",
    shareInsta: "Til Instagram: kopiér linket, og indsæt det i en story eller besked.",
    shareMore: "Instagram, Beskeder og mere",
    shareTextPlace: "Hvad en Michelinstjerne koster {placeIn}: priser på middag, frokost og vinmenu side om side.",
    infoDinner: "middag", infoWine: "vin", infoGoogle: "på Google", infoOpen: "Åbn i Google Maps", infoNoPrice: "Pris ikke oplyst",
    starsTitle: "Hvad hver ekstra stjerne koster",
    starsText: "Gennemsnitlig menupris for det valgte måltid, opdelt efter Michelinstjerner. À la carte-restauranter tælles med, men indgår ikke i gennemsnit og prisspænd.",
    tierNames: ["Én stjerne", "To stjerner", "Tre stjerner"], avgDinner: "gns. middag", tRestaurants: "Restauranter", tRange: "Spænd", tRating: "Gns. Google-bedømmelse",
    tVs: "mod {n} stjerne|mod {n} stjerner", tNoPrices: "Ingen menupriser for disse restauranter.", tNone: "Ingen restauranter med {tier}.",
    methodTitle: "Sådan tæller vi priserne",
    m1Title: "Pr. person, før service",
    m1Text: "Alle beløb er for én gæst og uden servicegebyr, som varierer fra land til land. Tillæg som kaviar eller trøffel er ikke medregnet. Priser i en anden valuta bruger dagens kurs og er omtrentlige.",
    m2Title: "Hvor priserne kommer fra",
    m2Text: "Middag er den vigtigste smagsmenu, hvis der er en, og vin er den billigste vinmenu til den. Vi tager priserne fra restaurantens egen hjemmeside, hvis de står der, og ellers fra nye anmeldelser og bookingsider. Frokost er restaurantens frokostmenu, og noten fortæller, hvilke dage den serveres.",
    m3Title: "Stjerner og Google-bedømmelse",
    m3Text: "Google-bedømmelsen ud af 5 og antallet af anmeldelser er tjekket i oktober 2026. Stjernerne kommer fra den seneste Michelinguide for hvert land. En grøn ▲ markerer en restaurant, der fik en stjerne i en af de seneste to guider; en rød ▼ en, der mistede sin stjerne.",
    contactTitle: "Har du set en prisændring?",
    contactText: "Menuer får ofte nye priser. Fortæl os om en opdatering, en restaurant, vi mangler, eller en by, vi bør dække.",
    cName: "Navn", cEmail: "Mail", cTopic: "Emne", cTopicPrice: "Prisopdatering", cTopicSuggest: "Foreslå en restaurant", cTopicCity: "Dæk en anden by", cTopicOther: "Noget andet",
    cMsg: "Besked", cMsgPh: "Fortæl os restauranten, den nye pris, og hvor du så den.",
    cSend: "Send besked", errName: "Skriv dit navn.", errEmail: "Skriv en mailadresse som navn@example.com.", errMsg: "Skriv en kort besked.",
    sent: "Tak, {name}. Dit mailprogram burde åbne med din besked: tryk bare på Send. Hvis det ikke sker, så skriv til hello@starredbill.com.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Priser og bedømmelser er tjekket i oktober 2026. Tjek med restauranten, før du bestiller bord.",
    rateLine: "Priser i {sym} er omtrentlige og bruger kursen den {date}: {sym}1 = {home}{rate}.",
    rateLineMixed: "Priserne er omregnet til {sym} med kursen den {date} og er derfor omtrentlige.",
    currencyAria: "Vis priser i", crumbsAria: "Hvor du er", menuOpen: "Menu",
    installApp: "Installer app",
    installTipIos: "Sådan installerer du: tryk på Del-knappen (firkanten med en pil) i Safari, og vælg “Føj til hjemmeskærm”."
  },
  sv: {
    acctSentCode: "Vi har skickat en sexsiffrig kod till {email}. Skriv in den nedan för att logga in här. (Länken i mejlet fungerar också, men i appen på hemskärmen öppnar den webbläsaren i stället.)", acctCodeLabel: "Kod från mejlet", acctVerify: "Logga in med kod", acctVerifying: "Kontrollerar…", acctCodeWrong: "Koden fungerade inte. Kontrollera den eller be om en ny.", acctBadCode: "Skriv in den sexsiffriga koden från mejlet.",
    notrackOn: "Den här webbläsaren räknas inte längre med i besöksstatistiken.", notrackOff: "Den här webbläsaren räknas med i besöksstatistiken igen.",
    cookieText: "Får vi använda cookies från Google Analytics för att se hur sidan används? Besök räknas utan cookies oavsett.", cookieAccept: "Godkänn", cookieReject: "Avvisa", cookieSettings: "Ändra cookieval",
    navCompare: "Jämför", navMap: "Karta", navStars: "Efter stjärnor", navMethod: "Metod", navContact: "Kontakt", navDestinations: "Destinationer", navGuides: "Guider", navNear: "Nära mig", navPick: "Hjälp mig välja", wishlist: "Önskelista",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · Restauranger i Michelinguiden",
    heroTitle: "Vad en Michelinstjärna <em>kostar</em> {placeIn}.",
    heroText: "Priser per person för middag, lunch och vinpaket på stjärnkrogarna {placeIn}, sida vid sida. Sök på namn eller kök, filtrera på stjärnor eller kök och spara dem du vill prova på din önskelista.",
    crumbHome: "Alla destinationer", explore: "Utforska", exploreCities: "Städer i {country}", exploreDistricts: "Runt om i {country}", alsoIn: "Även i",
    figCount: "Restauranger", figMin: "Billigaste middagsmeny", figMax: "Dyraste middagsmeny", figMinLunch: "Billigaste lunchmeny", figMaxLunch: "Dyraste lunchmeny",
    fMeal: "Måltid", mealDinner: "Middag", mealLunch: "Lunch", hNotesLunch: "Om lunchen", noLunch: "Ingen lunch", avgLunch: "snitt lunch", infoLunch: "lunch",
    sortPriceAscLunch: "Lunch: lägst först", sortPriceDescLunch: "Lunch: högst först",
    starCounts: "{3} med tre stjärnor · {2} med två · {1} med en",
    compareTitle: "Varje bord, varje pris",
    compareText: "Växla mellan middag och lunch nedan. Priserna gäller avsmakningsmenyn eller den fasta menyn, om det inte står ”per huvudrätt” eller ”typisk nota”, och staplarna jämför varje meny med den dyraste på listan. Varje pris länkar till var det kommer ifrån.",
    searchPh: "Sök på restaurang, kök eller område", searchPhShort: "Restaurang, kök eller område", searchPhEx: "Sök på restaurang, kök eller område, t.ex. ”{ex}”",
    searchLabel: "Sök restauranger på namn, kök eller område",
    sortLabel: "Sortera restauranger",
    sortPriceAsc: "Middag: lägst först", sortPriceDesc: "Middag: högst först", sortStars: "Flest stjärnor först", sortRating: "Google-betyg: högst först", sortName: "Namn A–Ö",
    fShow: "Visa", fStars: "Michelinstjärnor", fCuisine: "Kök",
    fDiet: "Kost", dietVegOnly: "Vegetarisk restaurang", dietVegMenu: "Vegetarisk avsmakningsmeny", dietVeg: "Vegetariska alternativ", dietVegan: "Veganska alternativ", dietGf: "Glutenfria alternativ", dietHalal: "Halal", dietKosher: "Kosher",
    badgeVegOnly: "Vegetarisk", badgeVegMenu: "Vegomeny", badgeVegan: "Vegansk", chefLabel: "Kökschef {name}",
    exploreMore: "{n} till", exploreFewer: "Visa färre",
    filtersBtn: "Filter", filtersShowN: "Visa {n} restaurang|Visa {n} restauranger", filtersClear: "Rensa alla", cuisineSearchPh: "Hitta ett kök", removeFilter: "Ta bort filter: {f}", sheetClose: "Stäng",
    showAll: "Alla restauranger", showChanges: "Nya stjärnändringar", showWish: "Min önskelista",
    showChangesTitle: "Fick eller förlorade en stjärna i någon av de två senaste Michelinguiderna",
    all: "Alla", starsAria: "{n} Michelinstjärna|{n} Michelinstjärnor",
    hRestaurant: "Restaurang", hCuisine: "Kök", hStars: "Stjärnor", hGoogle: "Google", hNotes: "Om middagen", hPrice: "Pris", hWine: "Vinpaket", hWish: "Önskelista",
    tableLabel: "Restaurangpriser",
    reviews: "{n} recensioner", ratingAria: "Google-betyg {r} av 5",
    srcSite: "Restaurangens webbplats", srcPress: "Källa", srcTitle: "Var priset kommer ifrån",
    perMain: "per huvudrätt", typicalSpend: "typisk nota", notListed: "Inte angivet",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · Bord för 1", rcptDinnerOnly: "Endast middag", rcptNoPairing: "inget vinpaket angivet", rcptPlusWine: "+ vin {p}", rcptDinnerWine: "Middag + vin", rcptLunchWine: "Lunch + vin", rcptChecked: "Kontrollerat {d}", rcptIncl: "Per person, service ingår", rcptPlus: "Per person, ++ (service och moms tillkommer)", rcptTaxTip: "Per person, före skatt och dricks", rcptTip: "Per person, före dricks", rcptTax: "Per person, moms ingår",
    findOnMaps: "Hitta {name} på Google Maps", findOnMapsTitle: "Hitta på Google Maps",
    showOnly: "Visa bara {cat}",
    chgNew: "Ny", chgTitle: "{note} i Michelinguiden från {date}",
    emptyWish: "Ingen av dina sparade restauranger ligger {placeIn}. Tryck på hjärtat vid en restaurang för att spara den.",
    emptyPlace: "Det finns just nu ingen restaurang med Michelinstjärna {placeIn}, men vi uppdaterar sidan så snart det kommer en.",
    emptySee: "Se stjärnkrogen i {name}|Se alla {n} stjärnkrogar i {name}", exploreAll: "Alla områden",
    noMatch: "Inga restauranger matchar filtren.", clearFilters: "Rensa sökning och filter",
    formerTitle: "Har inte längre stjärnor",
    formerNote: "Restauranger som fanns med i den förra upplagan av listan men som sedan dess har förlorat sina stjärnor, stängt eller förändrats. Visas bara som referens.",
    formerly: "tidigare", stLost: "Förlorade stjärnan", stClosed: "Stängd", stChanged: "Förändrad",
    tapHint: "Tryck på en restaurang för att se alla priser och detaljer.",
    showing: "Visar {a} av {b} stjärnkrogar", showingFormer: " plus {c} utan stjärnor",
    wishNote: "Din önskelista sparas bara i den här webbläsaren.",
    wishAdd: "Lägg till {name} i din önskelista", wishRemove: "Ta bort {name} från din önskelista", wishAddT: "Lägg till i önskelistan", wishRemoveT: "Ta bort från önskelistan",
    toastAdded: "{name} har lagts till i din önskelista", toastRemoved: "{name} har tagits bort från din önskelista", undo: "Ångra",
    photo: "Foto", tempClosed: "Tillfälligt stängd (Google)",
    mapTitle: "Alla stjärnkrogar på en karta",
    mapText: "Nålarna följer filtren i listan ovan, så välj antal stjärnor, ett kök eller din önskelista så följer kartan med. Tryck på en nål för att se priset och få vägbeskrivning.",
    mapWait: "Kartan laddas när du scrollar hit.", mapLabel: "Karta över restauranger med Michelinstjärnor",
    mapError: "Kartan kunde inte laddas just nu. Nålen vid varje restaurang i listan öppnar den fortfarande i Google Maps.",
    legendAria: "Vad nålarnas färger betyder", legendItem: "{n} Michelinstjärna|{n} Michelinstjärnor",
    mapShowing: "Visar {n} restaurang på kartan|Visar {n} restauranger på kartan", mapNone: "Inga restauranger matchar de valda filtren",
    nearMe: "Nära mig", nearMeAria: "Visa stjärnkrogar nära mig", nearFinding: "Letar efter dig…", youAreHere: "Du är här",
    nearTitle: "Närmast dig", nearAway: "{d} bort", nearWorld: "Se stjärnkrogar nära dig på världskartan",
    nearNone: "Ingen av restaurangerna på den här sidan ligger nära dig. Den närmaste är {name}, {d} bort.",
    nearDenied: "Platsåtkomst är avstängd. Tillåt den för den här sidan i webbläsarens inställningar och försök igen.",
    nearFailed: "Kunde inte hitta din plats just nu. Försök igen.", nearUnsupported: "Den här webbläsaren kan inte dela din plats.",
    jumpMap: "Karta", jumpMapAria: "Gå till kartan",
    share: "Dela", shareAria: "Dela den här sidan", shareTitle: "Dela den här sidan", shareCopy: "Kopiera länk", shareCopied: "Länken kopierad", shareEmail: "Mejl",
    acctSignIn: "Logga in", acctAccount: "Konto", acctTitle: "Logga in eller skapa ett gratis konto",
    acctWhy: "Ha din önskelista på alla enheter och bocka av restaurangerna du har besökt.",
    acctWhyBeen: "Skapa ett gratis konto för att bocka av restaurangerna du har besökt. Då har du också din önskelista på alla enheter.",
    acctGoogle: "Fortsätt med Google", acctOr: "eller", acctEmailLabel: "Mejladress", acctSend: "Skicka en inloggningskod", acctSending: "Skickar…",
    acctSent: "Kolla din mejl. Vi har skickat en inloggningslänk till {email}. Öppna den på den här enheten för att logga in.",
    acctTooMany: "För många inloggningsmejl just nu. Vänta en minut och försök igen.", acctFailed: "Det gick inte. Kontrollera mejladressen och försök igen.",
    acctBadEmail: "Skriv en hel mejladress, t.ex. namn@example.com.", acctSmall: "Gratis och utan lösenord. Vi använder bara din mejl för att logga in dig.",
    acctPrivacy: "Integritetspolicy", acctClose: "Stäng", acctWelcome: "Du är inloggad. Din önskelista följer nu med på alla enheter.",
    acctLinkExpired: "Inloggningslänken har gått ut eller redan använts. Tryck på Logga in för att få en ny.",
    been: "Har varit där", beenAdd: "Markera {name} som besökt", beenRemove: "Ta bort {name} från besökta", beenAddT: "Markera som besökt", beenRemoveT: "Ta bort från besökta",
    toastBeen: "{name} är markerad som besökt", toastNotBeen: "{name} har tagits bort från besökta", showBeen: "Har varit där",
    beenProgress: "Du har besökt {n} av de {total} här.", wishNoteOut: "Din önskelista sparas bara på den här enheten.", wishNoteSignIn: "Logga in för att ha den på alla enheter", wishCompare: "Jämför dina sparade restauranger sida vid sida",
    wishNoteIn: "Din önskelista och dina besökta restauranger sparas på ditt konto.", wishSynced: "Sparat på ditt konto.", acctSee: "Se ditt konto",
    shareInsta: "Till Instagram: kopiera länken och klistra in den i en story eller ett meddelande.",
    shareMore: "Instagram, Meddelanden med mera",
    shareTextPlace: "Vad en Michelinstjärna kostar {placeIn}: priser för middag, lunch och vinpaket sida vid sida.",
    infoDinner: "middag", infoWine: "vin", infoGoogle: "på Google", infoOpen: "Öppna i Google Maps", infoNoPrice: "Pris inte angivet",
    starsTitle: "Vad varje extra stjärna kostar",
    starsText: "Genomsnittligt menypris för den valda måltiden, uppdelat på Michelinstjärnor. À la carte-restauranger räknas med men ingår inte i snitt och prisspann.",
    tierNames: ["En stjärna", "Två stjärnor", "Tre stjärnor"], avgDinner: "snitt middag", tRestaurants: "Restauranger", tRange: "Spann", tRating: "Snitt Google-betyg",
    tVs: "mot {n} stjärna|mot {n} stjärnor", tNoPrices: "Inga menypriser för de här restaurangerna.", tNone: "Inga restauranger med {tier}.",
    methodTitle: "Så räknar vi priserna",
    m1Title: "Per person, före service",
    m1Text: "Alla belopp gäller en gäst och utan serviceavgift, som varierar mellan länder. Tillägg som kaviar eller tryffel räknas inte med. Priser i en annan valuta använder dagens kurs och är ungefärliga.",
    m2Title: "Var priserna kommer ifrån",
    m2Text: "Middag är den viktigaste avsmakningsmenyn, om det finns en, och vin är det billigaste vinpaketet till den. Vi tar priserna från restaurangens egen webbplats när de finns där, annars från aktuella recensioner och bokningssajter. Lunch är restaurangens lunchmeny, och anteckningen säger vilka dagar den serveras.",
    m3Title: "Stjärnor och Google-betyg",
    m3Text: "Google-betyget av 5 och antalet recensioner är kontrollerade i oktober 2026. Stjärnorna kommer från den senaste Michelinguiden för varje land. En grön ▲ markerar en restaurang som fick en stjärna i någon av de två senaste guiderna; en röd ▼ en som förlorade sin stjärna.",
    contactTitle: "Har du sett en prisändring?",
    contactText: "Menyer får ofta nya priser. Berätta om en uppdatering, en restaurang vi saknar eller en stad vi borde täcka.",
    cName: "Namn", cEmail: "Mejl", cTopic: "Ämne", cTopicPrice: "Prisuppdatering", cTopicSuggest: "Föreslå en restaurang", cTopicCity: "Täck en annan stad", cTopicOther: "Något annat",
    cMsg: "Meddelande", cMsgPh: "Berätta vilken restaurang, det nya priset och var du såg det.",
    cSend: "Skicka meddelande", errName: "Skriv ditt namn.", errEmail: "Skriv en mejladress som namn@example.com.", errMsg: "Skriv ett kort meddelande.",
    sent: "Tack, {name}. Ditt mejlprogram bör öppnas med ditt meddelande: tryck bara på Skicka. Om det inte händer, skriv till hello@starredbill.com.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Priser och betyg är kontrollerade i oktober 2026. Kolla med restaurangen innan du bokar.",
    rateLine: "Priser i {sym} är ungefärliga och använder kursen den {date}: {sym}1 = {home}{rate}.",
    rateLineMixed: "Priserna är omräknade till {sym} med kursen den {date} och är därför ungefärliga.",
    currencyAria: "Visa priser i", crumbsAria: "Var du är", menuOpen: "Meny",
    installApp: "Installera appen",
    installTipIos: "Så installerar du: tryck på Dela-knappen (fyrkanten med en pil) i Safari och välj ”Lägg till på hemskärmen”."
  },
  is: {
    acctSentCode: "Við sendum 6 stafa kóða á {email}. Sláðu hann inn hér fyrir neðan til að skrá þig inn hér. (Hlekkurinn í póstinum virkar líka, en í appinu á heimaskjánum opnar hann vafrann í staðinn.)", acctCodeLabel: "Kóði úr póstinum", acctVerify: "Skrá inn með kóða", acctVerifying: "Athuga…", acctCodeWrong: "Kóðinn virkaði ekki. Athugaðu hann eða biddu um nýjan.", acctBadCode: "Sláðu inn 6 stafa kóðann úr póstinum.",
    notrackOn: "Þessi vafri er ekki lengur talinn með í heimsóknatölum.", notrackOff: "Þessi vafri er aftur talinn með í heimsóknatölum.",
    cookieText: "Megum við nota vafrakökur frá Google Analytics til að sjá hvernig síðan er notuð? Heimsóknir eru taldar án vafrakaka hvort sem er.", cookieAccept: "Samþykkja", cookieReject: "Hafna", cookieSettings: "Breyta vali á vafrakökum",
    navCompare: "Bera saman", navMap: "Kort", navStars: "Eftir stjörnum", navMethod: "Aðferð", navContact: "Hafa samband", navDestinations: "Áfangastaðir", navGuides: "Leiðarvísar", navNear: "Nálægt mér", navPick: "Hjálpaðu mér að velja", wishlist: "Óskalisti",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · veitingastaðir í Michelin-handbókinni",
    heroTitle: "Hvað Michelin-stjarna <em>kostar</em> {placeIn}.",
    heroText: "Verð á mann fyrir kvöldverð, hádegisverð og vínpörun á stjörnustöðunum {placeIn}, hlið við hlið. Leitaðu eftir nafni eða matargerð, síaðu eftir stjörnum eða matargerð og vistaðu þá sem þig langar að prófa á óskalistann.",
    crumbHome: "Allir áfangastaðir", explore: "Skoða", exploreCities: "Borgir: {country}", exploreDistricts: "Svæði: {country}", alsoIn: "Einnig í",
    figCount: "Veitingastaðir", figMin: "Ódýrasti kvöldseðill", figMax: "Dýrasti kvöldseðill", figMinLunch: "Ódýrasti hádegisseðill", figMaxLunch: "Dýrasti hádegisseðill",
    fMeal: "Máltíð", mealDinner: "Kvöldverður", mealLunch: "Hádegisverður", hNotesLunch: "Um hádegið", noLunch: "Ekki opið í hádeginu", avgLunch: "meðalhádegi", infoLunch: "hádegi",
    sortPriceAscLunch: "Hádegi: lægst fyrst", sortPriceDescLunch: "Hádegi: hæst fyrst",
    starCounts: "{3} með þrjár stjörnur · {2} með tvær · {1} með eina",
    compareTitle: "Hvert borð, hvert verð",
    compareText: "Skiptu á milli kvöldverðar og hádegisverðar hér fyrir neðan. Verðin eiga við smakkseðil eða fastan seðil nema merkt sé „á aðalrétt“ eða „venjuleg eyðsla“, og súlurnar bera hvern seðil saman við þann dýrasta á listanum. Hvert verð tengist upprunanum.",
    searchPh: "Leita eftir stað, matargerð eða svæði", searchPhShort: "Veitingastaður, matargerð eða svæði", searchPhEx: "Leita eftir stað, matargerð eða svæði, t.d. „{ex}“",
    searchLabel: "Leita að veitingastöðum eftir nafni, matargerð eða svæði",
    sortLabel: "Raða veitingastöðum",
    sortPriceAsc: "Kvöld: lægst fyrst", sortPriceDesc: "Kvöld: hæst fyrst", sortStars: "Flestar stjörnur fyrst", sortRating: "Google-einkunn: hæst fyrst", sortName: "Nafn A–Ö",
    fShow: "Sýna", fStars: "Michelin-stjörnur", fCuisine: "Matargerð",
    fDiet: "Mataræði", dietVegOnly: "Grænmetisstaður", dietVegMenu: "Grænmetisseðill", dietVeg: "Grænmetisréttir í boði", dietVegan: "Vegan réttir í boði", dietGf: "Glútenlausir réttir í boði", dietHalal: "Halal", dietKosher: "Kosher",
    badgeVegOnly: "Grænmeti", badgeVegMenu: "Grænmetisseðill", badgeVegan: "Vegan", chefLabel: "Yfirkokkur {name}",
    exploreMore: "{n} í viðbót", exploreFewer: "Sýna færri",
    filtersBtn: "Síur", filtersShowN: "Sýna {n} stað|Sýna {n} staði", filtersClear: "Hreinsa allt", cuisineSearchPh: "Finna matargerð", removeFilter: "Fjarlægja síu: {f}", sheetClose: "Loka",
    showAll: "Allir staðir", showChanges: "Nýlegar stjörnubreytingar", showWish: "Óskalistinn minn",
    showChangesTitle: "Fékk eða missti stjörnu í annarri af tveimur síðustu Michelin-handbókum",
    all: "Allt", starsAria: "{n} Michelin-stjarna|{n} Michelin-stjörnur",
    hRestaurant: "Staður", hCuisine: "Matargerð", hStars: "Stjörnur", hGoogle: "Google", hNotes: "Um kvöldverðinn", hPrice: "Verð", hWine: "Vínpörun", hWish: "Óskalisti",
    tableLabel: "Verð veitingastaða",
    reviews: "{n} umsagnir", ratingAria: "Google-einkunn {r} af 5",
    srcSite: "Vefsíða staðarins", srcPress: "Heimild", srcTitle: "Hvaðan verðið kemur",
    perMain: "á aðalrétt", typicalSpend: "venjuleg eyðsla", notListed: "Ekki gefið upp",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · Borð fyrir 1", rcptDinnerOnly: "Aðeins kvöldverður", rcptNoPairing: "engin vínpörun skráð", rcptPlusWine: "+ vín {p}", rcptDinnerWine: "Kvöldverður + vín", rcptLunchWine: "Hádegisverður + vín", rcptChecked: "Athugað {d}", rcptIncl: "Á mann, þjónusta innifalin", rcptPlus: "Á mann, ++ (þjónusta og skattur bætast við)", rcptTaxTip: "Á mann, fyrir skatt og þjórfé", rcptTip: "Á mann, fyrir þjórfé", rcptTax: "Á mann, skattur innifalinn",
    findOnMaps: "Finna {name} á Google Maps", findOnMapsTitle: "Finna á Google Maps",
    showOnly: "Sýna aðeins {cat}",
    chgNew: "Nýtt", chgTitle: "{note} í Michelin-handbókinni {date}",
    emptyWish: "Enginn vistaður staður er {placeIn}. Ýttu á hjartað við stað til að vista hann.",
    emptyPlace: "Sem stendur er enginn veitingastaður með Michelin-stjörnu {placeIn}, en við uppfærum síðuna um leið og einn bætist við.",
    emptySee: "Sjá stjörnustaðinn í {name}|Sjá alla {n} stjörnustaðina í {name}", exploreAll: "Öll svæði",
    noMatch: "Enginn staður passar við þessar síur.", clearFilters: "Hreinsa leit og síur",
    formerTitle: "Ekki lengur með stjörnu",
    formerNote: "Staðir sem voru á fyrri útgáfu listans en hafa síðan misst stjörnurnar, lokað eða breyst. Sýndir til upplýsingar.",
    formerly: "áður", stLost: "Missti stjörnu", stClosed: "Lokað", stChanged: "Breytt",
    tapHint: "Ýttu á veitingastað til að sjá öll verð og nánari upplýsingar.",
    showing: "Sýnir {a} af {b} stjörnustöðum", showingFormer: " auk {c} án stjörnu",
    wishNote: "Óskalistinn er aðeins vistaður í þessum vafra.",
    wishAdd: "Bæta {name} á óskalistann", wishRemove: "Fjarlægja {name} af óskalistanum", wishAddT: "Bæta á óskalista", wishRemoveT: "Fjarlægja af óskalista",
    toastAdded: "{name} bætt á óskalistann", toastRemoved: "{name} fjarlægt af óskalistanum", undo: "Afturkalla",
    photo: "Mynd", tempClosed: "Lokað tímabundið (Google)",
    mapTitle: "Allir stjörnustaðir á einu korti",
    mapText: "Nálarnar fylgja síunum í listanum hér fyrir ofan, svo veldu stjörnufjölda, matargerð eða óskalistann og kortið breytist í samræmi. Ýttu á nál til að sjá verðið og fá leiðarlýsingu.",
    mapWait: "Kortið hleðst þegar þú flettir hingað.", mapLabel: "Kort af veitingastöðum með Michelin-stjörnu",
    mapError: "Ekki tókst að hlaða kortinu. Nálin við hvern stað í listanum opnar hann samt í Google Maps.",
    legendAria: "Hvað litir nálanna þýða", legendItem: "{n} Michelin-stjarna|{n} Michelin-stjörnur",
    mapShowing: "Sýnir {n} stað á kortinu|Sýnir {n} staði á kortinu", mapNone: "Enginn staður passar við valdar síur",
    nearMe: "Nálægt mér", nearMeAria: "Sýna stjörnustaði nálægt mér", nearFinding: "Finn þig…", youAreHere: "Þú ert hér",
    nearTitle: "Næst þér", nearAway: "{d} í burtu", nearWorld: "Sjá stjörnustaði nálægt þér á heimskortinu",
    nearNone: "Enginn staður á þessari síðu er nálægt þér. Næstur er {name}, {d} í burtu.",
    nearDenied: "Aðgangur að staðsetningu er óvirkur. Leyfðu hann fyrir þessa síðu í stillingum vafrans og reyndu aftur.",
    nearFailed: "Ekki tókst að finna staðsetninguna þína. Reyndu aftur.", nearUnsupported: "Þessi vafri getur ekki deilt staðsetningu.",
    jumpMap: "Kort", jumpMapAria: "Fara á kortið",
    share: "Deila", shareAria: "Deila þessari síðu", shareTitle: "Deila þessari síðu", shareCopy: "Afrita hlekk", shareCopied: "Hlekkur afritaður", shareEmail: "Tölvupóstur",
    acctSignIn: "Skrá inn", acctAccount: "Aðgangur", acctTitle: "Skráðu þig inn eða stofnaðu ókeypis aðgang",
    acctWhy: "Hafðu óskalistann í öllum tækjum og merktu við staðina sem þú hefur heimsótt.",
    acctWhyBeen: "Stofnaðu ókeypis aðgang til að merkja við staðina sem þú hefur heimsótt. Þá fylgir óskalistinn þér líka í öll tæki.",
    acctGoogle: "Halda áfram með Google", acctOr: "eða", acctEmailLabel: "Netfang", acctSend: "Senda mér innskráningarkóða", acctSending: "Sendi…",
    acctSent: "Athugaðu póstinn. Við sendum innskráningarhlekk á {email}. Opnaðu hann í þessu tæki til að ljúka innskráningu.",
    acctTooMany: "Of margir innskráningarpóstar í bili. Bíddu í mínútu og reyndu aftur.", acctFailed: "Þetta tókst ekki. Athugaðu netfangið og reyndu aftur.",
    acctBadEmail: "Sláðu inn fullt netfang, t.d. nafn@example.com.", acctSmall: "Ókeypis og ekkert lykilorð. Við notum netfangið aðeins til að skrá þig inn.",
    acctPrivacy: "Persónuvernd", acctClose: "Loka", acctWelcome: "Þú ert skráð(ur) inn. Óskalistinn fylgir þér nú í öll tæki.",
    acctLinkExpired: "Innskráningarhlekkurinn er útrunninn eða hefur þegar verið notaður. Ýttu á Skrá inn til að fá nýjan.",
    been: "Hef komið", beenAdd: "Merkja {name} sem heimsóttan", beenRemove: "Taka {name} af heimsóttum", beenAddT: "Merkja sem heimsóttan", beenRemoveT: "Taka af heimsóttum",
    toastBeen: "{name} merktur sem heimsóttur", toastNotBeen: "{name} tekinn af heimsóttum", showBeen: "Hef komið",
    beenProgress: "Þú hefur heimsótt {n} af {total} hér.", wishNoteOut: "Óskalistinn er aðeins vistaður í þessu tæki.", wishNoteSignIn: "Skráðu þig inn til að hafa hann í öllum tækjum", wishCompare: "Berðu vistuðu veitingastaðina saman hlið við hlið",
    wishNoteIn: "Óskalistinn og heimsóttu staðirnir eru vistaðir á aðganginum þínum.", wishSynced: "Vistað á aðganginum þínum.", acctSee: "Sjá aðganginn",
    shareInsta: "Fyrir Instagram: afritaðu hlekkinn og límdu hann í sögu eða skilaboð.",
    shareMore: "Instagram, Skilaboð og fleira",
    shareTextPlace: "Hvað Michelin-stjarna kostar {placeIn}: verð á kvöldverði, hádegisverði og vínpörun hlið við hlið.",
    infoDinner: "kvöldverður", infoWine: "vín", infoGoogle: "á Google", infoOpen: "Opna í Google Maps", infoNoPrice: "Verð ekki gefið upp",
    starsTitle: "Hvað hver aukastjarna bætir við",
    starsText: "Meðalverð seðils fyrir máltíðina sem er valin hér fyrir ofan, flokkað eftir Michelin-stjörnum. Staðir með à la carte eru taldir með en eru ekki í meðaltölum og verðbilum.",
    tierNames: ["Ein stjarna", "Tvær stjörnur", "Þrjár stjörnur"], avgDinner: "meðalkvöldverður", tRestaurants: "Staðir", tRange: "Bil", tRating: "Meðaleinkunn á Google",
    tVs: "miðað við {n} stjörnu|miðað við {n} stjörnur", tNoPrices: "Engin seðlaverð fyrir þessa staði.", tNone: "Enginn staður með {tier}.",
    methodTitle: "Hvernig verðin eru talin",
    m1Title: "Á mann, fyrir þjónustugjald",
    m1Text: "Allar tölur eru fyrir einn gest og án þjónustugjalds, sem er mismunandi eftir löndum. Viðbætur eins og kavíar eða trufflur eru ekki taldar með. Verð í annarri mynt miðast við gengi dagsins og eru áætluð.",
    m2Title: "Hvaðan verðin koma",
    m2Text: "Kvöldverður er helsti smakkseðillinn ef hann er til, og vín er ódýrasta vínpörunin með honum. Við tökum verð af vefsíðu staðarins ef þau eru birt þar, annars úr nýlegum umsögnum og bókunarsíðum. Hádegisverður er hádegisseðill staðarins og athugasemdin segir hvaða daga hann er í boði.",
    m3Title: "Stjörnur og Google-einkunn",
    m3Text: "Google-einkunnin af 5 og fjöldi umsagna voru athuguð í október 2026. Stjörnurnar eru úr nýjustu Michelin-handbók hvers lands. Grænn ▲ merkir stað sem fékk stjörnu í annarri af tveimur síðustu handbókum; rauður ▼ stað sem missti stjörnuna.",
    contactTitle: "Sástu verðbreytingu?",
    contactText: "Seðlar fá oft ný verð. Láttu okkur vita af uppfærslu, stað sem vantar eða borg sem við ættum að bæta við.",
    cName: "Nafn", cEmail: "Netfang", cTopic: "Efni", cTopicPrice: "Verðuppfærsla", cTopicSuggest: "Stinga upp á stað", cTopicCity: "Bæta við borg", cTopicOther: "Annað",
    cMsg: "Skilaboð", cMsgPh: "Segðu okkur hvaða staður, nýja verðið og hvar þú sást það.",
    cSend: "Senda skilaboð", errName: "Sláðu inn nafnið þitt.", errEmail: "Sláðu inn netfang eins og nafn@example.com.", errMsg: "Skrifaðu stutt skilaboð.",
    sent: "Takk, {name}. Póstforritið þitt ætti að opnast með skilaboðunum þínum: ýttu bara á Senda. Ef það gerist ekki, skrifaðu á hello@starredbill.com.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Verð og einkunnir athuguð í október 2026. Hafðu samband við staðinn áður en þú bókar.",
    rateLine: "Verð í {sym} eru áætluð miðað við gengi {date}: {sym}1 = {home}{rate}.",
    rateLineMixed: "Verð eru umreiknuð í {sym} miðað við gengi {date} og eru því áætluð.",
    currencyAria: "Sýna verð í", crumbsAria: "Hvar þú ert", menuOpen: "Valmynd",
    installApp: "Setja upp app",
    installTipIos: "Til að setja upp: ýttu á Deila-hnappinn (ferningurinn með örinni) í Safari og veldu „Bæta á heimaskjá“."
  },
  ca: {
    acctSentCode: "T'hem enviat un codi de 6 xifres a {email}. Escriu-lo a sota per iniciar la sessió aquí. (L'enllaç del correu també funciona, però a l'app de la pantalla d'inici obre el navegador.)", acctCodeLabel: "Codi del correu", acctVerify: "Entra amb el codi", acctVerifying: "Comprovant…", acctCodeWrong: "Aquest codi no ha funcionat. Revisa'l o demana'n un de nou.", acctBadCode: "Escriu el codi de 6 xifres del correu.",
    notrackOn: "Aquest navegador ja no es compta a les estadístiques de visites.", notrackOff: "Aquest navegador torna a comptar a les estadístiques de visites.",
    cookieText: "Podem fer servir galetes de Google Analytics per veure com s'utilitza el web? Les visites es compten sense galetes igualment.", cookieAccept: "Accepta", cookieReject: "Rebutja", cookieSettings: "Canvia l'elecció de galetes",
    navCompare: "Compara", navMap: "Mapa", navStars: "Per estrelles", navMethod: "Mètode", navContact: "Contacte", navDestinations: "Destinacions", navGuides: "Guies", navNear: "A prop meu", navPick: "Ajuda'm a triar", wishlist: "Preferits",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · Restaurants de la Guia Michelin",
    heroTitle: "Quant <em>costa</em> una estrella Michelin {placeIn}?",
    heroText: "Preus per persona del sopar, el dinar i el maridatge als restaurants amb estrella {placeIn}, l'un al costat de l'altre. Cerca per nom o cuina, filtra per estrelles o cuina i desa als preferits els que vulguis provar.",
    crumbHome: "Totes les destinacions", explore: "Explora", exploreCities: "Ciutats – {country}", exploreDistricts: "Zones – {country}", alsoIn: "També a",
    figCount: "Restaurants", figMin: "Menú de sopar més barat", figMax: "Menú de sopar més car", figMinLunch: "Menú de dinar més barat", figMaxLunch: "Menú de dinar més car",
    fMeal: "Àpat", mealDinner: "Sopar", mealLunch: "Dinar", hNotesLunch: "Notes del dinar", noLunch: "No obre a migdia", avgLunch: "dinar mitjà", infoLunch: "dinar",
    sortPriceAscLunch: "Dinar: de menys a més", sortPriceDescLunch: "Dinar: de més a menys",
    starCounts: "{3} amb tres estrelles · {2} amb dues · {1} amb una",
    compareTitle: "Cada taula, cada preu",
    compareText: "Canvia entre sopar i dinar a sota. Els preus són del menú degustació o del menú fix, tret que hi posi “per plat principal” o “despesa habitual”, i les barres comparen cada menú amb el més car de la llista. Cada preu enllaça a la seva font.",
    searchPh: "Cerca per restaurant, cuina o zona", searchPhShort: "Restaurant, cuina o zona", searchPhEx: "Cerca per restaurant, cuina o zona, p. ex. “{ex}”",
    searchLabel: "Cerca restaurants per nom, cuina o zona",
    sortLabel: "Ordena els restaurants",
    sortPriceAsc: "Sopar: de menys a més", sortPriceDesc: "Sopar: de més a menys", sortStars: "Més estrelles primer", sortRating: "Nota de Google: la més alta primer", sortName: "Nom A–Z",
    fShow: "Mostra", fStars: "Estrelles Michelin", fCuisine: "Cuina",
    fDiet: "Dieta", dietVegOnly: "Restaurant vegetarià", dietVegMenu: "Menú degustació vegetarià", dietVeg: "Opcions vegetarianes", dietVegan: "Opcions veganes", dietGf: "Opcions sense gluten", dietHalal: "Halal", dietKosher: "Caixer",
    badgeVegOnly: "Vegetarià", badgeVegMenu: "Menú vegetarià", badgeVegan: "Vegà", chefLabel: "Xef {name}",
    exploreMore: "{n} més", exploreFewer: "Mostra'n menys",
    filtersBtn: "Filtres", filtersShowN: "Mostra {n} restaurant|Mostra {n} restaurants", filtersClear: "Esborra-ho tot", cuisineSearchPh: "Cerca una cuina", removeFilter: "Treu el filtre: {f}", sheetClose: "Tanca",
    showAll: "Tots els restaurants", showChanges: "Canvis recents d'estrelles", showWish: "Els meus preferits",
    showChangesTitle: "Ha guanyat o perdut una estrella en una de les dues darreres guies Michelin",
    all: "Tots", starsAria: "{n} estrella Michelin|{n} estrelles Michelin",
    hRestaurant: "Restaurant", hCuisine: "Cuina", hStars: "Estrelles", hGoogle: "Google", hNotes: "Notes del sopar", hPrice: "Preu", hWine: "Maridatge", hWish: "Preferits",
    tableLabel: "Preus dels restaurants",
    reviews: "{n} ressenyes", ratingAria: "Nota de Google {r} de 5",
    srcSite: "Web del restaurant", srcPress: "Font", srcTitle: "D'on surt aquest preu",
    perMain: "per plat principal", typicalSpend: "despesa habitual", notListed: "No publicat",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · Taula per a 1", rcptDinnerOnly: "Només sopars", rcptNoPairing: "sense maridatge publicat", rcptPlusWine: "+ maridatge {p}", rcptDinnerWine: "Sopar + maridatge", rcptLunchWine: "Dinar + maridatge", rcptChecked: "Revisat: {d}", rcptIncl: "Per persona, servei inclòs", rcptPlus: "Per persona, ++ (servei i impostos a part)", rcptTaxTip: "Per persona, sense impostos ni propina", rcptTip: "Per persona, sense propina", rcptTax: "Per persona, impostos inclosos",
    findOnMaps: "Troba {name} a Google Maps", findOnMapsTitle: "Troba-ho a Google Maps",
    showOnly: "Mostra només {cat}",
    chgNew: "Nou", chgTitle: "{note} a la Guia Michelin de {date}",
    emptyWish: "Cap dels teus preferits és {placeIn}. Toca el cor d'un restaurant per desar-lo.",
    emptyPlace: "Ara mateix no hi ha cap restaurant amb estrella Michelin {placeIn}, però actualitzarem la pàgina tan aviat com n'hi hagi un.",
    emptySee: "Mostra el restaurant amb estrella de {name}|Mostra els {n} restaurants amb estrella de {name}", exploreAll: "Totes les zones",
    noMatch: "Cap restaurant no coincideix amb aquests filtres.", clearFilters: "Esborra la cerca i els filtres",
    formerTitle: "Ja sense estrella",
    formerNote: "Restaurants que eren a l'edició anterior d'aquesta llista però que des de llavors han perdut les estrelles, han tancat o han canviat. Es mostren només com a referència.",
    formerly: "abans", stLost: "Ha perdut l'estrella", stClosed: "Tancat", stChanged: "Canviat",
    tapHint: "Toca un restaurant per veure'n tots els preus i detalls.",
    showing: "Es mostren {a} de {b} restaurants amb estrella", showingFormer: ", i {c} que ja no en tenen",
    wishNote: "Els preferits només es desen en aquest navegador.",
    wishAdd: "Afegeix {name} als preferits", wishRemove: "Treu {name} dels preferits", wishAddT: "Afegeix als preferits", wishRemoveT: "Treu dels preferits",
    toastAdded: "{name} s'ha afegit als preferits", toastRemoved: "{name} s'ha tret dels preferits", undo: "Desfés",
    photo: "Foto", tempClosed: "Tancat temporalment (Google)",
    mapTitle: "Totes les taules amb estrella en un sol mapa",
    mapText: "Les agulles segueixen els filtres de la llista de dalt: tria un nombre d'estrelles, una cuina o els preferits i el mapa s'actualitza. Toca una agulla per veure'n el preu i com arribar-hi.",
    mapWait: "El mapa es carrega quan hi arribes.", mapLabel: "Mapa de restaurants amb estrella Michelin",
    mapError: "Ara mateix el mapa no s'ha pogut carregar. L'agulla al costat de cada restaurant de la llista encara l'obre a Google Maps.",
    legendAria: "Què volen dir els colors de les agulles", legendItem: "{n} estrella Michelin|{n} estrelles Michelin",
    mapShowing: "Es mostra {n} restaurant al mapa|Es mostren {n} restaurants al mapa", mapNone: "Cap restaurant no coincideix amb els filtres actuals",
    nearMe: "A prop meu", nearMeAria: "Mostra restaurants amb estrella a prop meu", nearFinding: "Et busquem…", youAreHere: "Ets aquí",
    nearTitle: "Els més propers", nearAway: "a {d}", nearWorld: "Mostra restaurants amb estrella a prop teu al mapa mundial",
    nearNone: "Cap restaurant d'aquesta pàgina és a prop teu. El més proper és {name}, a {d}.",
    nearDenied: "L'accés a la ubicació està desactivat. Permet-lo per a aquest web a la configuració del navegador i torna-ho a provar.",
    nearFailed: "Ara mateix no hem trobat la teva ubicació. Torna-ho a provar.", nearUnsupported: "Aquest navegador no pot compartir la ubicació.",
    jumpMap: "Mapa", jumpMapAria: "Vés al mapa",
    share: "Comparteix", shareAria: "Comparteix aquesta pàgina", shareTitle: "Comparteix aquesta pàgina", shareCopy: "Copia l'enllaç", shareCopied: "Enllaç copiat", shareEmail: "Correu",
    acctSignIn: "Inicia la sessió", acctAccount: "Compte", acctTitle: "Inicia la sessió o crea un compte gratuït",
    acctWhy: "Tingues els preferits a tots els dispositius i marca els restaurants on has estat.",
    acctWhyBeen: "Crea un compte gratuït per marcar els restaurants on has estat. També tindràs els preferits a tots els dispositius.",
    acctGoogle: "Continua amb Google", acctOr: "o", acctEmailLabel: "Adreça electrònica", acctSend: "Envia'm un codi d'accés", acctSending: "Enviant…",
    acctSent: "Mira el correu. Hem enviat un enllaç d'accés a {email}. Obre'l en aquest dispositiu per acabar d'iniciar la sessió.",
    acctTooMany: "Massa correus d'accés ara mateix. Espera un minut i torna-ho a provar.", acctFailed: "No ha funcionat. Revisa l'adreça i torna-ho a provar.",
    acctBadEmail: "Escriu una adreça completa, p. ex. nom@example.com.", acctSmall: "Gratuït i sense contrasenya. Només fem servir el correu per iniciar la sessió.",
    acctPrivacy: "Avís de privadesa", acctClose: "Tanca", acctWelcome: "Has iniciat la sessió. Ara els preferits et segueixen a qualsevol dispositiu.",
    acctLinkExpired: "Aquest enllaç d'accés ha caducat o ja s'ha fet servir. Toca Inicia la sessió per obtenir-ne un de nou.",
    been: "Hi he estat", beenAdd: "Marca {name} com a visitat", beenRemove: "Treu {name} dels visitats", beenAddT: "Marca com a visitat", beenRemoveT: "Treu dels visitats",
    toastBeen: "{name} marcat com a visitat", toastNotBeen: "{name} tret dels visitats", showBeen: "Hi he estat",
    beenProgress: "Has estat a {n} dels {total} d'aquí.", wishNoteOut: "Els preferits només es desen en aquest dispositiu.", wishNoteSignIn: "Inicia la sessió per tenir-los a tots els dispositius", wishCompare: "Compara els teus restaurants desats un al costat de l'altre",
    wishNoteIn: "Els preferits i els restaurants visitats es desen al teu compte.", wishSynced: "Desat al teu compte.", acctSee: "Mostra el compte",
    shareInsta: "Per a Instagram, copia l'enllaç i enganxa'l en una història o un missatge.",
    shareMore: "Instagram, Missatges i més",
    shareTextPlace: "Quant costa una estrella Michelin {placeIn}: preus del sopar, el dinar i el maridatge l'un al costat de l'altre.",
    infoDinner: "sopar", infoWine: "vi", infoGoogle: "a Google", infoOpen: "Obre a Google Maps", infoNoPrice: "Preu no publicat",
    starsTitle: "Quant hi afegeix cada estrella",
    starsText: "Preu mitjà del menú per a l'àpat triat a dalt, agrupat per estrelles Michelin. Els restaurants a la carta es compten però no entren a les mitjanes ni als intervals.",
    tierNames: ["Una estrella", "Dues estrelles", "Tres estrelles"], avgDinner: "sopar mitjà", tRestaurants: "Restaurants", tRange: "Interval", tRating: "Nota mitjana de Google",
    tVs: "respecte a {n} estrella|respecte a {n} estrelles", tNoPrices: "No hi ha preus de menú per a aquests restaurants.", tNone: "Cap restaurant amb {tier}.",
    methodTitle: "Com es compten els preus",
    m1Title: "Per persona, sense el servei",
    m1Text: "Cada import és per a un comensal i no inclou el servei, que varia d'un país a l'altre. Els suplements com el caviar o la tòfona no es compten. Els preus en una altra moneda fan servir el canvi del dia i són aproximats.",
    m2Title: "D'on surten els preus",
    m2Text: "El sopar és el menú degustació principal, si n'hi ha, i el vi és el maridatge més barat per a aquest menú. Agafem els preus del web de cada restaurant quan els publica i, si no, de ressenyes recents i webs de reserves. El dinar és el menú de migdia del restaurant, i la nota diu quins dies se serveix.",
    m3Title: "Estrelles i nota de Google",
    m3Text: "La nota de Google sobre 5 i el nombre de ressenyes es van revisar l'octubre de 2026. Les estrelles són de la darrera Guia Michelin de cada país. Un ▲ verd marca un restaurant que ha guanyat una estrella en una de les dues darreres guies; un ▼ vermell, un que l'ha perduda.",
    contactTitle: "Has vist un canvi de preu?",
    contactText: "Els menús canvien de preu sovint. Explica'ns una actualització, un restaurant que ens falta o una ciutat que t'agradaria que afegíssim.",
    cName: "Nom", cEmail: "Correu", cTopic: "Tema", cTopicPrice: "Actualització de preu", cTopicSuggest: "Suggereix un restaurant", cTopicCity: "Afegeix una altra ciutat", cTopicOther: "Una altra cosa",
    cMsg: "Missatge", cMsgPh: "Digues-nos el restaurant, el preu nou i on l'has vist.",
    cSend: "Envia el missatge", errName: "Escriu el teu nom.", errEmail: "Escriu una adreça com nom@example.com.", errMsg: "Escriu un missatge breu.",
    sent: "Gràcies, {name}. El teu programa de correu s'hauria d'obrir amb el missatge: només cal que premis Envia. Si no s'obre, escriu a hello@starredbill.com.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Preus i notes revisats l'octubre de 2026. Confirma-ho amb cada restaurant abans de reservar.",
    rateLine: "Els preus en {sym} són aproximats i fan servir el canvi del {date}: {sym}1 = {home}{rate}.",
    rateLineMixed: "Els preus s'han convertit a {sym} amb el canvi del {date}, així que són aproximats.",
    currencyAria: "Mostra els preus en", crumbsAria: "On ets", menuOpen: "Menú",
    installApp: "Instal·la l'app",
    installTipIos: "Per instal·lar-la: toca el botó Comparteix (el quadrat amb una fletxa) a Safari i tria “Afegeix a la pantalla d'inici”."
  },
  th: {
    acctSentCode: "เราส่งรหัส 6 หลักไปที่ {email} แล้ว พิมพ์รหัสด้านล่างเพื่อเข้าสู่ระบบที่นี่ (ลิงก์ในอีเมลก็ใช้ได้ แต่ในแอปบนหน้าจอโฮมจะเปิดเบราว์เซอร์แทน)", acctCodeLabel: "รหัสจากอีเมล", acctVerify: "เข้าสู่ระบบด้วยรหัส", acctVerifying: "กำลังตรวจสอบ…", acctCodeWrong: "รหัสไม่ถูกต้อง ตรวจสอบอีกครั้งหรือขอรหัสใหม่", acctBadCode: "พิมพ์รหัส 6 หลักจากอีเมล",
    notrackOn: "เบราว์เซอร์นี้จะไม่ถูกนับในสถิติการเข้าชมอีกต่อไป", notrackOff: "เบราว์เซอร์นี้ถูกนับในสถิติการเข้าชมอีกครั้ง",
    cookieText: "เราขอใช้คุกกี้ของ Google Analytics เพื่อดูว่าผู้คนใช้งานเว็บไซต์อย่างไรได้ไหม ไม่ว่าคุณจะเลือกอะไร เราจะนับการเข้าชมโดยไม่ใช้คุกกี้", cookieAccept: "ยอมรับ", cookieReject: "ปฏิเสธ", cookieSettings: "เปลี่ยนการตั้งค่าคุกกี้",
    navCompare: "เปรียบเทียบ", navMap: "แผนที่", navStars: "ตามจำนวนดาว", navMethod: "วิธีคิดราคา", navContact: "ติดต่อ", navDestinations: "จุดหมาย", navGuides: "คู่มือ", navNear: "ใกล้ฉัน", navPick: "ช่วยฉันเลือก", wishlist: "รายการโปรด",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · ร้านอาหารในมิชลิน ไกด์",
    heroTitle: "ดาวมิชลิน{placeIn} <em>ราคา</em>เท่าไร",
    heroText: "ราคาต่อคนของมื้อค่ำ มื้อกลางวัน และไวน์จับคู่ ของร้านอาหารติดดาว{placeIn} เทียบกันแบบเห็นชัด ค้นหาตามชื่อหรือประเภทอาหาร กรองตามจำนวนดาวหรือประเภทอาหาร และบันทึกร้านที่อยากลองไว้ในรายการโปรด",
    crumbHome: "จุดหมายทั้งหมด", explore: "สำรวจ", exploreCities: "เมืองใน{country}", exploreDistricts: "ย่านต่าง ๆ ใน{country}", alsoIn: "อยู่ใน",
    figCount: "จำนวนร้าน", figMin: "เมนูมื้อค่ำที่ถูกที่สุด", figMax: "เมนูมื้อค่ำที่แพงที่สุด", figMinLunch: "เมนูมื้อกลางวันที่ถูกที่สุด", figMaxLunch: "เมนูมื้อกลางวันที่แพงที่สุด",
    fMeal: "มื้อ", mealDinner: "มื้อค่ำ", mealLunch: "มื้อกลางวัน", hNotesLunch: "หมายเหตุมื้อกลางวัน", noLunch: "ไม่เปิดมื้อกลางวัน", avgLunch: "มื้อกลางวันเฉลี่ย", infoLunch: "มื้อกลางวัน",
    sortPriceAscLunch: "มื้อกลางวัน: ถูกไปแพง", sortPriceDescLunch: "มื้อกลางวัน: แพงไปถูก",
    starCounts: "สามดาว {3} ร้าน · สองดาว {2} ร้าน · หนึ่งดาว {1} ร้าน",
    compareTitle: "ทุกโต๊ะ ทุกราคา",
    compareText: "สลับระหว่างมื้อค่ำและมื้อกลางวันได้ด้านล่าง ราคาเป็นของเมนูชิมหรือเซ็ตเมนู เว้นแต่ระบุว่า “ต่อจานหลัก” หรือ “ค่าใช้จ่ายโดยทั่วไป” แถบแสดงการเทียบแต่ละเมนูกับเมนูที่แพงที่สุดในรายการ และทุกราคาลิงก์ไปยังแหล่งที่มา",
    searchPh: "ค้นหาร้าน ประเภทอาหาร หรือย่าน", searchPhShort: "ร้าน ประเภทอาหาร หรือย่าน", searchPhEx: "ค้นหาร้าน ประเภทอาหาร หรือย่าน เช่น “{ex}”",
    searchLabel: "ค้นหาร้านอาหารตามชื่อ ประเภทอาหาร หรือย่าน",
    sortLabel: "เรียงร้านอาหาร",
    sortPriceAsc: "มื้อค่ำ: ถูกไปแพง", sortPriceDesc: "มื้อค่ำ: แพงไปถูก", sortStars: "ดาวมากที่สุดก่อน", sortRating: "คะแนน Google: สูงสุดก่อน", sortName: "ชื่อ A–Z",
    fShow: "แสดง", fStars: "ดาวมิชลิน", fCuisine: "ประเภทอาหาร",
    fDiet: "อาหารเฉพาะ", dietVegOnly: "ร้านอาหารมังสวิรัติ", dietVegMenu: "เมนูชิมมังสวิรัติ", dietVeg: "มีตัวเลือกมังสวิรัติ", dietVegan: "มีตัวเลือกวีแกน", dietGf: "มีตัวเลือกปลอดกลูเตน", dietHalal: "ฮาลาล", dietKosher: "โคเชอร์",
    badgeVegOnly: "มังสวิรัติ", badgeVegMenu: "เมนูมังสวิรัติ", badgeVegan: "วีแกน", chefLabel: "เชฟ {name}",
    exploreMore: "อีก {n} แห่ง", exploreFewer: "แสดงน้อยลง",
    filtersBtn: "ตัวกรอง", filtersShowN: "แสดง {n} ร้าน", filtersClear: "ล้างทั้งหมด", cuisineSearchPh: "ค้นหาประเภทอาหาร", removeFilter: "ลบตัวกรอง: {f}", sheetClose: "ปิด",
    showAll: "ทุกร้าน", showChanges: "ดาวที่เปลี่ยนล่าสุด", showWish: "รายการโปรดของฉัน",
    showChangesTitle: "ได้หรือเสียดาวในมิชลิน ไกด์ สองฉบับล่าสุด",
    all: "ทั้งหมด", starsAria: "มิชลิน {n} ดาว",
    hRestaurant: "ร้านอาหาร", hCuisine: "ประเภทอาหาร", hStars: "ดาว", hGoogle: "Google", hNotes: "หมายเหตุมื้อค่ำ", hPrice: "ราคา", hWine: "ไวน์จับคู่", hWish: "รายการโปรด",
    tableLabel: "ราคาร้านอาหาร",
    reviews: "{n} รีวิว", ratingAria: "คะแนน Google {r} จาก 5",
    srcSite: "เว็บไซต์ร้าน", srcPress: "แหล่งที่มา", srcTitle: "ราคานี้มาจากที่ใด",
    perMain: "ต่อจานหลัก", typicalSpend: "ค่าใช้จ่ายโดยทั่วไป", notListed: "ไม่ได้ระบุ",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · โต๊ะสำหรับ 1 ท่าน", rcptDinnerOnly: "เฉพาะมื้อค่ำ", rcptNoPairing: "ไม่มีไวน์จับคู่", rcptPlusWine: "+ ไวน์ {p}", rcptDinnerWine: "มื้อค่ำ + ไวน์", rcptLunchWine: "มื้อกลางวัน + ไวน์", rcptChecked: "ตรวจสอบ {d}", rcptIncl: "ต่อคน รวมค่าบริการ", rcptPlus: "ต่อคน ++ (บวกค่าบริการและภาษี)", rcptTaxTip: "ต่อคน ไม่รวมภาษีและทิป", rcptTip: "ต่อคน ไม่รวมทิป", rcptTax: "ต่อคน รวมภาษี",
    findOnMaps: "ค้นหา {name} บน Google Maps", findOnMapsTitle: "ค้นหาบน Google Maps",
    showOnly: "แสดงเฉพาะ{cat}",
    chgNew: "ใหม่", chgTitle: "{note} ในมิชลิน ไกด์ {date}",
    emptyWish: "ยังไม่มีร้านในรายการโปรด{placeIn} แตะรูปหัวใจที่ร้านใดก็ได้เพื่อบันทึก",
    emptyPlace: "ขณะนี้ยังไม่มีร้านอาหารที่ได้ดาวมิชลิน{placeIn} เราจะอัปเดตหน้านี้ทันทีที่มี",
    emptySee: "ดูร้านติดดาวใน{name}|ดูร้านติดดาวทั้ง {n} ร้านใน{name}", exploreAll: "ทุกพื้นที่",
    noMatch: "ไม่มีร้านที่ตรงกับตัวกรองเหล่านี้", clearFilters: "ล้างการค้นหาและตัวกรอง",
    formerTitle: "ไม่ได้ติดดาวแล้ว",
    formerNote: "ร้านที่เคยอยู่ในรายการฉบับก่อน แต่หลังจากนั้นเสียดาว ปิดกิจการ หรือมีการเปลี่ยนแปลง แสดงไว้เพื่ออ้างอิงเท่านั้น",
    formerly: "เดิม", stLost: "เสียดาว", stClosed: "ปิดแล้ว", stChanged: "เปลี่ยนแปลง",
    tapHint: "แตะที่ร้านอาหารเพื่อดูราคาและรายละเอียดทั้งหมด",
    showing: "แสดง {a} จาก {b} ร้านติดดาว", showingFormer: " และอีก {c} ร้านที่ไม่ได้ติดดาวแล้ว",
    wishNote: "รายการโปรดของคุณบันทึกไว้ในเบราว์เซอร์นี้เท่านั้น",
    wishAdd: "เพิ่ม {name} ในรายการโปรด", wishRemove: "นำ {name} ออกจากรายการโปรด", wishAddT: "เพิ่มในรายการโปรด", wishRemoveT: "นำออกจากรายการโปรด",
    toastAdded: "เพิ่ม {name} ในรายการโปรดแล้ว", toastRemoved: "นำ {name} ออกจากรายการโปรดแล้ว", undo: "เลิกทำ",
    photo: "รูปภาพ", tempClosed: "ปิดชั่วคราว (Google)",
    mapTitle: "ร้านติดดาวทุกร้านบนแผนที่เดียว",
    mapText: "หมุดบนแผนที่เปลี่ยนตามตัวกรองในรายการด้านบน เลือกจำนวนดาว ประเภทอาหาร หรือรายการโปรด แล้วแผนที่จะเปลี่ยนตาม แตะหมุดเพื่อดูราคาและเส้นทาง",
    mapWait: "แผนที่จะโหลดเมื่อเลื่อนมาถึงตรงนี้", mapLabel: "แผนที่ร้านอาหารที่ได้ดาวมิชลิน",
    mapError: "โหลดแผนที่ไม่ได้ในขณะนี้ หมุดข้างร้านแต่ละร้านในรายการยังเปิดใน Google Maps ได้",
    legendAria: "ความหมายของสีหมุด", legendItem: "มิชลิน {n} ดาว",
    mapShowing: "แสดง {n} ร้านบนแผนที่", mapNone: "ไม่มีร้านที่ตรงกับตัวกรองปัจจุบัน",
    nearMe: "ใกล้ฉัน", nearMeAria: "แสดงร้านติดดาวใกล้ตำแหน่งของฉัน", nearFinding: "กำลังหาตำแหน่งของคุณ…", youAreHere: "คุณอยู่ที่นี่",
    nearTitle: "ใกล้คุณที่สุด", nearAway: "ห่างไป {d}", nearWorld: "ดูร้านติดดาวใกล้คุณบนแผนที่โลก",
    nearNone: "ไม่มีร้านในหน้านี้ที่อยู่ใกล้คุณ ร้านที่ใกล้ที่สุดคือ {name} ห่างไป {d}",
    nearDenied: "การเข้าถึงตำแหน่งถูกปิดอยู่ อนุญาตให้เว็บไซต์นี้ในการตั้งค่าเบราว์เซอร์ แล้วลองอีกครั้ง",
    nearFailed: "หาตำแหน่งของคุณไม่ได้ในขณะนี้ โปรดลองอีกครั้ง", nearUnsupported: "เบราว์เซอร์นี้แชร์ตำแหน่งไม่ได้",
    jumpMap: "แผนที่", jumpMapAria: "ไปที่แผนที่",
    share: "แชร์", shareAria: "แชร์หน้านี้", shareTitle: "แชร์หน้านี้", shareCopy: "คัดลอกลิงก์", shareCopied: "คัดลอกลิงก์แล้ว", shareEmail: "อีเมล",
    acctSignIn: "เข้าสู่ระบบ", acctAccount: "บัญชี", acctTitle: "เข้าสู่ระบบหรือสร้างบัญชีฟรี",
    acctWhy: "ใช้รายการโปรดได้ทุกอุปกรณ์ และติ๊กร้านที่คุณเคยไปแล้ว",
    acctWhyBeen: "สร้างบัญชีฟรีเพื่อติ๊กร้านที่คุณเคยไปแล้ว และใช้รายการโปรดได้ทุกอุปกรณ์",
    acctGoogle: "ดำเนินการต่อด้วย Google", acctOr: "หรือ", acctEmailLabel: "อีเมล", acctSend: "ส่งรหัสเข้าสู่ระบบทางอีเมล", acctSending: "กำลังส่ง…",
    acctSent: "ตรวจสอบอีเมลของคุณ เราส่งลิงก์เข้าสู่ระบบไปที่ {email} แล้ว เปิดลิงก์บนอุปกรณ์นี้เพื่อเข้าสู่ระบบ",
    acctTooMany: "ขออีเมลเข้าสู่ระบบบ่อยเกินไป รอสักครู่แล้วลองอีกครั้ง", acctFailed: "ไม่สำเร็จ ตรวจสอบอีเมลแล้วลองอีกครั้ง",
    acctBadEmail: "พิมพ์อีเมลให้ครบ เช่น name@example.com", acctSmall: "ฟรีและไม่ต้องจำรหัสผ่าน เราใช้อีเมลของคุณเพื่อเข้าสู่ระบบเท่านั้น",
    acctPrivacy: "นโยบายความเป็นส่วนตัว", acctClose: "ปิด", acctWelcome: "เข้าสู่ระบบแล้ว รายการโปรดของคุณใช้ได้ทุกอุปกรณ์แล้ว",
    acctLinkExpired: "ลิงก์เข้าสู่ระบบหมดอายุหรือถูกใช้ไปแล้ว แตะเข้าสู่ระบบเพื่อรับลิงก์ใหม่",
    been: "เคยไปแล้ว", beenAdd: "ทำเครื่องหมายว่าเคยไป {name}", beenRemove: "ลบ {name} ออกจากร้านที่เคยไป", beenAddT: "ทำเครื่องหมายว่าเคยไป", beenRemoveT: "ลบออกจากร้านที่เคยไป",
    toastBeen: "ทำเครื่องหมายว่าเคยไป {name} แล้ว", toastNotBeen: "ลบ {name} ออกจากร้านที่เคยไปแล้ว", showBeen: "เคยไปแล้ว",
    beenProgress: "คุณเคยไปแล้ว {n} จาก {total} ร้านที่นี่", wishNoteOut: "รายการโปรดบันทึกไว้ในอุปกรณ์นี้เท่านั้น", wishNoteSignIn: "เข้าสู่ระบบเพื่อใช้ได้ทุกอุปกรณ์", wishCompare: "เปรียบเทียบร้านที่บันทึกไว้แบบเคียงข้างกัน",
    wishNoteIn: "รายการโปรดและร้านที่เคยไปบันทึกไว้ในบัญชีของคุณ", wishSynced: "บันทึกในบัญชีของคุณแล้ว", acctSee: "ดูบัญชีของคุณ",
    shareInsta: "สำหรับ Instagram ให้คัดลอกลิงก์แล้ววางในสตอรี่หรือข้อความ",
    shareMore: "Instagram ข้อความ และอื่น ๆ",
    shareTextPlace: "ดาวมิชลิน{placeIn}ราคาเท่าไร: ราคามื้อค่ำ มื้อกลางวัน และไวน์จับคู่ เทียบกันแบบเห็นชัด",
    infoDinner: "มื้อค่ำ", infoWine: "ไวน์", infoGoogle: "บน Google", infoOpen: "เปิดใน Google Maps", infoNoPrice: "ไม่ได้ระบุราคา",
    starsTitle: "ดาวที่เพิ่มขึ้นแต่ละดวงทำให้แพงขึ้นเท่าไร",
    starsText: "ราคาเมนูเฉลี่ยของมื้อที่เลือกด้านบน แยกตามจำนวนดาวมิชลิน ร้านแบบอาลาคาร์ตนับรวมในจำนวนร้าน แต่ไม่รวมในค่าเฉลี่ยและช่วงราคา",
    tierNames: ["หนึ่งดาว", "สองดาว", "สามดาว"], avgDinner: "มื้อค่ำเฉลี่ย", tRestaurants: "จำนวนร้าน", tRange: "ช่วงราคา", tRating: "คะแนน Google เฉลี่ย",
    tVs: "เทียบกับ {n} ดาว", tNoPrices: "ร้านเหล่านี้ไม่มีราคาเมนู", tNone: "ไม่มีร้าน{tier}",
    methodTitle: "เราคิดราคาอย่างไร",
    m1Title: "ต่อคน ก่อนค่าบริการ",
    m1Text: "ทุกตัวเลขเป็นราคาต่อหนึ่งคน และไม่รวมค่าบริการซึ่งแตกต่างกันไปในแต่ละประเทศ ไม่รวมรายการเสริม เช่น คาเวียร์หรือทรัฟเฟิล ราคาในสกุลเงินอื่นใช้อัตราแลกเปลี่ยนของวันนั้นและเป็นราคาโดยประมาณ",
    m2Title: "ราคามาจากที่ใด",
    m2Text: "มื้อค่ำคือเมนูชิมหลัก (ถ้ามี) และไวน์คือไวน์จับคู่ที่ถูกที่สุดของเมนูนั้น เราใช้ราคาจากเว็บไซต์ของร้านเมื่อมีการเผยแพร่ ไม่เช่นนั้นใช้จากรีวิวล่าสุดและเว็บไซต์จอง มื้อกลางวันคือเมนูกลางวันของร้าน และหมายเหตุจะบอกวันที่เสิร์ฟ",
    m3Title: "ดาวและคะแนน Google",
    m3Text: "คะแนนรีวิว Google จาก 5 และจำนวนรีวิว ตรวจสอบเมื่อเดือนตุลาคม 2026 ดาวมาจากมิชลิน ไกด์ฉบับล่าสุดของแต่ละประเทศ ▲ สีเขียวคือร้านที่ได้ดาวในไกด์สองฉบับล่าสุด ▼ สีแดงคือร้านที่เสียดาว",
    contactTitle: "พบราคาที่เปลี่ยนไปไหม",
    contactText: "เมนูเปลี่ยนราคาบ่อย บอกเราเรื่องการอัปเดต ร้านที่เรายังไม่มี หรือเมืองที่อยากให้เราเพิ่ม",
    cName: "ชื่อ", cEmail: "อีเมล", cTopic: "หัวข้อ", cTopicPrice: "อัปเดตราคา", cTopicSuggest: "แนะนำร้านอาหาร", cTopicCity: "เพิ่มเมืองอื่น", cTopicOther: "อื่น ๆ",
    cMsg: "ข้อความ", cMsgPh: "บอกชื่อร้าน ราคาใหม่ และที่ที่คุณเห็น",
    cSend: "ส่งข้อความ", errName: "พิมพ์ชื่อของคุณ", errEmail: "พิมพ์อีเมล เช่น name@example.com", errMsg: "เขียนข้อความสั้น ๆ",
    sent: "ขอบคุณ {name} แอปอีเมลของคุณจะเปิดขึ้นพร้อมข้อความ เพียงกดส่ง หากไม่เปิด โปรดอีเมลมาที่ hello@starredbill.com",
    footEdition: "The Starred Bill · {place}",
    footNote: "ตรวจสอบราคาและคะแนนเมื่อเดือนตุลาคม 2026 โปรดสอบถามร้านก่อนจอง",
    rateLine: "ราคาเป็น {sym} โดยประมาณ ตามอัตราแลกเปลี่ยนวันที่ {date}: {sym}1 = {home}{rate}",
    rateLineMixed: "ราคาแปลงเป็น {sym} ตามอัตราแลกเปลี่ยนวันที่ {date} จึงเป็นราคาโดยประมาณ",
    currencyAria: "แสดงราคาเป็น", crumbsAria: "ตำแหน่งของคุณ", menuOpen: "เมนู",
    installApp: "ติดตั้งแอป",
    installTipIos: "วิธีติดตั้ง: แตะปุ่มแชร์ (สี่เหลี่ยมที่มีลูกศร) ใน Safari แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”"
  },
  ko: {
    destGuide: "미쉐린 가이드 전체: {n}곳",
    acctSentCode: "{email}(으)로 6자리 코드를 보냈습니다. 아래에 입력하면 여기서 로그인됩니다. (이메일의 링크도 되지만, 홈 화면 앱에서는 브라우저가 열립니다.)", acctCodeLabel: "이메일로 받은 코드", acctVerify: "코드로 로그인", acctVerifying: "확인 중…", acctCodeWrong: "코드가 맞지 않습니다. 확인하거나 새 코드를 받으세요.", acctBadCode: "이메일로 받은 6자리 코드를 입력하세요.",
    destHighLow: "많은 순", destLowHigh: "적은 순", destFlip: "다시 누르면 순서가 바뀝니다",
    destContLabel: "대륙", continents: { "europe": "유럽", "asia": "아시아", "middle-east": "중동", "americas": "아메리카", "oceania": "오세아니아" },
    destSortLabel: "정렬", destSortAZ: "가나다순", destSortMost: "레스토랑 수", destSortStars: "{n}스타 레스토랑 수",
    noStarsTitle: "아직 미쉐린 스타가 없는 나라", noStarsText: "다음 {n}개국에는 미쉐린 스타 레스토랑이 없습니다. 대부분은 미쉐린 가이드가 아직 다루지 않기 때문이며, 다른 이유가 있는 곳(* 표시)은 여기서 설명합니다.",
    destSoon: "가격 준비 중", destSoonMap: "지도에서 보기",
    destJump: "국가·지역으로 이동",
    notrackOn: "이 브라우저는 이제 방문 통계에서 제외됩니다.", notrackOff: "이 브라우저가 다시 방문 통계에 포함됩니다.",
    destAreas: "지역과 도시", destRegions: "지역", destCityList: "도시",
    cookieText: "사이트 이용 방식을 파악하기 위해 Google 애널리틱스 쿠키를 사용해도 될까요? 어느 쪽을 선택해도 방문 수는 쿠키 없이 집계합니다.", cookieAccept: "동의", cookieReject: "거부", cookieSettings: "쿠키 설정 변경",
    navCompare: "비교", navMap: "지도", navStars: "별 개수별", navMethod: "산정 방법", navContact: "문의", navDestinations: "모든 여행지", navGuides: "가이드", navNear: "내 주변", navPick: "골라 주세요", wishlist: "위시리스트",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · 미쉐린 가이드 선정 레스토랑",
    heroTitle: "{place}에서 미쉐린 스타는 <em>얼마</em>일까?",
    heroText: "{place} 미쉐린 스타 레스토랑의 1인 기준 디너, 런치, 페어링 가격을 나란히 비교하세요. 레스토랑 이름이나 요리로 검색하고, 별 개수나 요리 종류로 걸러 볼 수 있습니다. 가 보고 싶은 곳은 위시리스트에 저장하세요.",
    crumbHome: "모든 여행지", explore: "둘러보기", exploreCities: "{country}의 도시", exploreDistricts: "{country}의 구역", alsoIn: "함께 보기",
    figCount: "스타 레스토랑", figMin: "가장 저렴한 디너 코스", figMax: "가장 비싼 디너 코스", figMinLunch: "가장 저렴한 런치 코스", figMaxLunch: "가장 비싼 런치 코스",
    fMeal: "식사", mealDinner: "디너", mealLunch: "런치", hNotesLunch: "런치 메모", noLunch: "런치 없음", avgLunch: "런치 평균", infoLunch: "런치",
    sortPriceAscLunch: "런치: 낮은 가격순", sortPriceDescLunch: "런치: 높은 가격순",
    starCounts: "3스타 {3}곳 · 2스타 {2}곳 · 1스타 {1}곳",
    compareTitle: "모든 레스토랑, 모든 가격",
    compareText: "아래에서 디너와 런치를 바꿔 볼 수 있습니다. 가격은 테이스팅 코스 또는 세트 메뉴 기준입니다(‘요리당’이나 ‘평균 예산’으로 표시된 곳 제외). 막대는 각 코스를 목록에서 가장 비싼 코스와 비교한 것이며, 가격마다 출처 링크가 있습니다.",
    searchPh: "레스토랑, 요리, 지역 검색", searchPhShort: "레스토랑, 요리, 지역", searchPhEx: "레스토랑, 요리, 지역 검색(예: {ex})",
    searchLabel: "이름, 요리, 지역으로 레스토랑 검색",
    sortLabel: "정렬",
    sortPriceAsc: "디너: 낮은 가격순", sortPriceDesc: "디너: 높은 가격순", sortStars: "별 많은 순", sortRating: "Google 평점순", sortName: "이름순",
    fShow: "보기", fStars: "미쉐린 스타", fCuisine: "요리",
    fDiet: "식단", dietVegOnly: "채식 레스토랑", dietVegMenu: "채식 테이스팅 메뉴", dietVeg: "채식 선택 가능", dietVegan: "비건 선택 가능", dietGf: "글루텐 프리 선택 가능", dietHalal: "할랄", dietKosher: "코셔",
    badgeVegOnly: "채식", badgeVegMenu: "채식 메뉴", badgeVegan: "비건", chefLabel: "셰프 {name}",
    exploreMore: "{n}곳 더 보기", exploreFewer: "접기",
    filtersBtn: "필터", filtersShowN: "레스토랑 {n}곳 보기", filtersClear: "모두 지우기", cuisineSearchPh: "요리 찾기", removeFilter: "필터 삭제: {f}", sheetClose: "닫기",
    showAll: "전체 레스토랑", showChanges: "최근 별 변동", showWish: "내 위시리스트",
    showChangesTitle: "최근 두 번의 미쉐린 가이드에서 별을 얻거나 잃은 레스토랑",
    all: "전체", starsAria: "미쉐린 {n}스타",
    hRestaurant: "레스토랑", hCuisine: "요리", hStars: "스타", hGoogle: "Google", hNotes: "디너 메모", hPrice: "가격", hWine: "와인 페어링", hWish: "위시리스트",
    tableLabel: "레스토랑 가격",
    reviews: "리뷰 {n}개", ratingAria: "Google 평점 5점 만점에 {r}점",
    srcSite: "공식 사이트", srcPress: "출처", srcTitle: "이 가격의 출처",
    perMain: "요리당", typicalSpend: "평균 예산", notListed: "비공개",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · 1인 테이블", rcptDinnerOnly: "디너만 운영", rcptNoPairing: "페어링 정보 없음", rcptPlusWine: "+ 와인 {p}", rcptDinnerWine: "디너 + 와인", rcptLunchWine: "런치 + 와인", rcptChecked: "{d} 확인", rcptIncl: "1인 기준, 서비스 요금 포함", rcptPlus: "1인 기준, ++ (서비스 요금·세금 별도)", rcptTaxTip: "1인 기준, 세금·팁 별도", rcptTip: "1인 기준, 팁 별도", rcptTax: "1인 기준, 세금 포함",
    // The wishlist as one bill (homepage).
    billTitle: "위시리스트를 한 장의 계산서로", billIntro: "저장한 모든 레스토랑을 한 사람이 방문할 때의 합계에, 나라별로 일반적인 서비스 요금·세금·팁을 추정해 더했습니다.", billHead: "The Starred Bill · {meal} 1인", billWine: "와인 페어링 추가", billSubtotal: "소계", billExtras: "서비스 요금·세금·팁 (추정)", billTotal: "합계", billIncluded: "서비스 요금 포함", billTax: "세금 포함", billBefore: "서비스 요금 +{p}%", billPlus: "++ 약 {p}% 추가", billTaxTip: "세금과 팁 약 {p}% 추가", billTip: "팁 약 {p}%", billNoLunch: "런치 없음, 제외", billNoPrice: "가격 미확인, 제외", billPerMain: "단품 메뉴, 제외", billCount: "저장한 {b}곳 중 {a}곳 합산", billFoot: "1인 기준, 와인 페어링을 추가하지 않으면 음료 별도. 서비스 요금·세금·팁은 추정치이니 각 레스토랑에 확인하세요.", billConverted: "오늘 환율로 환산.",
    findOnMaps: "Google 지도에서 {name} 보기", findOnMapsTitle: "Google 지도에서 보기",
    showOnly: "{cat}만 보기",
    chgNew: "신규", chgTitle: "{date} 미쉐린 가이드: {note}",
    emptyWish: "위시리스트에 {place}의 레스토랑이 없습니다. 레스토랑 옆 하트를 누르면 추가됩니다.",
    emptyPlace: "{place}에는 아직 미쉐린 스타 레스토랑이 없습니다. 별을 받는 곳이 생기면 이 페이지를 업데이트하겠습니다.",
    emptySee: "{name}의 스타 레스토랑 {n}곳 보기", exploreAll: "모든 여행지",
    noMatch: "조건에 맞는 레스토랑이 없습니다.", clearFilters: "검색과 필터 지우기",
    formerTitle: "더 이상 별이 없는 곳",
    formerNote: "이전 목록에 있었지만 이후 별을 잃었거나, 문을 닫았거나, 변경된 레스토랑입니다. 참고용으로 남겨 둡니다.",
    formerly: "이전", stLost: "별 상실", stClosed: "폐업", stChanged: "변경",
    tapHint: "레스토랑을 탭하면 전체 가격과 자세한 정보를 볼 수 있습니다.",
    showing: "스타 레스토랑 {b}곳 중 {a}곳 표시", showingFormer: "(별을 잃은 곳 {c}곳 별도)",
    wishNote: "위시리스트는 이 브라우저에만 저장됩니다.",
    wishAdd: "{name}을(를) 위시리스트에 추가", wishRemove: "{name}을(를) 위시리스트에서 삭제", wishAddT: "위시리스트에 추가", wishRemoveT: "위시리스트에서 삭제",
    toastAdded: "{name}을(를) 위시리스트에 추가했습니다", toastRemoved: "{name}을(를) 위시리스트에서 삭제했습니다", undo: "실행 취소",
    photo: "사진", tempClosed: "임시 휴업(Google)",
    mapTitle: "모든 스타 레스토랑을 지도로",
    mapText: "지도의 핀은 위 목록의 필터를 따릅니다. 별 개수, 요리, 위시리스트를 고르면 지도도 바뀝니다. 핀을 누르면 가격과 길찾기 링크가 나옵니다.",
    mapWait: "여기까지 스크롤하면 지도를 불러옵니다.", mapLabel: "미쉐린 스타 레스토랑 지도",
    mapError: "지도를 불러오지 못했습니다. 목록의 각 레스토랑 옆 핀으로 Google 지도에서 열 수 있습니다.",
    legendAria: "핀 색상의 의미", legendItem: "미쉐린 {n}스타",
    mapShowing: "지도에 {n}곳 표시 중", mapNone: "현재 필터에 맞는 레스토랑이 없습니다",
    nearMe: "내 주변", nearMeAria: "내 주변 스타 레스토랑 보기", nearFinding: "위치 찾는 중…", youAreHere: "현재 위치",
    nearTitle: "가까운 순", nearAway: "{d}", nearWorld: "세계 지도에서 내 주변 스타 레스토랑 보기",
    nearNone: "이 페이지의 레스토랑 중 가까운 곳이 없습니다. 가장 가까운 곳은 {name}({d})입니다.",
    nearDenied: "위치 접근이 꺼져 있습니다. 브라우저 설정에서 이 사이트를 허용한 뒤 다시 시도하세요.",
    nearFailed: "위치를 찾지 못했습니다. 다시 시도하세요.", nearUnsupported: "이 브라우저는 위치를 공유할 수 없습니다.",
    jumpMap: "지도", jumpMapAria: "지도로 이동",
    share: "공유", shareAria: "이 페이지 공유", shareTitle: "이 페이지 공유", shareCopy: "링크 복사", shareCopied: "복사했습니다", shareEmail: "이메일",
    accTitle: "내 계정", accLoading: "계정을 불러오는 중…", accOutText: "로그인하면 위시리스트와 가 본 레스토랑을 어느 기기에서나 볼 수 있습니다. 무료입니다.",
    accSignedInAs: "{email}(으)로 로그인됨", accStatBeen: "가 본 곳", accStatStars: "모은 별", accStatThree: "3스타 레스토랑", accStatCountries: "국가",
    accMilestones: "달성 기록", ms1: "첫 번째 별", ms2: "첫 3스타", ms3: "레스토랑 10곳", ms4: "레스토랑 25곳", ms5: "3개국", ms6: "별 50개", msGot: "(달성)",
    accWhere: "가 본 곳", accOf: "{total}곳 중 {n}곳", accBeenTitle: "가 본 레스토랑", accBeenEmpty: "아직 체크한 곳이 없습니다. 가 본 레스토랑 옆 ✓를 누르세요.",
    accDateAria: "{name} 방문 날짜", accRemove: "삭제", accWishTitle: "위시리스트", accWishEmpty: "위시리스트가 비어 있습니다. 레스토랑 옆 하트를 누르면 저장됩니다.",
    accMarkBeen: "가 봤어요", accData: "내 데이터", accDataText: "계정의 모든 데이터를 내려받거나, 이 기기에서 로그아웃하거나, 계정과 두 목록을 영구히 삭제할 수 있습니다.",
    accDownload: "내 데이터 내려받기", accSignOut: "로그아웃", accDelete: "계정 삭제", accDeleteConfirm: "계정과 두 목록이 영구히 삭제됩니다. 되돌릴 수 없습니다.",
    accDeleteYes: "영구 삭제", accDeleteNo: "계정 유지", accDeleted: "계정이 삭제되었습니다.", accDeleteFail: "지금은 계정을 삭제할 수 없습니다. 다시 시도하거나 문의 양식을 이용하세요.",
    acctSignIn: "로그인", acctAccount: "계정", acctTitle: "로그인 또는 무료 계정 만들기",
    acctWhy: "위시리스트를 어느 기기에서나 쓰고, 가 본 레스토랑을 체크할 수 있습니다.",
    acctWhyBeen: "무료 계정을 만들면 가 본 레스토랑을 체크할 수 있습니다. 위시리스트도 어느 기기에서나 쓸 수 있습니다.",
    acctGoogle: "Google로 계속하기", acctOr: "또는", acctEmailLabel: "이메일 주소", acctSend: "로그인 코드를 이메일로 받기", acctSending: "보내는 중…",
    acctSent: "이메일을 확인하세요. {email}(으)로 로그인 링크를 보냈습니다. 이 기기에서 열면 로그인됩니다.",
    acctTooMany: "로그인 이메일 요청이 너무 많습니다. 1분쯤 기다린 뒤 다시 시도하세요.", acctFailed: "문제가 생겼습니다. 이메일 주소를 확인하고 다시 시도하세요.",
    acctBadEmail: "name@example.com 같은 이메일 주소를 입력하세요.", acctSmall: "무료이며 비밀번호가 필요 없습니다. 이메일은 로그인에만 사용합니다.",
    acctPrivacy: "개인정보 처리", acctClose: "닫기", acctWelcome: "로그인되었습니다. 이제 위시리스트를 어느 기기에서나 쓸 수 있습니다.",
    acctLinkExpired: "이 로그인 링크는 만료되었거나 이미 사용되었습니다. ‘로그인’을 눌러 새 링크를 받으세요.",
    been: "가 봤어요", beenAdd: "{name}에 가 봤다고 표시", beenRemove: "{name}의 ‘가 봤어요’ 해제", beenAddT: "가 봤다고 표시", beenRemoveT: "‘가 봤어요’ 해제",
    toastBeen: "{name}에 가 봤다고 표시했습니다", toastNotBeen: "{name}의 ‘가 봤어요’를 해제했습니다", showBeen: "가 본 곳",
    beenProgress: "여기 있는 {total}곳 중 {n}곳에 가 봤습니다.", wishNoteOut: "위시리스트는 이 기기에만 저장됩니다.", wishNoteSignIn: "로그인하면 어느 기기에서나 쓸 수 있습니다", wishCompare: "저장한 레스토랑 나란히 비교하기",
    wishNoteIn: "위시리스트와 가 본 곳이 계정에 저장되어 있습니다.", wishCtaHome: "위시리스트는 이 기기에만 저장됩니다. 무료 계정을 만들면 어느 기기에서나 쓰고 가 본 레스토랑을 체크할 수 있습니다.",
    wishCtaBtn: "무료 가입", wishSynced: "계정에 저장되었습니다.", acctSee: "내 계정 보기",
    shareInsta: "Instagram에서는 링크를 복사해 스토리나 메시지에 붙여 넣으세요.",
    shareMore: "Instagram, 메시지 등",
    shareTextPlace: "{place}에서 미쉐린 스타는 얼마일까? 디너, 런치, 페어링 가격을 나란히 비교.",
    shareTextHome: "미쉐린 스타는 얼마일까? 도시별 디너, 런치, 페어링 가격을 나란히 비교.",
    infoDinner: "디너", infoWine: "와인 페어링", infoGoogle: "(Google)", infoOpen: "Google 지도에서 열기", infoNoPrice: "가격 비공개",
    starsTitle: "별이 하나 늘면 얼마나 더 비쌀까?",
    starsText: "위에서 고른 식사의 평균 코스 가격을 미쉐린 별 개수별로 보여 줍니다. 단품 위주 레스토랑은 개수에는 포함하지만 평균과 가격 범위에서는 뺐습니다.",
    tierNames: ["1스타", "2스타", "3스타"], avgDinner: "디너 평균", tRestaurants: "레스토랑 수", tRange: "가격 범위", tRating: "Google 평균 평점",
    tVs: "{n}스타 대비", tNoPrices: "이 레스토랑들은 코스 가격이 없습니다.", tNone: "{tier} 레스토랑이 없습니다.",
    methodTitle: "가격 산정 방법",
    m1Title: "1인 기준, 서비스 요금 별도",
    m1Text: "모든 가격은 1인 기준이며, 나라마다 다른 서비스 요금은 포함하지 않습니다. 캐비아나 트러플 같은 추가 요금도 포함하지 않습니다. 다른 통화로 표시한 가격은 그날 환율에 따른 대략적인 금액입니다.",
    m2Title: "가격의 출처",
    m2Text: "디너는 대표 테이스팅 코스, 와인은 그 코스의 가장 저렴한 페어링입니다. 레스토랑 공식 사이트에 가격이 있으면 그것을, 없으면 최근 리뷰와 예약 사이트를 참고했습니다. 런치는 런치 코스이며, 제공 요일은 메모에 적었습니다.",
    m3Title: "별과 Google 평점",
    m3Text: "Google 평점(5점 만점)과 리뷰 수는 2026년 10월에 확인했습니다. 별은 각 나라의 최신 미쉐린 가이드 기준입니다. 초록색 ▲는 최근 두 번의 가이드에서 별을 얻은 곳, 빨간색 ▼는 잃은 곳입니다.",
    contactTitle: "가격이 바뀐 걸 발견하셨나요?",
    contactText: "메뉴 가격은 자주 바뀝니다. 새 가격, 빠진 레스토랑, 다음에 다뤘으면 하는 도시를 알려 주세요.",
    cName: "이름", cEmail: "이메일", cTopic: "주제", cTopicPrice: "가격 업데이트", cTopicSuggest: "레스토랑 제안", cTopicCity: "다른 도시 요청", cTopicOther: "기타",
    cMsg: "메시지", cMsgPh: "레스토랑 이름, 새 가격, 어디서 보셨는지 알려 주세요.",
    cSend: "보내기", errName: "이름을 입력하세요.", errEmail: "name@example.com 같은 이메일 주소를 입력하세요.", errMsg: "메시지를 입력하세요.",
    sent: "{name}님, 감사합니다. 메시지가 담긴 이메일 앱이 열리면 보내기를 눌러 주세요. 열리지 않으면 hello@starredbill.com으로 메일을 보내 주세요.",
    footEdition: "The Starred Bill · {place}",
    footNote: "가격과 평점은 2026년 10월에 확인했습니다. 예약 전에 레스토랑에 확인하세요.",
    rateLine: "{sym} 가격은 {date} 환율에 따른 대략적인 금액입니다: {sym}1 = {home}{rate}.",
    rateLineMixed: "가격은 {date} 환율로 {sym}에 맞춰 환산한 대략적인 금액입니다.",
    currencyAria: "가격 표시 통화", crumbsAria: "현재 위치", menuOpen: "메뉴",
    homeTitle: "The Starred Bill · 미쉐린 스타 레스토랑 가격",
    homeEyebrow: "미쉐린 스타 레스토랑 가격",
    homeH1: "미쉐린 스타는 <em>얼마</em>일까? 도시별로 비교하세요.",
    homeText: "미쉐린 스타 레스토랑의 1인 기준 디너, 런치, 페어링 가격을 나란히 비교합니다. 가격마다 출처 링크가 있습니다. 여행지를 고르거나 지도에서 찾아보세요.",
    figRestaurants: "스타 레스토랑", figDestinations: "여행지", figUpdated: "가격 확인", figUpdatedSub: "디너, 런치, 페어링",
    citiesN: "도시 {n}곳",
    homeSearchPh: "레스토랑, 요리, 도시 검색", homeSearchLabel: "레스토랑, 요리, 도시 검색", searchNone: "아직 ‘{q}’와 일치하는 항목이 없습니다.",
    mapHomeTitle: "전 세계 미쉐린 스타 레스토랑",
    mapHomeText: "확대하면 개별 레스토랑이 보입니다. 핀을 누르면 디너 가격과 그 도시 비교 페이지 링크가 나옵니다.",
    destTitle: "국가 선택", destText: "여행지마다 가격, 필터, 지도, 별 개수별 평균을 담은 페이지가 있습니다.",
    destRestaurants: "스타 레스토랑 {n}곳", destFrom: "디너 코스 {p}부터", destOpen: "{place} 비교하기",
    collectionsTitle: "모아 보기",
    wishTitle: "내 위시리스트", wishText: "여행지마다 저장한 레스토랑입니다.",
    wishEmptyHome: "아직 저장한 곳이 없습니다. 여행지 페이지에서 레스토랑 옆 하트를 누르면 여기에 추가됩니다.",
    wishRemoveShort: "삭제",
    infoCompare: "{place} 가격 비교",
    clearSearch: "검색 지우기", photoView: "{name} 사진 크게 보기", photoClose: "닫기",
    mapSearchPh: "지도 검색: 레스토랑, 도시, 국가", mapSearchPhShort: "레스토랑, 도시, 국가", homeSearchPhShort: "레스토랑, 요리, 도시", mapSearchLabel: "지도에서 레스토랑, 도시, 국가 검색",
    mapHomeWorldText: "전 세계 미쉐린 스타 레스토랑 {n}곳. 채워진 핀은 이 사이트에서 가격을 비교할 수 있는 곳이고, 빈 핀은 가격을 추가할 때까지 미쉐린 가이드로 연결됩니다. 확대하면 개별 레스토랑이 보입니다.",
    infoNoPricesYet: "아직 가격 정보 없음", infoMichelin: "미쉐린 가이드", legendHollow: "빈 핀 = 가격 미등록",
    installApp: "앱 추가",
    installTipIos: "추가 방법: Safari 공유 버튼(화살표가 있는 네모)을 누르고 ‘홈 화면에 추가’를 선택하세요."
  },
  it: {
    destGuide: "In tutta la Guida MICHELIN: {n}",
    acctSentCode: "Abbiamo inviato un codice di 6 cifre a {email}. Scrivilo qui sotto per accedere qui. (Anche il link nell'email funziona, ma nell'app della schermata Home apre il browser.)", acctCodeLabel: "Codice ricevuto via email", acctVerify: "Accedi con il codice", acctVerifying: "Verifica…", acctCodeWrong: "Il codice non ha funzionato. Controllalo o chiedine uno nuovo.", acctBadCode: "Scrivi il codice di 6 cifre dell'email.",
    destHighLow: "dal più al meno", destLowHigh: "dal meno al più", destFlip: "Clicca di nuovo per invertire l'ordine",
    destContLabel: "Continente", continents: { "europe": "Europa", "asia": "Asia", "middle-east": "Medio Oriente", "americas": "Americhe", "oceania": "Oceania" },
    destSortLabel: "Ordina", destSortAZ: "A–Z", destSortMost: "Ristoranti", destSortStars: "Ristoranti con {n} stella|Ristoranti con {n} stelle",
    noStarsTitle: "Ancora senza stelle Michelin", noStarsText: "Questi {n} paesi non hanno ristoranti stellati. Per lo più la Guida MICHELIN non li copre ancora; quando c'è un altro motivo (segnato con *), è spiegato qui.",
    destSoon: "Prezzi non ancora disponibili", destSoonMap: "Vedili sulla mappa",
    destJump: "Vai a un paese",
    notrackOn: "Questo browser non viene più conteggiato nelle statistiche delle visite.", notrackOff: "Questo browser viene di nuovo conteggiato nelle statistiche delle visite.",
    destAreas: "Regioni e città", destRegions: "Regioni", destCityList: "Città",
    cookieText: "Possiamo usare i cookie di Google Analytics per capire come viene usato il sito? Le visite vengono contate comunque senza cookie.", cookieAccept: "Accetta", cookieReject: "Rifiuta", cookieSettings: "Cambia la scelta sui cookie",
    navCompare: "Confronta", navMap: "Mappa", navStars: "Per stelle", navMethod: "Metodo", navContact: "Contatti", navDestinations: "Destinazioni", navGuides: "Guide", navNear: "Vicino a me", navPick: "Aiutami a scegliere", wishlist: "Preferiti",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · Ristoranti della Guida Michelin",
    heroTitle: "Quanto <em>costa</em> una stella Michelin {placeIn}?",
    heroText: "I prezzi a persona di cena, pranzo e abbinamento vini nei ristoranti stellati {placeIn}, uno accanto all'altro. Cerca per nome o cucina, filtra per stelle o cucina e salva nei preferiti quelli che vuoi provare.",
    crumbHome: "Tutte le destinazioni", explore: "Esplora", exploreCities: "Città – {country}", exploreDistricts: "Quartieri – {country}", alsoIn: "Anche in",
    figCount: "Ristoranti", figMin: "Menu di cena più economico", figMax: "Menu di cena più caro", figMinLunch: "Menu di pranzo più economico", figMaxLunch: "Menu di pranzo più caro",
    fMeal: "Pasto", mealDinner: "Cena", mealLunch: "Pranzo", hNotesLunch: "Note sul pranzo", noLunch: "Chiuso a pranzo", avgLunch: "pranzo medio", infoLunch: "pranzo",
    sortPriceAscLunch: "Pranzo: dal meno caro", sortPriceDescLunch: "Pranzo: dal più caro",
    starCounts: "{3} tre stelle · {2} due stelle · {1} una stella",
    compareTitle: "Ogni tavola, ogni prezzo",
    compareText: "Passa da cena a pranzo qui sotto. I prezzi sono quelli del menu degustazione o del menu fisso, salvo dove indicato “per piatto principale” o “spesa tipica”, e le barre confrontano ogni menu con il più caro della lista. Ogni prezzo rimanda alla sua fonte.",
    searchPh: "Cerca un ristorante, una cucina o una zona", searchPhShort: "Ristorante, cucina o zona", searchPhEx: "Cerca un ristorante, una cucina o una zona, ad es. “{ex}”",
    searchLabel: "Cerca ristoranti per nome, cucina o zona",
    sortLabel: "Ordina i ristoranti",
    sortPriceAsc: "Cena: dal meno caro", sortPriceDesc: "Cena: dal più caro", sortStars: "Prima i più stellati", sortRating: "Voto Google: dal più alto", sortName: "Nome A–Z",
    fShow: "Mostra", fStars: "Stelle Michelin", fCuisine: "Cucina",
    fDiet: "Dieta", dietVegOnly: "Ristorante vegetariano", dietVegMenu: "Menu degustazione vegetariano", dietVeg: "Opzioni vegetariane", dietVegan: "Opzioni vegane", dietGf: "Opzioni senza glutine", dietHalal: "Halal", dietKosher: "Kosher",
    badgeVegOnly: "Vegetariano", badgeVegMenu: "Menu vegetariano", badgeVegan: "Vegano", chefLabel: "Chef {name}",
    exploreMore: "altri {n}", exploreFewer: "Mostra meno",
    filtersBtn: "Filtri", filtersShowN: "Mostra {n} ristorante|Mostra {n} ristoranti", filtersClear: "Cancella tutto", cuisineSearchPh: "Cerca una cucina", removeFilter: "Rimuovi filtro: {f}", sheetClose: "Chiudi",
    showAll: "Tutti i ristoranti", showChanges: "Stelle cambiate di recente", showWish: "I miei preferiti",
    showChangesTitle: "Hanno guadagnato o perso una stella in una delle ultime due Guide Michelin",
    all: "Tutte", starsAria: "{n} stella Michelin|{n} stelle Michelin",
    hRestaurant: "Ristorante", hCuisine: "Cucina", hStars: "Stelle", hGoogle: "Google", hNotes: "Note sulla cena", hPrice: "Prezzo", hWine: "Abbinamento vini", hWish: "Preferiti",
    tableLabel: "Prezzi dei ristoranti",
    reviews: "{n} recensione|{n} recensioni", ratingAria: "Voto Google {r} su 5",
    srcSite: "Sito del ristorante", srcPress: "Fonte: recensione", srcTitle: "Da dove viene questo prezzo",
    perMain: "per piatto principale", typicalSpend: "spesa tipica", notListed: "Non pubblicato",
    // The till receipt on destination pages.
    rcptHead: "The Starred Bill · Tavolo per 1", rcptDinnerOnly: "Solo cena", rcptNoPairing: "nessun abbinamento indicato", rcptPlusWine: "+ vini {p}", rcptDinnerWine: "Cena + vini", rcptLunchWine: "Pranzo + vini", rcptChecked: "Verificato: {d}", rcptIncl: "A persona, servizio incluso", rcptPlus: "A persona, ++ (servizio e tasse a parte)", rcptTaxTip: "A persona, tasse e mancia escluse", rcptTip: "A persona, mancia esclusa", rcptTax: "A persona, tasse incluse",
    // The wishlist as one bill (homepage).
    billTitle: "La tua lista dei preferiti in un unico conto", billIntro: "Quanto costerebbero per una persona tutti i ristoranti salvati, con una stima di servizio, tasse e mance abituali in ogni paese.", billHead: "The Starred Bill · {meal} per 1", billWine: "Aggiungi gli abbinamenti vini", billSubtotal: "Subtotale", billExtras: "Servizio, tasse e mance (stima)", billTotal: "Totale", billIncluded: "servizio incluso", billTax: "tasse incluse", billBefore: "+{p}% di servizio", billPlus: "++ aggiunge circa il {p}%", billTaxTip: "tasse e mancia aggiungono circa il {p}%", billTip: "mancia di circa il {p}%", billNoLunch: "chiuso a pranzo, escluso", billNoPrice: "prezzo non ancora disponibile, escluso", billPerMain: "alla carta, escluso", billCount: "Somma {a} di {b} ristorante salvato|Somma {a} di {b} ristoranti salvati", billFoot: "A persona, bevande escluse salvo aggiunta dei vini. Servizio, tasse e mance sono stime: verifica con ogni ristorante.", billConverted: "Convertito al cambio di oggi.",
    findOnMaps: "Trova {name} su Google Maps", findOnMapsTitle: "Trova su Google Maps",
    showOnly: "Mostra solo {cat}",
    chgNew: "Nuovo", chgTitle: "{note} nella Guida Michelin di {date}",
    emptyWish: "Nessuno dei tuoi ristoranti salvati si trova {placeIn}. Tocca il cuore di un ristorante per salvarlo.",
    emptyPlace: "Al momento non ci sono ristoranti stellati Michelin {placeIn}, ma aggiorneremo questa pagina appena ne arriverà uno.",
    emptySee: "Vedi il ristorante stellato di {name}|Vedi tutti i {n} ristoranti stellati di {name}", exploreAll: "Tutte le zone",
    noMatch: "Nessun ristorante corrisponde a questi filtri.", clearFilters: "Cancella ricerca e filtri",
    formerTitle: "Non più stellati",
    formerNote: "Ristoranti presenti nell'edizione precedente di questa lista che da allora hanno perso le stelle, hanno chiuso o sono cambiati. Mostrati solo come riferimento.",
    formerly: "in passato", stLost: "Stella persa", stClosed: "Chiuso", stChanged: "Cambiato",
    tapHint: "Tocca un ristorante per vederne tutti i prezzi e i dettagli.",
    showing: "{a} ristoranti stellati su {b}", showingFormer: ", più {c} non più stellati",
    wishNote: "I tuoi preferiti sono salvati solo in questo browser.",
    wishAdd: "Aggiungi {name} ai preferiti", wishRemove: "Togli {name} dai preferiti", wishAddT: "Aggiungi ai preferiti", wishRemoveT: "Togli dai preferiti",
    toastAdded: "{name} aggiunto ai preferiti", toastRemoved: "{name} tolto dai preferiti", undo: "Annulla",
    photo: "Foto", tempClosed: "Chiuso temporaneamente (Google)",
    mapTitle: "Tutte le tavole stellate su una mappa",
    mapText: "I segnaposto seguono i filtri della lista qui sopra: scegli un livello di stelle, una cucina o i tuoi preferiti e la mappa si aggiorna. Tocca un segnaposto per il prezzo e le indicazioni.",
    mapWait: "La mappa si carica quando arrivi qui.", mapLabel: "Mappa dei ristoranti stellati Michelin",
    mapError: "Al momento non è stato possibile caricare la mappa. Il segnaposto accanto a ogni ristorante della lista lo apre comunque in Google Maps.",
    legendAria: "Cosa indicano i colori dei segnaposto", legendItem: "{n} stella Michelin|{n} stelle Michelin",
    mapShowing: "{n} ristorante sulla mappa|{n} ristoranti sulla mappa", mapNone: "Nessun ristorante corrisponde ai filtri attuali",
    nearMe: "Vicino a me", nearMeAria: "Mostra i ristoranti stellati vicino alla mia posizione", nearFinding: "Cerco la tua posizione…", youAreHere: "Sei qui",
    nearTitle: "I più vicini", nearAway: "a {d}", nearWorld: "Vedi i ristoranti stellati vicino a te sulla mappa del mondo",
    nearNone: "Nessuno dei ristoranti di questa pagina è vicino a te. Il più vicino è {name}, a {d}.",
    nearDenied: "L'accesso alla posizione è disattivato. Consentilo per questo sito nelle impostazioni del browser e riprova.",
    nearFailed: "Non è stato possibile trovare la tua posizione. Riprova.", nearUnsupported: "Questo browser non può condividere la tua posizione.",
    jumpMap: "Mappa", jumpMapAria: "Vai alla mappa",
    share: "Condividi", shareAria: "Condividi questa pagina", shareTitle: "Condividi questa pagina", shareCopy: "Copia link", shareCopied: "Link copiato", shareEmail: "Email",
    accTitle: "Il tuo account", accLoading: "Caricamento del tuo account…", accOutText: "Accedi per vedere i tuoi preferiti e i ristoranti in cui sei stato, su qualsiasi dispositivo. È gratis.",
    accSignedInAs: "Accesso effettuato come {email}", accStatBeen: "Visitati", accStatStars: "Stelle collezionate", accStatThree: "Ristoranti tre stelle", accStatCountries: "Paesi",
    accMilestones: "Traguardi", ms1: "Prima stella", ms2: "Primo tre stelle", ms3: "10 ristoranti", ms4: "25 ristoranti", ms5: "3 paesi", ms6: "50 stelle collezionate", msGot: "(raggiunto)",
    accWhere: "Dove sei stato", accOf: "{n} su {total}", accBeenTitle: "Ci sono stato", accBeenEmpty: "Non hai ancora segnato nulla. Tocca la ✓ accanto a un ristorante in cui sei stato.",
    accDateAria: "Data in cui sei andato da {name}", accRemove: "Togli", accWishTitle: "I tuoi preferiti", accWishEmpty: "I tuoi preferiti sono vuoti. Tocca il cuore accanto a un ristorante per salvarlo.",
    accMarkBeen: "Ci sono stato", accData: "I tuoi dati", accDataText: "Scarica tutto ciò che conserviamo per il tuo account, esci da questo dispositivo o elimina per sempre l'account e le due liste.",
    accDownload: "Scarica i miei dati", accSignOut: "Esci", accDelete: "Elimina il mio account", accDeleteConfirm: "Questo elimina per sempre il tuo account e le due liste. Non si può annullare.",
    accDeleteYes: "Elimina per sempre", accDeleteNo: "Mantieni l'account", accDeleted: "Il tuo account è stato eliminato.", accDeleteFail: "Al momento non è stato possibile eliminare il tuo account. Riprova o usa il modulo di contatto.",
    acctSignIn: "Accedi", acctAccount: "Account", acctTitle: "Accedi o crea un account gratuito",
    acctWhy: "Tieni i tuoi preferiti su ogni dispositivo e segna i ristoranti in cui sei stato.",
    acctWhyBeen: "Crea un account gratuito per segnare i ristoranti in cui sei stato. Così ritrovi i preferiti anche su ogni dispositivo.",
    acctGoogle: "Continua con Google", acctOr: "oppure", acctEmailLabel: "Indirizzo email", acctSend: "Inviami un codice di accesso", acctSending: "Invio in corso…",
    acctSent: "Controlla la posta. Abbiamo inviato un link di accesso a {email}. Aprilo su questo dispositivo per completare l'accesso.",
    acctTooMany: "Troppe email di accesso in poco tempo. Aspetta un minuto e riprova.", acctFailed: "Non ha funzionato. Controlla l'indirizzo email e riprova.",
    acctBadEmail: "Inserisci un indirizzo email completo, ad es. nome@esempio.it.", acctSmall: "Gratis, e senza password da ricordare. Usiamo la tua email solo per farti accedere.",
    acctPrivacy: "Informativa sulla privacy", acctClose: "Chiudi", acctWelcome: "Hai effettuato l'accesso. Ora i tuoi preferiti ti seguono su ogni dispositivo.",
    acctLinkExpired: "Questo link di accesso è scaduto o è già stato usato. Tocca Accedi per riceverne uno nuovo.",
    been: "Ci sono stato", beenAdd: "Segna che sei stato da {name}", beenRemove: "Togli {name} dai visitati", beenAddT: "Segna come visitato", beenRemoveT: "Togli dai visitati",
    toastBeen: "{name} segnato come visitato", toastNotBeen: "{name} tolto dai visitati", showBeen: "Visitati",
    beenProgress: "Sei stato in {n} dei {total} ristoranti di questa pagina.", wishNoteOut: "I tuoi preferiti sono salvati solo su questo dispositivo.", wishNoteSignIn: "Accedi per averli su ogni dispositivo", wishCompare: "Confronta i ristoranti salvati fianco a fianco",
    wishNoteIn: "I tuoi preferiti e i ristoranti visitati sono salvati nel tuo account.", wishCtaHome: "I tuoi preferiti sono salvati solo su questo dispositivo. Registrati gratis per averli su ogni dispositivo e segnare i ristoranti in cui sei stato.",
    wishCtaBtn: "Registrati gratis", wishSynced: "Salvato nel tuo account.", acctSee: "Vai al tuo account",
    shareInsta: "Per Instagram, copia il link e incollalo in una storia o in un messaggio.",
    shareMore: "Instagram, Messaggi e altro",
    shareTextPlace: "Quanto costa una stella Michelin {placeIn}: prezzi di cena, pranzo e abbinamento vini a confronto.",
    shareTextHome: "Quanto costa una stella Michelin, città per città: prezzi di cena, pranzo e abbinamento vini a confronto.",
    infoDinner: "cena", infoWine: "vini", infoGoogle: "su Google", infoOpen: "Apri in Google Maps", infoNoPrice: "Prezzo non pubblicato",
    starsTitle: "Quanto aggiunge ogni stella in più",
    starsText: "Prezzo medio del menu per il pasto scelto sopra, raggruppato per stelle Michelin. I ristoranti à la carte sono contati ma esclusi dalle medie e dagli intervalli.",
    tierNames: ["Una stella", "Due stelle", "Tre stelle"], avgDinner: "cena media", tRestaurants: "Ristoranti", tRange: "Intervallo", tRating: "Voto medio Google",
    tVs: "rispetto a {n} stella|rispetto a {n} stelle", tNoPrices: "Nessun prezzo di menu per questi ristoranti.", tNone: "Nessun ristorante nella categoria {tier}.",
    methodTitle: "Come contiamo i prezzi",
    m1Title: "A persona, servizio escluso",
    m1Text: "Ogni cifra è per un ospite ed esclude il servizio, che varia da paese a paese. Supplementi come caviale o tartufo non sono inclusi. I prezzi mostrati in un'altra valuta usano il cambio del giorno e sono approssimativi.",
    m2Title: "Da dove vengono i prezzi",
    m2Text: "La cena è il menu degustazione principale, se c'è, e i vini sono l'abbinamento più economico. Prendiamo i prezzi dal sito di ogni ristorante quando li pubblica, altrimenti da recensioni recenti e siti di prenotazione. Il pranzo è il menu di mezzogiorno del ristorante, e la nota indica in quali giorni è servito.",
    m3Title: "Stelle e voto Google",
    m3Text: "Il voto Google su 5 e il numero di recensioni, verificati a ottobre 2026. Le stelle sono quelle dell'ultima Guida Michelin di ogni paese. Un ▲ verde indica un ristorante che ha guadagnato una stella in una delle ultime due guide; un ▼ rosso, uno che l'ha persa.",
    contactTitle: "Hai notato un cambio di prezzo?",
    contactText: "I menu cambiano prezzo spesso. Segnalaci un aggiornamento, un ristorante che ci è sfuggito o una città che vorresti vedere qui.",
    cName: "Nome", cEmail: "Email", cTopic: "Argomento", cTopicPrice: "Prezzo aggiornato", cTopicSuggest: "Suggerisci un ristorante", cTopicCity: "Aggiungi un'altra città", cTopicOther: "Altro",
    cMsg: "Messaggio", cMsgPh: "Indicaci il ristorante, il nuovo prezzo e dove l'hai visto.",
    cSend: "Invia messaggio", errName: "Inserisci il tuo nome.", errEmail: "Inserisci un indirizzo email come nome@esempio.it.", errMsg: "Scrivi un breve messaggio.",
    sent: "Grazie, {name}. Dovrebbe aprirsi la tua app di posta con il messaggio: basta premere Invia. Se non si apre, scrivi a hello@starredbill.com.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Prezzi e voti verificati a ottobre 2026. Verifica con ogni ristorante prima di prenotare.",
    rateLine: "I prezzi in {sym} sono approssimativi, con il cambio del {date}: {sym}1 = {home}{rate}.",
    rateLineMixed: "I prezzi sono convertiti in {sym} con il cambio del {date}, quindi sono approssimativi.",
    currencyAria: "Mostra i prezzi in", crumbsAria: "Dove ti trovi", menuOpen: "Menu",
    wishTitle: "I tuoi preferiti",
    clearSearch: "Cancella ricerca", photoView: "Vedi una foto più grande di {name}", photoClose: "Chiudi",
    installApp: "Installa l'app",
    installTipIos: "Per installarla: in Safari tocca il pulsante Condividi (il quadrato con la freccia), poi scegli “Aggiungi alla schermata Home”."
  }
};
// Cuisine names in Chinese for restaurants whose data has no cuisineZh.
const CUISINE_ZH = {
  "Modern Cuisine": "現代菜", "Modern British": "現代英國菜", "French": "法國菜", "Indian": "印度菜", "Creative": "創新菜", "Japanese": "日本菜",
  "Traditional British": "傳統英國菜", "Modern French": "時尚法國菜", "Italian": "義大利菜", "French Contemporary": "時尚法國菜", "Chinese": "中國菜",
  "African": "非洲菜", "Spanish": "西班牙菜", "Seafood": "海鮮", "Fish and Seafood": "魚類及海鮮", "Creative British": "創新英國菜", "Mexican": "墨西哥菜",
  "Mediterranean Cuisine": "地中海菜", "Greek": "希臘菜", "Thai": "泰國菜", "Vegan": "純素", "European Contemporary": "時尚歐陸菜", "Korean": "韓國菜",
  "Grills": "燒烤", "Californian": "加州菜", "Classic French": "經典法國菜", "Classic Cuisine": "經典菜", "British Contemporary": "時尚英國菜",
  "Turkish": "土耳其菜", "Scandinavian": "北歐菜", "Contemporary": "時尚菜", "American": "美國菜", "Vegetarian": "素食", "Israeli": "以色列菜", "Fusion": "融合菜"
};
// Cuisine names in French (Michelin's French labels), for pages offered in French.
const CUISINE_FR = {
  "Modern Cuisine": "Cuisine moderne", "Creative": "Créative", "Classic Cuisine": "Cuisine classique", "Traditional Cuisine": "Cuisine traditionnelle",
  "Japanese": "Japonaise", "Italian": "Italienne", "Chinese": "Chinoise", "Cantonese": "Cantonaise", "Greek": "Grecque", "Mexican": "Mexicaine",
  "Fish and Seafood": "Poissons et fruits de mer", "Seafood": "Fruits de mer", "French": "Française", "Indian": "Indienne", "Korean": "Coréenne",
  "Thai": "Thaïlandaise", "Spanish": "Espagnole", "Vegan": "Végane", "Mediterranean Cuisine": "Cuisine méditerranéenne", "Steakhouse": "Grillades",
  "Contemporary": "Contemporaine", "Classic French": "Classique française", "Creative French": "Française créative", "French Contemporary": "Française contemporaine",
  "Modern French": "Française moderne", "Asian Contemporary": "Asiatique contemporaine", "Italian Contemporary": "Italienne contemporaine",
  "Japanese Contemporary": "Japonaise contemporaine", "Country cooking": "Cuisine du terroir", "Farm to table": "De la ferme à la table", "Innovative": "Innovante",
  "Meats and Grills": "Viandes et grillades", "Organic": "Bio", "Regional Cuisine": "Cuisine régionale", "Seasonal Cuisine": "Cuisine de saison",
  "Sharing": "À partager", "Tuscan": "Toscane", "Vegetarian": "Végétarienne"
};
// Cuisine names in Spanish and Italian (Michelin's own labels where they exist).
const CUISINE_ES = {
  "Modern Cuisine": "Moderna", "Creative": "Creativa", "Contemporary": "Actual", "Classic Cuisine": "Clásica", "Traditional Cuisine": "Tradicional",
  "Regional Cuisine": "Regional", "Fish and Seafood": "Pescados y mariscos", "Seafood": "Mariscos", "Japanese": "Japonesa", "Fusion": "Fusión",
  "Grills": "Carnes a la parrilla", "Mexican": "Mexicana", "Colombian": "Colombiana", "Vegetarian": "Vegetariana", "Vegan": "Vegana", "Basque": "Vasca",
  "Catalan": "Catalana", "Farm to table": "De la granja a la mesa", "Innovative": "Innovadora", "International": "Internacional", "World Cuisine": "Cocina del mundo",
  "Italian": "Italiana", "French": "Francesa", "Spanish": "Española", "Mediterranean Cuisine": "Mediterránea", "Chinese": "China", "Korean": "Coreana",
  "Indian": "India", "Thai": "Tailandesa", "Greek": "Griega", "Steakhouse": "Carnes"
};
const CUISINE_KO = {
  "Korean": "한식", "Korean Contemporary": "모던 한식", "Contemporary": "컨템퍼러리", "Innovative": "이노베이티브", "Modern Cuisine": "모던 퀴진",
  "French": "프렌치", "French Contemporary": "컨템퍼러리 프렌치", "Japanese": "일식", "Sushi": "스시", "Chinese": "중식", "Mexican": "멕시칸",
  "Mediterranean Cuisine": "지중해 요리", "Vegan": "비건", "Italian": "이탈리안", "Steakhouse": "스테이크하우스", "Barbecue": "바비큐"
};
const CUISINE_DA = {
  "Creative": "Kreativt", "Modern Cuisine": "Moderne køkken", "Fusion": "Fusion", "Modern French": "Moderne fransk", "Japanese": "Japansk", "Contemporary": "Moderne",
  "Danish": "Dansk", "Nordic": "Nordisk", "Seafood": "Fisk og skaldyr", "Vegetarian": "Vegetarisk", "Innovative": "Innovativt"
};
const CUISINE_SV = {
  "Creative": "Kreativt", "Modern Cuisine": "Modernt kök", "Japanese": "Japanskt", "Grills": "Grill", "Fish and Seafood": "Fisk och skaldjur",
  "Contemporary": "Modernt", "Seafood": "Skaldjur", "Nordic": "Nordiskt", "Swedish": "Svenskt", "Vegetarian": "Vegetariskt", "Innovative": "Innovativt"
};
const CUISINE_IS = {
  "Creative": "Skapandi", "Modern Cuisine": "Nútímaleg matargerð", "Regional Cuisine": "Íslensk matargerð", "Contemporary": "Nútímaleg", "Seafood": "Sjávarréttir"
};
const CUISINE_CA = {
  "Creative": "Creativa", "Modern Cuisine": "Moderna", "Contemporary": "Contemporània", "Traditional Cuisine": "Tradicional", "Regional Cuisine": "Regional"
};
const CUISINE_TH = {
  "French Contemporary": "ฝรั่งเศสร่วมสมัย", "Modern Cuisine": "อาหารสมัยใหม่", "French": "ฝรั่งเศส", "Alpine": "อาหารแถบเทือกเขาแอลป์", "Thai": "อาหารไทย",
  "German": "เยอรมัน", "Thai contemporary": "อาหารไทยร่วมสมัย", "Indian": "อินเดีย", "European Contemporary": "ยุโรปร่วมสมัย", "Contemporary": "ร่วมสมัย",
  "Innovative": "สร้างสรรค์", "Street Food": "สตรีทฟู้ด", "Korean Contemporary": "เกาหลีร่วมสมัย", "Italian Contemporary": "อิตาเลียนร่วมสมัย", "Creative": "สร้างสรรค์",
  "Southern Thai": "อาหารใต้", "Sushi": "ซูชิ"
};
const CUISINE_IT = {
  "Modern Cuisine": "Moderna", "Creative": "Creativa", "Contemporary": "Contemporanea", "Classic Cuisine": "Classica", "Traditional Cuisine": "Tradizionale",
  "Regional Cuisine": "Regionale", "Fish and Seafood": "Pesce e frutti di mare", "Seafood": "Frutti di mare", "Japanese": "Giapponese", "Fusion": "Fusion",
  "Grills": "Carne alla griglia", "Mexican": "Messicana", "Vegetarian": "Vegetariana", "Vegan": "Vegana", "Farm to table": "Dal produttore alla tavola",
  "Innovative": "Innovativa", "International": "Internazionale", "World Cuisine": "Cucina del mondo", "Italian": "Italiana", "Italian Contemporary": "Italiana contemporanea",
  "French": "Francese", "Spanish": "Spagnola", "Mediterranean Cuisine": "Mediterranea", "Chinese": "Cinese", "Korean": "Coreana", "Indian": "Indiana", "Thai": "Thailandese",
  "Market Cuisine": "Di mercato", "Country cooking": "Casalinga", "Roman": "Romana", "Lombardian": "Lombarda", "Tuscan": "Toscana", "Steakhouse": "Carne",
  "Classic French": "Francese classica", "Creative French": "Francese creativa", "French Contemporary": "Francese contemporanea", "Modern French": "Francese moderna",
  "Asian Contemporary": "Asiatica contemporanea", "Japanese Contemporary": "Giapponese contemporanea", "Seasonal Cuisine": "Di stagione", "Sharing": "Da condividere"
};

// Each language's cuisine names (Japanese and Cantonese use the restaurant's own field or Chinese).
const CUISINES = { zh: CUISINE_ZH, yue: CUISINE_ZH, fr: CUISINE_FR, es: CUISINE_ES, it: CUISINE_IT, ko: CUISINE_KO, da: CUISINE_DA, sv: CUISINE_SV, is: CUISINE_IS, ca: CUISINE_CA, th: CUISINE_TH };
// ---------- Language and saved settings ----------
// Each language: its switch label, the page's lang attribute, the suffix of translated data fields
// (nameZh, introYue, dinnerNoteFr…), the fields to try next, and the locale for dates and sorting.
const LANGS = {
  en: { label: "EN", html: "en-GB", suffixes: [], locale: "en-GB" },
  zh: { label: "中文", html: "zh-Hant-TW", suffixes: ["Zh"], locale: "zh-TW" },
  yue: { label: "廣東話", html: "zh-Hant-HK", suffixes: ["Yue", "Zh"], locale: "zh-HK" },
  fr: { label: "FR", html: "fr-FR", suffixes: ["Fr"], locale: "fr-FR" },
  ja: { label: "日本語", html: "ja", suffixes: ["Ja"], locale: "ja-JP" },
  es: { label: "ES", html: "es-ES", suffixes: ["Es"], locale: "es-ES" },
  it: { label: "IT", html: "it-IT", suffixes: ["It"], locale: "it-IT" },
  ko: { label: "한국어", html: "ko", suffixes: ["Ko"], locale: "ko-KR" },
  da: { label: "DA", html: "da", suffixes: ["Da"], locale: "da-DK" },
  sv: { label: "SV", html: "sv", suffixes: ["Sv"], locale: "sv-SE" },
  is: { label: "IS", html: "is", suffixes: ["Is"], locale: "is-IS" },
  ca: { label: "CA", html: "ca", suffixes: ["Ca"], locale: "ca-ES" },
  th: { label: "ไทย", html: "th", suffixes: ["Th"], locale: "th-TH" }
};
// Languages added from 5 Oct 2026 (German, Dutch, Portuguese, Simplified Chinese…) live in assets/lang-<code>.js,
// which only the pages offering them load, just before this file. Each brings its LANGS entry, words, cuisine names and months.
const LANG_FILES = window.SB_LANGS || {};
for (const [k, x] of Object.entries(LANG_FILES)) { LANGS[k] = x.lang; I18N[k] = x.words; CUISINES[k] = x.cuisines; }
const DATA = JSON.parse(document.getElementById("page-data").textContent);
// The languages this page offers (Hong Kong adds Cantonese, France adds French, Japan adds Japanese).
const PAGE_LANGS = DATA.languages || ["en", "zh"];
// Destination pages have an address per language (/france/paris/, /fr/france/paris/), so search engines can find each one:
// DATA.langPaths lists them and DATA.lang says which this is. Other pages are English only and switch in place.
const LANG_PATHS = DATA.langPaths || null;
const params = new URLSearchParams(location.search);
// The owner's own devices: open any page with ?notrack=1 once and this browser stops counting in Umami and Google Analytics
// (?notrack=0 undoes it). "umami.disabled" is Umami's own switch; the rest of the site checks NOTRACK.
const NOTRACK_SET = params.get("notrack");
try { if (NOTRACK_SET === "1") localStorage.setItem("umami.disabled", "1"); else if (NOTRACK_SET === "0") localStorage.removeItem("umami.disabled"); } catch (e) {}
const NOTRACK = (() => { try { return localStorage.getItem("umami.disabled") === "1"; } catch (e) { return false; } })();
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const LANG_KEY = "starredbill-lang", WISHLIST_KEY = "starredbill-wishlist", PREFS_KEY = "starredbill-prefs";
function browserLang() {
  const b = (navigator.language || "").toLowerCase();
  if (LANGS.zhs && /^zh-(cn|sg|hans)/.test(b)) return "zhs";
  const base = { no: "nb", nn: "nb", tl: "fil" }[b.split("-")[0]] || b.split("-")[0];
  const loaded = Object.keys(LANG_FILES).find((k) => k === base);
  if (loaded) return loaded;
  return b === "zh-hk" || b === "zh-mo" ? "yue" : b.startsWith("zh") ? "zh" : b.startsWith("fr") ? "fr" : b.startsWith("ja") ? "ja" : b.startsWith("es") ? "es" : b.startsWith("it") ? "it" : b.startsWith("ko") ? "ko" : b.startsWith("da") ? "da" : b.startsWith("sv") ? "sv" : b.startsWith("is") ? "is" : b.startsWith("ca") ? "ca" : b.startsWith("th") ? "th" : "en";
}
// The visitor's choice, kept across pages even where it isn't offered. Opening a page's French address counts as choosing French.
const PARAM_LANG = LANGS[params.get("lang")] ? params.get("lang") : null;
const ADDRESS_LANG = LANG_PATHS && DATA.lang !== "en" ? DATA.lang : null;
let LANG_PREF = PARAM_LANG || ADDRESS_LANG || store.get(LANG_KEY, browserLang());
if (PARAM_LANG || ADDRESS_LANG) store.set(LANG_KEY, LANG_PREF);
// What this page shows: the choice if offered, any Chinese → the Chinese this page has, otherwise English.
function resolveLang(pref) {
  if (PAGE_LANGS.includes(pref)) return pref;
  if ((pref === "yue" || pref === "zhs") && PAGE_LANGS.includes("zh")) return "zh";
  if ((pref === "zh" || pref === "yue") && PAGE_LANGS.includes("zhs")) return "zhs";
  return "en";
}
let LANG = resolveLang(LANG_PREF);
// The address of this page in another language, keeping any search or filters. English carries ?lang=en,
// so a browser that can't save the choice isn't sent straight back to the language it guessed.
function langUrl(lang) {
  const q = new URLSearchParams(location.search);
  if (lang === "en") q.set("lang", "en"); else q.delete("lang");
  return LANG_PATHS[lang] + (q.toString() ? "?" + q : "") + location.hash;
}
// A visitor who reads another language this page offers goes to that version (search engines read English, so they stay).
const LANG_MOVING = !!(LANG_PATHS && LANG !== DATA.lang && LANG_PATHS[LANG]);
if (LANG_MOVING) location.replace(langUrl(LANG));
else if (LANG_PATHS && params.has("lang")) {
  // The address already says the language, so ?lang= comes out of it (and out of links shared from here).
  const q = new URLSearchParams(location.search); q.delete("lang");
  history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
}
// Switching language: on a destination page this opens that language's address (returning true), elsewhere it switches in place.
function setLang(lang) {
  LANG_PREF = lang;
  LANG = resolveLang(lang);
  store.set(LANG_KEY, LANG_PREF);
  if (LANG_PATHS) {
    if (LANG !== DATA.lang && LANG_PATHS[LANG]) { location.href = langUrl(LANG); return true; }
    return false;
  }
  const p = new URLSearchParams(location.search); p.set("lang", LANG_PREF);
  history.replaceState(null, "", location.pathname + "?" + p.toString() + location.hash);
  setHtmlLang();
}
// Arabic (lang-ar.js) sets dir: "rtl", which flips the page; assets/rtl.css holds the mirrored styles.
const rtl = () => LANGS[LANG].dir === "rtl";
const fwdArrow = () => rtl() ? "←" : "→";
function setHtmlLang() { document.documentElement.lang = LANGS[LANG].html; document.documentElement.dir = rtl() ? "rtl" : "ltr"; }
const loadWishlist = () => { const wl = store.get(WISHLIST_KEY, []); return Array.isArray(wl) ? wl.filter((x) => typeof x === "string") : []; };
// "Been there": restaurant id -> the date visited ("" when not given). Kept for signed-in people only (account.js).
const VISITED_KEY = "starredbill-visited";
const loadVisited = () => { const v = store.get(VISITED_KEY, {}); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; };
// Saving either list tells the page and the account code which restaurants changed.
// `from` is "sync" when the change came down from the account, so it isn't sent back up.
function setWishlist(list, from) {
  const before = loadWishlist();
  store.set(WISHLIST_KEY, list);
  const ids = before.filter((id) => !list.includes(id)).concat(list.filter((id) => !before.includes(id)));
  window.dispatchEvent(new CustomEvent("sb:wishlist", { detail: { ids, from: from || "" } }));
}
function setVisited(map, from) {
  const before = loadVisited();
  store.set(VISITED_KEY, map);
  const ids = Object.keys(before).filter((id) => !(id in map) || before[id] !== map[id]).concat(Object.keys(map).filter((id) => !(id in before)));
  window.dispatchEvent(new CustomEvent("sb:visited", { detail: { ids, from: from || "" } }));
}

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Chinese script (Mandarin, Cantonese or Simplified): changes date formats, sorting and which name is shown first.
const zh = () => LANG === "zh" || LANG === "yue" || LANG === "zhs";
const fr = () => LANG === "fr";
const ja = () => LANG === "ja";
const es = () => LANG === "es";
const it = () => LANG === "it";
const ko = () => LANG === "ko";
// Chinese or Japanese: dates read 2025年9月 and names in brackets use full-width ones.
const cjk = () => zh() || ja();
const locale = () => LANGS[LANG].locale;
// Each page sets this to the values every {placeholder} can use, e.g. { place: "London" }.
let pageVars = () => ({});
function t(key, vars) {
  let v = (I18N[LANG] && I18N[LANG][key]) ?? (LANG === "yue" ? I18N.zh[key] : undefined) ?? I18N.en[key] ?? key;
  if (typeof v !== "string") return v;
  vars = Object.assign(pageVars(), vars);
  if (v.includes("|")) { const [one, many] = v.split("|"); v = Number(vars.n) === 1 ? one : many; }
  return v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}
// A field in the current language when there is one, e.g. pick(r, "name") reads nameZh in Chinese.
function pick(o, f) {
  for (const sfx of LANGS[LANG].suffixes) if (o[f + sfx]) return o[f + sfx];
  return o[f] || "";
}
const nameOf = (r) => pick(r, "name");
// The name in a second script under the main one: the English name under a Chinese or Japanese one,
// otherwise the Japanese or Chinese name under the English one.
const altNameOf = (r) => ja() ? (r.nameJa ? r.name : "") : ko() ? (r.nameKo ? r.name : "") : zh() ? (nameOf(r) !== r.name ? r.name : r.nameJa || "") : (r.nameJa || r.nameKo || r.nameZh || r.nameZhs || "");
const altLangOf = (r) => altNameOf(r) === r.name ? "en" : altNameOf(r) === r.nameJa ? "ja" : altNameOf(r) === r.nameKo ? "ko" : altNameOf(r) === r.nameZhs ? "zh-Hans" : "zh-Hant";
const cuisineOf = (r) => {
  for (const sfx of LANGS[LANG].suffixes) if (r["cuisine" + sfx]) return r["cuisine" + sfx];
  const m = CUISINES[LANG];
  return (m && m[r.cuisine]) || r.cuisine;
};
const withLang = (path) => path + "?lang=" + LANG_PREF;
const MONTHS = { en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  es: ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."],
  it: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
  da: ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."],
  sv: ["jan.", "feb.", "mars", "apr.", "maj", "juni", "juli", "aug.", "sep.", "okt.", "nov.", "dec."],
  is: ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."],
  ca: ["gen.", "febr.", "març", "abr.", "maig", "juny", "jul.", "ag.", "set.", "oct.", "nov.", "des."],
  th: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."] };
for (const [k, x] of Object.entries(LANG_FILES)) MONTHS[k] = x.months;
const monthYear = (ym) => {
  const [y, m] = String(ym || "").split("-");
  if (!m) return y || "";
  return cjk() ? y + "年" + Number(m) + "月" : ko() ? y + "년 " + Number(m) + "월" : (MONTHS[LANG] || MONTHS.en)[Number(m) - 1] + " " + y;
};
const starIcons = (n) => '<span class="stars" aria-label="' + esc(t("starsAria", { n })) + '">' + '<svg><use href="#star"/></svg>'.repeat(n) + "</span>";
const heart = '<svg aria-hidden="true"><use href="#heart"/></svg>';
// A symbol made of letters, e.g. "DKK", gets a space before the amount: "DKK 4,400".
// How each country's menu prices treat service, from its serviceText: the receipt's footer line and the wishlist bill's estimate.
// [kind, percent usually added on top of the menu price (service, plus tax or tip where those come on top)]. Estimates only.
const SERVICE = {
  uk: ["before", 12.5], ireland: ["before", 12.5], "hong-kong": ["before", 10], macau: ["before", 10], taiwan: ["before", 10], china: ["before", 10],
  brazil: ["before", 10], philippines: ["before", 10], qatar: ["before", 10], uae: ["before", 10],  // UAE prices must include VAT (and mostly the municipality fee); hotels add 10% service
  hungary: ["before", 15],  // most upscale Budapest restaurants add 10–15% (Rumour and Babel 15%)
  singapore: ["plusplus", 19.9], thailand: ["plusplus", 17.7], malaysia: ["plusplus", 16.6], vietnam: ["plusplus", 13.4],  // ++: service, then tax on top (Malaysia's F&B service tax is 6%, Vietnam's VAT 8% to end-2026)
  usa: ["taxtip", 29], canada: ["taxtip", 30],  // sales tax about 9% (US) or 11% (Canada: 5% BC, 13% Ontario, 15% Québec), plus a tip of about 20% or 18–20%
  argentina: ["tip", 10], mexico: ["tip", 12.5], turkiye: ["tip", 10],
  japan: ["tax", 0],  // tax included; service is included in some sources' prices and not others
};
["andorra", "austria", "belgium", "croatia", "czechia", "denmark", "estonia", "finland", "france", "germany", "greece", "iceland", "italy", "latvia",
  "liechtenstein", "lithuania", "luxembourg", "malta", "monaco", "netherlands", "new-zealand", "norway", "poland", "portugal", "serbia", "slovenia", "south-korea",
  "spain", "sweden", "switzerland"].forEach((c) => { SERVICE[c] = ["included", 0]; });
const SERVICE_LABEL = { before: "m1Title", included: "rcptIncl", plusplus: "rcptPlus", taxtip: "rcptTaxTip", tip: "rcptTip", tax: "rcptTax" };
const serviceLabel = (country) => SERVICE_LABEL[(SERVICE[country] || ["before"])[0]];
// The share usually added on top of a menu price in that country, as a fraction (0.125 for 12.5%); unknown countries count as 0.
const serviceAdd = (country) => (SERVICE[country] || [0, 0])[1] / 100;
// When the prices were last checked, for the receipts' footer (destination pages and /compare/).
const PRICES_CHECKED = new Date("2026-10-15T12:00:00Z");
const symbolOf = (cur) => { const s = DATA.currencies[cur].symbol; return /[A-Za-z]$/.test(s) ? s + "\u00a0" : s; };
// Prices in a restaurant's own currency, e.g. "£195" or "NT$4,980".
function localMoney(n, cur) {
  if (n == null) return "";
  return symbolOf(cur) + n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}
// The site's rule: links to other websites open in a new tab, links within the site stay in the same tab.
// (The build sets this on every page; this catches links that scripts add afterwards.)
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a || !/^https?:/.test(a.href)) return;
  const external = new URL(a.href).host !== location.host;
  if (external && !a.target) { a.target = "_blank"; a.rel = a.rel || "noopener"; }
  if (!external && a.target === "_blank") a.removeAttribute("target");
}, true);

function langSwitchHtml() {
  return PAGE_LANGS.map((k) =>
    '<button type="button" data-lang="' + k + '" aria-pressed="' + (k === LANG) + '" lang="' + LANGS[k].html + '">' + LANGS[k].label + "</button>").join("");
}
function applyI18n() {
  setHtmlLang();
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelectorAll(".search-clear").forEach((b) => { b.setAttribute("aria-label", t("clearSearch")); b.title = t("clearSearch"); });
  $("langSwitch").innerHTML = langSwitchHtml();
  $("langSwitch").hidden = PAGE_LANGS.length < 2;  // English-only pages have no switch
  $("brandLink").href = withLang("/");
  $("wishLink").href = document.body.classList.contains("home") ? "#wishlist" : withLang("/") + "#wishlist";
  $("wishLink").setAttribute("aria-label", t("wishTitle"));
  $("searchLink").href = document.body.classList.contains("home") ? "#search" : withLang("/") + "#search";
  $("searchLink").setAttribute("aria-label", t($("q") ? "searchLabel" : "homeSearchLabel"));
  $("menuBtn").setAttribute("aria-label", t("menuOpen"));
  $("installBtn").textContent = t("installApp");
  labelShare();
  if (typeof renderAccountButton === "function") renderAccountButton();
  if (document.getElementById("cookieBar")) renderCookieBar(true);
  const tip = $("installTip");
  if (tip) tip.textContent = t("installTipIos");
}
// A search box's hint text: the longest of `texts` that fits the box, re-checked when the screen changes size,
// so phones get a shorter hint instead of one cut off mid-word. tHas() skips wording a language doesn't have yet.
const tHas = (key, vars) => (I18N[LANG] && I18N[LANG][key] != null) || (LANG === "yue" && I18N.zh[key] != null) || LANG === "en" ? t(key, vars) : null;
const fitted = new Map();
function fitPlaceholder(input, texts) {
  texts = texts.filter(Boolean);
  fitted.set(input, texts);
  const cs = getComputedStyle(input);
  const room = input.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4;
  if (room <= 0) { input.placeholder = texts[0]; return; }
  const ctx = (fitPlaceholder.ctx = fitPlaceholder.ctx || document.createElement("canvas").getContext("2d"));
  ctx.font = cs.fontStyle + " " + cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
  input.placeholder = texts.find((s) => ctx.measureText(s).width <= room) || texts[texts.length - 1];
}
let fitTimer = 0;
window.addEventListener("resize", () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => fitted.forEach((texts, input) => fitPlaceholder(input, texts)), 150); });
// Fonts arriving late change the widths, so check again once they're in.
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitted.forEach((texts, input) => fitPlaceholder(input, texts)));
// The × inside each search box: shows once something is typed, and clears it in one tap.
function wireSearchClear(input, onChange) {
  const btn = input.parentElement.querySelector(".search-clear");
  if (!btn) return;
  const sync = () => { btn.hidden = !input.value; };
  input.addEventListener("input", sync);
  btn.addEventListener("click", () => { input.value = ""; sync(); onChange(); input.focus(); });
  sync();
}
function renderWishCount() {
  const n = loadWishlist().filter((id) => DATA.knownIds ? DATA.knownIds.includes(id) : true).length;
  $("wishCount").textContent = n;
  $("wishLink").classList.toggle("has-items", n > 0);
}

// ---------- Google Maps ----------
let mapsBoot = null;
function loadGoogle() {
  if (!mapsBoot) mapsBoot = new Promise((resolve, reject) => {
    window.__starredBillMaps = resolve;
    const s = document.createElement("script");
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(GOOGLE_MAPS_API_KEY) + "&v=weekly&loading=async&language=" + ({ zh: "zh-TW", yue: "zh-HK", fr: "fr", ja: "ja", es: "es", it: "it", ko: "ko", da: "da", sv: "sv", is: "is", ca: "ca", th: "th" }[LANG] || LANGS[LANG].maps || "en-GB") + "&callback=__starredBillMaps";
    s.async = true;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return mapsBoot;
}
// hollow: a white pin with a coloured outline, for restaurants without prices on the site yet.
// lost: a smaller grey pin for a restaurant that lost its stars (stars is then how many it had).
function pinIcon(stars, hollow, lost) {
  const p = lost ? LOST_PIN : MAP_PINS[stars];
  const [w, h] = lost ? [24, 32] : [30, 40];
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h + "' viewBox='0 0 30 40'><path d='M15 38.5S2 26.6 2 15.5a13 13 0 0 1 26 0C28 26.6 15 38.5 15 38.5z' fill='" + (hollow ? "#ffffff" : p.fill) + "' stroke='" + (hollow ? p.line : p.edge) + "' stroke-width='" + (hollow ? 3 : 2) + "'/><text x='15' y='20.5' text-anchor='middle' font-family='Arial,sans-serif' font-size='13' font-weight='700' fill='" + (hollow ? p.lineInk : p.ink) + "'>" + stars + "</text></svg>";
  return { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg), scaledSize: new google.maps.Size(w, h), anchor: new google.maps.Point(w / 2, h - 1) };
}
function renderLegend(list) {
  $("mapLegend").setAttribute("aria-label", t("legendAria"));
  $("mapLegend").innerHTML = [1, 2, 3].map((s) =>
    "<li>" + legendPin(s) + "<span>" + esc(t("legendItem", { n: s })) + '</span><span class="count">' + list.filter((r) => r.stars === s).length + "</span></li>").join("");
}

// ---------- Near me ----------
// Distances in miles for UK and US English browsers, otherwise in kilometres.
const useMiles = () => LANG === "en" && /^en-(GB|US)\b/i.test(navigator.language || "");
function distanceText(m) {
  const v = useMiles() ? m / 1609.344 : m / 1000;
  return (v < 0.1 ? "< 0.1" : v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString(locale())) + (useMiles() ? " mi" : " km");
}
function metresBetween(a, b) {
  const r = (x) => x * Math.PI / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}
// Adds a "Near me" button to a map. It finds the visitor, marks them with a blue dot, frames the closest pins
// and lists them under the map in #nearBox.
//   points(): the pins that can be shown (or a promise of them), each { lat, lng, stars, name: () => text, open: () => {} }
//   radius:   how close counts as near, in metres; far: a link for when nothing is that close
function addNearMe(map, points, { radius = Infinity, far = null } = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "near-btn";
  const box = $("nearBox");
  let you = null, last = null;
  const label = (busy) => {
    btn.innerHTML = '<svg aria-hidden="true"><use href="#locate"/></svg><span>' + esc(t(busy ? "nearFinding" : "nearMe")) + "</span>";
    btn.setAttribute("aria-label", t("nearMeAria"));
    btn.disabled = !!busy;
  };
  const render = () => {
    if (!last) { box.hidden = true; return; }
    if (last.error) { box.innerHTML = '<p class="near-msg">' + esc(t(last.error)) + "</p>"; box.hidden = false; return; }
    const { near, closest } = last;
    box.innerHTML = near.length
      ? '<h3 class="near-title">' + esc(t("nearTitle")) + '</h3><ol class="near-list">' + near.map((x, i) =>
        '<li><button type="button" data-near="' + i + '"><span class="near-name">' + esc(x.name()) + " " + starIcons(x.stars) + '</span><span class="near-d">' +
        esc(t("nearAway", { d: distanceText(x.d) })) + "</span></button></li>").join("") + "</ol>"
      : '<p class="near-msg">' + esc(closest ? t("nearNone", { name: closest.name(), d: distanceText(closest.d) }) : t("mapNone")) +
        (far ? ' <a href="' + esc(far) + '">' + esc(t("nearWorld")) + " " + fwdArrow() + "</a>" : "") + "</p>";
    box.hidden = false;
  };
  box.addEventListener("click", (e) => {
    const b = e.target.closest("[data-near]");
    if (b && last && last.near) { last.near[Number(b.dataset.near)].open(); map.getDiv().scrollIntoView({ block: "center" }); }
  });
  btn.addEventListener("click", () => {
    if (!navigator.geolocation) { last = { error: "nearUnsupported" }; render(); return; }
    label(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (!you) {
        const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='26' height='26' viewBox='0 0 26 26'><circle cx='13' cy='13' r='12' fill='#1A73E8' fill-opacity='.2'/><circle cx='13' cy='13' r='7' fill='#1A73E8' stroke='#ffffff' stroke-width='3'/></svg>";
        you = new google.maps.Marker({ map, zIndex: 5000, clickable: false, icon: { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(26, 26), anchor: new google.maps.Point(13, 13) } });
      }
      you.setTitle(t("youAreHere"));
      you.setPosition(here);
      const all = (await points()).map((x) => Object.assign({ d: metresBetween(here, x) }, x)).sort((a, b) => a.d - b.d);
      const near = all.filter((x) => x.d <= radius).slice(0, 5);
      if (near.length) {
        const b = new google.maps.LatLngBounds(here);
        near.slice(0, 3).forEach((x) => b.extend(x));
        map.fitBounds(b, 60);
        google.maps.event.addListenerOnce(map, "idle", () => { if (map.getZoom() > 15) map.setZoom(15); });
      }
      last = { near, closest: all[0] };
      label(); render();
    }, (err) => {
      last = { error: err.code === 1 ? "nearDenied" : "nearFailed" };
      label(); render();
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  });
  label();
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(btn);
  // relabel() after a language change; locate() to start straight away.
  return { relabel: () => { if (!btn.disabled) label(); render(); }, locate: () => btn.click() };
}

// ---------- Share ----------
// The Share button in the header opens a small menu: the link with Copy link, the main networks, and on phones
// (and the installed app) a button for the phone's own share sheet, which reaches Instagram, Messages and the rest.
// The share sheet gets the link only, because some apps' Copy keeps just the text when both are given.
let shareText = () => t("shareTextHome");
let shareUrl = () => location.origin + location.pathname + (LANG_PREF !== "en" && !LANG_PATHS ? "?lang=" + LANG_PREF : "");
function renderSharePanel() {
  const url = shareUrl(), text = shareText(), e = encodeURIComponent;
  const links = [["X", "https://x.com/intent/post?text=" + e(text) + "&url=" + e(url)],
    ["Facebook", "https://www.facebook.com/sharer/sharer.php?u=" + e(url)],
    ["WhatsApp", "https://wa.me/?text=" + e(text + " " + url)],
    [t("shareEmail"), "mailto:?subject=" + e(document.title) + "&body=" + e(text + "\n\n" + url)]];
  $("sharePanel").innerHTML = '<p class="share-head">' + esc(t("shareTitle")) + "</p>" +
    '<div class="share-copy"><input type="text" readonly value="' + esc(url) + '" aria-label="' + esc(t("shareTitle")) + '"><button type="button" id="shareCopy">' + esc(t("shareCopy")) + "</button></div>" +
    '<div class="share-links">' + links.map(([label, href]) => '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + "</a>").join("") + "</div>" +
    (navigator.share ? '<button type="button" class="share-native" id="shareNative"><svg aria-hidden="true"><use href="#share"/></svg>' + esc(t("shareMore")) + "</button>"
      : '<p class="share-note">' + esc(t("shareInsta")) + "</p>");
}
async function copyShareLink() {
  const btn = $("shareCopy"), url = shareUrl();
  try { await navigator.clipboard.writeText(url); }
  catch (e) { const input = $("sharePanel").querySelector("input"); input.focus(); input.setSelectionRange(0, url.length); document.execCommand("copy"); }
  btn.textContent = t("shareCopied");
  setTimeout(() => { if ($("shareCopy")) $("shareCopy").textContent = t("shareCopy"); }, 2000);
}
function labelShare() {
  $("shareBtn").innerHTML = '<svg aria-hidden="true"><use href="#share"/></svg><span>' + esc(t("share")) + "</span>";
  $("shareBtn").setAttribute("aria-label", t("share"));  // phones show the icon only
  $("shareBtn").setAttribute("aria-label", t("shareAria"));
  if (!$("sharePanel").hidden) renderSharePanel();
}
$("shareBtn").addEventListener("click", () => {
  const panel = $("sharePanel");
  if (!panel.hidden) { panel.hidden = true; $("shareBtn").setAttribute("aria-expanded", "false"); return; }
  renderSharePanel();
  // Placed under the button but kept on screen, whichever way the header has wrapped.
  const r = $("shareBtn").getBoundingClientRect(), vw = document.documentElement.clientWidth, w = Math.min(340, vw - 32);
  panel.style.top = r.bottom + 10 + "px";
  panel.style.right = Math.min(Math.max(16, vw - r.right), vw - w - 16) + "px";
  panel.hidden = false;
  $("shareBtn").setAttribute("aria-expanded", "true");
});
$("sharePanel").addEventListener("click", (e) => {
  if (e.target.id === "shareCopy") copyShareLink();
  if (e.target.closest("#shareNative")) navigator.share({ title: document.title, url: shareUrl() }).catch(() => {});
});
document.addEventListener("click", (e) => {
  if (!$("sharePanel").hidden && !e.target.closest("#sharePanel, #shareBtn")) { $("sharePanel").hidden = true; $("shareBtn").setAttribute("aria-expanded", "false"); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("sharePanel").hidden) { $("sharePanel").hidden = true; $("shareBtn").focus(); } });
window.addEventListener("scroll", () => { if (!$("sharePanel").hidden && Math.abs($("shareBtn").getBoundingClientRect().bottom + 10 - parseFloat($("sharePanel").style.top)) > 4) $("sharePanel").hidden = true; }, { passive: true });

// ---------- Phone and tablet header ----------
// On phones and tablets (1140px and below) the header keeps one row: the logo, search, the wishlist and a menu button. The menu holds the section
// links, Sign in and Share. Search jumps to the page's own search box, or the homepage's on pages without one.
function setMenu(open) {
  document.querySelector(".site-header").classList.toggle("menu-open", open);
  $("menuBtn").setAttribute("aria-expanded", String(open));
}
const menuOpen = () => $("menuBtn").getAttribute("aria-expanded") === "true";
$("menuBtn").addEventListener("click", () => setMenu(!menuOpen()));
document.addEventListener("click", (e) => {
  if (menuOpen() && (e.target.closest("#headerMenu a, #accountBtn") || !e.target.closest("#headerMenu, #menuBtn, #sharePanel"))) setMenu(false);
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen()) { setMenu(false); $("menuBtn").focus(); } });
matchMedia("(min-width: 1141px)").addEventListener("change", () => setMenu(false));
$("searchLink").addEventListener("click", (e) => {
  const box = $("q") || $("homeQ");
  if (!box) return;
  e.preventDefault();
  box.focus({ preventScroll: true });
  box.scrollIntoView({ block: "center" });
});
if (location.hash === "#search" && $("homeQ")) addEventListener("load", () => $("homeQ").focus({ preventScroll: true }));

// ---------- Install as an app ----------
// Android and desktop Chrome offer an install prompt; iPhone and iPad need Safari's "Add to Home Screen".
let installPrompt = null;
const isInstalled = () => navigator.standalone || matchMedia("(display-mode: standalone)").matches;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installPrompt = e; $("installBtn").hidden = false; });
window.addEventListener("appinstalled", () => { installPrompt = null; $("installBtn").hidden = true; });
if (isIos() && !isInstalled()) $("installBtn").hidden = false;
$("installBtn").addEventListener("click", async () => {
  if (installPrompt) {
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    $("installBtn").hidden = true;
    return;
  }
  let tip = $("installTip");
  if (tip) { tip.remove(); return; }
  tip = document.createElement("p");
  tip.id = "installTip";
  tip.className = "install-tip";
  tip.setAttribute("role", "status");
  tip.textContent = t("installTipIos");
  $("installBtn").closest(".wrap").appendChild(tip);
});
// ---------- Visit statistics ----------
// Umami (cloud.umami.is) counts visits without cookies; these are the clicks it records as events.
// Never send names, emails or anything personal: restaurant names, page addresses and choices only.
function track(name, data) {
  if (NOTRACK) return;
  try { if (window.umami && typeof window.umami.track === "function") window.umami.track(name, data); } catch (e) {}
  try {
    if (window.gtag && !window["ga-disable-" + GA_ID]) {
      window.gtag("event", name.replace(/-/g, "_"), data || {});
      if (name === "account-created") window.gtag("event", "sign_up", { method: (data && data.method) || "email" });
    }
  } catch (e) {}
}
// Google Analytics: only on the live site, and only after the visitor clicks Accept on the cookie banner.
const GA_ID = "G-GE1KG403N4", CONSENT_KEY = "starredbill-consent", GA_HOSTS = ["starredbill.com", "www.starredbill.com"];
const consentChoice = () => store.get(CONSENT_KEY, "");
function loadAnalytics() {
  if (NOTRACK) return;
  window["ga-disable-" + GA_ID] = false;
  if (window.gtag || !GA_HOSTS.includes(location.hostname)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID);
  const s = document.createElement("script");
  s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
  document.head.appendChild(s);
}
function stopAnalytics() {
  window["ga-disable-" + GA_ID] = true;
  // Remove Google's cookies from this site and its parent domain.
  document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter((n) => /^_ga/.test(n)).forEach((n) => {
    [location.hostname, "." + location.hostname.replace(/^www\./, "")].forEach((d) => { document.cookie = n + "=; Max-Age=0; path=/; domain=" + d; });
    document.cookie = n + "=; Max-Age=0; path=/";
  });
}
// The banner: shown until the visitor chooses, and again from "Change cookie choice" on the privacy page.
function renderCookieBar(force) {
  let bar = document.getElementById("cookieBar");
  if (!force && (consentChoice() || (!bar && !document.body))) { if (bar && consentChoice()) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "cookieBar"; bar.className = "cookie-bar"; bar.setAttribute("role", "region");
    document.body.appendChild(bar);
  }
  bar.setAttribute("aria-label", t("cookieSettings"));
  bar.innerHTML = '<p>' + esc(t("cookieText")) + ' <a href="' + withLang("/privacy/") + '">' + esc(t("acctPrivacy")) + "</a></p>" +
    '<div class="cookie-actions"><button type="button" data-consent="denied">' + esc(t("cookieReject")) + '</button><button type="button" data-consent="granted">' + esc(t("cookieAccept")) + "</button></div>";
}
function setConsent(choice) {
  store.set(CONSENT_KEY, choice);
  if (choice === "granted") loadAnalytics(); else stopAnalytics();
  const bar = document.getElementById("cookieBar");
  if (bar) bar.remove();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-consent], [data-cookie-settings]");
  if (!b) return;
  if (b.dataset.consent) { setConsent(b.dataset.consent); track("cookie-choice", { choice: b.dataset.consent }); }
  else renderCookieBar(true);
});
const rowName = (el) => { const row = el.closest(".row"); const th = row && row.querySelector("[data-name]"); return th ? th.dataset.name.slice(0, 80) : ""; };
document.addEventListener("click", (e) => {
  const el = e.target.closest("a, button");
  if (!el) return;
  if (el.tagName === "A" && /^https?:/.test(el.href) && new URL(el.href).host !== location.host) {
    const host = new URL(el.href).host.replace(/^www\./, "");
    const kind = el.closest("#sharePanel") ? "share" : el.classList.contains("src") ? "price-source" : el.classList.contains("map") || /google\.[a-z.]+\/maps/.test(el.href) ? "google-maps" : "other";
    if (kind === "share") track("share", { via: el.textContent.trim() });
    else track("outbound", { kind, to: host, restaurant: rowName(el) });
    return;
  }
  if (el.dataset.lang) track("language", { lang: el.dataset.lang });
  else if (el.dataset.currency) track("currency", { currency: el.dataset.currency });
  else if (el.dataset.meal) track("meal", { meal: el.dataset.meal });
  else if (el.id === "shareBtn") track("share-open");
  else if (el.id === "shareCopy") track("share", { via: "copy-link" });
  else if (el.id === "shareNative") track("share", { via: "phone-share" });
  else if (el.id === "jumpMap") track("jump-to-map");
  else if (el.classList.contains("near-btn")) track("near-me");
});
// Searches, once the visitor pauses typing.
let searchTimer = null;
document.addEventListener("input", (e) => {
  const el = e.target;
  if (!el.matches || !el.matches("#q, #homeQ, #mapQ")) return;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { const q = el.value.trim(); if (q.length >= 2) track("search", { q: q.slice(0, 50), box: el.id }); }, 1500);
});
// Wishlist and been-there changes made on this device (not ones brought in from the account).
["sb:wishlist", "sb:visited"].forEach((ev) => window.addEventListener(ev, (e) => {
  if (!e.detail || e.detail.from === "sync") return;
  const list = ev === "sb:wishlist" ? loadWishlist() : Object.keys(loadVisited());
  (e.detail.ids || []).forEach((id) => track(ev === "sb:wishlist" ? "wishlist" : "been-there", { action: list.includes(id) ? "add" : "remove", restaurant: id }));
}));

if (NOTRACK) stopAnalytics();
else if (consentChoice() === "granted") loadAnalytics(); else if (!consentChoice()) renderCookieBar();
// Confirm the switch, then take it out of the address so it isn't shared by accident.
if (NOTRACK_SET === "1" || NOTRACK_SET === "0") {
  const note = document.createElement("div");
  note.className = "cookie-bar"; note.setAttribute("role", "status");
  note.innerHTML = "<p>" + esc(t(NOTRACK_SET === "1" ? "notrackOn" : "notrackOff")) + "</p>";
  document.body.appendChild(note);
  setTimeout(() => note.remove(), 6000);
  const q = new URLSearchParams(location.search); q.delete("notrack");
  history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
}
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  // When an update takes over a page that an older version was already running (e.g. the home-screen app reopened
  // after an update), reload once so the page and its files match. A first visit has no older version, so it doesn't reload.
  if (navigator.serviceWorker.controller) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloaded) { reloaded = true; location.reload(); } });
  }
}
