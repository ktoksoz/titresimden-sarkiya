/* Sözlük: metindeki müzik terimlerinin üzerine gelince açılan tanım balonları.
   Her terim slayt başına yalnızca ilk geçtiği yerde işaretlenir. */
(function () {
  const trw = (q) => "https://tr.wikipedia.org/w/index.php?search=" + encodeURIComponent(q);
  const enw = (t) => "https://en.wikipedia.org/wiki/" + t;

  // k: aranacak kökler (küçük harf, Türkçe ekler otomatik kapsanır), t: başlık, d: tanım, u: bağlantı
  const TERMS = [
    { k: ["frekans"], t: "Frekans", d: "Bir titreşimin saniyede kaç kez tekrarlandığı. Birimi hertz (Hz). Kulak frekansı perde olarak algılar.", u: trw("Frekans") },
    { k: ["hertz"], t: "Hertz (Hz)", d: "Saniyedeki titreşim sayısı. Adını elektromanyetik dalgaları kanıtlayan Heinrich Hertz'ten alır.", u: trw("Hertz") },
    { k: ["genlik"], t: "Genlik", d: "Dalganın denge konumundan en büyük sapması. Ses için basınç değişiminin büyüklüğü; kulak bunu ses şiddeti olarak algılar.", u: trw("Genlik") },
    { k: ["desibel"], t: "Desibel (dB)", d: "İki büyüklüğün oranını logaritmik ölçen birim. Ses basıncında her +6 dB genliğin yaklaşık iki katına çıkması demektir.", u: trw("Desibel") },
    { k: ["perde"], only: ["frekans", "titresim", "perde-cemberi", "duyma-siniri"], t: "Perde", d: "Bir sesin ne kadar ince ya da kalın algılandığı. Fiziksel karşılığı temel frekanstır.", u: enw("Pitch_(music)") },
    { k: ["tını"], t: "Tını", d: "Aynı perde ve şiddetteki iki sesi birbirinden ayırmamızı sağlayan ses rengi. Büyük ölçüde harmoniklerin oranlarından ve zarftan gelir.", u: trw("Tını") },
    { k: ["harmonik"], only: ["tini", "additive", "harmonik-dizisi", "monokord", "konsonans", "titresim", "frekans", "akort-sistemleri"], t: "Harmonik", d: "Temel frekansın tam sayı katlarındaki titreşimler (2f, 3f, 4f…). Doğal seslerin çoğu temel frekansla birlikte bu üst sesleri de içerir.", u: trw("Harmonik") },
    { k: ["temel frekans"], t: "Temel frekans", d: "Periyodik bir sesin en düşük frekanslı bileşeni. Duyduğumuz perdeyi çoğunlukla bu belirler.", u: enw("Fundamental_frequency") },
    { k: ["spektrum"], t: "Spektrum", d: "Bir sesin hangi frekanslardan, hangi güçte oluştuğunu gösteren dağılım. Fourier analiziyle hesaplanır.", u: enw("Frequency_spectrum") },
    { k: ["fourier"], t: "Fourier", d: "Joseph Fourier (1768–1830): her periyodik sinyalin sinüs dalgalarının toplamı olarak yazılabileceğini gösteren Fransız matematikçi.", u: trw("Fourier serisi") },
    { k: ["additive sentez", "toplamsal sentez"], t: "Toplamsal (additive) sentez", d: "Sinüs dalgalarını farklı frekans ve genliklerde üst üste koyarak ses üretme yöntemi.", u: enw("Additive_synthesis") },
    { k: ["osiloskop"], t: "Osiloskop", d: "Bir elektrik sinyalinin zamanla değişimini ekranda dalga olarak gösteren ölçü aleti.", u: trw("Osiloskop") },
    { k: ["koklea", "salyangoz"], t: "Koklea (salyangoz)", d: "İç kulakta sesi sinir sinyaline çeviren sarmal organ. Farklı bölgeleri farklı frekanslara duyarlıdır.", u: trw("Koklea") },
    { k: ["presbiakuzi"], t: "Presbiakuzi", d: "Yaşa bağlı işitme kaybı. Genellikle önce yüksek frekanslar duyulmaz olur.", u: trw("Presbiakuzi") },
    { k: ["monokord"], t: "Monokord", d: "Bir kutu üzerine gerilmiş tek telden ve hareketli bir köprüden oluşan, aralıkları ölçmeye yarayan antik alet.", u: trw("Monokord") },
    { k: ["pisagor koması"], t: "Pisagor koması", d: "12 saf beşlinin 7 oktavı yaklaşık 23,46 cent aşması. Oranı 3¹²/2¹⁹ = 531441/524288.", u: enw("Pythagorean_comma") },
    { k: ["pisagor"], t: "Pisagor", d: "Sisamlı filozof ve matematikçi (MÖ ~570–495). Ahenkli aralıkların basit tam sayı oranlarına karşılık geldiği düşüncesi onun okuluna atfedilir.", u: trw("Pisagor") },
    { k: ["oktav"], t: "Oktav", d: "Frekansı iki katına çıkan aralık (2:1). Kulak, aralarında oktav olan iki sesi \"aynı nota\" gibi algılar.", u: trw("Oktav") },
    { k: ["konsonans"], t: "Konsonans", d: "Birlikte çalındığında yumuşak, durgun ve kararlı duyulan aralık ya da akor.", u: trw("Konsonans") },
    { k: ["disonans", "dissonans"], t: "Dissonans", d: "Birlikte çalındığında pürüzlü, gergin ve çözülme isteyen aralık ya da akor. Müzikte kusur değil, hareket kaynağıdır.", u: trw("Disonans") },
    { k: ["vuru"], t: "Vuru (beat)", d: "Frekansları birbirine çok yakın iki ses birlikte çalınınca ses şiddetinin farkları kadar hızla dalgalanması.", u: enw("Beat_(acoustics)") },
    { k: ["plomp"], t: "Plomp–Levelt eğrisi", d: "1965'te Reinier Plomp ve Willem Levelt'in ölçtüğü, iki saf tonun frekans farkına göre ne kadar pürüzlü duyulduğunu gösteren eğri.", u: enw("Consonance_and_dissonance#Physiological_basis_of_consonance") },
    { k: ["sethares"], t: "William Sethares", d: "Tını ile akort arasındaki ilişkiyi inceleyen Amerikalı mühendis ve müzisyen. Plomp–Levelt eğrisini harmonikli seslere genelleştirdi.", u: enw("William_Sethares") },
    { k: ["lissajous"], t: "Lissajous eğrisi", d: "Birbirine dik iki salınımın birleşimiyle çizilen eğri. Frekans oranı basit bir kesirse eğri kapanır; Jules Antoine Lissajous 1857'de diyapazonlarla inceledi.", u: trw("Lissajous eğrisi") },
    { k: ["kroma", "chroma"], t: "Kroma (perde sınıfı)", d: "Oktavdan bağımsız nota kimliği: bütün Do'lar aynı kromaya sahiptir. 12 perde sınıfı bir çember üzerinde gösterilir.", u: enw("Pitch_class") },
    { k: ["cent"], t: "Cent", d: "Eşit tamperamanlı yarım sesin yüzde biri; oktav 1200 cent. İki frekansın oranından 1200·log₂(f₂/f₁) ile hesaplanır.", u: trw("Sent (müzik)") },
    { k: ["koma"], t: "Koma", d: "İki farklı yoldan ulaşılan neredeyse aynı perde arasındaki küçük fark. Türk müziğinde ayrıca oktavın 53'te biri olan ölçü birimi.", u: trw("Koma (müzik)") },
    { k: ["tamperaman", "temperament"], t: "Tamperaman", d: "Aralıkları saf oranlarından bilerek biraz saptırarak (daraltarak ya da genişleterek) Pisagor komasını perdelere paylaştıran akort yöntemi. Latince temperare: ölçülü kılmak.", u: trw("Tamperaman") },
    { k: ["eşit tamperaman"], t: "Eşit tamperaman", d: "Oktavı 12 eşit yarım sese bölen akort sistemi: her yarım ses 2^(1/12) oranındadır. Her tonda aynı çalar, ama yalnız oktav tam saftır.", u: trw("Eşit tamperaman") },
    { k: ["kurt beşli"], t: "Kurt beşli", d: "Pisagor ve ortalama ton akortlarında komanın toplandığı bozuk beşli. Çalınınca kurt ulumasına benzeyen hızlı bir vuru duyulur.", u: enw("Wolf_interval") },
    { k: ["ortalama ton"], t: "Ortalama ton (meantone)", d: "Beşlileri biraz daraltıp büyük üçlüleri saf yapan akort sistemi. 16.–17. yüzyılda klavyeli çalgılarda yaygındı.", u: enw("Quarter-comma_meantone") },
    { k: ["werckmeister"], t: "Andreas Werckmeister", d: "Alman orgcu ve kuramcı (1645–1706). 1691'de her tonda çalınabilen \"iyi\" akortlar önerdi; Werckmeister III bunların en bilinenidir.", u: enw("Werckmeister_temperament") },
    { k: ["saf akort", "just intonation"], t: "Saf akort", d: "Aralıkları küçük tam sayı oranlarından (3/2, 5/4, 6/5…) kuran akort. Tek tonda çok temiz, uzak tonlarda bozuk duyulur.", u: enw("Just_intonation") },
    { k: ["bach"], t: "Johann Sebastian Bach", d: "Alman besteci (1685–1750). İyi Düzenlenmiş Klavye'de 24 majör ve minör tonun hepsinde birer prelüd ve füg yazdı.", u: trw("Johann Sebastian Bach") },
    { k: ["iyi düzenlenmiş klavye"], t: "İyi Düzenlenmiş Klavye", d: "Bach'ın 1722 ve 1742'de tamamladığı iki kitap. Her tonda çalınabilen \"iyi\" bir akortu gösterir; bu akortun tam eşit tamperaman olup olmadığı tartışmalıdır.", u: enw("The_Well-Tempered_Clavier") },
    { k: ["holdrian"], t: "Holdrian koması", d: "Oktavın 53 eşit parçasından biri (≈22,64 cent). Adını William Holder'dan alır; Türk müziği kuramında ölçü birimi olarak kullanılır.", u: enw("Holdrian_comma") },
    { k: ["makam"], t: "Makam", d: "Türk ve Orta Doğu müziğinde dizi, güçlü ve durak perdeleri ile ezginin izlediği yolu (seyir) birlikte tanımlayan ezgi sistemi.", u: trw("Makam") },
    { k: ["hicaz"], t: "Hicaz", d: "Türk müziğinin en tanınan makamlarından biri. Karakteristik dörtlüsünde ikinci ile üçüncü perde arasında geniş bir aralık vardır.", u: trw("Hicaz makamı") },
    { k: ["dörtlü", "çeşni"], only: ["turk-muzigi"], t: "Dörtlü (çeşni)", d: "Dört perdeden oluşan, tam dörtlü aralığını dolduran dizi parçası. Makam dizileri dörtlü ve beşlilerin birleşiminden oluşur.", u: enw("Tetrachord") },
    { k: ["arel"], only: ["turk-muzigi"], t: "Arel–Ezgi–Uzdilek sistemi", d: "Hüseyin Sadettin Arel, Suphi Ezgi ve Salih Murat Uzdilek'in 20. yüzyılda oluşturduğu, Türk müziği eğitiminde en yaygın kuram ve yazım sistemi.", u: trw("Arel-Ezgi-Uzdilek sistemi") },
    { k: ["guido d'arezzo", "guido"], t: "Guido d'Arezzo", d: "İtalyan Benedikten keşiş ve müzik kuramcısı (yaklaşık 991–1033 sonrası). Porte yazımını geliştirdi ve hecelerle (ut, re, mi…) ezgi öğretme yöntemini buldu.", u: trw("Guido d'Arezzo") },
    { k: ["solfej"], t: "Solfej", d: "Notaları heceyle (Do, Re, Mi…) adlandırarak okuma ve söyleme yöntemi. Adı sol ve fa hecelerinden gelir.", u: trw("Solfej") },
    { k: ["porte"], only: ["nota-yazisi"], t: "Porte", d: "Notaların yazıldığı beş paralel çizgi. Çizgiler ve aralarındaki boşluklar sırayla birer basamaktır.", u: trw("Porte") },
    { k: ["sol anahtarı"], t: "Sol anahtarı", d: "Kıvrımı alttan ikinci çizgiyi saran ve orayı Sol4 yapan nota anahtarı. Keman, flüt ve piyanonun sağ eli için kullanılır.", u: trw("Sol anahtarı") },
    { k: ["fa anahtarı"], t: "Fa anahtarı", d: "İki noktası yukarıdan ikinci çizgiyi çevreleyen ve orayı Fa3 yapan nota anahtarı. Viyolonsel, bas ve piyanonun sol eli için kullanılır.", u: trw("Fa anahtarı") },
    { k: ["ek çizgi"], t: "Ek çizgi", d: "Portenin üstüne ya da altına taşan notalar için çizilen kısa yardımcı çizgi.", u: enw("Ledger_line") },
    { k: ["diyez"], only: ["nota-yazisi"], t: "Diyez (♯)", d: "Notayı yarım ses yükselten değiştirici işaret.", u: trw("Diyez") },
    { k: ["bemol"], only: ["nota-yazisi"], t: "Bemol (♭)", d: "Notayı yarım ses alçaltan değiştirici işaret.", u: trw("Bemol") },
    { k: ["gam"], t: "Gam", d: "Bir oktav içinde belirli bir düzene göre sıralanmış perdeler dizisi. Gamın karakterini adımların (tam ve yarım ses) sırası belirler.", u: trw("Gam (müzik)") },
    { k: ["yarım ses"], t: "Yarım ses", d: "Batı müziğinde iki komşu perde arasındaki en küçük aralık; piyanoda yan yana iki tuş.", u: trw("Yarım ses") },
    { k: ["tam ses"], t: "Tam ses", d: "İki yarım sesten oluşan aralık; piyanoda aralarında bir tuş bulunan iki tuş.", u: trw("Tam ses") },
    { k: ["tonik"], t: "Tonik (durak)", d: "Bir tonun ya da gamın merkez notası; ezgi ve armoni buraya dönünce \"eve varmış\" hissi verir.", u: trw("Tonik") },
    { k: ["mod"], only: ["modlar", "pentatonik", "major-gam"], t: "Mod", d: "Aynı nota kümesinin farklı bir notadan başlatılmasıyla elde edilen dizi. Kilise modlarının adları Antik Yunan bölgelerinden gelir.", u: trw("Mod (müzik)") },
    { k: ["pentatonik"], t: "Pentatonik gam", d: "Oktavda beş perdesi olan gam. Yarım ses içermeyen biçimi dünyanın pek çok halk müziğinde görülür.", u: trw("Pentatonik gam") },
    { k: ["triton"], t: "Triton", d: "Üç tam sesten oluşan aralık (artık dörtlü ya da eksik beşli). Oktavı tam ortadan böler; güçlü bir gerilim taşır.", u: trw("Triton") },
    { k: ["akor"], only: ["uc-sesliler", "yedililer"], t: "Akor", d: "Aynı anda çalınan üç ya da daha fazla nota. Batı armonisinde genellikle üçlü aralıklarla üst üste kurulur.", u: trw("Akor") },
    { k: ["üç sesli"], t: "Üç sesli (triad)", d: "Kök, üçlü ve beşliden oluşan akor. Üçlü ve beşlinin büyüklüğü akorun majör, minör, artık ya da eksik olmasını belirler.", u: enw("Triad_(music)") },
    { k: ["çevrim"], t: "Çevrim", d: "Akorun kökü dışında bir notasının en alta alınması. Notalar aynı kalır, renk ve ses yürüyüşü değişir.", u: enw("Inversion_(music)") },
    { k: ["dominant"], t: "Dominant", d: "Tonun beşinci derecesi ve onun üzerine kurulan akor (V). Toniğe dönme isteği en güçlü akordur.", u: trw("Dominant") },
    { k: ["subdominant"], t: "Subdominant", d: "Tonun dördüncü derecesi ve onun akoru (IV). Tonikten uzaklaşma ve hazırlık hissi verir.", u: trw("Subdominant") },
    { k: ["yeden"], t: "Yeden (duyarlı ses)", d: "Gamın yedinci derecesi; toniğin yarım ses altında durur ve ona doğru çekilir.", u: enw("Leading-tone") },
    { k: ["kadans"], t: "Kadans", d: "Bir müzik cümlesini noktalayan akor dizisi. En güçlüsü dominantın toniğe çözüldüğü tam kadanstır (V–I).", u: trw("Kadans") },
    { k: ["beşliler çemberi"], t: "Beşliler çemberi", d: "12 tonun tam beşli aralıklarla dizildiği çember. Komşu tonlar yalnız bir notada ayrılır; donanımdaki diyez ve bemol sayısını gösterir.", u: trw("Beşliler çemberi") },
    { k: ["donanım"], t: "Donanım", d: "Portenin başında yazılan, eserin tonunu belirten diyez ya da bemoller.", u: enw("Key_signature") },
    { k: ["blues"], t: "Blues", d: "19. yüzyılın sonunda ABD'nin güneyinde Afrikalı Amerikalı topluluklarda doğan müzik türü. 12 ölçülük kalıbı caz ve rock'ın temelinde yatar.", u: trw("Blues") },
    { k: ["caz"], t: "Caz", d: "20. yüzyılın başında New Orleans'ta doğan, doğaçlama ve senkoplu ritimle öne çıkan müzik türü.", u: trw("Caz") },
    { k: ["tempo", "bpm"], t: "Tempo (BPM)", d: "Müziğin hızı; dakikadaki vuruş sayısıyla (BPM) ölçülür.", u: trw("Tempo") },
    { k: ["ölçü"], only: ["tempo", "aksak", "sirali", "yuruyusler"], t: "Ölçü", d: "Vuruşların eşit gruplara bölünmesi. 3/4 ölçü, her grupta üç dörtlük vuruş demektir; ilk vuruş genellikle kuvvetlidir.", u: trw("Ölçü (müzik)") },
    { k: ["metronom"], t: "Metronom", d: "Seçilen tempoda düzenli tık sesi veren alet. Johann Maelzel 1815'te patentini aldı.", u: trw("Metronom") },
    { k: ["usul"], t: "Usul", d: "Türk müziğinde kuvvetli ve zayıf darbelerin belirli bir sırayla tekrarlandığı ritim kalıbı (düm, tek…).", u: trw("Usul (müzik)") },
    { k: ["aksak"], t: "Aksak", d: "Eşit olmayan vuruş gruplarından (2 ve 3) oluşan ritimler; ör. 9/8 = 2+2+2+3. Balkanlar ve Anadolu'da yaygındır.", u: trw("Aksak (müzik)") },
    { k: ["senkop"], t: "Senkop", d: "Vurgunun beklenen kuvvetli zamandan zayıf zamana kaydırılması. Caz, funk, pop ve Latin müziğinin canı.", u: trw("Senkop") },
    { k: ["poliritim"], t: "Poliritim", d: "Aynı anda iki farklı nabız bölünmesinin (ör. 3'e karşı 2) birlikte çalınması.", u: trw("Poliritim") },
    { k: ["bossa nova"], t: "Bossa nova", d: "1950'lerin sonunda Rio de Janeiro'da samba ile cazın buluşmasından doğan Brezilya müziği.", u: trw("Bossa nova") },
    { k: ["sıralayıcı", "sequencer"], t: "Adım sıralayıcı (sequencer)", d: "Bir ölçüyü eşit adımlara bölüp her adımda hangi sesin çalacağını ızgara üzerinde belirleyen araç.", u: enw("Music_sequencer") },
  ];

  // her kök için: kelime başında başlayan, ardından Türkçe ekler gelebilen düzenli ifade
  const L_ = "a-zçğıöşüâîûA-ZÇĞİÖŞÜÂÎÛ";
  // karşılaştırma için: Türkçe küçük harf + ı/i ayrımını kaldır (MYCIN → mycin, ama uzunluk değişmez)
  const lower = (s) => s.toLocaleLowerCase("tr").replace(/ı/g, "i");
  TERMS.forEach((term) => {
    term.re = term.k.map((k) => new RegExp(`(^|[^${L_}])(${lower(k).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[${L_}'’]*)`));
  });
  const SKIP = "h1, h2, h3, .chapter-tag, .num, summary, a, .term, .try, button, .license, .cover-meta";

  function markSlide(root) {
    const sid = root.closest(".slide").id;
    // yalnızca belirli slaytlarda anlamlı olan terimleri (ör. "sıcaklık") diğerlerinde atla
    const done = new Set(TERMS.map((t, i) => (t.only && !t.only.includes(sid) ? i : -1)).filter((i) => i >= 0));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest(SKIP) || !n.nodeValue.trim() ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let text = node.nodeValue;
      let parts = null;
      // düğümde geçen ilk uygun terimi bul, böl, tekrarla
      for (;;) {
        let best = null;
        const low = lower(text);
        TERMS.forEach((term, ti) => {
          if (done.has(ti)) return;
          term.re.forEach((re) => {
            const m = re.exec(low);
            if (m && (!best || m.index + m[1].length < best.i)) best = { i: m.index + m[1].length, len: m[2].length, ti };
          });
        });
        if (!best) break;
        done.add(best.ti);
        parts = parts || [];
        parts.push(text.slice(0, best.i));
        const span = document.createElement("span");
        span.className = "term"; span.tabIndex = 0; span.dataset.ti = best.ti;
        span.textContent = text.slice(best.i, best.i + best.len);
        parts.push(span);
        text = text.slice(best.i + best.len);
      }
      if (parts) { parts.push(text); node.replaceWith(...parts); }
    });
  }
  document.querySelectorAll(".slide .text, .slide .cover-text").forEach(markSlide);

  /* --- balon --- */
  const pop = document.createElement("div");
  pop.id = "gloss"; pop.setAttribute("role", "tooltip");
  document.body.append(pop);
  let cur = null, hideT = 0;
  function show(el) {
    clearTimeout(hideT);
    if (cur === el && pop.classList.contains("open")) return;
    cur = el;
    const t = TERMS[+el.dataset.ti];
    pop.innerHTML = "";
    const h4 = document.createElement("h4"); h4.textContent = t.t;
    const p = document.createElement("p"); p.textContent = t.d;
    const a = document.createElement("a");
    a.href = t.u; a.target = "_blank"; a.rel = "noopener";
    a.textContent = t.u.includes("tr.wikipedia") ? "Vikipedi'de oku ↗" : "Wikipedia'da oku (İngilizce) ↗";
    pop.append(h4, p, a);
    pop.classList.add("open");
    const r = el.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = Math.min(Math.max(12, r.left + r.width / 2 - pw / 2), window.innerWidth - pw - 12);
    let y = r.top - ph - 10;
    pop.classList.toggle("below", y < 8);
    if (y < 8) y = r.bottom + 10;
    pop.style.left = x + "px"; pop.style.top = y + "px";
  }
  function hide(delay = 180) {
    clearTimeout(hideT);
    hideT = setTimeout(() => { pop.classList.remove("open"); cur = null; }, delay);
  }
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest && e.target.closest(".term");
    if (el) show(el);
    else if (e.target.closest && e.target.closest("#gloss")) clearTimeout(hideT);
    else if (cur) hide();
  });
  document.addEventListener("focusin", (e) => { if (e.target.classList && e.target.classList.contains("term")) show(e.target); });
  document.addEventListener("focusout", (e) => { if (e.target.classList && e.target.classList.contains("term")) hide(250); });
  // dokunmatik: dokununca aç/kapa
  document.addEventListener("click", (e) => {
    const el = e.target.closest(".term");
    if (el) { e.preventDefault(); cur === el && pop.classList.contains("open") ? hide(0) : show(el); }
    else if (!e.target.closest("#gloss")) hide(0);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(0); });
  document.getElementById("deck").addEventListener("scroll", () => hide(0), true);
})();
