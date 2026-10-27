// A restaurant's own page (/restaurants/<id>/, build_restaurant_pages() in build.py): the wishlist button, a photo from
// Google beside the name, and a map of the restaurant and the starred restaurants nearby, loaded once it's scrolled near.
// Everything else on the page is written by the build, so it reads the same without this script.
const R = DATA.restaurant;

// ---------- Wishlist ----------
function renderWish() {
  const on = loadWishlist().includes(R.id), b = $("rpWish");
  b.setAttribute("aria-pressed", String(on));
  b.querySelector("span").textContent = on ? "On your wishlist" : "Save to wishlist";
  renderWishCount();
}
$("rpWish").addEventListener("click", () => {
  const list = loadWishlist(), on = list.includes(R.id);
  setWishlist(on ? list.filter((x) => x !== R.id) : list.concat(R.id));
  track("wishlist", { action: on ? "remove" : "add", restaurant: R.id, page: "restaurant" });
  renderWish();
});
window.addEventListener("sb:wishlist", renderWish);
renderWish();

// ---------- Photos ----------
// A photo of our own (Wikimedia Commons or the restaurant's press photos; own_photo_html() in build.py) is written into
// the page and costs nothing to show. Without one, the first Google Maps photo sits beside the receipt (PHOTOS_OK). Either
// way "More photos" shows up to GALLERY_MAX of Google's as thumbnails, only once tapped (each Google photo shown is a paid
// request, and Google's terms don't allow keeping copies, so they load live). Any photo opens full size, with arrows to
// the others and its credit.
const GALLERY_MAX = 6;
let shots = [];  // what the full-size viewer steps through: { big, caption }
const credit = (p) => {
  const a = (p.authorAttributions || [])[0];
  return (a ? (a.uri ? '<a href="' + esc(a.uri) + '" target="_blank" rel="noopener">' + esc(a.displayName) + "</a>" : esc(a.displayName)) + " · " : "") + "Google Maps";
};
const googleShot = (p) => ({ big: p.getURI({ maxWidth: 1600, maxHeight: 1200 }), thumb: p.getURI({ maxWidth: 400, maxHeight: 400 }), caption: credit(p) });
let shown = 0;
function openPhoto(i) {
  const last = shots.length - 1;
  shown = (i + last + 1) % (last + 1);
  $("photoImg").src = shots[shown].big;
  $("photoImg").alt = "Photo " + (shown + 1) + " of " + R.name;
  $("photoCaption").innerHTML = "<strong>" + esc(R.name) + "</strong> · Photo " + (shown + 1) + " of " + (last + 1) + " · " + shots[shown].caption;
  $("photoPrev").hidden = $("photoNext").hidden = last < 1;
  if (!$("photoBox").open) $("photoBox").showModal();
}
$("photoBox").addEventListener("click", (e) => {
  if (e.target === $("photoBox") || e.target.closest("#photoClose")) $("photoBox").close();
  else if (e.target.closest("#photoPrev")) openPhoto(shown - 1);
  else if (e.target.closest("#photoNext")) openPhoto(shown + 1);
});
$("photoBox").addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") openPhoto(shown - 1);
  if (e.key === "ArrowRight") openPhoto(shown + 1);
});
$("photoBox").addEventListener("close", () => { $("photoImg").removeAttribute("src"); });

function showGallery(btn, extra, from) {
  const strip = document.createElement("div");
  strip.className = "rp-gallery";
  extra.forEach((s, k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Open photo " + (from + k + 1) + " of " + R.name);
    const img = new Image();
    img.alt = "";
    img.decoding = "async";
    img.src = s.thumb;
    img.onload = () => b.classList.add("loaded");
    b.appendChild(img);
    b.addEventListener("click", () => openPhoto(from + k));
    strip.appendChild(b);
  });
  btn.replaceWith(strip);
  track("photos", { restaurant: R.id });
}
async function googlePhotos() {
  await loadGoogle();
  const { Place } = await google.maps.importLibrary("places");
  const place = new Place({ id: R.placeId });
  await place.fetchFields({ fields: ["photos"] });
  return place.photos || [];
}
function moreButton(n, onTap) {
  const more = document.createElement("button");
  more.type = "button";
  more.className = "rp-more-photos";
  more.textContent = n ? "More photos (" + n + ")" : "More photos";
  more.addEventListener("click", () => onTap(more));
  return more;
}

async function showPhoto() {
  const own = $("rpOwnPhoto");
  if (own) {
    shots = [{ big: own.dataset.full, caption: R.photoCreditHtml || "" }];
    own.querySelector(".rp-photo-open").addEventListener("click", () => openPhoto(0));
    // Google's photos are fetched only when "More photos" is tapped.
    if (PHOTOS_OK && R.placeId) {
      own.querySelector("figcaption").appendChild(moreButton(0, async (btn) => {
        btn.disabled = true;
        try {
          const extra = (await googlePhotos()).slice(0, GALLERY_MAX).map(googleShot);
          if (!extra.length) { btn.remove(); return; }
          shots = shots.slice(0, 1).concat(extra);
          showGallery(btn, extra, 1);
        } catch (e) { btn.remove(); }
      }));
    }
    return;
  }
  if (!PHOTOS_OK || !R.placeId) return;
  // Pages released in waves (photoTap, 16 Oct 2026) fetch Google's photos only when "Show photos" is tapped.
  if (R.photoTap) {
    const btn = moreButton(0, async () => {
      btn.disabled = true;
      try {
        const photos = await googlePhotos();
        if (photos.length) { googleFigure(photos, btn); track("photos", { restaurant: R.id }); } else btn.remove();
      } catch (e) { btn.remove(); }
    });
    btn.textContent = "Show photos";
    btn.classList.add("rp-show-photos");
    document.querySelector(".rp-side").prepend(btn);
    return;
  }
  try {
    const photos = await googlePhotos();
    if (photos.length) googleFigure(photos);
  } catch (e) { /* no photo: the receipt stands alone */ }
}
// The first Google photo beside the receipt, with its credit and "More photos" for the rest; in place of `swap` if given.
function googleFigure(photos, swap) {
  shots = photos.slice(0, GALLERY_MAX + 1).map(googleShot);
  const fig = document.createElement("figure");
  fig.className = "rp-photo";
  const open = document.createElement("button");
  open.type = "button";
  open.className = "rp-photo-open";
  open.setAttribute("aria-label", "Open the photo of " + R.name + " full size");
  const img = new Image();
  img.alt = "Inside or outside " + R.name;
  img.decoding = "async";
  img.src = photos[0].getURI({ maxWidth: 900, maxHeight: 700 });
  img.onload = () => fig.classList.add("loaded");
  open.appendChild(img);
  open.addEventListener("click", () => openPhoto(0));
  fig.appendChild(open);
  const cap = document.createElement("figcaption");
  cap.innerHTML = "<span>Photo: " + shots[0].caption + "</span>";
  if (shots.length > 1) cap.appendChild(moreButton(shots.length - 1, (btn) => showGallery(btn, shots.slice(1), 1)));
  fig.appendChild(cap);
  if (swap) swap.replaceWith(fig); else document.querySelector(".rp-side").prepend(fig);
}

// ---------- Map ----------
async function initMap() {
  const el = $("rpMap");
  try {
    await loadGoogle();
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { Marker } = await google.maps.importLibrary("marker");
    el.hidden = false;
    const map = new Map(el, { center: { lat: R.lat, lng: R.lng }, zoom: 15, mapTypeControl: false, streetViewControl: false, clickableIcons: false, gestureHandling: "cooperative" });
    const info = new InfoWindow();
    map.addListener("click", () => info.close());
    const bounds = new google.maps.LatLngBounds();
    const here = new Marker({ map, position: { lat: R.lat, lng: R.lng }, title: R.name, icon: pinIcon(R.stars), zIndex: 1000 });
    here.addListener("click", () => { info.setContent('<div style="font-family:Figtree,system-ui,sans-serif;font-weight:700;font-size:15px;color:#12261C">' + esc(R.name) + "</div>"); info.open({ anchor: here, map }); });
    bounds.extend(here.getPosition());
    DATA.nearby.forEach((q) => {
      const m = new Marker({ map, position: { lat: q.lat, lng: q.lng }, title: q.name, icon: pinIcon(q.stars), zIndex: q.stars * 10 });
      m.addListener("click", () => {
        info.setContent('<div style="font-family:Figtree,system-ui,sans-serif;color:#12261C;max-width:220px;line-height:1.4"><div style="font-weight:700;font-size:15px">' + esc(q.name) + "</div>" +
          (q.dinner ? '<div style="font-size:13px">Dinner ' + esc(q.dinner) + "</div>" : "") +
          '<a href="' + esc(q.href) + '" style="display:inline-block;margin-top:6px;color:#1E6142;font-weight:600;font-size:13px">Prices and details</a></div>');
        info.open({ anchor: m, map });
      });
      bounds.extend(m.getPosition());
    });
    if (DATA.nearby.length) map.fitBounds(bounds, 48);
  } catch (e) {
    el.hidden = true;
  }
}
function startMapWhenNear() {
  if (!GOOGLE_MAPS_API_KEY || R.lat == null) return;
  const target = $("nearby");
  let started = false;
  const check = () => {
    if (started || target.getBoundingClientRect().top > window.innerHeight + 400) return;
    started = true;
    window.removeEventListener("scroll", check);
    initMap();
  };
  window.addEventListener("scroll", check, { passive: true });
  check();
}
showPhoto();
startMapWhenNear();

// ---------- Google's place card ----------
// Google draws its card (name, rating, reviews) only in a map at least 420px wide and 300px tall, so on narrow
// screens the map is drawn 420px wide and shrunk to fit, keeping the card and Google's credits in view.
const GCARD_W = 420, GCARD_H = 320;
function fitGoogleCard() {
  const box = document.querySelector(".rp-gframe");
  if (!box) return;
  const frame = box.firstElementChild, s = Math.min(1, box.clientWidth / GCARD_W);
  frame.style.width = s < 1 ? GCARD_W + "px" : "";
  frame.style.transform = s < 1 ? "scale(" + s + ")" : "";
  box.style.height = s < 1 ? Math.round(GCARD_H * s) + "px" : "";
}
fitGoogleCard();
window.addEventListener("resize", fitGoogleCard);

// ---------- Prices in another currency ----------
// The page is written in the restaurant's own currency; the buttons under the answer show every price on it in pounds,
// euros or dollars too (marked ≈, at the rates in currencies.json). The price history keeps the original figures
// (data-nocx), as today's rate would misstate past prices. The choice is kept for the next restaurant page.
const CUR_KEY = "starredbill-rp-currency";
const pageCur = DATA.cur;
const symbolFor = (c) => c === "USD" ? "$" : symbolOf(c);
const priceRe = new RegExp("(^|[^A-Za-z])(" + symbolFor(pageCur).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[\\u00a0 ]") + ")([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)", "g");
const priced = [];
function collectPrices() {
  const roots = [document.querySelector(".rp-hero"), $("restaurantMain")];
  roots.forEach((root) => {
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) =>
      n.parentElement.closest("[data-nocx], script, style, svg, .rp-cur") || !priceRe.test(n.nodeValue) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n;
    while ((n = walk.nextNode())) { priceRe.lastIndex = 0; priced.push({ node: n, text: n.nodeValue }); }
  });
}
function showCurrency(c) {
  const rate = DATA.currencies[c].perUSD / DATA.currencies[pageCur].perUSD;
  priced.forEach((p) => {
    const shownText = c === pageCur ? p.text : p.text.replace(priceRe, (m, pre, sym, num, at, all) =>
      pre + (/(roughly|about) $/.test(all.slice(0, at + pre.length)) ? "" : "≈") + symbolFor(c) + Math.round(Number(num.replace(/,/g, "")) * rate).toLocaleString("en-GB"));
    // In dollars, the page's own "(about US$…)" after each price would say the same thing twice.
    p.node.nodeValue = c === "USD" && pageCur !== "USD" ? shownText.replace(/ \(about US\$[\d,]+\)/g, "") : shownText;
  });
  $("rpCur").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cur === c)));
}
(function wireCurrency() {
  const list = [pageCur].concat((DATA.switchable || []).filter((c) => c !== pageCur && DATA.currencies[c]));
  if (list.length < 2) return;
  collectPrices();
  const box = $("rpCur");
  box.innerHTML = '<span class="rp-cur-label">Prices in</span>' + list.map((c) => '<button type="button" data-cur="' + c + '" aria-pressed="false">' + esc(symbolFor(c).trim()) + "</button>").join("");
  box.hidden = false;
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-cur]");
    if (!b) return;
    showCurrency(b.dataset.cur);
    window.dispatchEvent(new CustomEvent("rp:currency", { detail: b.dataset.cur }));
    store.set(CUR_KEY, b.dataset.cur);
    track("currency", { currency: b.dataset.cur, page: "restaurant" });
    prefChosen("currency", b.dataset.cur);
  });
  // This page's last choice, else a member's own currency (loadProfile() in common.js), else the restaurant's.
  const start = () => { const saved = store.get(CUR_KEY, homeCurrency() || pageCur); return list.includes(saved) ? saved : pageCur; };
  showCurrency(start());
  window.addEventListener("sb:profile", () => showCurrency(start()));
})();

// "Report a price or change" and "Seen a different price?" ([data-report-id]) open the members' form: account.js.

// ---------- When bookings open ----------
// The date box under "When tables are released" (book_html() in build.py): pick a day and it says when bookings open
// for it, worked out from the restaurant's booking window (bwOpens() in common.js), with the next monthly release
// above it. Members can ask for an email the day before ("Email me the day before", account.js keeps the reminder and
// scripts/booking_reminders.py sends it).
(function bookingCheck() {
  const bw = R.bw, input = $("bwDate"), out = $("bwAnswer"), next = $("bwNext");
  if (!bw || !input) return;
  const today = new Date().toLocaleDateString("en-CA");
  input.min = today;
  const nx = bwNext(bw);
  if (nx && next) {
    next.textContent = "Next release: " + bwLong(nx.on) + (bw.time ? " at " + bwClock(bw.time) + " " + bwZone(bw.tz) + bwYourTime(nx.on, bw) : "") + ", for " + nx.month + ".";
    next.hidden = false;
  }
  input.addEventListener("change", () => {
    const day = input.value, on = bwOpens(bw, day);
    if (!day || !on) { out.textContent = ""; return; }
    if (day < today) { out.textContent = "That day has passed: pick one ahead."; return; }
    if (on <= today) {
      out.textContent = "Bookings for " + bwLong(day) + " are already open" + (on === today && bw.time ? " (from " + bwClock(bw.time) + " " + bwZone(bw.tz) + " today)" : "") + ": book now.";
    } else {
      const [oy, om, od] = on.split("-").map(Number), eve = bwIso(bwUtc(oy, om, od - 1));
      out.innerHTML = esc("Bookings for " + bwLong(day) + " open on " + bwLong(on) + (bw.time ? " at " + bwClock(bw.time) + " " + bwZone(bw.tz) + bwYourTime(on, bw) : "") + ".") +
        ' <button type="button" class="bw-remind" data-remind-id="' + esc(R.id) + '" data-remind-name="' + esc(R.name) + '" data-remind-day="' + day +
        '" data-remind-on="' + esc(bwLong(eve)) + '">Email me the day before</button>';
    }
    track("booking-check", { restaurant: R.id, open: on <= today ? "now" : "later" });
  });
})();

// ---------- The Bill (Phase 1, 27 Oct 2026) ----------
// The receipt beside the name becomes a calculator: how many diners, which meal and menu, wine pairing or not, and what
// the table is likely to pay with what's usually added where the restaurant is (billFor() and serviceTerms() in
// common.js), each assumption said under "How we work this out". No pairing price is ever made up here: where none is
// listed, wine isn't counted and the receipt says so. It opens as Budget Search left it (?p=2&m=dinner&wine=1). Prices
// stay in the restaurant's currency, with the total also in the currency chosen above (≈). The first change a visitor
// makes is counted once (`bill-calc`).
(function billCalc() {
  const B = R.bill, box = $("billCalc");
  if (!B || !box || !B.options.length) return;
  const q = new URLSearchParams(location.search);
  const meals = B.options.map((o) => o.meal).filter((m, i, a) => a.indexOf(m) === i);
  const MEAL_WORD = { dinner: "Dinner", lunch: "Lunch", lounge: "In the lounge" };
  const optsFor = (m) => B.options.filter((o) => o.meal === m);
  const st = { people: Math.min(12, Math.max(1, parseInt(q.get("p"), 10) || 2)), meal: meals.includes(q.get("m")) ? q.get("m") : meals.includes("dinner") ? "dinner" : meals[0],
    wine: q.get("wine") === "1", shown: pageCur };
  st.menu = optsFor(st.meal).find((o) => o.main) || optsFor(st.meal)[0];
  const amt = (n, c) => symbolFor(c || pageCur) + Math.round(n).toLocaleString("en-GB");
  const conv = (n, c) => n * DATA.currencies[c].perUSD / DATA.currencies[pageCur].perUSD;
  const sep = '<span class="sr-only">, </span>';
  const line = (k, v, note, cls) => '<span class="rc-line' + (cls ? " " + cls : "") + '"><span class="rc-k">' + esc(k) + '</span><span class="rc-dots" aria-hidden="true"></span>' + sep +
    '<span class="rc-v' + (v === "–" || v === "not counted" ? " muted" : "") + '">' + esc(v) + "</span>" + (note ? sep + '<span class="rc-note">' + esc(note) + "</span>" : "") + "</span>";
  let counted = false, timer = null, last = null;
  function render() {
    const o = st.menu, meal = o.meal === "lunch" ? "lunch" : "dinner";
    const c = last = billFor(B, { meal: o.meal, price: o.price, type: o.type, wine: o.wine, withWine: st.wine, estimateWine: false, people: st.people });
    const menus = optsFor(st.meal);
    const wineText = o.wine != null ? "Wine pairing (" + amt(o.wine) + " a person)" : B.noPairing ? "No wine pairing offered" : "No wine pairing price listed";
    const controls = '<div class="bc-controls">' +
      '<div class="bc-field"><span id="bcPeopleL">Diners</span><div class="stepper" role="group" aria-labelledby="bcPeopleL">' +
        '<button type="button" data-bc="-1" aria-label="One fewer diner">−</button><output aria-live="polite">' + st.people + "</output>" +
        '<button type="button" data-bc="1" aria-label="One more diner">+</button></div></div>' +
      (meals.length > 1 ? '<div class="seg bc-meal" role="group" aria-label="Meal">' + meals.map((m) => '<button type="button" data-bcmeal="' + m + '" aria-pressed="' + (m === st.meal) + '">' +
        esc(MEAL_WORD[m] || m) + "</button>").join("") + "</div>" : "") +
      (menus.length > 1 ? '<label class="bc-field bc-menu"><span>Menu</span><select id="bcMenu">' + menus.map((x, i) => '<option value="' + i + '"' + (x === o ? " selected" : "") + ">" +
        esc(x.name + " · " + amt(x.price)) + "</option>").join("") + "</select></label>" : "") +
      '<label class="bc-wine"><input type="checkbox" id="bcWine"' + (st.wine && o.wine != null ? " checked" : "") + (o.wine == null ? " disabled" : "") + "> " + esc(wineText) + "</label></div>";
    let lines;
    if (!c.ok) lines = '<span class="rc-line rc-msg">' + esc(c.why) + "</span>";
    else {
      const spend = o.type === "spend";
      lines = line((spend ? "Typical spend" : o.name) + " × " + st.people, amt(c.foodTotal), amt(o.price) + " a person" + (o.courses ? " · " + o.courses + " courses" : "")) +
        (!st.wine ? "" : c.wineState === "listed" ? line("Wine pairing × " + st.people, amt(c.wineTotal), amt(c.wine) + " a person") :
          line("Wine pairing", "–", c.wineState === "not-offered" ? "not offered" : "no price listed, so not counted")) +
        line(c.terms.label, c.extra ? amt(c.extra) : c.terms.counted ? "included" : "not counted") +
        line("Estimated total" + (c.missing.length ? ", without " + c.missing.join(" or ") : ""), (c.approx ? "≈ " : "") + amt(c.total), "", "rc-total") +
        (st.people > 1 ? line("Per person", (c.approx ? "≈ " : "") + amt(c.perPerson)) : "") +
        (st.shown !== pageCur && DATA.currencies[st.shown] ? line("In " + st.shown, "≈ " + amt(conv(c.total, st.shown), st.shown), "at " + DATA.rateDate + " rates") : "");
    }
    const seen = B.seen[meal] || "", from = B.from[meal] || "";
    const foot = "Prices per person" + (from ? " from " + from : "") + (seen ? ", " + seen + (seen.startsWith("recorded") ? " (not rechecked since)" : "") : "");
    const missing = c.ok && c.missing.length ? "<p>Not in this total: " + c.missing.map((x) => x === "wine" ? "wine, as no pairing price is listed" : "service, as explained above").join("; ") + ".</p>" : "";
    box.innerHTML = controls +
      '<div class="receipt rp-receipt bill-receipt"><span class="rc-paper"><span class="rc-head" aria-hidden="true">The Starred Bill · Table for ' + st.people + "</span>" +
        '<span class="sr-only" aria-live="polite">' + (c.ok ? "Estimated total " + (c.approx ? "about " : "") + amt(c.total) + " for " + st.people : "") + "</span>" +
        lines + '<span class="rc-foot">' + esc(foot) + "</span></span></div>" +
      '<details class="bc-how"><summary>How we work this out</summary>' +
        (c.ok ? "<p>" + esc(c.terms.note) + "</p>" : "") +
        "<p>Food and wine are the restaurant's prices per person, times the diners. " + (o.note ? "About this menu: " + esc(o.note.charAt(0).toLowerCase() + o.note.slice(1).replace(/\.?$/, ".")) + " " : "") +
        esc(foot.replace(/^Prices per person/, "They come")) + "." + "</p>" + missing +
        "<p>It leaves out drinks beyond the pairing, supplements, water, coffee and anything ordered on the day, and the restaurant's bill is what counts.</p></details>";
  }
  function used() {
    if (counted) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      counted = true;
      track("bill-calc", { restaurant: R.id, people: st.people, meal: st.meal, menu: st.menu.main ? "main" : "other",
        wine: st.wine ? (last && last.wineState) || "on" : "off", page: "restaurant" });
    }, 1500);
  }
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.bc) st.people = Math.min(12, Math.max(1, st.people + Number(b.dataset.bc)));
    else if (b.dataset.bcmeal) { st.meal = b.dataset.bcmeal; st.menu = optsFor(st.meal).find((o) => o.main) || optsFor(st.meal)[0]; }
    else return;
    render(); used();
    const again = box.querySelector(b.dataset.bc ? '[data-bc="' + b.dataset.bc + '"]' : '[data-bcmeal="' + b.dataset.bcmeal + '"]');
    if (again) again.focus();
  });
  box.addEventListener("change", (e) => {
    if (e.target.id === "bcMenu") st.menu = optsFor(st.meal)[Number(e.target.value)];
    else if (e.target.id === "bcWine") st.wine = e.target.checked;
    else return;
    const id = e.target.id;
    render(); used();
    if ($(id)) $(id).focus();
  });
  const chosen = $("rpCur") && $("rpCur").querySelector('[aria-pressed="true"]');
  st.shown = chosen ? chosen.dataset.cur : pageCur;
  window.addEventListener("rp:currency", (e) => { st.shown = e.detail; render(); });
  render();
})();

// The main booking button's line: when the next tables go on sale, from the restaurant's booking window.
(function heroRelease() {
  const el = $("rpBwHero"), nx = el && R.bw ? bwNext(R.bw) : null;
  if (!nx) return;
  el.textContent = "Tables for " + nx.month + " go on sale " + bwLong(nx.on) + (R.bw.time ? " at " + bwClock(R.bw.time) + " " + bwZone(R.bw.tz) : "") + ".";
  el.hidden = false;
})();
