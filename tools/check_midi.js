/* MIDI klavye denetimi: sahte bir Web MIDI cihazı ("Test Klavye") tanıtıp nota mesajları gönderir.
   Kullanım: NODE_PATH=<playwright-core node_modules> node tools/check_midi.js */
const path = require("path");
const { chromium } = require("playwright-core");
const EXE = process.env.CHROME || path.join(process.env.HOME, "Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const URL = "file://" + path.join(__dirname, "..", "index.html");
let fail = 0;
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fail++; };

(async () => {
  const b = await chromium.launch({ executablePath: EXE, args: ["--autoplay-policy=no-user-gesture-required"] });
  const p = await b.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.addInitScript(() => {
    localStorage.setItem("muzik.rehber.kapali", "1"); localStorage.setItem("muzik.midi", "1");
    const input = { name: "Test Klavye", state: "connected", onmidimessage: null };
    window.__midi = (d) => input.onmidimessage && input.onmidimessage({ data: d });
    navigator.requestMIDIAccess = () => Promise.resolve({ inputs: new Map([["1", input]]), outputs: new Map(), onstatechange: null });
    const q = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = (o) => (o && o.name === "midi" ? Promise.resolve({ state: "granted" }) : q(o));
  });
  await p.goto(URL + "#titresim");
  await p.waitForTimeout(800);
  await p.mouse.click(5, 5);
  const send = (...msgs) => p.evaluate((msgs) => msgs.forEach((d) => __midi(d)), msgs);
  const on = (...ms) => send(...ms.map((m) => [0x90, m, 100]));
  const off = (...ms) => send(...ms.map((m) => [0x80, m, 0]));
  const go = async (id) => { await p.evaluate((id) => { location.hash = id; }, id); await p.waitForTimeout(500); };
  const text = (sel) => p.evaluate((sel) => document.querySelector(sel).innerText.replace(/\n/g, " "), sel);
  await p.evaluate(() => { window.__f = []; const n = Snd.note; Snd.note = (f, o) => { __f.push(+f.toFixed(2)); return n(f, o); }; Snd.analyser.fftSize = 1024; });
  const rms = () => p.evaluate(() => { const a = Snd.analyser, d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let s = 0; for (const v of d) s += v * v; return Math.sqrt(s / d.length); });

  ok(await p.evaluate(() => document.getElementById("btn-midi").getAttribute("aria-label")) === "MIDI: Test Klavye", "Cihaz bağlandı, düğme adı gösteriyor");
  await on(69); await p.waitForTimeout(300);
  ok((await p.evaluate(() => __f.slice(-1)[0])) === 440, "La4 = 440 Hz çalıyor");
  ok((await text("#midi-chip")) === "La4 (A4)", "Üstte nota adı: La4 (A4)");
  await off(69); await p.waitForTimeout(400);
  ok((await rms()) < 0.005, "Tuş bırakılınca ses susuyor");
  await send([0xb0, 64, 127]); await on(69); await p.waitForTimeout(150); await off(69); await p.waitForTimeout(400);
  ok((await rms()) > 0.02, "Sustain pedalı basılıyken nota sürüyor");
  await send([0xb0, 64, 0]); await p.waitForTimeout(400);
  ok((await rms()) < 0.005, "Pedal kalkınca nota susuyor");
  await on(57, 60, 64); await p.waitForTimeout(100);
  ok((await text("#midi-chip")) === "Lam (Am) · kök konumu", "Akor etiketi: Lam (Am) · kök konumu");
  await off(57, 60, 64);

  await go("uc-sesliler"); await on(62, 66, 69); await p.waitForTimeout(150);
  ok((await text("#uc-sesliler .ch-sym")).startsWith("Re"), "Üç sesliler: Re majör seçildi");
  ok((await p.evaluate(() => document.querySelectorAll("#uc-sesliler .key.held").length)) === 3, "Üç tuş basılı görünüyor");
  await off(62, 66, 69);
  await go("cevrimler"); await on(64, 67, 72); await p.waitForTimeout(150);
  ok((await text("#cevrimler .ch-sym")).startsWith("Do/Mi"), "Çevrimler: Do/Mi (1. çevrim)");
  await off(64, 67, 72);
  await go("yedililer"); await on(55, 59, 62, 65); await p.waitForTimeout(150);
  ok((await text("#yedililer .ch-sym")).startsWith("Sol7"), "Dört sesliler: Sol7");
  await off(55, 59, 62, 65);
  await go("araliklar"); await on(60); await off(60); await on(67); await off(67); await p.waitForTimeout(150);
  ok((await text("#araliklar .stage")).includes("Tam beşli"), "Aralıklar: Do → Sol = tam beşli");
  // ekran piyanosu Do4–Do6: alçak oktavdaki notalar oktav kaydırılarak gösterilir, aralık bozulmaz
  await on(48); await off(48); await on(52); await off(52); await p.waitForTimeout(150);
  ok((await text("#araliklar .stage")).includes("Büyük üçlü"), "Aralıklar: Do3 → Mi3 (piyanonun altında) = büyük üçlü");
  await on(55); await off(55); await on(60); await off(60); await p.waitForTimeout(150);
  ok((await text("#araliklar .stage")).includes("Tam dörtlü"), "Aralıklar: Sol3 → Do4 (sınırı aşan) = tam dörtlü");
  await go("nota-yazisi"); await on(67); await off(67); await p.waitForTimeout(150);
  ok((await text("#nota-yazisi .nt-info")).includes("Sol4 · G4"), "Nota yazısı: Sol4 porteye yazıldı");
  await go("akort-sistemleri"); await p.click('#akort-sistemleri .stage button:text-is("Saf")'); await p.evaluate(() => { __f.length = 0; }); await on(64); await off(64);
  ok((await p.evaluate(() => __f.slice(-1)[0])) === 327.03, "Akort: saf sistemde Mi4 = 327,03 Hz");
  await go("lissajous"); await on(60, 67); await p.waitForTimeout(150);
  ok((await text("#lissajous .readout")).includes("3:2"), "Lissajous: Do + Sol → 3:2");
  await off(60, 67);
  ok(errs.length === 0, "Sayfa hatası yok" + (errs.length ? ": " + errs.join(" | ") : ""));

  const p2 = await b.newPage();
  await p2.addInitScript(() => { delete Navigator.prototype.requestMIDIAccess; });
  await p2.goto(URL); await p2.waitForTimeout(400);
  ok(await p2.evaluate(() => document.getElementById("btn-midi").hidden), "Web MIDI olmayan tarayıcıda (Safari) düğme gizli");
  await b.close();
  console.log(fail ? `\n${fail} denetim başarısız` : "\nTüm MIDI denetimleri geçti");
  process.exit(fail ? 1 : 0);
})();
