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
    destTitle: "Destinations", destText: "Each destination has its own page with prices, filters, a map and star-by-star averages.",
    destRestaurants: "{n} starred restaurant|{n} starred restaurants", destFrom: "Dinner menus from {p}", destOpen: "Compare {place}",
    collectionsTitle: "Collections",
    wishTitle: "Your wishlist", wishText: "Restaurants you've saved from any destination. Saved in this browser only.",
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
    destTitle: "目的地", destText: "每個目的地都有專屬頁面，提供價格、篩選、地圖與各星級平均。",
    destRestaurants: "{n} 家星級餐廳", destFrom: "晚餐套餐 {p} 起", destOpen: "比較{place}",
    collectionsTitle: "精選區域",
    wishTitle: "你的願望清單", wishText: "你在各目的地收藏的餐廳，只儲存在這個瀏覽器中。",
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
    navCompare: "Comparer", navMap: "Carte", navStars: "Par étoiles", navMethod: "Méthode", navContact: "Contact", navDestinations: "Destinations", wishlist: "Envies",
    pageTitle: "The Starred Bill · {place}",
    heroEyebrow: "{place} · Restaurants du Guide Michelin",
    heroTitle: "Combien <em>coûte</em> une étoile Michelin {placeIn} ?",
    heroText: "Les prix du dîner, du déjeuner et des accords mets-vins par personne dans les restaurants étoilés {placeIn}, côte à côte. Cherchez par nom ou par cuisine, filtrez par étoiles ou par cuisine, et ajoutez à vos envies les tables qui vous tentent.",
    crumbHome: "Toutes les destinations", explore: "Explorer", exploreCities: "Villes – {country}", alsoIn: "Aussi dans",
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
    navCompare: "比較", navMap: "地圖", navStars: "星級", navMethod: "點樣計", navContact: "聯絡我哋", navDestinations: "目的地", wishlist: "心水清單",
    pageTitle: "The Starred Bill・{place}",
    heroEyebrow: "{place}・米芝蓮指南餐廳",
    heroTitle: "喺{place}，一粒米芝蓮星<em>要幾多錢</em>？",
    heroText: "將{place}米芝蓮星級餐廳每位嘅晚市、午市同配酒價錢放埋一齊比較。可以用名或者菜式搵、按星級或者菜式篩選，仲可以將想去嘅餐廳加入心水清單。",
    crumbHome: "所有目的地", explore: "探索", exploreCities: "{country}嘅城市", alsoIn: "亦屬於",
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
  }

};
// Cuisine names in Chinese for restaurants whose data has no cuisineZh.
const CUISINE_ZH = {
  "Modern Cuisine": "現代菜", "Modern British": "現代英國菜", "French": "法國菜", "Indian": "印度菜", "Creative": "創新菜", "Japanese": "日本菜",
  "Traditional British": "傳統英國菜", "Modern French": "時尚法國菜", "Italian": "義大利菜", "French Contemporary": "時尚法國菜", "Chinese": "中國菜",
  "African": "非洲菜", "Spanish": "西班牙菜", "Seafood": "海鮮", "Fish and Seafood": "魚類及海鮮", "Creative British": "創新英國菜", "Mexican": "墨西哥菜",
  "Mediterranean Cuisine": "地中海菜", "Greek": "希臘菜", "Thai": "泰國菜", "Vegan": "純素", "European Contemporary": "時尚歐陸菜", "Korean": "韓國菜",
  "Grills": "燒烤", "Californian": "加州菜", "Classic French": "經典法國菜", "Classic Cuisine": "經典菜", "British Contemporary": "時尚英國菜",
  "Turkish": "土耳其菜", "Scandinavian": "北歐菜"
};
// Cuisine names in French (Michelin's French labels), for pages offered in French.
const CUISINE_FR = {
  "Modern Cuisine": "Cuisine moderne", "Creative": "Créative", "Classic Cuisine": "Cuisine classique", "Traditional Cuisine": "Cuisine traditionnelle",
  "Japanese": "Japonaise", "Italian": "Italienne", "Chinese": "Chinoise", "Cantonese": "Cantonaise", "Greek": "Grecque", "Mexican": "Mexicaine",
  "Fish and Seafood": "Poissons et fruits de mer", "Seafood": "Fruits de mer", "French": "Française", "Indian": "Indienne", "Korean": "Coréenne",
  "Thai": "Thaïlandaise", "Spanish": "Espagnole", "Vegan": "Végane", "Mediterranean Cuisine": "Cuisine méditerranéenne", "Steakhouse": "Grillades"
};

// ---------- Language and saved settings ----------
// Each language: its switch label, the page's lang attribute, the suffix of translated data fields
// (nameZh, introYue, dinnerNoteFr…), the fields to try next, and the locale for dates and sorting.
const LANGS = {
  en: { label: "EN", html: "en-GB", suffixes: [], locale: "en-GB" },
  zh: { label: "中文", html: "zh-Hant-TW", suffixes: ["Zh"], locale: "zh-TW" },
  yue: { label: "廣東話", html: "zh-Hant-HK", suffixes: ["Yue", "Zh"], locale: "zh-HK" },
  fr: { label: "FR", html: "fr-FR", suffixes: ["Fr"], locale: "fr-FR" }
};
const DATA = JSON.parse(document.getElementById("page-data").textContent);
// The languages this page offers (Hong Kong adds Cantonese, France adds French).
const PAGE_LANGS = DATA.languages || ["en", "zh"];
const params = new URLSearchParams(location.search);
const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const LANG_KEY = "starredbill-lang", WISHLIST_KEY = "starredbill-wishlist", PREFS_KEY = "starredbill-prefs";
function browserLang() {
  const b = (navigator.language || "").toLowerCase();
  return b === "zh-hk" || b === "zh-mo" ? "yue" : b.startsWith("zh") ? "zh" : b.startsWith("fr") ? "fr" : "en";
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

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Chinese script (Mandarin or Cantonese): changes date formats, sorting and which name is shown first.
const zh = () => LANG === "zh" || LANG === "yue";
const fr = () => LANG === "fr";
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
const altNameOf = (r) => r.nameZh ? (zh() ? r.name : r.nameZh) : "";
const cuisineOf = (r) => zh() ? (r.cuisineZh || CUISINE_ZH[r.cuisine] || r.cuisine) : fr() ? (r.cuisineFr || CUISINE_FR[r.cuisine] || r.cuisine) : r.cuisine;
const withLang = (path) => path + "?lang=" + LANG_PREF;
const MONTHS = { en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."] };
const monthYear = (ym) => {
  const [y, m] = String(ym || "").split("-");
  if (!m) return y || "";
  return zh() ? y + "年" + Number(m) + "月" : (MONTHS[LANG] || MONTHS.en)[Number(m) - 1] + " " + y;
};
const rosettes = (n) => '<span class="stars" aria-label="' + esc(t("starsAria", { n })) + '">' + '<svg><use href="#rosette"/></svg>'.repeat(n) + "</span>";
const heart = '<svg aria-hidden="true"><use href="#heart"/></svg>';
// Prices in a restaurant's own currency, e.g. "£195" or "NT$4,980".
function localMoney(n, cur) {
  if (n == null) return "";
  return DATA.currencies[cur].symbol + n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
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
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(GOOGLE_MAPS_API_KEY) + "&v=weekly&loading=async&language=" + ({ zh: "zh-TW", yue: "zh-HK", fr: "fr" }[LANG] || "en-GB") + "&callback=__starredBillMaps";
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
        '<li><button type="button" data-near="' + i + '"><span class="near-name">' + esc(x.name()) + " " + rosettes(x.stars) + '</span><span class="near-d">' +
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
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
