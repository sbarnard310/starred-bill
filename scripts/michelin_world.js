// Refreshes content/world-starred.json from the MICHELIN Guide.
// guide.michelin.com blocks scripted downloads, so this runs inside a normal browser tab:
//   1. Run `python3 scripts/receive.py` on the Mac (it listens on http://localhost:8798).
//   2. Open https://guide.michelin.com/en/restaurants/3-stars-michelin in a browser.
//   3. Paste this whole file into the browser's JavaScript console and press Enter.
// After a minute the tab moves to a page saying "saved N bytes", and the file
// scripts/michelin-world-export.json appears. Then run `python3 scripts/receive.py --world`
// to turn it into content/world-starred.json.
(async () => {
  async function page(slug, n) {
    const res = await fetch(`https://guide.michelin.com/en/restaurants/${slug}/page/${n}`);
    if (!res.ok) return { rows: [], total: 0 };
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    const total = +((doc.body.textContent.match(/([\d,]+)\s+restaurants/) || [0, "0"])[1].replace(/,/g, ""));
    const rows = [...doc.querySelectorAll(".card__menu")].map((c) => {
      const n = c.querySelector(".js-note-restaurant");
      if (!n || !n.dataset.dtmDistinction) return null; // skips "you may also like" cards
      const a = c.querySelector(".card__menu-content--title a");
      const sc = [...c.querySelectorAll(".card__menu-footer--score")].map((s) => s.textContent.trim().replace(/\s+/g, " "));
      return { id: c.dataset.id, name: a.textContent.trim(), href: a.getAttribute("href"), lat: +c.dataset.lat, lng: +c.dataset.lng,
        dist: n.dataset.dtmDistinction, cc: n.dataset.restaurantCountry, city: n.dataset.dtmCity, where: sc[0] || "",
        cuisine: (sc[1] || "").split("·").pop().trim() };
    }).filter(Boolean);
    return { rows, total };
  }
  const all = new Map();
  for (const slug of ["3-stars-michelin", "2-stars-michelin", "1-star-michelin"]) {
    const first = await page(slug, 1);
    first.rows.forEach((r) => all.set(r.id, r));
    const pages = Math.ceil(first.total / 48);
    for (let i = 2; i <= pages; i += 4) {
      const batch = await Promise.all([i, i + 1, i + 2, i + 3].filter((x) => x <= pages).map((x) => page(slug, x)));
      batch.forEach((b) => b.rows.forEach((r) => all.set(r.id, r)));
    }
  }
  // A plain form post reaches the local receiver even where the site blocks fetch() to other addresses.
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "http://localhost:8798/save?name=michelin-world-export.json";
  const field = document.createElement("textarea");
  field.name = "data";
  field.value = JSON.stringify({ world: [...all.values()] });
  form.appendChild(field);
  document.body.appendChild(form);
  form.submit();
})();
