/* 2. bölüm (Oranlar ve akort) demoları */
(function () {
  const { C, FONT, rgba, mix, canvas, loop, h, slider, seg, clamp, lerp, fmtHz, fmtNum, fmtCents, text } = L;
  const G = (window.GuideScenarios = window.GuideScenarios || {});

  // Sethares modeliyle aynı tını: altı harmonik, genlikler 0,88^k
  const HARM = Array.from({ length: 6 }, (_, k) => Math.pow(0.88, k));

  /* --- ortak yardımcılar --- */
  function stageCanvas(stage, label, touch = "pan-y") {
    const fill = h("div.fill");
    const cv = h("canvas", { "aria-label": label });
    cv.style.touchAction = touch;
    fill.append(cv);
    stage.append(fill);
    return { fill, cv };
  }
  // işaretçi: sentetik (rehber) ve gerçek olaylarla çalışır
  function pointer(cv, { down, move, up }) {
    let active = false;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener("pointerdown", (e) => {
      active = true;
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      const [x, y] = pos(e);
      down && down(x, y, e);
    });
    cv.addEventListener("pointermove", (e) => { const [x, y] = pos(e); move && move(x, y, active, e); });
    const end = (e) => { if (!active) return; active = false; const [x, y] = pos(e); up && up(x, y, e); };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
  }
  function timers() {
    const ids = [];
    return { set(fn, ms) { ids.push(setTimeout(fn, ms)); }, clear() { ids.forEach(clearTimeout); ids.length = 0; } };
  }
  // oranın adı: oktav fazlası "Oktav + …" olarak
  function ratioName(n, d) {
    let k = 0, r = n / d;
    while (r > 2 + 1e-9) { r /= 2; k++; }
    const [a, b] = T.fraction(r, 16);
    const iv = T.INTERVALS.find((x) => x.oran[0] === a && x.oran[1] === b);
    if (!iv) return null;
    const pre = k === 0 ? "" : k === 1 ? "Oktav + " : "İki oktav + ";
    if (iv.s === 0) return k === 1 ? "Oktav" : k === 2 ? "İki oktav" : "Birli";
    if (iv.s === 12) return k === 0 ? "Oktav" : k === 1 ? "İki oktav" : "Üç oktav";
    return pre + iv.ad.toLocaleLowerCase("tr").replace(/^./, (c) => (pre ? c : c.toLocaleUpperCase("tr")));
  }
  function roundRect(ctx, x, y, w, hh, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hh, r); ctx.arcTo(x + w, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  const hz = (f) => fmtNum(f, f < 1000 ? 1 : 0) + " Hz";

  /* ================= Monokord ================= */
  Demos.monochord = (stage) => {
    const { cv } = stageCanvas(stage, "Monokord: köprüyü sürükleyin");
    cv.style.cursor = "ew-resize";
    const F0 = T.mtof(48); // açık tel: Do3
    const MARKS = [[1, 2], [2, 3], [3, 4]];
    const OTHER = [[1, 3], [1, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [5, 8]];
    const ALL = MARKS.concat(OTHER);
    let b = 0.58, dragging = false, lastSnap = null;
    const vib = [{ amp: 0, ph: 0 }, { amp: 0, ph: 0 }];
    const tm = timers();

    // basit bir kesre birkaç cent yakınsa kesri döndür
    function snapOf(x) {
      const [n, d] = T.fraction(x, 8);
      const err = T.cents(1 / x) - T.cents(d / n);
      return Math.abs(err) < 6 ? { n, d, key: n + "/" + d, mark: MARKS.some(([a, c]) => a === n && c === d) } : null;
    }
    function magnet(x) {
      for (const [n, d] of ALL) if (Math.abs(x - n / d) < 0.009) return n / d;
      return x;
    }
    function geo() {
      const { w, h: hh } = st;
      const xa = w * 0.07, xb = w * 0.93, sy = hh * 0.42;
      return { w, hh, xa, xb, Lw: xb - xa, sy, boxT: sy + 18, boxB: sy + 18 + clamp(hh * 0.22, 90, 170) };
    }
    function pluck(which = "both") {
      const t0 = Snd.now() + 0.02;
      if (which !== "right") { Snd.pluck(F0 / b, { gain: 0.3, dur: 1.6, when: t0 }); vib[0].amp = 9; }
      if (which !== "left") { Snd.pluck(F0 / (1 - b), { gain: 0.26, dur: 1.6, when: t0 + (which === "both" ? 0.14 : 0) }); vib[1].amp = 9; }
    }
    function setB(x, fromDrag) {
      b = clamp(magnet(x), 0.1, 0.9);
      range.set(b);
      const s = snapOf(b);
      const key = s ? s.key : null;
      if (key && key !== lastSnap && fromDrag) pluck("both");
      lastSnap = key;
    }

    let st;
    function draw(dt) {
      if (!st || !st.w) return;
      const { ctx } = st;
      const g = geo();
      ctx.clearRect(0, 0, g.w, g.hh);
      vib.forEach((v, i) => { v.amp *= Math.exp(-dt * 1.3); v.ph += dt * Math.PI * 2 * (i === 0 ? 5 + 1.2 / b : 5 + 1.2 / (1 - b)); });
      const snap = snapOf(b);
      // gövde
      const gr = ctx.createLinearGradient(0, g.boxT, 0, g.boxB);
      gr.addColorStop(0, "#5c3428"); gr.addColorStop(1, "#3b2018");
      ctx.fillStyle = gr; roundRect(ctx, g.xa - 22, g.boxT, g.Lw + 44, g.boxB - g.boxT, 6); ctx.fill();
      ctx.strokeStyle = rgba(C.brass, 0.45); ctx.lineWidth = 1; ctx.stroke();
      // ahşap damarı
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      for (let i = 1; i < 6; i++) {
        const y = g.boxT + ((g.boxB - g.boxT) * i) / 6;
        ctx.beginPath(); ctx.moveTo(g.xa - 18, y);
        ctx.bezierCurveTo(g.xa + g.Lw * 0.3, y + 4, g.xa + g.Lw * 0.6, y - 4, g.xb + 18, y + 1); ctx.stroke();
      }
      // cetvel: kesir işaretleri
      ALL.forEach(([n, d]) => {
        const x = g.xa + (g.Lw * n) / d;
        const isMark = MARKS.some(([a, c]) => a === n && c === d);
        const on = snap && snap.n === n && snap.d === d;
        ctx.strokeStyle = isMark ? rgba(C.tonic, on ? 1 : 0.75) : rgba(C.ink, on ? 0.9 : 0.25);
        ctx.lineWidth = isMark ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(x, g.boxT + 2); ctx.lineTo(x, g.boxT + (isMark ? 22 : 12)); ctx.stroke();
        if (!isMark && !on && g.w < 560) return;
        text(ctx, `${n}/${d}`, x, g.boxT + (isMark ? 38 : 27), { size: isMark ? 13 : 10, color: isMark ? C.tonic : rgba(C.ink, on ? 0.9 : 0.45), align: "center", weight: isMark ? 700 : 500 });
      });
      // eşikler
      ctx.fillStyle = C.brass;
      [g.xa, g.xb].forEach((x) => ctx.fillRect(x - 2, g.sy - 4, 4, g.boxT - g.sy + 4));
      // tel parçaları
      const bx = g.xa + g.Lw * b;
      [[g.xa, bx, vib[0]], [bx, g.xb, vib[1]]].forEach(([x0, x1, v]) => {
        ctx.save();
        const live = v.amp > 0.6;
        ctx.strokeStyle = live ? C.wave : rgba(C.ink, 0.85);
        ctx.lineWidth = 2;
        if (live) { ctx.shadowColor = C.wave; ctx.shadowBlur = 12; }
        ctx.beginPath();
        for (let k = 0; k <= 60; k++) {
          const u = k / 60, x = lerp(x0, x1, u), y = g.sy + v.amp * Math.sin(Math.PI * u) * Math.sin(v.ph);
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      });
      // köprü
      ctx.save();
      const hot = snap && snap.mark;
      ctx.fillStyle = hot ? C.tonic : "#e9dcc0";
      if (hot || dragging) { ctx.shadowColor = hot ? C.tonic : C.ink; ctx.shadowBlur = 16; }
      ctx.beginPath(); ctx.moveTo(bx - 10, g.boxT); ctx.lineTo(bx + 10, g.boxT); ctx.lineTo(bx + 2, g.sy + 1); ctx.lineTo(bx - 2, g.sy + 1); ctx.closePath(); ctx.fill();
      ctx.restore();
      text(ctx, "‹ ›", bx, g.sy - 14, { size: 13, color: rgba(C.ink, 0.5), align: "center" });

      // üst bilgi: sol parçanın uzunluğu ve frekans oranı
      const ty = Math.max(50, g.hh * 0.22);
      if (snap) {
        text(ctx, `${snap.n}/${snap.d}`, g.xa, ty, { size: 42, font: FONT.display, weight: 600, color: snap.mark ? C.tonic : C.ink });
        ctx.font = `600 42px ${FONT.display}`;
        const wf = ctx.measureText(`${snap.n}/${snap.d}`).width;
        const nm = ratioName(snap.d, snap.n);
        text(ctx, `uzunluk  →  frekans ${snap.d}:${snap.n}`, g.xa + wf + 16, ty - 18, { size: 14, color: C.ink2 });
        text(ctx, nm || "", g.xa + wf + 16, ty + 2, { size: 16, weight: 700, color: snap.mark ? C.tonic : C.ink });
      } else {
        text(ctx, fmtNum(b, 2), g.xa, ty, { size: 42, font: FONT.display, weight: 600, color: rgba(C.ink, 0.55) });
        ctx.font = `600 42px ${FONT.display}`;
        const wf = ctx.measureText(fmtNum(b, 2)).width;
        text(ctx, `uzunluk  →  frekans ×${fmtNum(1 / b, 3)}`, g.xa + wf + 16, ty - 18, { size: 14, color: C.ink2 });
        text(ctx, "basit bir orana yaklaştırın", g.xa + wf + 16, ty + 2, { size: 14, color: C.muted });
      }
      // alt bilgi: iki parça
      const iy = g.boxB + 34;
      const fl = F0 / b, fr = F0 / (1 - b);
      const sr = T.fraction(fr / fl, 8), between = Math.abs(T.cents(fr / fl) - T.cents(sr[0] / sr[1])) < 6 ? sr : null;
      const cols = [
        ["Sol parça", hz(fl), C.wave],
        ["Sağ parça", hz(fr), C.wave],
        ["İki parça arası", between ? `${Math.max(...between)}:${Math.min(...between)} ${ratioName(Math.max(...between), Math.min(...between)) || ""}` : "pürüzlü", between ? C.tonic : C.tension],
      ];
      const narrow = g.w < 560;
      cols.forEach(([a, v, c], i) => {
        const x = narrow ? g.xa : g.xa + (g.Lw * i) / 3, y = narrow ? iy + i * 38 : iy;
        text(ctx, a, x, y, { size: 12, color: C.muted });
        text(ctx, v, x, y + 19, { size: 15, weight: 600, color: i === 2 ? c : C.ink });
      });
      text(ctx, `Açık tel: ${hz(F0)} (Do3)`, g.xb, narrow ? iy : iy + 19, { size: 12, color: C.muted, align: "right" });
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);

    pointer(cv, {
      down(x, y) {
        const g = geo();
        const bx = g.xa + g.Lw * b;
        if (Math.abs(x - bx) < 30 && y > g.sy - 50 && y < g.boxB) { dragging = true; return; }
        if (Math.abs(y - g.sy) < 40 && x > g.xa && x < g.xb) pluck(x < bx ? "left" : "right");
      },
      move(x, y, active) {
        if (!active || !dragging) return;
        const g = geo();
        setB((x - g.xa) / g.Lw, true);
      },
      up() { if (dragging) { dragging = false; pluck("both"); } },
    });

    const range = slider({ label: "Köprü", min: 0.1, max: 0.9, step: 0.001, value: b, fmt: (v) => fmtNum(v, 3), oninput: (v) => setB(v, true) });
    range.classList.add("rt-range");
    stage.append(h("div.controls", range,
      h("button.btn", { type: "button", onclick: () => pluck("both") }, "Çal"),
      h("button.btn", { type: "button", onclick: () => { Snd.pluck(F0, { gain: 0.3, dur: 1.8 }); vib[0].amp = vib[1].amp = 6; } }, "Açık tel")));
    return { enter() { lp.start(); }, leave() { lp.stop(); tm.clear(); dragging = false; } };
  };
  {
    const bx = (b) => 0.07 + 0.86 * b;
    G.monokord = [{ drag: "css:canvas", path: [[bx(0.58), 0.42], [bx(2 / 3), 0.42], [bx(1 / 2), 0.42]], pause: 1100, speed: 4 }];
  }

  /* ================= Konsonans ve dissonans ================= */
  Demos.consonance = (stage) => {
    const { cv } = stageCanvas(stage, "Pürüzlülük eğrisi: ikinci sesi sürükleyin");
    cv.style.cursor = "ew-resize";
    const F1 = T.mtof(60);
    const N = 601;
    const curve = new Float32Array(N);
    for (let i = 0; i < N; i++) curve[i] = T.roughness(F1, F1 * Math.pow(2, (i * 2) / 1200), 6, 0.88);
    let mn = Infinity, mx = -Infinity;
    curve.forEach((v) => { mn = Math.min(mn, v); mx = Math.max(mx, v); });
    for (let i = 0; i < N; i++) curve[i] = (curve[i] - mn) / (mx - mn);
    const rough = (c) => { const x = clamp(c / 2, 0, N - 1), i = Math.floor(x), f = x - i; return lerp(curve[i], curve[Math.min(N - 1, i + 1)], f); };
    const VALLEYS = [[1, 1], [6, 5], [5, 4], [4, 3], [3, 2], [8, 5], [5, 3], [2, 1]].map(([n, d]) => ({ n, d, c: T.cents(n / d) }));
    let c2 = 40, dragging = false, playing = false, d1 = null, d2 = null, t0 = 0;

    const f2 = () => F1 * Math.pow(2, c2 / 1200);
    function geo() { const { w, h: hh } = st; return { w, hh, xL: w * 0.06, xR: w * 0.96, cT: hh * 0.1, cB: hh * 0.54, bT: hh * 0.7, bB: hh * 0.94 }; }
    const xOf = (c, g) => g.xL + ((g.xR - g.xL) * c) / 1200;
    function startSound() {
      if (playing) return;
      d1 = Snd.own(Snd.drone({ amps: HARM, freq: F1, gain: 0.13 }));
      d2 = Snd.own(Snd.drone({ amps: HARM, freq: f2(), gain: 0.13 }));
      playing = !!d1;
      btn.textContent = playing ? "Sesi durdur" : "Dinle"; btn.classList.toggle("on", playing);
    }
    function stopSound() {
      d1 && d1.stop(); d2 && d2.stop(); d1 = d2 = null; playing = false;
      btn.textContent = "Dinle"; btn.classList.remove("on");
    }
    function setC(c) {
      c = clamp(c, 0, 1200);
      for (const v of VALLEYS) if (Math.abs(c - v.c) < 6) c = v.c;
      c2 = c;
      d2 && d2.setFreq(f2(), 0.015);
      range.set(Math.round(c2));
      readout();
    }
    const info = h("span.readout");
    function readout() {
      const v = VALLEYS.find((x) => Math.abs(x.c - c2) < 0.01);
      const df = f2() - F1;
      const name = v ? `${ratioName(v.n, v.d)} ${v.n}:${v.d}` : "≈ " + T.interval(Math.round(c2 / 100)).ad;
      const r = rough(c2);
      const beat = df < 0.05 ? "vuru yok" : df < 22 ? `vuru <b>${fmtNum(df, 1)} Hz</b>` : r < 0.3 ? `<span class="c-tonic">pürüz az</span>` : `<span class="c-tension">pürüzlü</span>`;
      info.innerHTML = `<b>${fmtNum(f2(), 1)} Hz</b> · ${fmtNum(c2, 0)} cent · ${name} · ${beat}`;
    }

    let st;
    function draw(dt) {
      if (!st || !st.w) return;
      const { ctx } = st, g = geo();
      t0 += dt * 0.25;
      ctx.clearRect(0, 0, g.w, g.hh);
      // eğri
      const yOf = (r) => g.cB - (g.cB - g.cT) * r;
      ctx.beginPath(); ctx.moveTo(g.xL, g.cB);
      for (let i = 0; i < N; i++) ctx.lineTo(xOf(i * 2, g), yOf(curve[i]));
      ctx.lineTo(g.xR, g.cB); ctx.closePath();
      const fg = ctx.createLinearGradient(0, g.cT, 0, g.cB);
      fg.addColorStop(0, rgba(C.tension, 0.28)); fg.addColorStop(1, rgba(C.tension, 0.02));
      ctx.fillStyle = fg; ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < N; i++) { const x = xOf(i * 2, g), y = yOf(curve[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.strokeStyle = C.tension; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = rgba(C.ink, 0.2); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(g.xL, g.cB + 0.5); ctx.lineTo(g.xR, g.cB + 0.5); ctx.stroke();
      text(ctx, "pürüzlü", g.xL, g.cT - 6, { size: 12, color: C.tension });
      text(ctx, "Do4 ile ikinci ses arasındaki aralık (cent)", g.xR, g.cT - 6, { size: 12, color: C.muted, align: "right" });
      // vadiler
      const small = g.w < 560;
      VALLEYS.forEach((v, i) => {
        const x = xOf(v.c, g), y = yOf(rough(v.c));
        ctx.fillStyle = C.tonic; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
        if (small && (v.n === 6 || v.n === 8)) return;
        text(ctx, `${v.n}:${v.d}`, x, g.cB + 18, { size: small ? 11 : 13, weight: 700, color: C.tonic, align: "center" });
      });
      // ikinci ses
      const x2 = xOf(c2, g), r2 = rough(c2), col = mix(C.tonic, C.tension, clamp(r2 * 1.6, 0, 1));
      ctx.strokeStyle = rgba(C.ink, 0.6); ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(x2, g.cT); ctx.lineTo(x2, g.cB); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(x2, yOf(r2), dragging ? 9 : 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // vuru: iki sinüsün toplamı, 1 saniyelik pencere
      text(ctx, "İki sesin toplamı · 1 saniye", g.xL, g.bT - 10, { size: 12, color: C.muted });
      const df = f2() - F1;
      if (df > 0.05 && df < 22) text(ctx, `saniyede ${fmtNum(df, 1)} vuru`, g.xR, g.bT - 10, { size: 12, color: C.wave, align: "right" });
      const cols = Math.max(50, Math.floor(g.xR - g.xL)), W = 1, mid = (g.bT + g.bB) / 2, amp = (g.bB - g.bT) / 2;
      const top = [], bot = [];
      for (let i = 0; i < cols; i++) {
        let lo = Infinity, hi = -Infinity;
        for (let s = 0; s < 6; s++) {
          const t = t0 + ((i + s / 6) * W) / cols;
          const v = (Math.sin(2 * Math.PI * F1 * t) + Math.sin(2 * Math.PI * f2() * t)) / 2;
          if (v < lo) lo = v; if (v > hi) hi = v;
        }
        top.push(hi); bot.push(lo);
      }
      ctx.beginPath();
      for (let i = 0; i < cols; i++) ctx.lineTo(g.xL + (i * (g.xR - g.xL)) / cols, mid - top[i] * amp);
      for (let i = cols - 1; i >= 0; i--) ctx.lineTo(g.xL + (i * (g.xR - g.xL)) / cols, mid - bot[i] * amp);
      ctx.closePath(); ctx.fillStyle = rgba(C.wave, 0.5); ctx.fill();
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);
    pointer(cv, {
      down(x, y) { const g = geo(); dragging = true; startSound(); setC(((x - g.xL) / (g.xR - g.xL)) * 1200); },
      move(x, y, active) { if (!active || !dragging) return; const g = geo(); setC(((x - g.xL) / (g.xR - g.xL)) * 1200); },
      up() { dragging = false; },
    });
    const range = slider({ label: "İkinci ses", min: 0, max: 1200, step: 1, value: c2, fmt: (v) => fmtNum(v, 0) + " c", oninput: (v) => { startSound(); setC(v); } });
    const btn = h("button.btn", { type: "button", onclick: () => (playing ? stopSound() : startSound()) }, "Dinle");
    stage.append(h("div.controls", range, btn, h("span.spacer"), info));
    readout();
    return { enter() { lp.start(); }, leave() { lp.stop(); stopSound(); dragging = false; } };
  };
  {
    const fx = (c) => 0.06 + (0.9 * c) / 1200;
    G.konsonans = [{ drag: "css:canvas", path: [[fx(40), 0.36], [fx(T.cents(5 / 4)), 0.36], [fx(T.cents(3 / 2)), 0.36]], pause: 1200, speed: 5 }];
  }

  /* ================= Perde sarmalı ================= */
  Demos.pitchhelix = (stage) => {
    const { cv } = stageCanvas(stage, "Perde sarmalı: sürükleyerek döndürün, bir notaya tıklayın", "none");
    cv.style.cursor = "grab";
    const M0 = 36, M1 = 83, MID = (M0 + M1) / 2;
    const SIDE = 0.3, TOP = Math.PI / 2;
    let yaw = -0.6, tilt = SIDE, tiltGoal = SIDE, yawGoal = null, topView = false, auto = true, sel = null, flash = 0;
    let dragging = false, moved = 0, lx = 0, ly = 0, proj = [];
    const tm = timers();

    function geo() { const { w, h: hh } = st; const S = Math.min(w, hh * 1.05); return { w, hh, cx: w / 2, cy: hh * 0.5, R: S * 0.27, Hh: hh * 0.165 }; }
    function P(m, g) {
      const phi = ((m - M0) / 12) * 2 * Math.PI;
      const X = g.R * Math.sin(phi), Z = -g.R * Math.cos(phi), Y = ((m - MID) / 12) * g.Hh;
      const X1 = X * Math.cos(yaw) - Z * Math.sin(yaw), Z1 = X * Math.sin(yaw) + Z * Math.cos(yaw);
      const sy = -Y * Math.cos(tilt) + Z1 * Math.sin(tilt);
      const d = Z1 * Math.cos(tilt) + Y * Math.sin(tilt);
      const F = g.R * 7, s = F / (F - d);
      return { x: g.cx + X1 * s, y: g.cy + sy * s, d, s };
    }
    let st;
    function draw(dt) {
      if (!st || !st.w) return;
      const { ctx } = st, g = geo();
      if (auto && !topView && !dragging) yaw += dt * 0.16;
      tilt += (tiltGoal - tilt) * Math.min(1, dt * 4);
      if (yawGoal != null) { yaw += (yawGoal - yaw) * Math.min(1, dt * 4); if (Math.abs(yawGoal - yaw) < 0.002) { yaw = yawGoal; yawGoal = null; } }
      flash = Math.max(0, flash - dt * 0.5);
      ctx.clearRect(0, 0, g.w, g.hh);
      const topness = clamp((tilt - 0.9) / (TOP - 0.9), 0, 1);
      // sarmal çizgisi
      let prev = P(M0, g);
      for (let m = M0 + 0.1; m <= M1 + 0.001; m += 0.1) {
        const p = P(m, g);
        const a = 0.1 + 0.32 * clamp((p.d / g.R + 1) / 2, 0, 1);
        ctx.strokeStyle = rgba(C.ink, a); ctx.lineWidth = 1.2 * p.s;
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        prev = p;
      }
      // seçili notanın oktav eşlerini birleştiren çizgi
      if (sel != null) {
        const pts = [];
        for (let m = M0; m <= M1; m++) if (T.pcOf(m) === sel) pts.push(P(m, g));
        ctx.strokeStyle = rgba(C.tonic, 0.55 + 0.4 * flash); ctx.lineWidth = 2;
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      }
      // yukarıdan bakışta perde sınıfı adları
      if (topness > 0.02) {
        for (let pc = 0; pc < 12; pc++) {
          const phi = (pc / 12) * 2 * Math.PI + yaw;
          const r = g.R * 1.48;
          text(ctx, T.SHARP[pc], g.cx + r * Math.sin(phi), g.cy - r * Math.cos(phi) + 5, {
            size: 14, weight: pc === sel ? 700 : 600, align: "center", color: rgba(pc === sel ? C.tonic : C.ink, topness * (pc === sel ? 1 : 0.8)),
          });
        }
      }
      // noktalar (uzaktan yakına)
      proj = [];
      for (let m = M0; m <= M1; m++) proj.push({ m, ...P(m, g) });
      proj.sort((a, b) => a.d - b.d);
      proj.forEach((p) => {
        const pc = T.pcOf(p.m), on = pc === sel;
        const depth = clamp((p.d / g.R + 1) / 2, 0, 1);
        const r = (T.isBlack(pc) ? 3.6 : 4.8) * p.s * (on ? 1.4 : 1);
        ctx.save();
        if (on) { ctx.shadowColor = C.tonic; ctx.shadowBlur = 10 + 18 * flash; ctx.fillStyle = C.tonic; }
        else ctx.fillStyle = T.isBlack(pc) ? rgba(C.ink, 0.25 + 0.35 * depth) : rgba(C.ink, 0.45 + 0.5 * depth);
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if ((on || pc === 0) && topness < 0.5) {
          text(ctx, T.name(p.m), p.x + r + 6, p.y + 4, { size: 11, weight: on ? 700 : 500, color: rgba(on ? C.tonic : C.ink2, (1 - topness * 2) * (on ? 1 : 0.75)) });
        }
      });
      // yükseklik oku (yandan bakış)
      if (topness < 0.5) {
        const a = 1 - topness * 2, x = g.w - Math.max(24, g.w * 0.05);
        ctx.strokeStyle = rgba(C.ink, 0.3 * a); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, g.hh * 0.82); ctx.lineTo(x, g.hh * 0.18); ctx.lineTo(x - 4, g.hh * 0.18 + 7); ctx.moveTo(x, g.hh * 0.18); ctx.lineTo(x + 4, g.hh * 0.18 + 7); ctx.stroke();
        text(ctx, "tiz", x, g.hh * 0.18 - 8, { size: 11, color: rgba(C.muted, a), align: "center" });
      } else text(ctx, "Yukarıdan bakınca her oktav bir çembere iner: aynı adlı notalar aynı yönde dizilir.", 16, 24, { size: 12, color: rgba(C.muted, topness) });
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);

    const info = h("span.readout");
    function select(pc) {
      sel = pc; flash = 1;
      notes.forEach((b, i) => b.classList.toggle("on", i === pc));
      const ms = [];
      for (let m = M0; m <= M1; m++) if (T.pcOf(m) === pc) ms.push(m);
      info.innerHTML = `<b>${T.SHARP[pc]}</b>: ${ms.map((m) => fmtNum(T.mtof(m), 1)).join(" · ")} Hz · her oktav ×2`;
      const t0 = Snd.now() + 0.02;
      ms.forEach((m, i) => Snd.pluck(T.mtof(m), { when: t0 + i * 0.17, gain: 0.24, dur: 0.8 }));
      const tc = t0 + ms.length * 0.17 + 0.2;
      ms.forEach((m) => Snd.pluck(T.mtof(m), { when: tc, gain: 0.16, dur: 1.8 }));
    }
    pointer(cv, {
      down(x, y) { dragging = true; moved = 0; lx = x; ly = y; cv.style.cursor = "grabbing"; },
      move(x, y, active) {
        if (!active || !dragging) return;
        const dx = x - lx, dy = y - ly; lx = x; ly = y; moved += Math.abs(dx) + Math.abs(dy);
        if (moved < 4) return;
        auto = false; yawGoal = null;
        yaw += dx * 0.01;
        tilt = clamp(tilt + dy * 0.006, 0.02, TOP); tiltGoal = tilt;
        const nowTop = tilt > 1.2;
        if (nowTop !== topView) { topView = nowTop; topBtn.textContent = topView ? "Yandan bak" : "Yukarıdan bak"; }
      },
      up(x, y) {
        dragging = false; cv.style.cursor = "grab";
        if (moved >= 5) return;
        for (let i = proj.length - 1; i >= 0; i--) {
          const p = proj[i];
          if (Math.hypot(p.x - x, p.y - y) < 16) { select(T.pcOf(p.m)); return; }
        }
      },
    });
    const topBtn = h("button.btn", { type: "button", onclick: () => {
      topView = !topView;
      tiltGoal = topView ? TOP : SIDE;
      if (topView) { yawGoal = Math.round(yaw / (2 * Math.PI)) * 2 * Math.PI; auto = false; }
      topBtn.textContent = topView ? "Yandan bak" : "Yukarıdan bak";
    } }, "Yukarıdan bak");
    const notes = T.SHARP.map((n, pc) => h("button.ph-note" + (T.isBlack(pc) ? ".blk" : ""), { type: "button", onclick: () => select(pc) }, n));
    stage.append(h("div.controls", topBtn, h("div.ph-notes", { role: "group", "aria-label": "Perde sınıfı seç" }, notes), info));
    info.textContent = "Bir notaya tıklayın";
    return { enter() { lp.start(); }, leave() { lp.stop(); tm.clear(); dragging = false; } };
  };
  G["perde-cemberi"] = [{ drag: "css:canvas", path: [[0.42, 0.5], [0.62, 0.46]], speed: 4 }, { click: "Yukarıdan bak" }, { wait: 1500 }, { click: "=Sol" }];

  /* ================= Pisagor koması ================= */
  Demos.comma = (stage) => {
    const { cv } = stageCanvas(stage, "Beşliler sarmalı");
    const FIFTH = T.cents(3 / 2);
    const NAMES = ["Do", "Sol", "Re", "La", "Mi", "Si", "Fa♯", "Do♯", "Sol♯", "Re♯", "La♯", "Mi♯", "Si♯"];
    const DO4 = T.mtof(60);
    let step = 0, grow = 1;
    const tm = timers();
    const pcCents = (k) => ((k * FIFTH) % 1200 + 1200) % 1200;
    const freqOf = (k) => DO4 * Math.pow(2, pcCents(k) / 1200);
    const SI_SHARP = DO4 * Math.pow(2, T.PYTHAGOREAN_COMMA / 1200);

    function geo() {
      const { w, h: hh } = st, S = Math.min(w, hh);
      return { w, hh, cx: w / 2, cy: hh * 0.52, r0: S * 0.12, r12: S * 0.36 };
    }
    function pt(k, g, rk = k) {
      const a = (pcCents(k) / 1200) * 2 * Math.PI, r = g.r0 + ((g.r12 - g.r0) * rk) / 12;
      return { x: g.cx + r * Math.sin(a), y: g.cy - r * Math.cos(a), a, r };
    }
    let st;
    function draw(dt) {
      if (!st || !st.w) return;
      const { ctx } = st, g = geo();
      grow = Math.min(1, grow + dt * 2.2);
      ctx.clearRect(0, 0, g.w, g.hh);
      // eşit tamperaman ışınları
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * 2 * Math.PI;
        ctx.strokeStyle = rgba(C.ink, j === 0 ? 0.22 : 0.08); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(g.cx + g.r0 * 0.5 * Math.sin(a), g.cy - g.r0 * 0.5 * Math.cos(a));
        ctx.lineTo(g.cx + (g.r12 + 12) * Math.sin(a), g.cy - (g.r12 + 12) * Math.cos(a)); ctx.stroke();
        const rl = g.r12 + 30;
        text(ctx, T.SHARP[j], g.cx + rl * Math.sin(a), g.cy - rl * Math.cos(a) + 4, { size: 12, color: C.muted, align: "center" });
      }
      // koma kaması
      if (step === 12) {
        const a1 = pt(12, g).a, R = g.r12 + 22;
        ctx.save();
        ctx.fillStyle = rgba(C.comma, 0.28 * grow);
        ctx.beginPath(); ctx.moveTo(g.cx, g.cy); ctx.arc(g.cx, g.cy, R, -Math.PI / 2, -Math.PI / 2 + a1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba(C.comma, grow); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(g.cx, g.cy, R, -Math.PI / 2, -Math.PI / 2 + a1); ctx.stroke();
        ctx.restore();
        const lx = g.cx + (R + 12) * Math.sin(a1 * 2.5), ly = g.cy - (R + 12) * Math.cos(a1 * 2.5) - 14;
        text(ctx, `Pisagor koması ≈ ${fmtNum(T.PYTHAGOREAN_COMMA, 2)} cent`, lx, ly, { size: 13, weight: 700, color: rgba(C.comma, grow) });
      }
      // zincir
      for (let k = 1; k <= step; k++) {
        const p0 = pt(k - 1, g), p1 = pt(k, g);
        const f = k === step ? grow : 1;
        ctx.strokeStyle = rgba(C.wave, 0.55); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(lerp(p0.x, p1.x, f), lerp(p0.y, p1.y, f)); ctx.stroke();
      }
      for (let k = 0; k <= step; k++) {
        if (k === step && grow < 0.95 && k > 0) continue;
        const p = pt(k, g), last = k === step;
        const col = k === 0 ? C.tonic : k === 12 ? C.comma : C.ink;
        ctx.save();
        if (last) { ctx.shadowColor = k === 12 ? C.comma : C.wave; ctx.shadowBlur = 14; }
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, last ? 6.5 : 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        const lr = 14, ox = Math.sin(p.a) * lr, oy = -Math.cos(p.a) * lr;
        const dev = k * (FIFTH - 700);
        if (k === 0 || k === 12) {
          text(ctx, NAMES[k], p.x + (k === 0 ? -10 : 10), p.y - 12, { size: 13, weight: 700, color: col, align: k === 0 ? "right" : "left" });
        } else {
          text(ctx, NAMES[k], p.x + ox, p.y + oy + 4, { size: 12, weight: 600, color: C.ink, align: ox < -2 ? "right" : ox > 2 ? "left" : "center" });
          if (g.w > 520) text(ctx, "+" + fmtNum(dev, 1), p.x + ox, p.y + oy + 17, { size: 10, color: C.comma, align: ox < -2 ? "right" : ox > 2 ? "left" : "center" });
        }
      }
      // merkez
      text(ctx, NAMES[step], 18, 46, { size: 34, font: FONT.display, weight: 600, color: step === 12 ? C.comma : step === 0 ? C.tonic : C.ink });
      text(ctx, step ? `${step}. beşli` : "başlangıç", 18, 66, { size: 12, color: C.muted });
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);

    const info = h("span.readout");
    function readout() {
      if (step === 0) { info.innerHTML = "Do'dan başlayın: her adım saf bir beşli (3:2)"; return; }
      const tot = step * FIFTH, dev = step * (FIFTH - 700);
      if (step < 12) info.innerHTML = `${step} beşli = <b>${fmtNum(tot, 1)} cent</b> · eşit tamperamandan <span class="c-comma">+${fmtNum(dev, 2)} cent</span>`;
      else info.innerHTML = `12 beşli = <b>${fmtNum(tot, 2)}</b> cent, 7 oktav = <b>${fmtNum(8400, 0)}</b> cent · fark <span class="c-comma"><b>${fmtNum(T.PYTHAGOREAN_COMMA, 2)} cent</b></span> = 3¹²/2¹⁹ = ${fmtNum(Math.pow(3, 12), 0)}/${fmtNum(Math.pow(2, 19), 0)}`;
    }
    function add() {
      if (step >= 12) return;
      step++; grow = 0;
      // önceki nota ile saf beşli: art arda, sonra birlikte
      const f0 = freqOf(step - 1), t0 = Snd.now() + 0.02;
      const fNew = step === 12 ? SI_SHARP : f0 * 1.5 > DO4 * 2.01 ? f0 * 0.75 : f0 * 1.5;
      Snd.pluck(f0, { when: t0, gain: 0.24, dur: 0.5 });
      Snd.pluck(fNew, { when: t0 + 0.3, gain: 0.24, dur: 1.2 });
      sync(); readout();
    }
    function sync() {
      addBtn.disabled = step >= 12; allBtn.disabled = step >= 12;
      seqBtn.disabled = togBtn.disabled = step < 12;
    }
    const tone = (f, when, dur) => Snd.note(f, { amps: HARM, when, dur, attack: 0.03, release: 0.5, gain: 0.2 });
    const addBtn = h("button.btn.primary", { type: "button", onclick: add }, "Beşli ekle");
    const allBtn = h("button.btn", { type: "button", onclick: () => { tm.clear(); for (let i = 0; step + i < 12; i++) tm.set(add, i * 420); } }, "Zinciri tamamla");
    const seqBtn = h("button.btn", { type: "button", onclick: () => { const t0 = Snd.now() + 0.02; tone(DO4, t0, 0.9); tone(SI_SHARP, t0 + 1.1, 0.9); } }, "Art arda");
    const togBtn = h("button.btn", { type: "button", onclick: () => { const t0 = Snd.now() + 0.02; tone(DO4, t0, 3.2); tone(SI_SHARP, t0, 3.2); info.innerHTML = `Do ${fmtNum(DO4, 2)} Hz, Si♯ ${fmtNum(SI_SHARP, 2)} Hz · saniyede <b>${fmtNum(SI_SHARP - DO4, 1)}</b> vuru`; } }, "Birlikte");
    const resetBtn = h("button.btn", { type: "button", onclick: () => { tm.clear(); step = 0; grow = 1; sync(); readout(); } }, "Sıfırla");
    stage.append(h("div.controls", addBtn, allBtn, seqBtn, togBtn, resetBtn, info));
    sync(); readout();
    return { enter() { lp.start(); }, leave() { lp.stop(); tm.clear(); } };
  };
  G["pisagor-komasi"] = [{ click: "Beşli ekle" }, { wait: 700 }, { click: "Beşli ekle" }, { wait: 700 }, { click: "Beşli ekle" }];

  /* ================= Akort sistemleri ================= */
  Demos.tuning = (stage) => {
    stage.classList.add("tu-stage");
    const { cv } = stageCanvas(stage, "Üç akort sisteminde üçlü vurusu");
    const SYS = [["pythagorean", "Pisagor"], ["just", "Saf"], ["equal", "Eşit tamperaman"]];
    const NOTES = [[60, "Do"], [64, "Mi"], [67, "Sol"]];
    let sys = "equal", lit = 0, t0 = 0;
    const tm = timers();
    const fr = (m, s) => T.tunedFreq(m, s, 60);
    // Do'nun 5. harmoniği ile Mi'nin 4. harmoniği; Do'nun 3. ile Sol'ün 2. harmoniği
    const beat3 = (s) => Math.abs(4 * fr(64, s) - 5 * fr(60, s));
    const beat5 = (s) => Math.abs(2 * fr(67, s) - 3 * fr(60, s));

    let st;
    function draw(dt) {
      if (!st || !st.w) return;
      const { ctx, w, h: hh } = st;
      t0 += dt; lit = Math.max(0, lit - dt * 0.4);
      ctx.clearRect(0, 0, w, hh);
      const xL = w * 0.05, xR = w * 0.95, narrow = w < 560;
      const labW = narrow ? 0 : 150;
      const top = narrow ? 22 : 30, laneH = (hh - top - 10) / 3;
      text(ctx, "Do–Mi üçlüsünde vuru: Do'nun 5. ve Mi'nin 4. harmoniği · 2 saniye", xL, top - 12, { size: 12, color: C.muted });
      SYS.forEach(([k, name], i) => {
        const y0 = top + i * laneH, mid = y0 + laneH / 2 + (narrow ? 8 : 0), on = k === sys;
        const b = beat3(k), calm = b < 0.3;
        const col = calm ? C.tonic : C.tension;
        if (on) { ctx.fillStyle = rgba(C.ink, 0.04); ctx.fillRect(xL - 8, y0 + 2, xR - xL + 16, laneH - 4); }
        const lx = xL, ly = narrow ? y0 + 16 : mid - 4;
        text(ctx, name, lx, ly, { size: narrow ? 13 : 15, weight: 700, color: on ? C.ink : C.ink2 });
        const sub = calm ? "vuru yok" : `${fmtNum(b, 1)} vuru/sn`;
        text(ctx, sub, narrow ? xR : lx, narrow ? ly : ly + 18, { size: 12, color: col, align: narrow ? "right" : "left", weight: 600 });
        // zarf bandı
        const x0 = xL + labW, W = xR - x0, amp = laneH * (narrow ? 0.26 : 0.32) * (on ? 1 : 0.75);
        const cols = Math.floor(W / 2);
        ctx.beginPath();
        for (let j = 0; j <= cols; j++) { const t = t0 * 0.5 + (j / cols) * 2; ctx.lineTo(x0 + (j / cols) * W, mid - amp * Math.abs(Math.cos(Math.PI * b * t))); }
        for (let j = cols; j >= 0; j--) { const t = t0 * 0.5 + (j / cols) * 2; ctx.lineTo(x0 + (j / cols) * W, mid + amp * Math.abs(Math.cos(Math.PI * b * t))); }
        ctx.closePath();
        ctx.fillStyle = rgba(col, on ? 0.42 + 0.3 * lit : 0.2); ctx.fill();
      });
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);

    const tbody = h("tbody");
    const table = h("table.data.tu-table", h("thead", h("tr", h("th", "Nota"), h("th", "Oran"), h("th", "Frekans"), h("th", "Eşit'e göre"))), tbody);
    const note = h("p.tu-note");
    function ratioText(r, s, semis) {
      if (s === "equal") return semis ? `2^(${semis}/12)` : "1/1";
      const [n, d] = T.fraction(r, 128);
      return Math.abs(n / d - r) < 1e-9 ? `${n}/${d}` : fmtNum(r, 4);
    }
    function render() {
      tbody.innerHTML = "";
      NOTES.forEach(([m, nm]) => {
        const semis = m - 60, r = T.TUNINGS[sys][semis], f = fr(m, sys);
        const dev = T.cents(r) - semis * 100;
        tbody.append(h("tr",
          h("td", nm), h("td", ratioText(r, sys, semis)), h("td", fmtNum(f, 2) + " Hz"),
          h("td", { class: Math.abs(dev) > 0.05 ? "c-comma" : "" }, Math.abs(dev) < 0.05 ? "0" : fmtCents(dev, 1))));
      });
      const b5 = beat5(sys);
      note.innerHTML = `Do–Sol beşlisi: ${b5 < 0.05 ? "vuru yok, saf" : `<span class="c-comma">${fmtNum(b5, 2)} vuru/sn</span>, çok hafif`}`;
    }
    function play(s) {
      sys = s; sg.set(s); render(); lit = 1;
      const t = Snd.now() + 0.02;
      NOTES.forEach(([m]) => Snd.note(fr(m, s), { amps: HARM, when: t, dur: 2.2, attack: 0.03, release: 0.5, gain: 0.15 }));
    }
    const sg = seg(SYS, sys, (k) => { tm.clear(); play(k); }, "Akort sistemi");
    const again = h("button.btn", { type: "button", onclick: () => { tm.clear(); play(sys); } }, "Akoru çal");
    const all = h("button.btn", { type: "button", onclick: () => { tm.clear(); SYS.forEach(([k], i) => tm.set(() => play(k), i * 2700)); } }, "Hepsini sırayla");
    stage.append(h("div.tu-info", table, note));
    stage.append(h("div.controls", sg, again, all));
    render();
    return { enter() { lp.start(); }, leave() { lp.stop(); tm.clear(); } };
  };
  G["akort-sistemleri"] = [{ click: "=Pisagor" }, { wait: 2600 }, { click: "=Saf" }, { wait: 2600 }, { click: "=Eşit tamperaman" }];

  /* ================= Türk müziği ve koma ================= */
  Demos.makam = (stage) => {
    const { cv } = stageCanvas(stage, "53 komalık oktav: Hicaz dizisi ve Batı karşılığı");
    const K = T.HOLDRIAN_COMMA;
    // Arel–Ezgi–Uzdilek: dügâhta hicaz dörtlüsü (S A12 S) + nevâda rast beşlisi (T K S T)
    const STEPS = [["S", 5], ["A12", 12], ["S", 5], ["T", 9], ["K", 8], ["S", 5], ["T", 9]];
    const HICAZ = STEPS.reduce((a, [, k]) => (a.push(a[a.length - 1] + k), a), [0]);
    const PERDE = ["Dügâh", "Dik kürdî", "Nîm hicaz", "Nevâ", "Hüseynî", "Eviç", "Gerdaniye", "Muhayyer"];
    const SOLF = ["La", "Si♭", "Do♯", "Re", "Mi", "Fa♯", "Sol", "La"];
    const WEST = [0, 1, 4, 5, 7, 9, 10, 12];
    const BASE = T.mtof(57); // La3
    const hc = HICAZ.map((k) => k * K), wc = WEST.map((s) => s * 100);
    let hl = null; // { row: 0|1, i }
    const tm = timers();

    let st;
    function draw() {
      if (!st || !st.w) return;
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      const narrow = w < 560;
      const xL = w * 0.07, xR = w * 0.93, xOf = (c) => xL + ((xR - xL) * c) / 1200;
      const yH = hh * (narrow ? 0.36 : 0.37), yW = hh * 0.72;
      // başlıklar
      text(ctx, `Hicaz dizisi · 1 koma = 1200/53 ≈ ${fmtNum(K, 2)} cent`, xL, hh * 0.07, { size: narrow ? 12 : 13, weight: 700, color: C.ink });
      text(ctx, "Batı karşılığı · 12 eşit yarım ses", xL, hh * 0.96, { size: narrow ? 12 : 13, weight: 700, color: C.ink });
      // dörtlü / beşli parantezleri
      const br = (c0, c1, lab) => {
        const y = yH - (narrow ? 44 : 56), x0 = xOf(c0) + 3, x1 = xOf(c1) - 3;
        ctx.strokeStyle = rgba(C.ink, 0.35); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, y + 6); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y + 6); ctx.stroke();
        text(ctx, lab, (x0 + x1) / 2, y - 6, { size: narrow ? 10 : 12, color: C.ink2, align: "center" });
      };
      br(hc[0], hc[3], narrow ? "Hicaz dörtlüsü" : "Hicaz dörtlüsü (S A12 S)");
      br(hc[3], hc[7], narrow ? "Rast beşlisi" : "Rast beşlisi (T K S T)");
      // koma ızgarası
      ctx.strokeStyle = rgba(C.comma, 0.5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xL, yH); ctx.lineTo(xR, yH); ctx.stroke();
      for (let k = 0; k <= 53; k++) {
        const x = Math.round(xOf(k * K)) + 0.5, len = k % 9 === 0 ? 7 : 4;
        ctx.beginPath(); ctx.moveTo(x, yH - len); ctx.lineTo(x, yH + len); ctx.stroke();
      }
      // 12 TET ızgarası
      ctx.strokeStyle = rgba(C.ink, 0.35);
      ctx.beginPath(); ctx.moveTo(xL, yW); ctx.lineTo(xR, yW); ctx.stroke();
      for (let s = 0; s <= 12; s++) { const x = Math.round(xOf(s * 100)) + 0.5; ctx.beginPath(); ctx.moveTo(x, yW - 5); ctx.lineTo(x, yW + 5); ctx.stroke(); }
      // fark çizgileri
      for (let i = 0; i < 8; i++) {
        const x1 = xOf(hc[i]), x2 = xOf(wc[i]), d = hc[i] - wc[i];
        ctx.strokeStyle = rgba(C.comma, Math.abs(d) > 0.5 ? 0.55 : 0.2); ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(x1, yH + 10); ctx.lineTo(x2, yW - 10); ctx.stroke(); ctx.setLineDash([]);
        if (Math.abs(d) > 0.5) {
          const s = (d > 0 ? "+" : "−") + fmtNum(Math.abs(d), 1);
          text(ctx, narrow ? s : s + " c", (x1 + x2) / 2 + 4, (yH + yW) / 2 + 4, { size: narrow ? 10 : 12, weight: 700, color: C.comma, align: "left" });
        }
      }
      // adım etiketleri
      for (let i = 0; i < 7; i++) {
        const xm = (xOf(hc[i]) + xOf(hc[i + 1])) / 2;
        text(ctx, narrow ? String(STEPS[i][1]) : `${STEPS[i][0]} ${STEPS[i][1]}`, xm, yH + 24, { size: narrow ? 10 : 12, color: C.ink2, align: "center" });
        const xw = (xOf(wc[i]) + xOf(wc[i + 1])) / 2;
        text(ctx, String(WEST[i + 1] - WEST[i]), xw, yW - 14, { size: narrow ? 10 : 12, color: C.ink2, align: "center" });
      }
      if (!narrow) {
        text(ctx, "koma", xR + 6, yH + 24, { size: 11, color: C.muted });
        text(ctx, "yarım ses", xR + 6, yW - 14, { size: 11, color: C.muted });
      }
      // perdeler
      const dot = (x, y, i, row) => {
        const on = hl && hl.row === row && hl.i === i;
        const col = i === 0 || i === 7 ? C.tonic : C.ink;
        ctx.save();
        if (on) { ctx.shadowColor = C.wave; ctx.shadowBlur = 18; }
        ctx.fillStyle = on ? C.wave : col;
        ctx.beginPath(); ctx.arc(x, y, on ? 8 : 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      };
      for (let i = 0; i < 8; i++) {
        const x = xOf(hc[i]);
        dot(x, yH, i, 0);
        text(ctx, SOLF[i], x, yH - 12, { size: narrow ? 11 : 13, weight: 700, align: "center", color: i === 0 || i === 7 ? C.tonic : C.ink });
        if (!narrow) text(ctx, PERDE[i], x, yH - 28, { size: 11, align: "center", color: C.muted });
        text(ctx, String(HICAZ[i]), x, yH + 40, { size: 10, align: "center", color: rgba(C.comma, 0.8) });
        const xw = xOf(wc[i]);
        dot(xw, yW, i, 1);
        text(ctx, SOLF[i], xw, yW + 24, { size: narrow ? 11 : 13, weight: 700, align: "center", color: i === 0 || i === 7 ? C.tonic : C.ink });
        if (!narrow) text(ctx, fmtNum(wc[i], 0) + " c", xw, yW + 40, { size: 10, align: "center", color: C.muted });
      }
    }
    st = canvas(cv, () => draw());
    const lp = loop(draw);

    const freqs = [HICAZ.map((k) => BASE * Math.pow(2, k / 53)), WEST.map((s) => BASE * Math.pow(2, s / 12))];
    function playRow(row, delay = 0) {
      const t0 = Snd.now() + 0.05 + delay / 1000;
      freqs[row].forEach((f, i) => {
        Snd.pluck(f, { when: t0 + i * 0.46, gain: 0.28, dur: i === 7 ? 1.4 : 0.55 });
        tm.set(() => { hl = { row, i }; }, delay + 50 + i * 460);
      });
      tm.set(() => { hl = null; }, delay + 50 + 8 * 460 + 600);
      return 8 * 460 + 700;
    }
    const go = (fn) => () => { tm.clear(); hl = null; fn(); };
    stage.append(h("div.controls",
      h("button.btn", { type: "button", onclick: go(() => playRow(0)) }, "Hicaz dizisini çal"),
      h("button.btn", { type: "button", onclick: go(() => playRow(1)) }, "Batı karşılığını çal"),
      h("button.btn", { type: "button", onclick: go(() => { const d = playRow(0); playRow(1, d); }) }, "Art arda")));
    return { enter() { lp.start(); }, leave() { lp.stop(); tm.clear(); hl = null; } };
  };
  G["turk-muzigi"] = [{ click: "Hicaz dizisini çal" }, { wait: 4400 }, { click: "Batı karşılığını çal" }];

  /* ================= Lissajous: iki titreşimin dansı =================
     Birinci ses yatayda (x), ikinci ses dikeyde (y) salınır; nokta ikisinin birleşimini çizer.
     Oran p:q (en sade hâliyle) ise eğri, birinci ses q tur attığında kendi üzerine kapanır.
     Eşit tamperamanlı aralıklar basit bir orana denk gelmediği için hiç kapanmaz, yavaşça kayar. */
  Demos.lissajous = (stage) => {
    const { cv } = stageCanvas(stage, "Lissajous eğrisi: yatayda birinci ses, dikeyde ikinci ses");
    const F1 = T.mtof(60);
    const PHI = Math.PI / 4;           // başlangıç faz farkı: şekiller düz çizgiye dönüşmesin
    const MAXTURNS = 40;               // kapanmayan eğrilerde gösterilen son tur sayısı
    const PRESETS = [
      { k: "oktav", ad: "Oktav", n: 2, d: 1 },
      { k: "besli", ad: "Beşli", n: 3, d: 2 },
      { k: "dortlu", ad: "Dörtlü", n: 4, d: 3 },
      { k: "b3", ad: "Büyük üçlü", n: 5, d: 4 },
      { k: "k3", ad: "Küçük üçlü", n: 6, d: 5 },
      { k: "k2", ad: "Küçük ikili", n: 16, d: 15 },
      { k: "triton", ad: "Triton", n: 45, d: 32 },
      { k: "et5", ad: "Eşit beşli", n: null, d: null, cents: 700 },
    ];
    let ratio = 1.5, close = 2, cur = "besli", tau = 0, speed = 1, closedAt = -1, playing = false, d1 = null, d2 = null;

    // yalnızca listedeki sade oranlar kapanır (birinci ses payda kadar tur atınca);
    // kaydırıcıdaki ara değerler basit bir orana denk gelmez ve eğri kayar
    function setRatio(r, key) {
      ratio = r; cur = key || null;
      const p = PRESETS.find((x) => x.k === key);
      close = p && p.n ? p.d : Infinity;
      tau = 0; closedAt = -1;
      if (d2) d2.setFreq(F1 * ratio);
      upd();
    }
    const difficulty = (q) => (q === Infinity ? 1 : clamp(Math.log2(q) / 5, 0, 1));
    const curveColor = () => mix(C.tonic, C.tension, difficulty(close));
    const X = (t) => Math.sin(2 * Math.PI * t);
    const Y = (t) => Math.sin(2 * Math.PI * ratio * t + PHI);

    let st;
    function geo() {
      const { w, h: hh } = st;
      const wide = w > 760;
      const side = Math.min(wide ? w * 0.52 : w - 90, hh - 110);
      const strip = Math.min(72, side * 0.2);
      const sx = wide ? 24 + strip + 18 : (w - side + strip + 12) / 2;
      const sy = 30;
      return { w, hh, wide, side, strip, sx, sy, R: side / 2 - 12, cx: sx + side / 2, cy: sy + side / 2 };
    }
    function draw(dt) {
      if (!st) return;
      tau += dt * speed;
      if (close !== Infinity && tau >= close && closedAt < 0) closedAt = performance.now();
      const g = geo(), { ctx, w, hh } = { ctx: st.ctx, w: g.w, hh: g.hh };
      ctx.clearRect(0, 0, w, hh);
      // çerçeve ve eksenler
      ctx.strokeStyle = rgba(C.ink, 0.12); ctx.lineWidth = 1;
      ctx.strokeRect(g.sx + 0.5, g.sy + 0.5, g.side, g.side);
      ctx.beginPath(); ctx.moveTo(g.sx, g.cy); ctx.lineTo(g.sx + g.side, g.cy); ctx.moveTo(g.cx, g.sy); ctx.lineTo(g.cx, g.sy + g.side); ctx.stroke();
      const P = (t) => [g.cx + g.R * X(t), g.cy - g.R * Y(t)];
      // eğri: kapanana kadar çizilen yol (kapanmayanlarda son MAXTURNS tur)
      const end = close === Infinity ? tau : Math.min(tau, close);
      const start = close === Infinity ? Math.max(0, tau - MAXTURNS) : 0;
      const col = curveColor();
      const steps = Math.max(2, Math.ceil((end - start) * 260));
      ctx.save();
      ctx.lineJoin = "round";
      ctx.strokeStyle = col; ctx.globalAlpha = closedAt >= 0 ? 0.9 : 0.5; ctx.lineWidth = closedAt >= 0 ? 1.8 : 1.2;
      if (closedAt >= 0) { ctx.shadowColor = col; ctx.shadowBlur = 10; }
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) { const [x, y] = P(start + ((end - start) * i) / steps); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // son tur parlak iz
      ctx.globalAlpha = 1; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.lineWidth = 2.4;
      ctx.beginPath();
      const t0 = Math.max(0, tau - 0.35);
      for (let i = 0; i <= 60; i++) { const [x, y] = P(t0 + ((tau - t0) * i) / 60); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.restore();
      // kapanma parlaması
      if (closedAt >= 0) {
        const a = clamp(1 - (performance.now() - closedAt) / 1400, 0, 1);
        if (a > 0) { ctx.strokeStyle = rgba(C.tonic, a); ctx.lineWidth = 3; ctx.strokeRect(g.sx + 0.5, g.sy + 0.5, g.side, g.side); }
      }
      // basitleştirilmiş titreşimler: altta birinci ses (zaman aşağı akar), solda ikinci ses (zaman sola akar)
      const [px, py] = P(tau);
      const span = 1.5, n = 120;
      ctx.save();
      ctx.lineWidth = 1.8; ctx.strokeStyle = C.tonic; ctx.shadowColor = C.tonic; ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const t = tau - (span * i) / n; const x = g.cx + g.R * X(t), y = g.sy + g.side + 10 + (g.strip * i) / n; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.strokeStyle = C.wave; ctx.shadowColor = C.wave;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) { const t = tau - (span * i) / n; const y = g.cy - g.R * Y(t), x = g.sx - 10 - (g.strip * i) / n; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.restore();
      // izdüşüm çizgileri ve nokta
      ctx.setLineDash([3, 4]); ctx.strokeStyle = rgba(C.ink, 0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, g.sy + g.side + 10); ctx.moveTo(px, py); ctx.lineTo(g.sx - 10, py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.tonic; ctx.beginPath(); ctx.arc(px, g.sy + g.side + 10, 4, 0, 7); ctx.fill();
      ctx.fillStyle = C.wave; ctx.beginPath(); ctx.arc(g.sx - 10, py, 4, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff8e6"; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      text(ctx, "1. ses (Do4)", g.cx, g.sy + g.side + g.strip + 26, { size: 12, color: C.tonic, align: "center", weight: 600 });
      ctx.save(); ctx.translate(g.sx - g.strip - 20, g.cy); ctx.rotate(-Math.PI / 2);
      text(ctx, "2. ses", 0, 0, { size: 12, color: C.wave, align: "center", weight: 600 }); ctx.restore();
      // tur sayacı
      const turns = Math.floor(close === Infinity ? tau : Math.min(tau, close));
      const yTurns = Math.floor((close === Infinity ? tau : Math.min(tau, close)) * ratio + 1e-6);
      text(ctx, `1. ses ${turns} tur · 2. ses ${yTurns} tur`, g.sx + 6, g.sy - 10, { size: 13, color: C.ink2, weight: 600 });
      let msg, mc;
      if (close === Infinity) { msg = "Kapanmıyor: eğri her turda biraz kayıyor"; mc = C.tension; }
      else if (closedAt >= 0) { msg = `Kapandı: ${close} turda`; mc = mix(C.tonic, C.tension, difficulty(close)); }
      else { msg = `${close} turda kapanacak`; mc = C.ink2; }
      text(ctx, msg, g.sx + g.side - 6, g.sy - 10, { size: 13, color: mc, weight: 700, align: "right" });
      // sağda: kapanmak için gereken tur sayısı (log ölçek)
      if (g.wide) {
        const x0 = g.sx + g.side + 40, x1 = w - 24, bw = x1 - x0 - 150;
        let y = g.sy + 16;
        text(ctx, "Kapanmak için gereken tur", x0, y, { size: 13, color: C.ink, weight: 700 });
        y += 22;
        const maxL = Math.log2(64);
        PRESETS.forEach((p) => {
          const q = p.d || Infinity, on = p.k === cur;
          const len = q === Infinity ? bw : Math.max(6, (Math.log2(q) / maxL) * bw * 0.92 + 6);
          text(ctx, p.ad, x0, y + 11, { size: 12, color: on ? C.ink : C.ink2, weight: on ? 700 : 500 });
          text(ctx, p.n ? `${p.n}:${p.d}` : "700 c", x0 + 88, y + 11, { size: 11, color: C.muted });
          ctx.globalAlpha = on ? 1 : 0.55;
          ctx.fillStyle = mix(C.tonic, C.tension, difficulty(q));
          ctx.fillRect(x0 + 150, y + 2, q === Infinity ? bw : len, 10);
          ctx.globalAlpha = 1;
          text(ctx, q === Infinity ? "∞" : String(q), x0 + 150 + (q === Infinity ? bw : len) + 6, y + 11, { size: 12, color: on ? C.ink : C.muted, weight: 700 });
          y += 24;
        });
        y += 10;
        const lines = ["Basit oran → kısa sürede kapanan,", "sakin bir şekil (konsonans).", "Karmaşık oran → uzun, düğümlü yol;", "kapanmayan oran → durmadan kayan", "şekil (vuru, pürüz)."];
        lines.forEach((l, i) => text(ctx, l, x0, y + i * 17, { size: 12, color: C.muted }));
      }
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);

    const segEl = seg(PRESETS.map((p) => [p.k, p.ad]), cur, (k) => {
      const p = PRESETS.find((x) => x.k === k);
      const r = p.n ? p.n / p.d : Math.pow(2, p.cents / 1200);
      sl.set(T.cents(r));
      setRatio(r, k);
    }, "Aralık");
    const sl = slider({ label: "İkinci ses", min: 0, max: 1200, step: 1, value: 702, fmt: (v) => fmtNum(v, 0) + " c",
      oninput: (v) => {
        // basit bir orana 3 cent yakınsa ona otur
        let r = Math.pow(2, v / 1200), key = null;
        for (const p of PRESETS) if (p.n && Math.abs(v - T.cents(p.n / p.d)) < 3) { r = p.n / p.d; key = p.k; }
        segEl.set(key);
        setRatio(r, key);
      } });
    const spd = seg([[0.5, "Yavaş"], [1, "Orta"], [3, "Hızlı"]], 1, (v) => { speed = v; }, "Hız");
    const readout = h("span.readout");
    function upd() {
      const name = cur ? PRESETS.find((p) => p.k === cur).ad : null;
      const p = PRESETS.find((x) => x.k === cur);
      readout.innerHTML = `<b>${hz(F1)}</b> ve <b>${hz(F1 * ratio)}</b> · oran ${p && p.n ? p.n + ":" + p.d : "≈ " + fmtNum(ratio, 4)}${name ? " · " + name : ""}`;
    }
    const listen = h("button.btn", { type: "button", onclick: () => {
      if (playing) { d1 && d1.stop(); d2 && d2.stop(); d1 = d2 = null; playing = false; }
      else {
        d1 = Snd.own(Snd.drone({ amps: HARM, freq: F1, gain: 0.12 }));
        d2 = Snd.own(Snd.drone({ amps: HARM, freq: F1 * ratio, gain: 0.12 }));
        playing = !!d1;
      }
      listen.textContent = playing ? "Sesi durdur" : "Dinle"; listen.classList.toggle("on", playing);
    } }, "Dinle");
    const restart = h("button.btn", { type: "button", onclick: () => { tau = 0; closedAt = -1; } }, "Baştan çiz");
    stage.append(h("div.controls.top", segEl), h("div.controls", sl, listen, restart, spd, h("span.spacer"), readout));
    upd();
    return {
      enter() { lp.start(); },
      leave() { lp.stop(); if (d1) d1.stop(); if (d2) d2.stop(); d1 = d2 = null; playing = false; listen.textContent = "Dinle"; listen.classList.remove("on"); },
    };
  };
  G.lissajous = [{ click: "=Oktav" }, { wait: 2200 }, { click: "=Beşli" }, { wait: 3200 }, { click: "=Küçük ikili" }];
})();
