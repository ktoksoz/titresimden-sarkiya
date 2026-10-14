/* 3. bölüm (Gamlar ve modlar) demoları: aralıklar, majör gam, minör gamlar, modlar, pentatonik */
(function () {
  const { C, rgba, canvas, loop, h, seg, clamp, lerp, fmtNum } = L;
  const G = (window.GuideScenarios = window.GuideScenarios || {});
  const GT = (window.GuideTargets = window.GuideTargets || {});
  const SVGNS = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs = {}) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const noteName = (m, flats) => T.name(m, { flats, octave: false });
  const STEP_LABEL = { 1: "Y", 2: "T", 3: "A" };
  const STEP_COLOR = { 1: C.tension, 2: C.ink2, 3: C.wave };

  /* Piyano + üstünde adım köprüleri (T / Y / A) */
  function Board(parent, { from = 60, to = 84, onplay } = {}) {
    const wrap = h("div.sc-board");
    const bridges = svg("svg", { class: "sc-bridges", "aria-hidden": "true" });
    wrap.append(bridges);
    parent.append(wrap);
    const piano = Piano(wrap, { from, to, labels: "c", onplay });
    let notes = [], hi = -1, arcs = null, labels = STEP_LABEL;
    function draw() {
      while (bridges.firstChild) bridges.firstChild.remove();
      const W = piano.el.clientWidth, H = bridges.clientHeight || 64;
      if (!W) return;
      bridges.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const list = arcs || notes.slice(1).map((b, i) => [notes[i], b]);
      list.forEach(([a, b], i) => {
        const pa = piano.centerOf(a), pb = piano.centerOf(b);
        if (!pa || !pb) return;
        const d = Math.abs(b - a), col = STEP_COLOR[d] || C.comma;
        const x1 = pa.x + 2, x2 = pb.x - 2, mid = (x1 + x2) / 2;
        const top = H - 14 - Math.min(30, 10 + Math.abs(x2 - x1) * 0.35);
        const on = i === hi;
        bridges.append(svg("path", { d: `M${x1},${H - 2} Q${mid},${top} ${x2},${H - 2}`, fill: "none", stroke: col, "stroke-width": on ? 3 : 1.6, opacity: on ? 1 : 0.8, "stroke-linecap": "round" }));
        const t = svg("text", { x: mid, y: top + (H - 2 - top) * 0.5 - 2, "text-anchor": "middle", fill: col, class: "sc-step" + (on ? " on" : "") });
        t.textContent = labels[d] || T.interval(d).kisa;
        bridges.append(t);
      });
    }
    new ResizeObserver(draw).observe(piano.el);
    return {
      piano, el: wrap,
      setNotes(n, a, lab) { notes = n; arcs = a || null; labels = lab || STEP_LABEL; hi = -1; draw(); },
      highlight(i) { hi = i; draw(); },
      lit(m, ms = 300) { const k = piano.keyEl(m); if (!k) return; k.classList.add("lit"); setTimeout(() => k.classList.remove("lit"), ms); },
      draw,
    };
  }

  /* Nota dizisini sırayla çal; her notada tuşu yak. Ses kilitliyse yalnız görsel. */
  function player() {
    let timers = [];
    return {
      play(seq, { gap = 0.32, onstep, ondone } = {}) {
        this.stop();
        seq.forEach((s, i) => timers.push(setTimeout(() => onstep(s, i), i * gap * 1000)));
        timers.push(setTimeout(() => { ondone && ondone(); }, seq.length * gap * 1000 + 200));
      },
      stop() { timers.forEach(clearTimeout); timers = []; },
      get busy() { return timers.length > 0; },
    };
  }
  const isFlatKey = (m) => [5, 10, 3, 8, 1].includes(T.pcOf(m)); // Fa, Si♭, Mi♭, La♭, Re♭

  /* ---------- Aralıklar ---------- */
  Demos.intervals = (stage) => {
    const top = h("div.controls.top");
    const info = h("div.sc-info");
    const main = h("div.fill.sc-main", info);
    stage.append(top, main);
    let a = null, b = null, t2 = 0;
    const board = Board(main, { from: 60, to: 84, onplay: (m) => {
      if (a == null || b != null) { a = m; b = null; } else if (m !== a) { b = m; }
      render();
      if (b != null) { clearTimeout(t2); t2 = setTimeout(() => Snd.chord([T.mtof(a), T.mtof(b)], { gain: 0.3, dur: 1.4 }), 520); }
    } });
    const chips = h("div.sc-chips", { role: "group", "aria-label": "Aralık seç" });
    T.INTERVALS.slice(1).forEach((iv) => {
      chips.append(h("button.sc-chip", { type: "button", title: iv.ad, onclick: () => {
        a = a ?? 60; if (a + iv.s > 84) a = 60;
        b = a + iv.s; render();
        const p = board.piano; clearTimeout(t2);
        p.press(a); setTimeout(() => p.press(b), 450);
        t2 = setTimeout(() => Snd.chord([T.mtof(a), T.mtof(b)], { gain: 0.3, dur: 1.4 }), 1000);
      } }, iv.kisa));
    });
    top.append(h("span.sc-lab", "Aralık seç:"), chips);
    function render() {
      board.piano.clear();
      info.innerHTML = "";
      if (a == null) {
        info.append(h("p.sc-big", "Bir tuşa basın"), h("p.sc-sub", "Sonra ikinci tuşa basın; aradaki mesafeyi ölçelim."));
        board.setNotes([]); return;
      }
      board.piano.mark(a, "tonic", noteName(a));
      if (b == null) {
        info.append(h("p.sc-big", noteName(a), h("small.sc-let", T.toLetter(noteName(a)))), h("p.sc-sub", "Şimdi ikinci tuşa basın."));
        board.setNotes([]); return;
      }
      const s = Math.abs(b - a), iv = T.interval(s);
      const tri = s % 12 === 6;
      board.piano.mark(b, tri ? "tension" : "wave", noteName(b));
      const lo = Math.min(a, b), hi = Math.max(a, b);
      board.setNotes([lo, hi]);
      const ratio = iv.oran[0] / iv.oran[1] * (s > 12 ? 2 : 1);
      info.append(
        h("p.sc-big" + (tri ? ".c-tension" : ""), iv.ad),
        h("div.sc-facts",
          h("div", h("b", String(s)), h("span", "yarım ses")),
          h("div", h("b", `${iv.oran[0] * (s > 12 ? 2 : 1)}:${iv.oran[1]}`), h("span", "saf oran")),
          h("div", h("b", fmtNum(s * 100) + " c"), h("span", "eşit tamperaman")),
          h("div", h("b.c-comma", fmtNum(T.cents(ratio), 1) + " c"), h("span", "saf aralık"))),
        h("p.sc-sub", `${noteName(a)} → ${noteName(b)} (${T.toLetter(noteName(a))} → ${T.toLetter(noteName(b))})` + (tri ? " · triton: oktavın tam ortası" : "")));
      chips.querySelectorAll(".sc-chip").forEach((c, i) => c.classList.toggle("on", i + 1 === s));
    }
    render();
    return { enter() { board.draw(); }, leave() { clearTimeout(t2); } };
  };
  G.araliklar = [{ click: 'css:.key[data-m="60"]' }, { wait: 600 }, { click: 'css:.key[data-m="67"]' }];

  /* ---------- Majör gam ---------- */
  Demos.majorscale = (stage) => {
    const STARTS = [[60, "Do"], [67, "Sol"], [62, "Re"], [69, "La"], [65, "Fa"], [70, "Si♭"], [63, "Mi♭"]];
    let tonic = 60;
    const top = h("div.controls.top");
    const info = h("div.sc-info");
    const main = h("div.fill.sc-main", info);
    stage.append(top, main);
    const board = Board(main, { from: 60, to: 84 });
    const pl = player();
    const playBtn = h("button.btn.primary", { type: "button", onclick: play }, "Gamı çal");
    top.append(h("span.sc-lab", "Başlangıç:"), seg(STARTS.map(([m, n]) => [m, n]), tonic, (m) => { tonic = m; pl.stop(); render(); play(); }, "Başlangıç notası"), h("span.spacer"), playBtn);
    function notes() { return T.scaleNotes(tonic, T.SCALES.major.steps); }
    function render() {
      const n = notes(), flats = isFlatKey(tonic);
      board.piano.clear();
      for (let m = 60; m <= 84; m++) if (!n.includes(m)) board.piano.mark(m, "dim");
      n.forEach((m, i) => board.piano.mark(m, i % 7 === 0 ? "tonic" : i === 6 ? "tension" : "in", noteName(m, flats)));
      board.setNotes(n);
      const acc = n.slice(0, 7).filter((m) => T.isBlack(m));
      info.innerHTML = "";
      info.append(
        h("p.sc-big", noteName(tonic, flats) + " majör", h("small.sc-let", T.toLetter(noteName(tonic, flats)))),
        h("p.sc-pattern", T.SCALES.major.steps.map((s) => h("span" + (s === 1 ? ".c-tension" : ""), STEP_LABEL[s]))),
        h("p.sc-sub", acc.length ? `Deseni korumak için ${acc.length} siyah tuş gerekiyor: ${acc.map((m) => noteName(m, flats)).join(", ")}` : "Yalnız beyaz tuşlar: hiç diyez ya da bemol yok."),
        h("p.sc-legend", h("i.c-tonic", "■"), " tonik  ", h("i.c-tension", "■"), " yeden (7.)  ", h("i.c-tension", "Y"), " yarım ses  ", h("i", "T"), " tam ses"));
    }
    function play() {
      const n = notes();
      pl.play(n, { onstep: (m, i) => { board.piano.press(m, { dur: 0.5 }); board.lit(m, 320); board.highlight(i - 1); }, ondone: () => board.highlight(-1) });
    }
    render();
    return { enter() { board.draw(); }, leave() { pl.stop(); board.highlight(-1); } };
  };
  G["major-gam"] = [{ click: "Sol" }, { wait: 3200 }, { click: "Gamı çal" }];

  /* ---------- Minör gamlar ---------- */
  Demos.minor = (stage) => {
    const TONIC = 69;
    let kind = "natural";
    const top = h("div.controls.top");
    const info = h("div.sc-info");
    const main = h("div.fill.sc-main", info);
    stage.append(top, main);
    const board = Board(main, { from: 60, to: 84 });
    const pl = player();
    top.append(seg([["natural", "Doğal"], ["harmonic", "Armonik"], ["melodic", "Melodik"]], kind, (k) => { kind = k; pl.stop(); render(); play(); }, "Minör türü"),
      h("span.spacer"), h("button.btn.primary", { type: "button", onclick: () => play() }, "Gamı çal"));
    const NOTES = { natural: "Üçüncü, altıncı ve yedinci dereceler majöre göre yarım ses pes.", harmonic: "Yedinci derece yükseldi: toniğe çekilen bir yeden. 6. ile 7. arasında artık ikili (A) açıldı.", melodic: "Çıkarken 6. ve 7. dereceler yükselir; inerken doğal minöre dönülür." };
    function scale(k) { return T.scaleNotes(TONIC, T.SCALES[k].steps); }
    function render(desc) {
      const n = desc ? scale("natural") : scale(kind);
      const nat = scale("natural");
      board.piano.clear();
      for (let m = 60; m <= 84; m++) if (!n.includes(m)) board.piano.mark(m, "dim");
      n.forEach((m, i) => {
        let cls = i % 7 === 0 ? "tonic" : "in";
        let lab = noteName(m);
        if (!nat.includes(m)) { cls = i === 6 ? "tension" : "wave"; lab += "↑"; }
        board.piano.mark(m, cls, lab);
      });
      board.setNotes(n);
      const steps = desc ? T.SCALES.natural.steps : T.SCALES[kind].steps;
      info.innerHTML = "";
      info.append(
        h("p.sc-big", "La " + T.SCALES[kind].ad.toLocaleLowerCase("tr") + (desc ? " · iniş" : "")),
        h("p.sc-pattern", steps.map((s) => h("span" + (s === 1 ? ".c-tension" : s === 3 ? ".c-wave" : ""), STEP_LABEL[s]))),
        h("p.sc-sub", NOTES[kind]),
        h("p.sc-legend", h("i.c-tonic", "■"), " tonik  ", h("i.c-tension", "■"), " yükseltilmiş 7. (yeden)  ", h("i.c-wave", "■"), " yükseltilmiş 6.  ", h("i.c-wave", "A"), " artık ikili"));
    }
    function play() {
      const up = scale(kind), down = scale("natural").slice().reverse().slice(1);
      const seq = up.concat(down);
      pl.play(seq, { gap: 0.3,
        onstep: (m, i) => {
          if (i === up.length && kind === "melodic") render(true);
          board.piano.press(m, { dur: 0.45 }); board.lit(m, 300);
          board.highlight(i < up.length ? i - 1 : 6 - (i - up.length));
        },
        ondone: () => { render(); } });
    }
    render();
    return { enter() { board.draw(); }, leave() { pl.stop(); render(); } };
  };
  G.minor = [{ click: "Armonik" }, { wait: 4600 }, { click: "Melodik" }];

  /* ---------- Modlar: döner disk ---------- */
  Demos.modes = (stage) => {
    const WHITE = [0, 2, 4, 5, 7, 9, 11];
    const NAMES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];
    // her modun karakteristik derecesi (0 tabanlı) ve gerilim taşıyıp taşımadığı
    const CHAR = [[6, true], [5, false], [1, true], [3, true], [6, false], [5, false], [4, true]];
    let k = 0, angle = 0, target = 0;
    const top = h("div.controls.top");
    const info = h("div.sc-info.sc-modeinfo");
    const disk = svg("svg", { class: "sc-disk", viewBox: "-130 -130 260 260", role: "img", "aria-label": "Mod diski: sürükleyerek çevirin" });
    const diskWrap = h("div.sc-diskwrap", disk);
    const row = h("div.sc-moderow", diskWrap, info);
    const main = h("div.fill.sc-main", row);
    stage.append(top, main);
    const board = Board(main, { from: 60, to: 84 });
    const pl = player();
    const modeSeg = seg(T.MODES.map((m, i) => [i, m.ad]), 0, (i) => setMode(i), "Mod");
    top.append(h("button.btn.primary", { type: "button", onclick: () => setMode((k + 1) % 7) }, "Modu çevir"), modeSeg,
      h("span.spacer"), h("button.btn", { type: "button", onclick: () => play() }, "Çal"));
    function setMode(i, noPlay) {
      k = i; target = -k * (360 / 7);
      // en kısa yönden dön
      while (target - angle > 180) target -= 360;
      while (target - angle < -180) target += 360;
      modeSeg.set(k); render(); if (!noPlay) play();
      anim();
    }
    let raf = 0;
    function anim() {
      cancelAnimationFrame(raf);
      (function step() {
        angle += (target - angle) * 0.18;
        if (Math.abs(target - angle) < 0.05) angle = target;
        drawDisk();
        if (angle !== target) raf = requestAnimationFrame(step);
      })();
    }
    function notes() { const tonic = 60 + WHITE[k]; return T.scaleNotes(tonic, T.modeSteps(k)); }
    function drawDisk() {
      while (disk.firstChild) disk.firstChild.remove();
      const R = 92;
      disk.append(svg("circle", { r: 118, fill: "rgba(30,14,11,.55)", stroke: C.line, "stroke-width": 1 }));
      disk.append(svg("circle", { r: 64, fill: "none", stroke: rgba(C.ink, 0.12), "stroke-dasharray": "2 4" }));
      const [ci, ct] = CHAR[k];
      const a = (i) => ((i * 360) / 7 + angle - 90) * Math.PI / 180;
      // adım etiketleri (komşu notalar arasında)
      for (let i = 0; i < 7; i++) {
        const st = (WHITE[(i + 1) % 7] - WHITE[i] + 12) % 12;
        const mid = (a(i) + a(i + 1)) / 2;
        const t = svg("text", { x: Math.cos(mid) * 66, y: Math.sin(mid) * 66 + 4, "text-anchor": "middle", class: "sc-dstep", fill: st === 1 ? C.tension : C.ink2 });
        t.textContent = STEP_LABEL[st]; disk.append(t);
      }
      for (let i = 0; i < 7; i++) {
        const x = Math.cos(a(i)) * R, y = Math.sin(a(i)) * R;
        const deg = (i - k + 7) % 7;
        const col = deg === 0 ? C.tonic : deg === ci ? (ct ? C.tension : C.wave) : C.ink;
        disk.append(svg("circle", { cx: x, cy: y, r: deg === 0 ? 21 : 17, fill: deg === 0 ? rgba(C.tonic, 0.18) : "rgba(43,23,20,.9)", stroke: col, "stroke-width": deg === 0 || deg === ci ? 2.2 : 1 }));
        const t = svg("text", { x, y: y + 5, "text-anchor": "middle", class: "sc-dnote", fill: col });
        t.textContent = NAMES[i]; disk.append(t);
      }
      // üstteki işaret: başlangıç
      disk.append(svg("path", { d: "M-8,-126 L8,-126 L0,-113 Z", fill: C.tonic }));
      const c = svg("text", { x: 0, y: 6, "text-anchor": "middle", class: "sc-dcenter", fill: C.ink });
      c.textContent = T.MODES[k].ad; disk.append(c);
    }
    function render() {
      const n = notes(), m = T.MODES[k], [ci, ct] = CHAR[k];
      board.piano.clear();
      for (let x = 60; x <= 84; x++) if (!n.includes(x)) board.piano.mark(x, "dim");
      n.forEach((x, i) => board.piano.mark(x, i % 7 === 0 ? "tonic" : i === ci ? (ct ? "tension" : "wave") : "in", noteName(x)));
      board.setNotes(n);
      const charIv = T.interval(n[ci] - n[0]);
      info.innerHTML = "";
      info.append(
        h("p.sc-big", m.ad, m.alt ? h("small", m.alt) : null),
        h("p.sc-pattern", T.modeSteps(k).map((s) => h("span" + (s === 1 ? ".c-tension" : ""), STEP_LABEL[s]))),
        h("p.sc-sub", `${NAMES[k]}'dan ${NAMES[k]}'ya beyaz tuşlar. Karakter: ${m.his}.`),
        h("p.sc-char", "Ayırt edici nota: ", h("b" + (ct ? ".c-tension" : ".c-wave"), `${noteName(n[ci])} (${T.toLetter(noteName(n[ci]))})`), `, ${charIv.ad.toLocaleLowerCase("tr")}`));
    }
    function play() {
      const n = notes();
      pl.play(n.concat([n[4], n[2], n[0]]), { gap: 0.28, onstep: (m, i) => { board.piano.press(m, { dur: 0.45 }); board.lit(m, 280); board.highlight(i < 8 ? i - 1 : -1); }, ondone: () => board.highlight(-1) });
    }
    // sürükleyerek çevirme
    let drag = null;
    const ang = (e) => { const r = disk.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
    disk.addEventListener("pointerdown", (e) => { drag = { a0: ang(e), base: angle }; disk.setPointerCapture(e.pointerId); cancelAnimationFrame(raf); e.preventDefault(); });
    disk.addEventListener("pointermove", (e) => {
      if (!drag) return;
      let d = ang(e) - drag.a0; angle = drag.base + d; target = angle; drawDisk();
    });
    const end = () => {
      if (!drag) return; drag = null;
      const i = ((Math.round(-angle / (360 / 7)) % 7) + 7) % 7;
      if (i !== k) setMode(i); else { target = -k * (360 / 7); while (target - angle > 180) target -= 360; while (target - angle < -180) target += 360; anim(); }
    };
    disk.addEventListener("pointerup", end);
    disk.addEventListener("pointercancel", end);
    drawDisk(); render();
    return { enter() { board.draw(); drawDisk(); }, leave() { pl.stop(); cancelAnimationFrame(raf); } };
  };
  G.modlar = [{ click: "Modu çevir" }, { wait: 3200 }, { click: "Modu çevir" }];

  /* ---------- Pentatonik ---------- */
  Demos.pentatonic = (stage) => {
    // Siyah tuşlar: Fa♯ majör pentatonik = Mi♭ minör pentatonik (aynı beş nota)
    const PENTA = []; for (let m = 61; m <= 82; m++) if (T.isBlack(m)) PENTA.push(m);
    const top = h("div.controls.top");
    const form = h("div.pt-form", { "aria-label": "12 ölçülük blues kalıbı" });
    const trailWrap = h("div.sc-trail");
    const cv = h("canvas", { "aria-label": "Çalınan notaların izi" });
    trailWrap.append(cv);
    const main = h("div.fill.sc-main", form, trailWrap);
    stage.append(top, main);
    const trail = []; // {m, t}
    let st, now = 0, mode = "blues";
    const tonicPc = () => (mode === "blues" ? 3 : 6);  // blues: Mi♭, serbest: Fa♯
    const board = Board(main, { from: 60, to: 84, onplay: (m) => trail.push({ m, t: now, black: T.isBlack(m) }) });
    function markKeys() {
      for (let m = 60; m <= 84; m++) board.piano.mark(m, T.isBlack(m) ? (T.pcOf(m) === tonicPc() ? "tonic" : "in") : "dim", T.isBlack(m) ? noteName(m, mode === "blues") : "");
      board.setNotes(mode === "blues" ? [63, 66, 68, 70, 73, 75] : [66, 68, 70, 73, 75, 78], null, { 2: "T", 3: "k3" });
    }

    /* ---- 12 ölçülük blues, Mi♭'de: Mi♭7 La♭7 Si♭7; sallantılı (shuffle) sekizlikler ---- */
    const BPM = 92;
    const FORM = [0, 0, 0, 0, 1, 1, 0, 0, 2, 1, 0, 2];          // I I I I IV IV I I V IV I V
    const CH = [{ root: 51, ad: "Mi♭7", let: "E♭7", rn: "I7", fn: "tonic" }, { root: 56, ad: "La♭7", let: "A♭7", rn: "IV7", fn: "sub" }, { root: 46, ad: "Si♭7", let: "B♭7", rn: "V7", fn: "dom" }];
    // akora göre hedef notalar (siyah tuşlardan): Mi♭7 → Mi♭ Sol♭ Si♭, La♭7 → La♭ Mi♭ Sol♭, Si♭7 → Si♭ Re♭ La♭
    const TARGET = [[3, 6, 10], [8, 3, 6], [10, 1, 8]];
    const cells = FORM.map((c, b) => h("span.pt-bar.f-" + CH[c].fn, { "data-b": b }, h("b", CH[c].rn), h("small", CH[c].ad)));
    form.append(...cells);
    // adım = üçleme sekizliği (vuruşun üçte biri); ölçü = 12 adım
    let idx = 4, hold = 0, rest = 0, plan = null;
    function chooseNote(bar, strong) {
      const tg = TARGET[FORM[bar % 12]];
      if (strong && Math.random() < 0.6) {
        // güçlü zamanda yakındaki bir akor notasına yaslan (aynı notayı üst üste tekrarlamadan)
        const near = PENTA.map((m, k) => k).filter((k) => PENTA[k] >= 63 && PENTA[k] <= 80 && tg.includes(T.pcOf(PENTA[k])) && Math.abs(k - idx) <= 3 && k !== idx);
        if (near.length) idx = near[Math.floor(Math.random() * near.length)];
      } else {
        idx = clamp(idx + [-1, -1, 1, 1, -2, 2, 0, -1][Math.floor(Math.random() * 8)], 1, PENTA.length - 2);
      }
      return PENTA[idx];
    }
    function bluesStep(i, t) {
      const bar = Math.floor(i / 12), s = i % 12, beat = Math.floor(s / 3), sub = s % 3;
      const chord = CH[FORM[bar % 12]];
      if (bar >= 24) { tr.stop(); syncBtn(); return; }          // iki tur (24 ölçü) sonra durur
      if (s === 0) visual(t, () => cells.forEach((c, k) => c.classList.toggle("on", k === bar % 12)));
      // davul: vuruşta ve sallantılı "ve"de hi-hat; 1–3 bas davul, 2–4 trampet
      if (sub === 0 || sub === 2) Snd.drum("hat", t, sub === 0 ? 0.55 : 0.35);
      if (sub === 0 && (beat === 0 || beat === 2)) Snd.drum("kick", t, 0.9);
      if (sub === 2 && beat === 1) Snd.drum("kick", t, 0.45);
      if (sub === 0 && (beat === 1 || beat === 3)) Snd.drum("snare", t, 0.6);
      // boogie bas: kök, üçlü, beşli, altılı, küçük yedili, altılı, beşli, üçlü (sallantılı sekizlikler)
      if (sub === 0 || sub === 2) {
        const k = beat * 2 + (sub === 2 ? 1 : 0);
        // bas, küçük hoparlörlerde de duyulsun diye Si♭2–La♭3 bölgesinde (117–208 Hz kök)
        Snd.note(T.mtof(chord.root + [0, 4, 7, 9, 10, 9, 7, 4][k]), { type: "triangle", dur: sub === 0 ? 0.24 : 0.12, gain: 0.32, attack: 0.005, release: 0.08, when: t, cutoff: 900 });
      }
      // akor vurgusu: 2. ve 4. vuruşun "ve"sinde kısa dominant yedili (3. ve küçük 7.)
      if (sub === 2 && (beat === 1 || beat === 3)) [4, 10, 14].forEach((iv) => Snd.note(T.mtof(chord.root + iv), { amps: [1, 0.4, 0.2], dur: 0.1, gain: 0.08, attack: 0.004, release: 0.1, when: t }));
      // melodi: iki ölçülük soru–cevap; ilk ölçü konuşur, ikinci ölçü akor notasına iner ve susar
      if (sub === 1) return;                                     // sallantılı sekizlikler yalnız 0 ve 2. adımlarda
      if (hold > 0) { hold--; return; }
      const answer = bar % 2 === 1;
      if (answer) {
        // cevap ölçüsü: akor notasına in, uzat; son vuruşta bir sonraki cümleye küçük bir giriş
        if (s === 0) { playMel(chooseNote(bar, true), t, 1.1); hold = 3; }
        else if (beat === 3 && Math.random() < 0.6) playMel(chooseNote(bar, false), t, 0.2);
        return;
      }
      const p = beat === 0 && sub === 0 ? 0.95 : sub === 0 ? 0.85 : 0.65;
      if (Math.random() > p) return;
      const m = chooseNote(bar, sub === 0);
      const long = Math.random() < 0.18;
      playMel(m, t, long ? 0.55 : 0.22);
      if (long) hold = 1;
    }
    function playMel(m, t, dur) {
      Snd.pluck(T.mtof(m), { when: t, dur, gain: 0.3 });
      visual(t, () => { board.piano.press(m, { silent: true }); board.lit(m, dur * 1000 + 120); trail.push({ m, t: now, black: true }); });
    }

    /* ---- serbest doğaçlama (eşliksiz) ---- */
    const RHY = [3, 3, 3, 2, 2, 6, 4];                           // adım cinsinden süreler
    let wait = 0, count = 0;
    function freeStep(i, t) {
      if (wait > 0) { wait--; return; }
      count++;
      if (count > 40) { tr.stop(); syncBtn(); return; }
      idx = clamp(idx + [-1, -1, 1, 1, 0, -2, 2, 1, -1][Math.floor(Math.random() * 9)], 0, PENTA.length - 1);
      if (count % 8 === 0) idx = Math.random() < 0.5 ? PENTA.indexOf(66) : PENTA.indexOf(78);
      const r = count % 8 === 0 ? 6 : RHY[Math.floor(Math.random() * RHY.length)];
      wait = r - 1;
      playMel(PENTA[idx], t, 0.09 * r + 0.15);
    }

    const tr = Transport({ interval: () => 60 / BPM / 3, step: (i, t) => (mode === "blues" ? bluesStep(i, t) : freeStep(i, t)) });
    // görseli sesin çalacağı ana kaydır
    function visual(t, fn) {
      const nowT = Snd.running() ? Snd.now() : performance.now() / 1000;
      setTimeout(fn, Math.max(0, (t - nowT) * 1000));
    }
    const btn = h("button.btn.primary", { type: "button", onclick: () => { if (tr.on) { tr.stop(); } else { idx = 4; hold = 0; count = 0; wait = 0; tr.start(); } syncBtn(); } }, "Doğaçla");
    function syncBtn() {
      btn.textContent = tr.on ? "Durdur" : "Doğaçla";
      btn.classList.toggle("primary", !tr.on); btn.classList.toggle("on", tr.on);
      if (!tr.on) cells.forEach((c) => c.classList.remove("on"));
    }
    const lab = h("span.sc-lab");
    const modeSeg = seg([["blues", "Blues eşliği"], ["serbest", "Serbest"]], mode, (k) => {
      mode = k; form.classList.toggle("off", k !== "blues"); markKeys();
      lab.textContent = k === "blues" ? "Siyah tuşlar = Mi♭ minör pentatonik (E♭): Mi♭7, La♭7, Si♭7 üzerinde 12 ölçülük blues" : "Siyah tuşlar = Fa♯ majör pentatonik (F♯): Fa♯ – Sol♯ – La♯ – Do♯ – Re♯";
      if (tr.on) { tr.stop(); idx = 4; hold = 0; count = 0; tr.start(); syncBtn(); }
    }, "Doğaçlama türü");
    top.append(btn, modeSeg, h("span.spacer"), lab);
    lab.textContent = "Siyah tuşlar = Mi♭ minör pentatonik (E♭): Mi♭7, La♭7, Si♭7 üzerinde 12 ölçülük blues";
    markKeys();

    function draw(dt) {
      now += dt;
      if (!st) return;
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      const span = 6, lo = 60, hi = 84;
      L.staffLines(ctx, 0, hh * 0.3, w, hh * 0.1, "rgba(239,228,204,0.05)");
      while (trail.length && now - trail[0].t > span) trail.shift();
      let prev = null;
      trail.forEach((p) => {
        const x = w - 30 - ((now - p.t) / span) * (w - 40);
        const y = hh - 16 - ((p.m - lo) / (hi - lo)) * (hh - 32);
        const col = !p.black ? C.muted : T.pcOf(p.m) === tonicPc() ? C.tonic : C.wave;
        if (prev && p.t - prev.t < 1.2) { ctx.strokeStyle = rgba(C.wave, 0.25); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(x, y); ctx.stroke(); }
        const age = (now - p.t);
        ctx.save(); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = Math.max(0, 14 - age * 10);
        ctx.beginPath(); ctx.ellipse(x, y, 6, 4.6, -0.38, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        prev = { x, y, t: p.t };
      });
      if (!trail.length) L.text(ctx, "Siyah tuşlara basın ya da Doğaçla'ya dokunun", w / 2, hh / 2, { align: "center", color: C.muted, size: 14 });
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);
    return { enter() { board.draw(); lp.start(); }, leave() { tr.stop(); syncBtn(); lp.stop(); } };
  };
  G.pentatonik = [{ click: 'css:.key[data-m="63"]' }, { click: 'css:.key[data-m="66"]' }, { click: 'css:.key[data-m="70"]' }, { click: "Doğaçla" }];

  /* ---------- Notaların adları: C'den Do'ya ----------
     Aynı tuşun dört adlandırma sistemindeki adı. Guido d'Arezzo'nun ilahisinde her dizenin ilk
     hecesi bir basamak yukarıdan başlar: UT, RE, MI, FA, SOL, LA. */
  const SOLFEGE = T.SHARP;
  const LETTERS = T.LETTER;
  const GERMAN = ["C", "Cis", "D", "Dis", "E", "F", "Fis", "G", "Gis", "A", "B", "H"];
  // Türk müziği perde adları (Arel–Ezgi–Uzdilek yazımına göre portedeki yerleri; yalnız doğal perdeler)
  const PERDE = { 60: "Kaba çârgâh", 62: "Yegâh", 64: "Hüseynîaşîran", 65: "Acemaşîran", 67: "Rast", 69: "Dügâh", 71: "Bûselik",
    72: "Çârgâh", 74: "Nevâ", 76: "Hüseynî", 77: "Acem", 79: "Gerdaniye", 81: "Muhayyer", 83: "Tiz bûselik", 84: "Tiz çârgâh" };
  const HYMN = [["UT", " queant laxis", 60], ["RE", "sonare fibris", 62], ["MI", "ra gestorum", 64], ["FA", "muli tuorum", 65], ["SOL", "ve polluti", 67], ["LA", "bii reatum", 69], ["S", "ancte ", null, "I", "ohannes"]];

  Demos.notenames = (stage) => {
    let sys = "solfej", cur = 67, playing = false;
    const timersN = [];
    const names = (m) => {
      const pc = T.pcOf(m);
      return {
        solfej: T.name(m, { octave: false }) + (T.isBlack(m) ? " / " + T.name(m, { flats: true, octave: false }) : ""),
        harf: LETTERS[pc] + (T.isBlack(m) ? " / " + ["", "D♭", "", "E♭", "", "", "G♭", "", "A♭", "", "B♭", ""][pc] : ""),
        almanca: GERMAN[pc],
        perde: PERDE[m] || null,
      };
    };
    // üst kart: seçili tuşun bütün adları
    const big = h("div.nn-big");
    const rows = h("div.nn-rows");
    const card = h("div.nn-card", big, rows);
    const hymn = h("div.nn-hymn", { "aria-label": "Ut queant laxis ilahisinin ilk heceleri" },
      HYMN.map((x, i) => h("span.nn-line", { "data-i": i },
        x[2] === null ? [h("b", x[0]), x[1], h("b", x[3]), x[4]] : [h("b", x[0]), x[1]])));
    const top = h("div.nn-top", card, hymn);
    stage.append(top);
    const pianoWrap = h("div.nn-piano");
    stage.append(pianoWrap);
    const piano = Piano(pianoWrap, { from: 60, to: 84, labels: "none", onplay: (m) => { cur = m; show(); } });

    function label() {
      piano.el.classList.toggle("nn-vertical", sys === "perde");
      for (let m = 60; m <= 84; m++) {
        const k = piano.keyEl(m); if (!k) continue;
        const n = names(m), pc = T.pcOf(m);
        let t = "";
        if (sys === "solfej") t = T.isBlack(m) ? "" : SOLFEGE[pc];
        else if (sys === "harf") t = T.isBlack(m) ? "" : LETTERS[pc];
        else if (sys === "almanca") t = GERMAN[pc];
        else t = n.perde || "";
        k.querySelector(".kl").textContent = t;
        k.classList.toggle("nn-cur", m === cur);
      }
    }
    function show() {
      const n = names(cur);
      big.innerHTML = "";
      big.append(h("span.nn-name", T.name(cur, { octave: false })), h("span.nn-oct", T.name(cur)));
      const row = (k, lab, val, note) => h("div.nn-row" + (sys === k ? ".on" : ""), h("span", lab), h("b", val), note ? h("small", note) : null);
      rows.innerHTML = "";
      rows.append(
        row("solfej", "Solfej", n.solfej),
        row("harf", "Harf (İngilizce)", n.harf),
        row("almanca", "Almanca", n.almanca, T.pcOf(cur) === 11 ? "Si'ye H denir" : T.pcOf(cur) === 10 ? "Si♭'ye B denir" : null),
        row("perde", "Türk müziği perdesi", n.perde || "—", n.perde ? null : T.isBlack(cur) ? "aradaki perdelerin komalı birçok adı var (Kürdî, Segâh, Hicaz…)" : null));
      label();
    }
    function stop() { timersN.forEach(clearTimeout); timersN.length = 0; playing = false; hymn.querySelectorAll(".on").forEach((e) => e.classList.remove("on")); btn.textContent = "İlahiyi dinle"; btn.classList.remove("on"); }
    const btn = h("button.btn", { type: "button", onclick: () => {
      if (playing) return stop();
      playing = true; btn.textContent = "Durdur"; btn.classList.add("on");
      HYMN.forEach((x, i) => timersN.push(setTimeout(() => {
        hymn.querySelectorAll(".on").forEach((e) => e.classList.remove("on"));
        hymn.querySelector(`[data-i="${i}"]`).classList.add("on");
        if (x[2] != null) { piano.press(x[2], { dur: 0.9 }); cur = x[2]; show(); }
        else { piano.press(71, { dur: 1.2 }); cur = 71; show(); }
      }, 300 + i * 900)));
      timersN.push(setTimeout(stop, 300 + HYMN.length * 900 + 600));
    } }, "İlahiyi dinle");
    const segEl = seg([["solfej", "Solfej"], ["harf", "Harf"], ["almanca", "Almanca"], ["perde", "Türk perdeleri"]], sys, (k) => { sys = k; show(); }, "Adlandırma sistemi");
    stage.append(h("div.controls", segEl, h("span.spacer"), btn));
    show();
    return { leave: stop };
  };
  G["nota-adlari"] = [{ click: "İlahiyi dinle" }, { wait: 6800 }, { click: "=Harf" }, { wait: 900 }, { click: "=Almanca" }, { wait: 900 }, { click: "=Türk perdeleri" }];

  /* ---------- Nota yazısı: piyano portesi, sol ve fa anahtarları ----------
     Porteye tıklayınca nota en yakın çizgiye/aralığa oturur; adı ve yeri yazılır, piyanoda tuşu yanar.
     Piyanoda basılan tuş da porteye yazılır (orta Do ve üstü sol anahtarı, altı fa anahtarı).
     Anahtar şekilleri Wikimedia Commons'tan, kamu malı: GClef.svg ve Bass_clef.svg. */
  const F_CLEF_D = "M 1239,8245 C 1397,8138 1515,8057 1591,8001 C 1667,7946 1747,7877 1829,7795 C 1911,7713 1980,7620 2036,7517 C 2080,7441 2118,7353 2149,7253 C 2180,7154 2196,7058 2199,6967 C 2199,6882 2188,6801 2165,6725 C 2143,6648 2105,6585 2051,6534 C 1997,6484 1927,6459 1840,6459 C 1756,6459 1677,6476 1603,6509 C 1530,6543 1478,6597 1449,6673 C 1449,6680 1445,6689 1439,6702 C 1441,6718 1449,6730 1464,6739 C 1479,6748 1492,6752 1504,6752 C 1510,6752 1527,6749 1553,6743 C 1580,6737 1602,6733 1620,6733 C 1673,6733 1720,6752 1763,6789 C 1805,6826 1826,6871 1826,6924 C 1826,6962 1815,6998 1794,7031 C 1773,7064 1744,7091 1707,7110 C 1670,7130 1629,7139 1585,7139 C 1505,7139 1437,7115 1381,7066 C 1326,7016 1298,6953 1298,6874 C 1298,6773 1329,6686 1390,6612 C 1452,6538 1530,6483 1626,6446 C 1721,6408 1817,6390 1915,6390 C 2022,6390 2124,6417 2219,6472 C 2315,6526 2390,6601 2446,6694 C 2502,6788 2531,6888 2531,6996 C 2531,7188 2467,7366 2339,7531 C 2211,7696 2053,7839 1864,7961 C 1738,8044 1534,8156 1253,8297 L 1239,8245 z M 2628,6698 C 2628,6662 2641,6632 2667,6608 C 2692,6583 2723,6571 2760,6571 C 2792,6571 2822,6585 2849,6612 C 2876,6638 2889,6669 2889,6703 C 2889,6739 2875,6770 2849,6795 C 2821,6819 2790,6831 2755,6831 C 2718,6831 2688,6819 2664,6792 C 2640,6766 2628,6735 2628,6698 z M 2628,7222 C 2628,7186 2641,7155 2665,7131 C 2690,7106 2721,7094 2760,7094 C 2792,7094 2821,7107 2849,7134 C 2875,7161 2889,7190 2889,7222 C 2889,7261 2876,7292 2851,7317 C 2825,7342 2795,7355 2760,7355 C 2721,7355 2690,7342 2665,7318 C 2641,7294 2628,7262 2628,7222 z ";
  const DIA = [0, 2, 4, 5, 7, 9, 11];               // Do Re Mi Fa Sol La Si
  const LET = ["C", "D", "E", "F", "G", "A", "B"];
  // diatonik sıra n = oktav·7 + harf (Do4 = 28)
  const midiOf = (n, acc) => 12 * (Math.floor(n / 7) + 1) + DIA[((n % 7) + 7) % 7] + acc;
  Demos.notation = (stage) => {
    const S = 10;                                    // çizgi aralığı (svg birimi)
    const STAFF = {
      treble: { top: 40, bottom: 80, idx: 30, min: 26, max: 42, ad: "Sol anahtarı", el: "sağ el" },  // alt çizgi Mi4
      bass: { top: 140, bottom: 180, idx: 18, min: 14, max: 30, ad: "Fa anahtarı", el: "sol el" },    // alt çizgi Sol2
    };
    const W = 520, H = 222, X0 = 92, X1 = W - 18, SLOTS = 8;
    let notes = [], acc = 0, quiz = null, score = [0, 0];
    const txt = (g, attrs, t) => { const e = svg("text", attrs); e.textContent = t; g.append(e); return e; };
    const yOf = (st, n) => STAFF[st].bottom - (n - STAFF[st].idx) * (S / 2);

    const root = h("div.nt-wrap");
    const sv = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "nt-svg", role: "img", "aria-label": "Piyano portesi: nota koymak için tıklayın" });
    const info = h("div.nt-info", { "aria-live": "polite" });
    root.append(h("div.nt-staff", sv), info);
    stage.append(root);
    const pianoWrap = h("div.nt-piano");
    stage.append(pianoWrap);
    const piano = Piano(pianoWrap, { from: 36, to: 84, labels: "c", compact: true, onplay: fromKey });

    // sabit katman: porteler, anahtarlar, akolad, ipuçları
    const base = svg("g"), dyn = svg("g"), ghost = svg("g", { opacity: 0.45 });
    sv.append(base, dyn, ghost);
    (function drawBase() {
      for (const k of ["treble", "bass"]) {
        const st = STAFF[k];
        for (let i = 0; i < 5; i++) base.append(svg("line", { x1: 30, x2: W - 8, y1: st.top + i * S, y2: st.top + i * S, class: "nt-line" }));
        txt(base, { x: 66, y: st.top - 8, class: "nt-hand" }, st.ad + " · " + st.el);
      }
      base.append(svg("line", { x1: 30, x2: 30, y1: 40, y2: 180, class: "nt-bar" }), svg("line", { x1: W - 8, x2: W - 8, y1: 40, y2: 180, class: "nt-bar" }));
      // akolad: iki porteyi birleştiren süslü parantez
      base.append(svg("path", { d: "M24 40 C 12 52, 22 92, 13 110 C 22 128, 12 168, 24 180 C 18 160, 26 128, 17 110 C 26 92, 18 60, 24 40 Z", class: "nt-brace" }));
      // sol anahtarı: boyu 7,024 aralık, üst çizgi tepeden 1,392 aralık aşağıda (kıvrım Sol4 çizgisinde)
      base.append(svg("path", { d: L.GCLEF_D, class: "nt-clef", transform: L.gclefTransform(38, 40, S) }));
      // fa anahtarı: kaynak dosyadaki porte çizgileri y=6378…8740 (aralık 590,5); noktalar Fa3 çizgisini çevreler
      const fK = S / 590.5;
      base.append(svg("path", { d: F_CLEF_D, class: "nt-clef", transform: `translate(${40 - 1239 * fK} ${140 - 6378 * fK}) scale(${fK})` }));
      // ipuçları: Sol4 ve Fa3 çizgileri, orta Do
      txt(base, { x: W - 12, y: yOf("treble", 32) - 2, class: "nt-tip", "text-anchor": "end" }, "Sol4 çizgisi");
      txt(base, { x: W - 12, y: yOf("bass", 24) - 2, class: "nt-tip", "text-anchor": "end" }, "Fa3 çizgisi");
      txt(base, { x: W - 12, y: 113, class: "nt-tip mid", "text-anchor": "end" }, "Orta Do (Do4) iki portenin arasında");
    })();

    function notehead(g, x, y, cls) {
      g.append(svg("ellipse", { cx: x, cy: y, rx: 6.3, ry: 4.5, transform: `rotate(-20 ${x} ${y})`, class: cls }));
    }
    function ledgers(g, st, n, x) {
      const s = STAFF[st];
      for (let k = s.idx - 2; k >= n; k -= 2) g.append(svg("line", { x1: x - 10, x2: x + 10, y1: yOf(st, k), y2: yOf(st, k), class: "nt-ledger" }));
      for (let k = s.idx + 10; k <= n; k += 2) g.append(svg("line", { x1: x - 10, x2: x + 10, y1: yOf(st, k), y2: yOf(st, k), class: "nt-ledger" }));
    }
    const ACC = { 1: "♯", "-1": "♭", 0: "" };
    function drawNote(g, nt, x, cls) {
      const y = yOf(nt.st, nt.n);
      ledgers(g, nt.st, nt.n, x);
      if (nt.acc) txt(g, { x: x - 11, y: y + 4.5, class: "nt-acc " + cls, "text-anchor": "end" }, ACC[nt.acc]);
      notehead(g, x, y, "nt-head " + cls);
      const mid = STAFF[nt.st].idx + 4, up = nt.n < mid;    // orta çizginin altındakiler yukarı saplı
      g.append(svg("line", Object.assign(up ? { x1: x + 5.7, x2: x + 5.7, y1: y - 1, y2: y - 34 } : { x1: x - 5.7, x2: x - 5.7, y1: y + 1, y2: y + 34 }, { class: "nt-stem " + cls })));
    }
    function render() {
      while (dyn.firstChild) dyn.firstChild.remove();
      const step = (X1 - X0) / SLOTS;
      if (quiz) drawNote(dyn, quiz, X0 + step * 3.5, "q");
      else notes.forEach((nt, i) => drawNote(dyn, nt, X0 + step * (i + 0.5), i === notes.length - 1 ? "cur" : ""));
    }
    function place(nt) {
      const s = STAFF[nt.st], off = nt.n - s.idx;
      if (nt.st === "treble" && nt.n === 28 || nt.st === "bass" && nt.n === 28) return "Orta Do: iki porte arasındaki ek çizgi";
      if (off >= 0 && off <= 8) return off % 2 === 0 ? `${s.ad}nda alttan ${off / 2 + 1}. çizgi` : `${s.ad}nda alttan ${(off + 1) / 2}. aralık`;
      if (off < 0) return off % 2 === 0 ? `portenin altında ${-off / 2}. ek çizgi` : `portenin altında, ${(-off - 1) / 2 ? (-off - 1) / 2 + ". ek çizginin altı" : "ilk aralık"}`;
      const o = off - 8;
      return o % 2 === 0 ? `portenin üstünde ${o / 2}. ek çizgi` : `portenin üstünde, ${(o - 1) / 2 ? (o - 1) / 2 + ". ek çizginin üstü" : "ilk aralık"}`;
    }
    function nameOf(nt) {
      const m = midiOf(nt.n, nt.acc), L_ = LET[((nt.n % 7) + 7) % 7] + ACC[nt.acc], oct = Math.floor(nt.n / 7);
      return { m, tr: T.name(m, { flats: nt.acc < 0, octave: false }), full: T.name(m, { flats: nt.acc < 0 }), letter: L_ + oct };
    }
    function showInfo(nt, msg, cls) {
      info.innerHTML = "";
      if (!nt) { info.append(h("p.nt-hint", "Porteye tıklayarak nota koyun ya da piyanoda bir tuşa basın.")); return; }
      const nm = nameOf(nt);
      info.append(h("div.nt-name" + (cls ? "." + cls : ""), nm.tr),
        h("div.nt-det", h("div.nt-sub", nm.full + " · " + nm.letter + " · " + fmtNum(T.mtof(nm.m), 1) + " Hz"), h("div.nt-pos", place(nt)),
          msg ? h("div.nt-msg" + (cls ? "." + cls : ""), msg) : null));
    }
    function add(nt) {
      notes.push(nt); if (notes.length > SLOTS) notes.shift();
      const m = midiOf(nt.n, nt.acc);
      piano.clear(); piano.mark(m, "tonic", "");
      Snd.pluck(T.mtof(m), { gain: 0.3, dur: 1 });
      render(); showInfo(nt);
    }
    // svg koordinatı
    function svgPt(e) { const pt = sv.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(sv.getScreenCTM().inverse()); }
    function noteAt(p) {
      const st = p.y < 110 ? "treble" : "bass", s = STAFF[st];
      const n = clamp(Math.round(s.idx + (s.bottom - p.y) / (S / 2)), s.min, s.max);
      return { st, n, acc };
    }
    sv.addEventListener("pointermove", (e) => {
      while (ghost.firstChild) ghost.firstChild.remove();
      if (quiz) return;
      const p = svgPt(e); if (p.x < 60) return;
      const step = (X1 - X0) / SLOTS, i = Math.min(notes.length, SLOTS - 1);
      drawNote(ghost, noteAt(p), X0 + step * (i + 0.5), "ghost");
    });
    sv.addEventListener("pointerleave", () => { while (ghost.firstChild) ghost.firstChild.remove(); });
    sv.addEventListener("pointerdown", (e) => { if (quiz) return; const p = svgPt(e); if (p.x < 60) return; add(noteAt(p)); });

    // piyanodan porteye: orta Do ve üstü sol anahtarı, altı fa anahtarı; siyah tuşlar seçili işarete göre yazılır
    function spell(m) {
      const pc = T.pcOf(m), oct = Math.floor(m / 12) - 1;
      if (!T.isBlack(m)) return { n: oct * 7 + DIA.indexOf(pc), acc: 0 };
      if (acc < 0) { const up = m + 1, o2 = Math.floor(up / 12) - 1; return { n: o2 * 7 + DIA.indexOf(T.pcOf(up)), acc: -1 }; }
      const dn = m - 1, o3 = Math.floor(dn / 12) - 1; return { n: o3 * 7 + DIA.indexOf(T.pcOf(dn)), acc: 1 };
    }
    function fromKey(m) {
      if (quiz) return answer(m);
      const sp = spell(m), st = m >= 60 ? "treble" : "bass";
      if (sp.n < STAFF[st].min || sp.n > STAFF[st].max) return;
      notes.push({ st, n: sp.n, acc: sp.acc }); if (notes.length > SLOTS) notes.shift();
      piano.clear(); piano.mark(m, "tonic", "");
      render(); showInfo(notes[notes.length - 1]);
    }
    // okuma alıştırması
    function nextQuiz() {
      const st = Math.random() < 0.5 ? "treble" : "bass", s = STAFF[st];
      let n;
      do { n = s.idx - 2 + Math.floor(Math.random() * 13); } while (quiz && n === quiz.n && st === quiz.st);
      quiz = { st, n, acc: 0 };
      piano.clear(); render(); showInfo(null);
      info.innerHTML = "";
      info.append(h("div.nt-name.q", "?"), h("div.nt-det", h("div.nt-pos", `Bu hangi nota? Piyanoda bulun. (${score[0]}/${score[1]})`)));
    }
    function answer(m) {
      const target = midiOf(quiz.n, 0);
      score[1]++;
      if (m === target) {
        score[0]++;
        piano.mark(m, "tonic", "");
        showInfo(quiz, `Doğru! (${score[0]}/${score[1]})`, "ok");
        setTimeout(() => { if (quiz) nextQuiz(); }, 1100);
      } else {
        piano.mark(m, "tension", "");
        info.querySelector(".nt-pos").textContent = `O ${T.withLetter(m)}. Tekrar deneyin. (${score[0]}/${score[1]})`;
      }
    }
    const quizBtn = h("button.btn", { type: "button", onclick: () => {
      if (quiz) { quiz = null; quizBtn.textContent = "Nota oku"; quizBtn.classList.remove("on"); piano.clear(); render(); showInfo(notes[notes.length - 1]); }
      else { score = [0, 0]; quizBtn.textContent = "Alıştırmayı bitir"; quizBtn.classList.add("on"); nextQuiz(); }
    } }, "Nota oku");
    const accSeg = seg([[0, "♮ Doğal"], [1, "♯ Diyez"], [-1, "♭ Bemol"]], 0, (v) => { acc = v; }, "Değiştirici işaret");
    const playBtn = h("button.btn", { type: "button", onclick: () => {
      const c = Snd.ready(); const t0 = c ? c.currentTime + 0.05 : 0;
      notes.forEach((nt, i) => { if (c) Snd.pluck(T.mtof(midiOf(nt.n, nt.acc)), { gain: 0.28, dur: 0.6, when: t0 + i * 0.45 }); });
    } }, "Çal");
    const clearBtn = h("button.btn", { type: "button", onclick: () => { notes = []; piano.clear(); render(); showInfo(null); } }, "Temizle");
    stage.append(h("div.controls", accSeg, playBtn, clearBtn, h("span.spacer"), quizBtn));
    // başlangıç: sol anahtarının Sol4'ü ve fa anahtarının Fa3'ü
    notes = [{ st: "treble", n: 32, acc: 0 }, { st: "bass", n: 24, acc: 0 }, { st: "treble", n: 28, acc: 0 }];
    render(); showInfo(notes[2]);
    return { leave() { if (quiz) quizBtn.click(); } };
  };
  G["nota-yazisi"] = [{ click: 'css:.key[data-m="67"]' }, { wait: 900 }, { click: 'css:.key[data-m="53"]' }, { wait: 900 }, { click: 'css:.key[data-m="60"]' }, { wait: 900 }, { click: "Nota oku" }];
})();
