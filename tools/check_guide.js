/* Hayalet el denetimi: her slayta girer, gösterimin başlayıp hatasız bittiğini kontrol eder.
   Kullanım: NODE_PATH=<playwright-core node_modules> node tools/check_guide.js [slayt-id,...] */
const path = require("path");
const { chromium } = require("playwright-core");
const EXE = process.env.CHROME || path.join(process.env.HOME, "Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const URL = "file://" + path.join(__dirname, "..", "index.html");
const only = process.argv[2] ? process.argv[2].split(",") : null;

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const p = await b.newPage({ viewport: { width: 1440, height: 860 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" || /Rehber hedefi/.test(m.text())) errs.push(m.text()); });
  await p.goto(URL);
  await p.waitForTimeout(500);
  const ids = await p.$$eval(".slide", (s) => s.map((x) => x.id));
  let bad = 0;
  for (const id of ids) {
    if (only && !only.includes(id)) continue;
    errs.length = 0;
    await p.evaluate((id) => { location.hash = id; }, id);
    let started = false; const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      await p.waitForTimeout(250);
      const on = await p.evaluate(() => document.getElementById("ghost-hand").classList.contains("on"));
      if (on) started = true;
      if (started && !on) break;
    }
    const has = await p.evaluate((id) => !!(window.__rehber && window.__rehber.S[id]), id);
    const ok = errs.length === 0 && (!has || started);
    if (!ok) bad++;
    console.log((ok ? "✓ " : "✗ ") + id + (has ? (started ? ` (${((Date.now() - t0) / 1000).toFixed(1)} sn)` : " gösterim başlamadı") : " senaryo yok") + (errs.length ? " " + errs.join(" | ") : ""));
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
