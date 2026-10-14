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
        info.append(h("p.sc-big", noteName(a)), h("p.sc-sub", "Şimdi ikinci tuşa basın."));
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
        h("p.sc-sub", `${noteName(a)} → ${noteName(b)}` + (tri ? " · triton: oktavın tam ortası" : "")));
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
        h("p.sc-big", noteName(tonic, flats) + " majör"),
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
        h("p.sc-char", "Ayırt edici nota: ", h("b" + (ct ? ".c-tension" : ".c-wave"), noteName(n[ci])), ` (${charIv.ad.toLocaleLowerCase("tr")})`));
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
    const PENTA = []; for (let m = 61; m <= 82; m++) if (T.isBlack(m)) PENTA.push(m);
    const top = h("div.controls.top");
    const trailWrap = h("div.sc-trail");
    const cv = h("canvas", { "aria-label": "Çalınan notaların izi" });
    trailWrap.append(cv);
    const main = h("div.fill.sc-main", trailWrap);
    stage.append(top, main);
    const trail = []; // {m, t}
    let st, now = 0;
    const board = Board(main, { from: 60, to: 84, onplay: (m) => trail.push({ m, t: now, black: T.isBlack(m) }) });
    for (let m = 60; m <= 84; m++) board.piano.mark(m, T.isBlack(m) ? (T.pcOf(m) === 6 ? "tonic" : "in") : "dim", T.isBlack(m) ? noteName(m) : "");
    board.setNotes(PENTA.filter((m) => m >= 66 && m <= 78), null, { 2: "T", 3: "k3" });
    let timer = 0, on = false, cur = 3;
    const btn = h("button.btn.primary", { type: "button", onclick: () => (on ? stopImp() : startImp()) }, "Doğaçla");
    top.append(btn, h("span.spacer"), h("span.sc-lab", "Siyah tuşlar: Fa♯ – Sol♯ – La♯ – Do♯ – Re♯"));
    const RHY = [1, 1, 1, 0.5, 0.5, 2, 1.5];
    let count = 0;
    function stepImp() {
      if (!on) return;
      // adım adım yürüyüşe eğilimli rastgele ezgi; her 8 notada bir Fa♯'ye dönerek cümle biter
      count++;
      if (count > 40) { stopImp(); return; } // yaklaşık 10 saniyelik doğaçlamadan sonra kendiliğinden durur
      let d = [-1, -1, 1, 1, 0, -2, 2, 1, -1][Math.floor(Math.random() * 9)];
      cur = clamp(cur + d, 0, PENTA.length - 1);
      if (count % 8 === 0) cur = PENTA.indexOf(66) >= 0 && Math.random() < 0.5 ? PENTA.indexOf(66) : PENTA.indexOf(78);
      const m = PENTA[cur];
      const r = count % 8 === 0 ? 2 : RHY[Math.floor(Math.random() * RHY.length)];
      board.piano.press(m, { dur: 0.3 * r + 0.2 });
      board.lit(m, 260 * r);
      timer = setTimeout(stepImp, 260 * r);
    }
    function startImp() { on = true; btn.textContent = "Durdur"; btn.classList.remove("primary"); btn.classList.add("on"); count = 0; stepImp(); }
    function stopImp() { on = false; clearTimeout(timer); btn.textContent = "Doğaçla"; btn.classList.add("primary"); btn.classList.remove("on"); }
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
        const col = !p.black ? C.muted : T.pcOf(p.m) === 6 ? C.tonic : C.wave;
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
    return { enter() { board.draw(); lp.start(); }, leave() { stopImp(); lp.stop(); } };
  };
  G.pentatonik = [{ click: 'css:.key[data-m="66"]' }, { click: 'css:.key[data-m="70"]' }, { click: 'css:.key[data-m="73"]' }, { click: "Doğaçla" }];
})();
