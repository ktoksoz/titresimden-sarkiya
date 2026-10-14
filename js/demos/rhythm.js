/* 5. bölüm (Ritim ve zaman) demoları: metronom, adım sıralayıcı, aksak usuller, senkop, poliritim */
(function () {
  const { C, FONT, rgba, canvas, loop, h, slider, seg, clamp, lerp, fmtNum, text } = L;
  const G = (window.GuideScenarios = window.GuideScenarios || {});

  /* Zamanlayıcı: ses açıksa Web Audio saatine göre ileriye planlar (Snd.scheduler);
     ses kilitliyse aynı adımları performance.now() ile yalnız görsel olarak yürütür ve
     ses açıldığı an kaldığı adımdan sesli devam eder. pos(): kesirli adım konumu (çizim için). */
  function Transport({ interval, step }) {
    const q = []; // [adım, başlangıç zamanı, süre]
    let sch = null, fb = null, on = false;
    const push = (i, t) => { q.push([i, t, interval(i)]); if (q.length > 96) q.shift(); };
    const wrap = (i, t) => { push(i, t); step(i, t); };
    function tryAudio(from) {
      if (!Snd.running()) return false;
      const s = Snd.scheduler({ step: wrap, interval });
      if (s.start(from)) { sch = s; return true; }
      return false;
    }
    function tick() {
      const now = performance.now() / 1000;
      while (fb.next <= now + 0.02) { push(fb.i, fb.next); fb.next += interval(fb.i); fb.i++; }
      if (Snd.running()) { const from = fb.i; fb = null; q.length = 0; tryAudio(from); }
    }
    const clock = () => (sch ? Snd.now() : performance.now() / 1000);
    const api = {
      start() {
        if (on) return;
        on = true; q.length = 0;
        if (!tryAudio(0)) { Snd.hint(); fb = { i: 0, next: performance.now() / 1000 + 0.05 }; }
      },
      stop() { on = false; if (sch) sch.stop(); sch = null; fb = null; q.length = 0; },
      restart() { if (on) { api.stop(); api.start(); } },
      pos() {
        if (!on) return -1;
        if (fb) tick();
        if (sch) sch.current(); // iç kuyruğu kısa tut
        const now = clock();
        let cur = null;
        for (const e of q) { if (e[1] <= now) cur = e; else break; }
        if (!cur) return -1;
        return cur[0] + Math.min(0.999, (now - cur[1]) / cur[2]);
      },
      get on() { return on; },
    };
    return api;
  }
  window.Transport = Transport;

  function stageCanvas(stage, label) {
    const fill = h("div.fill"); stage.append(fill);
    const cv = h("canvas", { "aria-label": label }); fill.append(cv);
    return { fill, cv };
  }
  // Başlat/Durdur düğmesi
  function playButton(t, labels = ["Başlat", "Durdur"], onToggle) {
    const b = h("button.btn.primary.play", { type: "button" }, labels[0]);
    const sync = () => { b.textContent = t.on ? labels[1] : labels[0]; b.classList.toggle("on", t.on); };
    b.addEventListener("click", () => { t.on ? t.stop() : t.start(); sync(); onToggle && onToggle(t.on); });
    b.sync = sync;
    return b;
  }

  /* ---------- Metronom ---------- */
  Demos.metronome = (stage) => {
    const { cv } = stageCanvas(stage, "Metronom: sarkaç ve vuruş ışıkları");
    let bpm = 96, meter = "4/4";
    const N = { "2/4": 2, "3/4": 3, "4/4": 4, "6/8": 6 };
    const n = () => N[meter];
    // 6/8'de tempo noktalı dörtlüğe göre: sekizlik = vuruşun üçte biri
    const interval = () => (meter === "6/8" ? 60 / bpm / 3 : 60 / bpm);
    const strong = (k) => k === 0;
    const mid = (k) => meter === "6/8" && k === 3;
    const tr = Transport({
      interval,
      step(i, t) {
        const k = i % n();
        Snd.drum(strong(k) ? "accent" : mid(k) ? "rim" : "click", t, strong(k) ? 1 : mid(k) ? 0.75 : 0.5);
      },
    });
    function term(b) {
      return b < 60 ? "Largo" : b < 76 ? "Adagio" : b < 108 ? "Andante" : b < 120 ? "Moderato" : b < 168 ? "Allegro" : b < 200 ? "Presto" : "Prestissimo";
    }
    let st, ang = 0;
    function draw(dt) {
      if (!st) return;
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      const p = tr.pos();
      const narrow = w < 560;
      // sarkaç
      const cx = narrow ? w / 2 : w * 0.36, base = hh * (narrow ? 0.7 : 0.72);
      const L_ = narrow ? Math.min(base - 120, 260) : Math.min(hh * 0.56, 300);
      const beatPos = p < 0 ? null : meter === "6/8" ? p / 3 : p;
      const target = beatPos == null ? 0 : 0.42 * Math.cos(Math.PI * beatPos);
      ang = beatPos == null ? lerp(ang, 0, Math.min(1, dt * 6)) : target;
      // gövde
      ctx.fillStyle = "#24120f";
      ctx.beginPath();
      ctx.moveTo(cx - L_ * 0.22, base + 26); ctx.lineTo(cx + L_ * 0.22, base + 26);
      ctx.lineTo(cx + L_ * 0.09, base - L_ * 0.95); ctx.lineTo(cx - L_ * 0.09, base - L_ * 0.95); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(C.brass, 0.7); ctx.lineWidth = 1.5; ctx.stroke();
      // ölçek çizgileri
      ctx.strokeStyle = rgba(C.ink, 0.18); ctx.lineWidth = 1;
      for (let k = -4; k <= 4; k++) {
        const a = k * 0.105;
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(a) * L_ * 0.78, base - Math.cos(a) * L_ * 0.78);
        ctx.lineTo(cx + Math.sin(a) * L_ * 0.84, base - Math.cos(a) * L_ * 0.84); ctx.stroke();
      }
      // kol ve ağırlık (ağırlık yukarıda = yavaş tempo)
      const tipX = cx + Math.sin(ang) * L_, tipY = base - Math.cos(ang) * L_;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(cx, base); ctx.lineTo(tipX, tipY); ctx.stroke();
      const wpos = 0.35 + 0.5 * (1 - (bpm - 40) / 168);
      const wx = cx + Math.sin(ang) * L_ * wpos, wy = base - Math.cos(ang) * L_ * wpos;
      ctx.save(); ctx.translate(wx, wy); ctx.rotate(ang);
      ctx.fillStyle = C.brass; ctx.fillRect(-11, -8, 22, 16);
      ctx.fillStyle = rgba("#000000", 0.25); ctx.fillRect(-11, 2, 22, 6);
      ctx.restore();
      ctx.fillStyle = C.brass; ctx.beginPath(); ctx.arc(cx, base, 5, 0, Math.PI * 2); ctx.fill();

      // tempo yazısı
      const tx = narrow ? w / 2 : w * 0.7, ty = narrow ? 58 : hh * 0.36;
      const al = narrow ? "center" : "left";
      text(ctx, String(bpm), narrow ? tx : tx - 40, ty, { size: narrow ? 46 : 84, color: C.ink, font: FONT.display, weight: 600, align: al });
      text(ctx, "vuruş/dakika" + (meter === "6/8" ? " (noktalı dörtlük)" : ""), narrow ? tx : tx - 38, ty + (narrow ? 20 : 28), { size: 13, color: C.muted, align: al });
      if (!narrow) {
        text(ctx, term(bpm), tx - 38, ty + 64, { size: 26, color: C.brass, font: FONT.display, weight: 500, align: al });
      }

      // vuruş ışıkları
      const k0 = p < 0 ? -1 : Math.floor(p) % n(), frac = p < 0 ? 1 : p - Math.floor(p);
      const cnt = n(), gap = Math.min(70, (w - 80) / cnt), r = Math.min(16, gap * 0.32);
      const ly = hh - (narrow ? 46 : 56), lx0 = w / 2 - ((cnt - 1) * gap) / 2 + (meter === "6/8" ? -gap * 0.2 : 0);
      for (let k = 0; k < cnt; k++) {
        const x = lx0 + k * gap + (meter === "6/8" && k >= 3 ? gap * 0.4 : 0);
        const col = strong(k) || mid(k) ? C.tonic : C.ink;
        const lit = k === k0 ? 1 - frac * 0.7 : 0;
        ctx.save();
        if (lit > 0) { ctx.shadowColor = col; ctx.shadowBlur = 24 * lit; }
        ctx.fillStyle = rgba(col, 0.14 + 0.86 * lit);
        ctx.beginPath(); ctx.arc(x, ly, strong(k) ? r : mid(k) ? r * 0.85 : r * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = rgba(col, 0.6); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, ly, strong(k) ? r : mid(k) ? r * 0.85 : r * 0.7, 0, Math.PI * 2); ctx.stroke();
        text(ctx, String(k + 1), x, ly + r + 18, { size: 12, color: C.muted, align: "center" });
      }
      text(ctx, meter, w - 20, 34, { size: 30, color: rgba(C.ink, 0.5), font: FONT.display, weight: 600, align: "right" });
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);
    const btn = playButton(tr);
    const sl = slider({ label: "Tempo", min: 40, max: 208, step: 1, value: bpm, fmt: (v) => v + " BPM", oninput: (v) => { bpm = v; } });
    const sg = seg([["2/4", "2/4"], ["3/4", "3/4"], ["4/4", "4/4"], ["6/8", "6/8"]], meter, (v) => { meter = v; tr.restart(); }, "Ölçü");
    stage.append(h("div.controls", btn, sl, sg));
    return {
      enter() { lp.start(); },
      leave() { lp.stop(); tr.stop(); btn.sync(); },
    };
  };
  G.tempo = [{ click: "Başlat" }, { wait: 2400 }, { slide: "label:Tempo", to: 150 }, { wait: 1600 }, { click: "=3/4" }, { wait: 2600 }, { click: "css:.play" }];

  /* ---------- Adım sıralayıcı ---------- */
  Demos.sequencer = (stage) => {
    const ROWS = [
      { id: "kick", ad: "Bas davul", kisa: "Bas", c: C.tonic },
      { id: "snare", ad: "Trampet", kisa: "Trampet", c: C.ink },
      { id: "hat", ad: "Hi-hat", kisa: "Hi-hat", c: C.wave },
      { id: "rim", ad: "Tahta", kisa: "Tahta", c: C.brass },
    ];
    const S = 16;
    const range = (a, b, s = 1) => { const r = []; for (let i = a; i < b; i += s) r.push(i); return r; };
    const PRESETS = {
      pop: { bpm: 112, kick: [0, 8], snare: [4, 12], hat: range(0, 16, 2), rim: [] },
      rock: { bpm: 104, kick: [0, 3, 8, 10], snare: [4, 12], hat: range(0, 16, 2), rim: [] },
      // bossa nova: bas "dum… dum-dum" (noktalı), tahta clave benzeri dengesiz kalıp
      bossa: { bpm: 128, kick: [0, 3, 4, 7, 8, 11, 12, 15], snare: [], hat: range(0, 16, 2), rim: [0, 3, 6, 10, 13] },
    };
    let grid = ROWS.map(() => new Array(S).fill(false));
    let bpm = 104;
    const tr = Transport({
      interval: () => 60 / bpm / 4,
      step(i, t) {
        const s = i % S;
        ROWS.forEach((r, ri) => {
          if (!grid[ri][s]) return;
          const v = r.id === "hat" ? (s % 4 === 0 ? 0.9 : 0.55) : 1;
          Snd.drum(r.id, t, v);
        });
      },
    });
    const wrap = h("div.sq");
    const cells = [];
    ROWS.forEach((r, ri) => {
      const row = h("div.sq-row", { "data-r": ri, style: { "--c": r.c } });
      row.append(h("span.sq-lab", h("span.long", r.ad), h("span.short", r.kisa)));
      cells[ri] = [];
      for (let s = 0; s < S; s++) {
        const b = h("button.sq-cell" + (s % 4 === 0 ? ".beat" : ""), { type: "button", "data-s": s, "aria-label": `${r.ad}, ${s + 1}. adım`, "aria-pressed": "false" });
        b.addEventListener("click", () => {
          grid[ri][s] = !grid[ri][s]; paint();
          if (grid[ri][s]) Snd.drum(r.id, 0, 0.8);
        });
        row.append(b); cells[ri][s] = b;
      }
      wrap.append(row);
    });
    const nums = h("div.sq-row.sq-nums");
    nums.append(h("span.sq-lab"));
    for (let s = 0; s < S; s++) nums.append(h("span.sq-num" + (s % 4 === 0 ? ".beat" : ""), s % 4 === 0 ? String(s / 4 + 1) : "·"));
    wrap.append(nums);
    stage.append(h("div.fill.sq-fill", wrap));
    function paint() {
      cells.forEach((row, ri) => row.forEach((b, s) => { b.classList.toggle("on", grid[ri][s]); b.setAttribute("aria-pressed", grid[ri][s]); }));
    }
    function load(k) {
      const p = PRESETS[k];
      grid = ROWS.map((r) => { const a = new Array(S).fill(false); p[r.id].forEach((i) => (a[i] = true)); return a; });
      bpm = p.bpm; sl.set(bpm); paint();
    }
    let lastCol = -1;
    const lp = loop(() => {
      const p = tr.pos();
      const col = p < 0 ? -1 : Math.floor(p) % S;
      if (col === lastCol) return;
      if (lastCol >= 0) cells.forEach((row) => row[lastCol].classList.remove("now"));
      if (col >= 0) cells.forEach((row) => row[col].classList.add("now"));
      lastCol = col;
    });
    const btn = playButton(tr);
    const sl = slider({ label: "Tempo", min: 60, max: 180, step: 1, value: bpm, fmt: (v) => v + " BPM", oninput: (v) => { bpm = v; } });
    const sg = seg([["pop", "4/4 Pop"], ["rock", "Rock"], ["bossa", "Bossa nova"]], "rock", (k) => load(k), "Hazır desenler");
    const clr = h("button.btn", { type: "button", onclick: () => { grid = ROWS.map(() => new Array(S).fill(false)); paint(); sg.set(null); } }, "Temizle");
    stage.append(h("div.controls", sg, btn, sl, h("span.spacer"), clr));
    load("rock");
    return {
      enter() { lp.start(); },
      leave() { lp.stop(); tr.stop(); btn.sync(); },
    };
  };
  G.sirali = [{ click: "Bossa nova" }, { click: "Başlat" }, { wait: 3000 }, { click: "css:.sq-row[data-r='1'] .sq-cell[data-s='12']" }, { wait: 2000 }];

  /* ---------- Aksak usuller ---------- */
  Demos.aksak = (stage) => {
    const { cv } = stageCanvas(stage, "Aksak usul çemberi");
    // Basitleştirilmiş düm (D) – tek (T) kalıpları; adımlar sekizlik
    const USUL = {
      "9": { ad: "9/8", groups: [2, 2, 2, 3], hits: { 0: "D", 2: "T", 4: "D", 6: "T", 7: "T" }, ex: "Roman havası, Karşılama" },
      "7": { ad: "7/8", groups: [2, 2, 3], hits: { 0: "D", 2: "T", 4: "D", 6: "T" }, ex: "Devr-i Turan" },
      "7b": { ad: "7/8", groups: [3, 2, 2], hits: { 0: "D", 3: "T", 5: "T" }, ex: "Balkan dansları" },
      "5": { ad: "5/8", groups: [2, 3], hits: { 0: "D", 2: "T", 3: "T" }, ex: "Türk aksağı" },
    };
    let key = "9", rate = 300;
    const u = () => USUL[key];
    const N = () => u().groups.reduce((a, b) => a + b, 0);
    const tr = Transport({
      interval: () => 60 / rate,
      step(i, t) {
        const k = i % N(), hit = u().hits[k];
        if (hit === "D") Snd.drum("dum", t, 1);
        else if (hit === "T") Snd.drum("tek", t, 0.9);
        else Snd.drum("hat", t, 0.3);
      },
    });
    let st;
    const flash = [];
    function draw() {
      if (!st) return;
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      const n = N(), U = u();
      const boxH = 34, cy = (hh - boxH - 30) / 2 + 6, cx = w / 2;
      const R = Math.min(w * 0.36, (hh - boxH - 60) * 0.4);
      const ang = (k) => -Math.PI / 2 + (Math.PI * 2 * k) / n;
      const p = tr.pos(), cur = p < 0 ? -1 : Math.floor(p) % n, frac = p < 0 ? 0 : p - Math.floor(p);
      // çember
      ctx.strokeStyle = rgba(C.ink, 0.12); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      // grup yayları
      let k = 0;
      const step = (Math.PI * 2) / n;
      U.groups.forEach((g) => {
        const long = g === 3;
        const a0 = ang(k) - step * 0.32, a1 = ang(k + g - 1) + step * 0.32;
        ctx.strokeStyle = long ? C.brass : rgba(C.ink, 0.35);
        ctx.lineWidth = long ? 6 : 4; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(cx, cy, R + 24, a0, a1); ctx.stroke();
        const am = (a0 + a1) / 2;
        text(ctx, String(g), cx + Math.cos(am) * (R + 46), cy + Math.sin(am) * (R + 46) + 6, { size: long ? 20 : 17, color: long ? C.brass : C.ink2, font: FONT.display, weight: 700, align: "center" });
        k += g;
      });
      // ibre
      if (p >= 0) {
        const a = -Math.PI / 2 + (Math.PI * 2 * (p % n)) / n;
        ctx.strokeStyle = rgba(C.ink, 0.55); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R - 16), cy + Math.sin(a) * (R - 16)); ctx.stroke();
      }
      // vuruş noktaları
      for (let i = 0; i < n; i++) {
        const hit = U.hits[i], x = cx + Math.cos(ang(i)) * R, y = cy + Math.sin(ang(i)) * R;
        const col = hit === "D" ? C.tonic : hit === "T" ? C.wave : C.ink;
        const r = hit === "D" ? 13 : hit === "T" ? 9 : 4;
        const lit = i === cur ? 1 - frac * 0.8 : 0;
        ctx.save();
        if (lit && hit) { ctx.shadowColor = col; ctx.shadowBlur = 28 * lit; }
        ctx.fillStyle = hit ? rgba(col, 0.45 + 0.55 * lit) : rgba(col, 0.3 + 0.7 * lit);
        ctx.beginPath(); ctx.arc(x, y, r * (1 + 0.25 * lit), 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (hit) { ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
      }
      // merkez yazısı
      text(ctx, U.ad, cx, cy + 4, { size: Math.min(54, R * 0.42), color: C.ink, font: FONT.display, weight: 600, align: "center" });
      text(ctx, U.groups.join(" + "), cx, cy + 30, { size: 15, color: C.brass, align: "center", weight: 600 });
      text(ctx, U.ex, cx, cy + 52, { size: 13, color: C.muted, align: "center" });
      // kutu yazımı
      const bw = Math.min(56, (w - 40) / n), bx0 = cx - (bw * n) / 2, by = hh - boxH - 18;
      let gs = 0;
      for (let i = 0; i < n; i++) {
        const hit = U.hits[i], x = bx0 + i * bw;
        ctx.fillStyle = i === cur ? rgba(C.ink, 0.14) : rgba(C.ink, 0.04);
        ctx.fillRect(x + 1, by, bw - 2, boxH);
        if (hit) text(ctx, hit === "D" ? "düm" : "tek", x + bw / 2, by + boxH / 2 + 5, { size: Math.min(14, bw * 0.3), color: hit === "D" ? C.tonic : C.wave, align: "center", weight: 700 });
      }
      // grup sınırları
      ctx.strokeStyle = C.brass; ctx.lineWidth = 2;
      U.groups.forEach((g) => {
        const x = bx0 + gs * bw;
        ctx.beginPath(); ctx.moveTo(x, by - 4); ctx.lineTo(x, by + boxH + 4); ctx.stroke();
        gs += g;
      });
      ctx.beginPath(); ctx.moveTo(bx0 + n * bw, by - 4); ctx.lineTo(bx0 + n * bw, by + boxH + 4); ctx.stroke();
      text(ctx, "basitleştirilmiş kalıp", w - 14, hh - 4, { size: 11, color: C.muted, align: "right" });
    }
    st = canvas(cv, () => draw());
    const lp = loop(draw);
    const btn = playButton(tr);
    const sg = seg([["9", "9/8 (2+2+2+3)"], ["7", "7/8 (2+2+3)"], ["7b", "7/8 (3+2+2)"], ["5", "5/8 (2+3)"]], key, (k) => { key = k; tr.restart(); }, "Usul");
    const sl = slider({ label: "Hız", min: 160, max: 440, step: 1, value: rate, fmt: (v) => v + " sekizlik/dk", oninput: (v) => { rate = v; } });
    stage.append(h("div.controls", sg, btn, sl));
    return {
      enter() { lp.start(); },
      leave() { lp.stop(); tr.stop(); btn.sync(); },
    };
  };
  G.aksak = [{ click: "9/8" }, { click: "Başlat" }, { wait: 3600 }, { click: "5/8" }, { wait: 3000 }];

  /* ---------- Senkop ---------- */
  Demos.syncopation = (stage) => {
    const { cv } = stageCanvas(stage, "Senkop: nabız ve nota başlangıçları");
    // [başlangıç sekizliği, MIDI, süre] — aynı notalar, farklı zamanlama (2 ölçü, 16 sekizlik)
    const MEL = {
      duz: [[0, 64, 2], [2, 67, 2], [4, 69, 2], [6, 67, 2], [8, 64, 2], [10, 62, 2], [12, 60, 4]],
      senkop: [[0, 64, 3], [3, 67, 2], [5, 69, 2], [7, 67, 1], [8, 64, 3], [11, 62, 2], [13, 60, 3]],
    };
    let mode = "duz";
    const BPM = 100, S = 16, E = 60 / BPM / 2;
    const tr = Transport({
      interval: () => E,
      step(i, t) {
        const s = i % S;
        if (s % 2 === 0) Snd.drum(s % 8 === 0 ? "accent" : "click", t, s % 8 === 0 ? 0.55 : 0.35);
        if (s % 4 === 0) Snd.drum("kick", t, 0.55);
        MEL[mode].forEach(([o, m, d]) => { if (o === s) Snd.pluck(T.mtof(m), { when: t, dur: d * E * 0.95, gain: o % 2 ? 0.4 : 0.32 }); });
      },
    });
    const PITCH = [69, 67, 65, 64, 62, 60];
    let st;
    function draw() {
      if (!st) return;
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      const lab = 46, x0 = lab + 10, x1 = w - 18, cw = (x1 - x0) / S;
      const narrowR = w < 560;
      const pulseY = 46, top = 92, bot = hh - (narrowR ? 66 : 46), rh = (bot - top) / PITCH.length;
      const p = tr.pos(), cur = p < 0 ? -1 : p % S;
      text(ctx, "nabız", 12, pulseY + 4, { size: 12, color: C.muted });
      // ızgara
      for (let s = 0; s <= S; s++) {
        const x = x0 + s * cw;
        ctx.strokeStyle = s % 8 === 0 ? rgba(C.ink, 0.4) : s % 2 === 0 ? rgba(C.ink, 0.16) : rgba(C.ink, 0.05);
        ctx.lineWidth = s % 8 === 0 ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(x, top - 8); ctx.lineTo(x, bot); ctx.stroke();
      }
      PITCH.forEach((m, r) => {
        text(ctx, T.name(m, { octave: false }), lab, top + r * rh + rh / 2 + 4, { size: 12, color: C.ink2, align: "right" });
        ctx.fillStyle = r % 2 ? "rgba(239,228,204,0.02)" : "rgba(0,0,0,0.06)";
        ctx.fillRect(x0, top + r * rh, x1 - x0, rh);
      });
      // nabız noktaları (vuruşlar = çift sekizlikler)
      for (let s = 0; s < S; s += 2) {
        const x = x0 + s * cw;
        const now = cur >= s && cur < s + 1;
        const col = s % 8 === 0 ? C.tonic : C.ink;
        ctx.save();
        if (now) { ctx.shadowColor = col; ctx.shadowBlur = 18; }
        ctx.fillStyle = rgba(col, now ? 1 : 0.4);
        ctx.beginPath(); ctx.arc(x + 3, pulseY, s % 8 === 0 ? 8 : 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // notalar
      MEL[mode].forEach(([o, m, d]) => {
        const r = PITCH.indexOf(m), off = o % 2 === 1;
        const ht = Math.min(rh - 8, 22), x = x0 + o * cw + 2, y = top + r * rh + (rh - ht) / 2, wd = d * cw - 4;
        const playing = cur >= o && cur < o + d;
        const col = off ? C.tension : C.ink;
        ctx.save();
        if (playing) { ctx.shadowColor = col; ctx.shadowBlur = 16; }
        ctx.fillStyle = rgba(col, playing ? 1 : 0.75);
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, wd, ht, 4) : ctx.rect(x, y, wd, ht); ctx.fill();
        // nota başı (başlangıç anı)
        ctx.fillStyle = off ? "#ff8b9e" : "#ffffff";
        ctx.fillRect(x, y, 4, ht);
        ctx.restore();
        if (off) {
          // vurgu işareti ve nabızla ilişki
          text(ctx, ">", x + 4, top - 14, { size: 16, color: C.tension, weight: 700 });
          ctx.strokeStyle = rgba(C.tension, 0.35); ctx.setLineDash([3, 4]);
          ctx.beginPath(); ctx.moveTo(x, top - 8); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
        }
      });
      if (p >= 0) {
        const x = x0 + cur * cw;
        ctx.strokeStyle = C.brass; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, pulseY - 14); ctx.lineTo(x, bot); ctx.stroke();
      }
      for (let b = 0; b < 2; b++) text(ctx, `${b + 1}. ölçü`, x0 + b * 8 * cw + 4, bot + 22, { size: 12, color: C.muted });
      const offs = MEL[mode].filter((n) => n[0] % 2).length;
      text(ctx, offs ? `${offs} nota vuruşun arasında başlıyor` : "Bütün notalar vuruşun üstünde başlıyor", x1, bot + (narrowR ? 46 : 22), { size: 13, color: offs ? C.tension : C.ink2, align: "right", weight: 600 });
    }
    st = canvas(cv, () => draw());
    const lp = loop(draw);
    const btn = playButton(tr, ["Çal", "Durdur"]);
    const sg = seg([["duz", "Düz"], ["senkop", "Senkoplu"]], mode, (k) => { mode = k; }, "Zamanlama");
    stage.append(h("div.controls", sg, btn, h("span.spacer"), h("span.legend", h("span", h("i", { style: { background: C.ink } }), "vuruşta"), h("span", h("i", { style: { background: C.tension } }), "vuruş arasında (senkop)"))));
    return {
      enter() { lp.start(); },
      leave() { lp.stop(); tr.stop(); btn.sync(); },
    };
  };
  G.senkop = [{ click: "Çal" }, { wait: 4200 }, { click: "Senkoplu" }, { wait: 4800 }];

  /* ---------- Poliritim ---------- */
  Demos.polyrhythm = (stage) => {
    const { cv } = stageCanvas(stage, "Poliritim: iç içe iki çember");
    let ratio = [3, 2], onA = true, onB = true;
    const CYCLE = 2.0;
    const steps = () => ratio[0] * ratio[1];
    const tr = Transport({
      interval: () => CYCLE / steps(),
      step(i, t) {
        const [a, b] = ratio, k = i % steps();
        const hitA = k % b === 0, hitB = k % a === 0;
        if (hitA && onA) Snd.pluck(T.mtof(79), { when: t, dur: 0.25, gain: k === 0 ? 0.32 : 0.24 });
        if (hitB && onB) Snd.pluck(T.mtof(60), { when: t, dur: 0.35, gain: k === 0 ? 0.4 : 0.32 });
        if (k === 0) Snd.drum("kick", t, 0.5);
      },
    });
    let st;
    function draw() {
      if (!st) return;
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      const [a, b] = ratio, n = steps();
      const gridH = 70, cy = (hh - gridH) / 2, cx = w / 2;
      const R1 = Math.min(w * 0.38, (hh - gridH) * 0.4), R2 = R1 * 0.58;
      const p = tr.pos(), k = p < 0 ? -1 : Math.floor(p) % n, frac = p < 0 ? 0 : p - Math.floor(p);
      const ringAng = p < 0 ? -Math.PI / 2 : -Math.PI / 2 + (Math.PI * 2 * (p % n)) / n;
      const ring = (R, cnt, col, on, label) => {
        ctx.strokeStyle = rgba(col, on ? 0.35 : 0.1); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
        // çokgen: vuruşları birleştirir
        ctx.strokeStyle = rgba(col, on ? 0.25 : 0.06); ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 0; j <= cnt; j++) { const an = -Math.PI / 2 + (Math.PI * 2 * j) / cnt; const x = cx + Math.cos(an) * R, y = cy + Math.sin(an) * R; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        for (let j = 0; j < cnt; j++) {
          const an = -Math.PI / 2 + (Math.PI * 2 * j) / cnt;
          const step = (j * n) / cnt;
          const lit = k === step ? 1 - frac * 0.8 : 0;
          const meet = j === 0;
          const c = meet ? C.tonic : col;
          ctx.save();
          if (lit && on) { ctx.shadowColor = c; ctx.shadowBlur = 26 * lit; }
          ctx.fillStyle = rgba(c, on ? 0.45 + 0.55 * lit : 0.12);
          ctx.beginPath(); ctx.arc(cx + Math.cos(an) * R, cy + Math.sin(an) * R, (meet ? 13 : 10) * (1 + 0.3 * lit), 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        text(ctx, label, cx + R * 0.72 + 14, cy - R * 0.72 - 4, { size: 15, color: rgba(col, on ? 1 : 0.4), font: FONT.display, weight: 700 });
      };
      ring(R1, a, C.ink, onA, String(a));
      ring(R2, b, C.wave, onB, String(b));
      // ibre
      ctx.strokeStyle = rgba(C.brass, p < 0 ? 0.3 : 0.9); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ringAng) * (R1 + 12), cy + Math.sin(ringAng) * (R1 + 12)); ctx.stroke();
      ctx.fillStyle = C.brass; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
      // doğrusal ızgara
      const gw = Math.min(w - 40, 520), cw = gw / n, gx = cx - gw / 2, gy = hh - gridH + 4, rh = 22;
      [[a, b, C.ink, onA], [b, a, C.wave, onB]].forEach(([cnt, every, col, on], r) => {
        for (let s = 0; s < n; s++) {
          const hit = s % every === 0;
          const x = gx + s * cw, y = gy + r * (rh + 6);
          ctx.fillStyle = s === k ? rgba(C.ink, 0.12) : rgba(C.ink, 0.04);
          ctx.fillRect(x + 1, y, cw - 2, rh);
          if (hit) { ctx.fillStyle = rgba(s === 0 ? C.tonic : col, on ? 0.85 : 0.2); ctx.fillRect(x + 3, y + 3, cw - 6, rh - 6); }
        }
        text(ctx, String(cnt), gx - 10, gy + r * (rh + 6) + 16, { size: 13, color: col, align: "right", weight: 700 });
      });
    }
    st = canvas(cv, () => draw());
    const lp = loop(draw);
    const btn = playButton(tr);
    const bA = h("button.btn.on", { type: "button" }, "Dış çember (3)");
    const bB = h("button.btn.on", { type: "button" }, "İç çember (2)");
    function labels() { bA.textContent = `Dış çember (${ratio[0]})`; bB.textContent = `İç çember (${ratio[1]})`; bA.classList.toggle("on", onA); bB.classList.toggle("on", onB); }
    bA.addEventListener("click", () => { onA = !onA; labels(); });
    bB.addEventListener("click", () => { onB = !onB; labels(); });
    const sg = seg([["32", "3:2"], ["43", "4:3"]], "32", (k) => { ratio = k === "32" ? [3, 2] : [4, 3]; labels(); tr.restart(); }, "Oran");
    stage.append(h("div.controls", sg, btn, h("span.spacer"), bA, bB));
    return {
      enter() { lp.start(); },
      leave() { lp.stop(); tr.stop(); btn.sync(); },
    };
  };
  G.poliritim = [{ click: "Başlat" }, { wait: 3000 }, { click: "4:3" }, { wait: 3000 }, { click: "İç çember" }, { wait: 2200 }, { click: "İç çember" }];
})();
