/* Tarayıcıda ses denetimi: üretilen notaların frekansını FFT ile ölçer, kısmayı ve kilit uyarısını sınar.
   Kullanım: NODE_PATH=<playwright-core node_modules> node tools/check_audio.js */
const path = require("path");
const { chromium } = require("playwright-core");
const EXE = process.env.CHROME || path.join(process.env.HOME, "Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const URL = "file://" + path.join(__dirname, "..", "index.html");
let fail = 0;
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fail++; };

// sayfada: analizörün en güçlü tepesini parabolik ara değerlemeyle bul
const MEASURE = async () => {
  const an = Snd.analyser;
  const sr = Snd.ctx.sampleRate;
  const buf = new Float32Array(an.frequencyBinCount);
  await new Promise((r) => setTimeout(r, 350));
  an.getFloatFrequencyData(buf);
  let k = 1;
  for (let i = 2; i < buf.length - 1; i++) if (buf[i] > buf[k]) k = i;
  const a = buf[k - 1], b = buf[k], c = buf[k + 1];
  const p = 0.5 * (a - c) / (a - 2 * b + c);
  return ((k + p) * sr) / an.fftSize;
};

(async () => {
  const browser = await chromium.launch({ executablePath: EXE, args: ["--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  await page.addInitScript(() => { try { localStorage.setItem("muzik.rehber.kapali", "1"); } catch (e) {} });
  await page.goto(URL + "#major-gam");
  await page.mouse.click(5, 5); // kullanıcı hareketi: bağlamı aç
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => Snd.running()), "AudioContext çalışıyor");
  await page.evaluate(() => { Snd.analyser.fftSize = 32768; Snd.analyser.smoothingTimeConstant = 0; });

  // 1) saf sinüs La4
  const f1 = await page.evaluate(async (M) => { Snd.note(T.mtof(69), { type: "sine", dur: 1.2, gain: 0.3 }); return eval("(" + M + ")")(); }, MEASURE.toString());
  ok(Math.abs(f1 - 440) < 0.5, `La4 sinüs ölçülen ${f1.toFixed(2)} Hz (beklenen 440)`);

  // 2) piyano tuşu La4 (gerçek tıklama)
  await page.waitForTimeout(1400);
  const key = page.locator('#major-gam .key[data-m="69"]');
  await key.click();
  const f2 = await page.evaluate(async (M) => eval("(" + M + ")")(), MEASURE.toString());
  ok(Math.abs(f2 - 440) < 1, `Piyano La4 tuşu ölçülen ${f2.toFixed(2)} Hz`);

  // 3) eşit tamperamanlı beşli: Do4 ve Sol4 ayrı ayrı ölçülüp 700 cent
  await page.waitForTimeout(1500);
  const c = await page.evaluate(async (M) => {
    const m = eval("(" + M + ")");
    Snd.note(T.mtof(60), { type: "sine", dur: 1, gain: 0.3 }); const a = await m();
    await new Promise((r) => setTimeout(r, 1300));
    Snd.note(T.mtof(67), { type: "sine", dur: 1, gain: 0.3 }); const b = await m();
    return { a, b, cents: 1200 * Math.log2(b / a) };
  }, MEASURE.toString());
  ok(Math.abs(c.cents - 700) < 1.5, `Do4 ${c.a.toFixed(2)} Hz → Sol4 ${c.b.toFixed(2)} Hz = ${c.cents.toFixed(2)} cent (beklenen 700)`);

  // 4) saf akortta Mi4 = Do4 × 5/4
  await page.waitForTimeout(1300);
  const fj = await page.evaluate(async (M) => { Snd.note(T.tunedFreq(64, "just"), { type: "sine", dur: 1, gain: 0.3 }); return eval("(" + M + ")")(); }, MEASURE.toString());
  ok(Math.abs(fj - 327.03) < 0.6, `Saf Mi4 ölçülen ${fj.toFixed(2)} Hz (beklenen 327,03)`);

  // 5) kısma: anlatım çalarken demo veriyolu kısılır
  const duck = await page.evaluate(async () => {
    Snd.duck(true); await new Promise((r) => setTimeout(r, 600)); const on = Snd.bus.gain.value;
    Snd.duck(false); await new Promise((r) => setTimeout(r, 2000)); const off = Snd.bus.gain.value;
    return { on, off };
  });
  ok(duck.on < 0.35 && duck.off > 0.95, `Kısma: anlatım sırasında ${duck.on.toFixed(2)}, sonra ${duck.off.toFixed(2)}`);

  // 6) sessize alma ve ses düzeyi düğmeleri
  await page.click("#btn-mute");
  const muted = await page.evaluate(() => Snd.muted);
  await page.click("#btn-mute");
  ok(muted && !(await page.evaluate(() => Snd.muted)), "Sessize alma düğmesi aç/kapa çalışıyor");

  // 7) piyano slaytında A tuşu anlatımı açmaz, nota çalar
  await page.keyboard.press("a");
  ok(!(await page.evaluate(() => document.body.classList.contains("narrating"))), "Piyano slaytında A tuşu anlatımı açmıyor");
  await browser.close();

  // 8) kilit: kullanıcı hareketi olmadan çalma isteği uyarı gösterir.
  // Başsız tarayıcı otomatik oynatma kilidini uygulamadığı için, resume() çağrılana kadar
  // askıda kalan bir AudioContext ile gerçek tarayıcının kilitli hâli taklit edilir.
  const b2 = await chromium.launch({ executablePath: EXE });
  const p2 = await b2.newPage();
  await p2.addInitScript(() => {
    try { localStorage.setItem("muzik.rehber.kapali", "1"); } catch (e) {}
    const Orig = window.AudioContext;
    window.AudioContext = class extends Orig {
      constructor(o) { super(o); this._locked = true; super.suspend(); }
      get state() { return this._locked ? "suspended" : super.state; }
      resume() { this._locked = false; return super.resume(); }
    };
  });
  await p2.goto(URL + "#frekans");
  await p2.waitForTimeout(500);
  const state = await p2.evaluate(() => { Snd.pluck(440); return Snd.ctx.state; });
  await p2.waitForTimeout(300);
  const hint = await p2.evaluate(() => !!document.querySelector("#sound-hint.on"));
  ok(state !== "running" && hint, `Ses kilitliyken (${state}) "Sesi açmak için dokunun" uyarısı görünüyor`);
  await p2.click("#sound-hint");
  await p2.waitForTimeout(300);
  ok(await p2.evaluate(() => Snd.running() && !document.querySelector("#sound-hint.on")), "Uyarıya dokununca ses açılıyor ve uyarı kayboluyor");
  await b2.close();
  console.log(fail ? `\n${fail} denetim başarısız` : "\nTüm ses denetimleri geçti");
  process.exit(fail ? 1 : 0);
})();
