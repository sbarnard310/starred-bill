// "My year in stars" on Your account (10 Oct 2026): a picture of a member's starred meals in one year (or all of them),
// drawn as a cream till receipt on forest green, 1080 × 1350 so it fits a phone screen and an Instagram post, to share
// (the phone's share sheet) or save. It's drawn on the member's device from the "been there" dates and nothing is sent or
// stored: we count only that a card was shared or saved (`year-card`). The year comes from the dates in the dining
// diary, so undated visits only show under "All time". account-page.js puts yearSection() on the page and calls
// drawYearCard() after each redraw; the account page is English only.
const yc = { year: null, names: true, drawn: 0, canShare: null, msg: "" };
const YC = { w: 1080, h: 1350, green: "#10362A", paper: "#F5F0E4", ink: "#1F2A22", muted: "#6B6455", rule: "#C9C0AC", dots: "#A39A86", gold: "#B3862B", light: "#E0B85C", band: "#E9E1CC" };
// A restaurant's town: account.json's `town` where it gives one, else the top city page it sits in (London, not Notting
// Hill), else the town in its `area` ("Bray, Berkshire").
function ycTownName(r) {
  if (r.town) return r.town;
  const city = r.chain.map((id) => DATA.places.find((p) => p.id === id)).find((p) => p && p.type === "city");
  return city ? city.name : String(r.area || "").split(",")[0].trim() || r.cityName || "";
}
const ycTown = (r) => r.country + ":" + ycTownName(r);
const ycPlural = (n, one, many) => n + " " + (n === 1 ? one : many || one + "s");

// The years with a dated visit, newest first.
function ycYears(been) {
  const visited = loadVisited();
  return [...new Set(been.map((r) => String(visited[r.id] || "").slice(0, 4)).filter(Boolean))].sort().reverse();
}
// The restaurants on the card: that year's, most stars first, then the latest visit first.
function ycRows(been) {
  const visited = loadVisited();
  const rows = yc.year === "all" ? been.slice() : been.filter((r) => String(visited[r.id] || "").startsWith(yc.year));
  return rows.sort((a, b) => starsOf(b) - starsOf(a) || String(visited[b.id] || "").localeCompare(String(visited[a.id] || "")) || nameOf(a).localeCompare(nameOf(b)));
}
function ycFigures(rows) {
  return {
    n: rows.length, stars: rows.reduce((a, r) => a + starsOf(r), 0), tiers: [3, 2, 1].map((s) => rows.filter((r) => starsOf(r) === s).length),
    cities: new Set(rows.map(ycTown)).size, countries: new Set(rows.map((r) => r.country)).size,
  };
}
const ycTitle = () => yc.year === "all" ? "My Michelin stars so far" : "My " + yc.year + " in Michelin stars";
function ycSummary(f) {
  return ycTitle() + ": " + ycPlural(f.stars, "star") + " from " + ycPlural(f.n, "restaurant") +
    (f.countries > 1 ? " in " + f.countries + " countries" : f.cities > 1 ? " in " + f.cities + " cities" : "") + (f.tiers[0] ? ", " + f.tiers[0] + " of them three-star" : "") + ".";
}

function yearSection(been) {
  if (!been.length) return "";
  const years = ycYears(been), now = String(new Date().getFullYear());
  if (yc.year !== "all" && !years.includes(yc.year)) yc.year = years.includes(now) ? now : years[0] || "all";
  const undated = been.filter((r) => !loadVisited()[r.id]).length;
  const opts = years.map((y) => [y, y]).concat([["all", "All time"]]);
  const f = ycFigures(ycRows(been));
  return '<section class="acct-section" id="year"><h2>My year in stars</h2>' +
    "<p>Your starred meals as a till receipt, to share or keep. It's made on your device from your dining diary; nothing is sent to us.</p>" +
    '<div class="yc"><canvas id="ycCanvas" width="' + YC.w + '" height="' + YC.h + '" role="img" aria-label="' + esc(ycSummary(f)) + '"></canvas>' +
    '<div class="yc-side"><label for="ycYear">Year</label><select id="ycYear">' +
    opts.map(([v, l]) => '<option value="' + v + '"' + (v === yc.year ? " selected" : "") + ">" + l + "</option>").join("") + "</select>" +
    '<label class="yc-check"><input type="checkbox" id="ycNames"' + (yc.names ? " checked" : "") + "> Show the restaurants' names</label>" +
    (undated ? '<p class="yc-note">' + (undated === been.length ? "None of your restaurants has a date yet, so the card shows them all. " : ycPlural(undated, "restaurant") + " with no date " + (undated === 1 ? "shows" : "show") + " only under All time. ") +
      'Add the day you went with Edit in <a href="#diary">your dining diary</a>.</p>' : "") +
    '<div class="yc-acts"><button type="button" class="cta-btn" id="ycShare" hidden><svg aria-hidden="true"><use href="#share"/></svg>Share</button>' +
    '<button type="button" class="btn-line" id="ycSave">Save the picture</button></div>' +
    '<p class="yc-done" id="ycDone" aria-live="polite">' + esc(yc.msg) + "</p></div></div></section>";
}

// The fonts the site already loads (Google Fonts); the canvas waits for them so the first card isn't drawn in a fallback.
let ycFonts = null;
const ycLoadFonts = () => ycFonts || (ycFonts = Promise.all(["400 100px Gloock", "600 30px Figtree", "700 30px Figtree", "400 30px 'IBM Plex Mono'", "500 30px 'IBM Plex Mono'"]
  .map((f) => document.fonts.load(f))).catch(() => {}));
// The site's star (#star in icons.svg), centred on x, y.
function ycStar(ctx, x, y, size, color) {
  const pts = [[12, 3.6], [14.29, 9.44], [20.56, 9.82], [15.71, 13.81], [17.29, 19.88], [12, 16.5], [6.71, 19.88], [8.29, 13.81], [3.44, 9.82], [9.71, 9.44]];
  const k = size / 17;
  ctx.save();
  ctx.beginPath();
  pts.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](x + (px - 12) * k, y + (py - 12.2) * k));
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle = color; ctx.lineWidth = 1.8 * k; ctx.lineJoin = "round";
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
function ycStars(ctx, n, x, y, size, color, gap) {
  for (let i = 0; i < n; i++) ycStar(ctx, x + size / 2 + i * (size + gap), y, size, color);
  return n * size + (n - 1) * gap;
}
// Cuts text to fit a width, with an ellipsis.
function ycFit(ctx, s, width) {
  if (ctx.measureText(s).width <= width) return s;
  while (s.length > 1 && ctx.measureText(s + "…").width > width) s = s.slice(0, -1);
  return s.trimEnd() + "…";
}
function ycDash(ctx, x1, x2, y) {
  ctx.save(); ctx.strokeStyle = YC.rule; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.restore();
}
// A receipt line: label on the left, value on the right, dotted leader between.
function ycLeader(ctx, x1, x2, y) {
  if (x2 - x1 < 20) return;
  ctx.save(); ctx.strokeStyle = YC.dots; ctx.lineWidth = 3; ctx.setLineDash([2, 8]); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.restore();
}

function ycDraw(ctx, been) {
  const rows = ycRows(been), f = ycFigures(rows), W = YC.w;
  const L = 90, R = W - 90, padL = L + 60, padR = R - 60, mid = W / 2;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = YC.green; ctx.fillRect(0, 0, W, YC.h);
  // The logo and name above the receipt.
  ctx.save(); ctx.translate(L, 52); ctx.scale(0.072, 0.072);
  ctx.fillStyle = YC.paper; ctx.fill(new Path2D("M0,18 Q0,0 18,0 H422 Q440,0 440,18 V600 L396,650 L352,600 L308,650 L264,600 L220,650 L176,600 L132,650 L88,600 L44,650 L0,600 Z"));
  ctx.fillStyle = ctx.strokeStyle = YC.gold; ctx.lineWidth = 19.6; ctx.lineJoin = "round";
  const star = new Path2D("M220,80 L255.4,171.3 L353.1,176.7 L277.3,238.6 L302.3,333.3 L220,280.2 L137.7,333.3 L162.7,238.6 L86.9,176.7 L184.6,171.3 Z");
  ctx.fill(star); ctx.stroke(star);
  ctx.fillStyle = YC.green; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(60, 440, 320, 70, 35); else ctx.rect(60, 440, 320, 70); ctx.fill();
  ctx.restore();
  ctx.fillStyle = YC.paper; ctx.font = "400 40px Gloock"; ctx.textAlign = "left";
  ctx.fillText("The Starred Bill", L + 50, 92);

  // The paper, with a torn bottom edge.
  const top = 140, bottom = 1240, tooth = 30;
  ctx.fillStyle = YC.paper; ctx.beginPath();
  ctx.moveTo(L, top + 8); ctx.quadraticCurveTo(L, top, L + 8, top); ctx.lineTo(R - 8, top); ctx.quadraticCurveTo(R, top, R, top + 8); ctx.lineTo(R, bottom);
  for (let x = R; x > L; x -= tooth) { ctx.lineTo(Math.max(L, x - tooth / 2), bottom + 18); ctx.lineTo(Math.max(L, x - tooth), bottom); }
  ctx.closePath(); ctx.fill();

  ctx.textAlign = "center"; ctx.fillStyle = YC.muted; ctx.font = "500 26px 'IBM Plex Mono'";
  ctx.fillText(yc.year === "all" ? "MY MICHELIN STARS" : "MY YEAR IN STARS", mid, 210);
  ctx.fillStyle = YC.ink; ctx.font = "400 120px Gloock";
  ctx.fillText(yc.year === "all" ? "So far" : yc.year, mid, 335);
  ycDash(ctx, padL, padR, 380);

  // Stars collected, big, then restaurants, cities and countries.
  ctx.fillStyle = YC.gold; ctx.font = "400 150px Gloock";
  const big = String(f.stars), bw = ctx.measureText(big).width;
  ctx.fillText(big, mid - 34, 530);
  ycStar(ctx, mid - 34 + bw / 2 + 50, 482, 64, YC.gold);
  ctx.fillStyle = YC.muted; ctx.font = "500 24px 'IBM Plex Mono'";
  ctx.fillText(f.stars === 1 ? "STAR COLLECTED" : "STARS COLLECTED", mid, 580);
  [[f.n, f.n === 1 ? "RESTAURANT" : "RESTAURANTS"], [f.cities, f.cities === 1 ? "CITY" : "CITIES"], [f.countries, f.countries === 1 ? "COUNTRY" : "COUNTRIES"]].forEach(([n, l], i) => {
    const x = padL + (padR - padL) * (i * 2 + 1) / 6;
    ctx.fillStyle = YC.ink; ctx.font = "400 68px Gloock"; ctx.fillText(String(n), x, 680);
    ctx.fillStyle = YC.muted; ctx.font = "500 21px 'IBM Plex Mono'"; ctx.fillText(l, x, 714);
  });
  ycDash(ctx, padL, padR, 755);

  // One line per star level.
  ctx.textAlign = "left";
  ["Three-star", "Two-star", "One-star"].forEach((label, i) => {
    const y = 812 + i * 52, n = f.tiers[i];
    ycStars(ctx, 3 - i, padL, y - 11, 26, n ? YC.gold : YC.rule, 4);
    ctx.fillStyle = n ? YC.ink : YC.muted; ctx.font = "600 30px Figtree";
    const lx = padL + 96; ctx.fillText(label, lx, y);
    const lw = ctx.measureText(label).width;
    ctx.font = "500 32px 'IBM Plex Mono'"; ctx.textAlign = "right"; ctx.fillText(String(n), padR, y);
    ycLeader(ctx, lx + lw + 14, padR - ctx.measureText(String(n)).width - 14, y - 6);
    ctx.textAlign = "left";
  });
  ycDash(ctx, padL, padR, 948);

  // The restaurants (or, with names hidden, the cities), up to five, and how many more.
  const lines = 5;
  let list;
  if (yc.names) list = rows.map((r) => ({ stars: starsOf(r), name: nameOf(r), where: ycTownName(r) }));
  else {
    const by = new Map();
    rows.forEach((r) => { const k = ycTown(r), e = by.get(k) || { name: ycTownName(r), n: 0, stars: 0 }; e.n++; e.stars += starsOf(r); by.set(k, e); });
    list = [...by.values()].sort((a, b) => b.stars - a.stars || b.n - a.n).map((c) => ({ name: c.name, value: c.stars + " ★" }));
  }
  const shown = list.length > lines ? list.slice(0, lines - 1) : list;
  shown.forEach((x, i) => {
    const y = 1004 + i * 44;
    let left = padL;
    if (x.stars) left += ycStars(ctx, x.stars, padL, y - 10, 20, YC.gold, 3) + 16;
    ctx.textAlign = "left";
    if (x.value) {
      ctx.font = "500 28px 'IBM Plex Mono'"; ctx.fillStyle = YC.ink; ctx.textAlign = "right"; ctx.fillText(x.value, padR, y);
      const vw = ctx.measureText(x.value).width;
      ctx.textAlign = "left"; ctx.font = "600 28px Figtree";
      const name = ycFit(ctx, x.name, padR - vw - 30 - left);
      ctx.fillText(name, left, y);
      ycLeader(ctx, left + ctx.measureText(name).width + 12, padR - vw - 12, y - 6);
      return;
    }
    ctx.font = "600 28px Figtree"; ctx.fillStyle = YC.ink;
    const name = ycFit(ctx, x.name, padR - left - 60);
    ctx.fillText(name, left, y);
    const nw = ctx.measureText(name).width;
    if (x.where && x.where !== x.name) {
      ctx.font = "400 26px Figtree"; ctx.fillStyle = YC.muted;
      ctx.fillText(ycFit(ctx, " · " + x.where, padR - left - nw), left + nw, y);
    }
  });
  if (list.length > shown.length) {
    ctx.font = "500 24px 'IBM Plex Mono'"; ctx.fillStyle = YC.muted; ctx.textAlign = "left";
    ctx.fillText("+ " + (list.length - shown.length) + " MORE", padL, 1004 + shown.length * 44);
  }

  ctx.textAlign = "center"; ctx.fillStyle = YC.muted; ctx.font = "500 22px 'IBM Plex Mono'";
  ctx.fillText("THANK YOU · PLEASE DINE AGAIN", mid, 1222);
  // Under the receipt: where to make your own.
  ctx.fillStyle = YC.light; ctx.font = "600 32px Figtree";
  ctx.fillText("Count your stars at starredbill.com", mid, 1316);
}

// Called after every redraw of the page (render() rewrites it, canvas and all).
async function drawYearCard(been) {
  const canvas = $("ycCanvas");
  if (!canvas) return;
  const n = ++yc.drawn;
  await ycLoadFonts();
  if (n !== yc.drawn || !canvas.isConnected) return;
  ycDraw(canvas.getContext("2d"), been);
  yc.been = been;
  if (yc.canShare == null) {
    try { yc.canShare = !!(navigator.canShare && navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] })); } catch (e) { yc.canShare = false; }
  }
  if ($("ycShare")) $("ycShare").hidden = !yc.canShare;
}

const ycFile = () => new Promise((ok) => $("ycCanvas").toBlob((b) => ok(new File([b], "my-" + (yc.year === "all" ? "michelin-stars" : yc.year + "-in-stars") + ".png", { type: "image/png" })), "image/png"));
function ycSaid(msg) { yc.msg = msg; if ($("ycDone")) $("ycDone").textContent = msg; }
async function shareYearCard() {
  const file = await ycFile(), f = ycFigures(ycRows(yc.been));
  try {
    await navigator.share({ files: [file], title: ycTitle(), text: ycSummary(f) + " Count yours on The Starred Bill: https://starredbill.com/?utm_source=year-card" });
    track("year-card", { action: "share", year: yc.year === "all" ? "all" : "one", names: yc.names });
  } catch (e) { /* closed the share sheet */ }
}
async function saveYearCard() {
  const file = await ycFile(), url = URL.createObjectURL(file), a = document.createElement("a");
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  ycSaid("Saved as " + file.name + ".");
  track("year-card", { action: "save", year: yc.year === "all" ? "all" : "one", names: yc.names });
}

document.addEventListener("change", (e) => {
  if (e.target.id === "ycYear") { yc.year = e.target.value; yc.msg = ""; render(); $("ycYear").focus(); }
  if (e.target.id === "ycNames") { yc.names = e.target.checked; yc.msg = ""; render(); $("ycNames").focus(); }
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("#ycShare, #ycSave");
  if (b) (b.id === "ycShare" ? shareYearCard : saveYearCard)();
});
