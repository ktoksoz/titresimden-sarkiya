/* MIDI klavye (Web MIDI API): klavyeyi sitenin her yerinde çalgı ve kontrolcü olarak kullanır.
   - Bağlantı: alt çubuktaki MIDI düğmesi izin ister; izin bir kez verildiyse sonraki ziyaretlerde kendiliğinden bağlanır.
     Safari Web MIDI desteklemediği için düğme orada gizlenir.
   - Her notada: vuruş gücüne göre ses, sustain pedalı (CC 64), etkin slayttaki piyanoda tuş basılı kalır ve
     piyanonun kendi tuş mantığı çalışır (aralık hesaplama, porteye yazma…).
   - Demolar isteğe bağlı iki kanca sunabilir:
       midiFreq(m)  → notanın frekansı (ör. seçili akort sistemi); yoksa eşit tamperaman
       onMidi(ev)   → { type: "on"|"off", m, vel, held: [MIDI numaraları] } ile slaydın kendi durumunu günceller
   - Ekranın üstünde basılı notaların aralık ya da akor adı görünür. */
(function () {
  const { h } = L;
  const btn = document.getElementById("btn-midi");
  if (!btn) return;
  if (!navigator.requestMIDIAccess) { btn.hidden = true; return; }

  const KEY = "muzik.midi";
  let access = null, sustain = false;
  const held = new Map();      // basılı tuşlar: m → hız
  const voices = new Map();    // çalan sesler: m → Snd.note dönüşü
  const sustained = new Set(); // pedal yüzünden süren notalar
  let listeners = [];

  const activeSlide = () => document.querySelector(".slide.active");
  const demo = () => (window.Deck && Deck.demo) || null;

  /* --- ses --- */
  function noteOn(m, vel) {
    const d = demo();
    const f = d && d.midiFreq ? d.midiFreq(m) : T.mtof(m);
    stopVoice(m);
    const g = 0.12 + 0.3 * Math.pow(vel / 127, 1.4);
    // piyano benzeri: hızlı atak, yavaş sönüm; tuş bırakılınca (pedal yoksa) susar
    const v = Snd.note(f, { amps: [1, 0.5, 0.28, 0.16, 0.09, 0.05], attack: 0.006, decay: 1.4, dur: 8, release: 0.5, gain: g });
    if (v) voices.set(m, v);
  }
  function stopVoice(m) {
    const v = voices.get(m);
    if (v) { try { v.stop(); } catch (e) {} voices.delete(m); }
    sustained.delete(m);
  }

  /* --- etkin slayttaki piyanolar ---
     Ekran piyanosu klavyeden dar olabilir (ör. Do4–Do6). Sığmayan notalar oktav kaydırılarak piyanoya taşınır.
     Kaydırma "yapışkan"dır: nota sığdığı sürece aynı kalır, böylece sınırı aşan aralıklar bozulmaz
     (Sol3 → Do4 yine dörtlü). Ses ve üstteki etiket gerçek notayı kullanır. */
  const shift = new WeakMap();   // piyano → oktav kaydırması (yarım ses)
  const mapped = new Map();      // basılı nota → [piyano, ekrandaki nota]
  function pianoPress(m, on) {
    if (!on) {
      (mapped.get(m) || []).forEach(([p, mm]) => p.hold(mm, false));
      mapped.delete(m);
      return;
    }
    const list = [];
    Piano.inSlide(activeSlide()).forEach((p) => {
      let k = shift.get(p) || 0;
      if (m + k < p.from || m + k > p.to) {
        k = 0;
        while (m + k < p.from) k += 12;
        while (m + k > p.to) k -= 12;
        if (m + k < p.from) return; // piyano bir oktavdan dar ve nota sığmıyor
        shift.set(p, k);
      }
      const mm = m + k;
      p.hold(mm, true);
      p.press(mm, { silent: true }); // piyanonun kendi tuş mantığı (onplay) da çalışsın
      list.push([p, mm]);
    });
    mapped.set(m, list);
  }

  /* --- üstte aralık / akor adı --- */
  const chip = h("div#midi-chip", { "aria-live": "polite" });
  document.body.append(chip);
  let chipT = 0;
  function showChip() {
    const ns = [...held.keys()].sort((a, b) => a - b);
    clearTimeout(chipT);
    if (!ns.length) { chipT = setTimeout(() => chip.classList.remove("on"), 1400); return; }
    let txt;
    if (ns.length === 1) txt = T.withLetter(ns[0]);
    else if (ns.length === 2) {
      const iv = T.interval(ns[1] - ns[0]);
      txt = `${T.name(ns[0])} – ${T.name(ns[1])}: ${iv.ad.toLocaleLowerCase("tr")}`;
    } else {
      const c = T.identifyChord(ns);
      if (c) {
        const flats = [1, 3, 8, 10].includes(c.root) && !["aug"].includes(c.type);
        const nm = T.chordBoth(c.root, c.type, flats);
        txt = `${nm} · ${["kök konumu", "1. çevrim", "2. çevrim", "3. çevrim"][c.inv]}`;
      } else txt = ns.map((m) => T.name(m, { octave: false })).join(" ");
    }
    chip.textContent = txt;
    chip.classList.add("on");
  }

  /* --- MIDI mesajları --- */
  function onMessage(e) {
    const [st, d1, d2 = 0] = e.data;
    const cmd = st & 0xf0;
    if (cmd === 0x90 && d2 > 0) {
      Snd.unlock();
      held.set(d1, d2);
      noteOn(d1, d2);
      pianoPress(d1, true);
      emit({ type: "on", m: d1, vel: d2 });
    } else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) {
      held.delete(d1);
      pianoPress(d1, false);
      if (sustain) sustained.add(d1); else stopVoice(d1);
      emit({ type: "off", m: d1, vel: 0 });
    } else if (cmd === 0xb0 && d1 === 64) {
      sustain = d2 >= 64;
      if (!sustain) [...sustained].forEach((m) => { if (!held.has(m)) stopVoice(m); });
    }
  }
  function emit(ev) {
    ev.held = [...held.keys()].sort((a, b) => a - b);
    const d = demo();
    if (d && d.onMidi) { try { d.onMidi(ev); } catch (er) { console.error(er); } }
    listeners.forEach((f) => f(ev));
    showChip();
  }
  // slayt değişince basılı kalan tuşları bırak
  window.addEventListener("slidechange", () => { held.clear(); mapped.clear(); [...voices.keys()].forEach(stopVoice); showChip(); });

  /* --- bağlantı ve düğme --- */
  const inputs = () => (access ? [...access.inputs.values()] : []);
  function render() {
    const ins = inputs().filter((i) => i.state === "connected");
    btn.classList.toggle("on", ins.length > 0);
    const label = !access ? "MIDI klavyeyi bağla" : ins.length ? "MIDI: " + ins.map((i) => i.name).join(", ") : "MIDI cihazı bulunamadı";
    btn.setAttribute("aria-label", label); btn.title = label;
  }
  function wire() {
    inputs().forEach((i) => { i.onmidimessage = onMessage; });
    render();
  }
  function connect(fromClick) {
    return navigator.requestMIDIAccess({ sysex: false }).then((a) => {
      access = a;
      access.onstatechange = wire;
      wire();
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      if (fromClick) toast(inputs().length ? "MIDI bağlandı: " + inputs().map((i) => i.name).join(", ") : "MIDI cihazı bulunamadı. Klavyeyi takın; takılınca kendiliğinden bağlanır.");
    }, () => { if (fromClick) toast("MIDI izni verilmedi. Adres çubuğundaki site ayarlarından izin verebilirsiniz."); render(); });
  }
  btn.hidden = false;
  btn.addEventListener("click", () => { if (access) { toast(btn.title); return; } connect(true); });
  // daha önce izin verildiyse sormadan bağlan
  try {
    if (localStorage.getItem(KEY) === "1" && navigator.permissions) {
      navigator.permissions.query({ name: "midi" }).then((p) => { if (p.state === "granted") connect(false); }, () => {});
    }
  } catch (e) {}
  render();

  function toast(msg) {
    const el = document.getElementById("guide-toast");
    if (!el) return;
    el.textContent = msg; el.classList.add("on");
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2800);
  }

  window.Midi = { get held() { return [...held.keys()]; }, on(f) { listeners.push(f); }, get connected() { return inputs().some((i) => i.state === "connected"); }, _message: onMessage };
})();
