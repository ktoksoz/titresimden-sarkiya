# Titreşimden Şarkıya

**Canlı site: https://muzik.koraytoksoz.com**

Müzik teorisini sesin fiziğinden oranlara, akort sistemlerinden makamlara, gamlardan akorlara ve ritme kadar slayt slayt anlatan, her slaytta dinlenip çalınabilen bir deney bulunan Türkçe, etkileşimli bir sunum sitesi.

Hazırlayan: **Koray Toksöz**

*An interactive, Turkish-language music theory explainer, from the physics of sound to tuning, scales, harmony and rhythm, with a playable, browser-synthesized experiment on every slide. Code: MIT · Content: CC BY 4.0.*

## İçerik

| Bölüm | Deneyler |
| --- | --- |
| Giriş | Dokununca pentatonik notalar çalan parlayan teller |
| 1. Ses nedir? | Sıkışan ve seyrelen hava molekülleri, osilatör ve osiloskop, duyma sınırı testi, çalgı tınıları, harmonik çubuklarıyla toplamsal sentez, titreşen telde harmonik dizisi |
| 2. Oranlar ve akort | Sürüklenebilir köprülü monokord, vuru ve Plomp–Levelt pürüzlülük eğrisi, 3B perde sarmalı, Pisagor koması, Pisagor / saf / eşit tamperaman karşılaştırması, 53 komalık ızgarada Hicaz dizisi |
| 3. Gamlar ve modlar | Aralıklar, T-T-Y-T-T-T-Y desenli majör gam, üç minör, döndürülebilir mod diski, pentatonik doğaçlama |
| 4. Akorlar ve armoni | Üç sesliler, çevrimler ve yedili akorlar, V7 → I çözülmesi, dönen beşliler çemberi, I–V–vi–IV / ii–V–I / 12 ölçülük blues |
| 5. Ritim ve zaman | Metronom, 16 adımlı davul sıralayıcısı, aksak usuller (9/8, 7/8, 5/8), senkop, 3'e karşı 2 poliritim |
| 6. Hepsi bir arada | Akor yürüyüşü + davul + gama kilitli melodi ızgarasıyla mini beste, gamı seçilebilen teller |

Ek olarak:
- **Sesli anlatım:** 15 dakika, Türkçe.
- **Hayalet el:** Her deneyin ilk hamlesini gösterir.
- **Tanım balonları:** Terimlerin üzerine gelince açılır.
- **Sunucu notları.**
- **Tarayıcıda üretilen ses:** Bütün demo sesleri Web Audio API ile tarayıcıda sentezlenir; projede kayıt ya da örnek ses dosyası yoktur.

## Çalıştırma

Derleme adımı yok, bağımlılık yok. `index.html` dosyasına çift tıklamak yeterli (`file://` ile de çalışır). Ya da yerel bir sunucuyla:

```sh
python3 tools/serve.py 8000   # önbelleksiz geliştirme sunucusu
# http://localhost:8000
```

Herhangi bir statik barındırmaya (GitHub Pages, Netlify, Apache vb.) olduğu gibi yüklenebilir.

## Kısayollar

| Tuş | İşlev |
| --- | --- |
| → / Boşluk, ← | İleri / geri |
| A | Sesli anlatımı aç/kapat (P: duraklat) |
| G | Deney gösterimlerini (hayalet el) aç/kapat |
| M | Sesi kapat/aç |
| N | Sunucu notları |
| T | Açıklama metnini gizle (sunum modu) |
| O | Tüm slaytlar |
| F | Tam ekran |

Piyanolu slaytlarda bilgisayar klavyesi de çalar: `A S D F G H J K L` beyaz, `W E T Y U O P` siyah tuşlar. Bu slaytlarda bu harfler kısayol yerine piyanoyu çalar. Her slaytın bağlantısı adres çubuğunda durur (ör. `#pisagor-komasi`).

## Yapı

- **`index.html`:** Slayt metinleri, açıklamalar ve sunucu notları (`aside.notes`).
- **`js/theory.js`:** Nota ↔ frekans, cent, akort sistemleri, gamlar, akorlar, beşliler çemberi, pürüzlülük modeli. Saf fonksiyonlardan oluşur, Node'da da çalışır.
- **`js/audio.js`:** AudioContext ve ana ses düzeyi, anlatım sırasında demo seslerini kısma (ducking), sentez yardımcıları (nota, tel, sürekli ses, davul), ses saatine bağlı zamanlayıcı ve "Sesi açmak için dokunun" uyarısı.
- **`js/lib.js`, `js/piano.js`:** Renk kodu, tuval ve DOM yardımcıları; fare, dokunma ve bilgisayar klavyesiyle çalınan ortak piyano.
- **`js/demos/*.js`, `css/demos-*.css`:** Bölüm bölüm demolar. Hayalet el senaryoları da burada (`GuideScenarios`).
- **`js/app.js`:** Slayt motoru. İlerleme çubuğu bir portedir: her slayt bir nota başı, her bölüm bir ölçü.
- **`js/narrator.js`, `audio/<slayt-id>.mp3`:** Sesli anlatım. Metinler `tools/narration.json` içinde.
- **`js/guide.js`:** Hayalet el.
- **`js/glossary.js`:** Tanım balonları ve Vikipedi bağlantıları.
- **`img/`:** Creative Commons simgeleri.
- **`tools/`:** Geliştirme sunucusu, yayın betiği, testler.

**Renk kodu** bütün sitede aynıdır:

| Renk | Anlamı |
| --- | --- |
| Altın | Tonik, kök, çözülme, kuvvetli zaman, temel frekans |
| Kadife kırmızısı | Gerilim, dominant, dissonans, gam dışı nota |
| Pas yeşili | Dalga biçimi, üst harmonikler, subdominant |
| Lavanta | Koma ve cent farkları |

## Yeniden üretme

**Anlatım sesleri** ElevenLabs ile üretildi. Ayarlar:
- Ses: "İrem", `voice_id` `hy7OAv1nH3Eqqj96Aude`
- Model: `eleven_multilingual_v2`, dil `tr`
- Biçim: `mp3_44100_128`

Metinler `tools/narration.json` dosyasındadır. Her anahtar bir slayt kimliğidir ve çıktı `audio/<slayt-id>.mp3` olarak kaydedilir.

**Testler:**

```sh
node tools/test_theory.js       # frekans, cent, akort, gam, akor ve Hicaz koma hesapları (58 test)

# Tarayıcı testleri playwright-core ister (depoda yok):
npm i --prefix /tmp/pw playwright-core
NODE_PATH=/tmp/pw/node_modules node tools/check_audio.js           # üretilen sesin frekansını FFT ile ölçer, kısma ve ses kilidi
NODE_PATH=/tmp/pw/node_modules node tools/shots.js /tmp/shots     # 3 ekran boyutunda ekran görüntüsü, konsol hataları, hayalet el hedefleri
```

## Yayınlama

```sh
tools/deploy.sh            # varsayılan koray@koraytoksoz.com → ~/muzik.koraytoksoz.com/
```

Betik önce `index.html` içindeki `?v=` sürüm etiketini yeniler, böylece tarayıcılar yeni CSS ve JS'i indirir. Sonra `rsync` ile yalnızca değişen dosyaları gönderir. `.htaccess` HTTPS yönlendirmesini, sıkıştırmayı ve önbellek ayarlarını içerir.

## Kaynaklar ve ileri okuma

### Sitedeki bilgilerin dayandığı kaynaklar

**Ses fiziği ve algı**
- **Fourier sentezi:** J. Fourier, *Théorie analytique de la chaleur* (1822). Bkz. [Fourier serisi (Vikipedi)](https://tr.wikipedia.org/wiki/Fourier_serisi).
- **Ses hızı (~343 m/sn, 20 °C hava):** [Speed of sound (Wikipedia)](https://en.wikipedia.org/wiki/Speed_of_sound).
- **Duyma aralığı ve yaşa bağlı kayıp:** [Hearing range](https://en.wikipedia.org/wiki/Hearing_range), [Presbycusis](https://en.wikipedia.org/wiki/Presbycusis) (Wikipedia).
- **Akort frekansı (La4 = 440 Hz):** ISO 16:1975, *Acoustics — Standard tuning frequency* ([iso.org](https://www.iso.org/standard/3601.html)). Tarihçe için: [A440 (Wikipedia)](https://en.wikipedia.org/wiki/A440_(pitch_standard)).

**Konsonans, perde ve akort**
- **Pürüzlülük eğrisi:** R. Plomp ve W. J. M. Levelt, "Tonal consonance and critical bandwidth", *JASA* 38 (1965), 548–560, [doi:10.1121/1.1909741](https://doi.org/10.1121/1.1909741).
- **Harmonikli sesler için pürüzlülük modeli (`js/theory.js`):** W. A. Sethares, *Tuning, Timbre, Spectrum, Scale*, 2. baskı, Springer (2005), [yazarın sayfası](https://sethares.engr.wisc.edu/ttss.html).
- **Perde sarmalı:** R. N. Shepard, "Circularity in judgments of relative pitch", *JASA* 36 (1964), 2346–2353, [doi:10.1121/1.1919362](https://doi.org/10.1121/1.1919362).
- **Komalar (değerler `js/theory.js` içinde hesaplanır):** [Pythagorean comma](https://en.wikipedia.org/wiki/Pythagorean_comma), [Holdrian comma](https://en.wikipedia.org/wiki/Holdrian_comma), [Syntonic comma](https://en.wikipedia.org/wiki/Syntonic_comma).
- **Bach'ın klavyesi:** [The Well-Tempered Clavier (Wikipedia)](https://en.wikipedia.org/wiki/The_Well-Tempered_Clavier).

**Türk müziği**
- **Hicaz dörtlüsünün AEU rumuzu (SA12S):** MEB, *Türk Müziği Teori ve Uygulaması* ([tymm.meb.gov.tr](https://tymm.meb.gov.tr/muzik-okullari-turk-muzigi-teori-uygulamasi-dersi/unite/1112)).
- **Hicaz makamının dizisi (hicaz dörtlüsü + nevâda rast beşlisi):** TDV İslâm Ansiklopedisi, [Hicaz](https://islamansiklopedisi.org.tr/hicaz--musiki).

**Armoni ve ritim**
- **Beşliler çemberinin tarihi (Diletsky, Heinichen):** [Circle of fifths (Wikipedia)](https://en.wikipedia.org/wiki/Circle_of_fifths).
- **Metronom (Maelzel, 1815):** [Metronome (Wikipedia)](https://en.wikipedia.org/wiki/Metronome).
- **Aksak ritimler:** [Aksak (Wikipedia)](https://en.wikipedia.org/wiki/Aksak).
- **Brubeck ve 9/8:** [Blue Rondo à la Turk (Wikipedia)](https://en.wikipedia.org/wiki/Blue_Rondo_%C3%A0_la_Turk).

### İleri okuma

- **W. A. Sethares, *Tuning, Timbre, Spectrum, Scale*:** Tını ile akortun neden birbirine bağlı olduğunu anlatır.
- **R. W. Duffin, *How Equal Temperament Ruined Harmony (and Why You Should Care)*, W. W. Norton (2007):** Akort tarihine okunaklı ve tartışmacı bir bakış.
- **H. von Helmholtz, *On the Sensations of Tone* (1863; İngilizce çeviri 1885):** Konsonans ve tını araştırmalarının klasiği, [archive.org](https://archive.org/details/onsensationsofto00helmrich).
- **[Open Music Theory](https://openmusictheory.github.io/):** Ücretsiz, açık lisanslı bir müzik teorisi ders kitabı.
- **[musictheory.net](https://www.musictheory.net/):** Etkileşimli dersler ve kulak eğitimi alıştırmaları.

## Lisans

| Ne | Lisans |
| --- | --- |
| Kaynak kod (`js/`, `css/`, `tools/`, `index.html` içindeki kod) | [MIT](LICENSE) |
| İçerik: slayt metinleri, açıklamalar, sunucu notları, sözlük tanımları, anlatım metinleri ve sesleri (`audio/`) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.tr) |
| Yazı tipleri: Bodoni Moda, Hanken Grotesk (Google Fonts'tan yüklenir, depoda yok) | SIL OFL 1.1 |
| Creative Commons simgeleri (`img/`) | Creative Commons'ın basın kiti; CC ticari marka politikası |

Anlatım sesleri ElevenLabs ücretli abonelikle "İrem" sesiyle üretildi. Belirli bir kişinin sesini taklit etmek ya da yanıltıcı amaçla kullanılamaz. Ayrıntılar [`LICENSE`](LICENSE) dosyasında.

GitHub lisans türünü "Other" olarak gösterir. Bu normaldir: proje çift lisanslıdır ve tek bir standart lisansa uymaz.

**Önerilen atıf:**

> Koray Toksöz, *Titreşimden Şarkıya*, https://muzik.koraytoksoz.com — CC BY 4.0
