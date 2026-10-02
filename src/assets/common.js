// Shared by every page: settings, words in English and Traditional Chinese, and small helpers.

// ---------- Settings ----------
// Google Maps Platform browser key, used for restaurant photos and the maps.
// Leave empty to show lettered placeholders and hide the maps.
const GOOGLE_MAPS_API_KEY = "AIzaSyA5AnpHOqFXxb6U3hDiXuAyQK2dIbZgLT4";
const MAP_PIN_COLOURS = { 1: "#673AB7", 2: "#F9A825", 3: "#097138" };

// ---------- Words (English / Traditional Chinese) ----------
// {place} is the page's place name and {placeIn} the same name as it reads mid-sentence ("the UK").
// "one|many" picks the singular when {n} is 1.
const I18N = {
  en: {
    navCompare: "Compare", navMap: "Map", navStars: "By stars", navMethod: "Method", navContact: "Contact", navDestinations: "Destinations", wishlist: "Wishlist",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · Michelin Guide restaurants",
    heroTitle: "What a Michelin star <em>costs</em> in {placeIn}.",
    heroText: "Dinner, lunch and wine pairing prices per person at the starred restaurants in {placeIn}, side by side. Search by name or cuisine, filter by stars or cuisine, and save the ones you'd like to try to your wishlist.",
    crumbHome: "All destinations", explore: "Explore", exploreCities: "Cities in {country}", alsoIn: "Also in",
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
    figRestaurants: "Starred restaurants", figDestinations: "Destinations", figUpdated: "Prices checked", figUpdatedSub: "Dinner, lunch and wine pairings",
    citiesN: "{n} city|{n} cities",
    homeSearchPh: "Find a restaurant, cuisine or city", homeSearchLabel: "Find a restaurant, cuisine or city", searchNone: "Nothing matches “{q}” yet.",
    mapHomeTitle: "Every starred table we track",
    mapHomeText: "Zoom in to see individual restaurants. Tap a pin for the dinner price and a link to compare it with the rest of the city.",
    destTitle: "Destinations", destText: "Each destination has its own page with prices, filters, a map and star-by-star averages.",
    destRestaurants: "{n} starred restaurant|{n} starred restaurants", destFrom: "Dinner menus from {p}", destOpen: "Compare {place}",
    collectionsTitle: "Collections",
    wishTitle: "Your wishlist", wishText: "Restaurants you've saved from any destination. Saved in this browser only.",
    wishEmptyHome: "Nothing saved yet. Tap the heart next to any restaurant on a destination page to save it here.",
    wishRemoveShort: "Remove",
    infoCompare: "Compare prices in {place}",
    installApp: "Install app",
    installTipIos: "To install: tap the Share button (the square with an arrow) in Safari, then choose “Add to Home Screen”."
  },
  zh: {
    navCompare: "比較", navMap: "地圖", navStars: "星級", navMethod: "說明", navContact: "聯絡我們", navDestinations: "目的地", wishlist: "願望清單",
    pageTitle: "The Starred Bill・{place}",
    heroEyebrow: "{place}・米其林指南餐廳",
    heroTitle: "在{place}，一顆米其林星<em>要價</em>多少？",
    heroText: "並列比較{place}米其林星級餐廳的每人晚餐、午餐與餐酒搭配價格。可依名稱或料理搜尋、依星級或料理篩選，也能把想去的餐廳加入願望清單。",
    crumbHome: "所有目的地", explore: "探索", exploreCities: "{country}的城市", alsoIn: "也屬於",
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
    figRestaurants: "星級餐廳", figDestinations: "目的地", figUpdated: "價格查核", figUpdatedSub: "晚餐、午餐與餐酒搭配",
    citiesN: "{n} 座城市",
    homeSearchPh: "搜尋餐廳、料理或城市", homeSearchLabel: "搜尋餐廳、料理或城市", searchNone: "目前找不到「{q}」。",
    mapHomeTitle: "我們追蹤的所有星級餐廳",
    mapHomeText: "放大地圖即可看到個別餐廳。點選標記可查看晚餐價格，並連結到該城市的完整比較。",
    destTitle: "目的地", destText: "每個目的地都有專屬頁面，提供價格、篩選、地圖與各星級平均。",
    destRestaurants: "{n} 家星級餐廳", destFrom: "晚餐套餐 {p} 起", destOpen: "比較{place}",
    collectionsTitle: "精選區域",
    wishTitle: "你的願望清單", wishText: "你在各目的地收藏的餐廳，只儲存在這個瀏覽器中。",
    wishEmptyHome: "目前還沒有收藏。在任一目的地頁面點選餐廳旁的愛心，即可加入這裡。",
    wishRemoveShort: "移除",
    infoCompare: "比較{place}的價格",
    installApp: "加到主畫面",
    installTipIos: "安裝方式：點選 Safari 的分享按鈕（方框加箭頭），再選擇「加入主畫面」。"
  }
};
// Cuisine names in Chinese for restaurants whose data has no cuisineZh.
const CUISINE_ZH = {
  "Modern Cuisine": "現代菜", "Modern British": "現代英國菜", "French": "法國菜", "Indian": "印度菜", "Creative": "創新菜", "Japanese": "日本菜",
  "Traditional British": "傳統英國菜", "Modern French": "時尚法國菜", "Italian": "義大利菜", "French Contemporary": "時尚法國菜", "Chinese": "中國菜",
  "African": "非洲菜", "Spanish": "西班牙菜", "Seafood": "海鮮", "Fish and Seafood": "魚類及海鮮", "Creative British": "創新英國菜", "Mexican": "墨西哥菜",
  "Mediterranean Cuisine": "地中海菜", "Greek": "希臘菜", "Thai": "泰國菜", "Vegan": "純素", "European Contemporary": "時尚歐陸菜", "Korean": "韓國菜",
  "Grills": "燒烤", "Californian": "加州菜"
};

// ---------- Language and saved settings ----------
const params = new URLSearchParams(location.search);
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const LANG_KEY = "starredbill-lang", WISHLIST_KEY = "starredbill-wishlist", PREFS_KEY = "starredbill-prefs";
let LANG = params.get("lang") === "zh" || params.get("lang") === "en" ? params.get("lang")
  : store.get(LANG_KEY, (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en");
function setLang(lang) {
  LANG = lang;
  store.set(LANG_KEY, LANG);
  const p = new URLSearchParams(location.search); p.set("lang", LANG);
  history.replaceState(null, "", location.pathname + "?" + p.toString() + location.hash);
  document.documentElement.lang = zh() ? "zh-Hant-TW" : "en-GB";
}
const loadWishlist = () => { const wl = store.get(WISHLIST_KEY, []); return Array.isArray(wl) ? wl.filter((x) => typeof x === "string") : []; };

// ---------- Helpers ----------
const DATA = JSON.parse(document.getElementById("page-data").textContent);
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const zh = () => LANG === "zh";
// Each page sets this to the values every {placeholder} can use, e.g. { place: "London" }.
let pageVars = () => ({});
function t(key, vars) {
  let v = (I18N[LANG] && I18N[LANG][key]) ?? I18N.en[key] ?? key;
  if (typeof v !== "string") return v;
  vars = Object.assign(pageVars(), vars);
  if (v.includes("|")) { const [one, many] = v.split("|"); v = Number(vars.n) === 1 ? one : many; }
  return v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}
// The Chinese version of a field when there is one, e.g. pick(r, "name") reads nameZh in Chinese.
const pick = (o, f) => (zh() && o[f + "Zh"]) ? o[f + "Zh"] : (o[f] || "");
const nameOf = (r) => pick(r, "name");
const altNameOf = (r) => r.nameZh ? (zh() ? r.name : r.nameZh) : "";
const cuisineOf = (r) => zh() ? (r.cuisineZh || CUISINE_ZH[r.cuisine] || r.cuisine) : r.cuisine;
const withLang = (path) => path + "?lang=" + LANG;
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthYear = (ym) => { const [y, m] = String(ym || "").split("-"); if (!m) return y || ""; return zh() ? y + "年" + Number(m) + "月" : MONTHS_EN[Number(m) - 1] + " " + y; };
const rosettes = (n) => '<span class="stars" aria-label="' + esc(t("starsAria", { n })) + '">' + '<svg><use href="#rosette"/></svg>'.repeat(n) + "</span>";
const heart = '<svg aria-hidden="true"><use href="#heart"/></svg>';
// Prices in a restaurant's own currency, e.g. "£195" or "NT$4,980".
function localMoney(n, cur) {
  if (n == null) return "";
  return DATA.currencies[cur].symbol + n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
}
function langSwitchHtml() {
  return [["en", "EN"], ["zh", "中文"]].map(([k, l]) =>
    '<button type="button" data-lang="' + k + '" aria-pressed="' + (k === LANG) + '" lang="' + (k === "zh" ? "zh-Hant" : "en") + '">' + l + "</button>").join("");
}
function applyI18n() {
  document.documentElement.lang = zh() ? "zh-Hant-TW" : "en-GB";
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  $("langSwitch").innerHTML = langSwitchHtml();
  $("brandLink").href = withLang("/");
  $("wishLink").href = document.body.classList.contains("home") ? "#wishlist" : withLang("/") + "#wishlist";
  $("wishLink").setAttribute("aria-label", t("wishTitle"));
  $("installBtn").textContent = t("installApp");
  const tip = $("installTip");
  if (tip) tip.textContent = t("installTipIos");
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
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(GOOGLE_MAPS_API_KEY) + "&v=weekly&loading=async&language=" + (zh() ? "zh-TW" : "en-GB") + "&callback=__starredBillMaps";
    s.async = true;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return mapsBoot;
}
function pinIcon(stars) {
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='30' height='40' viewBox='0 0 30 40'><path d='M15 38.5S2 26.6 2 15.5a13 13 0 0 1 26 0C28 26.6 15 38.5 15 38.5z' fill='" + MAP_PIN_COLOURS[stars] + "' stroke='#ffffff' stroke-width='2'/><text x='15' y='20.5' text-anchor='middle' font-family='Arial,sans-serif' font-size='13' font-weight='700' fill='#ffffff'>" + stars + "</text></svg>";
  return { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg), scaledSize: new google.maps.Size(30, 40), anchor: new google.maps.Point(15, 39) };
}
function renderLegend(list) {
  const colours = t("colours");
  $("mapLegend").setAttribute("aria-label", t("legendAria"));
  $("mapLegend").innerHTML = [1, 2, 3].map((s) =>
    '<li><span class="pin-num" style="--pin:' + MAP_PIN_COLOURS[s] + '" aria-hidden="true">' + s + "</span><span>" + esc(t("legendItem", { c: colours[s - 1], n: s })) + '</span><span class="count">' + list.filter((r) => r.stars === s).length + "</span></li>").join("");
}

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
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
