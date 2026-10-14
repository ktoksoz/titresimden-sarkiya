/* Ortak ses modülü (Web Audio API)
   - Tek AudioContext; tarayıcı kuralı gereği ilk kullanıcı hareketinde açılır.
   - Sinyal yolu: sesler → demo veriyolu (anlatım çalarken kısılır) → ana ses düzeyi → sınırlayıcı → hoparlör
   - Ses kapalıyken çalma istenirse ekranda "Sesi açmak için dokunun" uyarısı çıkar. */
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, demo = null, limiter = null, analyser = null, noiseBuf = null;
  let volume = 0.7, muted = false, ducked = false;
  const DUCK = 0.28;

  try {
    const v = localStorage.getItem("ses.duzey");
    if (v != null) volume = Math.max(0, Math.min(1, +v));
    muted = localStorage.getItem("ses.kapali") === "1";
  } catch (e) {}

  function build() {
    if (ctx || !AC) return ctx;
    ctx = new AC({ latencyHint: "interactive" });
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10; limiter.knee.value = 6; limiter.ratio.value = 12;
    limiter.attack.value = 0.003; limiter.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    demo = ctx.createGain();
    demo.gain.value = ducked ? DUCK : 1;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.6;
    demo.connect(analyser);
    demo.connect(master);
    master.connect(limiter);
    limiter.connect(ctx.destination);
    ctx.addEventListener && ctx.addEventListener("statechange", sync);
    return ctx;
  }
  const running = () => !!ctx && ctx.state === "running";

  // ilk kullanıcı hareketi: bağlamı aç
  function unlock() {
    build();
    if (ctx && ctx.state !== "running") ctx.resume().then(sync, () => {});
    sync();
  }
  ["pointerdown", "keydown", "touchend"].forEach((t) =>
    window.addEventListener(t, (e) => { if (e.isTrusted) unlock(); }, { capture: true, passive: true }));

  /* --- "Sesi açmak için dokunun" uyarısı --- */
  let hintEl = null, hintT = 0;
  function hint() {
    if (running()) return;
    if (!hintEl) {
      hintEl = document.createElement("button");
      hintEl.id = "sound-hint"; hintEl.type = "button";
      hintEl.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Sesi açmak için dokunun';
      hintEl.addEventListener("click", () => { unlock(); hideHint(); });
      document.body.append(hintEl);
    }
    hintEl.classList.add("on");
    clearTimeout(hintT);
    hintT = setTimeout(hideHint, 5000);
  }
  function hideHint() { hintEl && hintEl.classList.remove("on"); }

  /* --- alt çubuktaki ses düzeyi --- */
  const listeners = new Set();
  function sync() {
    if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02);
    // bağlam sonradan açıldıysa kısma durumunu yeniden uygula
    if (demo) demo.gain.setTargetAtTime(ducked ? DUCK : 1, ctx.currentTime, 0.05);
    if (running()) hideHint();
    listeners.forEach((f) => f());
  }
  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (volume > 0 && muted) muted = false;
    try { localStorage.setItem("ses.duzey", String(volume)); localStorage.setItem("ses.kapali", muted ? "1" : "0"); } catch (e) {}
    sync();
  }
  function setMuted(m) {
    muted = m;
    try { localStorage.setItem("ses.kapali", muted ? "1" : "0"); } catch (e) {}
    sync();
  }
  // anlatım çalarken demo seslerini kıs
  function duck(on) {
    ducked = on;
    if (demo) demo.gain.setTargetAtTime(on ? DUCK : 1, ctx.currentTime, on ? 0.08 : 0.35);
  }

  /* --- yardımcılar --- */
  // çalma isteği: bağlam hazır değilse uyarı göster, null döndür
  function ready() {
    build();
    if (!ctx) return null;
    if (ctx.state !== "running") { hint(); return null; }
    return ctx;
  }
  const now = () => (ctx ? ctx.currentTime : 0);
  // dalga biçimine göre düzey: sinüs dışındakiler kulak tırmalamasın
  const TYPE_GAIN = { sine: 1, triangle: 0.75, square: 0.32, sawtooth: 0.38, custom: 0.55 };

  function noise() {
    if (noiseBuf) return noiseBuf;
    const n = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  // harmonik genliklerinden özel dalga (amps[0] = temel)
  const waveCache = new Map();
  function wave(amps, phases) {
    const key = amps.map((a) => a.toFixed(3)).join(",") + (phases ? "|" + phases.join(",") : "");
    if (waveCache.has(key)) return waveCache.get(key);
    const n = amps.length + 1;
    const real = new Float32Array(n), imag = new Float32Array(n);
    amps.forEach((a, i) => {
      const ph = phases ? phases[i] : 0;
      imag[i + 1] = a * Math.cos(ph); real[i + 1] = a * Math.sin(ph);
    });
    const w = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    if (waveCache.size > 200) waveCache.clear();
    waveCache.set(key, w);
    return w;
  }

  /* Tek nota: zarf + (sinüs dışında) yumuşak alçak geçiren filtre.
     opts: type ('sine'|'triangle'|'square'|'sawtooth') ya da amps (harmonik genlikleri),
           dur, gain, attack, release, when, cutoff, dest */
  function note(freq, opts = {}) {
    const c = ready(); if (!c) return null;
    const { type = "triangle", amps = null, dur = 0.6, gain = 0.25, attack = 0.012, release = 0.35,
      when = 0, cutoff = null, dest = demo, decay = null, detune = 0 } = opts;
    const t0 = Math.max(c.currentTime, when || c.currentTime);
    const o = c.createOscillator();
    if (amps) o.setPeriodicWave(wave(amps)); else o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    const g = c.createGain();
    const peak = gain * (amps ? TYPE_GAIN.custom : TYPE_GAIN[type] || 0.5);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    if (decay) g.gain.setTargetAtTime(peak * 0.35, t0 + attack, decay);
    const tEnd = t0 + Math.max(dur, attack + 0.01);
    g.gain.setTargetAtTime(0, tEnd, release / 4);
    let node = o;
    if (type !== "sine" || amps) {
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoff || Math.min(7000, Math.max(1800, freq * 10));
      f.Q.value = 0.5;
      o.connect(f); node = f;
    }
    node.connect(g); g.connect(dest);
    o.start(t0);
    o.stop(tEnd + release + 0.05);
    return { osc: o, gain: g, t0, stop(at) { const t = at || c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.03); try { o.stop(t + 0.2); } catch (e) {} } };
  }

  // Yumuşak tel/piyano tınısı: hızlı atak, üstel sönüm, birkaç harmonik
  function pluck(freq, opts = {}) {
    return note(freq, { amps: [1, 0.5, 0.28, 0.16, 0.09, 0.05], attack: 0.006, decay: 0.35, dur: opts.dur || 1.1, release: 0.6, gain: 0.32, ...opts });
  }
  // Akor/pad: aynı anda birkaç nota
  function chord(freqs, opts = {}) {
    const g = (opts.gain || 0.24) / Math.sqrt(freqs.length);
    return freqs.map((f, i) => pluck(f, { ...opts, gain: g, when: (opts.when || 0) + (opts.strum || 0) * i }));
  }

  /* Sürekli ses (osiloskop, monokord, vuru demoları): canlı değiştirilebilir */
  function drone(opts = {}) {
    const c = ready(); if (!c) return null;
    const { type = "sine", freq = 440, gain = 0.2, amps = null, dest = demo } = opts;
    const o = c.createOscillator();
    const f = c.createBiquadFilter();
    f.type = "lowpass"; f.Q.value = 0.5;
    const g = c.createGain();
    g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(dest);
    let curType = type, curGain = gain, curFreq = freq;
    function level() { return curGain * (curType === "custom" ? TYPE_GAIN.custom : TYPE_GAIN[curType] || 0.5); }
    function setType(t, a) {
      curType = t;
      if (t === "custom") o.setPeriodicWave(wave(a)); else o.type = t;
      f.frequency.setTargetAtTime(t === "sine" ? 20000 : Math.min(7000, Math.max(1800, curFreq * 10)), c.currentTime, 0.02);
      g.gain.setTargetAtTime(level(), c.currentTime, 0.03);
    }
    o.frequency.value = freq;
    setType(amps ? "custom" : type, amps);
    o.start();
    g.gain.setTargetAtTime(level(), c.currentTime, 0.03);
    let stopped = false;
    return {
      osc: o, gain: g,
      setFreq(fr, glide = 0.02) { curFreq = fr; o.frequency.setTargetAtTime(fr, c.currentTime, glide); if (curType !== "sine") f.frequency.setTargetAtTime(Math.min(7000, Math.max(1800, fr * 10)), c.currentTime, glide); },
      setGain(v) { curGain = v; g.gain.setTargetAtTime(level(), c.currentTime, 0.03); },
      setType, setAmps(a) { setType("custom", a); },
      stop() { if (stopped) return; stopped = true; g.gain.setTargetAtTime(0, c.currentTime, 0.04); try { o.stop(c.currentTime + 0.3); } catch (e) {} },
      get stopped() { return stopped; },
    };
  }

  /* Davul sesleri (sentez) */
  function drum(kind, when = 0, vel = 1) {
    const c = ready(); if (!c) return;
    const t = Math.max(c.currentTime, when || c.currentTime);
    const g = c.createGain(); g.connect(demo);
    if (kind === "kick") {
      const o = c.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.9 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.connect(g); o.start(t); o.stop(t + 0.45);
    } else if (kind === "snare" || kind === "clap") {
      const n = c.createBufferSource(); n.buffer = noise();
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = kind === "clap" ? 1500 : 1900; f.Q.value = 0.8;
      n.connect(f); f.connect(g);
      g.gain.setValueAtTime(0.5 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + (kind === "clap" ? 0.15 : 0.2));
      n.start(t, Math.random() * 0.5); n.stop(t + 0.25);
      if (kind === "snare") {
        const o = c.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(190, t);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.35 * vel, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        o.connect(g2); g2.connect(demo); o.start(t); o.stop(t + 0.12);
      }
    } else if (kind === "hat" || kind === "openhat") {
      const n = c.createBufferSource(); n.buffer = noise();
      const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
      n.connect(f); f.connect(g);
      const len = kind === "openhat" ? 0.28 : 0.05;
      g.gain.setValueAtTime(0.22 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
      n.start(t, Math.random() * 0.5); n.stop(t + len + 0.02);
    } else if (kind === "rim" || kind === "click" || kind === "accent") {
      // metronom tıkı: kısa sinüs; vurgu daha tiz
      const o = c.createOscillator(); o.type = "sine";
      o.frequency.value = kind === "accent" ? 1760 : kind === "rim" ? 1250 : 1100;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * vel, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      o.connect(g); o.start(t); o.stop(t + 0.08);
    } else if (kind === "dum" || kind === "tek") {
      // darbuka benzeri: düm pes ve dolgun, tek tiz ve kuru
      const o = c.createOscillator(); o.type = "sine";
      const f0 = kind === "dum" ? 110 : 420;
      o.frequency.setValueAtTime(f0 * 1.6, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.03);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((kind === "dum" ? 0.8 : 0.45) * vel, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + (kind === "dum" ? 0.35 : 0.09));
      o.connect(g); o.start(t); o.stop(t + 0.4);
      if (kind === "tek") {
        const n = c.createBufferSource(); n.buffer = noise();
        const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = 1.2;
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.25 * vel, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        n.connect(f); f.connect(g2); g2.connect(demo); n.start(t); n.stop(t + 0.06);
      }
    }
  }

  /* Hassas zamanlayıcı: Web Audio saatine göre ileriye doğru planlar ("iki saat" yöntemi).
     step(i, time) her adım için çağrılır; interval() saniye cinsinden adım süresi. */
  function scheduler({ step, interval, lookahead = 0.12 }) {
    let timer = 0, nextT = 0, i = 0, on = false;
    const queue = []; // görsel senkron için [i, time]
    function tick() {
      const c = ctx;
      if (!on || !c) return;
      while (nextT < c.currentTime + lookahead) {
        step(i, nextT);
        queue.push([i, nextT]);
        nextT += interval(i);
        i++;
      }
    }
    return {
      start(from = 0) {
        const c = ready(); if (!c) return false;
        if (on) return true;
        on = true; i = from; nextT = c.currentTime + 0.06; queue.length = 0;
        tick(); timer = setInterval(tick, 25);
        return true;
      },
      stop() { on = false; clearInterval(timer); queue.length = 0; },
      // şu an çalınan adım (görsel için)
      current() {
        if (!ctx) return -1;
        while (queue.length > 1 && queue[1][1] <= ctx.currentTime) queue.shift();
        return queue.length && queue[0][1] <= ctx.currentTime ? queue[0][0] : -1;
      },
      get on() { return on; },
    };
  }

  // Bir slayttan çıkarken o slayta ait sürekli sesleri susturmak için kayıt
  const owned = new Set();
  function own(x) { x && owned.add(x); return x; }
  function stopAll() { owned.forEach((x) => { try { x.stop(); } catch (e) {} }); owned.clear(); }
  window.addEventListener("slidechange", stopAll);

  window.Snd = {
    get ctx() { return build(); }, ready, running, unlock, now, hint,
    get volume() { return volume; }, get muted() { return muted; }, setVolume, setMuted, duck,
    onChange(f) { listeners.add(f); }, get analyser() { build(); return analyser; }, get bus() { build(); return demo; },
    note, pluck, chord, drone, drum, scheduler, wave, own, stopAll, TYPE_GAIN,
  };
})();
