// "Save this search" (10 Oct 2026): a signed-in member keeps a destination page's filters (stars, cuisine, dietary
// needs, neighbourhood), optionally with a price limit, or their Help me pick answers, and we email them when a
// restaurant newly matches (scripts/saved_searches.py). Loaded by account.js only when someone taps the button; the
// page says what's being saved through window.searchToSave() (place.js, pick.js). Rows go to `saved_searches`
// (supabase/saved-searches.sql); the account page lists them. The label is written in English, as the account page and
// emails are; the window's own words are here (en, zh/yue, fr, ja, es, it, ko; other languages read English).
(function () {
  const SW = {
    en: {
      title: "Save this search", lede: "We'll email you when a restaurant newly matches it: a new star, a lower price or a new menu. At most one email a day.",
      yours: "Your search", priceLegend: "Price limit (optional)", upTo: "Up to, per person", currency: "Currency",
      meal: "Meal", mDinner: "Dinner", mLunch: "Lunch", mEither: "Lunch or dinner, whichever is cheaper", wine: "Include a wine pairing",
      noPrice: "Leave it empty to hear about every new match.", save: "Save and email me", saving: "Saving…", close: "Close",
      saved: "Saved. We'll email you when a restaurant newly matches.", manage: "Your saved searches", dup: "You've already saved this search.",
      limit: "You can keep up to 20 saved searches. Delete one on Your account to save another.", failed: "That didn't save. Please try again in a moment.",
      badPrice: "Please give the price as a number, or leave it empty.",
      note: "Emails go only to the address you sign in with, and each has an unsubscribe link.", privacy: "Privacy notice"
    },
    zh: {
      title: "儲存這項搜尋", lede: "有餐廳新符合條件時（新摘星、降價或推出新菜單），我們會寄電郵通知你。每天最多一封。",
      yours: "你的搜尋", priceLegend: "價格上限（選填）", upTo: "每人最多", currency: "貨幣",
      meal: "餐期", mDinner: "晚餐", mLunch: "午餐", mEither: "午餐或晚餐，取較便宜者", wine: "包含餐酒搭配",
      noPrice: "留空即可收到所有新符合的餐廳。", save: "儲存並寄電郵給我", saving: "儲存中…", close: "關閉",
      saved: "已儲存。有餐廳新符合條件時，我們會寄電郵給你。", manage: "你儲存的搜尋", dup: "你已儲存過這項搜尋。",
      limit: "最多可儲存 20 項搜尋。請先在帳戶頁面刪除一項。", failed: "未能儲存，請稍後再試。",
      badPrice: "請以數字填寫價格，或留空。",
      note: "電郵只會寄到你登入用的地址，每封都附有取消訂閱連結。", privacy: "隱私權聲明"
    },
    fr: {
      title: "Enregistrer cette recherche", lede: "Nous vous écrirons quand un restaurant y correspondra : nouvelle étoile, prix en baisse ou nouveau menu. Un e-mail par jour au plus.",
      yours: "Votre recherche", priceLegend: "Prix maximum (facultatif)", upTo: "Jusqu'à, par personne", currency: "Devise",
      meal: "Repas", mDinner: "Dîner", mLunch: "Déjeuner", mEither: "Déjeuner ou dîner, le moins cher des deux", wine: "Avec accord mets et vins",
      noPrice: "Laissez vide pour être prévenu de chaque nouveau restaurant.", save: "Enregistrer et me prévenir", saving: "Enregistrement…", close: "Fermer",
      saved: "C'est enregistré. Nous vous écrirons dès qu'un restaurant correspondra.", manage: "Vos recherches enregistrées", dup: "Vous avez déjà enregistré cette recherche.",
      limit: "Vous pouvez garder 20 recherches au plus. Supprimez-en une sur votre compte pour en ajouter une autre.", failed: "L'enregistrement a échoué. Réessayez dans un instant.",
      badPrice: "Indiquez le prix en chiffres, ou laissez vide.",
      note: "Les e-mails ne partent qu'à l'adresse de connexion, et chacun contient un lien de désabonnement.", privacy: "Politique de confidentialité"
    },
    ja: {
      title: "この検索を保存", lede: "新たに条件に合うレストラン（新しい星、値下げ、新メニュー）があればメールでお知らせします。メールは1日1通までです。",
      yours: "保存する検索", priceLegend: "予算の上限（任意）", upTo: "1人あたり", currency: "通貨",
      meal: "食事", mDinner: "ディナー", mLunch: "ランチ", mEither: "ランチかディナーの安い方", wine: "ワインペアリングを含める",
      noPrice: "空欄なら、新たに条件に合うすべての店をお知らせします。", save: "保存してメールを受け取る", saving: "保存中…", close: "閉じる",
      saved: "保存しました。新たに条件に合う店があればメールでお知らせします。", manage: "保存した検索", dup: "この検索はすでに保存されています。",
      limit: "保存できる検索は20件までです。アカウントページで1件削除してください。", failed: "保存できませんでした。少し待ってからもう一度お試しください。",
      badPrice: "金額は数字で入力するか、空欄にしてください。",
      note: "メールはログインに使うアドレスにのみ送られ、毎回配信停止のリンクが付きます。", privacy: "プライバシーポリシー"
    },
    es: {
      title: "Guardar esta búsqueda", lede: "Te escribiremos cuando un restaurante empiece a encajar: una estrella nueva, un precio más bajo o un menú nuevo. Como mucho, un correo al día.",
      yours: "Tu búsqueda", priceLegend: "Precio máximo (opcional)", upTo: "Hasta, por persona", currency: "Moneda",
      meal: "Comida", mDinner: "Cena", mLunch: "Almuerzo", mEither: "Almuerzo o cena, el más barato", wine: "Con maridaje",
      noPrice: "Déjalo vacío para enterarte de cada restaurante nuevo.", save: "Guardar y avisarme", saving: "Guardando…", close: "Cerrar",
      saved: "Guardado. Te escribiremos cuando un restaurante encaje.", manage: "Tus búsquedas guardadas", dup: "Ya guardaste esta búsqueda.",
      limit: "Puedes guardar hasta 20 búsquedas. Borra una en tu cuenta para guardar otra.", failed: "No se pudo guardar. Inténtalo de nuevo en un momento.",
      badPrice: "Escribe el precio en números o déjalo vacío.",
      note: "Los correos solo van a la dirección con la que inicias sesión, y cada uno tiene un enlace para darte de baja.", privacy: "Aviso de privacidad"
    },
    it: {
      title: "Salva questa ricerca", lede: "Ti scriveremo quando un ristorante inizierà a corrispondere: una nuova stella, un prezzo più basso o un nuovo menu. Al massimo un'email al giorno.",
      yours: "La tua ricerca", priceLegend: "Prezzo massimo (facoltativo)", upTo: "Fino a, a persona", currency: "Valuta",
      meal: "Pasto", mDinner: "Cena", mLunch: "Pranzo", mEither: "Pranzo o cena, il più economico", wine: "Con abbinamento vini",
      noPrice: "Lascia vuoto per sapere di ogni nuovo ristorante.", save: "Salva e avvisami", saving: "Salvataggio…", close: "Chiudi",
      saved: "Salvata. Ti scriveremo quando un ristorante corrisponderà.", manage: "Le tue ricerche salvate", dup: "Hai già salvato questa ricerca.",
      limit: "Puoi tenere fino a 20 ricerche. Eliminane una dal tuo account per salvarne un'altra.", failed: "Non è stato possibile salvare. Riprova tra un attimo.",
      badPrice: "Indica il prezzo in cifre, oppure lascia vuoto.",
      note: "Le email arrivano solo all'indirizzo con cui accedi, e ognuna ha un link per annullare l'iscrizione.", privacy: "Informativa sulla privacy"
    },
    ko: {
      title: "이 검색 저장", lede: "새로 조건에 맞는 레스토랑(새 별, 가격 인하, 새 메뉴)이 생기면 이메일로 알려 드립니다. 하루 최대 한 통입니다.",
      yours: "저장할 검색", priceLegend: "가격 상한(선택)", upTo: "1인 최대", currency: "통화",
      meal: "식사", mDinner: "디너", mLunch: "런치", mEither: "런치나 디너 중 더 저렴한 쪽", wine: "와인 페어링 포함",
      noPrice: "비워 두면 새로 맞는 모든 레스토랑을 알려 드립니다.", save: "저장하고 이메일 받기", saving: "저장 중…", close: "닫기",
      saved: "저장했습니다. 새로 맞는 레스토랑이 생기면 이메일로 알려 드립니다.", manage: "저장한 검색", dup: "이미 저장한 검색입니다.",
      limit: "검색은 20개까지 저장할 수 있습니다. 계정 페이지에서 하나를 삭제해 주세요.", failed: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      badPrice: "가격은 숫자로 입력하거나 비워 두세요.",
      note: "이메일은 로그인한 주소로만 보내며, 매번 수신 거부 링크가 있습니다.", privacy: "개인정보 처리방침"
    }
  };
  SW.yue = SW.zh;
  const words = () => Object.assign({}, SW.en, SW[LANG] || {});
  const STAR_EN = { 1: "one-star", 2: "two-star", 3: "three-star" };
  const DIET_EN = { vegetarian: "vegetarian", vegan: "vegan", "gluten-free": "gluten-free", halal: "halal", kosher: "kosher" };
  let W = words(), spec = null;

  // "Two-star Japanese restaurants in Ginza, Tokyo, with vegan options, dinner under ¥40,000 with wine".
  function label(en, q) {
    const s = (q.s || []).slice().sort();
    const stars = !s.length || s.length === 3 ? "starred" : s.length === 1 ? STAR_EN[s[0]] : s.length === 2 && s[0] === 2 ? "two- and three-star"
      : s.map((n) => STAR_EN[n].replace("-star", "")).join(" and ") + "-star";
    let out = stars + " " + (en.food ? en.food + " " : "") + "restaurants " + (en.place ? "in " + (q.a ? q.a + ", " : "") + en.place : "anywhere");
    if (q.d) out += ", with " + DIET_EN[q.d] + " options";
    if (q.b) {
      const meal = q.m === "lunch" ? "lunch" : q.m === "value" ? "lunch or dinner" : "dinner";
      out += ", " + meal + " under " + symbolOf(q.c) + Math.round(q.b).toLocaleString("en-GB") + (q.w ? " with wine" : "");
    }
    return (out[0].toUpperCase() + out.slice(1)).slice(0, 200);
  }
  // "1,250", "1.250" and "1 250" all read as twelve hundred and fifty; decimals don't matter for a limit.
  const parseLimit = (text) => { const s = text.replace(/[^\d.,]/g, ""); return s ? Number(s.replace(/[.,](\d{3})(?=$|[.,])/g, "$1").replace(",", ".")) : 0; };
  const field = (id, lab, input) => '<div class="rf-field" data-for="' + id + '"><label for="' + id + '">' + esc(lab) + "</label>" + input + "</div>";

  function build() {
    const box = document.createElement("dialog");
    box.id = "searchBox";
    box.className = "signin report-box search-box";
    document.body.appendChild(box);
    box.addEventListener("click", (e) => { if (e.target === box || e.target.closest(".si-close")) box.close(); });
    box.addEventListener("submit", (e) => { e.preventDefault(); save(); });
    return box;
  }
  function render() {
    const box = $("searchBox"), b = spec.budget;
    box.setAttribute("aria-label", W.title);
    box.innerHTML = '<form method="dialog" class="si-inner rf" novalidate>' +
      '<button type="button" class="si-close" aria-label="' + esc(W.close) + '">×</button>' +
      '<h2 class="si-title">' + esc(W.title) + '</h2><p class="si-why">' + esc(W.lede) + "</p>" +
      '<div class="ss-summary"><span>' + esc(W.yours) + "</span><strong>" + esc(spec.summary.join(" · ")) + "</strong></div>" +
      (b ? '<fieldset class="ss-price"><legend>' + esc(W.priceLegend) + "</legend>" +
        '<div class="rf-price">' + field("ssMax", W.upTo, '<input id="ssMax" type="text" inputmode="numeric" autocomplete="off" value="' + (b.max ? Math.round(b.max) : "") + '">') +
          field("ssCur", W.currency, '<select id="ssCur">' + b.currencies.map((c) => '<option value="' + c + '"' + (c === b.cur ? " selected" : "") + ">" + esc(c + " " + DATA.currencies[c].symbol.trim()) + "</option>").join("") + "</select>") + "</div>" +
        field("ssMeal", W.meal, '<select id="ssMeal">' + [["dinner", W.mDinner], ["lunch", W.mLunch], ["value", W.mEither]].map(([v, l]) =>
          '<option value="' + v + '"' + (v === b.meal ? " selected" : "") + ">" + esc(l) + "</option>").join("") + "</select>") +
        '<label class="ss-wine"><input type="checkbox" id="ssWine"' + (b.wine ? " checked" : "") + '> <span>' + esc(W.wine) + "</span></label>" +
        '<p class="rf-hint">' + esc(W.noPrice) + "</p></fieldset>" : "") +
      '<p class="si-small">' + esc(W.note) + ' <a href="/privacy/#searches">' + esc(W.privacy) + "</a></p>" +
      '<button type="submit" class="si-send">' + esc(W.save) + "</button>" +
      '<p class="si-status" aria-live="polite"></p></form>';
  }
  const status = (text) => { $("searchBox").querySelector(".si-status").textContent = text; };

  async function save() {
    const box = $("searchBox"), btn = box.querySelector(".si-send");
    const q = Object.assign({}, spec.query);
    let page = spec.page;
    if (spec.budget) {
      const max = parseLimit($("ssMax").value);
      if ($("ssMax").value.trim() && !(max > 0)) { status(W.badPrice); $("ssMax").focus(); return; }
      if (max > 0) {
        Object.assign(q, { b: max, c: $("ssCur").value, m: $("ssMeal").value, w: $("ssWine").checked });
        page += (page.includes("?") ? "&" : "?") + "max=" + max + "&cur=" + q.c + (q.m === "dinner" ? "" : "&meal=" + q.m) + (q.w ? "&wine=1" : "");
      }
    }
    Object.keys(q).forEach((k) => { if (q[k] === "" || q[k] === false || (Array.isArray(q[k]) && !q[k].length) || q[k] == null) delete q[k]; });
    const row = { label: label(spec.en, q), query: q, page: page.slice(0, 500) };
    btn.disabled = true; btn.textContent = W.saving; status("");
    try {
      if (!account.user) throw new Error("signed out");
      const mine = await account.client.from("saved_searches").select("page");
      if (!mine.error && (mine.data || []).some((x) => x.page === row.page)) { status(W.dup); return; }
      const { error } = await account.client.from("saved_searches").insert(row);
      if (error) { status(/20 saved searches/.test(error.message || "") ? W.limit : W.failed); return; }
      track("saved-search", { from: spec.from, price: q.b ? "yes" : "no" });
      box.innerHTML = '<div class="si-inner rf-done"><button type="button" class="si-close" aria-label="' + esc(W.close) + '">×</button>' +
        '<h2 class="si-title">' + esc(W.title) + '</h2><p class="si-why">' + esc(W.saved) + "</p>" +
        '<p class="ss-summary"><strong>' + esc(row.label) + "</strong></p>" +
        '<a class="si-send rf-link" href="/account/#searches">' + esc(W.manage) + "</a></div>";
    } catch (e) {
      status(W.failed);
    } finally {
      if (btn.isConnected) { btn.disabled = false; btn.textContent = W.save; }
    }
  }

  // s: { query, en: {place, food}, summary: [words in the page's language], page, from,
  //      budget: {currencies, cur, meal, max, wine} to ask for a price limit, or null when the query has one already (Help me pick) }.
  window.showSaveSearch = function (s) {
    W = words();
    spec = s;
    const box = $("searchBox") || build();
    render();
    if (!box.open) box.showModal();
  };
})();
