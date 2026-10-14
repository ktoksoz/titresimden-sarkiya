/* 4. bölüm (Akorlar ve armoni) demoları:
   üç sesliler, çevrimler ve yedililer, dereceler (gerilim → çözülme), beşliler çemberi, akor yürüyüşleri */
(function () {
  const { C, h, seg, slider, rgba, loop } = L;
  const G = (window.GuideScenarios = window.GuideScenarios || {});
  const SVGNS = "http://www.w3.org/2000/svg";
  const sv = (tag, attrs = {}, ...kids) => {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
    kids.forEach((k) => k != null && el.append(k.nodeType ? k : document.createTextNode(k)));
    return el;
  };

  /* --- Nota yazımı: harf adı + değiştirici (Re♯ değil Mi♭ gibi doğru yazım için) --- */
  const LET = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Si"];
  const NAT = [0, 2, 4, 5, 7, 9, 11];
  const ACC = { "-2": "♭♭", "-1": "♭", 0: "", 1: "♯", 2: "♯♯" };
  // midi notasını verilen harfle (0=Do … 6=Si) yaz; harfin oktavı midi'ye göre bulunur
  function spell(m, letter) {
    let acc = ((m - NAT[letter]) % 12 + 12) % 12;
    if (acc > 6) acc -= 12;
    const oct = Math.round((m - acc - NAT[letter]) / 12) - 1; // bilimsel oktav
    return { m, letter, acc, oct, name: LET[letter] + ACC[acc], d: oct * 7 + letter };
  }
  // kök seçimi: doğru harfle birlikte (Mi♭, La♭, Si♭ bemollü; Do♯, Fa♯ diyezli)
  const ROOTS = [[0, 0, "Do"], [1, 0, "Do♯"], [2, 1, "Re"], [3, 2, "Mi♭"], [4, 2, "Mi"], [5, 3, "Fa"],
    [6, 3, "Fa♯"], [7, 4, "Sol"], [8, 5, "La♭"], [9, 5, "La"], [10, 6, "Si♭"], [11, 6, "Si"]];
  // akor notalarını üçlü üçlü yaz: k. akor sesi harfi = kök harfi + 2k
  function spellChord(root, rootLetter, type) {
    return T.CHORDS[type].iv.map((iv, k) => spell(root + iv, (rootLetter + 2 * k) % 7));
  }
  // değiştirici işaretleri gövde fontunda yaz (Bodoni'de ♯/♭ yok, yedek font aralığı bozuyor)
  const acc = (str) => String(str).split(/([♯♭]+)/).filter(Boolean).map((t) => (/[♯♭]/.test(t) ? h("span.acc", t) : t));
  const FN_CLS = { tonic: "tonic", sub: "wave", dom: "tension" };
  const FN_COL = { tonic: C.tonic, sub: C.wave, dom: C.tension };
  const FN_AD = { tonic: "tonik", sub: "subdominant", dom: "dominant" };
  // akor seslerini lo'dan başlayan bir oktava yerleştir (yakın konum)
  function voice(root, ivs, lo = 57) {
    return ivs.map((iv) => { let m = root + iv; while (m < lo) m += 12; while (m >= lo + 12) m -= 12; return m; }).sort((a, b) => a - b);
  }
  // arpej + blok akor
  function strumThenBlock(notes, gap = 0.13) {
    const c = Snd.ready(); if (!c) return;
    const t = c.currentTime + 0.02;
    notes.forEach((m, i) => Snd.pluck(T.mtof(m), { when: t + i * gap, gain: 0.24, dur: 0.5 }));
    Snd.chord(notes.map((m) => T.mtof(m)), { when: t + notes.length * gap + 0.12, gain: 0.34, dur: 1.4 });
  }
  function block(notes, when = 0, dur = 1.1, gain = 0.32) {
    return Snd.chord(notes.map((m) => T.mtof(m)), { when, gain, dur });
  }

  /* --- Küçük porte (SVG): sol anahtarı + nota başları --- */
  const E4 = 4 * 7 + 2; // sol anahtarında alt çizgi
  function Staff(container, { width = 220, gap = 12 } = {}) {
    const H = gap * 12, base = gap * 8.5; // alt çizginin y'si
    const svg = sv("svg", { class: "ch-staff", viewBox: `0 0 ${width} ${H}`, role: "img" });
    container.append(svg);
    const yOf = (p) => base - (p * gap) / 2;
    function render(notes, colors = [], labels = []) {
      svg.innerHTML = "";
      for (let i = 0; i < 5; i++) svg.append(sv("line", { x1: 4, x2: width - 4, y1: yOf(i * 2), y2: yOf(i * 2), stroke: rgba(C.ink, 0.45), "stroke-width": 1 }));
      const clef = sv("path", { d: L.GCLEF_D, fill: rgba(C.ink, 0.85), transform: L.gclefTransform(8, yOf(8), gap) });
      svg.append(clef);
      const cx = width * 0.58, hw = gap * 0.66;
      const sorted = notes.map((n, i) => ({ ...n, col: colors[i] || C.ink, lab: labels[i] })).sort((a, b) => a.d - b.d);
      // ikili aralıkta üstteki nota sağa kayar
      let prev = null;
      sorted.forEach((n) => { n.off = prev && n.d - prev.d === 1 && !prev.off ? 1 : 0; prev = n; });
      // ek çizgiler
      const ps = sorted.map((n) => n.d - E4);
      const lo = Math.min(...ps), hi = Math.max(...ps);
      for (let p = -2; p >= lo; p -= 2) svg.append(sv("line", { x1: cx - hw * 1.7, x2: cx + hw * 1.7 + (sorted.some((n) => n.off) ? hw * 2 : 0), y1: yOf(p), y2: yOf(p), stroke: rgba(C.ink, 0.6) }));
      for (let p = 10; p <= hi; p += 2) svg.append(sv("line", { x1: cx - hw * 1.7, x2: cx + hw * 1.7, y1: yOf(p), y2: yOf(p), stroke: rgba(C.ink, 0.6) }));
      let lastLabY = -1e9, labShift = 0;
      sorted.forEach((n) => {
        const p = n.d - E4, x = cx + n.off * hw * 2, y = yOf(p);
        if (n.lab) { labShift = Math.abs(y - lastLabY) < 13 && !labShift ? 30 : 0; lastLabY = y; }
        svg.append(sv("ellipse", { cx: x, cy: y, rx: hw, ry: gap * 0.46, transform: `rotate(-22 ${x} ${y})`, fill: n.col }));
        if (n.acc) svg.append(sv("text", { x: cx - hw * 1.9 - (n.off ? 0 : 0), y: y + gap * 0.42, "text-anchor": "end", fill: n.col, "font-size": gap * 1.4, "font-family": "system-ui, sans-serif" }, ACC[n.acc]));
        if (n.lab) svg.append(sv("text", { x: width - 6 - labShift, y: y + 4, "text-anchor": "end", fill: n.col, "font-size": 11, "font-weight": 600, "font-family": "Hanken Grotesk, sans-serif" }, n.lab));
      });
      // tek gövde (akor)
      const top = sorted[sorted.length - 1], bot = sorted[0];
      const up = (top.d + bot.d) / 2 - E4 < 4;
      const sx = up ? cx + hw * 0.95 : cx - hw * 0.95;
      svg.append(sv("line", { x1: sx, x2: sx, y1: up ? yOf(bot.d - E4) : yOf(top.d - E4), y2: up ? yOf(top.d - E4) - gap * 3.2 : yOf(bot.d - E4) + gap * 3.2, stroke: rgba(C.ink, 0.8), "stroke-width": 1.4 }));
    }
    return { svg, render };
  }

  /* ================= Üç sesliler ================= */
  const TRIAD_INFO = {
    maj: { th: ["B3", 4], fi: ["T5", 7], up: ["k3", 3], d: "Büyük üçlünün üstüne küçük üçlü: parlak ve kararlı. Oranı 4:5:6." },
    min: { th: ["k3", 3], fi: ["T5", 7], up: ["B3", 4], d: "Küçük üçlünün üstüne büyük üçlü: aynı aralıklar ters sırada, buruk bir renk." },
    aug: { th: ["B3", 4], fi: ["A5", 8], up: ["B3", 4], d: "İki büyük üçlü: beşli yarım ses genişler. Belirsiz, havada asılı." },
    dim: { th: ["k3", 3], fi: ["E5", 6], up: ["k3", 3], d: "İki küçük üçlü: kök ile beşli arasında bir triton var. Sıkışık ve gergin." },
  };
  Demos.triads = (stage) => {
    let root = 0, type = "maj";
    const top = h("div.ch-top");
    const stack = h("div.ch-stack", { "aria-live": "polite" });
    const info = h("div.ch-info");
    top.append(stack, info);
    const pianoBox = h("div.ch-piano");
    stage.append(top, pianoBox);
    const piano = Piano(pianoBox, { from: 60, to: 83 });
    const roots = h("div.seg.ch-roots", { role: "group", "aria-label": "Kök nota" });
    const rootBtns = ROOTS.map(([pc, , ad]) => {
      const b = h("button", { type: "button", onclick: () => { root = pc; render(); play(); } }, ad);
      roots.append(b); return b;
    });
    const types = seg([["maj", "Majör"], ["min", "Minör"], ["aug", "Artık"], ["dim", "Eksik"]], type, (k) => { type = k; render(); play(); }, "Akor türü");
    stage.append(h("div.controls", h("span.ch-lab", "Kök"), roots, h("span.ch-lab", "Tür"), types));

    function notes() { return T.chord(60 + root, type); }
    function render() {
      rootBtns.forEach((b, i) => { b.classList.toggle("on", i === root); b.setAttribute("aria-pressed", i === root); });
      const [, letter] = ROOTS[root];
      const sp = spellChord(60 + root, letter, type);
      const inf = TRIAD_INFO[type];
      const fifthTense = type === "dim" || type === "aug";
      const cls = ["tonic", "in", fifthTense ? "tension" : "in"];
      piano.clear();
      const ns = notes();
      piano.mark(ns[0], "tonic", "Kök"); piano.mark(ns[1], "in", inf.th[0]); piano.mark(ns[2], cls[2], inf.fi[0]);
      // üst üste üçlüler
      stack.innerHTML = "";
      const box = (n, c, role) => h("div.ch-note.c-" + c, h("b", n.name), h("small", role));
      stack.append(
        h("div.ch-col",
          box(sp[2], fifthTense ? "tension" : "ivory", "beşli"),
          h("div.ch-gap", h("span", inf.up[0]), h("small", inf.up[1] + " yarım ses")),
          box(sp[1], "ivory", "üçlü"),
          h("div.ch-gap", h("span", inf.th[0]), h("small", inf.th[1] + " yarım ses")),
          box(sp[0], "tonic", "kök")),
        h("div.ch-brace" + (fifthTense ? ".tense" : ""), h("span", inf.fi[0]), h("small", inf.fi[1] + " yarım ses")));
      const chName = sp[0].name + T.CHORDS[type].sym;
      info.innerHTML = "";
      info.append(h("p.ch-sym", acc(chName), h("small.ch-let", acc(T.toLetter(chName)))), h("p.ch-full", acc(`${sp[0].name} ${T.CHORDS[type].ad.toLocaleLowerCase("tr")}`)),
        h("p.ch-notes", acc(sp.map((n) => `${n.name} (${T.toLetter(n.name)})`).join(", "))), h("p.ch-desc", inf.d));
    }
    function play() { strumThenBlock(notes()); }
    render();
    return { enter() {}, leave() {} };
  };
  G["uc-sesliler"] = [{ click: "=Re" }, { wait: 1300 }, { click: "=Minör" }, { wait: 1500 }, { click: "=Eksik" }];

  /* ================= Çevrimler ve yedililer ================= */
  const INV_AD = ["Kök konumu", "1. çevrim", "2. çevrim", "3. çevrim"];
  const INV_BASS = ["kök", "üçlü", "beşli", "yedili"];
  const SEV_INFO = {
    maj: "Kök, üçlü, beşli: temel üç sesli.",
    maj7: "Majör akor + büyük yedili. Yumuşak, hafif hüzünlü; caz ve bossa nova rengi.",
    dom7: "Majör akor + küçük yedili. Üçlü ile yedili arasındaki triton çözülmek ister.",
    min7: "Minör akor + küçük yedili. Yumuşak, akışkan bir minör.",
    hdim7: "Eksik akor + küçük yedili. Minör tonun ii akoru.",
    dim7: "Üst üste dört küçük üçlü: oktavı eşit böler, tamamen simetrik ve gergin.",
  };
  /* ---------- Çevrimler: kök seç, sonra kök konumu / 1. / 2. çevrim ---------- */
  Demos.inversions = (stage) => {
    let root = 0, type = "maj", inv = 0, linkT = [];
    const FIG = [["5/3", "basın üstünde üçlü ve beşli"], ["6/3", "basın üstünde üçlü ve altılı"], ["6/4", "basın üstünde dörtlü ve altılı"]];
    const ROLE = ["kök", "üçlü", "beşli"];
    const top = h("div.ci-top");
    const staffs = h("div.ci-staffs");
    const info = h("div.ch-info.ci-info");
    top.append(staffs, info);
    const pianoBox = h("div.ch-piano");
    stage.append(top, pianoBox);
    const piano = Piano(pianoBox, { from: 48, to: 83, compact: true });
    // üç konum: her biri küçük bir porte; tıklayınca seçilir ve çalar
    const posBtns = [0, 1, 2].map((k) => {
      const b = h("button.ci-pos", { type: "button", "aria-label": INV_AD[k], onclick: () => { inv = k; stopLink(); render(); play(); } });
      const box = h("div.ci-staff");
      b.append(box, h("span.ci-poslab", INV_AD[k]), h("small.ci-fig", FIG[k][0]));
      staffs.append(b);
      return { b, staff: Staff(box, { width: 150, gap: 11 }) };
    });
    const roots = h("div.seg.ch-roots", { role: "group", "aria-label": "Kök nota" });
    const rootBtns = ROOTS.map(([pc, , ad]) => {
      const b = h("button", { type: "button", onclick: () => { root = pc; stopLink(); render(); play(); } }, ad);
      roots.append(b); return b;
    });
    const types = seg([["maj", "Majör"], ["min", "Minör"], ["dim", "Eksik"]], type, (k) => { type = k; stopLink(); render(); play(); }, "Akor türü");
    const invSeg = seg([[0, "Kök konumu"], [1, "1. çevrim"], [2, "2. çevrim"]], inv, (k) => { inv = k; stopLink(); render(); play(); }, "Çevrim");
    const linkBtn = h("button.btn", { type: "button", onclick: () => (linkT.length ? stopLink() : link()) }, "Çevrimle bağla");
    stage.append(h("div.controls", h("span.ch-lab", "Kök"), roots, h("span.ch-lab", "Tür"), types),
      h("div.controls", invSeg, h("span.spacer"), linkBtn));

    // kök konumu Do4–Fa♯4 köklerde 4. oktavda, Sol–Si köklerde 3. oktavda başlar (piyanoya sığsın)
    const base = () => (root <= 6 ? 60 : 48) + root;
    function voicing(k) {
      const sp = spellChord(base(), ROOTS[root][1], type).map((n, i) => ({ ...n, role: i }));
      for (let j = 0; j < k; j++) { const n = sp.shift(); sp.push({ ...spell(n.m + 12, n.letter), role: n.role }); }
      return sp;
    }
    const colOf = (role) => (role === 0 ? C.tonic : type === "dim" && role === 2 ? C.tension : C.ink);
    const clsOf = (role) => (role === 0 ? "tonic" : type === "dim" && role === 2 ? "tension" : "in");
    function render() {
      rootBtns.forEach((b, i) => { b.classList.toggle("on", i === root); b.setAttribute("aria-pressed", i === root); });
      invSeg.set(inv);
      posBtns.forEach(({ b, staff }, k) => {
        const sp = voicing(k);
        staff.render(sp, sp.map((n) => colOf(n.role)), sp.map(() => ""));
        b.classList.toggle("on", k === inv);
      });
      const sp = voicing(inv);
      piano.clear();
      sp.forEach((n, i) => piano.mark(n.m, clsOf(n.role), i === 0 ? "bas" : n.role === 0 ? "kök" : ""));
      const sym = sp.find((n) => n.role === 0).name + T.CHORDS[type].sym + (inv ? "/" + sp[0].name : "");
      const iv = (a, b) => T.interval(b.m - a.m).ad.toLocaleLowerCase("tr");
      info.innerHTML = "";
      info.append(
        h("p.ch-sym", acc(sym), h("small.ch-let", acc(T.toLetter(sym)))),
        h("p.ch-full", acc(`${INV_AD[inv]} · basta ${ROLE[sp[0].role]} (${sp[0].name})`)),
        h("p.ch-notes", acc(`Alttan üste: ${sp.map((n) => `${n.name} (${T.toLetter(n.name)})`).join(", ")}`)),
        h("p.ch-desc", `${FIG[inv][0]}: ${FIG[inv][1]}. Bastan aralıklar: ${iv(sp[0], sp[1])} ve ${iv(sp[0], sp[2])}.`),
        h("p.ch-desc", inv === 0 ? "En sağlam, en kararlı konum: kök en altta." : inv === 1 ? "Daha hafif ve akıcı; bas çizgisini yumuşatmak için sık kullanılır." : "En az kararlı konum; çoğunlukla geçişlerde ve kadanslarda görülür."));
    }
    function play() { strumThenBlock(voicing(inv).map((n) => n.m), 0.12); }
    // I – IV (2. çevrim) – V (1. çevrim) – I: notalar en az yer değiştirir
    function link() {
      const c = Snd.ready();
      const b0 = base(), minor = type !== "maj";
      const I = T.chord(b0, minor ? "min" : "maj");
      const IV = [b0, b0 + (minor ? 5 : 5), b0 + (minor ? 8 : 9)];            // IV'ün 2. çevrimi: kök ortak ses
      const V = [b0 - 1, b0 + 2, b0 + 7];                                       // V'in 1. çevrimi: yeden basta
      const seq = [[I, "I"], [IV, "IV (2. çevrim)"], [V, "V (1. çevrim)"], [I, "I"]];
      linkBtn.textContent = "Durdur"; linkBtn.classList.add("on");
      seq.forEach(([ns, lab], k) => linkT.push(setTimeout(() => {
        piano.clear(); ns.forEach((m, i) => piano.mark(m, k === 2 ? "tension" : k === 1 ? "wave" : "tonic", i === 0 ? lab.split(" ")[0] : ""));
        info.querySelector(".ch-full").textContent = `${lab}: ${ns.map((m) => T.name(m, { octave: false, flats: [1, 3, 8, 10].includes(T.pcOf(m)) })).join(", ")}`;
        if (c) block(ns, 0, 0.9, 0.3);
      }, k * 900)));
      linkT.push(setTimeout(() => { stopLink(); render(); }, seq.length * 900 + 400));
    }
    function stopLink() { linkT.forEach(clearTimeout); linkT = []; linkBtn.textContent = "Çevrimle bağla"; linkBtn.classList.remove("on"); }
    render();
    return { enter() {}, leave() { stopLink(); } };
  };
  G.cevrimler = [{ click: "=Re" }, { wait: 1200 }, { click: "=1. çevrim" }, { wait: 1400 }, { click: "=2. çevrim" }, { wait: 1400 }, { click: "Çevrimle bağla" }];

  Demos.sevenths = (stage) => {
    let type = "maj7", inv = 0;
    const top = h("div.ch-top.ch-top-sev");
    const staffBox = h("div.ch-staffbox");
    const info = h("div.ch-info");
    top.append(staffBox, info);
    const staff = Staff(staffBox, { width: 250, gap: 15 });
    const pianoBox = h("div.ch-piano");
    stage.append(top, pianoBox);
    const piano = Piano(pianoBox, { from: 60, to: 83 });
    const invBtn = h("button.btn", { type: "button", onclick: () => { inv = (inv + 1) % T.CHORDS[type].iv.length; render(); play(); } }, "Çevir");
    const invLab = h("span.ch-invlab");
    const types = seg([["maj", "Üç sesli"], ["maj7", "maj7"], ["dom7", "7"], ["min7", "m7"], ["hdim7", "ø7"], ["dim7", "°7"]], type,
      (k) => { type = k; inv = Math.min(inv, T.CHORDS[k].iv.length - 1); render(); play(); }, "Akor türü");
    stage.append(h("div.controls", invBtn, invLab, h("span.spacer"), types));

    function chordNotes() {
      // Do üzerine, üçlü üçlü yazılmış; çevrimde alttaki nota bir oktav yukarı
      const sp = spellChord(60, 0, type).map((n, k) => ({ ...n, role: k }));
      for (let k = 0; k < inv; k++) { const n = sp.shift(); sp.push({ ...spell(n.m + 12, n.letter), role: n.role }); }
      return sp;
    }
    function colorOf(role) {
      if (role === 0) return ["tonic", C.tonic];
      const tense = (type === "dom7" && (role === 1 || role === 3)) || ((type === "dim" || type === "hdim7" || type === "dim7") && role === 2) || (type === "dim7" && role === 3);
      return tense ? ["tension", C.tension] : ["in", C.ink];
    }
    const ROLE_LAB = ["kök", "3", "5", "7"];
    function render() {
      const sp = chordNotes();
      piano.clear();
      sp.forEach((n) => { const [cls] = colorOf(n.role); piano.mark(n.m, cls, n.role ? ROLE_LAB[n.role] : "Kök"); });
      staff.render(sp, sp.map((n) => colorOf(n.role)[1]), sp.map((n) => ROLE_LAB[n.role]));
      invLab.innerHTML = "";
      invLab.append(h("b", INV_AD[inv]), ` · basta ${INV_BASS[sp[0].role]}`);
      info.innerHTML = "";
      const sym = "Do" + T.CHORDS[type].sym + (inv ? "/" + sp[0].name : "");
      info.append(h("p.ch-sym", acc(sym), h("small.ch-let", acc(T.toLetter(sym)))), h("p.ch-full", T.CHORDS[type].ad + (inv ? ", " + INV_AD[inv].toLocaleLowerCase("tr") : "")),
        h("p.ch-notes", acc(sp.map((n) => `${n.name} (${T.toLetter(n.name)})`).join(", "))), h("p.ch-desc", SEV_INFO[type]));
      if (type === "dom7") info.append(h("p.ch-desc.c-tension", "Mi ile Si♭ arasındaki triton kırmızıyla işaretli."));
    }
    function play() { strumThenBlock(chordNotes().map((n) => n.m), 0.11); }
    render();
    return { enter() {}, leave() {} };
  };
  G.yedililer = [{ click: "Çevir" }, { wait: 1500 }, { click: "Çevir" }, { wait: 1500 }, { click: "=7" }];

  /* ================= Dereceler: gerilim ve çözülme ================= */
  Demos.degrees = (stage) => {
    const TONIC = 60;
    const top = h("div.ch-degtop");
    const degs = h("div.ch-degs", { role: "group", "aria-label": "Do majörün dereceleri" });
    const info = h("div.ch-deginfo", { "aria-live": "polite" });
    const fnBar = h("div.ch-fnbar",
      h("span.f-tonic", "Tonik: ev"), h("span.f-sub", "Subdominant: yola çıkış"), h("span.f-dom", "Dominant: gerilim"));
    top.append(degs, fnBar, info);
    const wrap = h("div.ch-arrowwrap");
    const arrows = sv("svg", { class: "ch-arrows", "aria-hidden": "true" });
    const pianoBox = h("div.ch-piano");
    wrap.append(arrows, pianoBox);
    stage.append(top, wrap);
    const piano = Piano(pianoBox, { from: 48, to: 77 });
    const resolveBtn = h("button.btn.primary", { type: "button", onclick: () => resolve() }, "Gerilim → çözülme");
    stage.append(h("div.controls", h("span.ch-lab", "Do majörün akorları"), h("span.spacer"), resolveBtn));

    const btns = [];
    for (let d = 0; d < 7; d++) {
      const dc = T.diatonicChord(TONIC, d);
      const fn = T.FUNCTION[d];
      const nm = T.chordName(dc.root, dc.type);
      const b = h("button.ch-deg.f-" + fn + ([0, 3, 4].includes(d) ? ".main" : ""), { type: "button", "aria-label": `${dc.roman}: ${nm}`,
        onclick: () => pick(d) }, h("b", dc.roman), h("small", nm));
      degs.append(b); btns.push(b);
    }
    let timers = [];
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    function setInfo(fn, big, name, line) {
      info.innerHTML = "";
      info.append(h("p.ch-sym.c-" + (fn === "sub" ? "wave" : fn === "dom" ? "tension" : "tonic"), big), h("div",
        h("p.ch-full", name), h("p.ch-desc", line)));
    }
    function pick(d) {
      clearTimers(); clearArrows();
      const dc = T.diatonicChord(TONIC, d), fn = T.FUNCTION[d];
      btns.forEach((b, i) => b.classList.toggle("on", i === d));
      const ns = T.chord(dc.root, dc.type);
      piano.clear();
      ns.forEach((m, i) => piano.mark(m, FN_CLS[fn], i ? "" : dc.roman));
      fnBar.dataset.on = fn;
      const nm = T.chordName(dc.root, dc.type);
      const say = { tonic: "dinlenme, varış hissi", sub: "evden uzaklaşma", dom: "gerilim, toniğe dönme isteği" }[fn];
      setInfo(fn, dc.roman, `${nm} (${T.chordLetter(dc.root, dc.type)}) ${T.CHORDS[dc.type].ad.toLocaleLowerCase("tr")}`, `${FN_AD[fn][0].toLocaleUpperCase("tr") + FN_AD[fn].slice(1)}: ${say}.`);
      Snd.pad(ns.map((m) => T.mtof(m)), { gain: 0.42, dur: 1.4 });
    }

    /* V7 → I: Sol3 Si3 Re4 Fa4 → Do3 Do4 Do4 Mi4 */
    const V7 = [55, 59, 62, 65], I = [48, 60, 64];
    const MOVES = [
      { a: 55, b: 48, kind: "bass", lab: "" },
      { a: 59, b: 60, kind: "tense", lab: "yeden ↑" },
      { a: 62, b: 60, kind: "plain", lab: "" },
      { a: 65, b: 64, kind: "tense", lab: "7'li ↓" },
    ];
    function clearArrows() { arrows.innerHTML = ""; }
    function drawArrows(progress = 1) {
      arrows.innerHTML = "";
      const pr = pianoBox.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      if (!pr.width) return;
      const oy = pr.top - wr.top, ox = pr.left - wr.left;
      arrows.setAttribute("viewBox", `0 0 ${wr.width} ${wr.height}`);
      const defs = sv("defs");
      arrows.append(defs);
      MOVES.forEach((mv, i) => {
        const A = piano.centerOf(mv.a), B = piano.centerOf(mv.b);
        if (!A || !B) return;
        const x1 = ox + A.x, x2 = ox + B.x, y = oy - 4;
        const lift = Math.min(oy - 10, 24 + Math.abs(x2 - x1) * 0.35);
        const id = "chg" + i + Math.random().toString(36).slice(2, 6);
        const tense = mv.kind === "tense";
        const g = sv("linearGradient", { id, gradientUnits: "userSpaceOnUse", x1, y1: 0, x2, y2: 0 },
          sv("stop", { offset: 0, "stop-color": tense ? C.tension : rgba(C.ink, 0.7) }),
          sv("stop", { offset: 1, "stop-color": tense ? C.tonic : rgba(C.ink, 0.7) }));
        defs.append(g);
        const d = `M${x1} ${y} Q${(x1 + x2) / 2} ${y - lift * 2} ${x2} ${y}`;
        const p = sv("path", { d, fill: "none", stroke: `url(#${id})`, "stroke-width": tense ? 2.6 : 1.6, "stroke-linecap": "round", class: "ch-arc" });
        arrows.append(p);
        const len = p.getTotalLength();
        p.style.strokeDasharray = len; p.style.strokeDashoffset = len * (1 - progress);
        // ok başı
        const ang = Math.atan2(y - (y - lift * 2), x2 - (x1 + x2) / 2);
        const s = tense ? 7 : 5.5;
        arrows.append(sv("path", { d: `M${x2} ${y} l${-s * Math.cos(ang - 0.45)} ${-s * Math.sin(ang - 0.45)} M${x2} ${y} l${-s * Math.cos(ang + 0.45)} ${-s * Math.sin(ang + 0.45)}`,
          stroke: tense ? C.tonic : rgba(C.ink, 0.7), "stroke-width": tense ? 2.4 : 1.6, "stroke-linecap": "round", fill: "none", class: "ch-head", opacity: progress >= 1 ? 1 : 0 }));
        if (mv.lab) arrows.append(sv("text", { x: (x1 + x2) / 2, y: y - lift - 6, "text-anchor": "middle", fill: C.tension, "font-size": 12, "font-weight": 700, "font-family": "Hanken Grotesk, sans-serif" }, mv.lab));
      });
    }
    let arrowsOn = false;
    new ResizeObserver(() => { if (arrowsOn) drawArrows(1); }).observe(wrap);
    function resolve() {
      clearTimers(); arrowsOn = false; clearArrows();
      btns.forEach((b, i) => b.classList.toggle("on", i === 4));
      fnBar.dataset.on = "dom";
      piano.clear();
      V7.forEach((m) => piano.mark(m, m === 59 || m === 65 ? "tension" : "in", m === 59 ? "yeden" : m === 65 ? "7'li" : m === 55 ? "V7" : ""));
      setInfo("dom", "V7", "Sol7, dominant yedili", "Si ile Fa arasındaki triton gerilir…");
      const c = Snd.ready();
      const t0 = c ? c.currentTime + 0.03 : 0;
      if (c) Snd.pad(V7.map((m) => T.mtof(m)), { when: t0, dur: 1.4, gain: 0.46 });
      timers.push(setTimeout(() => {
        arrowsOn = true;
        drawArrows(0);
        requestAnimationFrame(() => {
          arrows.querySelectorAll(".ch-arc").forEach((p) => { p.style.transition = "stroke-dashoffset .7s ease-out"; p.style.strokeDashoffset = 0; });
          setTimeout(() => arrows.querySelectorAll(".ch-head").forEach((p) => p.setAttribute("opacity", 1)), 650);
        });
      }, 700));
      if (c) Snd.pad(I.map((m) => T.mtof(m)), { when: t0 + 1.5, dur: 2.4, gain: 0.46 });
      timers.push(setTimeout(() => {
        btns.forEach((b, i) => b.classList.toggle("on", i === 0));
        fnBar.dataset.on = "tonic";
        piano.clear();
        I.forEach((m, k) => piano.mark(m, "tonic", k === 0 ? "I" : ""));
        setInfo("tonic", "I", "Do majör, tonik", "Yeden Do'ya çıkar, yedili Mi'ye iner. Triton çözüldü, eve varıldı.");
      }, 1500));
    }
    pick(0);
    return {
      enter() {},
      leave() { clearTimers(); },
    };
  };
  G.dereceler = [{ click: "aria:I: Do" }, { wait: 900 }, { click: "aria:IV: Fa" }, { wait: 900 }, { click: "aria:V: Sol" }, { wait: 1000 }, { click: "Gerilim" }];

  /* ================= Beşliler çemberi ================= */
  // donanımdaki işaretlerin porte konumu (sol anahtarı, alt çizgi = 0)
  const SHARP_POS = [8, 5, 9, 6, 3, 7, 4];
  const FLAT_POS = [4, 7, 3, 6, 2, 5, 1];
  Demos.circle = (stage) => {
    let sel = 0, rot = 0, target = 0, mode = "maj"; // mode: dış halka majör, iç halka akraba minör
    const body = h("div.ch-circlewrap");
    const svg = sv("svg", { class: "coc", viewBox: "-200 -200 400 400", role: "group", "aria-label": "Beşliler çemberi" });
    const panel = h("div.ch-keypanel", { "aria-live": "polite" });
    body.append(h("div.ch-cocbox", svg), panel);
    stage.append(body);
    const allBtn = h("button.btn", { type: "button", onclick: () => playCadence() }, "I–IV–V–I çal");
    stage.append(h("div.controls", h("span.ch-lab", "Saat yönü: her adımda bir diyez fazla. Ters yön: bir bemol."), h("span.spacer"), allBtn));

    const segs = [];
    const arc = (r1, r2, a0, a1) => {
      const p = (r, a) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
      return `M${p(r2, a0)} A${r2} ${r2} 0 0 1 ${p(r2, a1)} L${p(r1, a1)} A${r1} ${r1} 0 0 0 ${p(r1, a0)} Z`;
    };
    const rimG = sv("g"); svg.append(rimG);
    for (let k = 0; k < 12; k++) {
      const K = T.CIRCLE[k];
      const outer = sv("path", { class: "seg-maj", "data-key": k, role: "button", tabindex: 0, "aria-label": K.label.replace(" / ", " ya da ") + " majör" });
      const inner = sv("path", { class: "seg-min", "data-key": k, "aria-hidden": "true" });
      const lab = k === 6 ? "Fa♯" : K.label;
      const t1 = sv("text", { class: "lab-maj", "text-anchor": "middle", "dominant-baseline": "central" }, lab.replace(/[♯♭]/, ""));
      if (/[♯♭]/.test(lab)) t1.append(sv("tspan", { class: "acc" }, lab.match(/[♯♭]/)[0]));
      const t2 = sv("text", { class: "lab-min", "text-anchor": "middle", "dominant-baseline": "central" }, K.minor);
      const t3 = sv("text", { class: "lab-acc", "text-anchor": "middle", "dominant-baseline": "central" }, K.acc === 0 ? "" : K.acc > 0 ? K.acc + "♯" : -K.acc + "♭");
      // harf karşılıkları: majör tonun altında C, minörün altında Am
      const t4 = sv("text", { class: "lab-let", "text-anchor": "middle", "dominant-baseline": "central" }, T.toLetter(lab));
      const t5 = sv("text", { class: "lab-let lab-let-min", "text-anchor": "middle", "dominant-baseline": "central" }, T.toLetter(K.minor));
      outer.addEventListener("click", () => choose(k, "maj"));
      inner.addEventListener("click", () => choose(k, "min"));
      inner.setAttribute("role", "button"); inner.setAttribute("tabindex", 0); inner.removeAttribute("aria-hidden");
      inner.setAttribute("aria-label", K.minor.replace(/m$/, "") + " minör");
      inner.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); choose(k, "min"); } });
      outer.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); choose(k, "maj"); } });
      rimG.append(outer, inner, t1, t2, t3, t4, t5);
      segs.push({ outer, inner, t1, t2, t3, t4, t5 });
    }
    const center = sv("g", { class: "coc-center" });
    const cName = sv("text", { class: "c-name", "text-anchor": "middle", y: -6 });
    const cSub = sv("text", { class: "c-sub", "text-anchor": "middle", y: 22 });
    center.append(sv("circle", { r: 66, class: "c-disc" }), cName, cSub);
    svg.append(center);

    function draw() {
      segs.forEach((s, k) => {
        const a = ((k * 30 + rot - 90) * Math.PI) / 180, w = (15 * Math.PI) / 180;
        s.outer.setAttribute("d", arc(124, 186, a - w + 0.01, a + w - 0.01));
        s.inner.setAttribute("d", arc(72, 122, a - w + 0.01, a + w - 0.01));
        const pos = (r) => [r * Math.cos(a), r * Math.sin(a)];
        // harf karşılığı, çemberin her yönünde ton adının hemen altında durur
        const [x1, y1] = pos(161), [x2, y2] = pos(99), [x3, y3] = pos(133);
        s.t1.setAttribute("x", x1); s.t1.setAttribute("y", y1 - 5);
        s.t4.setAttribute("x", x1); s.t4.setAttribute("y", y1 + 11);
        s.t2.setAttribute("x", x2); s.t2.setAttribute("y", y2 - 4);
        s.t5.setAttribute("x", x2); s.t5.setAttribute("y", y2 + 8);
        s.t3.setAttribute("x", x3); s.t3.setAttribute("y", y3);
        const rel = (k - sel + 12) % 12;
        // majörde: I, V (saat yönü komşu), IV (ters yön komşu). Minörde: i ve iv iç halkada,
        // majör V dış halkada dört adım ötede (La minör → Mi majör)
        let roleO, roleI;
        if (mode === "min") {
          roleO = rel === 0 ? "tonic" : rel === 4 ? "dom" : "";
          roleI = rel === 0 ? "tonic" : rel === 11 ? "sub" : "";
        } else roleO = roleI = rel === 0 ? "tonic" : rel === 1 ? "dom" : rel === 11 ? "sub" : "";
        s.outer.dataset.role = roleO; s.inner.dataset.role = roleI;
        s.t1.dataset.role = roleO; s.t2.dataset.role = roleI;
      });
    }
    // dönüş animasyonu
    const lp = loop((dt) => {
      const diff = target - rot;
      if (Math.abs(diff) < 0.05) { rot = target; draw(); lp.stop(); return; }
      rot += diff * Math.min(1, dt * 7);
      draw();
    });
    // minör tonun kökü ve harfi: "Fa♯m" → kök Fa♯, harf Fa
    function minorRoot(k) {
      const K = T.CIRCLE[k], base = K.minor.replace(/m$/, "");
      return { pc: (K.pc + 9) % 12, letter: LET.indexOf(base.replace(/[♯♭]+$/, "")) };
    }
    function chordsOf(k) {
      const K = T.CIRCLE[k], flats = K.acc < 0;
      if (mode === "min") {
        // i – iv – V: V majördür, çünkü minörün 7. derecesi yarım ses yükseltilir (armonik minör)
        const R = minorRoot(k);
        const mk = (r, step, semis, type, fn) => {
          const n = spell(60 + ((R.pc + semis) % 12), (R.letter + step) % 7);
          const nm = n.name + (type === "min" ? "m" : "");
          return { r, pc: (R.pc + semis) % 12, fn, type, name: `${nm} (${T.toLetter(nm)})` };
        };
        return [mk("i", 0, 0, "min", "tonic"), mk("iv", 3, 5, "min", "sub"), mk("V", 4, 7, "maj", "dom")];
      }
      const I = K.pc, IV = T.CIRCLE[(k + 11) % 12].pc, V = T.CIRCLE[(k + 1) % 12].pc;
      const nm = (pc) => T.name(pc, { flats, octave: false });
      return [["I", I, "tonic"], ["IV", IV, "sub"], ["V", V, "dom"]].map(([r, pc, fn]) => ({ r, pc, fn, type: "maj", name: `${nm(pc)} (${T.letter(pc, { flats, octave: false })})` }));
    }
    function sigStaff(acc) {
      const W = 150, gap = 9, base = gap * 7.2;
      const s = sv("svg", { class: "ch-sig", viewBox: `0 0 ${W} ${gap * 9}`, "aria-hidden": "true" });
      for (let i = 0; i < 5; i++) s.append(sv("line", { x1: 2, x2: W - 2, y1: base - i * gap, y2: base - i * gap, stroke: rgba(C.ink, 0.45) }));
      s.append(sv("path", { d: L.GCLEF_D, fill: rgba(C.ink, 0.8), transform: L.gclefTransform(4, base - 4 * gap, gap) }));
      const n = Math.abs(acc), sharp = acc > 0;
      for (let i = 0; i < n; i++) {
        const p = (sharp ? SHARP_POS : FLAT_POS)[i];
        s.append(sv("text", { x: 34 + i * 15, y: base - (p * gap) / 2 + (sharp ? 5 : 3), fill: C.ink, "font-size": gap * 2, "font-family": "system-ui, sans-serif", "text-anchor": "middle" }, sharp ? "♯" : "♭"));
      }
      return s;
    }
    function renderPanel() {
      const K = T.CIRCLE[sel];
      const name = sel === 6 ? "Fa♯ / Sol♭" : K.label;
      const nm = sel === 6 ? "Fa♯" : K.label;
      const minName = K.minor.replace(/m$/, "");
      const big = mode === "min" ? K.minor : nm;
      // değiştirici işaret yerinde kalsın: "Fa♯m" → Fa + ♯ + m
      cName.textContent = "";
      big.split(/([♯♭])/).filter(Boolean).forEach((part) => cName.append(/[♯♭]/.test(part) ? sv("tspan", { class: "acc" }, part) : document.createTextNode(part)));
      cSub.textContent = (mode === "min" ? "minör · " : "majör · ") + T.toLetter(big);
      svg.dataset.mode = mode;
      panel.innerHTML = "";
      if (mode === "min") {
        const R = minorRoot(sel), lt = spell(60 + ((R.pc + 11) % 12), (R.letter + 6) % 7).name;
        panel.append(h("p.ch-sym", acc(minName + " minör"), h("small.ch-let", acc(T.toLetter(K.minor)))),
          h("p.ch-full", acc("Akraba majör: " + name + " majör (" + T.toLetter(name) + ")")),
          h("p.ch-desc", acc(`Donanımı akraba majörüyle aynıdır. V akoru majördür: 7. derece yarım ses yükseltilir (${lt}), böylece toniğe çeken bir yeden oluşur.`)));
      } else {
        panel.append(h("p.ch-sym", acc(name + " majör"), h("small.ch-let", acc(T.toLetter(name)))), h("p.ch-full", acc("Akraba minör: " + minName + " minör (" + T.toLetter(K.minor) + ")")));
      }
      let sigText;
      if (K.acc === 0) sigText = "Donanım yok: diyez de bemol de yok.";
      else if (sel === 6) sigText = "6 diyez (Fa♯ majör) ya da 6 bemol (Sol♭ majör). Eşit tamperamanda aynı tuşlar.";
      else if (K.acc > 0) sigText = `${K.acc} diyez: ${T.SHARP_ORDER.slice(0, K.acc).map((x) => `${x}♯ (${T.toLetter(x)}♯)`).join(", ")}`;
      else sigText = `${-K.acc} bemol: ${T.FLAT_ORDER.slice(0, -K.acc).map((x) => `${x}♭ (${T.toLetter(x)}♭)`).join(", ")}`;
      panel.append(h("div.ch-sigrow", sigStaff(K.acc), h("p.ch-desc", sigText)));
      const row = h("div.ch-ivrow");
      chordsOf(sel).forEach((c) => {
        row.append(h("button.ch-deg.f-" + c.fn + ".main", { type: "button", "aria-label": `${c.r}: ${c.name}`, onclick: () => { Snd.chord(voice(c.pc, T.CHORDS[c.type].iv, 55).map((m) => T.mtof(m)), { gain: 0.32, dur: 1.1, strum: 0.02 }); } },
          h("b", c.r), h("small", c.name)));
      });
      // üç ana akorun notaları, doğru yazımla: birlikte gamın yedi notasını kapsar
      const cs = chordsOf(sel);
      const notesOf = (c) => {
        const root = c.name.split(" (")[0].replace(/m$/, ""), rl = LET.indexOf(root.replace(/[♯♭]+$/, ""));
        return spellChord(60 + c.pc, rl, c.type).map((n) => n.name).join("–");
      };
      const parts = cs.map((c) => `${c.r}: ${notesOf(c)}`).join(" · ");
      panel.append(h("p.ch-lab", mode === "min" ? "Ana akorlar: i, iv, V" : "Ana akorlar: I, IV, V"), row,
        h("p.ch-why", mode === "min"
          ? acc(`Minör tonun üç temel akoru: gamın 1., 4. ve 5. derecesi üzerine kurulur. i (tonik) ev, iv (subdominant) uzaklaşma, V (dominant) gerilim ve eve dönme isteğidir. Üçü birlikte gamın yedi notasının hepsini içerir (${parts}), bu yüzden bir ezgiye eşlik etmek için çoğu zaman yeter.`)
          : acc(`Tonun üç temel akoru: gamın 1., 4. ve 5. derecesi üzerine kurulur. I (tonik) ev, IV (subdominant) uzaklaşma, V (dominant) gerilim ve eve dönme isteğidir. Üçü birlikte gamın yedi notasının hepsini içerir (${parts}); bu yüzden pek çok halk ve pop şarkısı yalnızca bu üç akorla çalınabilir.`)),
        h("p.ch-desc", mode === "min"
          ? "Çemberde: iv iç halkada solda (yeşil), majör V dış halkada dört adım ötede (kırmızı)."
          : "Çemberde de yan yanadırlar: IV ters yönde (yeşil), V saat yönünde (kırmızı) komşudur."));
    }
    let timers = [];
    function playCadence() {
      timers.forEach(clearTimeout); timers = [];
      const cs = chordsOf(sel), seq = [cs[0], cs[1], cs[2], cs[0]];
      const btns = panel.querySelectorAll(".ch-ivrow .ch-deg");
      const c = Snd.ready(); const t0 = c ? c.currentTime + 0.05 : 0;
      seq.forEach((ch, i) => {
        if (c) block(voice(ch.pc, T.CHORDS[ch.type].iv, 55), t0 + i * 0.55, i === 3 ? 1.4 : 0.5, 0.3);
        timers.push(setTimeout(() => { btns.forEach((b) => b.classList.toggle("on", b.querySelector("b").textContent === ch.r)); }, i * 550 + 30));
      });
      timers.push(setTimeout(() => btns.forEach((b) => b.classList.remove("on")), 4 * 550 + 900));
    }
    function choose(k, m = "maj") {
      sel = k; mode = m;
      allBtn.textContent = m === "min" ? "i–iv–V–i çal" : "I–IV–V–I çal";
      let t = -k * 30;
      while (t - rot > 180) t -= 360;
      while (t - rot < -180) t += 360;
      target = t;
      draw(); renderPanel(); lp.start();
      playCadence();
    }
    draw(); renderPanel();
    return { enter() {}, leave() { lp.stop(); timers.forEach(clearTimeout); rot = target; draw(); } };
  };
  G["besliler-cemberi"] = [{ tap: "css:.coc [data-key='1'].seg-maj", at: [0.5, 0.5] }, { wait: 2600 }, { tap: "css:.coc [data-key='11'].seg-maj", at: [0.5, 0.5] }];

  /* ================= Akor yürüyüşleri ================= */
  // her akor: derece (0..6), tür, süre (vuruş)
  const PROGS = {
    pop: { ad: "I–V–vi–IV", seq: [[0, "maj", 4], [4, "maj", 4], [5, "min", 4], [3, "maj", 4]] },
    jazz: { ad: "ii–V–I", seq: [[1, "min7", 4], [4, "dom7", 4], [0, "maj7", 8]] },
    blues: { ad: "12 ölçülük blues", seq: [[0, "dom7", 16], [3, "dom7", 8], [0, "dom7", 8], [4, "dom7", 4], [3, "dom7", 4], [0, "dom7", 4], [4, "dom7", 4]] },
  };
  const ROMAN_OF = (deg, type) => {
    const r = T.ROMAN[deg];
    return r + (type === "dom7" ? "7" : type === "min7" ? "7" : type === "maj7" ? "maj7" : "");
  };
  // derece çemberi: beşliler sırasıyla (IV, I, V, ii, vi, iii, vii°)
  const RING = [0, 4, 1, 5, 2, 6, 3];
  Demos.progressions = (stage) => {
    let prog = "pop", bpm = 96;
    const TONIC = 60;
    const top = h("div.ch-progtop");
    const ring = sv("svg", { class: "ch-ring", viewBox: "-110 -110 220 220", "aria-hidden": "true" });
    const right = h("div.ch-progright");
    const chips = h("div.ch-chips", { "aria-live": "off" });
    const now = h("p.ch-now", { "aria-live": "polite" });
    right.append(chips, now);
    top.append(ring, right);
    const pianoBox = h("div.ch-piano");
    stage.append(top, pianoBox);
    const piano = Piano(pianoBox, { from: 53, to: 77, compact: true });

    // halka
    const nodes = [];
    const trail = sv("path", { class: "ch-trail", fill: "none" });
    ring.append(sv("circle", { r: 78, class: "ch-ringline" }), trail);
    RING.forEach((deg, k) => {
      const a = ((k * 360) / 7 - 90) * Math.PI / 180; // I üstte, saat yönünde beşli yukarı
      const x = 78 * Math.cos(a), y = 78 * Math.sin(a);
      const fn = T.FUNCTION[deg];
      const g = sv("g", { class: "ch-node f-" + fn, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` },
        sv("circle", { r: 20 }), sv("text", { "text-anchor": "middle", "dominant-baseline": "central" }, T.ROMAN[deg]));
      ring.append(g);
      nodes[deg] = { g, x, y };
    });
    ring.append(sv("text", { class: "ch-ringcap", "text-anchor": "middle", y: 4 }, "Do majör (C)"));

    // vuruş → akor indeksi
    let beats = [];
    function build() {
      const P = PROGS[prog];
      beats = [];
      P.seq.forEach((c, i) => { for (let b = 0; b < c[2]; b++) beats.push({ ci: i, b, first: b === 0, barBeat: b % 4 }); });
      chips.innerHTML = "";
      P.seq.forEach(([deg, type, len], i) => {
        const dc = T.diatonicChord(TONIC, deg);
        const fn = T.FUNCTION[deg];
        const nm = T.chordName(dc.root, type);
        const bars = len / 4;
        chips.append(h("span.ch-chip.f-" + fn, { "data-i": i, style: { "--bars": bars } }, h("b", ROMAN_OF(deg, type)), h("small", nm + (bars > 1 ? ` · ${bars} ölçü` : ""))));
      });
      show(-1);
    }
    let lastCi = -2, prevDeg = null;
    function show(ci) {
      if (ci === lastCi) return;
      lastCi = ci;
      chips.querySelectorAll(".ch-chip").forEach((c) => c.classList.toggle("on", +c.dataset.i === ci));
      nodes.forEach((n) => n && n.g.classList.remove("on"));
      piano.clear();
      if (ci < 0) { now.textContent = "Bir yürüyüş seçip Çal'a basın."; trail.setAttribute("d", ""); prevDeg = null; return; }
      const [deg, type] = PROGS[prog].seq[ci];
      const dc = T.diatonicChord(TONIC, deg), fn = T.FUNCTION[deg];
      nodes[deg].g.classList.add("on");
      if (prevDeg != null && prevDeg !== deg) {
        const a = nodes[prevDeg], b = nodes[deg];
        trail.setAttribute("d", `M${a.x} ${a.y} Q0 0 ${b.x} ${b.y}`);
        trail.setAttribute("stroke", FN_COL[fn]);
      }
      prevDeg = deg;
      const vs = voice(dc.root, T.CHORDS[type].iv, 57);
      vs.forEach((m) => piano.mark(m, FN_CLS[fn], T.pcOf(m) === T.pcOf(dc.root) ? ROMAN_OF(deg, type) : ""));
      now.innerHTML = "";
      now.append(h("b.c-" + (fn === "sub" ? "wave" : fn === "dom" ? "tension" : "tonic"), T.chordBoth(dc.root, type)), ` ${FN_AD[fn]}`);
    }
    // ses: vuruş başına
    function step(i, time) {
      const bt = beats[i % beats.length];
      const [deg, type] = PROGS[prog].seq[bt.ci];
      const dc = T.diatonicChord(TONIC, deg);
      const vs = voice(dc.root, T.CHORDS[type].iv, 57);
      const bassRoot = 36 + T.pcOf(dc.root);
      if (time == null) return;
      if (prog === "blues") {
        // yürüyen bas: kök, üçlü, beşli, altılı
        const walk = [0, 4, 7, 9][bt.barBeat];
        Snd.pluck(T.mtof(bassRoot + walk), { when: time, gain: 0.34, dur: 0.4, amps: [1, 0.4, 0.15] });
        if (bt.barBeat === 1 || bt.barBeat === 3) block(vs, time, 0.22, 0.2);
      } else {
        if (bt.barBeat === 0) Snd.pluck(T.mtof(bassRoot), { when: time, gain: 0.36, dur: 0.9, amps: [1, 0.4, 0.15] });
        if (bt.barBeat === 2) Snd.pluck(T.mtof(bassRoot + 7), { when: time, gain: 0.26, dur: 0.6, amps: [1, 0.4, 0.15] });
        if (bt.first) block(vs, time, 1.4, 0.3);
        else if (prog === "pop" && bt.barBeat === 2) block(vs, time, 0.6, 0.18);
        else if (prog === "jazz" && bt.barBeat === 2) block(vs, time, 0.5, 0.16);
      }
    }
    const sched = Snd.scheduler({ step, interval: () => 60 / bpm });
    // ses kilitliyse yalnız görsel ilerleme
    let visT = 0, visI = 0, visual = false;
    const lp = loop(() => {
      let i = visual ? visI : sched.current();
      if (i >= 0) show(beats[i % beats.length].ci);
    });
    let playing = false;
    const playBtn = h("button.btn.primary", { type: "button", onclick: () => (playing ? stop() : start()) }, "Çal");
    function start() {
      playing = true; playBtn.textContent = "Durdur"; playBtn.classList.add("on");
      lastCi = -2; prevDeg = null;
      visual = !sched.start(0);
      if (visual) {
        visI = 0;
        const tick = () => { if (!playing) return; visI++; visT = setTimeout(tick, 60000 / bpm); };
        visT = setTimeout(tick, 60000 / bpm);
      }
      lp.start();
    }
    function stop() {
      playing = false; playBtn.textContent = "Çal"; playBtn.classList.remove("on");
      sched.stop(); clearTimeout(visT); lp.stop(); lastCi = -2; show(-1);
    }
    const progSeg = seg(Object.entries(PROGS).map(([k, p]) => [k, p.ad]), prog, (k) => { prog = k; const was = playing; if (was) stop(); build(); if (was) start(); }, "Yürüyüş");
    const tempo = slider({ label: "Tempo", min: 60, max: 150, step: 1, value: bpm, fmt: (v) => v + " BPM", oninput: (v) => { bpm = v; } });
    stage.append(h("div.controls", progSeg, playBtn, h("span.spacer"), tempo));
    build();
    return { enter() {}, leave() { stop(); } };
  };
  G.yuruyusler = [{ click: "=I–V–vi–IV" }, { wait: 500 }, { click: "=Çal" }, { wait: 5200 }];

  /* ---------- Modülasyon: Do majörden başka bir tona geçmek ----------
     Her senaryo bir akor dizisi: [kök pc, tür, roma rakamı, işlev, ton, açıklama, ortak akor mu].
     Do majör gamında olmayan notalar (yeni tonun getirdiği değişiklikler) kırmızı işaretlenir. */
  Demos.modulation = (stage) => {
    const C_MAJ = [0, 2, 4, 5, 7, 9, 11];
    const KEYS = {
      do: { ad: "Do majör", kisa: "Do", let: "C", ring: "maj", idx: 0 },
      sol: { ad: "Sol majör", kisa: "Sol", let: "G", ring: "maj", idx: 1 },
      re: { ad: "Re majör", kisa: "Re", let: "D", ring: "maj", idx: 2 },
      lam: { ad: "La minör", kisa: "Lam", let: "Am", ring: "min", idx: 0 },
      dom: { ad: "Do minör", kisa: "Dom", let: "Cm", ring: "min", idx: 9 },
    };
    const HOME = [
      [0, "maj", "I", "tonic", "do", "Do: I, ev."],
      [5, "maj", "IV", "sub", "do", "Fa: IV, evden uzaklaşma."],
      [7, "dom7", "V7", "dom", "do", "Sol7: V7, gerilim."],
      [0, "maj", "I", "tonic", "do", "Do: I, eve dönüş."],
    ];
    const SC = {
      home: { hedef: "do", seq: HOME },
      sol: { hedef: "sol", seq: [
        [0, "maj", "I", "tonic", "do", "Do: I, başlangıç tonu."],
        [9, "min", "vi = ii", "sub", "do", "Lam: Do majörde vi, Sol majörde ii — ortak akor, iki tona da ait.", true],
        [2, "dom7", "V7", "dom", "sol", "Re7: Sol majörün dominantı. Fa♯ yeni nota: artık Do majörde değiliz."],
        [7, "maj", "I", "tonic", "sol", "Sol: yeni tonik. Modülasyon tamam."],
        [0, "maj", "IV", "sub", "sol", "Do: Sol majörde IV — aynı akor, yeni görev."],
        [2, "dom7", "V7", "dom", "sol", "Re7: V7, yeni tonu pekiştiren kadans."],
        [7, "maj", "I", "tonic", "sol", "Sol: I, yeni ev."],
      ] },
      lam: { hedef: "lam", seq: [
        [0, "maj", "I", "tonic", "do", "Do: I, başlangıç tonu."],
        [4, "dom7", "V7", "dom", "lam", "Mi7: La minörün dominantı. Sol♯ yeni nota, La'ya çekilen yeden."],
        [9, "min", "i", "tonic", "lam", "Lam: akraba minör. Aynı notalar, yeni merkez."],
        [2, "min", "iv", "sub", "lam", "Rem: iv."],
        [4, "dom7", "V7", "dom", "lam", "Mi7: V7, yine Sol♯."],
        [9, "min", "i", "tonic", "lam", "Lam: i, minör ev."],
      ] },
      dom: { hedef: "dom", seq: [
        [0, "maj", "I", "tonic", "do", "Do: I, majör."],
        [5, "min", "iv", "sub", "dom", "Fam: La♭ gelir — ışık kısılmaya başlar."],
        [7, "dom7", "V7", "dom", "dom", "Sol7: aynı dominant, iki tona da ait."],
        [0, "min", "i", "tonic", "dom", "Dom: aynı tonik, minör. Mi♭ yeni nota."],
        [5, "min", "iv", "sub", "dom", "Fam: iv."],
        [7, "dom7", "V7", "dom", "dom", "Sol7: V7."],
        [0, "min", "i", "tonic", "dom", "Dom: i. Do minör gamı Mi♭, La♭ ve Si♭ getirir; dominantta ise yeden Si korunur."],
      ] },
      re: { hedef: "re", seq: [
        ...HOME.map((x) => [...x]),
        [2, "maj", "I", "tonic", "re", "Re: hazırlıksız, bir tam ses yukarı! Aynı cümle yeni tonda.", false, true],
        [7, "maj", "IV", "sub", "re", "Sol: Re majörde IV."],
        [9, "dom7", "V7", "dom", "re", "La7: V7. Fa♯ ve Do♯ yeni notalar."],
        [2, "maj", "I", "tonic", "re", "Re: I, enerji bir basamak yukarıda."],
      ] },
    };
    const STEP = 1.05; // saniye

    const top = h("div.md-top");
    const svgWrap = h("div.md-circle");
    const info = h("div.ch-info.md-info");
    top.append(svgWrap, info);
    const pianoBox = h("div.ch-piano");
    stage.append(top, pianoBox);
    const piano = Piano(pianoBox, { from: 48, to: 83, compact: true });

    // beşliler çemberi: dışta majörler, içte akraba minörler
    const W = 240, cx = 120, cy = 120, RO = 96, RI = 60;
    const svg = sv("svg", { viewBox: `0 0 ${W} ${W}`, class: "md-svg", role: "img", "aria-label": "Beşliler çemberinde ton yolculuğu" });
    svgWrap.append(svg);
    const pos = (ring, idx) => { const a = -Math.PI / 2 + (idx * Math.PI * 2) / 12, r = ring === "maj" ? RO : RI; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    svg.append(sv("circle", { cx, cy, r: RO, fill: "none", stroke: rgba(C.ink, 0.12) }), sv("circle", { cx, cy, r: RI, fill: "none", stroke: rgba(C.ink, 0.12) }));
    const path = sv("path", { class: "md-path", fill: "none", d: "" });
    svg.append(path);
    const nodes = {};
    T.CIRCLE.forEach((k, i) => {
      for (const ring of ["maj", "min"]) {
        const [x, y] = pos(ring, i);
        const lab = ring === "maj" ? (i === 6 ? "Fa♯" : k.label) : (i === 6 ? "Re♯m" : k.minor);
        const g = sv("g", { class: "md-node " + ring });
        // düğümde solfej adı ve altında küçük harf karşılığı (Do / C, Lam / Am)
        g.append(sv("circle", { cx: x, cy: y, r: ring === "maj" ? 15 : 12 }), sv("text", { x, y: y + (ring === "maj" ? 0.5 : 0.5), "text-anchor": "middle" }, lab),
          sv("text", { x, y: y + (ring === "maj" ? 8.5 : 7), "text-anchor": "middle", class: "md-let" }, T.toLetter(lab)));
        svg.append(g);
        nodes[ring + i] = g;
      }
    });
    function journey(from, to) {
      if (!to || (from.ring === to.ring && from.idx === to.idx)) { path.setAttribute("d", ""); return; }
      let [x1, y1] = pos(from.ring, from.idx), [x2, y2] = pos(to.ring, to.idx);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, qx = cx + (mx - cx) * 0.35, qy = cy + (my - cy) * 0.35;
      // ok düğümlerin kenarından başlayıp kenarında bitsin (yazıların üstünden geçmesin)
      const trim = (x, y, r) => { const dx = qx - x, dy = qy - y, d = Math.hypot(dx, dy) || 1; return [x + (dx / d) * r, y + (dy / d) * r]; };
      [x1, y1] = trim(x1, y1, from.ring === "maj" ? 17 : 14); [x2, y2] = trim(x2, y2, to.ring === "maj" ? 17 : 14);
      path.setAttribute("d", `M${x1} ${y1} Q${qx} ${qy} ${x2} ${y2}`);
    }
    function lightKey(key) {
      Object.values(nodes).forEach((g) => g.classList.remove("on", "home"));
      nodes["maj0"].classList.add("home");
      if (key) nodes[key.ring + key.idx].classList.add("on");
    }

    const keyLine = h("p.ch-sym.md-key");
    const strip = h("div.md-strip");
    const say = h("p.ch-desc.md-say", { "aria-live": "polite" });
    info.append(keyLine, strip, say);

    let timers = [], chips = [], cur = null;
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    function setKey(k) {
      const K = KEYS[k];
      keyLine.innerHTML = "";
      keyLine.append(...acc(K.ad), h("small.ch-let", K.let));
    }
    function chordInfo(step) {
      const [pc, type, , fn] = step;
      const sp = spellChord(48 + pc, ROOTS[pc][1], type);
      const name = sp[0].name + T.CHORDS[type].sym;
      return { sp, name, fn, ms: voice(pc, T.CHORDS[type].iv, 55), bass: 48 + pc };
    }
    function buildStrip(seq) {
      strip.innerHTML = "";
      chips = seq.map((st) => {
        const ci = chordInfo(st);
        const K = KEYS[st[4]];
        const c = h("span.md-chip.f-" + ci.fn + (st[6] ? ".pivot" : "") + (st[7] ? ".jump" : ""),
          h("small.md-k", ...acc(K.kisa + ":")), h("b", st[2]), h("small", ...acc(`${ci.name} (${T.toLetter(ci.name)})`)));
        strip.append(c); return c;
      });
    }
    function show(st, i) {
      const ci = chordInfo(st);
      chips.forEach((c, k) => c.classList.toggle("on", k === i));
      piano.clear();
      const nameOf = {};
      ci.sp.forEach((n) => { nameOf[T.pcOf(n.m)] = n.name; });
      [ci.bass, ...ci.ms].forEach((m) => {
        const outside = !C_MAJ.includes(T.pcOf(m));
        piano.mark(m, outside ? "tension" : FN_CLS[ci.fn], outside ? nameOf[T.pcOf(m)] : m === ci.bass ? st[2].split(" ")[0] : "");
      });
      const K = KEYS[st[4]];
      setKey(st[4]); lightKey(K);
      say.innerHTML = "";
      say.append(...acc(st[5]));
      // ses: blok akor + bas
      const c = Snd.ready();
      if (c) { block(ci.ms, 0, STEP * 0.95, 0.28); Snd.pluck(T.mtof(ci.bass), { gain: 0.3, dur: STEP * 0.9 }); }
    }
    function run(name) {
      clear();
      cur = name;
      btns.forEach(([k, b]) => b.classList.toggle("on", k === name));
      const S = SC[name];
      buildStrip(S.seq);
      journey(KEYS.do, name === "home" ? null : KEYS[S.hedef]);
      S.seq.forEach((st, i) => timers.push(setTimeout(() => show(st, i), i * STEP * 1000)));
      timers.push(setTimeout(() => { chips.forEach((c) => c.classList.remove("on")); btns.forEach(([, b]) => b.classList.remove("on")); }, S.seq.length * STEP * 1000 + 300));
    }
    const TARGETS = [["home", "Do'da çal"], ["sol", "Komşu ton (Sol)"], ["lam", "Akraba minör (Lam)"], ["dom", "Paralel minör (Dom)"], ["re", "Bir basamak yukarı (Re)"]];
    const btns = TARGETS.map(([k, lab]) => [k, h("button.btn" + (k === "home" ? ".primary" : ""), { type: "button", onclick: () => run(k) }, ...acc(lab))]);
    stage.append(h("div.controls.md-controls", ...btns.map(([, b]) => b)));

    // başlangıç görünümü
    buildStrip(HOME); setKey("do"); lightKey(KEYS.do);
    say.textContent = "Önce Do majördeki cümleyi dinleyin, sonra bir hedef seçin.";
    return { enter() {}, leave() { clear(); piano.clear(); chips.forEach((c) => c.classList.remove("on")); btns.forEach(([, b]) => b.classList.remove("on")); } };
  };
  G.modulasyon = [{ click: "Do'da çal" }, { wait: 4400 }, { click: "Komşu ton" }];
})();
