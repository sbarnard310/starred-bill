// Shared by every page: settings, words in English and Traditional Chinese, and small helpers.

// ---------- Settings ----------
// Google Maps Platform browser key, used for restaurant photos and the maps.
// Leave empty to show lettered placeholders and hide the maps.
const GOOGLE_MAPS_API_KEY = "AIzaSyA5AnpHOqFXxb6U3hDiXuAyQK2dIbZgLT4";
const MAP_PIN_COLOURS = { 1: "#673AB7", 2: "#F9A825", 3: "#097138" };

// ---------- Words (English, Traditional Chinese, French, Cantonese, Japanese, Spanish and Italian) ----------
// {place} is the page's place name and {placeIn} the same name as it reads mid-sentence ("the UK").
// "one|many" picks the singular when {n} is 1.
const I18N = {
  en: {
    destJump: "Jump to a country",
    notrackOn: "This browser is no longer counted in the visit statistics.", notrackOff: "This browser is counted in the visit statistics again.",
    destAreas: "Regions and cities", destRegions: "Regions", destCityList: "Cities",
    cookieText: "Can we use Google Analytics cookies to see how people use the site? Visits are counted without cookies either way.", cookieAccept: "Accept", cookieReject: "Reject", cookieSettings: "Change cookie choice",
    navCompare: "Compare", navMap: "Map", navStars: "By stars", navMethod: "Method", navContact: "Contact", navDestinations: "Destinations", wishlist: "Wishlist",
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
    searchPh: "Search by restaurant, cuisine or area", searchPhEx: "Search by restaurant, cuisine or area, e.g. “{ex}”",
    searchLabel: "Search restaurants by name, cuisine or area",
    sortLabel: "Sort restaurants",
    sortPriceAsc: "Dinner: low to high", sortPriceDesc: "Dinner: high to low", sortStars: "Most stars first", sortRating: "Google rating: highest first", sortName: "Name A–Z",
    fShow: "Show", fStars: "Michelin stars", fCuisine: "Cuisine",
    showAll: "All restaurants", showChanges: "Recent star changes", showWish: "My wishlist",
    showChangesTitle: "Gained or lost a star in one of the last two Michelin Guides",
    all: "All", starsAria: "{n} Michelin star|{n} Michelin stars",
    hRestaurant: "Restaurant", hCuisine: "Cuisine", hStars: "Stars", hGoogle: "Google", hNotes: "Dinner notes", hPrice: "Price", hWine: "Wine pairing", hWish: "Wishlist",
    tableLabel: "Restaurant prices",
    reviews: "{n} reviews", ratingAria: "Google rating {r} out of 5",
    srcSite: "Restaurant website", srcPress: "Review source", srcTitle: "Where this price came from",
    perMain: "per main", typicalSpend: "typical spend", notListed: "Not listed",
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
    showing: "Showing {a} of {b} starred restaurants", showingFormer: ", plus {c} no longer starred",
    wishNote: "Your wishlist is saved in this browser only.",
    wishAdd: "Add {name} to your wishlist", wishRemove: "Remove {name} from your wishlist", wishAddT: "Add to wishlist", wishRemoveT: "Remove from wishlist",
    toastAdded: "Added {name} to your wishlist", toastRemoved: "Removed {name} from your wishlist", undo: "Undo",
    photo: "Photo", tempClosed: "Temporarily closed (Google)",
    mapTitle: "Every starred table on one map",
    mapText: "The pins follow the filters in the list above, so choose a star level, a cuisine or your wishlist and the map updates to match. Tap a pin for the price and a link to directions.",
    mapWait: "The map loads as you scroll here.", mapLabel: "Map of Michelin-starred restaurants",
    mapError: "The map couldn't load right now. The pin next to each restaurant in the list still opens it in Google Maps.",
    legendAria: "What the pin colours mean", colours: ["Purple", "Amber", "Green"], legendItem: "{c} = {n} Michelin star|{c} = {n} Michelin stars",
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
    acctGoogle: "Continue with Google", acctOr: "or", acctEmailLabel: "Email address", acctSend: "Email me a sign-in link", acctSending: "Sending…",
    acctSent: "Check your email. We've sent a sign-in link to {email}. Open it on this device to finish signing in.",
    acctTooMany: "Too many sign-in emails just now. Wait a minute, then try again.", acctFailed: "That didn't work. Check the email address and try again.",
    acctBadEmail: "Enter a full email address, e.g. name@example.com.", acctSmall: "Free, and no password to remember. We only use your email to sign you in.",
    acctPrivacy: "Privacy notice", acctClose: "Close", acctWelcome: "You're signed in. Your wishlist now follows you to any device.",
    acctLinkExpired: "That sign-in link has expired or was already used. Tap Sign in to get a new one.",
    been: "Been there", beenAdd: "Mark {name} as been there", beenRemove: "Remove {name} from been there", beenAddT: "Mark as been there", beenRemoveT: "Remove from been there",
    toastBeen: "Marked {name} as been there", toastNotBeen: "Removed {name} from been there", showBeen: "Been there",
    beenProgress: "You've been to {n} of the {total} here.", wishNoteOut: "Your wishlist is saved on this device only.", wishNoteSignIn: "Sign in to keep it on every device",
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
    sent: "Thanks, {name}. This is a preview form, so messages aren't sent yet.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Prices and ratings checked October 2026. Check with each restaurant before booking.",
    rateLine: "Prices in {sym} are approximate, using the exchange rate on {date}: {sym}1 = {home}{rate}.",
    rateLineMixed: "Prices are converted to {sym} using the exchange rate on {date}, so they're approximate.",
    currencyAria: "Show prices in", crumbsAria: "Where you are",
    // Homepage
    homeTitle: "The Starred Bill · Michelin-starred restaurant prices",
    homeEyebrow: "Michelin Guide restaurants, priced",
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
    mapSearchPh: "Search the map: restaurant, city or country", mapSearchLabel: "Search the map for a restaurant, city or country",
    mapHomeWorldText: "All {n} Michelin-starred restaurants in the world. Filled pins have full price comparisons on this site; outlined pins link to the MICHELIN Guide until we add their prices. Zoom in to see individual restaurants.",
    infoNoPricesYet: "No prices on The Starred Bill yet", infoMichelin: "MICHELIN Guide", legendHollow: "Outlined = no prices yet",
    installApp: "Install app",
    installTipIos: "To install: tap the Share button (the square with an arrow) in Safari, then choose “Add to Home Screen”."
  },
  zh: {
    destJump: "跳至國家或地區",
    notrackOn: "此瀏覽器已不再計入瀏覽統計。", notrackOff: "此瀏覽器已重新計入瀏覽統計。",
    destAreas: "地區與城市", destRegions: "地區", destCityList: "城市",
    cookieText: "我們可以使用 Google Analytics Cookie 來了解大家如何使用本網站嗎？無論你怎麼選，我們都只以不使用 Cookie 的方式計算瀏覽量。", cookieAccept: "接受", cookieReject: "拒絕", cookieSettings: "更改 Cookie 選擇",
    navCompare: "比較", navMap: "地圖", navStars: "星級", navMethod: "說明", navContact: "聯絡我們", navDestinations: "目的地", wishlist: "願望清單",
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
    searchPh: "搜尋餐廳、料理或地區", searchPhEx: "搜尋餐廳、料理或地區，例如「{ex}」",
    searchLabel: "依名稱、料理或地區搜尋餐廳",
    sortLabel: "排序",
    sortPriceAsc: "晚餐：由低到高", sortPriceDesc: "晚餐：由高到低", sortStars: "星級由高到低", sortRating: "Google 評分由高到低", sortName: "依名稱排序",
    fShow: "顯示", fStars: "米其林星級", fCuisine: "料理類型",
    showAll: "全部餐廳", showChanges: "近期星級變動", showWish: "我的願望清單",
    showChangesTitle: "在最近兩版米其林指南中獲得或失去星級",
    all: "全部", starsAria: "米其林 {n} 星",
    hRestaurant: "餐廳", hCuisine: "料理", hStars: "星級", hGoogle: "Google", hNotes: "晚餐說明", hPrice: "價格", hWine: "餐酒搭配", hWish: "願望清單",
    tableLabel: "餐廳價格",
    reviews: "{n} 則評論", ratingAria: "Google 評分 {r}（滿分 5）",
    srcSite: "餐廳官網", srcPress: "評論來源", srcTitle: "價格資料來源",
    perMain: "每道主菜", typicalSpend: "人均消費", notListed: "未公布",
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
    showing: "顯示 {b} 家星級餐廳中的 {a} 家", showingFormer: "，另有 {c} 家已不再是星級",
    wishNote: "願望清單只儲存在這個瀏覽器中。",
    wishAdd: "將{name}加入願望清單", wishRemove: "將{name}從願望清單移除", wishAddT: "加入願望清單", wishRemoveT: "從願望清單移除",
    toastAdded: "已將{name}加入願望清單", toastRemoved: "已將{name}從願望清單移除", undo: "復原",
    photo: "照片", tempClosed: "暫停營業（Google）",
    mapTitle: "所有星級餐廳一圖看盡",
    mapText: "地圖上的標記會跟著上方清單的篩選條件變化：選擇星級、料理或願望清單，地圖就會同步更新。點選標記可查看價格與導航連結。",
    mapWait: "捲動到這裡時會載入地圖。", mapLabel: "米其林星級餐廳地圖",
    mapError: "地圖暫時無法載入。清單中每家餐廳旁的地標圖示仍可在 Google 地圖開啟。",
    legendAria: "地標顏色說明", colours: ["紫色", "琥珀色", "綠色"], legendItem: "{c} = 米其林 {n} 星",
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
    acctGoogle: "使用 Google 繼續", acctOr: "或", acctEmailLabel: "電子郵件地址", acctSend: "寄送登入連結給我", acctSending: "寄送中…",
    acctSent: "請查看電子郵件。我們已將登入連結寄到 {email}，請在這部裝置上開啟以完成登入。",
    acctTooMany: "登入郵件寄送次數過多，請稍候一分鐘再試。", acctFailed: "未能完成，請檢查電子郵件地址後再試一次。",
    acctBadEmail: "請輸入完整的電子郵件地址，例如 name@example.com。", acctSmall: "免費，而且不必記密碼。我們只用你的電子郵件讓你登入。",
    acctPrivacy: "隱私權聲明", acctClose: "關閉", acctWelcome: "你已登入。你的願望清單現在會在每部裝置上同步。",
    acctLinkExpired: "這個登入連結已過期或已使用過，請點選「登入」取得新連結。",
    been: "去過了", beenAdd: "將{name}標示為去過", beenRemove: "取消{name}的去過標示", beenAddT: "標示為去過", beenRemoveT: "取消去過標示",
    toastBeen: "已將{name}標示為去過", toastNotBeen: "已取消{name}的去過標示", showBeen: "去過了",
    beenProgress: "這裡的 {total} 家餐廳中，你去過 {n} 家。", wishNoteOut: "你的願望清單只儲存在這部裝置上。", wishNoteSignIn: "登入即可在每部裝置上保留",
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
    sent: "謝謝你，{name}。這是預覽表單，訊息目前不會寄出。",
    footEdition: "The Starred Bill・{place}",
    footNote: "價格與評分於 2026 年 10 月查核，訂位前請向餐廳確認。",
    rateLine: "{sym} 價格依 {date} 匯率換算，僅供參考：{sym}1 = {home}{rate}。",
    rateLineMixed: "價格依 {date} 匯率換算為 {sym}，僅供參考。",
    currencyAria: "價格顯示幣別", crumbsAria: "目前位置",
    homeTitle: "The Starred Bill・米其林星級餐廳價格",
    homeEyebrow: "米其林指南餐廳價格一覽",
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
    mapSearchPh: "在地圖上搜尋餐廳、城市或國家", mapSearchLabel: "在地圖上搜尋餐廳、城市或國家"
  },
  fr: {
    destJump: "Aller à un pays",
    notrackOn: "Ce navigateur n'est plus compté dans les statistiques de visite.", notrackOff: "Ce navigateur est de nouveau compté dans les statistiques de visite.",
    destAreas: "Régions et villes", destRegions: "Régions", destCityList: "Villes",
    cookieText: "Pouvons-nous utiliser les cookies de Google Analytics pour comprendre comment le site est utilisé ? Les visites sont comptées sans cookies dans tous les cas.", cookieAccept: "Accepter", cookieReject: "Refuser", cookieSettings: "Modifier mon choix de cookies",
    navCompare: "Comparer", navMap: "Carte", navStars: "Par étoiles", navMethod: "Méthode", navContact: "Contact", navDestinations: "Destinations", wishlist: "Envies",
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
    searchPh: "Chercher un restaurant, une cuisine ou un quartier", searchPhEx: "Chercher un restaurant, une cuisine ou un quartier, ex. « {ex} »",
    searchLabel: "Chercher un restaurant par nom, cuisine ou quartier", sortLabel: "Trier les restaurants",
    sortPriceAsc: "Dîner : du moins cher au plus cher", sortPriceDesc: "Dîner : du plus cher au moins cher", sortStars: "Le plus d'étoiles d'abord", sortRating: "Note Google : la meilleure d'abord", sortName: "Nom de A à Z",
    fShow: "Afficher", fStars: "Étoiles Michelin", fCuisine: "Cuisine",
    showAll: "Tous les restaurants", showChanges: "Changements récents", showWish: "Mes envies",
    showChangesTitle: "Étoile gagnée ou perdue dans l'un des deux derniers guides Michelin",
    all: "Tous", starsAria: "{n} étoile Michelin|{n} étoiles Michelin",
    hRestaurant: "Restaurant", hCuisine: "Cuisine", hStars: "Étoiles", hGoogle: "Google", hNotes: "Dîner", hPrice: "Prix", hWine: "Accord mets-vins", hWish: "Envies",
    tableLabel: "Prix des restaurants",
    reviews: "{n} avis", ratingAria: "Note Google : {r} sur 5",
    srcSite: "Site du restaurant", srcPress: "Source", srcTitle: "D'où vient ce prix",
    perMain: "par plat", typicalSpend: "dépense moyenne", notListed: "Non communiqué",
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
    showing: "{a} restaurants étoilés affichés sur {b}", showingFormer: ", plus {c} qui ne le sont plus",
    wishNote: "Vos envies sont enregistrées uniquement dans ce navigateur.",
    wishAdd: "Ajouter {name} à vos envies", wishRemove: "Retirer {name} de vos envies", wishAddT: "Ajouter à mes envies", wishRemoveT: "Retirer de mes envies",
    toastAdded: "{name} ajouté à vos envies", toastRemoved: "{name} retiré de vos envies", undo: "Annuler",
    photo: "Photo", tempClosed: "Fermé temporairement (Google)",
    mapTitle: "Toutes les tables étoilées sur une carte",
    mapText: "Les repères suivent les filtres de la liste ci-dessus : choisissez un niveau d'étoiles, une cuisine ou vos envies, et la carte s'adapte. Touchez un repère pour voir le prix et l'itinéraire.",
    mapWait: "La carte se charge quand vous arrivez ici.", mapLabel: "Carte des restaurants étoilés Michelin",
    mapError: "La carte n'a pas pu se charger. Le repère à côté de chaque restaurant de la liste l'ouvre toujours dans Google Maps.",
    legendAria: "Signification des couleurs des repères", colours: ["Violet", "Ambre", "Vert"], legendItem: "{c} = {n} étoile Michelin|{c} = {n} étoiles Michelin",
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
    acctGoogle: "Continuer avec Google", acctOr: "ou", acctEmailLabel: "Adresse e-mail", acctSend: "Recevoir un lien de connexion", acctSending: "Envoi…",
    acctSent: "Consultez vos e-mails. Nous avons envoyé un lien de connexion à {email}. Ouvrez-le sur cet appareil pour terminer.",
    acctTooMany: "Trop d'e-mails de connexion pour le moment. Attendez une minute, puis réessayez.", acctFailed: "Cela n'a pas fonctionné. Vérifiez l'adresse e-mail et réessayez.",
    acctBadEmail: "Saisissez une adresse e-mail complète, par exemple nom@exemple.fr.", acctSmall: "Gratuit, sans mot de passe à retenir. Votre e-mail ne sert qu'à vous connecter.",
    acctPrivacy: "Confidentialité", acctClose: "Fermer", acctWelcome: "Vous êtes connecté. Vos envies vous suivent désormais sur tous vos appareils.",
    acctLinkExpired: "Ce lien de connexion a expiré ou a déjà servi. Touchez Connexion pour en recevoir un nouveau.",
    been: "J'y suis allé", beenAdd: "Marquer {name} comme visité", beenRemove: "Retirer {name} des restaurants visités", beenAddT: "Marquer comme visité", beenRemoveT: "Retirer des restaurants visités",
    toastBeen: "{name} marqué comme visité", toastNotBeen: "{name} retiré des restaurants visités", showBeen: "Visités",
    beenProgress: "Vous êtes allé dans {n} des {total} restaurants ici.", wishNoteOut: "Vos envies sont enregistrées sur cet appareil uniquement.", wishNoteSignIn: "Connectez-vous pour les retrouver partout",
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
    sent: "Merci, {name}. Ce formulaire est un aperçu : les messages ne sont pas encore envoyés.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Prix et notes vérifiés en octobre 2026. Renseignez-vous auprès de chaque restaurant avant de réserver.",
    rateLine: "Les prix en {sym} sont approximatifs, au taux de change du {date} : {sym}1 = {home}{rate}.",
    rateLineMixed: "Les prix sont convertis en {sym} au taux de change du {date} ; ils sont donc approximatifs.",
    currencyAria: "Afficher les prix en", crumbsAria: "Vous êtes ici",
    wishTitle: "Vos envies", installApp: "Installer l'appli",
    installTipIos: "Pour l'installer : touchez le bouton Partager (le carré avec une flèche) dans Safari, puis « Sur l'écran d'accueil ».",
    clearSearch: "Effacer la recherche", photoView: "Agrandir la photo de {name}", photoClose: "Fermer"
  },
  yue: {
    destJump: "跳去國家或地區",
    notrackOn: "呢個瀏覽器已經唔再計入瀏覽統計。", notrackOff: "呢個瀏覽器已經重新計入瀏覽統計。",
    destAreas: "地區同城市", destRegions: "地區", destCityList: "城市",
    cookieText: "我哋可唔可以用 Google Analytics Cookie 嚟了解大家點樣用呢個網站？無論你點揀，我哋都只會用唔使 Cookie 嘅方法計瀏覽量。", cookieAccept: "接受", cookieReject: "拒絕", cookieSettings: "更改 Cookie 選擇",
    navCompare: "比較", navMap: "地圖", navStars: "星級", navMethod: "點樣計", navContact: "聯絡我哋", navDestinations: "目的地", wishlist: "心水清單",
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
    searchPh: "搵餐廳、菜式或者地區", searchPhEx: "搵餐廳、菜式或者地區，例如「{ex}」",
    searchLabel: "用名、菜式或者地區搵餐廳", sortLabel: "排序",
    sortPriceAsc: "晚市：由平到貴", sortPriceDesc: "晚市：由貴到平", sortStars: "星數多嘅先", sortRating: "Google 評分高嘅先", sortName: "按名排序",
    fShow: "顯示", fStars: "米芝蓮星級", fCuisine: "菜式",
    showAll: "全部餐廳", showChanges: "最近星級變動", showWish: "我嘅心水清單",
    showChangesTitle: "喺最近兩版米芝蓮指南攞到或者甩咗星",
    all: "全部", starsAria: "米芝蓮 {n} 星",
    hRestaurant: "餐廳", hCuisine: "菜式", hStars: "星級", hGoogle: "Google", hNotes: "晚市備註", hPrice: "價錢", hWine: "配酒", hWish: "心水清單",
    tableLabel: "餐廳價錢",
    reviews: "{n} 個評論", ratingAria: "Google 評分 {r}（滿分 5）",
    srcSite: "餐廳官網", srcPress: "資料來源", srcTitle: "價錢嘅來源",
    perMain: "每道主菜", typicalSpend: "人均消費", notListed: "未有公布",
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
    showing: "{b} 間星級餐廳之中顯示緊 {a} 間", showingFormer: "，另外仲有 {c} 間已經冇星",
    wishNote: "心水清單只會儲喺呢個瀏覽器。",
    wishAdd: "將{name}加入心水清單", wishRemove: "將{name}移出心水清單", wishAddT: "加入心水清單", wishRemoveT: "移出心水清單",
    toastAdded: "已經將{name}加入心水清單", toastRemoved: "已經將{name}移出心水清單", undo: "還原",
    photo: "相片", tempClosed: "暫停營業（Google）",
    mapTitle: "所有星級餐廳一張地圖睇晒",
    mapText: "地圖上嘅標記會跟住上面清單嘅篩選改變：揀星級、菜式或者心水清單，地圖就會即刻更新。撳標記就睇到價錢同導航連結。",
    mapWait: "碌到呢度就會載入地圖。", mapLabel: "米芝蓮星級餐廳地圖",
    mapError: "地圖暫時載入唔到。清單入面每間餐廳旁邊嘅標記一樣可以喺 Google 地圖打開。",
    legendAria: "標記顏色代表咩", colours: ["紫色", "琥珀色", "綠色"], legendItem: "{c} = 米芝蓮 {n} 星",
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
    acctGoogle: "用 Google 繼續", acctOr: "或者", acctEmailLabel: "電郵地址", acctSend: "電郵登入連結俾我", acctSending: "寄緊…",
    acctSent: "請睇下你嘅電郵。我哋已經將登入連結寄咗去 {email}，喺呢部裝置打開就可以完成登入。",
    acctTooMany: "登入電郵寄得太密，請等一分鐘再試。", acctFailed: "做唔到，請檢查電郵地址再試多次。",
    acctBadEmail: "請輸入完整嘅電郵地址，例如 name@example.com。", acctSmall: "免費，唔使記密碼。我哋只會用你嘅電郵嚟登入。",
    acctPrivacy: "私隱聲明", acctClose: "關閉", acctWelcome: "你已經登入。你嘅心水清單而家會喺每部裝置同步。",
    acctLinkExpired: "呢條登入連結已經過期或者用過，請撳「登入」攞條新嘅。",
    been: "去過", beenAdd: "將{name}標示為去過", beenRemove: "取消{name}嘅去過標示", beenAddT: "標示為去過", beenRemoveT: "取消去過標示",
    toastBeen: "已經將{name}標示為去過", toastNotBeen: "已經取消{name}嘅去過標示", showBeen: "去過",
    beenProgress: "呢度 {total} 間餐廳入面，你去過 {n} 間。", wishNoteOut: "你嘅心水清單只係儲喺呢部裝置。", wishNoteSignIn: "登入就可以喺每部裝置保留",
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
    sent: "多謝你，{name}。呢個係預覽表格，訊息暫時唔會寄出。",
    footEdition: "The Starred Bill・{place}",
    footNote: "價錢同評分喺2026年10月核實過，訂枱之前請向餐廳確認。",
    rateLine: "{sym} 價錢按 {date} 匯率計，只供參考：{sym}1 = {home}{rate}。",
    rateLineMixed: "價錢按 {date} 匯率換算成 {sym}，只供參考。",
    currencyAria: "價錢顯示貨幣", crumbsAria: "你而家喺度",
    wishTitle: "你嘅心水清單", installApp: "加到主畫面",
    installTipIos: "安裝方法：喺 Safari 撳分享掣（有箭咀嘅方格），再揀「加入主畫面」。",
    clearSearch: "清除搜尋", photoView: "睇{name}嘅大相", photoClose: "閂"
  },
  ja: {
    destJump: "国・地域へ移動",
    notrackOn: "このブラウザはアクセス統計に含まれなくなりました。", notrackOff: "このブラウザは再びアクセス統計に含まれます。",
    destAreas: "地域と都市", destRegions: "地域", destCityList: "都市",
    cookieText: "サイトの利用状況を把握するため、Google アナリティクスの Cookie を使用してもよろしいですか？どちらを選んでも、アクセス数は Cookie を使わずに計測します。", cookieAccept: "同意する", cookieReject: "拒否する", cookieSettings: "Cookie の設定を変更",
    navCompare: "比較", navMap: "地図", navStars: "星別", navMethod: "算出方法", navContact: "お問い合わせ", navDestinations: "エリア一覧", wishlist: "お気に入り",
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
    searchPh: "店名・料理・エリアで検索", searchPhEx: "店名・料理・エリアで検索（例：{ex}）",
    searchLabel: "店名・料理ジャンル・エリアでレストランを検索",
    sortLabel: "並べ替え",
    sortPriceAsc: "ディナー：安い順", sortPriceDesc: "ディナー：高い順", sortStars: "星の多い順", sortRating: "Google評価の高い順", sortName: "店名順",
    fShow: "表示", fStars: "ミシュランの星", fCuisine: "料理ジャンル",
    showAll: "すべての店", showChanges: "最近の星の変動", showWish: "お気に入り",
    showChangesTitle: "直近2回のミシュランガイドで星を獲得または失った店",
    all: "すべて", starsAria: "ミシュラン{n}つ星",
    hRestaurant: "レストラン", hCuisine: "料理", hStars: "星", hGoogle: "Google", hNotes: "ディナーの備考", hPrice: "料金", hWine: "ペアリング", hWish: "お気に入り",
    tableLabel: "レストランの料金",
    reviews: "{n}件", ratingAria: "Google評価 5点中{r}",
    srcSite: "公式サイト", srcPress: "情報源", srcTitle: "この料金の情報源",
    perMain: "1品あたり", typicalSpend: "予算の目安", notListed: "非公開",
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
    showing: "星付きレストラン{b}軒中{a}軒を表示", showingFormer: "（ほかに星を失った店{c}軒）",
    wishNote: "お気に入りはこのブラウザにのみ保存されます。",
    wishAdd: "{name}をお気に入りに追加", wishRemove: "{name}をお気に入りから削除", wishAddT: "お気に入りに追加", wishRemoveT: "お気に入りから削除",
    toastAdded: "{name}をお気に入りに追加しました", toastRemoved: "{name}をお気に入りから削除しました", undo: "元に戻す",
    photo: "写真", tempClosed: "臨時休業中（Google）",
    mapTitle: "星付きレストランを地図で一覧",
    mapText: "地図のピンは上の一覧の絞り込みに連動します。星の数、料理ジャンル、お気に入りを選ぶと地図も切り替わります。ピンをタップすると料金と道順へのリンクが表示されます。",
    mapWait: "ここまでスクロールすると地図を読み込みます。", mapLabel: "ミシュラン星付きレストランの地図",
    mapError: "地図を読み込めませんでした。一覧の各店の横にあるピンからGoogleマップで開けます。",
    legendAria: "ピンの色の意味", colours: ["紫", "琥珀色", "緑"], legendItem: "{c}＝ミシュラン{n}つ星",
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
    acctGoogle: "Google で続ける", acctOr: "または", acctEmailLabel: "メールアドレス", acctSend: "ログイン用リンクをメールで受け取る", acctSending: "送信中…",
    acctSent: "メールを確認してください。{email} にログイン用リンクを送りました。この端末で開くとログインが完了します。",
    acctTooMany: "ログイン用メールの送信が多すぎます。1分ほど待ってからもう一度お試しください。", acctFailed: "うまくいきませんでした。メールアドレスを確認して、もう一度お試しください。",
    acctBadEmail: "メールアドレスを正しく入力してください（例：name@example.com）。", acctSmall: "無料で、パスワードは不要です。メールアドレスはログインにのみ使います。",
    acctPrivacy: "プライバシーについて", acctClose: "閉じる", acctWelcome: "ログインしました。お気に入りがどの端末でも使えるようになりました。",
    acctLinkExpired: "このログイン用リンクは期限切れか、すでに使われています。「ログイン」から新しいリンクを受け取ってください。",
    been: "行った", beenAdd: "{name}を「行った」にする", beenRemove: "{name}の「行った」を外す", beenAddT: "「行った」にする", beenRemoveT: "「行った」を外す",
    toastBeen: "{name}を「行った」にしました", toastNotBeen: "{name}の「行った」を外しました", showBeen: "行った店",
    beenProgress: "ここにある{total}軒のうち{n}軒に行きました。", wishNoteOut: "お気に入りはこの端末にのみ保存されています。", wishNoteSignIn: "ログインするとどの端末でも使えます",
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
    sent: "{name}さん、ありがとうございます。これはプレビュー用のフォームのため、メッセージはまだ送信されません。",
    footEdition: "The Starred Bill・{place}",
    footNote: "料金と評価は2026年10月に確認しました。予約前に各店にご確認ください。",
    rateLine: "{sym}での料金は{date}の為替レートによる概算です：{sym}1 = {home}{rate}。",
    rateLineMixed: "料金は{date}の為替レートで{sym}に換算した概算です。",
    currencyAria: "料金の表示通貨", crumbsAria: "現在地",
    homeTitle: "The Starred Bill・ミシュラン星付きレストランの料金",
    homeEyebrow: "ミシュランガイド掲載店の料金",
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
    mapSearchPh: "地図を検索：店名・都市・国", mapSearchLabel: "地図上でレストラン・都市・国を検索",
    mapHomeWorldText: "世界のミシュラン星付きレストラン全{n}軒。塗りつぶしのピンは当サイトで料金を比較できる店、白抜きのピンは料金を追加するまでミシュランガイドにリンクしています。拡大すると個々の店が表示されます。",
    infoNoPricesYet: "当サイトの料金はまだありません", infoMichelin: "ミシュランガイド", legendHollow: "白抜き＝料金未掲載",
    installApp: "アプリを追加",
    installTipIos: "追加方法：Safariの共有ボタン（矢印付きの四角）をタップし、「ホーム画面に追加」を選んでください。"
  },
  es: {
    destJump: "Ir a un país",
    notrackOn: "Este navegador ya no se cuenta en las estadísticas de visitas.", notrackOff: "Este navegador vuelve a contarse en las estadísticas de visitas.",
    destAreas: "Regiones y ciudades", destRegions: "Regiones", destCityList: "Ciudades",
    cookieText: "¿Podemos usar cookies de Google Analytics para saber cómo se usa el sitio? Las visitas se cuentan sin cookies en cualquier caso.", cookieAccept: "Aceptar", cookieReject: "Rechazar", cookieSettings: "Cambiar la elección de cookies",
    navCompare: "Comparar", navMap: "Mapa", navStars: "Por estrellas", navMethod: "Método", navContact: "Contacto", navDestinations: "Destinos", wishlist: "Favoritos",
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
    searchPh: "Busca un restaurante, una cocina o una zona", searchPhEx: "Busca un restaurante, una cocina o una zona, p. ej. “{ex}”",
    searchLabel: "Buscar restaurantes por nombre, cocina o zona",
    sortLabel: "Ordenar restaurantes",
    sortPriceAsc: "Cena: de menor a mayor precio", sortPriceDesc: "Cena: de mayor a menor precio", sortStars: "Más estrellas primero", sortRating: "Nota de Google: de mayor a menor", sortName: "Nombre de la A a la Z",
    fShow: "Mostrar", fStars: "Estrellas Michelin", fCuisine: "Cocina",
    showAll: "Todos los restaurantes", showChanges: "Cambios recientes de estrellas", showWish: "Mis favoritos",
    showChangesTitle: "Ganaron o perdieron una estrella en una de las dos últimas Guías Michelin",
    all: "Todas", starsAria: "{n} estrella Michelin|{n} estrellas Michelin",
    hRestaurant: "Restaurante", hCuisine: "Cocina", hStars: "Estrellas", hGoogle: "Google", hNotes: "Notas de la cena", hPrice: "Precio", hWine: "Maridaje", hWish: "Favoritos",
    tableLabel: "Precios de los restaurantes",
    reviews: "{n} reseña|{n} reseñas", ratingAria: "Nota de Google: {r} sobre 5",
    srcSite: "Web del restaurante", srcPress: "Fuente: reseña", srcTitle: "De dónde sale este precio",
    perMain: "por plato principal", typicalSpend: "gasto habitual", notListed: "No publicado",
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
    showing: "Mostrando {a} de {b} restaurantes con estrella", showingFormer: ", más {c} ya sin estrella",
    wishNote: "Tus favoritos se guardan solo en este navegador.",
    wishAdd: "Añadir {name} a tus favoritos", wishRemove: "Quitar {name} de tus favoritos", wishAddT: "Añadir a favoritos", wishRemoveT: "Quitar de favoritos",
    toastAdded: "{name} añadido a tus favoritos", toastRemoved: "{name} quitado de tus favoritos", undo: "Deshacer",
    photo: "Foto", tempClosed: "Cerrado temporalmente (Google)",
    mapTitle: "Todas las mesas con estrella en un mapa",
    mapText: "Los marcadores siguen los filtros de la lista de arriba: elige un nivel de estrellas, una cocina o tus favoritos y el mapa se actualiza. Toca un marcador para ver el precio y cómo llegar.",
    mapWait: "El mapa se carga al llegar aquí.", mapLabel: "Mapa de restaurantes con estrella Michelin",
    mapError: "Ahora mismo no se ha podido cargar el mapa. El marcador junto a cada restaurante de la lista sigue abriéndolo en Google Maps.",
    legendAria: "Qué significan los colores de los marcadores", colours: ["Morado", "Ámbar", "Verde"], legendItem: "{c} = {n} estrella Michelin|{c} = {n} estrellas Michelin",
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
    acctGoogle: "Continuar con Google", acctOr: "o", acctEmailLabel: "Correo electrónico", acctSend: "Envíame un enlace para entrar", acctSending: "Enviando…",
    acctSent: "Revisa tu correo. Hemos enviado un enlace de acceso a {email}. Ábrelo en este dispositivo para terminar de iniciar sesión.",
    acctTooMany: "Demasiados correos de acceso seguidos. Espera un minuto y vuelve a intentarlo.", acctFailed: "No ha funcionado. Revisa el correo electrónico y vuelve a intentarlo.",
    acctBadEmail: "Escribe un correo completo, p. ej. nombre@ejemplo.com.", acctSmall: "Gratis y sin contraseña que recordar. Solo usamos tu correo para que inicies sesión.",
    acctPrivacy: "Aviso de privacidad", acctClose: "Cerrar", acctWelcome: "Has iniciado sesión. Tus favoritos ya te siguen a cualquier dispositivo.",
    acctLinkExpired: "Ese enlace de acceso ha caducado o ya se ha usado. Toca Iniciar sesión para recibir uno nuevo.",
    been: "He estado", beenAdd: "Marcar que he estado en {name}", beenRemove: "Quitar {name} de los visitados", beenAddT: "Marcar como visitado", beenRemoveT: "Quitar de visitados",
    toastBeen: "{name} marcado como visitado", toastNotBeen: "{name} quitado de visitados", showBeen: "He estado",
    beenProgress: "Has estado en {n} de los {total} de aquí.", wishNoteOut: "Tus favoritos se guardan solo en este dispositivo.", wishNoteSignIn: "Inicia sesión para tenerlos en todos tus dispositivos",
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
    sent: "Gracias, {name}. Este formulario es una vista previa, así que todavía no se envían mensajes.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Precios y notas consultados en octubre de 2026. Confirma con cada restaurante antes de reservar.",
    rateLine: "Los precios en {sym} son aproximados, con el tipo de cambio del {date}: {sym}1 = {home}{rate}.",
    rateLineMixed: "Los precios se convierten a {sym} con el tipo de cambio del {date}, así que son aproximados.",
    currencyAria: "Mostrar precios en", crumbsAria: "Dónde estás",
    wishTitle: "Tus favoritos",
    clearSearch: "Borrar búsqueda", photoView: "Ver una foto más grande de {name}", photoClose: "Cerrar",
    installApp: "Instalar app",
    installTipIos: "Para instalarla: toca el botón Compartir (el cuadrado con una flecha) en Safari y elige “Añadir a pantalla de inicio”."
  },
  it: {
    destJump: "Vai a un paese",
    notrackOn: "Questo browser non viene più conteggiato nelle statistiche delle visite.", notrackOff: "Questo browser viene di nuovo conteggiato nelle statistiche delle visite.",
    destAreas: "Regioni e città", destRegions: "Regioni", destCityList: "Città",
    cookieText: "Possiamo usare i cookie di Google Analytics per capire come viene usato il sito? Le visite vengono contate comunque senza cookie.", cookieAccept: "Accetta", cookieReject: "Rifiuta", cookieSettings: "Cambia la scelta sui cookie",
    navCompare: "Confronta", navMap: "Mappa", navStars: "Per stelle", navMethod: "Metodo", navContact: "Contatti", navDestinations: "Destinazioni", wishlist: "Preferiti",
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
    searchPh: "Cerca un ristorante, una cucina o una zona", searchPhEx: "Cerca un ristorante, una cucina o una zona, ad es. “{ex}”",
    searchLabel: "Cerca ristoranti per nome, cucina o zona",
    sortLabel: "Ordina i ristoranti",
    sortPriceAsc: "Cena: dal meno caro", sortPriceDesc: "Cena: dal più caro", sortStars: "Prima i più stellati", sortRating: "Voto Google: dal più alto", sortName: "Nome A–Z",
    fShow: "Mostra", fStars: "Stelle Michelin", fCuisine: "Cucina",
    showAll: "Tutti i ristoranti", showChanges: "Stelle cambiate di recente", showWish: "I miei preferiti",
    showChangesTitle: "Hanno guadagnato o perso una stella in una delle ultime due Guide Michelin",
    all: "Tutte", starsAria: "{n} stella Michelin|{n} stelle Michelin",
    hRestaurant: "Ristorante", hCuisine: "Cucina", hStars: "Stelle", hGoogle: "Google", hNotes: "Note sulla cena", hPrice: "Prezzo", hWine: "Abbinamento vini", hWish: "Preferiti",
    tableLabel: "Prezzi dei ristoranti",
    reviews: "{n} recensione|{n} recensioni", ratingAria: "Voto Google {r} su 5",
    srcSite: "Sito del ristorante", srcPress: "Fonte: recensione", srcTitle: "Da dove viene questo prezzo",
    perMain: "per piatto principale", typicalSpend: "spesa tipica", notListed: "Non pubblicato",
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
    showing: "{a} ristoranti stellati su {b}", showingFormer: ", più {c} non più stellati",
    wishNote: "I tuoi preferiti sono salvati solo in questo browser.",
    wishAdd: "Aggiungi {name} ai preferiti", wishRemove: "Togli {name} dai preferiti", wishAddT: "Aggiungi ai preferiti", wishRemoveT: "Togli dai preferiti",
    toastAdded: "{name} aggiunto ai preferiti", toastRemoved: "{name} tolto dai preferiti", undo: "Annulla",
    photo: "Foto", tempClosed: "Chiuso temporaneamente (Google)",
    mapTitle: "Tutte le tavole stellate su una mappa",
    mapText: "I segnaposto seguono i filtri della lista qui sopra: scegli un livello di stelle, una cucina o i tuoi preferiti e la mappa si aggiorna. Tocca un segnaposto per il prezzo e le indicazioni.",
    mapWait: "La mappa si carica quando arrivi qui.", mapLabel: "Mappa dei ristoranti stellati Michelin",
    mapError: "Al momento non è stato possibile caricare la mappa. Il segnaposto accanto a ogni ristorante della lista lo apre comunque in Google Maps.",
    legendAria: "Cosa indicano i colori dei segnaposto", colours: ["Viola", "Ambra", "Verde"], legendItem: "{c} = {n} stella Michelin|{c} = {n} stelle Michelin",
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
    acctGoogle: "Continua con Google", acctOr: "oppure", acctEmailLabel: "Indirizzo email", acctSend: "Inviami un link di accesso", acctSending: "Invio in corso…",
    acctSent: "Controlla la posta. Abbiamo inviato un link di accesso a {email}. Aprilo su questo dispositivo per completare l'accesso.",
    acctTooMany: "Troppe email di accesso in poco tempo. Aspetta un minuto e riprova.", acctFailed: "Non ha funzionato. Controlla l'indirizzo email e riprova.",
    acctBadEmail: "Inserisci un indirizzo email completo, ad es. nome@esempio.it.", acctSmall: "Gratis, e senza password da ricordare. Usiamo la tua email solo per farti accedere.",
    acctPrivacy: "Informativa sulla privacy", acctClose: "Chiudi", acctWelcome: "Hai effettuato l'accesso. Ora i tuoi preferiti ti seguono su ogni dispositivo.",
    acctLinkExpired: "Questo link di accesso è scaduto o è già stato usato. Tocca Accedi per riceverne uno nuovo.",
    been: "Ci sono stato", beenAdd: "Segna che sei stato da {name}", beenRemove: "Togli {name} dai visitati", beenAddT: "Segna come visitato", beenRemoveT: "Togli dai visitati",
    toastBeen: "{name} segnato come visitato", toastNotBeen: "{name} tolto dai visitati", showBeen: "Visitati",
    beenProgress: "Sei stato in {n} dei {total} ristoranti di questa pagina.", wishNoteOut: "I tuoi preferiti sono salvati solo su questo dispositivo.", wishNoteSignIn: "Accedi per averli su ogni dispositivo",
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
    sent: "Grazie, {name}. Questo è un modulo di anteprima, quindi i messaggi non vengono ancora inviati.",
    footEdition: "The Starred Bill · {place}",
    footNote: "Prezzi e voti verificati a ottobre 2026. Verifica con ogni ristorante prima di prenotare.",
    rateLine: "I prezzi in {sym} sono approssimativi, con il cambio del {date}: {sym}1 = {home}{rate}.",
    rateLineMixed: "I prezzi sono convertiti in {sym} con il cambio del {date}, quindi sono approssimativi.",
    currencyAria: "Mostra i prezzi in", crumbsAria: "Dove ti trovi",
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
  "Thai": "Thaïlandaise", "Spanish": "Espagnole", "Vegan": "Végane", "Mediterranean Cuisine": "Cuisine méditerranéenne", "Steakhouse": "Grillades"
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
const CUISINE_IT = {
  "Modern Cuisine": "Moderna", "Creative": "Creativa", "Contemporary": "Contemporanea", "Classic Cuisine": "Classica", "Traditional Cuisine": "Tradizionale",
  "Regional Cuisine": "Regionale", "Fish and Seafood": "Pesce e frutti di mare", "Seafood": "Frutti di mare", "Japanese": "Giapponese", "Fusion": "Fusion",
  "Grills": "Carne alla griglia", "Mexican": "Messicana", "Vegetarian": "Vegetariana", "Vegan": "Vegana", "Farm to table": "Dal produttore alla tavola",
  "Innovative": "Innovativa", "International": "Internazionale", "World Cuisine": "Cucina del mondo", "Italian": "Italiana", "Italian Contemporary": "Italiana contemporanea",
  "French": "Francese", "Spanish": "Spagnola", "Mediterranean Cuisine": "Mediterranea", "Chinese": "Cinese", "Korean": "Coreana", "Indian": "Indiana", "Thai": "Thailandese",
  "Market Cuisine": "Di mercato", "Country cooking": "Casalinga", "Roman": "Romana", "Lombardian": "Lombarda", "Tuscan": "Toscana", "Steakhouse": "Carne"
};

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
  it: { label: "IT", html: "it-IT", suffixes: ["It"], locale: "it-IT" }
};
const DATA = JSON.parse(document.getElementById("page-data").textContent);
// The languages this page offers (Hong Kong adds Cantonese, France adds French, Japan adds Japanese).
const PAGE_LANGS = DATA.languages || ["en", "zh"];
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
  return b === "zh-hk" || b === "zh-mo" ? "yue" : b.startsWith("zh") ? "zh" : b.startsWith("fr") ? "fr" : b.startsWith("ja") ? "ja" : b.startsWith("es") ? "es" : b.startsWith("it") ? "it" : "en";
}
// The visitor's choice, kept across pages even where it isn't offered.
let LANG_PREF = LANGS[params.get("lang")] ? params.get("lang") : store.get(LANG_KEY, browserLang());
// What this page shows: the choice if offered, Cantonese → Chinese (and back), otherwise English.
function resolveLang(pref) {
  if (PAGE_LANGS.includes(pref)) return pref;
  if (pref === "yue" && PAGE_LANGS.includes("zh")) return "zh";
  return "en";
}
let LANG = resolveLang(LANG_PREF);
function setLang(lang) {
  LANG_PREF = lang;
  LANG = resolveLang(lang);
  store.set(LANG_KEY, LANG_PREF);
  const p = new URLSearchParams(location.search); p.set("lang", LANG_PREF);
  history.replaceState(null, "", location.pathname + "?" + p.toString() + location.hash);
  document.documentElement.lang = LANGS[LANG].html;
}
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
// Chinese script (Mandarin or Cantonese): changes date formats, sorting and which name is shown first.
const zh = () => LANG === "zh" || LANG === "yue";
const fr = () => LANG === "fr";
const ja = () => LANG === "ja";
const es = () => LANG === "es";
const it = () => LANG === "it";
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
const altNameOf = (r) => ja() ? (r.nameJa ? r.name : "") : zh() ? (r.nameZh ? r.name : r.nameJa || "") : (r.nameJa || r.nameZh || "");
const altLangOf = (r) => altNameOf(r) === r.name ? "en" : altNameOf(r) === r.nameJa ? "ja" : "zh-Hant";
const cuisineOf = (r) => zh() ? (r.cuisineZh || CUISINE_ZH[r.cuisine] || r.cuisine) : fr() ? (r.cuisineFr || CUISINE_FR[r.cuisine] || r.cuisine) :
  es() ? (r.cuisineEs || CUISINE_ES[r.cuisine] || r.cuisine) : it() ? (r.cuisineIt || CUISINE_IT[r.cuisine] || r.cuisine) : ja() ? (r.cuisineJa || r.cuisine) : r.cuisine;
const withLang = (path) => path + "?lang=" + LANG_PREF;
const MONTHS = { en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."],
  es: ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."],
  it: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"] };
const monthYear = (ym) => {
  const [y, m] = String(ym || "").split("-");
  if (!m) return y || "";
  return cjk() ? y + "年" + Number(m) + "月" : (MONTHS[LANG] || MONTHS.en)[Number(m) - 1] + " " + y;
};
const starIcons = (n) => '<span class="stars" aria-label="' + esc(t("starsAria", { n })) + '">' + '<svg><use href="#star"/></svg>'.repeat(n) + "</span>";
const heart = '<svg aria-hidden="true"><use href="#heart"/></svg>';
// A symbol made of letters, e.g. "DKK", gets a space before the amount: "DKK 4,400".
const symbolOf = (cur) => { const s = DATA.currencies[cur].symbol; return /[A-Za-z]$/.test(s) ? s + "\u00a0" : s; };
// Prices in a restaurant's own currency, e.g. "£195" or "NT$4,980".
function localMoney(n, cur) {
  if (n == null) return "";
  return symbolOf(cur) + n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}
function langSwitchHtml() {
  return PAGE_LANGS.map((k) =>
    '<button type="button" data-lang="' + k + '" aria-pressed="' + (k === LANG) + '" lang="' + LANGS[k].html + '">' + LANGS[k].label + "</button>").join("");
}
function applyI18n() {
  document.documentElement.lang = LANGS[LANG].html;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelectorAll(".search-clear").forEach((b) => { b.setAttribute("aria-label", t("clearSearch")); b.title = t("clearSearch"); });
  $("langSwitch").innerHTML = langSwitchHtml();
  $("brandLink").href = withLang("/");
  $("wishLink").href = document.body.classList.contains("home") ? "#wishlist" : withLang("/") + "#wishlist";
  $("wishLink").setAttribute("aria-label", t("wishTitle"));
  $("installBtn").textContent = t("installApp");
  labelShare();
  if (typeof renderAccountButton === "function") renderAccountButton();
  if (document.getElementById("cookieBar")) renderCookieBar(true);
  const tip = $("installTip");
  if (tip) tip.textContent = t("installTipIos");
}
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
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(GOOGLE_MAPS_API_KEY) + "&v=weekly&loading=async&language=" + ({ zh: "zh-TW", yue: "zh-HK", fr: "fr", ja: "ja", es: "es", it: "it" }[LANG] || "en-GB") + "&callback=__starredBillMaps";
    s.async = true;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return mapsBoot;
}
// hollow: a white pin with a coloured outline, for restaurants without prices on the site yet.
function pinIcon(stars, hollow) {
  const colour = MAP_PIN_COLOURS[stars];
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='30' height='40' viewBox='0 0 30 40'><path d='M15 38.5S2 26.6 2 15.5a13 13 0 0 1 26 0C28 26.6 15 38.5 15 38.5z' fill='" + (hollow ? "#ffffff" : colour) + "' stroke='" + (hollow ? colour : "#ffffff") + "' stroke-width='" + (hollow ? 3 : 2) + "'/><text x='15' y='20.5' text-anchor='middle' font-family='Arial,sans-serif' font-size='13' font-weight='700' fill='" + (hollow ? colour : "#ffffff") + "'>" + stars + "</text></svg>";
  return { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg), scaledSize: new google.maps.Size(30, 40), anchor: new google.maps.Point(15, 39) };
}
function renderLegend(list) {
  const colours = t("colours");
  $("mapLegend").setAttribute("aria-label", t("legendAria"));
  $("mapLegend").innerHTML = [1, 2, 3].map((s) =>
    '<li><span class="pin-num" style="--pin:' + MAP_PIN_COLOURS[s] + '" aria-hidden="true">' + s + "</span><span>" + esc(t("legendItem", { c: colours[s - 1], n: s })) + '</span><span class="count">' + list.filter((r) => r.stars === s).length + "</span></li>").join("");
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
        (far ? ' <a href="' + esc(far) + '">' + esc(t("nearWorld")) + " →</a>" : "") + "</p>";
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
const shareUrl = () => location.origin + location.pathname + (LANG_PREF !== "en" ? "?lang=" + LANG_PREF : "");
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
}
