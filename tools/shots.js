/* Ekran görüntüsü ve konsol denetimi (headless Chromium, playwright-core).
   Kullanım: NODE_PATH=<playwright-core'un bulunduğu node_modules> node tools/shots.js [çıktı klasörü] [slayt-id,...] [genişlikxyükseklik,...]
   Örnek:    node tools/shots.js /tmp/shots titresim,frekans 1440x860,390x844
   - Her slaytı ayrı ayrı açar (file://), 1,2 sn bekler, PNG kaydeder.
   - Konsoldaki hata ve uyarıları ve sayfa hatalarını raporlar; hata varsa çıkış kodu 1.
   - Hayalet el senaryolarındaki her hedefin sayfada bulunduğunu denetler. */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright-core");

const ROOT = path.resolve(__dirname, "..");
const EXE = process.env.CHROME || path.join(process.env.HOME, "Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell");
const out = process.argv[2] || "/tmp/muzik-shots";
const only = process.argv[3] && process.argv[3] !== "all" ? process.argv[3].split(",") : null;
const sizes = (process.argv[4] || "1440x860,1180x820,390x844").split(",").map((s) => s.split("x").map(Number));
const wait = +(process.env.WAIT || 1200);

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ["--autoplay-policy=no-user-gesture-required"] });
  let problems = 0;
  for (const [w, hgt] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const logs = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(`[${m.type()}] ${m.text()}`); });
    page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
    // rehber gösterimini kapat: ekran görüntüleri temiz olsun
    await page.addInitScript(() => { try { localStorage.setItem("muzik.rehber.kapali", "1"); } catch (e) {} });
    const url = "file://" + path.join(ROOT, "index.html");
    await page.goto(url);
    await page.waitForTimeout(600);
    const ids = await page.$$eval(".slide", (s) => s.map((x) => x.id));
    for (const id of ids) {
      if (only && !only.includes(id)) continue;
      logs.length = 0;
      await page.evaluate((id) => { location.hash = id; }, id);
      await page.waitForTimeout(wait);
      // hayalet el hedefleri
      const missing = await page.evaluate((id) => {
        const R = window.__rehber; if (!R) return ["rehber yok"];
        const slide = document.getElementById(id), steps = R.S[id] || [];
        return steps.filter((st) => !st.wait).map((st) => st.click || st.slide || st.tap || st.draw || st.drag || st.move)
          .filter((q) => !R.find(slide, q));
      }, id);
      const file = path.join(out, `${id}-${w}.png`);
      await page.screenshot({ path: file, fullPage: w <= 860 });
      const bad = logs.filter((l) => !/favicon|fonts\.g/.test(l));
      if (missing.length) bad.push("Rehber hedefi yok: " + missing.join(" | "));
      if (bad.length) { problems++; console.log(`✗ ${id} @${w}`); bad.forEach((l) => console.log("   " + l)); }
      else console.log(`✓ ${id} @${w}`);
    }
    await ctx.close();
  }
  await browser.close();
  process.exit(problems ? 1 : 0);
})();
