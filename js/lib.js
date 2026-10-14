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

  /* Sol anahtarı (Wikimedia Commons "GClef.svg", kamu malı), 15,186 × 40,768 birim.
     Porteye yerleştirme: boy = 7,024 çizgi aralığı; üst çizgi şeklin tepesinden 1,392 aralık aşağıda.
     Böylece kıvrım alttan ikinci (Sol) çizgisine oturur. */
  const GCLEF_D = "m12.049 3.5296c0.305 3.1263-2.019 5.6563-4.0772 7.7014-0.9349 0.897-0.155 0.148-0.6437 0.594-0.1022-0.479-0.2986-1.731-0.2802-2.11 0.1304-2.6939 2.3198-6.5875 4.2381-8.0236 0.309 0.5767 0.563 0.6231 0.763 1.8382zm0.651 16.142c-1.232-0.906-2.85-1.144-4.3336-0.885-0.1913-1.255-0.3827-2.51-0.574-3.764 2.3506-2.329 4.9066-5.0322 5.0406-8.5394 0.059-2.232-0.276-4.6714-1.678-6.4836-1.7004 0.12823-2.8995 2.156-3.8019 3.4165-1.4889 2.6705-1.1414 5.9169-0.57 8.7965-0.8094 0.952-1.9296 1.743-2.7274 2.734-2.3561 2.308-4.4085 5.43-4.0046 8.878 0.18332 3.334 2.5894 6.434 5.8702 7.227 1.2457 0.315 2.5639 0.346 3.8241 0.099 0.2199 2.25 1.0266 4.629 0.0925 6.813-0.7007 1.598-2.7875 3.004-4.3325 2.192-0.5994-0.316-0.1137-0.051-0.478-0.252 1.0698-0.257 1.9996-1.036 2.26-1.565 0.8378-1.464-0.3998-3.639-2.1554-3.358-2.262 0.046-3.1904 3.14-1.7356 4.685 1.3468 1.52 3.833 1.312 5.4301 0.318 1.8125-1.18 2.0395-3.544 1.8325-5.562-0.07-0.678-0.403-2.67-0.444-3.387 0.697-0.249 0.209-0.059 1.193-0.449 2.66-1.053 4.357-4.259 3.594-7.122-0.318-1.469-1.044-2.914-2.302-3.792zm0.561 5.757c0.214 1.991-1.053 4.321-3.079 4.96-0.136-0.795-0.172-1.011-0.2626-1.475-0.4822-2.46-0.744-4.987-1.116-7.481 1.6246-0.168 3.4576 0.543 4.0226 2.184 0.244 0.577 0.343 1.197 0.435 1.812zm-5.1486 5.196c-2.5441 0.141-4.9995-1.595-5.6343-4.081-0.749-2.153-0.5283-4.63 0.8207-6.504 1.1151-1.702 2.6065-3.105 4.0286-4.543 0.183 1.127 0.366 2.254 0.549 3.382-2.9906 0.782-5.0046 4.725-3.215 7.451 0.5324 0.764 1.9765 2.223 2.7655 1.634-1.102-0.683-2.0033-1.859-1.8095-3.227-0.0821-1.282 1.3699-2.911 2.6513-3.198 0.4384 2.869 0.9413 6.073 1.3797 8.943-0.5054 0.1-1.0211 0.143-1.536 0.143z";
  // SVG dönüşümü: x sol kenar, topLine üst çizginin y'si, gap çizgi aralığı
  const gclefTransform = (x, topLine, gap) => `translate(${x} ${topLine - 1.392 * gap}) scale(${(7.024 * gap) / 40.768})`;

  window.L = { GCLEF_D, gclefTransform, C, FONT, rgba, mix, canvas, loop, h, slider, seg, clamp, lerp, ease, fmtNum, fmtHz, fmtCents, staffLines, trace, text };
  window.Demos = window.Demos || {};
})();
