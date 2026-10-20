/* Etkileşimli piyano klavyesi (fare, dokunma, bilgisayar klavyesi).
   Piano(container, { from, to, onplay, labels, keys }) → { el, mark, clear, press, keyEl }
   - from/to: MIDI aralığı (beyaz tuşla başlayıp bitmeli)
   - mark(midi, cls, label): tuşu renklendir (cls: "tonic" | "tension" | "wave" | "comma" | "in" | "dim")
   - Bilgisayar klavyesi: A S D F G H J K L ; beyaz, W E T Y U O P siyah (yalnız etkin slaytta) */
(function () {
  const { h } = L;
  const KB_WHITE = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'"];
  const KB_BLACK = { w: 0, e: 1, t: 3, y: 4, u: 5, o: 7, p: 8 }; // beyaz tuş indeksinden sonraki siyah

  // Tek bir yakalayıcı: piano.js uygulamanın diğer betiklerinden önce yüklenir, böylece etkin slayttaki
  // piyano A, G, F, T, O gibi tuşları kısayollardan önce alır (stopImmediatePropagation).
  const instances = [];
  const all = []; // bütün piyanolar (MIDI etkin slayttakileri bulur)
  window.addEventListener("keydown", (e) => { for (const p of instances) { p.onKey(e); if (e.defaultPrevented) return; } }, true);
  window.addEventListener("keyup", (e) => instances.forEach((p) => p.onKeyUp(e)), true);

  function Piano(container, opts = {}) {
    const { from = 60, to = 83, onplay = null, labels = "c", keys = true, sound = true, compact = false } = opts;
    const el = h("div.piano" + (compact ? ".compact" : ""), { role: "group", "aria-label": "Piyano klavyesi" });
    const whites = [];
    for (let m = from; m <= to; m++) if (!T.isBlack(m)) whites.push(m);
    el.style.setProperty("--whites", whites.length);
    const keyEls = new Map();
    whites.forEach((m, i) => {
      const k = h("button.key.white", { type: "button", "data-m": m, "aria-label": T.name(m), tabindex: -1 },
        h("span.kl"), h("span.mk"));
      k.style.setProperty("--i", i);
      el.append(k); keyEls.set(m, k);
      if (m + 1 <= to && T.isBlack(m + 1)) {
        const b = h("button.key.black", { type: "button", "data-m": m + 1, "aria-label": T.name(m + 1), tabindex: -1 }, h("span.kl"), h("span.mk"));
        b.style.setProperty("--i", i + 1);
        el.append(b); keyEls.set(m + 1, b);
      }
    });
    container.append(el);

    // etiketler: "c" = yalnız Do'lar, "all" = tüm beyazlar, "none"
    function setLabels(mode) {
      keyEls.forEach((k, m) => {
        const show = mode === "all" ? !T.isBlack(m) : mode === "c" ? T.pcOf(m) === 0 : false;
        // solfej adının altında küçük harfle uluslararası adı: Do4 / C4
        const kl = k.querySelector(".kl");
        kl.textContent = "";
        if (show) kl.append(T.name(m, { octave: mode === "c" }), h("small", T.letter(m, { octave: mode === "c" })));
      });
    }
    setLabels(labels);

    const held = new Map();
    function press(m, { silent = false, dur = 0.9, vel = 1 } = {}) {
      const k = keyEls.get(m); if (!k) return;
      k.classList.add("down");
      setTimeout(() => k.classList.remove("down"), 180);
      if (sound && !silent) Snd.pluck(T.mtof(m), { gain: 0.3 * vel, dur });
      onplay && onplay(m);
    }
    // işaretçi: basılı tutarak tuşlar üzerinde gezinme (glissando)
    let down = false, lastM = null;
    function keyAt(e) {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      const k = t && t.closest && t.closest(".key");
      return k && el.contains(k) ? +k.dataset.m : null;
    }
    el.addEventListener("pointerdown", (e) => {
      const m = keyAt(e); if (m == null) return;
      e.preventDefault();
      down = true; lastM = m; press(m);
    });
    el.addEventListener("pointermove", (e) => {
      if (!down) return;
      const m = keyAt(e);
      if (m != null && m !== lastM) { lastM = m; press(m, { dur: 0.5 }); }
    });
    window.addEventListener("pointerup", () => { down = false; lastM = null; });
    // ekran okuyucu / klavye ile tıklama (pointer olmadan gelen click)
    el.addEventListener("click", (e) => {
      if (e.detail !== 0) return;
      const k = e.target.closest(".key"); if (k) press(+k.dataset.m);
    });

    // bilgisayar klavyesi: ilk Do'dan başlar
    const kbBase = whites.find((m) => T.pcOf(m) === 0) ?? whites[0];
    const baseIdx = whites.indexOf(kbBase);
    function onKey(e) {
      if (!keys || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!el.closest(".slide.active")) return;
      if (e.target.matches && e.target.matches("input[type=text], textarea")) return;
      const k = e.key.toLowerCase();
      let m = null;
      const wi = KB_WHITE.indexOf(k);
      if (wi >= 0) m = whites[baseIdx + wi];
      else if (k in KB_BLACK) { const w = whites[baseIdx + KB_BLACK[k]]; if (w != null && T.isBlack(w + 1)) m = w + 1; }
      if (m == null || !keyEls.has(m)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (held.has(k)) return;
      held.set(k, m); press(m);
    }
    function onKeyUp(e) { held.delete(e.key.toLowerCase()); }
    instances.push({ onKey, onKeyUp });

    function mark(m, cls, label) {
      const k = keyEls.get(m); if (!k) return;
      k.className = k.className.replace(/\bm-\w+/g, "").trim();
      if (cls) k.classList.add("m-" + cls);
      k.querySelector(".mk").textContent = label || "";
    }
    function clear() { keyEls.forEach((k, m) => mark(m, null, "")); }
    // tuşun yatay merkezi (üst üste çizimler için, kaba göre 0..1)
    function centerOf(m) {
      const k = keyEls.get(m); if (!k) return null;
      const r = k.getBoundingClientRect(), p = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - p.left, y: r.top - p.top, w: r.width, h: r.height };
    }
    // MIDI klavye: tuş basılı tutulduğu sürece aşağıda kalsın
    function hold(m, on) { const k = keyEls.get(m); if (k) k.classList.toggle("held", on); }
    const api = { el, mark, clear, press, hold, keyEl: (m) => keyEls.get(m), centerOf, setLabels, whites, from, to };
    all.push(api);
    return api;
  }
  // bir slayttaki piyanolar
  Piano.inSlide = (slide) => all.filter((p) => slide && slide.contains(p.el));
  window.Piano = Piano;
})();
