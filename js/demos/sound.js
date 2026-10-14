/* Giriş ve 1. bölüm (Ses nedir?) demoları */
(function () {
  const { C, FONT, rgba, canvas, loop, h, slider, seg, clamp, lerp, fmtHz, fmtNum, text } = L;
  const G = (window.GuideScenarios = window.GuideScenarios || {});
  const GT = (window.GuideTargets = window.GuideTargets || {});

  /* ---------- Kapak: parlayan teller ----------
     Yatay teller; fare üzerinden geçince ya da dokununca tel titreşir ve gamdan bir nota çalar.
     Strings(stage, { scale }) kapanışta da kullanılır. */
  function Strings(stage, opts = {}) {
    const cv = h("canvas", { "aria-label": "Çalınabilir teller" });
    cv.style.touchAction = "none";
    stage.append(cv);
    let scale = opts.scale || T.SCALES.pentaMajor.steps;
    let tonic = opts.tonic ?? 50; // Re3
    let strings = [];
    const N = opts.count || 15;
    function build() {
      const notes = [];
      let m = tonic, k = 0;
      while (notes.length < N) { notes.push(m); m += scale[k % scale.length]; k++; }
      strings = notes.reverse().map((m, i) => ({ m, i, amp: 0, phase: 0, x0: 0.5, born: 0, lit: 0 }));
    }
    build();
    let st;
    const sparks = [];
    function yOf(i, hh) { const top = hh * 0.08, bot = hh * 0.92; return top + ((bot - top) * (i + 0.5)) / N; }
    function draw(dt, t) {
      if (!st) return;
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      // sahne ışığı: sol üstten
      const gl = ctx.createRadialGradient(w * 0.75, hh * 0.25, 0, w * 0.75, hh * 0.25, Math.max(w, hh) * 0.8);
      gl.addColorStop(0, "rgba(242,190,75,0.06)"); gl.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gl; ctx.fillRect(0, 0, w, hh);
      // köprüler (pirinç eşikler)
      const xa = w * 0.04, xb = w * 0.96;
      ctx.fillStyle = rgba(C.brass, 0.5);
      ctx.fillRect(xa - 3, hh * 0.05, 3, hh * 0.9); ctx.fillRect(xb, hh * 0.05, 3, hh * 0.9);
      strings.forEach((s) => {
        s.amp *= Math.exp(-dt * 1.4);
        s.lit *= Math.exp(-dt * 1.8);
        s.phase += dt * (8 + (N - s.i) * 0.9) * Math.PI * 2;
        const y = yOf(s.i, hh);
        const isTonic = T.pcOf(s.m) === T.pcOf(tonic);
        const base = isTonic ? C.tonic : C.ink;
        const alpha = 0.22 + 0.6 * s.lit + (isTonic ? 0.12 : 0);
        ctx.save();
        ctx.strokeStyle = rgba(base === C.ink ? "#efe4cc" : base, alpha);
        ctx.lineWidth = 1 + (N - s.i) * 0.09 + s.lit * 1.2;
        if (s.lit > 0.05) { ctx.shadowColor = isTonic ? C.tonic : C.wave; ctx.shadowBlur = 18 * s.lit; }
        ctx.beginPath();
        const segs = 90;
        for (let k = 0; k <= segs; k++) {
          const u = k / segs, x = lerp(xa, xb, u);
          // tel iki ucundan sabit: tetiklenen noktada en büyük
          const env = u < s.x0 ? u / s.x0 : (1 - u) / (1 - s.x0);
          const dy = s.amp * env * Math.sin(s.phase) * (1 + 0.3 * Math.sin(u * Math.PI * 3 + s.phase * 0.5));
          k ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy);
        }
        ctx.stroke();
        ctx.restore();
      });
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.fillStyle = rgba(p.c, Math.min(1, p.life * 1.5) * 0.8);
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    st = canvas(cv, () => draw(0, 0));
    const lp = loop(draw);
    function pluck(i, x, strength = 1) {
      const s = strings[i]; if (!s) return;
      const { w, h: hh } = st;
      s.x0 = clamp(x / w, 0.1, 0.9);
      s.amp = Math.min(hh / N * 0.45, 4 + 10 * strength);
      s.lit = 1;
      Snd.pluck(T.mtof(s.m), { gain: 0.26 * strength, dur: 1.6 });
      const isTonic = T.pcOf(s.m) === T.pcOf(tonic);
      for (let k = 0; k < 7; k++) sparks.push({ x, y: yOf(i, hh), vx: (Math.random() - 0.5) * 120, vy: -20 - Math.random() * 60, life: 0.6 + Math.random() * 0.5, c: isTonic ? C.tonic : C.wave });
      opts.onpluck && opts.onpluck(s.m);
    }
    // fare telleri geçtiğinde çalar
    let lastY = null, lastX = 0;
    function pos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function crossed(y0, y1, x) {
      const { h: hh } = st;
      strings.forEach((s) => {
        const y = yOf(s.i, hh);
        if ((y0 - y) * (y1 - y) <= 0 && y0 !== y1) pluck(s.i, x, 0.8);
      });
    }
    cv.addEventListener("pointermove", (e) => {
      const [x, y] = pos(e);
      if (lastY != null && (e.pointerType === "mouse" || e.buttons)) crossed(lastY, y, x);
      lastY = y; lastX = x;
    });
    cv.addEventListener("pointerleave", () => { lastY = null; });
    cv.addEventListener("pointerdown", (e) => {
      const [x, y] = pos(e);
      lastY = y;
      const { h: hh } = st;
      let best = 0, bd = Infinity;
      strings.forEach((s) => { const d = Math.abs(yOf(s.i, hh) - y); if (d < bd) { bd = d; best = s.i; } });
      pluck(best, x, 1);
    });
    return {
      enter() { lp.start(); },
      leave() { lp.stop(); },
      setScale(steps, t) { scale = steps; if (t != null) tonic = t; build(); },
      pluck,
    };
  }
  window.Strings = Strings;

  Demos.cover = (stage) => {
    const s = Strings(stage, { scale: T.SCALES.pentaMajor.steps, tonic: 50 });
    // ilk açılışta tek bir glissando: görsel olarak telleri tanıt (ses kilitliyse yalnız görsel)
    let intro = false;
    return {
      enter() {
        s.enter();
        if (intro) return;
        intro = true;
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        for (let i = 0; i < 15; i++) setTimeout(() => {
          const cv = stage.querySelector("canvas"); const w = cv.getBoundingClientRect().width;
          s.pluck(14 - i, w * (0.55 + i * 0.02), 0.35);
        }, 400 + i * 70);
      },
      leave: s.leave,
    };
  };
  G.kapak = [{ tap: "css:canvas", at: [0.7, 0.3] }, { tap: "css:canvas", at: [0.78, 0.55] }, { tap: "css:canvas", at: [0.66, 0.42] }];

  /* ---------- Titreşim ve dalga ----------
     Solda hoparlör zarı; sağa doğru hava parçacıkları sıkışıp seyrelir. Altta basınç eğrisi. */
  Demos.vibration = (stage) => {
    const fill = h("div.fill"); stage.append(fill);
    const cv = h("canvas", { "aria-label": "Hava moleküllerinin sıkışıp seyrelmesi" }); fill.append(cv);
    let freq = 2; // görsel frekans (Hz, yavaşlatılmış)
    let tone = null, playing = false;
    const audible = () => 110 * Math.pow(2, (freq - 1) / 2); // 1..5 görsel → 110..~440 Hz
    const ROWS = 18, COLS = 70;
    const R = []; let rnd = 7;
    const rand = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) R.push({ c, r, jx: rand() - 0.5, jy: rand() - 0.5, hl: c === 22 && r === 9 });
    let st, phase = 0;
    function draw(dt) {
      if (!st) return;
      phase += dt * freq * Math.PI * 2;
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      const fieldTop = 24, fieldH = hh * 0.58, x0 = 90, x1 = w - 24;
      const k = (Math.PI * 2) / Math.max(120, (x1 - x0) / (freq * 0.9 + 0.4)); // dalga sayısı (görsel)
      const A = 9;
      // hoparlör
      const cone = Math.sin(phase) * A * 0.9;
      ctx.fillStyle = "#1e100d"; ctx.fillRect(20, fieldTop + fieldH * 0.2, 34, fieldH * 0.6);
      ctx.strokeStyle = C.brass; ctx.lineWidth = 1.5; ctx.strokeRect(20.5, fieldTop + fieldH * 0.2 + 0.5, 34, fieldH * 0.6);
      ctx.fillStyle = rgba(C.ink, 0.85);
      ctx.beginPath();
      ctx.moveTo(54, fieldTop + fieldH * 0.28); ctx.lineTo(70 + cone, fieldTop + fieldH * 0.08);
      ctx.lineTo(70 + cone, fieldTop + fieldH * 0.92); ctx.lineTo(54, fieldTop + fieldH * 0.72); ctx.closePath(); ctx.fill();
      // parçacıklar: yer değiştirme s(x,t) = A sin(ωt − kx)
      const dx = (x1 - x0) / COLS, dy = fieldH / ROWS;
      R.forEach((p) => {
        const bx = x0 + (p.c + 0.5 + p.jx * 0.6) * dx;
        const s = A * Math.sin(phase - k * (bx - x0));
        const x = bx + s, y = fieldTop + (p.r + 0.5 + p.jy * 0.6) * dy;
        // yoğunluk: sıkışmada parlak
        const comp = Math.cos(phase - k * (bx - x0));
        ctx.fillStyle = p.hl ? C.tonic : rgba(C.wave, 0.35 + 0.45 * Math.max(0, comp));
        ctx.beginPath(); ctx.arc(x, y, p.hl ? 3.6 : 2, 0, Math.PI * 2); ctx.fill();
      });
      // basınç eğrisi
      const gy = fieldTop + fieldH + 34, gh = hh - gy - 30;
      ctx.strokeStyle = rgba(C.ink, 0.15); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0, gy + gh / 2); ctx.lineTo(x1, gy + gh / 2); ctx.stroke();
      const data = [];
      for (let i = 0; i <= 200; i++) { const x = x0 + ((x1 - x0) * i) / 200; data.push(Math.cos(phase - k * (x - x0))); }
      L.trace(ctx, data, x0, gy, x1 - x0, gh, C.wave, 2, 8);
      text(ctx, "sıkışma", x0, gy - 6, { size: 12, color: C.ink2 });
      text(ctx, "basınç", 20, gy + gh / 2 + 4, { size: 12, color: C.muted });
      text(ctx, "seyrelme", x0, gy + gh + 16, { size: 12, color: C.ink2 });
      text(ctx, "Altın nokta tek bir molekül: yerinde ileri geri sallanır, dalga ise ilerler.", x1, fieldTop - 8, { size: 12, color: C.muted, align: "right" });
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);
    const readout = h("span.readout");
    function upd() { readout.innerHTML = playing ? `Duyulan: <b>${fmtHz(audible())}</b>` : "Animasyon yavaşlatılmış gösterim"; }
    const sl = slider({ label: "Frekans", min: 1, max: 5, step: 0.01, value: freq, fmt: (v) => "×" + fmtNum(v, 1),
      oninput: (v) => { freq = v; if (tone) tone.setFreq(audible()); upd(); } });
    const btn = h("button.btn", { type: "button", onclick: () => {
      playing = !playing;
      if (playing) { tone = Snd.own(Snd.drone({ type: "sine", freq: audible(), gain: 0.22 })); if (!tone) playing = false; }
      else if (tone) { tone.stop(); tone = null; }
      btn.textContent = playing ? "Sesi durdur" : "Sesi dinle"; btn.classList.toggle("on", playing); upd();
    } }, "Sesi dinle");
    stage.append(h("div.controls", sl, btn, h("span.spacer"), readout));
    upd();
    return {
      enter() { lp.start(); },
      leave() { lp.stop(); if (tone) { tone.stop(); tone = null; } playing = false; btn.textContent = "Sesi dinle"; btn.classList.remove("on"); upd(); },
    };
  };
  G.titresim = [{ slide: "label:Frekans", to: 4.2 }, { wait: 900 }, { slide: "label:Frekans", to: 1.6 }];
  /* ---------- ortak: logaritmik frekans ekseni ---------- */
  const F_MIN = 20, F_MAX = 20000;
  const logX = (f, x0, x1, a = F_MIN, b = F_MAX) => x0 + ((Math.log10(f) - Math.log10(a)) / (Math.log10(b) - Math.log10(a))) * (x1 - x0);
  function freqAxis(ctx, x0, x1, y, { ticks = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000], color = C.muted, size = 11, a = F_MIN, b = F_MAX } = {}) {
    ctx.strokeStyle = rgba(C.ink, 0.25); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y + 0.5); ctx.lineTo(x1, y + 0.5); ctx.stroke();
    ticks.forEach((f) => {
      const x = Math.round(logX(f, x0, x1, a, b)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
      const lab = f >= 1000 ? fmtNum(f / 1000) + " k" : String(f);
      text(ctx, lab, x, y + 18, { size, color, align: "center" });
    });
  }
  // Hz + en yakın nota + sapma
  function noteReadout(f) {
    const n = T.nearest(f);
    const c = Math.round(n.cents);
    const cs = c === 0 ? "tam" : (c > 0 ? "+" : "−") + Math.abs(c) + " cent";
    return { name: n.midi >= 12 && n.midi <= 127 ? n.name : "—", cents: cs, raw: n };
  }

  /* ---------- Frekans ve genlik: osilatör + osiloskop ---------- */
  Demos.oscillator = (stage) => {
    const fill = h("div.fill.osc-fill"); stage.append(fill);
    const cv = h("canvas", { "aria-label": "Osiloskop" }); fill.append(cv);
    let fv = 1000 * Math.log10(440 / F_MIN) / Math.log10(F_MAX / F_MIN); // 0..1000 kaydırıcı konumu
    const fOf = (v) => F_MIN * Math.pow(F_MAX / F_MIN, v / 1000);
    let freq = fOf(fv), db = -12, on = false, tone = null, phase = 0;
    const gainOf = (d) => 0.32 * Math.pow(10, d / 20);
    // ekranda gösterilen periyot sayısı: frekansla yavaşça artar (gerçek zaman penceresi etikette yazılı)
    const cyclesShown = (f) => 1.5 * Math.pow(f / 20, 0.35);
    let st;
    function draw(dt) {
      if (!st) return;
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      const pad = 22, top = 70, bot = hh - 64;
      const sx0 = pad, sx1 = w - pad, sh = bot - top;
      // ekran: ızgara
      ctx.fillStyle = "rgba(20,9,7,0.55)";
      ctx.fillRect(sx0, top, sx1 - sx0, sh);
      ctx.strokeStyle = rgba(C.ink, 0.06); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) { const x = Math.round(sx0 + (i * (sx1 - sx0)) / 10) + 0.5; ctx.moveTo(x, top); ctx.lineTo(x, bot); }
      for (let i = 0; i <= 8; i++) { const y = Math.round(top + (i * sh) / 8) + 0.5; ctx.moveTo(sx0, y); ctx.lineTo(sx1, y); }
      ctx.stroke();
      ctx.strokeStyle = rgba(C.ink, 0.16);
      ctx.beginPath(); ctx.moveTo(sx0, top + sh / 2 + 0.5); ctx.lineTo(sx1, top + sh / 2 + 0.5); ctx.stroke();
      // dalga
      const cyc = cyclesShown(freq);
      phase += dt * (on ? 1.2 : 0.4);
      const amp = Math.pow(10, db / 20);
      const N = Math.min(2400, Math.max(300, Math.round(cyc * 40)));
      const data = new Array(N);
      for (let i = 0; i < N; i++) data[i] = amp * 0.92 * Math.sin((i / (N - 1)) * cyc * Math.PI * 2 + phase);
      L.trace(ctx, data, sx0, top, sx1 - sx0, sh, on ? C.wave : rgba(C.wave, 0.45), on ? 2 : 1.5, on ? 12 : 0);
      // genlik işaretleri
      ctx.setLineDash([3, 4]); ctx.strokeStyle = rgba(C.ink, 0.25);
      [-1, 1].forEach((s) => { const y = top + sh / 2 - s * amp * 0.92 * sh / 2; ctx.beginPath(); ctx.moveTo(sx0, y); ctx.lineTo(sx0 + 40, y); ctx.stroke(); });
      ctx.setLineDash([]);
      const win = (cyc / freq) * 1000;
      text(ctx, "Ekran penceresi: " + (win >= 1 ? fmtNum(win, win < 10 ? 1 : 0) : fmtNum(win, 2)) + " ms", sx1, bot + 18, { size: 11, color: C.muted, align: "right" });
      // başlık: frekans ve nota
      const r = noteReadout(freq);
      text(ctx, fmtHz(freq), pad, 48, { size: 34, color: C.ink, font: FONT.display, weight: 600 });
      ctx.font = `600 34px ${FONT.display}`;
      const wHz = ctx.measureText(fmtHz(freq)).width;
      text(ctx, r.name, pad + wHz + 22, 48, { size: 22, color: C.tonic, font: FONT.display, weight: 600 });
      ctx.font = `600 22px ${FONT.display}`;
      const wN = ctx.measureText(r.name).width;
      text(ctx, r.cents, pad + wHz + 22 + wN + 10, 47, { size: 13, color: C.comma, weight: 600 });
      text(ctx, fmtNum(db) + " dB", w - pad, 48, { size: 18, color: C.ink2, align: "right", weight: 600 });
      // logaritmik cetvel
      const ay = hh - 30;
      // insan sesi ve piyano aralıkları
      ctx.fillStyle = rgba(C.ink, 0.07);
      const p0 = logX(27.5, sx0, sx1), p1 = logX(4186, sx0, sx1);
      ctx.fillRect(p0, ay - 9, p1 - p0, 5);
      text(ctx, "piyano", p0 + 4, ay - 13, { size: 10, color: C.muted });
      freqAxis(ctx, sx0, sx1, ay, { size: 10 });
      const mx = logX(freq, sx0, sx1);
      ctx.fillStyle = C.tonic;
      ctx.beginPath(); ctx.moveTo(mx, ay - 2); ctx.lineTo(mx - 5, ay - 10); ctx.lineTo(mx + 5, ay - 10); ctx.closePath(); ctx.fill();
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);
    const fsl = slider({ label: "Frekans", min: 0, max: 1000, step: 1, value: Math.round(fv), width: "190px", fmt: (v) => fmtHz(Math.abs(fOf(v) - freq) < freq * 0.012 ? freq : fOf(v)),
      oninput: (v) => { fv = v; freq = fOf(v); tone && tone.setFreq(freq, 0.015); } });
    const gsl = slider({ label: "Genlik", min: -40, max: 0, step: 1, value: db, fmt: (v) => fmtNum(v) + " dB",
      oninput: (v) => { db = v; tone && tone.setGain(gainOf(db)); } });
    const btn = h("button.btn.primary", { type: "button", onclick: () => toggle() }, "Osilatörü aç");
    function toggle(force) {
      on = force ?? !on;
      if (on) { tone = Snd.own(Snd.drone({ type: "sine", freq, gain: gainOf(db) })); }
      else if (tone) { tone.stop(); tone = null; }
      btn.textContent = on ? "Osilatörü kapat" : "Osilatörü aç";
      btn.classList.toggle("primary", !on); btn.classList.toggle("on", on);
    }
    const presets = h("span.osc-presets",
      [["La4", 440], ["Do4", T.mtof(60)], ["100 Hz", 100], ["1 kHz", 1000], ["10 kHz", 10000]].map(([lab, f]) =>
        h("button.chip.chip-btn", { type: "button", onclick: () => { fv = 1000 * Math.log10(f / F_MIN) / Math.log10(F_MAX / F_MIN); freq = f; fsl.set(fv); tone && tone.setFreq(freq, 0.015); } }, lab)));
    stage.append(h("div.controls", btn, fsl, gsl, presets));
    return { enter() { lp.start(); }, leave() { lp.stop(); toggle(false); } };
  };
  G.frekans = [{ click: "Osilatörü aç" }, { slide: "label:Frekans", to: 620 }, { wait: 500 }, { slide: "label:Frekans", to: 400 }, { slide: "label:Genlik", to: -24 }];

  /* ---------- Duyma sınırı: tarama testi ---------- */
  Demos.hearing = (stage) => {
    const fill = h("div.fill"); stage.append(fill);
    const cv = h("canvas", { "aria-label": "Duyma aralığı ekseni" }); fill.append(cv);
    // tarama ayarları: tiz uç 8 → 20 kHz, pes uç 200 → 20 Hz (logaritmik)
    const MODES = { hi: { from: 8000, to: 20000, sec: 22 }, lo: { from: 200, to: 20, sec: 14 } };
    let mode = "hi", running = false, t0 = 0, cur = MODES.hi.from, tone = null;
    const marks = { hi: null, lo: null };
    const sample = { hi: false, lo: false }; // gösterimin (hayalet elin) bıraktığı işaret: "örnek" diye etiketlenir
    const freqAt = (t) => { const m = MODES[mode]; const k = clamp(t / m.sec, 0, 1); return m.from * Math.pow(m.to / m.from, k); };
    // kabaca tipik üst sınırlar (kişiden kişiye çok değişir)
    const AGE = [["20 yaş altı", 17000, 20000], ["20–30 yaş", 15500, 18500], ["30–50 yaş", 12500, 16500], ["50 yaş üstü", 9000, 14000]];
    // yakın plan eksenleri: tiz uçta 5–20 kHz, pes uçta 20–400 Hz
    const ZOOM = { hi: [5000, 20000, [5000, 8000, 10000, 12000, 14000, 16000, 18000, 20000], [5000, 10000, 14000, 20000]], lo: [20, 400, [20, 30, 40, 60, 80, 100, 150, 200, 300, 400], [20, 50, 100, 200, 400]] };
    const LOW = [["piyanonun en pes notası 27,5 Hz", 27.5], ["bas gitarın en pes teli 41 Hz", 41.2], ["şebeke uğultusu 50 Hz", 50]];
    let st;
    function draw() {
      if (!st) return;
      if (running) {
        cur = freqAt((performance.now() - t0) / 1000);
        tone && tone.setFreq(cur, 0.03);
        if ((performance.now() - t0) / 1000 >= MODES[mode].sec) stop(true);
      }
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      const x0 = 30, x1 = w - 30;
      // büyük okuma
      const big = Math.min(72, w / 8);
      const top = Math.max(hh * 0.04, (hh - (big + 340)) / 2);
      text(ctx, fmtHz(cur), w / 2, top + big, { size: big, color: running ? C.ink : rgba(C.ink, 0.55), align: "center", font: FONT.display, weight: 600 });
      text(ctx, running ? "Duymadığınız an düğmeye basın" : marks[mode] ? "Kaydedildi. Yeniden deneyebilirsiniz." : "Taramayı başlatın", w / 2, top + big + 26, { size: 13, color: C.muted, align: "center" });
      // 1) tam aralık
      const ay = top + big + 104;
      const hx0 = logX(20, x0, x1), hx1 = logX(20000, x0, x1);
      const grd = ctx.createLinearGradient(hx0, 0, hx1, 0);
      grd.addColorStop(0, rgba(C.wave, 0.0)); grd.addColorStop(0.15, rgba(C.wave, 0.24)); grd.addColorStop(0.85, rgba(C.wave, 0.24)); grd.addColorStop(1, rgba(C.wave, 0.0));
      ctx.fillStyle = grd; ctx.fillRect(hx0, ay - 14, hx1 - hx0, 8);
      text(ctx, "insan kulağı: 20 Hz – 20 kHz (genç ve sağlıklı)", (hx0 + hx1) / 2, ay - 20, { size: 11, color: C.ink2, align: "center" });
      const s0 = logX(2000, x0, x1), s1 = logX(5000, x0, x1);
      ctx.fillStyle = rgba(C.tonic, 0.5); ctx.fillRect(s0, ay - 50, s1 - s0, 5);
      text(ctx, "en hassas: 2–5 kHz", (s0 + s1) / 2, ay - 56, { size: 11, color: C.tonic, align: "center" });
      const p0 = logX(27.5, x0, x1), p1 = logX(4186, x0, x1);
      ctx.fillStyle = rgba(C.ink, 0.16); ctx.fillRect(p0, ay - 37, p1 - p0, 5);
      text(ctx, "piyano 27,5 Hz – 4,2 kHz", p0, ay - 43, { size: 11, color: C.muted });
      freqAxis(ctx, x0, x1, ay, { size: w < 500 ? 9 : 11, ticks: w < 500 ? [20, 100, 1000, 10000, 20000] : undefined });
      // yakın plan bölgesi
      const [za, zb, zt, ztNarrow] = ZOOM[mode];
      const zx0 = logX(za, x0, x1), zx1 = logX(zb, x0, x1);
      const zy = Math.min(hh - 36, ay + 210);
      ctx.strokeStyle = rgba(C.brass, 0.6); ctx.lineWidth = 1;
      ctx.strokeRect(zx0 + 0.5, ay - 8.5, zx1 - zx0, 16);
      ctx.setLineDash([3, 4]);
      const ly = zy - 124;
      ctx.beginPath(); ctx.moveTo(zx0, ay + 26); ctx.lineTo(x0, ly); ctx.moveTo(zx1, ay + 26); ctx.lineTo(x1, ly); ctx.stroke();
      ctx.setLineDash([]);
      const zl = "yakın plan: " + fmtHz(za) + " – " + fmtHz(zb);
      if (mode === "hi") text(ctx, zl, x1 - 8, ay + 44, { size: 11, color: C.brass, align: "right", weight: 600 });
      else text(ctx, zl, zx1 + 8, ay + 44, { size: 11, color: C.brass, align: "left", weight: 600 });
      const zX = (f) => logX(clamp(f, za, zb), x0, x1, za, zb);
      if (mode === "hi") {
        text(ctx, "Tipik üst sınır, kabaca (kişiden kişiye çok değişir)", x0, zy - 104, { size: 11, color: C.muted });
        AGE.forEach(([lab, a, b], i) => {
          const y = zy - 88 + i * 19, xa = zX(a), xb = zX(b);
          ctx.fillStyle = rgba(C.ink, 0.1 + i * 0.04); ctx.fillRect(xa, y, xb - xa, 12);
          const inside = xa - x0 > 70;
          text(ctx, lab, inside ? xa - 8 : xb + 8, y + 10, { size: 11, color: C.ink2, align: inside ? "right" : "left" });
        });
      } else {
        LOW.forEach(([lab, f], i) => {
          const x = zX(f), y = zy - 50 + i * 15;
          ctx.fillStyle = rgba(C.ink, 0.5); ctx.fillRect(x - 1, y - 3, 2, zy - y - 4);
          text(ctx, lab, x + 6, y + 1, { size: 11, color: C.ink2 });
        });
      }
      freqAxis(ctx, x0, x1, zy, { a: za, b: zb, ticks: w < 500 ? ztNarrow : zt, size: w < 500 ? 9 : 11 });
      // tarama imleci (iki eksende)
      if (running) {
        ctx.strokeStyle = rgba(C.tonic, 0.85); ctx.lineWidth = 2;
        const cx = logX(cur, x0, x1), czx = zX(cur);
        ctx.beginPath(); ctx.moveTo(cx, ay - 12); ctx.lineTo(cx, ay + 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(czx, zy - (mode === "hi" ? 96 : 56)); ctx.lineTo(czx, zy + 6); ctx.stroke();
      }
      // kayıt
      const f = marks[mode];
      if (f) {
        const x = zX(f);
        ctx.fillStyle = C.tonic;
        ctx.beginPath(); ctx.arc(x, zy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(logX(f, x0, x1), ay, 4, 0, Math.PI * 2); ctx.fill();
        const lab = (sample[mode] ? "örnek işaret " : mode === "hi" ? "üst sınırınız " : "alt sınırınız ") + fmtHz(f);
        const right = x > w / 2;
        text(ctx, lab, x + (right ? -10 : 10), zy - 12, { size: 14, color: C.tonic, align: right ? "right" : "left", weight: 700 });
      }
    }
    st = canvas(cv, draw);
    const lp = loop(draw);
    const startBtn = h("button.btn.primary", { type: "button", onclick: () => (running ? stop(false) : start()) }, "Taramayı başlat");
    const heardBtn = h("button.btn", { type: "button", disabled: true, onclick: (e) => { if (!running) return; marks[mode] = cur; sample[mode] = !e.isTrusted; stop(false); } }, "Artık duymuyorum");
    const modeSeg = seg([["hi", "Tiz uç"], ["lo", "Pes uç"]], mode, (k) => { stop(false); mode = k; cur = MODES[k].from; }, "Tarama yönü");
    function start() {
      running = true; t0 = performance.now(); cur = MODES[mode].from;
      tone = Snd.own(Snd.drone({ type: "sine", freq: cur, gain: mode === "hi" ? 0.07 : 0.22 }));
      startBtn.textContent = "Durdur"; startBtn.classList.remove("primary");
      heardBtn.disabled = false; heardBtn.classList.add("primary");
    }
    function stop(reachedEnd) {
      if (reachedEnd && running) { marks[mode] = MODES[mode].to; sample[mode] = false; }
      running = false;
      if (tone) { tone.stop(); tone = null; }
      startBtn.textContent = "Taramayı başlat"; startBtn.classList.add("primary");
      heardBtn.disabled = true; heardBtn.classList.remove("primary");
      draw();
    }
    const warn = h("p.snd-warn", "Ses düzeyini düşük tutun. Sonuç hoparlörünüze de bağlıdır: dizüstü hoparlörleri 15 kHz üstünü zayıf verir, kulaklıkla deneyin.");
    stage.append(h("div.controls", startBtn, heardBtn, modeSeg), warn);
    return { enter() { lp.start(); }, leave() { lp.stop(); stop(false); } };
  };
  G["duyma-siniri"] = [{ click: "Taramayı başlat" }, { wait: 2600 }, { click: "Artık duymuyorum" }];

  /* ---------- Tını: aynı La, farklı çalgılar ---------- */
  // Basit taklitler: harmonik genlikleri (temel = 1) ve zarf
  const INSTR = {
    sinus: { ad: "Saf sinüs", amps: [1], attack: 0.02, decay: null, note: "Tek frekans: hiç harmonik yok. Doğada neredeyse hiç duyulmaz." },
    flut: { ad: "Flüt", amps: [1, 0.2, 0.08, 0.035, 0.015, 0.008], attack: 0.07, decay: null, note: "Temel frekans baskın, üst harmonikler hızla zayıflar: yumuşak, saf bir ses." },
    klarnet: { ad: "Klarnet", amps: [1, 0.04, 0.72, 0.03, 0.48, 0.03, 0.3, 0.02, 0.18, 0.015, 0.1, 0.01], attack: 0.04, decay: null, note: "Tek sayılı harmonikler (1, 3, 5, 7…) güçlü, çiftler neredeyse yok: boğuk, oyuk bir renk." },
    obua: { ad: "Obua", amps: [0.55, 1, 0.85, 0.5, 0.42, 0.3, 0.18, 0.12, 0.08, 0.05], attack: 0.03, decay: null, note: "2. ve 3. harmonik temelden bile güçlü: genizden, keskin bir ses." },
    keman: { ad: "Keman", amps: [1, 0.72, 0.56, 0.46, 0.5, 0.34, 0.3, 0.24, 0.22, 0.16, 0.13, 0.11, 0.09, 0.07], attack: 0.06, decay: null, note: "Yay teli testere dişine benzer hareketle çeker: neredeyse bütün harmonikler var, parlak ve zengin." },
  };
  function waveOf(amps, n = 400, cycles = 2, signs) {
    const d = new Array(n); let mx = 0;
    for (let i = 0; i < n; i++) {
      const ph = (i / (n - 1)) * cycles * Math.PI * 2;
      let s = 0; amps.forEach((a, k) => (s += (signs ? signs[k] : 1) * a * Math.sin((k + 1) * ph)));
      d[i] = s; mx = Math.max(mx, Math.abs(s));
    }
    return d.map((v) => (mx ? v / mx : 0));
  }
  function drawBars(ctx, amps, x0, y0, w, hh, { n = 14, hover = -1, labels = true, signs = null } = {}) {
    const bw = w / n;
    ctx.strokeStyle = rgba(C.ink, 0.18); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0 + hh + 0.5); ctx.lineTo(x0 + w, y0 + hh + 0.5); ctx.stroke();
    for (let k = 0; k < n; k++) {
      const a = Math.abs(amps[k] || 0), x = x0 + k * bw + bw * 0.18, bwi = bw * 0.64;
      const col = k === 0 ? C.tonic : C.wave;
      // boş yuva
      ctx.fillStyle = rgba(C.ink, k === hover ? 0.09 : 0.04);
      ctx.fillRect(x, y0, bwi, hh);
      if (a > 0.001) {
        const bh = a * hh;
        ctx.fillStyle = rgba(col, 0.85);
        ctx.fillRect(x, y0 + hh - bh, bwi, bh);
        ctx.fillStyle = col; ctx.fillRect(x, y0 + hh - bh, bwi, 2);
        if (signs && signs[k] < 0) text(ctx, "−", x + bwi / 2, y0 + hh - bh - 6, { size: 12, color: C.ink2, align: "center", weight: 700 });
      }
      if (labels) text(ctx, String(k + 1), x + bwi / 2, y0 + hh + 15, { size: 11, color: k === 0 ? C.tonic : C.muted, align: "center" });
    }
  }

  Demos.timbre = (stage) => {
    const fill = h("div.fill"); stage.append(fill);
    const cv = h("canvas", { "aria-label": "Dalga biçimi ve harmonikler" }); fill.append(cv);
    let key = "flut", shown = INSTR.flut.amps.slice(), target = shown, lit = 0;
    let st;
    function draw(dt) {
      if (!st) return;
      for (let k = 0; k < 14; k++) shown[k] = lerp(shown[k] || 0, target[k] || 0, Math.min(1, dt * 9));
      lit *= Math.exp(-dt * 1.5);
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      const pad = 24;
      const ins = INSTR[key];
      text(ctx, ins.ad, pad, 44, { size: 30, color: C.ink, font: FONT.display, weight: 600 });
      text(ctx, "La4 · 440 Hz", w - pad, 42, { size: 14, color: C.tonic, align: "right", weight: 600 });
      // dalga
      const wy = 70, wh = (hh - 70) * 0.42;
      ctx.strokeStyle = rgba(C.ink, 0.1);
      ctx.beginPath(); ctx.moveTo(pad, wy + wh / 2 + 0.5); ctx.lineTo(w - pad, wy + wh / 2 + 0.5); ctx.stroke();
      L.trace(ctx, waveOf(shown, 500, 3), pad, wy, w - pad * 2, wh * 0.92, C.wave, 2, 6 + lit * 14);
      text(ctx, "dalga biçimi (3 periyot)", pad, wy + wh + 14, { size: 11, color: C.muted });
      // açıklama satırları (önce ölç, çubuklara yer bırak)
      const words = ins.note.split(" "); let line = "", lines = [];
      ctx.font = `500 13px ${FONT.body}`;
      words.forEach((wd) => { const t = line ? line + " " + wd : wd; if (ctx.measureText(t).width > w - pad * 2) { lines.push(line); line = wd; } else line = t; });
      lines.push(line);
      // harmonikler
      const by = wy + wh + 44, bh = hh - by - 36 - lines.length * 17;
      text(ctx, "harmonikler", pad, by - 10, { size: 11, color: C.muted });
      drawBars(ctx, shown.map((a) => a / Math.max(...target.slice(0, 14), 0.001)), pad, by, w - pad * 2, bh, { n: 14 });
      const y = hh - 12;
      lines.reverse().forEach((l, i) => text(ctx, l, pad, y - i * 17, { size: 13, color: C.ink2 }));
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);
    function play() {
      const ins = INSTR[key];
      lit = 1;
      Snd.note(440, { amps: ins.amps, attack: ins.attack, dur: 1.3, release: 0.4, gain: 0.32, cutoff: 9000 });
    }
    const sg = seg(Object.entries(INSTR).map(([k, v]) => [k, v.ad]), key, (k) => { key = k; target = INSTR[k].amps; play(); }, "Çalgı");
    const again = h("button.btn", { type: "button", onclick: play }, "Tekrar çal");
    stage.append(h("div.controls", sg, again, h("span.spacer"), h("span.snd-note", "Gerçek kayıt değil, harmonik oranlarıyla basit taklit.")));
    return { enter() { lp.start(); }, leave() { lp.stop(); } };
  };
  G.tini = [{ click: "=Klarnet" }, { wait: 1700 }, { click: "=Keman" }];

  /* ---------- Toplamsal sentez: sürüklenebilir harmonikler ---------- */
  Demos.additive = (stage) => {
    const NH = 16;
    const wrap = h("div.fill.add-wrap"); stage.append(wrap);
    const wbox = h("div.add-wave"), bbox = h("div.add-bars");
    const cvW = h("canvas", { "aria-label": "Dalga biçimi" }), cvB = h("canvas", { "aria-label": "Harmonik çubukları: sürükleyerek genlik ayarlayın" });
    cvB.style.touchAction = "none"; cvB.style.cursor = "ns-resize";
    wbox.append(cvW); bbox.append(cvB); wrap.append(wbox, bbox);
    const amps = new Array(NH).fill(0); amps[0] = 1;
    const signs = new Array(NH).fill(1);
    const F0 = 220;
    let tone = null, on = false, hover = -1;
    const PRESET = {
      sine: () => amps.map((_, k) => [k === 0 ? 1 : 0, 1]),
      saw: () => amps.map((_, k) => [1 / (k + 1), 1]),
      square: () => amps.map((_, k) => [(k + 1) % 2 ? 1 / (k + 1) : 0, 1]),
      // üçgen: tek harmonikler, 1/n², işaret dönüşümlü (+, −, +, …)
      tri: () => amps.map((_, k) => { const n = k + 1; return n % 2 ? [1 / (n * n), ((n - 1) / 2) % 2 ? -1 : 1] : [0, 1]; }),
    };
    function apply(name) { PRESET[name]().forEach(([a, s], k) => { amps[k] = a; signs[k] = s; }); changed(); }
    let stW, stB;
    function drawWave() {
      if (!stW) return;
      const { ctx, w, h: hh } = stW;
      ctx.clearRect(0, 0, w, hh);
      const pad = 22;
      ctx.strokeStyle = rgba(C.ink, 0.1);
      ctx.beginPath(); ctx.moveTo(pad, hh / 2 + 0.5); ctx.lineTo(w - pad, hh / 2 + 0.5); ctx.stroke();
      // tek tek sinüsler (soluk) + toplam
      const sum = waveOf(amps, 600, 2, signs);
      const mx = (() => { let m = 0; for (let i = 0; i < 600; i++) { const ph = (i / 599) * 4 * Math.PI; let s = 0; amps.forEach((a, k) => (s += signs[k] * a * Math.sin((k + 1) * ph))); m = Math.max(m, Math.abs(s)); } return m || 1; })();
      amps.forEach((a, k) => {
        if (k === 0 || a < 0.02) return;
        const d = []; for (let i = 0; i < 300; i++) d.push((signs[k] * a * Math.sin((k + 1) * (i / 299) * 4 * Math.PI)) / mx);
        L.trace(ctx, d, pad, 30, w - pad * 2, hh - 60, rgba(C.wave, 0.16), 1, 0);
      });
      if (amps[0] > 0.02) {
        const d = []; for (let i = 0; i < 300; i++) d.push((signs[0] * amps[0] * Math.sin((i / 299) * 4 * Math.PI)) / mx);
        L.trace(ctx, d, pad, 30, w - pad * 2, hh - 60, rgba(C.tonic, 0.35), 1, 0);
      }
      L.trace(ctx, sum, pad, 30, w - pad * 2, hh - 60, C.wave, 2.4, on ? 12 : 4);
      text(ctx, "Toplam dalga (2 periyot)", pad, 20, { size: 11, color: C.muted });
      text(ctx, on ? "La3 · 220 Hz çalıyor" : "Ses kapalı", w - pad, 20, { size: 11, color: on ? C.tonic : C.muted, align: "right", weight: 600 });
    }
    function drawBarsC() {
      if (!stB) return;
      const { ctx, w, h: hh } = stB;
      ctx.clearRect(0, 0, w, hh);
      const g = geo();
      text(ctx, "Spektrum: harmonik genlikleri (sürükleyin)", g.x0, 14, { size: 11, color: C.muted });
      drawBars(ctx, amps, g.x0, g.y0, g.w, g.h, { n: NH, hover, signs });
    }
    function geo() { const { w, h: hh } = stB; return { x0: 22, y0: 26, w: w - 44, h: hh - 26 - 26 }; }
    stW = canvas(cvW, drawWave);
    stB = canvas(cvB, drawBarsC);
    function changed() {
      drawWave(); drawBarsC();
      if (tone) {
        if (amps.some((a) => a > 0.001)) { tone.setAmps(amps.map((a, k) => a * signs[k])); tone.setGain(0.24); }
        else tone.setGain(0);
      }
    }
    // sürükleme: işaretçinin altındaki çubuğun genliği = yükseklik
    let down = false;
    function at(e) {
      const r = cvB.getBoundingClientRect(), g = geo();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const k = Math.floor(((x - g.x0) / g.w) * NH);
      const v = clamp(1 - (y - g.y0) / g.h, 0, 1);
      return { k, v: v < 0.02 ? 0 : v };
    }
    let lastK = null;
    function paint(e) {
      const { k, v } = at(e);
      if (k < 0 || k >= NH) return;
      // hızlı sürüklemede aradaki çubukları da doldur
      if (lastK != null && Math.abs(k - lastK) > 1) {
        const s = Math.sign(k - lastK);
        for (let j = lastK + s; j !== k; j += s) amps[j] = lerp(amps[lastK], v, (j - lastK) / (k - lastK));
      }
      amps[k] = v; lastK = k;
      changed();
    }
    cvB.addEventListener("pointerdown", (e) => { down = true; lastK = null; try { cvB.setPointerCapture(e.pointerId); } catch (er) {} paint(e); });
    cvB.addEventListener("pointermove", (e) => {
      if (down) paint(e);
      else { const k = at(e).k; if (k !== hover) { hover = k; drawBarsC(); } }
    });
    const up = () => { down = false; lastK = null; };
    cvB.addEventListener("pointerup", up); cvB.addEventListener("pointercancel", up);
    cvB.addEventListener("pointerleave", () => { if (!down) { hover = -1; drawBarsC(); } });
    // klavye: sol/sağ çubuk seçer, yukarı/aşağı genlik
    cvB.tabIndex = 0;
    let sel = 0;
    cvB.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { sel = clamp(sel + (e.key === "ArrowRight" ? 1 : -1), 0, NH - 1); hover = sel; drawBarsC(); }
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") { amps[sel] = clamp(amps[sel] + (e.key === "ArrowUp" ? 0.05 : -0.05), 0, 1); hover = sel; changed(); }
      else return;
      e.preventDefault(); e.stopPropagation();
    });
    const sg = seg([["sine", "Sinüs"], ["saw", "Testere dişi"], ["square", "Kare"], ["tri", "Üçgen"]], "sine", apply, "Hazır dalgalar");
    const btn = h("button.btn.primary", { type: "button", onclick: () => toggle() }, "Sesi aç");
    function toggle(force) {
      on = force ?? !on;
      if (on) {
        tone = Snd.own(Snd.drone({ freq: F0, amps: amps.some((a) => a > 0.001) ? amps.map((a, k) => a * signs[k]) : [1], gain: 0.24 }));
        if (tone && !amps.some((a) => a > 0.001)) tone.setGain(0);
      } else if (tone) { tone.stop(); tone = null; }
      btn.textContent = on ? "Sesi kapat" : "Sesi aç";
      btn.classList.toggle("primary", !on); btn.classList.toggle("on", on);
      drawWave();
    }
    stage.append(h("div.controls", btn, sg, h("span.spacer"), h("span.snd-note", "Çubuk üzerinde ↑ ↓ ← → tuşları da çalışır.")));
    return { enter() { stW.fit(); stB.fit(); changed(); }, leave() { toggle(false); } };
  };
  G.additive = [{ click: "Sesi aç" }, { drag: "css:.add-bars canvas", path: [[0.1, 0.3], [0.17, 0.5], [0.3, 0.72], [0.55, 0.85], [0.9, 0.92]], speed: 4 }, { wait: 900 }, { click: "=Kare" }];
  GT.additive = "css:.add-bars canvas";

  /* ---------- Harmonik dizisi: titreşen tel ---------- */
  Demos.overtones = (stage) => {
    const fill = h("div.fill.ot-fill"); stage.append(fill);
    const cv = h("canvas", { "aria-label": "Harmonik kalıplarında titreşen tel" }); fill.append(cv);
    const ROOT = 36; // Do2
    const f0 = T.mtof(ROOT);
    let n = 1, amp = 0, phase = 0;
    // her harmoniğin bilgisi
    const H = Array.from({ length: 8 }, (_, i) => {
      const k = i + 1, f = f0 * k;
      const nr = T.nearest(f);
      let den = 1; while (k / den >= 2) den *= 2;
      const semis = ((nr.midi - ROOT) % 12 + 12) % 12;
      return { k, f, name: T.name(nr.midi, { flats: true }), cents: nr.cents, red: [k / T.gcd(k, den), den / T.gcd(k, den)], iv: k === 1 ? "temel ses" : semis === 0 ? (k === 2 ? "bir oktav" : Math.log2(k) + " oktav") : T.interval(semis).ad };
    });
    let st;
    function draw(dt) {
      if (!st) return;
      phase += dt * Math.PI * 2 * (1.6 + n * 0.35);
      amp *= Math.exp(-dt * 0.35);
      const { ctx, w, h: hh } = st;
      ctx.clearRect(0, 0, w, hh);
      const narrow = w < 560;
      const ladW = narrow ? 0 : Math.min(250, w * 0.34);
      const sx0 = 36, sx1 = w - ladW - 36;
      const sy = narrow ? hh * 0.3 : hh * 0.42;
      const A = Math.min(hh * 0.16, 70) * (0.25 + 0.75 * Math.min(1, amp + 0.35));
      // köprüler
      ctx.fillStyle = C.brass;
      ctx.fillRect(sx0 - 6, sy - 26, 4, 52); ctx.fillRect(sx1 + 2, sy - 26, 4, 52);
      // zarf (soluk) ve tel
      const col = n === 1 ? C.tonic : C.wave;
      ctx.save();
      ctx.strokeStyle = rgba(col, 0.16); ctx.lineWidth = 1;
      [1, -1].forEach((s) => {
        ctx.beginPath();
        for (let i = 0; i <= 200; i++) { const u = i / 200; const x = lerp(sx0, sx1, u), y = sy + s * A * Math.sin(n * Math.PI * u); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      });
      ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.shadowColor = col; ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let i = 0; i <= 300; i++) { const u = i / 300; const x = lerp(sx0, sx1, u), y = sy + A * Math.sin(n * Math.PI * u) * Math.cos(phase); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.restore();
      // düğüm noktaları
      for (let j = 1; j < n; j++) {
        const x = lerp(sx0, sx1, j / n);
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, sy, 3.5, 0, Math.PI * 2); ctx.fill();
        text(ctx, j + "/" + n, x, sy + A + 22, { size: 11, color: C.muted, align: "center" });
      }
      // bilgi
      const hi = H[n - 1];
      const iy = narrow ? hh * 0.58 : hh * 0.74;
      text(ctx, n + ". harmonik", sx0, iy, { size: 28, color: n === 1 ? C.tonic : C.ink, font: FONT.display, weight: 600 });
      text(ctx, `${fmtNum(hi.f, 1)} Hz  ·  temelin ${n} katı  ·  oran ${n}:1`, sx0, iy + 26, { size: 14, color: C.ink2 });
      const rr = hi.red[0] === 1 ? "" : `  ·  oktava indirgenince ${hi.red[0]}:${hi.red[1]}`;
      text(ctx, `${hi.iv}${rr}`, sx0, iy + 48, { size: 14, color: C.ink2 });
      // nota + cent
      text(ctx, "en yakın nota: " + hi.name, sx0, iy + 74, { size: 14, color: n === 1 ? C.tonic : C.wave, weight: 600 });
      ctx.font = `600 14px ${FONT.body}`;
      const nw = ctx.measureText("en yakın nota: " + hi.name).width;
      const c = hi.cents;
      text(ctx, Math.abs(c) < 0.5 ? "tam" : L.fmtCents(c), sx0 + nw + 12, iy + 74, { size: 14, color: C.comma, weight: 600 });
      // merdiven: 8 harmonik
      if (!narrow) {
        const lx = w - ladW - 4, ly0 = 34, lh = hh - 68;
        text(ctx, "Do2 üzerinde harmonik dizisi", lx, ly0 - 12, { size: 11, color: C.muted });
        H.forEach((x, i) => {
          const y = ly0 + lh - (Math.log2(x.k) / 3) * lh; // perde yüksekliğine göre (logaritmik)
          const act = x.k === n;
          ctx.strokeStyle = rgba(x.k === 1 ? C.tonic : C.wave, act ? 0.9 : 0.3); ctx.lineWidth = act ? 2.5 : 1;
          ctx.beginPath(); ctx.moveTo(lx, y + 0.5); ctx.lineTo(lx + 46, y + 0.5); ctx.stroke();
          text(ctx, String(x.k), lx + 54, y + 4, { size: 12, color: act ? C.ink : C.muted, weight: 700 });
          text(ctx, x.name, lx + 72, y + 4, { size: 12, color: act ? (x.k === 1 ? C.tonic : C.wave) : C.ink2, weight: act ? 700 : 500 });
          if (Math.abs(x.cents) >= 0.5) text(ctx, L.fmtCents(x.cents, 0), w - 10, y + 4, { size: 11, color: rgba(C.comma, act ? 1 : 0.6), align: "right" });
        });
      }
    }
    st = canvas(cv, () => draw(0));
    const lp = loop(draw);
    const btns = [];
    function pick(k, sound = true) {
      n = k; amp = 1;
      btns.forEach((b, i) => b.classList.toggle("on", i + 1 === k));
      if (sound) Snd.note(H[k - 1].f, { type: "sine", dur: 1.1, attack: 0.01, release: 0.6, gain: k === 1 ? 0.42 : 0.3 });
    }
    const row = h("div.ot-btns", { role: "group", "aria-label": "Harmonikler" });
    H.forEach((x) => {
      const b = h("button.btn.ot-btn", { type: "button", "aria-label": x.k + ". harmonik", onclick: () => { stopSeq(); pick(x.k); } }, h("b", String(x.k)), h("small", x.name));
      if (x.k === 1) b.classList.add("fund");
      btns.push(b); row.append(b);
    });
    let seqT = [];
    function stopSeq() { seqT.forEach(clearTimeout); seqT = []; seqBtn.classList.remove("on"); }
    const seqBtn = h("button.btn.primary", { type: "button", onclick: () => {
      stopSeq(); seqBtn.classList.add("on");
      for (let k = 1; k <= 8; k++) seqT.push(setTimeout(() => pick(k), (k - 1) * 650));
      seqT.push(setTimeout(() => seqBtn.classList.remove("on"), 8 * 650));
    } }, "Sırayla çal");
    stage.append(h("div.controls", row, h("span.spacer"), seqBtn));
    pick(1, false);
    return { enter() { lp.start(); }, leave() { lp.stop(); stopSeq(); } };
  };
  G["harmonik-dizisi"] = [{ click: "aria:3. harmonik" }, { wait: 1600 }, { click: "aria:5. harmonik" }, { wait: 1400 }, { click: "Sırayla çal" }];
})();
