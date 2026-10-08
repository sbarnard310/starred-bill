// /pick/ ("Help me pick"): six quick questions, one per screen, then three picks with a reason each.
// Everything runs in the browser from /data/near.json (build_near_me() in build.py); a location is never sent anywhere.
// The answers go in the web address (?w=…&m=…&go=1), so a result can be shared or reopened.
// Weekend mode (m=weekend): a lunch and a dinner at two restaurants near each other, within one budget for both.

const STEPS = ["where", "meal", "budget", "stars", "food", "diet"];
const BUDGETS_ONE = [50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 750, 1000, 0];  // 0 = no limit
const BUDGETS_TWO = [100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500, 2000, 0];  // weekend mode: both meals together
const budgets = () => ask.meal === "weekend" ? BUDGETS_TWO : BUDGETS_ONE;
const PAIR_KM = 40;  // weekend mode: the lunch and the dinner at most this far apart
const NEAR_KM = [25, 50, 100, 200, 400], NEAR_MI = [15, 30, 60, 125, 250];  // circles for "Near me", in round numbers either way
const WINE_ROOM = 1.6;  // with no pairing price listed, the menu must leave about 60% for one (the median pairing is ~56% of the menu)
const STAR_WORDS = { 1: "one-star", 2: "two-star", 3: "three-star" };
const DIET_CHOICES = [["", "No dietary needs"], ["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["gluten-free", "Gluten-free"], ["halal", "Halal"], ["kosher", "Kosher"]];
// "Food mood": the MICHELIN Guide's cuisine labels in a dozen plain groups. The first that matches wins.
const MOODS = [
  ["veg", "Vegetarian & vegan", /vegetarian|vegan|shojin/i],
  ["japanese", "Japanese", /japan|sushi|tempura|yakitori|kaiseki|teppanyaki|unagi|fugu/i],
  ["chinese", "Chinese", /canton|chinese|sichuan|taizhou|shanghai|chao zhou|teochew|zhejiang|huaiyang|fujian|beijing|ningbo|jiangzhe|jiangsu|shandong|hunan|dongbei|hang zhou|hui cuisine|dim sum|congee|shun tak|taiwan/i],
  ["korean", "Korean", /korean/i],
  ["seasia", "Thai & Southeast Asian", /thai|vietnam|malaysia|peranakan|filipino|singapore/i],
  ["indian", "Indian", /indian/i],
  ["italian", "Italian", /italian|piedmont|sicilian|campanian|tuscan|ligurian|emilian|abruzzo|aosta|lombard|sardinian|umbrian|romagna/i],
  ["spanish", "Spanish & Portuguese", /spanish|galician|basque|catalan|portuguese/i],
  ["latin", "Mexican & Latin American", /mexican|colombian|latin|peruvian|cuban/i],
  ["med", "Mediterranean & Middle Eastern", /mediterranean|greek|turkish|middle eastern|israeli|provençal/i],
  ["seafood", "Fish & seafood", /fish|seafood|crab/i],
  ["grill", "Steak & grills", /barbecue|steak|grill|beef|meats/i],
  ["french", "French", /french/i],
  ["modern", "Modern & creative", /modern|creative|contemporary|innovative|fusion|international|world|european|asian|californian|american|zealand|australian|farm to table|seasonal|organic|sharing|street food/i],
  ["classic", "Classic & regional", /./]
];
const moodOf = (r) => (r._mood = r._mood || (MOODS.find(([, , re]) => re.test(r.cuisine || "")) || MOODS[MOODS.length - 1])[0]);
const moodName = (k) => MOODS.find(([m]) => m === k)[1];

const ask = {
  rows: null, step: 0, where: null, meal: null, budget: null, cur: null, wine: false, stars: null, food: null, diet: null,
  shown: 0, withVisited: false
};
shareText = () => "Help me pick a Michelin star restaurant: six questions, three picks, or a lunch and a dinner for a weekend away";

// ---------- Data ----------
const dataReady = fetch(DATA.nearUrl).then((res) => { if (!res.ok) throw new Error(res.status); return res.json(); }).then((d) => {
  ask.rows = d.r.map((a) => {
    const r = {};
    d.cols.forEach((c, i) => { r[c] = a[i]; });
    r.diets = String(r.diets || "").split("").map((i) => d.diets[Number(i)]);
    return r;
  }).filter((r) => r.id);  // only restaurants with a page here
  return ask.rows;
});
const hasDiet = (r, d) => !d || r.diets.includes(d) || (d === "vegetarian" && (r.diets.includes("vegetarian-menu") || r.diets.includes("vegetarian-only")));
const toCur = (n, from) => n / DATA.currencies[from].perUSD * DATA.currencies[ask.cur].perUSD;
const money = (n, cur) => symbolOf(cur) + Math.round(n).toLocaleString("en-GB");
const budgetValue = () => budgets()[ask.budget];
const budgetText = () => budgetValue() ? money(budgetValue(), ask.cur) : "No limit";

// What a restaurant costs for the chosen meal: { meal, price (its own currency), wine, total (visitor's currency), est }.
// "value" (and "weekend", for one restaurant on its own) takes whichever of lunch and dinner is cheaper. null when there's no price for that meal.
function bill(r, meal) {
  meal = meal || ask.meal || "dinner";
  const opts = [];
  if (meal !== "lunch" && r.dinnerType === "menu" && r.dinner != null) opts.push({ meal: "dinner", price: r.dinner, wine: r.wine });
  if (meal !== "dinner" && r.lunch > 0) opts.push({ meal: "lunch", price: r.lunch, wine: r.lunchWine });
  if (!opts.length || !DATA.currencies[r.cur]) return null;
  opts.forEach((o) => {
    o.est = ask.wine && o.wine == null;
    o.total = toCur(o.price + (ask.wine ? (o.wine != null ? o.wine : o.price * (WINE_ROOM - 1)) : 0), r.cur);
  });
  return opts.sort((a, b) => a.total - b.total)[0];
}

// ---------- Filtering, one answer at a time ----------
const visitedIds = () => Object.keys(loadVisited());
function inWhere(r) {
  const w = ask.where;
  if (!w || w.any) return true;
  if (w.near) return r.d <= w.km * 1000;
  return r.path.startsWith(w.path);
}
const TESTS = {
  where: (r) => inWhere(r) && (ask.withVisited || !visitedIds().includes(r.id)),
  meal: (r) => ask.meal === "weekend" ? r.lunch > 0 || (r.dinnerType === "menu" && r.dinner != null) : !(ask.meal === "lunch" && r.lunch === -1),
  budget: (r) => { if (!budgetValue()) return true; const b = bill(r); return !!b && b.total <= budgetValue() + 0.5; },
  stars: (r) => !ask.stars || r.stars >= ask.stars,
  food: (r) => !ask.food || !ask.food.length || ask.food.includes(moodOf(r)),
  diet: (r) => hasDiet(r, ask.diet)
};
// Restaurants passing every answer before step `upTo` (all answers when upTo is 6), with `override` tried in place of one answer.
// In weekend mode the budget is for two meals, so a restaurant fits when it makes a pair within it with another that passes too.
function pool(upTo, override) {
  const saved = {};
  if (override) Object.keys(override).forEach((k) => { saved[k] = ask[k]; ask[k] = override[k]; });
  const steps = STEPS.slice(0, upTo), pairUp = ask.meal === "weekend" && steps.includes("budget");
  const tests = steps.filter((s) => !(pairUp && s === "budget")).map((s) => TESTS[s]);
  let out = ask.rows.filter((r) => tests.every((f) => f(r)));
  if (pairUp) out = withPartner(out, budgetValue() || Infinity);
  Object.keys(saved).forEach((k) => { ask[k] = saved[k]; });
  return out;
}

// ---------- Weekend mode: a lunch and a dinner ----------
// Restaurants within PAIR_KM of each other, found through a grid of cells about 44 km tall so only nearby ones are compared.
const CELL = 0.4;
function neighbours(list) {
  const grid = new Map();
  list.forEach((r) => { r._l = bill(r, "lunch"); r._d = bill(r, "dinner"); const k = Math.floor(r.lat / CELL) + ":" + Math.floor(r.lng / CELL); (grid.get(k) || grid.set(k, []).get(k)).push(r); });
  return (r, each) => {
    const y = Math.floor(r.lat / CELL), x = Math.floor(r.lng / CELL), span = Math.ceil(1 / Math.max(0.3, Math.cos(r.lat * Math.PI / 180)));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -span; dx <= span; dx++) {
      (grid.get((y + dy) + ":" + (x + dx)) || []).forEach((o) => { if (o !== r) { const m = metresBetween(r, o); if (m <= PAIR_KM * 1000) each(o, m); } });
    }
  };
}
function withPartner(list, budget) {
  const near = neighbours(list);
  return list.filter((r) => {
    let ok = false;
    near(r, (o) => { if (!ok && ((r._l && o._d && r._l.total + o._d.total <= budget + 0.5) || (r._d && o._l && r._d.total + o._l.total <= budget + 0.5))) ok = true; });
    return ok;
  });
}
// The plans: each lunch with its best partners for dinner, then the best match, the best value and a wildcard among them.
const pairScore = (p) => scoreOf(p.l) + scoreOf(p.d) + (moodOf(p.l) !== moodOf(p.d) ? 0.2 : 0);
const pairPerStar = (p) => p.total / (STAR_WEIGHT[p.l.stars] + STAR_WEIGHT[p.d.stars]);
const rising = (r) => r.change === "new" || r.change === "up";
function weekendPlans(list) {
  const budget = budgetValue() || Infinity, near = neighbours(list), found = [];
  list.forEach((l) => {
    if (!l._l) return;
    const mine = [];
    near(l, (d, m) => { if (d._d && l._l.total + d._d.total <= budget + 0.5) mine.push({ l, d, total: l._l.total + d._d.total, km: m / 1000 }); });
    const byScore = mine.sort((a, b) => pairScore(b) - pairScore(a)).slice(0, 4);
    const cheap = mine.slice().sort((a, b) => pairPerStar(a) - pairPerStar(b))[0];
    found.push(...byScore, ...[cheap].concat(mine.filter((p) => rising(p.d)).slice(0, 1)).filter((p) => p && !byScore.includes(p)));
  });
  const ranked = found.sort((a, b) => pairScore(b) - pairScore(a) || a.total - b.total);
  const best = ranked[0];
  const shares = (p, q) => q && (p.l === q.l || p.l === q.d || p.d === q.l || p.d === q.d);
  const value = ranked.filter((p) => !shares(p, best)).sort((a, b) => pairPerStar(a) - pairPerStar(b))[0] ||
    ranked.filter((p) => p !== best).sort((a, b) => pairPerStar(a) - pairPerStar(b))[0];
  const rest = ranked.filter((p) => !shares(p, best) && !shares(p, value));
  const risingPlan = rest.find((p) => rising(p.l) || rising(p.d));
  const different = best && rest.find((p) => ![moodOf(best.l), moodOf(best.d)].includes(moodOf(p.l)) || ![moodOf(best.l), moodOf(best.d)].includes(moodOf(p.d)));
  const wild = risingPlan || different || rest[0];
  return { best, value, wild, wildWhy: wild === risingPlan ? "rising" : wild === different ? "different" : "next" };
}
const plural = (n, one, many) => n.toLocaleString("en-GB") + " " + (n === 1 ? one : many || one + "s");

// ---------- The questions ----------
function renderStep() {
  const s = STEPS[ask.step];
  $("quiz").hidden = false;
  $("result").hidden = true;
  $("backBtn").hidden = ask.step === 0;
  $("stepNo").textContent = (ask.step + 1) + " of " + STEPS.length;
  $("stepDots").innerHTML = STEPS.map((x, i) => '<li class="' + (i < ask.step ? "done" : i === ask.step ? "now" : "") + '">' +
    (i < ask.step ? '<button type="button" data-goto="' + i + '" aria-label="Back to question ' + (i + 1) + '"></button>' : "<span></span>") + "</li>").join("");
  const body = $("stepBody");
  body.innerHTML = STEP_HTML[s]();
  body.classList.remove("pick-in"); void body.offsetWidth; body.classList.add("pick-in");
  const h = body.querySelector("h2");
  if (h && ask.started) h.focus({ preventScroll: true });
  if (s === "where") wireWhere();
  if (s === "budget") updateBudget();
  renderLeft();
}
function renderLeft() {
  const n = pool(ask.step).length;
  $("leftCount").innerHTML = ask.step === 0 || STEPS[ask.step] === "budget" ? "" : "<strong>" + plural(n, "restaurant") + "</strong> still in the running";
}
function option(attrs, title, sub, n, pressed) {
  const off = n === 0;
  return '<button type="button" class="pick-opt" ' + attrs + (off ? " disabled" : "") + (pressed != null ? ' aria-pressed="' + pressed + '"' : "") + ">" +
    '<span class="po-title">' + title + "</span>" + (sub ? '<span class="po-sub">' + sub + "</span>" : "") +
    (n != null ? '<span class="po-n">' + (off ? "none" : n.toLocaleString("en-GB")) + "</span>" : "") + "</button>";
}
const STEP_HTML = {
  where() {
    const pop = DATA.popular.map((p) => DATA.spots.find((s) => s[1] === p)).filter(Boolean);
    return '<h2 tabindex="-1">Where do you want to eat?</h2>' +
      '<p class="pick-hint">A city, region or country, or wherever you are now.</p>' +
      '<div class="pick-where">' +
      '<button type="button" class="cta-btn near-locate" id="locateBtn"><svg aria-hidden="true"><use href="#locate"/></svg><span>Near me</span></button>' +
      '<div class="pick-find"><label class="search" for="whereQ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
      '<input id="whereQ" type="search" autocomplete="off" enterkeyhint="search" placeholder="Type a city or country" aria-label="City, region or country" aria-controls="whereList"></label>' +
      '<ul class="pick-suggest" id="whereList" hidden></ul></div></div>' +
      '<p class="pick-status" id="whereStatus" aria-live="polite"></p>' +
      '<div class="pick-chips">' + pop.map((s) => '<button type="button" class="pick-chip" data-where="' + esc(s[1]) + '">' + esc(s[0]) + ' <span>' + s[2] + "</span></button>").join("") +
      '<button type="button" class="pick-chip" data-where="any">Anywhere in the world <span>' + ask.rows.length.toLocaleString("en-GB") + "</span></button></div>" +
      '<p class="pick-privacy">“Near me” uses your location in this browser only: we never see it or store it.</p>';
  },
  meal() {
    const base = pool(1);
    const lunchN = base.filter((r) => r.lunch !== -1).length;
    const pairN = withPartner(base.filter((r) => r.lunch > 0 || (r.dinnerType === "menu" && r.dinner != null)), Infinity).length;
    return '<h2 tabindex="-1">Lunch or dinner?</h2>' +
      '<p class="pick-hint">Lunch is often the cheapest way into a starred kitchen.</p><div class="pick-opts pick-opts-2">' +
      option('data-meal="dinner"', "Dinner", "The full tasting menu", base.length, ask.meal === "dinner") +
      option('data-meal="lunch"', "Lunch", "Often a shorter menu for less", lunchN, ask.meal === "lunch") +
      option('data-meal="value"', "Whichever's better value", "We'll compare each restaurant's cheapest menu", base.length, ask.meal === "value") +
      option('data-meal="weekend"', "A lunch and a dinner", "Two restaurants for a weekend away, one budget for both", pairN, ask.meal === "weekend") + "</div>";
  },
  budget() {
    const two = ask.meal === "weekend";
    return '<h2 tabindex="-1">' + (two ? "What's your budget for both meals?" : "What\'s your budget per person?") + "</h2>" +
      '<p class="pick-hint">' + (two ? "Per person, for the lunch and the dinner together" : "For the menu") + ", before service" + (ask.meal === "value" ? ", at lunch or dinner" : "") + ". Prices in other currencies are converted.</p>" +
      '<div class="pick-budget"><div class="pick-amount" id="budgetShow"></div>' +
      '<div class="seg pick-cur" role="group" aria-label="Currency">' + DATA.switchable.map((c) => '<button type="button" data-cur="' + c + '" aria-pressed="' + (ask.cur === c) + '">' + esc(DATA.currencies[c].symbol) + "</button>").join("") + "</div></div>" +
      '<input type="range" class="pick-range" id="budgetRange" min="0" max="' + (budgets().length - 1) + '" step="1" value="' + ask.budget + '" aria-label="' + (two ? "Budget per person for both meals" : "Budget per person") + '">' +
      '<div class="pick-scale"><span>' + money(budgets()[0], ask.cur) + "</span><span>No limit</span></div>" +
      '<label class="pick-wine"><input type="checkbox" id="wineBox"' + (ask.wine ? " checked" : "") + "> Include a wine pairing</label>" +
      '<p class="pick-note" id="wineNote"' + (ask.wine ? "" : " hidden") + ">Where a restaurant doesn't list its pairing price, we leave room for one: about 60% on top of the menu, which is typical.</p>" +
      '<p class="pick-fit" id="budgetFit" aria-live="polite"></p>' +
      '<div class="pick-next"><button type="button" class="cta-btn" data-next="budget">Next</button></div>';
  },
  stars() {
    const n = (s) => pool(3).filter((r) => !s || r.stars >= s).length;
    // An option the budget rules out says so, rather than just "none".
    const sub = (s, text) => !n(s) && budgetValue() && pool(2).some((r) => r.stars >= s) ? "None within " + budgetText() + (ask.wine ? " with wine" : "") : text;
    return '<h2 tabindex="-1">How many stars?</h2>' +
      '<p class="pick-hint">One star: high-quality cooking. Two: excellent cooking, worth a detour. Three: exceptional, worth a special journey.</p><div class="pick-opts">' +
      option('data-stars="0"', "Any number", "Let the food decide", n(0), ask.stars === 0) +
      option('data-stars="2"', "At least two " + starIcons(2), sub(2, "Worth a detour"), n(2), ask.stars === 2) +
      option('data-stars="3"', "Three stars only " + starIcons(3), sub(3, "The bucket-list meal"), n(3), ask.stars === 3) + "</div>";
  },
  food() {
    const base = pool(4), counts = {};
    base.forEach((r) => { counts[moodOf(r)] = (counts[moodOf(r)] || 0) + 1; });
    const chosen = ask.food || [];
    const moods = MOODS.filter(([k]) => counts[k] || chosen.includes(k)).sort((a, b) => (counts[b[0]] || 0) - (counts[a[0]] || 0));
    return '<h2 tabindex="-1">What are you in the mood for?</h2>' +
      '<p class="pick-hint">Choose as many as you like, or none for anything.</p>' +
      '<div class="pick-chips pick-moods">' + moods.map(([k, label]) => '<button type="button" class="pick-chip" data-food="' + k + '" aria-pressed="' + chosen.includes(k) + '">' + esc(label) + " <span>" + (counts[k] || 0) + "</span></button>").join("") + "</div>" +
      '<div class="pick-next"><button type="button" class="cta-btn" data-next="food" id="foodNext">' + (chosen.length ? "Next" : "Anything goes") + "</button></div>";
  },
  diet() {
    const base = pool(5);
    return '<h2 tabindex="-1">Any dietary needs?</h2>' +
      '<p class="pick-hint">From the options each restaurant lists in the MICHELIN Guide. Always check when you book.</p><div class="pick-opts pick-opts-wide">' +
      DIET_CHOICES.map(([k, label]) => option('data-diet="' + k + '"', label, "", base.filter((r) => hasDiet(r, k)).length, ask.diet === k)).join("") + "</div>";
  }
};

// ---------- Where ----------
function wireWhere() {
  const input = $("whereQ"), list = $("whereList");
  const show = () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { list.hidden = true; return; }
    // Match the start of any word in the name or where it is: "lon" finds London, not Catalonia.
    const words = (text) => (" " + text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")).includes(" " + q.replace(/[^\p{L}\p{N}]+/gu, " "));
    const hits = DATA.spots.filter((s) => words(s[0]) || words(s[0] + " " + s[3]))
      .sort((a, b) => (b[0].toLowerCase().startsWith(q) - a[0].toLowerCase().startsWith(q)) || b[2] - a[2]).slice(0, 8);
    list.innerHTML = hits.length ? hits.map((s) => '<li><button type="button" data-where="' + esc(s[1]) + '"><strong>' + esc(s[0]) + "</strong>" +
      (s[3] ? ' <span class="ps-ctx">' + esc(s[3]) + "</span>" : "") + ' <span class="ps-n">' + plural(s[2], "restaurant") + "</span></button></li>").join("")
      : '<li class="ps-none">No starred restaurants found for “' + esc(input.value.trim()) + "”. Try a city or country name.</li>";
    list.hidden = false;
  };
  input.addEventListener("input", show);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); const b = list.querySelector("button"); if (b) b.click(); }
    if (e.key === "ArrowDown") { const b = list.querySelector("button"); if (b) { e.preventDefault(); b.focus(); } }
  });
  list.addEventListener("keydown", (e) => {
    const items = [...list.querySelectorAll("button")], i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && i < items.length - 1) { e.preventDefault(); items[i + 1].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); (i > 0 ? items[i - 1] : input).focus(); }
  });
  $("locateBtn").addEventListener("click", locate);
}
function setWhere(value) {
  if (value === "any") ask.where = { any: true, label: "anywhere in the world", key: "any" };
  else {
    const s = DATA.spots.find((x) => x[1] === value);
    if (!s) return false;
    ask.where = { path: s[1], name: s[0], label: "in " + s[0], key: s[1] };
  }
  return true;
}
function locate() {
  const btn = $("locateBtn");
  const say = (text) => { if ($("whereStatus")) { $("whereStatus").textContent = text; $("whereStatus").classList.add("error"); } };
  if (!navigator.geolocation) { say("This browser can't share your location. Type a city or country instead."); return; }
  btn.disabled = true; btn.querySelector("span").textContent = "Finding you…";
  navigator.geolocation.getCurrentPosition((pos) => {
    const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    ask.rows.forEach((r) => { r.d = metresBetween(here, r); });
    // The smallest circle with a dozen restaurants to choose from.
    const radii = useMiles() ? NEAR_MI.map((m) => m * 1.609344) : NEAR_KM;
    const i = radii.findIndex((k) => ask.rows.filter((r) => r.d <= k * 1000).length >= 12);
    const k = i > -1 ? i : radii.length - 1;
    ask.where = { near: true, km: radii[k], key: "near", label: "within " + (useMiles() ? NEAR_MI[k] + " miles" : NEAR_KM[k] + " km") + " of you" };
    track("pick-step", { step: "where", answer: "near" });
    // A shared "near me" link: once we know where this visitor is, go straight to their picks.
    if (ask.pendingGo) { ask.pendingGo = false; ask.started = true; showResult(); } else advance();
  }, (err) => {
    btn.disabled = false; btn.querySelector("span").textContent = "Near me";
    say(err.code === 1 ? "Location access is turned off for this page. Allow it in your browser's settings, or type a city or country instead."
      : "Couldn't find your location just now. Try again, or type a city or country instead.");
  }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
}

// ---------- Budget ----------
function updateBudget() {
  if (!$("budgetShow")) return;
  $("budgetShow").innerHTML = budgetValue() ? money(budgetValue(), ask.cur) + " <small>per person" + (ask.meal === "weekend" ? " for both" : "") + (ask.wine ? ", with wine" : "") + "</small>" : "No limit";
  const fit = pool(3).length, all = pool(2).length;
  const priced = pool(2).filter((r) => bill(r)).length;
  $("budgetFit").innerHTML = budgetValue()
    ? "<strong>" + plural(fit, "restaurant") + "</strong> fit" + (fit < priced ? " out of " + priced.toLocaleString("en-GB") + " with a price" : "") + (fit === 0 ? ". Try a little more." : "")
    : "<strong>" + plural(all, "restaurant") + "</strong>, including " + plural(all - priced, "without a price", "without a price") + " yet";
  $("budgetRange").setAttribute("aria-valuetext", budgetText());
}
// The step on the budget slider nearest an amount (never "no limit").
function nearestBudget(want) {
  const list = budgets();
  return list.slice(0, -1).reduce((best, v, i) => Math.abs(v - want) < Math.abs(list[best] - want) ? i : best, 0);
}
// Moving into or out of weekend mode doubles or halves the budget, as it then covers two meals or one.
function setMeal(meal) {
  const was = budgetValue(), two = (m) => m === "weekend";
  const change = two(meal) !== two(ask.meal);
  ask.meal = meal;
  if (change) ask.budget = was ? nearestBudget(two(meal) ? was * 2 : was / 2) : budgets().length - 1;
}
function defaultCurrency() {
  const saved = store.get(PREFS_KEY, {}).pickCur;
  if (saved && DATA.switchable.includes(saved)) return saved;
  const l = (navigator.language || "en-US").toLowerCase();
  if (/-gb$/.test(l) || l === "en-gb") return "GBP";
  if (/^(de|fr|it|es|nl|pt|fi|el|sk|sl|et|lv|lt|mt|ga|ca)\b/.test(l) || /-(ie|at|be|lu)$/.test(l)) return "EUR";
  return "USD";
}

// ---------- Moving through ----------
function advance() {
  ask.started = true;
  if (ask.step < STEPS.length - 1) {
    ask.step += 1;
    renderStep();
    $("quiz").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } else showResult();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.where != null && b.closest("#quiz")) {
    if (setWhere(b.dataset.where)) { track("pick-step", { step: "where", answer: b.dataset.where }); advance(); }
  } else if (b.dataset.meal && b.closest("#quiz")) { setMeal(b.dataset.meal); track("pick-step", { step: "meal", answer: ask.meal }); advance(); }
  else if (b.dataset.cur) {
    // Keep roughly the same amount when switching currency.
    const was = budgetValue(), from = ask.cur;
    ask.cur = b.dataset.cur;
    if (was) ask.budget = nearestBudget(was / DATA.currencies[from].perUSD * DATA.currencies[ask.cur].perUSD);
    const prefs = store.get(PREFS_KEY, {}); prefs.pickCur = ask.cur; store.set(PREFS_KEY, prefs);
    if ($("budgetRange")) { renderStep(); } else showResult();
  }
  else if (b.dataset.next === "budget") { track("pick-step", { step: "budget", answer: budgetValue() ? budgetValue() + " " + ask.cur : "no-limit", wine: ask.wine ? "yes" : "no" }); advance(); }
  else if (b.dataset.stars != null && b.closest("#quiz")) { ask.stars = Number(b.dataset.stars); track("pick-step", { step: "stars", answer: String(ask.stars) }); advance(); }
  else if (b.dataset.food) {
    const k = b.dataset.food, list = ask.food || [];
    ask.food = list.includes(k) ? list.filter((x) => x !== k) : list.concat(k);
    b.setAttribute("aria-pressed", String(ask.food.includes(k)));
    $("foodNext").textContent = ask.food.length ? "Next" : "Anything goes";
    $("leftCount").innerHTML = "<strong>" + plural(pool(5).length, "restaurant") + "</strong> still in the running";
  }
  else if (b.dataset.next === "food") { track("pick-step", { step: "food", answer: (ask.food || []).join(",") || "anything" }); ask.food = ask.food || []; advance(); }
  else if (b.dataset.diet != null && b.closest("#quiz")) { ask.diet = b.dataset.diet; track("pick-step", { step: "diet", answer: ask.diet || "none" }); advance(); }
  else if (b.id === "backBtn") { ask.step = Math.max(0, ask.step - 1); renderStep(); }
  else if (b.dataset.goto != null) { ask.step = Number(b.dataset.goto); ask.started = true; renderStep(); $("quiz").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  else if (b.dataset.edit != null) { ask.step = Number(b.dataset.edit); ask.started = true; renderStep(); $("quiz").scrollIntoView({ behavior: "smooth", block: "start" }); }
  else if (b.dataset.relax) { relax(b.dataset.relax); }
  else if (b.id === "restartBtn") { restart(); }
  else if (b.id === "moreBtn") { ask.shown += 10; renderMore(); track("pick-more"); }
  else if (b.id === "shareBtnPick") { sharePicks(b); }
  else if (b.id === "cmpToggle") {
    const open = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(open));
    $("cmpBox").hidden = !open;
    b.textContent = open ? "Hide the side-by-side" : "Compare your picks side by side";
    if (open) track("pick-compare");
  }
  else if (b.id === "visitedBtn") { ask.withVisited = !ask.withVisited; showResult(); }
  else if (b.dataset.wish) {
    const list = loadWishlist(), id = b.dataset.wish, on = list.includes(id);
    setWishlist(on ? list.filter((x) => x !== id) : list.concat(id));
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "budgetRange") { ask.budget = Number(e.target.value); updateBudget(); renderLeft(); }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "wineBox") { ask.wine = e.target.checked; $("wineNote").hidden = !ask.wine; updateBudget(); renderLeft(); }
});
window.addEventListener("sb:wishlist", () => { renderWishCount(); document.querySelectorAll("[data-wish]").forEach((b) => { const on = loadWishlist().includes(b.dataset.wish); b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }); });
window.addEventListener("sb:visited", () => { if (!$("result").hidden) showResult(); });
function restart() {
  Object.assign(ask, { step: 0, where: null, meal: null, budget: BUDGETS_ONE.indexOf(200), wine: false, stars: null, food: null, diet: null, withVisited: false, started: true });
  history.replaceState(null, "", location.pathname);
  track("pick-restart");
  renderStep();
  $("quiz").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- The picks ----------
const bayes = (r) => r.rating ? (r.rating * (r.reviews || 0) + 4.4 * 30) / ((r.reviews || 0) + 30) : 4.4;
const scoreOf = (r) => r.stars + (bayes(r) - 4.4) * 2.5 + (loadWishlist().includes(r.id) ? 0.6 : 0) + (r.change === "new" || r.change === "up" ? 0.15 : 0);
const STAR_WEIGHT = { 1: 1, 2: 1.8, 3: 2.6 };
const perStar = (r) => bill(r).total / STAR_WEIGHT[r.stars];
const ratingText = (r) => r.rating ? r.rating.toFixed(1) + " on Google" + (r.reviews ? " from " + plural(r.reviews, "review") : "") : "";
const mealWord = (b) => b.meal === "lunch" ? "lunch" : "dinner";

function choose(list) {
  // Restaurants with a price come first: one without is only picked when nothing priced fits.
  const ranked = list.slice().sort((a, b) => !bill(a) - !bill(b) || scoreOf(b) - scoreOf(a));
  const best = ranked[0];
  const priced = ranked.filter((r) => r !== best && bill(r));
  const value = priced.slice().sort((a, b) => perStar(a) - perStar(b) || scoreOf(b) - scoreOf(a))[0];
  const rest = ranked.filter((r) => r !== best && r !== value);
  const rising = rest.filter((r) => r.change === "new" || r.change === "up")[0];
  const different = rest.filter((r) => best && moodOf(r) !== moodOf(best))[0];
  const wild = rising || different || rest[0];
  return { ranked, best, value, wild, wildWhy: wild === rising ? "rising" : wild === different ? "different" : "next" };
}
function reason(kind, r, ctx) {
  const b = bill(r);
  if (kind === "best") {
    if (ctx.n === 1) return "The only restaurant that fits all your answers" + (r.rating ? ": " + ratingText(r) + "." : ".");
    return (loadWishlist().includes(r.id) ? "On your wishlist, and the " : "The ") + "best-rated " + STAR_WORDS[r.stars] + " " + (ctx.whereShort ? ctx.whereShort + " " : "") +
      "that fits your answers" + (r.rating ? ": " + ratingText(r) + "." : ".");
  }
  if (kind === "value") return (r.stars === 1 ? "A star" : r.stars === 2 ? "Two stars" : "Three stars") + " for " + (b.est ? "about " : "") + money(b.total, ask.cur) + (ask.wine ? " with wine" : "") + " at " + mealWord(b) +
    ": the least per star of your " + plural(ctx.n, "match", "matches") + ".";
  if (ctx.wildWhy === "rising") return r.change === "new" ? "A wildcard: newly starred in the latest MICHELIN Guide." : "A wildcard: promoted to " + (r.stars === 3 ? "three stars" : "two stars") + " in the latest MICHELIN Guide.";
  if (ctx.wildWhy === "different") return "A wildcard: something different, " + (r.cuisine || moodName(moodOf(r))).toLowerCase() + (r.rating ? ", " + ratingText(r) : "") + ".";
  return "Also a strong fit" + (r.rating ? ": " + ratingText(r) : "") + ".";
}
function priceLines(r) {
  const b = bill(r), out = [];
  if (!b) return '<span class="pc-price">' + (ask.meal === "lunch" && r.lunch == null ? "Lunch price not listed yet" : "Price not listed yet") + "</span>";
  const local = localMoney(b.price, r.cur);
  const conv = r.cur !== ask.cur ? ' <span class="pc-conv">≈ ' + money(toCur(b.price, r.cur), ask.cur) + "</span>" : "";
  out.push('<span class="pc-price"><strong>' + local + "</strong>" + conv + " " + mealWord(b) + " menu</span>");
  if (ask.wine) out.push('<span class="pc-sub">' + (b.wine != null ? "+ " + localMoney(b.wine, r.cur) + " wine pairing" : "Wine pairing price not listed") + "</span>");
  else if (b.wine != null) out.push('<span class="pc-sub">Wine pairing ' + localMoney(b.wine, r.cur) + "</span>");
  if (b.meal === "dinner" && r.lunch > 0) out.push('<span class="pc-sub">Lunch ' + localMoney(r.lunch, r.cur) + "</span>");
  if (b.meal === "lunch" && r.dinnerType === "menu" && r.dinner != null) out.push('<span class="pc-sub">Dinner ' + localMoney(r.dinner, r.cur) + "</span>");
  if (ask.wine && b.est) out.push('<span class="pc-sub pc-est">Total with a typical pairing ≈ ' + money(b.total, ask.cur) + "</span>");
  return out.join("");
}
const BADGE_DIETS = [["vegetarian-only", "badgeVegOnly", "dietVegOnly"], ["vegetarian-menu", "badgeVegMenu", "dietVegMenu"], ["vegan", "badgeVegan", "dietVegan"]];
const badges = (r) => BADGE_DIETS.filter(([d]) => r.diets.includes(d) && !(d === "vegetarian-menu" && r.diets.includes("vegetarian-only")))
  .map(([, short, full]) => '<span class="diet-badge" title="' + esc(t(full)) + '"><svg aria-hidden="true"><use href="#leaf"/></svg>' + esc(t(short)) + "</span>").join("");
const linkOf = (r) => r.path + "?q=" + encodeURIComponent(r.name);
function wishBtn(r) {
  const on = loadWishlist().includes(r.id);
  return '<button type="button" class="wish' + (on ? " on" : "") + '" data-wish="' + esc(r.id) + '" aria-pressed="' + on + '" aria-label="' + esc(t(on ? "wishRemove" : "wishAdd", { name: r.name })) + '">' + heart + "</button>";
}
function card(kind, label, r, ctx) {
  if (!r) return "";
  return '<article class="pick-card pick-' + kind + '"><div class="pc-head"><span class="pc-label">' + label + "</span>" + wishBtn(r) + "</div>" +
    '<h3><a href="' + esc(linkOf(r)) + '">' + esc(r.name) + "</a></h3>" + starIcons(r.stars) +
    '<p class="pc-where">' + esc(r.cuisine) + " · " + esc(r.where) + "</p>" +
    (r.chef ? '<p class="pc-chef">' + esc(t("chefLabel", { name: r.chef })) + "</p>" : "") +
    '<p class="pc-why">' + esc(reason(kind, r, ctx)) + "</p>" +
    '<div class="pc-prices">' + priceLines(r) + "</div>" +
    (badges(r) ? '<div class="diet-badges">' + badges(r) + "</div>" : "") +
    '<a class="pc-go" href="' + esc(linkOf(r)) + '">Compare prices →</a></article>';
}
// Weekend mode: one plan is a lunch and a dinner, with the total for both.
const STARS_IN_WORDS = ["", "One star", "Two stars", "Three stars", "Four stars", "Five stars", "Six stars"];
function planReason(kind, p, ctx) {
  const stars = p.l.stars + p.d.stars, total = (p.l._l.est || p.d._d.est ? "about " : "") + money(p.total, ask.cur) + (ask.wine ? " with wine" : "");
  if (kind === "best") return ctx.one ? "The only pair that fits all your answers." : "The best-rated lunch and dinner " + (ctx.whereShort ? ctx.whereShort + " " : "") + "that fit your budget together.";
  if (kind === "value") return STARS_IN_WORDS[stars] + " for " + total + ": the least per star of your plans.";
  const r = rising(p.l) ? p.l : rising(p.d) ? p.d : null;
  if (ctx.wildWhy === "rising" && r) return "A wildcard: " + r.name + (r.change === "new" ? " is newly starred" : " was promoted") + " in the latest MICHELIN Guide.";
  if (ctx.wildWhy === "different") return "A wildcard: something different, " + (p.l.cuisine || moodName(moodOf(p.l))).toLowerCase() + " then " + (p.d.cuisine || moodName(moodOf(p.d))).toLowerCase() + ".";
  return "Also a strong pair within your budget.";
}
function planMeal(r, meal) {
  const b = meal === "lunch" ? r._l : r._d;
  const conv = r.cur !== ask.cur ? ' <span class="pc-conv">≈ ' + money(toCur(b.price, r.cur), ask.cur) + "</span>" : "";
  return '<div class="pw-meal"><div class="pc-head"><span class="pw-when">' + (meal === "lunch" ? "Lunch" : "Dinner") + "</span>" + wishBtn(r) + "</div>" +
    '<h3><a href="' + esc(linkOf(r)) + '">' + esc(r.name) + "</a></h3>" + starIcons(r.stars) +
    '<p class="pc-where">' + esc(r.cuisine) + " · " + esc(r.where) + "</p>" +
    '<p class="pc-price"><strong>' + localMoney(b.price, r.cur) + "</strong>" + conv + " " + meal + " menu" +
    (ask.wine ? '<span class="pc-sub"> + ' + (b.wine != null ? localMoney(b.wine, r.cur) + " wine" : "wine (price not listed)") + "</span>" : "") + "</p></div>";
}
function planCard(kind, label, p, ctx) {
  if (!p) return "";
  const est = ask.wine && (p.l._l.est || p.d._d.est);
  return '<article class="pick-card pick-plan pick-' + kind + '"><span class="pc-label">' + label + "</span>" +
    '<p class="pc-why">' + esc(planReason(kind, p, ctx)) + "</p>" + planMeal(p.l, "lunch") + planMeal(p.d, "dinner") +
    '<div class="pc-prices"><span class="pc-price"><strong>' + (est ? "≈ " : "") + money(p.total, ask.cur) + "</strong> per person for both" + (ask.wine ? ", with wine" : "") + "</span>" +
    (est ? '<span class="pc-sub pc-est">Includes a typical pairing where the price isn\'t listed</span>' : "") +
    '<span class="pc-sub">' + (p.km < 1 ? "Less than 1 km apart" : useMiles() ? Math.round(p.km / 1.609344) + (Math.round(p.km / 1.609344) === 1 ? " mile" : " miles") + " apart" : Math.round(p.km) + " km apart") + "</span></div></article>";
}

// Side by side: the picks in one table, the lowest price and the best rating ticked.
function compareTable(picks) {
  const cols = picks.filter((x) => x[1]);
  if (cols.length < 2) return "";
  const conv = (n, r) => r.cur !== ask.cur ? ' <span class="pc-conv">≈ ' + money(toCur(n, r.cur), ask.cur) + "</span>" : "";
  const price = (n, r) => localMoney(n, r.cur) + conv(n, r);
  const bills = cols.map(([, r]) => bill(r));
  const totals = bills.map((b) => b ? b.total : null).filter((x) => x != null), low = Math.min(...totals);
  const rated = cols.map(([, r]) => r.rating || 0), top = Math.max(...rated);
  const tick = ' <span class="cmp-tick" title="Best of these">✓</span>';
  const row = (label, cells, num) => "<tr" + (num ? ' class="num"' : "") + '><th scope="row">' + label + "</th>" + cells.map((c) => "<td>" + c + "</td>").join("") + "</tr>";
  const meal = ask.meal === "lunch" ? "lunch" : ask.meal === "dinner" ? "dinner" : "meal";
  const rows = [
    row("Stars", cols.map(([, r]) => starIcons(r.stars))),
    row("Food", cols.map(([, r]) => esc(r.cuisine || "–"))),
    row("Where", cols.map(([, r]) => esc(r.where || "–"))),
    row("Head chef", cols.map(([, r]) => esc(r.chef || "–"))),
    row("Dinner menu", cols.map(([, r]) => r.dinnerType === "menu" && r.dinner != null ? price(r.dinner, r) : "Not listed"), true),
    row("Lunch", cols.map(([, r]) => r.lunch > 0 ? price(r.lunch, r) : r.lunch === -1 ? "No lunch" : "Not listed"), true),
    row("Wine pairing", cols.map(([, r], i) => { const b = bills[i], w = b ? b.wine : r.wine; return w != null ? price(w, r) + (b && b.meal === "lunch" ? " <small>with lunch</small>" : "") : "Not listed"; }), true),
    row("Your " + meal + (ask.wine ? " with wine" : ""), cols.map(([, r], i) => { const b = bills[i]; return b ? "<strong>" + (b.est ? "≈ " : "") + money(b.total, ask.cur) + "</strong>" + (ask.meal === "value" ? " <small>" + b.meal + "</small>" : "") + (Math.round(b.total) === Math.round(low) && totals.length > 1 ? tick : "") : "Not listed"; }), true),
    row("Google rating", cols.map(([, r]) => r.rating ? r.rating.toFixed(1) + (r.reviews ? " <small>(" + r.reviews.toLocaleString("en-GB") + ")</small>" : "") + (r.rating === top && rated.filter((x) => x === top).length < cols.length ? tick : "") : "–"), true),
    row("Dietary", cols.map(([, r]) => badges(r) || "–"))
  ];
  const ids = cols.map(([, r]) => r.id).join(",");
  return '<div class="pick-compare"><button type="button" class="linkish" id="cmpToggle" aria-expanded="false" aria-controls="cmpBox">Compare your picks side by side</button>' +
    '<div id="cmpBox" hidden><div class="pick-cmp-wrap"><table class="pick-cmp" style="--n: ' + cols.length + '"><thead><tr><td></td>' +
    cols.map(([label, r]) => '<th scope="col"><span class="pc-label">' + label + '</span><a href="' + esc(linkOf(r)) + '">' + esc(r.name) + "</a></th>").join("") +
    "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>" +
    '<p class="pick-note">Prices per person before service. <a href="/compare/?r=' + esc(ids) + '">See them as till receipts in Compare →</a></p></div></div>';
}
function summary() {
  const food = ask.food && ask.food.length ? ask.food.map(moodName).join(", ") : "Any food";
  const parts = [
    ask.where.near ? "Near me" : ask.where.any ? "Anywhere" : ask.where.name,
    ask.meal === "weekend" ? "Lunch and dinner" : ask.meal === "value" ? "Best-value meal" : ask.meal === "lunch" ? "Lunch" : "Dinner",
    (budgetValue() ? "Up to " + money(budgetValue(), ask.cur) + (ask.meal === "weekend" ? " for both" : "") : "No budget limit") + (ask.wine ? " with wine" : ""),
    ask.stars ? (ask.stars === 3 ? "Three stars" : "Two stars or more") : "Any stars",
    food, ask.diet ? DIET_CHOICES.find(([k]) => k === ask.diet)[1] : "No dietary needs"
  ];
  return '<div class="pick-summary" aria-label="Your answers">' + parts.map((p, i) => '<button type="button" class="pick-chip" data-edit="' + i + '" title="Change this answer">' + esc(p) + ' <span aria-hidden="true">✎</span></button>').join("") + "</div>";
}
// "Stretch your budget": at dinner, a lunch within the same budget that gets more stars than the best dinner match.
function lunchHack(best) {
  if (ask.meal !== "dinner" || !budgetValue()) return "";
  const lunches = pool(2).filter((r) => TESTS.food(r) && TESTS.diet(r) && TESTS.stars(r) && r.lunch > 0)
    .filter((r) => { const b = bill(r, "lunch"); return b && b.total <= budgetValue() + 0.5 && (!best || r.stars > best.stars); })
    .sort((a, b) => b.stars - a.stars || scoreOf(b) - scoreOf(a));
  const r = lunches[0];
  if (!r) return "";
  const b = bill(r, "lunch");
  return '<div class="pick-hack"><p><strong>Stretch your budget:</strong> <a href="' + esc(linkOf(r)) + '">' + esc(r.name) + "</a> " + starIcons(r.stars) +
    " serves lunch for " + (b.est ? "about " : "") + money(b.total, ask.cur) + (ask.wine ? " with wine" : "") + ", " + (best ? (r.stars - best.stars === 1 ? "a star more" : "two stars more") + " than any dinner" : "and no dinner fits") + " within " + budgetText() + ".</p>" +
    '<button type="button" class="linkish" data-relax="lunch">Show me lunch picks</button></div>';
}
// Nothing fits: offer the single changes that would bring some back.
function relaxOptions() {
  const out = [];
  const tryIt = (label, key, override) => { const n = pool(6, override).length; if (n) out.push('<button type="button" class="pick-chip" data-relax="' + key + '">' + esc(label) + " <span>" + n + "</span></button>"); };
  if (budgetValue()) {
    const i = budgets().findIndex((v, k) => k > ask.budget && pool(6, { budget: k }).length);
    if (i > -1) tryIt("Raise the budget to " + (budgets()[i] ? money(budgets()[i], ask.cur) : "no limit"), "budget:" + i, { budget: i });
  }
  if (ask.meal !== "value" && ask.meal !== "weekend") tryIt("Lunch or dinner, whichever's cheaper", "meal:value", { meal: "value" });
  if (ask.stars) tryIt("Any number of stars", "stars:0", { stars: 0 });
  if (ask.food && ask.food.length) tryIt("Any food", "food:", { food: [] });
  if (ask.diet) tryIt("Leave out the dietary filter", "diet:", { diet: "" });
  if (ask.wine) tryIt("Without wine", "wine:", { wine: false });
  if (ask.where.near && ask.where.km < 400) tryIt("Look further afield", "km", { where: Object.assign({}, ask.where, { km: 402.336 }) });
  // No single change is enough: loosen answers one after another, least important first, until something fits.
  if (!out.length) {
    const steps = [["food", [], "any food"], ["stars", 0, "any stars"], ["diet", "", "no dietary filter"], ["wine", false, "no wine"], ["meal", "value", "the cheaper meal"], ["budget", budgets().length - 1, "no budget limit"]]
      .filter(([k]) => !(k === "meal" && ask.meal === "weekend"));
    const o = {}, said = [];
    for (const [k, v, label] of steps) {
      if (JSON.stringify(ask[k]) === JSON.stringify(v) || (k === "food" && !(ask.food || []).length)) continue;
      o[k] = v; said.push(label);
      const n = pool(6, o).length;
      if (n) { out.push('<button type="button" class="pick-chip" data-relax="' + esc(JSON.stringify(o)) + '">Try ' + esc(said.join(", ")) + " <span>" + n + "</span></button>"); break; }
    }
  }
  return out.join("");
}
function relax(key) {
  if (key.startsWith("{")) Object.assign(ask, JSON.parse(key));
  else if (key === "lunch") { ask.meal = "lunch"; track("pick-lunch-hack"); }
  else if (key === "km") { ask.where = Object.assign({}, ask.where, { km: 402.336, label: "within " + (useMiles() ? "250 miles" : "400 km") + " of you" }); }
  else {
    const [k, v] = key.split(":");
    if (k === "budget") ask.budget = Number(v);
    else if (k === "meal") ask.meal = v;
    else if (k === "stars") ask.stars = Number(v);
    else if (k === "food") ask.food = [];
    else if (k === "diet") ask.diet = "";
    else if (k === "wine") ask.wine = false;
  }
  showResult();
}
function showResult() {
  ask.step = STEPS.length;
  const list = pool(6), two = ask.meal === "weekend";
  const unpriced = budgetValue() || two ? 0 : list.filter((r) => !bill(r)).length;
  const ctx = two ? weekendPlans(list) : choose(list);
  ctx.n = list.length;
  ctx.one = two && !ctx.value;
  ctx.whereShort = ask.where.near ? "near you" : ask.where.any ? "" : "in " + ask.where.name;
  ask.list = two ? [] : ctx.ranked.filter((r) => r !== ctx.best && r !== ctx.value && r !== ctx.wild);
  const plans = [ctx.best, ctx.value, ctx.wild].filter(Boolean).length;
  ask.shown = 0;
  const left = ask.withVisited ? 0 : pool(1, { withVisited: true }).length - pool(1).length;
  const head = '<div class="pick-rhead"><div><span class="eyebrow">Your picks</span><h2 tabindex="-1" id="resultH">' +
    (!list.length ? "Nothing fits all your answers" : (two ? (plans === 1 ? "One lunch and dinner" : (plans === 2 ? "Two" : "Three") + " lunch and dinner plans from " + plural(list.length, "restaurant"))
      : list.length === 1 ? "One restaurant fits" : list.length === 2 ? "Two restaurants fit" : "Three picks from " + plural(list.length, "match", "matches")) + " " + esc(ask.where.label)) + "</h2></div>" +
    '<div class="pick-actions">' + (list.length ? '<button type="button" class="cta-btn" id="shareBtnPick"><svg aria-hidden="true"><use href="#share"/></svg> Share picks</button>' : "") +
    '<button type="button" class="pick-ghost" id="restartBtn">Start again</button></div></div>' + summary();
  let bodyHtml;
  if (!list.length) {
    const opts = relaxOptions();
    bodyHtml = '<div class="pick-empty"><p>' + (opts ? (opts.includes("Try ") ? "Several answers rule each other out here. Loosen them:" : "Try changing one answer:") : "Try another place, or start again.") + "</p>" + (opts ? '<div class="pick-chips">' + opts + "</div>" : "") + "</div>";
  } else if (two) {
    bodyHtml = '<div class="pick-cards">' + planCard("best", "Best match", ctx.best, ctx) + planCard("value", "Best value", ctx.value, ctx) + planCard("wild", "Wildcard", ctx.wild, ctx) + "</div>" +
      '<p class="pick-note">Plans pair two different restaurants no more than ' + (useMiles() ? "25 miles" : PAIR_KM + " km") + " apart. Only restaurants with prices on the site are included.</p>";
  } else {
    bodyHtml = lunchHack(ctx.best) +
      '<div class="pick-cards">' + card("best", "Best match", ctx.best, ctx) + card("value", "Best value", ctx.value, ctx) + card("wild", "Wildcard", ctx.wild, ctx) + "</div>" +
      compareTable([["Best match", ctx.best], ["Best value", ctx.value], ["Wildcard", ctx.wild]]) +
      (unpriced ? '<p class="pick-note">' + plural(unpriced, "match", "matches") + " don't have a price on the site yet, so they're only picked when nothing priced fits.</p>" : "") +
      (ask.list.length ? '<div class="pick-more"><h3>More that fit</h3><ol class="near-rows" id="moreRows"></ol><button type="button" class="linkish near-more" id="moreBtn"></button></div>' : "");
  }
  const visitedNote = left > 0 || ask.withVisited ? '<p class="pick-note">' + (ask.withVisited ? "Including restaurants you've been to. " : "We've left out " + plural(left, "restaurant") + " you've been to. ") +
    '<button type="button" class="linkish" id="visitedBtn">' + (ask.withVisited ? "Leave them out" : "Include them") + "</button></p>" : "";
  $("result").innerHTML = head + bodyHtml + visitedNote;
  $("quiz").hidden = true;
  $("result").hidden = false;
  if (ask.list.length) renderMore();
  history.replaceState(null, "", location.pathname + "?" + toQuery());
  if (ask.started) { $("resultH").focus({ preventScroll: true }); $("result").scrollIntoView({ behavior: "smooth", block: "start" }); }
  track("pick-result", { where: ask.where.key, matches: list.length });
}
function renderMore() {
  if (!$("moreRows")) return;
  ask.shown = Math.max(ask.shown, 5);
  const rows = ask.list.slice(0, ask.shown);
  $("moreRows").innerHTML = rows.map((r) => {
    const b = bill(r);
    return '<li class="near-row"><div class="nr-main"><a class="nr-name" href="' + esc(linkOf(r)) + '">' + esc(r.name) + "</a> " + starIcons(r.stars) +
      '<span class="nr-where">' + esc(r.cuisine) + " · " + esc(r.where) + "</span>" +
      '<span class="nr-price">' + (b ? esc(localMoney(b.price, r.cur)) + " " + mealWord(b) + (r.cur !== ask.cur ? " ≈ " + esc(money(toCur(b.price, r.cur), ask.cur)) : "") : "Price not listed yet") +
      (r.rating ? " · " + r.rating.toFixed(1) + " Google" : "") + "</span></div>" +
      '<div class="nr-side">' + wishBtn(r) + "</div></li>";
  }).join("");
  const more = ask.list.length - rows.length;
  $("moreBtn").hidden = more <= 0;
  $("moreBtn").textContent = "Show " + Math.min(10, more) + " more";
}

// ---------- Sharing: the answers live in the address ----------
function toQuery() {
  const q = new URLSearchParams();
  q.set("w", ask.where.near ? "near" : ask.where.any ? "any" : ask.where.path);
  q.set("m", ask.meal);
  q.set("b", String(budgetValue() || 0));
  q.set("c", ask.cur);
  if (ask.wine) q.set("wine", "1");
  if (ask.stars) q.set("s", String(ask.stars));
  if (ask.food && ask.food.length) q.set("f", ask.food.join(","));
  if (ask.diet) q.set("d", ask.diet);
  q.set("go", "1");
  return q.toString().replace(/%2F/g, "/").replace(/%2C/g, ",");
}
function fromQuery() {
  const q = new URLSearchParams(location.search);
  if (q.get("c") && DATA.switchable.includes(q.get("c"))) ask.cur = q.get("c");
  if (["dinner", "lunch", "value", "weekend"].includes(q.get("m"))) setMeal(q.get("m"));
  if (q.has("b")) { const i = budgets().indexOf(Number(q.get("b"))); if (i > -1) ask.budget = i; }
  ask.wine = q.get("wine") === "1";
  if (q.has("s")) ask.stars = [0, 2, 3].includes(Number(q.get("s"))) ? Number(q.get("s")) : 0;
  if (q.has("f")) ask.food = q.get("f").split(",").filter((k) => MOODS.some(([m]) => m === k));
  if (q.has("d")) ask.diet = DIET_CHOICES.some(([k]) => k === q.get("d")) ? q.get("d") : "";
  const w = q.get("w");
  const whereOk = w && w !== "near" && setWhere(w);
  if (q.get("go") === "1" && whereOk && ask.meal) {
    if (ask.stars == null) ask.stars = 0;
    if (!ask.food) ask.food = [];
    if (ask.diet == null) ask.diet = "";
    return "result";
  }
  if (q.get("go") === "1" && w === "near" && ask.meal) {
    if (ask.stars == null) ask.stars = 0;
    if (!ask.food) ask.food = [];
    if (ask.diet == null) ask.diet = "";
    ask.pendingGo = true;
  }
  // A place given on its own (e.g. a "Help me pick in London" link) answers the first question.
  if (whereOk) { ask.step = 1; return "step"; }
  return "step";
}
async function sharePicks(btn) {
  const url = location.origin + location.pathname + "?" + toQuery();
  track("pick-share");
  if (navigator.share && matchMedia("(pointer: coarse)").matches) { navigator.share({ title: "My Michelin star picks", url }).catch(() => {}); return; }
  try { await navigator.clipboard.writeText(url); btn.lastChild.textContent = " Link copied"; setTimeout(() => { btn.lastChild.textContent = " Share picks"; }, 2500); }
  catch (e) { prompt("Copy this link:", url); }
}

// ---------- Start ----------
function renderStatic() {
  applyI18n();
  renderWishCount();
  $("destLink").href = withLang("/") + "#destinations";
}
renderStatic();
document.addEventListener("click", (e) => { const el = e.target.closest("button[data-lang]"); if (el) { setLang(el.dataset.lang); renderStatic(); } });
ask.cur = defaultCurrency();
ask.budget = BUDGETS_ONE.indexOf(200);
dataReady.then(() => {
  if (fromQuery() === "result") showResult(); else renderStep();
}).catch(() => {
  $("stepBody").innerHTML = '<p class="pick-wait">The restaurant list couldn\'t load just now. Please refresh the page.</p>';
});
