/* Ortak yardımcılar: renk kodu, tuval kurulumu, döngüler, DOM, kontroller */
(function () {
  /* Renk kodu — bütün sitede aynı anlam:
     tonic   : tonik, kök, çözülme, kuvvetli zaman, temel frekans (çan altını)
     tension : gerilim, dominant, yeden ses, dissonans, pürüz, gam dışı (kadife kırmızısı)
     wave    : dalga biçimi, üst harmonikler, subdominant / uzaklaşma (pas yeşili)
     comma   : koma, cent farkı, akort sapması (lavanta)
     ivory   : nötr notalar ve metin; brass: arayüz */
  const C = {
    bg: "#2b1714", bg2: "#3a201b", panel: "#45261f", line: "#5e3a2f", lineSoft: "#4a2c24",
    ink: "#efe4cc", ink2: "#cdbfa4", muted: "#9a8670",
    brass: "#c9a25a", tonic: "#f2be4b", tension: "#d8465e", wave: "#5db8a3", comma: "#9f8fe6",
    key: "#efe4cc", keyBlack: "#1e100d",
  };
  const FONT = {
    display: '"Bodoni Moda", "Didot", Georgia, serif',
    body: '"Hanken Grotesk", system-ui, sans-serif',
  };

  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }
  function mix(h1, h2, t) {
    const a = hexToRgb(h1), b = hexToRgb(h2);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;
  }

  /* Yüksek çözünürlüklü, kendini yeniden boyutlandıran tuval */
  function canvas(el, onResize) {
    const ctx = el.getContext("2d");
    const state = { ctx, w: 0, h: 0, dpr: 1 };
    function fit() {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.w = r.width; state.h = r.height; state.dpr = dpr;
      el.width = Math.round(r.width * dpr);
      el.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ready && onResize && onResize(state);
    }
    // ilk geri çağrı ertelenir: çağıran kod dönüş değerini değişkene atamış olsun
    let ready = false;
    fit();
    ready = true;
    new ResizeObserver(fit).observe(el);
    queueMicrotask(() => { if (state.w && onResize) onResize(state); });
    state.fit = fit;
    return state;
  }

  /* requestAnimationFrame döngüsü — slayt görünürken çalışır */
  function loop(fn) {
    let id = 0, last = 0, running = false;
    function tick(t) {
      if (!running) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016;
      last = t;
      fn(dt, t / 1000);
      id = requestAnimationFrame(tick);
    }
    return {
      start() { if (!running) { running = true; last = 0; id = requestAnimationFrame(tick); } },
      stop() { running = false; cancelAnimationFrame(id); },
      get running() { return running; },
    };
  }

  /* Küçük DOM yardımcısı: h("div.cls#id", {attrs}, ...children) */
  function h(spec, attrs, ...kids) {
    const m = spec.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement(m[1] || "div");
    (m[2].match(/[.#][\w-]+/g) || []).forEach((p) => {
      if (p[0] === ".") el.classList.add(p.slice(1)); else el.id = p.slice(1);
    });
    if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v;
      else if (k === "style" && typeof v === "object") for (const [sk, sv] of Object.entries(v)) { if (sk.startsWith("--")) el.style.setProperty(sk, sv); else el.style[sk] = sv; }
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((k) => k != null && el.append(k.nodeType ? k : document.createTextNode(k)));
    return el;
  }

  function slider({ label, min, max, step = 0.01, value, fmt = (v) => v.toFixed(2), oninput, width, cls }) {
    const val = h("span.val", fmt(value));
    const input = h("input", { type: "range", min, max, step, value, "aria-label": label });
    if (cls) input.classList.add(cls);
    if (width) input.style.width = width;
    input.addEventListener("input", () => { val.textContent = fmt(+input.value); oninput(+input.value); });
    const wrap = h("label", label, input, val);
    wrap.set = (v) => { input.value = v; val.textContent = fmt(+input.value); };
    wrap.input = input;
    return wrap;
  }

  function seg(options, value, onchange, label) {
    const wrap = h("div.seg", { role: "group", "aria-label": label || null });
    const btns = options.map(([k, lab]) => {
      const b = h("button", { type: "button" }, lab);
      b.addEventListener("click", () => { set(k); onchange(k); });
      wrap.append(b); return [k, b];
    });
    function set(k) { btns.forEach(([kk, b]) => { b.classList.toggle("on", kk === k); b.setAttribute("aria-pressed", kk === k); }); }
    set(value);
    wrap.set = set;
    return wrap;
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  // sayıları Türkçe biçimde yaz: 1.234,5
  const fmtNum = (v, d = 0) => v.toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtHz = (f) => (f >= 1000 ? fmtNum(f / 1000, f >= 10000 ? 1 : 2) + " kHz" : fmtNum(f, f < 100 ? 1 : 0) + " Hz");
  const fmtCents = (c, d = 1) => (c > 0.05 ? "+" : c < -0.05 ? "−" : "±") + fmtNum(Math.abs(c), d) + " cent";

  /* Tuval yardımcıları */
  // nota kâğıdı çizgileri (soluk beşli porte) — sahnelerin zemin dokusu
  function staffLines(ctx, x, y, w, gap, color = "rgba(239,228,204,0.06)") {
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const yy = Math.round(y + i * gap) + 0.5; ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); }
    ctx.stroke();
  }
  // osiloskop izi: değerler -1..1
  function trace(ctx, data, x, y, w, hh, color, lw = 2, glow = 10) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = "round";
    ctx.shadowColor = color; ctx.shadowBlur = glow;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const px = x + (i / (data.length - 1)) * w, py = y + hh / 2 - data[i] * hh / 2;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  }
  function text(ctx, s, x, y, { size = 13, color = C.ink2, align = "left", base = "alphabetic", weight = 500, font = FONT.body } = {}) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
    ctx.fillText(s, x, y);
  }

  window.L = { C, FONT, rgba, mix, canvas, loop, h, slider, seg, clamp, lerp, ease, fmtNum, fmtHz, fmtCents, staffLines, trace, text };
  window.Demos = window.Demos || {};
})();
