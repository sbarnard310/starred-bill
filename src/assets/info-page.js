// Plain information pages (the privacy notice and the guides): the shared header, and the text in English or Chinese.
// Guides arrive with their own breadcrumbs and title (data-static-crumbs), so those are left alone.

function render() {
  applyI18n();
  renderWishCount();
  const lang = zh() ? "zh" : "en";
  document.querySelectorAll("[data-for]").forEach((el) => { el.hidden = el.dataset.for !== lang; });
  $("destLink").href = withLang("/") + "#destinations";
  document.querySelectorAll(".acct-link").forEach((a) => { a.href = withLang("/account/"); });
  if (document.body.hasAttribute("data-static-crumbs")) return;
  const h1 = document.querySelector('[data-for="' + lang + '"] :is(h1, .h1)');
  document.title = (h1 ? h1.textContent : "") + " · The Starred Bill";
  $("crumbs").innerHTML = '<a href="' + withLang("/") + '">' + esc(t("crumbHome")) + '</a><span aria-current="page">' + esc(h1 ? h1.textContent : "") + "</span>";
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("button[data-lang]");
  if (el) { setLang(el.dataset.lang); render(); }
});
render();

// Guide tables marked data-sortable: tap a heading to sort by it, tap again to reverse.
document.querySelectorAll("table[data-sortable]").forEach((table) => {
  const heads = [...table.querySelectorAll("thead th")];
  heads.forEach((th, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = th.textContent;
    th.textContent = "";
    th.appendChild(btn);
    btn.addEventListener("click", () => {
      const asc = th.getAttribute("aria-sort") === "descending" ? true : th.getAttribute("aria-sort") === "ascending" ? false : i === 0;
      heads.forEach((h) => h.setAttribute("aria-sort", "none"));
      th.setAttribute("aria-sort", asc ? "ascending" : "descending");
      const body = table.tBodies[0];
      const key = (tr) => tr.children[i].dataset.sort || "";
      [...body.rows].sort((a, b) => {
        const x = key(a), y = key(b), nx = Number(x), ny = Number(y);
        const d = x !== "" && y !== "" && !isNaN(nx) && !isNaN(ny) ? nx - ny : x.localeCompare(y);
        return asc ? d : -d;
      }).forEach((tr) => body.appendChild(tr));
    });
  });
});
