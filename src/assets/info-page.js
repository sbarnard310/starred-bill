// Plain information pages (the privacy notice): the shared header, and the text in English or Chinese.

function render() {
  applyI18n();
  renderWishCount();
  const lang = zh() ? "zh" : "en";
  document.querySelectorAll("[data-for]").forEach((el) => { el.hidden = el.dataset.for !== lang; });
  const h1 = document.querySelector('[data-for="' + lang + '"] h1');
  document.title = (h1 ? h1.textContent : "") + " · The Starred Bill";
  $("crumbs").innerHTML = '<a href="' + withLang("/") + '">' + esc(t("crumbHome")) + '</a><span aria-current="page">' + esc(h1 ? h1.textContent : "") + "</span>";
  $("destLink").href = withLang("/") + "#destinations";
  document.querySelectorAll(".acct-link").forEach((a) => { a.href = withLang("/account/"); });
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("button[data-lang]");
  if (el) { setLang(el.dataset.lang); render(); }
});
render();
