/* 6. bölüm (Hepsi bir arada) demoları: mini beste alanı ve kapanış telleri */
(function () {
  const { C, h, slider, seg } = L;
  const G = (window.GuideScenarios = window.GuideScenarios || {});

  /* ---------- Mini beste ----------
     4 ölçü × 4 dörtlük = 16 adım. Üstte akor yürüyüşü, altta gama kilitli melodi ızgarası. */
  Demos.compose = (stage) => {
    const TONIC = 60, S = 16, PER_BAR = 4;
    const PROGS = {
      pop: { ad: "I–V–vi–IV", deg: [0, 4, 5, 3] },
      kanon: { ad: "vi–IV–I–V", deg: [5, 3, 0, 4] },
      klasik: { ad: "I–IV–V–I", deg: [0, 3, 4, 0] },
    };
    const SCALE = T.scaleNotes(TONIC, T.SCALES.major.steps).slice(0, 7);
    const inScale = (m) => T.inScale(m, TONIC, T.SCALES.major.steps);
    let prog = "pop", free = false, drums = true, bpm = 96;
    const melody = new Array(S).fill(null); // adım → MIDI
    const chordAt = (s) => {
      const d = PROGS[prog].deg[Math.floor(s / PER_BAR) % 4];
      const c = T.diatonicChord(TONIC, d);
      return { ...c, deg: d, notes: T.chord(c.root, c.type), name: T.chordName(c.root, c.type) };
    };
    const FN_COLOR = { tonic: "tonic", sub: "wave", dom: "tension" };
    const rowsFor = () => {
      const r = [];
      for (let m = 79; m >= 60; m--) r.push(m);
      return r;
    };

    const E = () => 60 / bpm / 2; // sekizlik
    const tr = Transport({
      interval: () => E(),
      step(i, t) {
        const e = i % (S * 2), s = e >> 1, half = e & 1;
        if (!half && s % PER_BAR === 0) {
          const c = chordAt(s);
          Snd.chord(c.notes.map((m) => T.mtof(m - 12)), { when: t, dur: E() * 2 * PER_BAR * 0.92, gain: 0.2 });
          Snd.pluck(T.mtof(c.root - 24), { when: t, dur: E() * 2 * PER_BAR * 0.9, gain: 0.26 });
        }
        if (drums) {
          if (!half && s % 2 === 0) Snd.drum("kick", t, 0.7);
          if (!half && s % 2 === 1) Snd.drum("snare", t, 0.55);
          Snd.drum("hat", t, half ? 0.35 : 0.55);
        }
        if (!half && melody[s] != null) Snd.pluck(T.mtof(melody[s]), { when: t, dur: E() * 1.9, gain: inScale(melody[s]) ? 0.34 : 0.38 });
      },
    });

    // ---- DOM ----
    const head = h("div.cp-head");
    const grid = h("div.cp-grid");
    const wrap = h("div.cp", head, grid);
    stage.append(h("div.fill.cp-fill", wrap));
    let cells = [];
    function build() {
      head.innerHTML = "";
      head.append(h("span.cp-corner"));
      for (let b = 0; b < 4; b++) {
        const c = chordAt(b * PER_BAR);
        head.append(h("span.cp-chord", { style: { "--c": `var(--${FN_COLOR[T.FUNCTION[c.deg]]})` }, "data-bar": b },
          h("b", c.name), h("small", c.roman + " · " + T.toLetter(c.name))));
      }
      grid.innerHTML = "";
      cells = [];
      const rows = rowsFor();
      setRows();
      rows.forEach((m) => {
        const out = !inScale(m);
        const lab = h("span.cp-lab" + (out ? ".out" : "") + (T.pcOf(m) === 0 ? ".do" : ""), T.name(m, { octave: T.pcOf(m) === 0 }));
        grid.append(lab);
        for (let s = 0; s < S; s++) {
          const ct = chordAt(s).notes.some((n) => T.pcOf(n) === T.pcOf(m));
          const b = h("button.cp-cell" + (out ? ".out" : "") + (ct ? ".ct" : "") + (s % PER_BAR === 0 ? ".bar" : ""),
            { type: "button", "data-s": s, "data-m": m, "aria-label": `${s + 1}. adım, ${T.name(m)}` });
          b.addEventListener("click", () => {
            melody[s] = melody[s] === m ? null : m;
            if (melody[s] != null) Snd.pluck(T.mtof(m), { dur: 0.5, gain: 0.3 });
            paint();
          });
          grid.append(b);
          cells.push(b);
        }
      });
      paint();
    }
    // gam dışı satırlar her zaman DOM'da; kilitliyken gizlenir
    function setRows() {
      grid.classList.toggle("locked", !free);
      grid.style.setProperty("--rows", free ? 20 : rowsFor().filter(inScale).length);
    }
    function paint() {
      cells.forEach((b) => b.classList.toggle("on", melody[+b.dataset.s] === +b.dataset.m));
      const outs = melody.filter((m) => m != null && !inScale(m)).length;
      status.textContent = outs ? `${outs} gam dışı nota` : melody.some((m) => m != null) ? "Bütün notalar gamın içinde" : "Izgara boş: hücrelere tıklayın";
      status.classList.toggle("c-tension", !!outs);
    }
    const status = h("span.readout.cp-status");

    let lastS = -1;
    const lp = L.loop(() => {
      const p = tr.pos();
      const s = p < 0 ? -1 : Math.floor(p / 2) % S;
      if (s === lastS) return;
      cells.forEach((b) => b.classList.toggle("now", +b.dataset.s === s));
      head.querySelectorAll(".cp-chord").forEach((c) => c.classList.toggle("now", s >= 0 && +c.dataset.bar === Math.floor(s / PER_BAR)));
      lastS = s;
    });

    const btn = h("button.btn.primary", { type: "button" }, "Çal");
    const syncBtn = () => { btn.textContent = tr.on ? "Durdur" : "Çal"; btn.classList.toggle("on", tr.on); };
    btn.addEventListener("click", () => { tr.on ? tr.stop() : tr.start(); syncBtn(); });
    const sg = seg(Object.entries(PROGS).map(([k, v]) => [k, v.ad]), prog, (k) => { prog = k; build(); }, "Akor yürüyüşü");
    const bFree = h("button.btn", { type: "button", "aria-pressed": "false" }, "Gamın dışına çık");
    bFree.addEventListener("click", () => {
      free = !free;
      if (!free) for (let s = 0; s < S; s++) if (melody[s] != null && !inScale(melody[s])) melody[s] = null;
      bFree.classList.toggle("on", free); bFree.classList.toggle("out", free); bFree.setAttribute("aria-pressed", free);
      setRows(); paint();
    });
    const bDrum = h("button.btn.on", { type: "button", "aria-pressed": "true" }, "Davul");
    bDrum.addEventListener("click", () => { drums = !drums; bDrum.classList.toggle("on", drums); bDrum.setAttribute("aria-pressed", drums); });
    const EXAMPLE = [64, 67, 72, 67, 71, 74, 71, 67, 69, 72, 76, 72, 65, 69, 72, null];
    const bEx = h("button.btn", { type: "button", onclick: () => { EXAMPLE.forEach((m, s) => (melody[s] = m)); if (prog !== "pop") { prog = "pop"; sg.set("pop"); build(); } else paint(); } }, "Örnek ezgi");
    const bClr = h("button.btn", { type: "button", onclick: () => { melody.fill(null); paint(); } }, "Temizle");
    stage.prepend(h("div.controls.top", sg, h("span.spacer"), status));
    stage.append(h("div.controls", btn, bFree, bDrum, h("span.spacer"), bEx, bClr));
    build();
    return {
      enter() { lp.start(); },
      leave() { lp.stop(); tr.stop(); syncBtn(); },
    };
  };
  G.beste = [
    { click: "css:.cp-cell[data-s='0'][data-m='64']" },
    { click: "css:.cp-cell[data-s='1'][data-m='67']" },
    { click: "css:.cp-cell[data-s='2'][data-m='72']" },
    { click: "css:.cp-cell[data-s='4'][data-m='71']" },
    { click: "Çal" }, { wait: 3200 },
    { click: "Gamın dışına çık" },
    { click: "css:.cp-cell[data-s='3'][data-m='70']" },
    { wait: 2600 },
  ];

  /* ---------- Kapanış: teller, gamı siz seçin ---------- */
  Demos.finale = (stage) => {
    const SC = {
      penta: { ad: "Pentatonik", steps: T.SCALES.pentaMajor.steps, tonic: 50 },
      major: { ad: "Majör", steps: T.SCALES.major.steps, tonic: 48 },
      minor: { ad: "Minör", steps: T.SCALES.natural.steps, tonic: 45 },
      hicaz: { ad: "Hicaz (yaklaşık)", steps: [1, 3, 1, 2, 2, 1, 2], tonic: 45 },
    };
    const fill = h("div.fill.fin-fill"); stage.append(fill);
    const s = Strings(fill, { scale: SC.penta.steps, tonic: SC.penta.tonic });
    const names = h("span.readout.fin-names");
    let cur = "penta";
    function show() {
      const c = SC[cur];
      const notes = T.scaleNotes(c.tonic, c.steps).slice(0, -1);
      names.innerHTML = "";
      notes.forEach((m, i) => names.append(h("span" + (i === 0 ? ".c-tonic" : ""), T.name(m, { octave: false, flats: T.pcOf(m) === 10 }))));
      if (cur === "hicaz") names.append(h("small", "12 perdeli yaklaşık hâli"));
    }
    function sweep() {
      const cv = fill.querySelector("canvas"); const w = cv.getBoundingClientRect().width;
      for (let i = 0; i < 15; i++) setTimeout(() => s.pluck(14 - i, w * (0.3 + i * 0.03), 0.6), i * 110);
    }
    const sg = seg(Object.entries(SC).map(([k, v]) => [k, v.ad]), cur, (k) => { cur = k; s.setScale(SC[k].steps, SC[k].tonic); show(); sweep(); }, "Gam");
    const bSweep = h("button.btn", { type: "button", onclick: sweep }, "Hepsini çal");
    stage.append(h("div.controls", sg, bSweep, h("span.spacer"), names));
    show();
    return { enter: s.enter, leave: s.leave };
  };
  G.kapanis = [{ click: "Hicaz" }, { wait: 2200 }, { click: "Minör" }, { wait: 1800 }, { tap: "css:.fin-fill canvas", at: [0.5, 0.35] }];
})();
