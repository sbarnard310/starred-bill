// "Add to a trip" (10 Oct 2026): from a restaurant page or a destination page's list, a signed-in member puts the
// restaurant into one of their trips or lists, or starts a new one with it. Loaded by account.js only when someone taps
// the button. Trips live in the `trips` table (supabase/trips.sql) and are planned on /trips/ (trips.js). The window's
// words are here rather than in common.js, so no page downloads them until needed; languages without their own set read English.
(function () {
  const TW = {
    en: {
      title: "Add {name} to a trip", loading: "Loading your trips…", none: "You haven't started a trip or list yet.",
      pick: "Your trips and lists", already: "Already in it", restaurants: "{n} restaurants", restaurant: "1 restaurant", list: "List",
      newLabel: "Or start a new trip", newPh: "Paris, May 2027", create: "Start it with this restaurant", needName: "Please give it a name.",
      added: "Added to “{trip}”.", open: "Open the trip", all: "All your trips", close: "Close", full: "That one already holds 60 restaurants, the most it can.",
      failed: "That didn't work. Please try again in a moment."
    },
    zh: {
      title: "把 {name} 加入行程", loading: "正在載入你的行程…", none: "你還沒有建立任何行程或清單。",
      pick: "你的行程與清單", already: "已在其中", restaurants: "{n} 家餐廳", restaurant: "1 家餐廳", list: "清單",
      newLabel: "或建立新行程", newPh: "巴黎，2027 年 5 月", create: "以這家餐廳開始", needName: "請為行程取個名字。",
      added: "已加入「{trip}」。", open: "打開行程", all: "你的所有行程", close: "關閉", full: "這個行程已有 60 家餐廳，已達上限。",
      failed: "操作失敗，請稍後再試。"
    },
    fr: {
      title: "Ajouter {name} à un voyage", loading: "Chargement de vos voyages…", none: "Vous n'avez encore aucun voyage ni liste.",
      pick: "Vos voyages et listes", already: "Déjà dedans", restaurants: "{n} restaurants", restaurant: "1 restaurant", list: "Liste",
      newLabel: "Ou commencez un nouveau voyage", newPh: "Paris, mai 2027", create: "Le commencer avec ce restaurant", needName: "Donnez-lui un nom.",
      added: "Ajouté à « {trip} ».", open: "Ouvrir le voyage", all: "Tous vos voyages", close: "Fermer", full: "Celui-ci compte déjà 60 restaurants, le maximum.",
      failed: "Cela n'a pas fonctionné. Réessayez dans un instant."
    },
    ja: {
      title: "{name}を旅行に追加", loading: "旅行を読み込んでいます…", none: "まだ旅行やリストがありません。",
      pick: "あなたの旅行とリスト", already: "追加済み", restaurants: "{n}軒", restaurant: "1軒", list: "リスト",
      newLabel: "新しい旅行を作成", newPh: "パリ 2027年5月", create: "このレストランで作成", needName: "名前を入力してください。",
      added: "「{trip}」に追加しました。", open: "旅行を開く", all: "すべての旅行", close: "閉じる", full: "この旅行はすでに上限の60軒です。",
      failed: "うまくいきませんでした。しばらくしてからもう一度お試しください。"
    },
    es: {
      title: "Añadir {name} a un viaje", loading: "Cargando tus viajes…", none: "Aún no tienes ningún viaje ni lista.",
      pick: "Tus viajes y listas", already: "Ya está", restaurants: "{n} restaurantes", restaurant: "1 restaurante", list: "Lista",
      newLabel: "O empieza un viaje nuevo", newPh: "París, mayo de 2027", create: "Empezarlo con este restaurante", needName: "Ponle un nombre.",
      added: "Añadido a «{trip}».", open: "Abrir el viaje", all: "Todos tus viajes", close: "Cerrar", full: "Ese ya tiene 60 restaurantes, el máximo.",
      failed: "No ha funcionado. Inténtalo de nuevo en un momento."
    },
    it: {
      title: "Aggiungi {name} a un viaggio", loading: "Caricamento dei tuoi viaggi…", none: "Non hai ancora nessun viaggio né lista.",
      pick: "I tuoi viaggi e liste", already: "Già presente", restaurants: "{n} ristoranti", restaurant: "1 ristorante", list: "Lista",
      newLabel: "Oppure inizia un nuovo viaggio", newPh: "Parigi, maggio 2027", create: "Inizialo con questo ristorante", needName: "Dagli un nome.",
      added: "Aggiunto a «{trip}».", open: "Apri il viaggio", all: "Tutti i tuoi viaggi", close: "Chiudi", full: "Quello ha già 60 ristoranti, il massimo.",
      failed: "Non ha funzionato. Riprova tra un momento."
    },
    ko: {
      title: "{name}을(를) 여행에 추가", loading: "여행을 불러오는 중…", none: "아직 여행이나 리스트가 없습니다.",
      pick: "내 여행과 리스트", already: "이미 추가됨", restaurants: "{n}곳", restaurant: "1곳", list: "리스트",
      newLabel: "새 여행 만들기", newPh: "파리, 2027년 5월", create: "이 레스토랑으로 시작", needName: "이름을 입력해 주세요.",
      added: "‘{trip}’에 추가했습니다.", open: "여행 열기", all: "내 모든 여행", close: "닫기", full: "이 여행에는 이미 최대치인 60곳이 있습니다.",
      failed: "실패했습니다. 잠시 후 다시 시도해 주세요."
    }
  };
  TW.yue = TW.zh;
  const MAX = 60;
  const words = () => Object.assign({}, TW.en, TW[LANG] || {});
  let W = words(), current = null, trips = null;
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] != null ? v[k] : m);

  function build() {
    const box = document.createElement("dialog");
    box.id = "tripAddBox";
    box.className = "signin trip-add-box";
    document.body.appendChild(box);
    box.addEventListener("click", (e) => {
      if (e.target === box || e.target.closest(".si-close")) { box.close(); return; }
      const b = e.target.closest("[data-to-trip]");
      if (b && !b.disabled) addTo(b.dataset.toTrip);
    });
    box.addEventListener("submit", (e) => { e.preventDefault(); createWith(); });
    return box;
  }
  function meta(t) {
    const n = (t.items || []).length;
    const day = (d) => new Date(d + "T12:00:00Z").toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    const when = t.kind === "list" ? W.list : t.starts_on ? day(t.starts_on) + (t.ends_on && t.ends_on !== t.starts_on ? " – " + day(t.ends_on) : "") : "";
    return [when, n === 1 ? W.restaurant : fill(W.restaurants, { n })].filter(Boolean).join(" · ");
  }
  function draw(state) {
    const box = $("tripAddBox"), r = current;
    box.setAttribute("aria-label", fill(W.title, { name: r.name }));
    let body;
    if (state.done) {
      body = '<p class="si-status">' + esc(fill(W.added, { trip: state.done.title })) + "</p>" +
        '<a class="si-send ta-open" href="/trips/?t=' + esc(state.done.id) + '">' + esc(W.open) + " →</a>";
    } else if (!trips) {
      body = '<p class="si-why">' + esc(state.error || W.loading) + "</p>";
    } else {
      const list = trips.length ? '<p class="ta-pick">' + esc(W.pick) + '</p><ul class="ta-list">' + trips.map((t) => {
        const has = (t.items || []).some((x) => x.r === r.id), full = (t.items || []).length >= MAX;
        return '<li><button type="button" data-to-trip="' + esc(t.id) + '"' + (has || full ? " disabled" : "") + '><span class="ta-title">' + esc(t.title) + '</span><span class="ta-meta">' +
          esc(has ? "✓ " + W.already : meta(t)) + "</span></button></li>";
      }).join("") + "</ul>" : '<p class="si-why">' + esc(W.none) + "</p>";
      body = list + '<form class="ta-new" novalidate><label for="taName">' + esc(W.newLabel) + '</label><input id="taName" type="text" maxlength="120" autocomplete="off" placeholder="' + esc(W.newPh) + '">' +
        '<button type="submit" class="si-send">' + esc(W.create) + '</button></form><p class="si-status" aria-live="polite">' + esc(state.error || "") + "</p>";
    }
    box.innerHTML = '<div class="si-inner"><button type="button" class="si-close" aria-label="' + esc(W.close) + '">×</button>' +
      '<h2 class="si-title">' + esc(fill(W.title, { name: r.name })) + "</h2>" + body +
      '<p class="si-small"><a href="/trips/">' + esc(W.all) + " →</a></p></div>";
  }
  async function load() {
    const { data, error } = await account.client.from("trips").select("id,kind,title,starts_on,ends_on,items").order("updated_at", { ascending: false }).limit(100);
    if (error) { draw({ error: W.failed }); return; }
    trips = data;
    draw({});
  }
  async function addTo(id) {
    const t = trips.find((x) => x.id === id), r = current;
    if (!t) return;
    if ((t.items || []).length >= MAX) { draw({ error: W.full }); return; }
    const items = (t.items || []).concat(t.kind === "list" ? [{ r: r.id }] : [{ r: r.id, meal: "dinner" }]);
    const { error } = await account.client.from("trips").update({ items }).eq("id", id);
    if (error) { draw({ error: W.failed }); return; }
    t.items = items;
    track("trip", { action: "add", from: r.from || "page", kind: t.kind });
    draw({ done: t });
  }
  async function createWith() {
    const name = $("taName").value.trim(), r = current;
    if (!name) { draw({ error: W.needName }); $("taName").focus(); return; }
    const { data, error } = await account.client.from("trips").insert({ kind: "trip", title: name.slice(0, 120), meal: "dinner", currency: homeCurrency() || null,
      items: [{ r: r.id, meal: "dinner" }] }).select("id,kind,title,starts_on,ends_on,items").single();
    if (error) { draw({ error: W.failed }); return; }
    trips.unshift(data);
    track("trip", { action: "create", kind: "trip", from: r.from || "page" });
    draw({ done: data });
  }

  // r: { id, name, from }. account.js has made sure someone is signed in.
  window.showTripAdd = function (r) {
    W = words();
    current = r;
    trips = null;
    const box = $("tripAddBox") || build();
    draw({});
    if (!box.open) box.showModal();
    load();
  };
})();
