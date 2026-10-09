// "Report a price or change" (9 Oct 2026): a signed-in member tells us what they paid and when, with a photo of the
// menu or bill if they like, or that a restaurant has closed or has a new head chef. Loaded by account.js only when
// someone taps the button. Reports go to the `reports` table and photos to the private `report-photos` bucket
// (supabase/reports.sql); we check each against the restaurant's own website before changing anything
// (scripts/reports.py), and the member follows it on their account page, where a used or confirmed one earns the
// Price checker badge. The form's words are here rather than in common.js, so no page downloads them until needed;
// languages without their own set read English.
(function () {
  const RW = {
    en: {
      title: "Report a price or change", lede: "Seen a different price at {name}, or something we've missed? Tell us and we'll check it.",
      kindLegend: "What have you seen?", kPrice: "A price", kClosed: "It has closed", kChef: "A new head chef", kOther: "Something else",
      meal: "Which menu?", mDinner: "Dinner", mLunch: "Lunch", mWine: "Wine pairing", mOther: "Another menu", menuName: "Menu name",
      price: "Price per person", currency: "Currency", priceHint: "As the menu or bill shows it, before any service charge or tip.",
      seen: "When did you see it?", chef: "The new head chef's name",
      detailsOpt: "Anything else? (optional)", detailsClosed: "How do you know? (optional)", detailsOther: "What has changed?",
      link: "A link that shows it (optional)", photo: "Photo of the menu or bill (optional)",
      photoHint: "Please cover any card numbers or names first. We only use it to check the price: we never publish it, and we delete it once we've checked.",
      consent: "We check every report against the restaurant's own website before changing anything. We may publish a price you report, but never your name, email or photo.",
      privacy: "Privacy notice", send: "Send report", sending: "Sending…",
      thanks: "Thank you! We'll check it within a week or so, and you can follow it on your account page.",
      seeAccount: "Your reports", another: "Report something else", close: "Close",
      needPrice: "Please give the price per person.", needChef: "Please give the new chef's name.", needDetails: "Please tell us what has changed.",
      badLink: "That link doesn't look right. It should start with https://", photoBad: "That photo couldn't be read. Please try a JPEG or PNG.",
      tooMany: "You've sent 10 reports today, the most we take in a day. Please try again tomorrow.", failed: "That didn't send. Please try again in a moment."
    },
    zh: {
      title: "回報價格或變動", lede: "在 {name} 看到不同的價格，或發現我們漏掉的資訊？告訴我們，我們會查證。",
      kindLegend: "你看到了什麼？", kPrice: "價格", kClosed: "已經結業", kChef: "換了主廚", kOther: "其他",
      meal: "哪一套菜單？", mDinner: "晚餐", mLunch: "午餐", mWine: "餐酒搭配", mOther: "其他菜單", menuName: "菜單名稱",
      price: "每人價格", currency: "貨幣", priceHint: "以菜單或帳單上的金額為準，未含服務費或小費。",
      seen: "你在何時看到？", chef: "新主廚的名字",
      detailsOpt: "還有其他補充嗎？（選填）", detailsClosed: "你怎麼知道的？（選填）", detailsOther: "有什麼變動？",
      link: "可佐證的連結（選填）", photo: "菜單或帳單照片（選填）",
      photoHint: "請先遮住卡號或姓名。照片只用來查證價格：我們不會公開，查證後即刪除。",
      consent: "每則回報我們都會先對照餐廳官網再作修改。我們可能會公開你回報的價格，但絕不公開你的姓名、電郵或照片。",
      privacy: "隱私權聲明", send: "送出回報", sending: "傳送中…",
      thanks: "謝謝你！我們會在一週左右查證，你可在帳戶頁面查看進度。",
      seeAccount: "你的回報", another: "回報其他事項", close: "關閉",
      needPrice: "請填寫每人價格。", needChef: "請填寫新主廚的名字。", needDetails: "請告訴我們有什麼變動。",
      badLink: "這個連結似乎不正確，應以 https:// 開頭。", photoBad: "無法讀取這張照片，請改用 JPEG 或 PNG。",
      tooMany: "你今天已送出 10 則回報，已達每日上限，請明天再試。", failed: "傳送失敗，請稍後再試。"
    },
    fr: {
      title: "Signaler un prix ou un changement", lede: "Vous avez vu un autre prix chez {name}, ou une information qui nous manque ? Dites-le-nous, nous vérifierons.",
      kindLegend: "Qu'avez-vous constaté ?", kPrice: "Un prix", kClosed: "Le restaurant a fermé", kChef: "Un nouveau chef", kOther: "Autre chose",
      meal: "Quel menu ?", mDinner: "Dîner", mLunch: "Déjeuner", mWine: "Accord mets-vins", mOther: "Un autre menu", menuName: "Nom du menu",
      price: "Prix par personne", currency: "Devise", priceHint: "Tel qu'indiqué sur la carte ou l'addition, hors service et pourboire.",
      seen: "Quand l'avez-vous vu ?", chef: "Nom du nouveau chef",
      detailsOpt: "Autre chose ? (facultatif)", detailsClosed: "Comment le savez-vous ? (facultatif)", detailsOther: "Qu'est-ce qui a changé ?",
      link: "Un lien qui le montre (facultatif)", photo: "Photo du menu ou de l'addition (facultatif)",
      photoHint: "Masquez d'abord tout numéro de carte ou nom. Elle sert uniquement à vérifier le prix : nous ne la publions jamais et la supprimons après vérification.",
      consent: "Nous vérifions chaque signalement sur le site du restaurant avant de modifier quoi que ce soit. Nous pouvons publier le prix signalé, jamais votre nom, votre e-mail ni votre photo.",
      privacy: "Politique de confidentialité", send: "Envoyer", sending: "Envoi…",
      thanks: "Merci ! Nous vérifierons d'ici une semaine environ ; vous pouvez suivre votre signalement sur votre page de compte.",
      seeAccount: "Vos signalements", another: "Signaler autre chose", close: "Fermer",
      needPrice: "Indiquez le prix par personne.", needChef: "Indiquez le nom du nouveau chef.", needDetails: "Dites-nous ce qui a changé.",
      badLink: "Ce lien semble incorrect. Il doit commencer par https://", photoBad: "Impossible de lire cette photo. Essayez un JPEG ou un PNG.",
      tooMany: "Vous avez envoyé 10 signalements aujourd'hui, le maximum par jour. Réessayez demain.", failed: "L'envoi a échoué. Réessayez dans un instant."
    },
    ja: {
      title: "料金や変更を報告", lede: "{name}で違う料金を見かけた、または情報の漏れに気づいた方は、お知らせください。確認します。",
      kindLegend: "どのような情報ですか？", kPrice: "料金", kClosed: "閉店した", kChef: "料理長が替わった", kOther: "その他",
      meal: "どのコースですか？", mDinner: "ディナー", mLunch: "ランチ", mWine: "ワインペアリング", mOther: "その他のコース", menuName: "コース名",
      price: "1人あたりの料金", currency: "通貨", priceHint: "メニューや会計に記載の金額（サービス料・チップ別）。",
      seen: "いつ見ましたか？", chef: "新しい料理長の名前",
      detailsOpt: "その他（任意）", detailsClosed: "どのようにお知りになりましたか？（任意）", detailsOther: "何が変わりましたか？",
      link: "確認できるリンク（任意）", photo: "メニューや会計の写真（任意）",
      photoHint: "カード番号や氏名は隠してください。写真は料金の確認にのみ使い、公開せず、確認後に削除します。",
      consent: "すべての報告は、変更する前にレストランの公式サイトで確認します。報告いただいた料金は掲載することがありますが、お名前・メール・写真は掲載しません。",
      privacy: "プライバシーポリシー", send: "送信する", sending: "送信中…",
      thanks: "ありがとうございます。1週間ほどで確認します。進み具合はアカウントページでご覧いただけます。",
      seeAccount: "あなたの報告", another: "ほかの報告をする", close: "閉じる",
      needPrice: "1人あたりの料金を入力してください。", needChef: "新しい料理長の名前を入力してください。", needDetails: "何が変わったか教えてください。",
      badLink: "リンクが正しくないようです。https:// で始まる必要があります。", photoBad: "写真を読み込めませんでした。JPEG か PNG でお試しください。",
      tooMany: "本日は上限の10件を送信済みです。明日またお試しください。", failed: "送信できませんでした。しばらくしてからお試しください。"
    },
    es: {
      title: "Avisar de un precio o cambio", lede: "¿Has visto otro precio en {name} o algo que se nos escapa? Cuéntanoslo y lo comprobaremos.",
      kindLegend: "¿Qué has visto?", kPrice: "Un precio", kClosed: "Ha cerrado", kChef: "Un nuevo jefe de cocina", kOther: "Otra cosa",
      meal: "¿Qué menú?", mDinner: "Cena", mLunch: "Almuerzo", mWine: "Maridaje", mOther: "Otro menú", menuName: "Nombre del menú",
      price: "Precio por persona", currency: "Moneda", priceHint: "Tal como figura en la carta o la cuenta, sin servicio ni propina.",
      seen: "¿Cuándo lo viste?", chef: "Nombre del nuevo jefe de cocina",
      detailsOpt: "¿Algo más? (opcional)", detailsClosed: "¿Cómo lo sabes? (opcional)", detailsOther: "¿Qué ha cambiado?",
      link: "Un enlace que lo muestre (opcional)", photo: "Foto de la carta o la cuenta (opcional)",
      photoHint: "Tapa antes cualquier número de tarjeta o nombre. Solo la usamos para comprobar el precio: nunca la publicamos y la borramos tras comprobarlo.",
      consent: "Comprobamos cada aviso en la web del restaurante antes de cambiar nada. Podemos publicar el precio que nos indiques, pero nunca tu nombre, tu correo ni tu foto.",
      privacy: "Aviso de privacidad", send: "Enviar aviso", sending: "Enviando…",
      thanks: "¡Gracias! Lo comprobaremos en una semana más o menos; puedes seguirlo en tu página de cuenta.",
      seeAccount: "Tus avisos", another: "Avisar de otra cosa", close: "Cerrar",
      needPrice: "Indica el precio por persona.", needChef: "Indica el nombre del nuevo jefe de cocina.", needDetails: "Cuéntanos qué ha cambiado.",
      badLink: "Ese enlace no parece correcto. Debe empezar por https://", photoBad: "No se pudo leer la foto. Prueba con un JPEG o PNG.",
      tooMany: "Hoy ya has enviado 10 avisos, el máximo diario. Vuelve a intentarlo mañana.", failed: "No se ha podido enviar. Inténtalo de nuevo en un momento."
    },
    it: {
      title: "Segnala un prezzo o un cambiamento", lede: "Hai visto un prezzo diverso da {name}, o qualcosa che ci sfugge? Diccelo e lo verificheremo.",
      kindLegend: "Che cosa hai visto?", kPrice: "Un prezzo", kClosed: "Ha chiuso", kChef: "Un nuovo chef", kOther: "Altro",
      meal: "Quale menu?", mDinner: "Cena", mLunch: "Pranzo", mWine: "Abbinamento vini", mOther: "Un altro menu", menuName: "Nome del menu",
      price: "Prezzo a persona", currency: "Valuta", priceHint: "Come indicato sul menu o sul conto, escluso servizio e mancia.",
      seen: "Quando l'hai visto?", chef: "Nome del nuovo chef",
      detailsOpt: "Altro? (facoltativo)", detailsClosed: "Come lo sai? (facoltativo)", detailsOther: "Che cosa è cambiato?",
      link: "Un link che lo mostri (facoltativo)", photo: "Foto del menu o del conto (facoltativa)",
      photoHint: "Copri prima numeri di carta o nomi. La usiamo solo per verificare il prezzo: non la pubblichiamo mai e la cancelliamo dopo la verifica.",
      consent: "Verifichiamo ogni segnalazione sul sito del ristorante prima di cambiare qualsiasi cosa. Possiamo pubblicare il prezzo segnalato, mai il tuo nome, la tua email o la tua foto.",
      privacy: "Informativa sulla privacy", send: "Invia segnalazione", sending: "Invio…",
      thanks: "Grazie! La verificheremo entro una settimana circa; puoi seguirla nella pagina del tuo account.",
      seeAccount: "Le tue segnalazioni", another: "Segnala altro", close: "Chiudi",
      needPrice: "Indica il prezzo a persona.", needChef: "Indica il nome del nuovo chef.", needDetails: "Dicci che cosa è cambiato.",
      badLink: "Il link non sembra corretto. Deve iniziare con https://", photoBad: "Impossibile leggere la foto. Prova con un JPEG o PNG.",
      tooMany: "Oggi hai già inviato 10 segnalazioni, il massimo giornaliero. Riprova domani.", failed: "Invio non riuscito. Riprova tra poco."
    },
    ko: {
      title: "가격 또는 변경 사항 제보", lede: "{name}에서 다른 가격을 보셨거나 저희가 놓친 정보가 있나요? 알려 주시면 확인하겠습니다.",
      kindLegend: "무엇을 보셨나요?", kPrice: "가격", kClosed: "폐업했어요", kChef: "헤드 셰프가 바뀌었어요", kOther: "기타",
      meal: "어떤 메뉴인가요?", mDinner: "디너", mLunch: "런치", mWine: "와인 페어링", mOther: "다른 메뉴", menuName: "메뉴 이름",
      price: "1인 가격", currency: "통화", priceHint: "메뉴판이나 영수증에 적힌 금액(봉사료·팁 제외).",
      seen: "언제 보셨나요?", chef: "새 헤드 셰프 이름",
      detailsOpt: "더 알려 주실 내용이 있나요? (선택)", detailsClosed: "어떻게 아셨나요? (선택)", detailsOther: "무엇이 바뀌었나요?",
      link: "확인할 수 있는 링크 (선택)", photo: "메뉴판 또는 영수증 사진 (선택)",
      photoHint: "카드 번호나 이름은 먼저 가려 주세요. 사진은 가격 확인에만 쓰며, 공개하지 않고 확인 후 삭제합니다.",
      consent: "모든 제보는 변경하기 전에 레스토랑 공식 웹사이트에서 확인합니다. 제보하신 가격은 게시할 수 있지만, 이름·이메일·사진은 절대 게시하지 않습니다.",
      privacy: "개인정보 처리방침", send: "제보 보내기", sending: "보내는 중…",
      thanks: "감사합니다! 일주일쯤 안에 확인하겠습니다. 진행 상황은 계정 페이지에서 볼 수 있습니다.",
      seeAccount: "내 제보", another: "다른 내용 제보하기", close: "닫기",
      needPrice: "1인 가격을 입력해 주세요.", needChef: "새 셰프 이름을 입력해 주세요.", needDetails: "무엇이 바뀌었는지 알려 주세요.",
      badLink: "링크가 올바르지 않은 것 같습니다. https:// 로 시작해야 합니다.", photoBad: "사진을 읽을 수 없습니다. JPEG 또는 PNG로 시도해 주세요.",
      tooMany: "오늘 하루 최대치인 10건을 보내셨습니다. 내일 다시 시도해 주세요.", failed: "보내지 못했습니다. 잠시 후 다시 시도해 주세요."
    }
  };
  RW.yue = RW.zh;
  const words = () => Object.assign({}, RW.en, RW[LANG] || {});
  const PHOTO_EDGE = 1600, PHOTO_QUALITY = 0.82, RAW_MAX = 30 * 1024 * 1024;
  let W = words(), current = null;

  // Phones' photos are large; send a JPEG at most 1600 pixels across (a few hundred KB), turned the right way up.
  async function shrink(file) {
    if (file.size > RAW_MAX) throw new Error("too big");
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, PHOTO_EDGE / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("no image"))), "image/jpeg", PHOTO_QUALITY));
  }

  // "1,250.50", "1.250,50", "1 250" and "12,5" all read as people mean them: the last separator is the decimal point,
  // unless three digits follow it (then it separates thousands).
  function parsePrice(text) {
    const s = text.replace(/[^\d.,]/g, ""), last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    return last >= 0 && s.length - last - 1 !== 3 ? Number(s.slice(0, last).replace(/[.,]/g, "") + "." + s.slice(last + 1)) : Number(s.replace(/[.,]/g, ""));
  }
  const field = (id, label, input, extra) => '<div class="rf-field" data-for="' + id + '"><label for="' + id + '">' + esc(label) + "</label>" + input + (extra || "") + "</div>";
  function build() {
    const box = document.createElement("dialog");
    box.id = "reportBox";
    box.className = "signin report-box";
    document.body.appendChild(box);
    box.addEventListener("click", (e) => { if (e.target === box || e.target.closest(".si-close, [data-rf-close]")) box.close(); });
    box.addEventListener("change", (e) => { if (e.target.name === "rfKind" || e.target.id === "rfMeal") showFields(); });
    box.addEventListener("submit", (e) => { e.preventDefault(); send(); });
    return box;
  }
  function currencies(r) {
    const all = DATA.currencies || {};
    return [r.cur].concat(["GBP", "EUR", "USD"]).filter((c, i, a) => c && all[c] && a.indexOf(c) === i);
  }
  function renderForm(r) {
    const box = $("reportBox");
    const today = new Date().toISOString().slice(0, 10);
    const kinds = [["price", W.kPrice], ["closed", W.kClosed], ["chef", W.kChef], ["other", W.kOther]];
    const meals = [["dinner", W.mDinner], ["lunch", W.mLunch], ["wine", W.mWine], ["other", W.mOther]];
    box.setAttribute("aria-label", W.title);
    box.innerHTML = '<form method="dialog" class="si-inner rf" novalidate>' +
      '<button type="button" class="si-close" aria-label="' + esc(W.close) + '">×</button>' +
      '<h2 class="si-title">' + esc(W.title) + '</h2><p class="si-why">' + esc(W.lede.replace("{name}", r.name)) + "</p>" +
      '<fieldset class="rf-kinds"><legend>' + esc(W.kindLegend) + "</legend>" + kinds.map(([v, l], i) =>
        '<label class="rf-kind"><input type="radio" name="rfKind" value="' + v + '"' + (i ? "" : " checked") + "><span>" + esc(l) + "</span></label>").join("") + "</fieldset>" +
      '<div class="rf-group" data-kind="price">' +
        field("rfMeal", W.meal, '<select id="rfMeal">' + meals.map(([v, l]) => '<option value="' + v + '"' + (v === (r.meal || "dinner") ? " selected" : "") + ">" + esc(l) + "</option>").join("") + "</select>") +
        field("rfMenu", W.menuName, '<input id="rfMenu" type="text" maxlength="120" autocomplete="off">') +
        '<div class="rf-price">' + field("rfPrice", W.price, '<input id="rfPrice" type="text" inputmode="decimal" autocomplete="off" placeholder="0">') +
          field("rfCur", W.currency, '<select id="rfCur">' + currencies(r).map((c) => '<option value="' + c + '">' + esc(c + " " + DATA.currencies[c].symbol.trim()) + "</option>").join("") + "</select>") + "</div>" +
        '<p class="rf-hint">' + esc(W.priceHint) + "</p>" +
        field("rfSeen", W.seen, '<input id="rfSeen" type="date" max="' + today + '" min="2020-01-01" value="' + today + '">') +
      "</div>" +
      '<div class="rf-group" data-kind="chef">' + field("rfChef", W.chef, '<input id="rfChef" type="text" maxlength="120" autocomplete="off">') + "</div>" +
      field("rfDetails", W.detailsOpt, '<textarea id="rfDetails" rows="3" maxlength="1000"></textarea>') +
      field("rfLink", W.link, '<input id="rfLink" type="url" inputmode="url" maxlength="500" placeholder="https://">') +
      field("rfPhoto", W.photo, '<input id="rfPhoto" type="file" accept="image/*">', '<p class="rf-hint">' + esc(W.photoHint) + "</p>") +
      '<p class="si-small">' + esc(W.consent) + ' <a href="/privacy/#reports">' + esc(W.privacy) + "</a></p>" +
      '<button type="submit" class="si-send">' + esc(W.send) + "</button>" +
      '<p class="si-status" aria-live="polite"></p></form>';
    showFields();
  }
  function showFields() {
    const box = $("reportBox"), kind = box.querySelector("[name=rfKind]:checked").value;
    box.querySelectorAll(".rf-group").forEach((g) => { g.hidden = g.dataset.kind !== kind; });
    box.querySelector("[data-for=rfMenu]").hidden = kind !== "price" || $("rfMeal").value !== "other";
    box.querySelector("[data-for=rfPhoto]").hidden = kind === "closed" || kind === "chef";
    box.querySelector("label[for=rfDetails]").textContent = kind === "closed" ? W.detailsClosed : kind === "other" ? W.detailsOther : W.detailsOpt;
  }
  const status = (text) => { $("reportBox").querySelector(".si-status").textContent = text; };

  async function send() {
    const box = $("reportBox"), btn = box.querySelector(".si-send");
    const kind = box.querySelector("[name=rfKind]:checked").value;
    const val = (id) => $(id).value.trim();
    const row = { restaurant_id: current.id, restaurant_name: current.name.slice(0, 200), kind, details: val("rfDetails") || null, link: val("rfLink") || null };
    if (kind === "price") {
      const price = parsePrice(val("rfPrice"));
      if (!(price > 0)) { status(W.needPrice); $("rfPrice").focus(); return; }
      Object.assign(row, { meal: $("rfMeal").value, menu_name: $("rfMeal").value === "other" ? val("rfMenu") || null : null, price, currency: $("rfCur").value,
        seen_on: /^\d{4}-\d{2}-\d{2}$/.test($("rfSeen").value) ? $("rfSeen").value : null });
    }
    if (kind === "chef") { if (!val("rfChef")) { status(W.needChef); $("rfChef").focus(); return; } row.chef = val("rfChef"); }
    if (kind === "other" && !row.details) { status(W.needDetails); $("rfDetails").focus(); return; }
    if (row.link && !/^https?:\/\/\S+\.\S+/.test(row.link)) { status(W.badLink); $("rfLink").focus(); return; }
    const file = !box.querySelector("[data-for=rfPhoto]").hidden && $("rfPhoto").files[0];
    btn.disabled = true; btn.textContent = W.sending; status("");
    try {
      if (!account.user) throw new Error("signed out");
      if (file) {
        let blob;
        try { blob = await shrink(file); } catch (e) { status(W.photoBad); return; }
        const path = account.user.id + "/" + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2)) + ".jpg";
        const up = await account.client.storage.from("report-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (up.error) throw up.error;
        row.photo_path = path;
      }
      const { error } = await account.client.from("reports").insert(row);
      if (error) { status(/too many reports/.test(error.message || "") ? W.tooMany : W.failed); return; }
      track("report", { kind, restaurant: current.id, photo: file ? "yes" : "no" });
      box.innerHTML = '<div class="si-inner rf-done"><button type="button" class="si-close" aria-label="' + esc(W.close) + '">×</button>' +
        '<h2 class="si-title">' + esc(W.title) + '</h2><p class="si-why">' + esc(W.thanks) + "</p>" +
        '<a class="si-send rf-link" href="/account/#reports">' + esc(W.seeAccount) + "</a>" +
        '<button type="button" class="btn-line" data-rf-again>' + esc(W.another) + "</button></div>";
      box.querySelector("[data-rf-again]").addEventListener("click", () => renderForm(current));
    } catch (e) {
      status(W.failed);
    } finally {
      if (btn.isConnected) { btn.disabled = false; btn.textContent = W.send; }
    }
  }

  // r: { id, name, cur, meal }. account.js makes sure someone is signed in first.
  window.showReport = function (r) {
    W = words();
    current = r;
    const box = $("reportBox") || build();
    renderForm(r);
    if (!box.open) box.showModal();
  };
})();
