/* Slayt motoru: gezinme, porte biçimli ilerleme çubuğu, notlar, genel bakış, demo yaşam döngüsü */
(function () {
  const { h } = L;
  const CHAPTERS = [
    "Giriş",
    "Ses nedir?",
    "Oranlar ve akort",
    "Gamlar ve modlar",
    "Akorlar ve armoni",
    "Ritim ve zaman",
    "Hepsi bir arada",
  ];

  const slides = [...document.querySelectorAll(".slide")];
  const deck = document.getElementById("deck");
  const notesEl = document.getElementById("notes");
  const overview = document.getElementById("overview");
  const progress = document.getElementById("progress");
  const counter = document.querySelector("#bar .counter");
  const chapterName = document.querySelector("#bar .chapter-name");
  const instances = new Map();
  let cur = -1;
  const seen = new Set();
  // sol anahtarı (Wikimedia Commons "GClef.svg", kamu malı). Kıvrımın merkezi alttan ikinci çizgiye
  // (Sol çizgisi) oturur: şekil 7 çizgi aralığı boyundadır, üst çizgi tepeden %19,8 aşağıdadır (bkz. style.css).
  const CLEF = '<svg viewBox="0 0 15.186 40.768"><path fill="currentColor" d="m12.049 3.5296c0.305 3.1263-2.019 5.6563-4.0772 7.7014-0.9349 0.897-0.155 0.148-0.6437 0.594-0.1022-0.479-0.2986-1.731-0.2802-2.11 0.1304-2.6939 2.3198-6.5875 4.2381-8.0236 0.309 0.5767 0.563 0.6231 0.763 1.8382zm0.651 16.142c-1.232-0.906-2.85-1.144-4.3336-0.885-0.1913-1.255-0.3827-2.51-0.574-3.764 2.3506-2.329 4.9066-5.0322 5.0406-8.5394 0.059-2.232-0.276-4.6714-1.678-6.4836-1.7004 0.12823-2.8995 2.156-3.8019 3.4165-1.4889 2.6705-1.1414 5.9169-0.57 8.7965-0.8094 0.952-1.9296 1.743-2.7274 2.734-2.3561 2.308-4.4085 5.43-4.0046 8.878 0.18332 3.334 2.5894 6.434 5.8702 7.227 1.2457 0.315 2.5639 0.346 3.8241 0.099 0.2199 2.25 1.0266 4.629 0.0925 6.813-0.7007 1.598-2.7875 3.004-4.3325 2.192-0.5994-0.316-0.1137-0.051-0.478-0.252 1.0698-0.257 1.9996-1.036 2.26-1.565 0.8378-1.464-0.3998-3.639-2.1554-3.358-2.262 0.046-3.1904 3.14-1.7356 4.685 1.3468 1.52 3.833 1.312 5.4301 0.318 1.8125-1.18 2.0395-3.544 1.8325-5.562-0.07-0.678-0.403-2.67-0.444-3.387 0.697-0.249 0.209-0.059 1.193-0.449 2.66-1.053 4.357-4.259 3.594-7.122-0.318-1.469-1.044-2.914-2.302-3.792zm0.561 5.757c0.214 1.991-1.053 4.321-3.079 4.96-0.136-0.795-0.172-1.011-0.2626-1.475-0.4822-2.46-0.744-4.987-1.116-7.481 1.6246-0.168 3.4576 0.543 4.0226 2.184 0.244 0.577 0.343 1.197 0.435 1.812zm-5.1486 5.196c-2.5441 0.141-4.9995-1.595-5.6343-4.081-0.749-2.153-0.5283-4.63 0.8207-6.504 1.1151-1.702 2.6065-3.105 4.0286-4.543 0.183 1.127 0.366 2.254 0.549 3.382-2.9906 0.782-5.0046 4.725-3.215 7.451 0.5324 0.764 1.9765 2.223 2.7655 1.634-1.102-0.683-2.0033-1.859-1.8095-3.227-0.0821-1.282 1.3699-2.911 2.6513-3.198 0.4384 2.869 0.9413 6.073 1.3797 8.943-0.5054 0.1-1.0211 0.143-1.536 0.143z"/></svg>';


  // Slayt kimlikleri ve bölüm etiketleri
  slides.forEach((s, i) => {
    if (!s.id) s.id = "s" + (i + 1);
    const ch = +s.dataset.chapter || 0;
    const text = s.querySelector(".text");
    if (text && ch > 0 && !text.querySelector(".chapter-tag")) {
      text.prepend(h("p.chapter-tag", h("b", String(ch)), CHAPTERS[ch]));
    }
  });

  // İlerleme çubuğu bir porte: her slayt bir nota başı, bölümler ölçü çizgileriyle ayrılır.
  // Her bölümde notalar porte üzerinde basamak basamak yükselen bir ezgi çizer (--p: 0 = alt çizgi, 8 = üst çizgi).
  const dots = [];
  progress.append(h("span.clef", { "aria-hidden": "true", html: CLEF }));
  CHAPTERS.forEach((name, ci) => {
    const members = slides.map((s, i) => [s, i]).filter(([s]) => (+s.dataset.chapter || 0) === ci);
    if (!members.length) return;
    const grp = h("div.ch", { style: { "--n": members.length }, title: name });
    members.forEach(([s, i], k) => {
      const p = members.length === 1 ? 4 : Math.round(1 + (k * 6) / (members.length - 1));
      const d = h("button.dot", { type: "button", style: { "--p": p }, "aria-label": `${i + 1}. slayt: ${title(s)}`, title: title(s), onclick: () => go(i) });
      dots[i] = d; grp.append(d);
    });
    progress.append(grp);
  });

  function title(s) {
    return s.dataset.title || (s.querySelector("h1,h2") || {}).textContent || "";
  }

  // Genel bakış
  function buildOverview() {
    const body = h("div");
    body.append(h("h2", "Tüm slaytlar"));
    CHAPTERS.forEach((name, ci) => {
      const items = slides.map((s, i) => [s, i]).filter(([s]) => (+s.dataset.chapter || 0) === ci);
      if (!items.length) return;
      body.append(h("div.ov-ch",
        h("h3", (ci ? ci + ". " : "") + name),
        h("div.ov-list", items.map(([s, i]) =>
          h("button.ov-item", { type: "button", "data-i": i, onclick: () => { toggleOverview(false); go(i); } },
            h("span", String(i + 1)), title(s))))));
    });
    body.append(h("p.keys", { html:
      "Kısayollar: <kbd>→</kbd> / <kbd>Boşluk</kbd> ileri · <kbd>←</kbd> geri · <kbd>N</kbd> sunucu notları · " +
      "<kbd>T</kbd> metni gizle (sunum) · <kbd>A</kbd> sesli anlatım · <kbd>G</kbd> deney gösterimleri · <kbd>M</kbd> sesi kapat · <kbd>O</kbd> bu ekran · <kbd>F</kbd> tam ekran. " +
      "Piyanolu slaytlarda <kbd>A</kbd>–<kbd>L</kbd> tuşları beyaz, <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd> <kbd>U</kbd> tuşları siyah tuşları çalar." }));
    overview.append(body);
  }
  buildOverview();

  function toggleOverview(force) {
    const open = force ?? !overview.classList.contains("open");
    overview.classList.toggle("open", open);
    overview.querySelectorAll(".ov-item").forEach((b) => b.classList.toggle("cur", +b.dataset.i === cur));
    document.getElementById("btn-overview").classList.toggle("on", open);
    if (open) (overview.querySelector(".ov-item.cur") || overview.querySelector(".ov-item")).focus();
  }

  function renderNotes() {
    const s = slides[cur];
    const n = s.querySelector("aside.notes");
    notesEl.innerHTML = "";
    notesEl.append(h("h4", `Sunucu notu · ${cur + 1}/${slides.length}`));
    if (n) notesEl.insertAdjacentHTML("beforeend", n.innerHTML);
    else notesEl.append(h("p", "Bu slayt için not yok."));
  }

  function instance(i) {
    const s = slides[i];
    if (!s) return null;
    const name = s.dataset.demo;
    if (!name) return null;
    if (!instances.has(i)) {
      const fn = window.Demos[name];
      if (!fn) { console.warn("Demo bulunamadı:", name); instances.set(i, null); return null; }
      try {
        instances.set(i, fn(s.querySelector(".stage") || s, s) || {});
      } catch (e) { console.error(name, e); instances.set(i, null); }
    }
    return instances.get(i);
  }

  function go(i, fromHash) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur) return;
    const prev = cur;
    if (prev >= 0) {
      const inst = instances.get(prev);
      inst && inst.leave && inst.leave();
    }
    cur = i;
    slides.forEach((s, k) => {
      s.classList.toggle("active", k === i);
      s.classList.toggle("before", k < i);
      s.setAttribute("aria-hidden", k === i ? "false" : "true");
      if ("inert" in s) s.inert = k !== i;
    });
    seen.add(i);
    dots.forEach((d, k) => { if (!d) return; d.classList.toggle("cur", k === i); d.classList.toggle("seen", seen.has(k) && k !== i); });
    const ch = +slides[i].dataset.chapter || 0;
    chapterName.innerHTML = "";
    chapterName.append(ch ? h("b", `${ch}. `) : "", CHAPTERS[ch]);
    counter.textContent = `${i + 1} / ${slides.length}`;
    if (!fromHash) history.replaceState(null, "", "#" + slides[i].id);
    renderNotes();
    window.dispatchEvent(new CustomEvent("slidechange", { detail: { index: i, id: slides[i].id, last: i === slides.length - 1 } }));
    const inst = instance(i);
    inst && inst.enter && requestAnimationFrame(() => inst.enter());
    // sonraki slaytın demosunu önceden hazırla
    setTimeout(() => instance(i + 1), 400);
    if (window.innerWidth <= 860) window.scrollTo(0, 0);
    document.body.dataset.slide = slides[i].id;
  }

  const next = () => go(cur + 1);
  const prev = () => go(cur - 1);
  document.getElementById("btn-next").addEventListener("click", next);
  document.getElementById("btn-prev").addEventListener("click", prev);
  document.getElementById("btn-overview").addEventListener("click", () => toggleOverview());
  const btnNotes = document.getElementById("btn-notes");
  function toggleNotes() { notesEl.classList.toggle("open"); btnNotes.classList.toggle("on", notesEl.classList.contains("open")); }
  btnNotes.addEventListener("click", toggleNotes);
  const btnText = document.getElementById("btn-text");
  function toggleText() { document.body.classList.toggle("text-hidden"); btnText.classList.toggle("on", document.body.classList.contains("text-hidden")); }
  btnText.addEventListener("click", toggleText);

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    const typing = t.matches && t.matches("input[type=text], textarea, [contenteditable], select");
    const onRange = t.matches && t.matches("input[type=range]");
    if (typing) return;
    if (overview.classList.contains("open")) {
      if (e.key === "Escape" || e.key === "o" || e.key === "O") { toggleOverview(false); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case "ArrowRight": case "PageDown":
        if (onRange) return; next(); e.preventDefault(); break;
      case " ":
        if (t.matches && t.matches("button, summary, a")) return;
        next(); e.preventDefault(); break;
      case "ArrowLeft": case "PageUp":
        if (onRange) return; prev(); e.preventDefault(); break;
      case "Home": go(0); break;
      case "End": go(slides.length - 1); break;
      case "n": case "N": toggleNotes(); break;
      case "o": case "O": toggleOverview(); break;
      case "t": case "T": toggleText(); break;
      case "m": case "M": Snd.setMuted(!Snd.muted); break;
      case "f": case "F":
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
        break;
    }
  });

  // Mobilde yatay kaydırma ile gezinme (tuval dışında)
  let tx = 0, ty = 0, tOk = false;
  deck.addEventListener("touchstart", (e) => {
    tOk = !e.target.closest("canvas, input, .seg, button, svg");
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  deck.addEventListener("touchend", (e) => {
    if (!tOk) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) (dx < 0 ? next : prev)();
  }, { passive: true });

  function fromHash() {
    const id = location.hash.slice(1);
    const i = slides.findIndex((s) => s.id === id);
    go(i >= 0 ? i : 0, true);
  }
  window.Deck = { go, next, prev, get current() { return cur; }, get id() { return slides[cur].id; }, get count() { return slides.length; } };
  window.addEventListener("hashchange", fromHash);
  fromHash();
})();

/* Alt çubuktaki ses düzeyi: sessize alma düğmesi ve kaydırıcı */
(function () {
  const btn = document.getElementById("btn-mute");
  const range = document.getElementById("vol");
  function render() {
    const m = Snd.muted || Snd.volume === 0;
    btn.classList.toggle("off", m);
    btn.setAttribute("aria-label", m ? "Sesi aç (M)" : "Sesi kapat (M)");
    btn.title = btn.getAttribute("aria-label");
    range.value = Snd.muted ? 0 : Snd.volume;
    range.style.setProperty("--v", (Snd.muted ? 0 : Snd.volume) * 100 + "%");
  }
  btn.addEventListener("click", () => { Snd.unlock(); Snd.setMuted(!Snd.muted); });
  range.addEventListener("input", () => { Snd.unlock(); Snd.setVolume(+range.value); if (+range.value === 0) Snd.setMuted(true); });
  Snd.onChange(render);
  render();
})();
