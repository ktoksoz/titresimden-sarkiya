/* Müzik teorisi hesapları: nota adları, frekanslar, cent, akort sistemleri, gamlar, akorlar.
   Saf fonksiyonlar; tarayıcıda window.T, Node'da module.exports (tools/test_theory.js). */
(function (root) {
  const A4 = 440;
  // Türkçe solfej adları; diyezli ve bemollü yazımlar
  const SHARP = ["Do", "Do♯", "Re", "Re♯", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "La♯", "Si"];
  const FLAT = ["Do", "Re♭", "Re", "Mi♭", "Mi", "Fa", "Sol♭", "Sol", "La♭", "La", "Si♭", "Si"];
  const LETTER = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  const isBlack = (pc) => [1, 3, 6, 8, 10].includes(((pc % 12) + 12) % 12);
  const pcOf = (m) => ((Math.round(m) % 12) + 12) % 12;

  // MIDI 69 = La4 = 440 Hz; 60 = Do4 (orta Do)
  // a4 yalnız gerçek bir akort frekansıysa kullanılır: notes.map(T.mtof) gibi çağrılarda
  // map'in geçirdiği sıra numarası (0, 1, 2…) akort sanılıp sessiz frekanslar üretmesin.
  const pitch = (a4) => (typeof a4 === "number" && a4 > 100 ? a4 : A4);
  const mtof = (m, a4) => pitch(a4) * Math.pow(2, (m - 69) / 12);
  const ftom = (f, a4) => 69 + 12 * Math.log2(f / pitch(a4));
  const cents = (ratio) => 1200 * Math.log2(ratio);
  const centsBetween = (f1, f2) => 1200 * Math.log2(f2 / f1);
  const octaveOf = (m) => Math.floor(Math.round(m) / 12) - 1;
  function name(m, { flats = false, octave = true } = {}) {
    const n = (flats ? FLAT : SHARP)[pcOf(m)];
    return octave ? n + octaveOf(m) : n;
  }
  // Harf adı (uluslararası yazım): C, C♯/D♭ … B; oktav numarası aynı (La4 = A4)
  const LETTER_FLAT = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  function letter(m, { flats = false, octave = true } = {}) {
    const n = (flats ? LETTER_FLAT : LETTER)[pcOf(m)];
    return octave ? n + octaveOf(m) : n;
  }
  // Metindeki solfej adlarını harfe çevir: "Lam" → "Am", "Si♭4" → "B♭4", "Do/Mi" → "C/E"
  const SOLF = { Do: "C", Re: "D", Mi: "E", Fa: "F", Sol: "G", La: "A", Si: "B" };
  const toLetter = (str) => String(str).replace(/(^|[\s,/(·→–-])(Sol|Do|Re|Mi|Fa|La|Si)/g, (_, pre, x) => pre + SOLF[x]);
  // "La4 (A4)" biçiminde solfej + harf
  const withLetter = (m, opts = {}) => `${name(m, opts)} (${letter(m, opts)})`;
  // frekansa en yakın nota ve sapma (cent)
  function nearest(f, a4 = A4) {
    const m = ftom(f, a4), r = Math.round(m);
    return { midi: r, name: name(r), pc: pcOf(r), octave: octaveOf(r), cents: (m - r) * 100 };
  }

  // kesir yaklaştırma (sürekli kesir), payda sınırıyla
  function fraction(x, maxDen = 16) {
    let best = [1, 1], err = Infinity;
    for (let d = 1; d <= maxDen; d++) {
      const n = Math.round(x * d);
      const e = Math.abs(x - n / d);
      if (e < err - 1e-12) { err = e; best = [n, d]; }
    }
    const g = gcd(best[0], best[1]);
    return [best[0] / g, best[1] / g];
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : Math.abs(a); }

  /* ---- Akort sistemleri: Do'dan itibaren 12 perdenin oranları ---- */
  // Pisagor: beşliler zinciri (Mi♭'den Sol♯'ye: -3..+8 beşli), oktava indirgenmiş
  function pythagoreanRatios() {
    const r = new Array(12);
    for (let k = -3; k <= 8; k++) {
      let x = Math.pow(3 / 2, k);
      while (x >= 2) x /= 2;
      while (x < 1) x *= 2;
      r[((k * 7) % 12 + 12) % 12] = x;
    }
    return r;
  }
  // Saf (5-limit) akort
  const JUST = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
  const JUST_FRAC = ["1/1", "16/15", "9/8", "6/5", "5/4", "4/3", "45/32", "3/2", "8/5", "5/3", "9/5", "15/8"];
  const ET = Array.from({ length: 12 }, (_, i) => Math.pow(2, i / 12));
  const TUNINGS = { pythagorean: pythagoreanRatios(), just: JUST, equal: ET };
  // seçilen akortta, Do'ya göre bir notanın frekansı (Do4 eşit tamperamandaki değeriyle sabit)
  function tunedFreq(m, system = "equal", tonicMidi = 60) {
    const rel = m - tonicMidi, oct = Math.floor(rel / 12), pc = ((rel % 12) + 12) % 12;
    return mtof(tonicMidi) * Math.pow(2, oct) * TUNINGS[system][pc];
  }

  // Pisagor koması: 12 saf beşli ile 7 oktavın farkı
  const PYTHAGOREAN_COMMA = 1200 * Math.log2(Math.pow(3 / 2, 12) / Math.pow(2, 7));
  // Sintonik koma 81/80
  const SYNTONIC_COMMA = cents(81 / 80);
  // Holdrian koması: oktavın 53'te biri
  const HOLDRIAN_COMMA = 1200 / 53;

  /* ---- Tamperamanlar: Pisagor komasının beşlilere paylaştırılması ----
     Beşliler çemberi sırasıyla (Do→Sol, Sol→Re, … Fa→Do) her beşlinin cent cinsinden büyüklüğü.
     12 beşlinin toplamı her zaman 7 oktav = 8400 cent'tir; komayı nereye koyduğumuz sistemi belirler. */
  const PURE5 = cents(3 / 2);
  const FIFTH_ORDER = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]; // Do Sol Re La Mi Si Fa♯ Do♯ Sol♯ Re♯ La♯ Fa
  function withWolf(size, wolfIndex) {
    const f = Array(12).fill(size);
    f[wolfIndex] = 8400 - size * 11; // kalan fark tek bir "kurt" beşliye düşer
    return f;
  }
  const TEMPERAMENTS = {
    // 11 saf beşli; koma Sol♯→Mi♭ beşlisinde toplanır (kurt ≈ 678,5 cent)
    pythagorean: { ad: "Pisagor", fifths: withWolf(PURE5, 8) },
    // ¼ sintonik koma ortalama ton: beşliler 81/80'in dörtte biri kadar dar, büyük üçlüler saf (kurt ≈ 737,6 cent)
    meantone: { ad: "Ortalama ton", fifths: withWolf(PURE5 - SYNTONIC_COMMA / 4, 8) },
    // Werckmeister III (1691): Do–Sol, Sol–Re, Re–La ve Si–Fa♯ beşlileri ¼ Pisagor koması dar, diğerleri saf
    werckmeister: { ad: "İyi düzen (Werckmeister III)", fifths: FIFTH_ORDER.map((_, i) => ([0, 1, 2, 5].includes(i) ? PURE5 - PYTHAGOREAN_COMMA / 4 : PURE5)) },
    equal: { ad: "Eşit tamperaman", fifths: Array(12).fill(700) },
  };
  // Do = 0 kabul edilerek her perde sınıfının cent değeri (0..1200)
  function temperamentCents(name) {
    const f = TEMPERAMENTS[name].fifths, out = new Array(12);
    let c = 0;
    FIFTH_ORDER.forEach((pc, i) => { out[pc] = ((c % 1200) + 1200) % 1200; c += f[i]; });
    return out;
  }
  // Bir majör akorun saf hâlinden sapması (cent): üçlü 5/4'e, beşli 3/2'ye göre
  function triadDeviation(name, root) {
    const t = temperamentCents(name), at = (pc) => t[((pc % 12) + 12) % 12];
    const span = (a, b) => (((at(b) - at(a)) % 1200) + 1200) % 1200;
    return { third: span(root, root + 4) - cents(5 / 4), fifth: span(root, root + 7) - PURE5 };
  }

  /* ---- Aralıklar ---- */
  const INTERVALS = [
    { s: 0, ad: "Tam birli", kisa: "1", oran: [1, 1] },
    { s: 1, ad: "Küçük ikili", kisa: "k2", oran: [16, 15] },
    { s: 2, ad: "Büyük ikili", kisa: "B2", oran: [9, 8] },
    { s: 3, ad: "Küçük üçlü", kisa: "k3", oran: [6, 5] },
    { s: 4, ad: "Büyük üçlü", kisa: "B3", oran: [5, 4] },
    { s: 5, ad: "Tam dörtlü", kisa: "T4", oran: [4, 3] },
    { s: 6, ad: "Triton", kisa: "A4", oran: [45, 32] },
    { s: 7, ad: "Tam beşli", kisa: "T5", oran: [3, 2] },
    { s: 8, ad: "Küçük altılı", kisa: "k6", oran: [8, 5] },
    { s: 9, ad: "Büyük altılı", kisa: "B6", oran: [5, 3] },
    { s: 10, ad: "Küçük yedili", kisa: "k7", oran: [9, 5] },
    { s: 11, ad: "Büyük yedili", kisa: "B7", oran: [15, 8] },
    { s: 12, ad: "Oktav", kisa: "8", oran: [2, 1] },
  ];
  const interval = (semis) => {
    const s = Math.abs(semis);
    const base = INTERVALS[s % 12 === 0 && s > 0 ? 12 : s % 12];
    return s > 12 ? { ...base, ad: base.ad + " + oktav" } : base;
  };

  /* ---- Gamlar ---- */
  const SCALES = {
    major: { ad: "Majör", steps: [2, 2, 1, 2, 2, 2, 1] },
    natural: { ad: "Doğal minör", steps: [2, 1, 2, 2, 1, 2, 2] },
    harmonic: { ad: "Armonik minör", steps: [2, 1, 2, 2, 1, 3, 1] },
    melodic: { ad: "Melodik minör", steps: [2, 1, 2, 2, 2, 2, 1] },
    pentaMajor: { ad: "Majör pentatonik", steps: [2, 2, 3, 2, 3] },
    pentaMinor: { ad: "Minör pentatonik", steps: [3, 2, 2, 3, 2] },
    chromatic: { ad: "Kromatik", steps: Array(12).fill(1) },
  };
  // Kilise modları: majör gamın dönüşümleri
  const MODES = [
    { ad: "İyon", alt: "majör", k: 0, his: "parlak, kararlı" },
    { ad: "Dor", alt: "", k: 1, his: "minör ama umutlu (büyük altılı)" },
    { ad: "Frig", alt: "", k: 2, his: "karanlık, flamenko (küçük ikili)" },
    { ad: "Lidya", alt: "", k: 3, his: "rüya gibi, havada (artık dörtlü)" },
    { ad: "Miksolidya", alt: "", k: 4, his: "rock, blues (küçük yedili)" },
    { ad: "Eol", alt: "doğal minör", k: 5, his: "hüzünlü" },
    { ad: "Lokriya", alt: "", k: 6, his: "kararsız (eksik beşli)" },
  ];
  const rotate = (arr, k) => arr.slice(k).concat(arr.slice(0, k));
  const modeSteps = (k) => rotate(SCALES.major.steps, k);
  // adım dizisinden yarım ses konumları: [0,2,4,5,7,9,11,12]
  function degrees(steps) {
    const out = [0];
    steps.forEach((s) => out.push(out[out.length - 1] + s));
    return out;
  }
  const scaleNotes = (tonic, steps) => degrees(steps).map((d) => tonic + d);
  const inScale = (m, tonic, steps) => degrees(steps).slice(0, -1).includes(((m - tonic) % 12 + 12) % 12);

  /* ---- Akorlar ---- */
  const CHORDS = {
    maj: { ad: "Majör", sym: "", iv: [0, 4, 7] },
    min: { ad: "Minör", sym: "m", iv: [0, 3, 7] },
    aug: { ad: "Artık", sym: "+", iv: [0, 4, 8] },
    dim: { ad: "Eksik", sym: "°", iv: [0, 3, 6] },
    maj7: { ad: "Majör 7", sym: "maj7", iv: [0, 4, 7, 11] },
    dom7: { ad: "Dominant 7", sym: "7", iv: [0, 4, 7, 10] },
    min7: { ad: "Minör 7", sym: "m7", iv: [0, 3, 7, 10] },
    hdim7: { ad: "Yarım eksik 7", sym: "ø7", iv: [0, 3, 6, 10] },
    dim7: { ad: "Eksik 7", sym: "°7", iv: [0, 3, 6, 9] },
  };
  function chord(root, type, inversion = 0) {
    const notes = CHORDS[type].iv.map((i) => root + i);
    for (let k = 0; k < inversion; k++) notes.push(notes.shift() + 12);
    return notes;
  }
  const chordName = (root, type, flats = false) => name(root, { flats, octave: false }) + CHORDS[type].sym;
  // akor sembolünün harfli yazımı: Lam → Am, Sol7 → G7
  const chordLetter = (root, type, flats = false) => letter(root, { flats, octave: false }) + CHORDS[type].sym;
  const chordBoth = (root, type, flats = false) => `${chordName(root, type, flats)} (${chordLetter(root, type, flats)})`;
  // majör tonda dereceler: I ii iii IV V vi vii°
  const ROMAN = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
  const DEGREE_TYPE = ["maj", "min", "min", "maj", "maj", "min", "dim"];
  const DEGREE_TYPE7 = ["maj7", "min7", "min7", "maj7", "dom7", "min7", "hdim7"];
  function diatonicChord(tonic, deg, seventh = false) {
    const d = degrees(SCALES.major.steps);
    return { root: tonic + d[deg], type: (seventh ? DEGREE_TYPE7 : DEGREE_TYPE)[deg], roman: ROMAN[deg] };
  }
  // Fonksiyon: tonik (I, vi, iii), subdominant (IV, ii), dominant (V, vii°)
  const FUNCTION = ["tonic", "sub", "tonic", "sub", "dom", "tonic", "dom"];

  /* ---- Beşliler çemberi ---- */
  // saat yönünde: Do, Sol, Re, La, Mi, Si, Fa♯/Sol♭, Re♭, La♭, Mi♭, Si♭, Fa
  const CIRCLE = Array.from({ length: 12 }, (_, i) => {
    const pc = (i * 7) % 12;
    const acc = i <= 6 ? i : i - 12; // pozitif: diyez, negatif: bemol
    const flats = acc < 0;
    const label = i === 6 ? "Fa♯ / Sol♭" : name(pc, { flats, octave: false });
    return { pc, acc, label, minor: name((pc + 9) % 12, { flats, octave: false }) + "m" };
  });
  // donanım sırası
  const SHARP_ORDER = ["Fa", "Do", "Sol", "Re", "La", "Mi", "Si"];
  const FLAT_ORDER = ["Si", "Mi", "La", "Re", "Sol", "Do", "Fa"];

  /* ---- Pürüzlülük (Plomp–Levelt eğrisi, Sethares'in parametreleriyle) ---- */
  function roughnessPair(f1, f2, a1 = 1, a2 = 1) {
    const b1 = 3.5, b2 = 5.75, dstar = 0.24, s1 = 0.0207, s2 = 18.96;
    const fmin = Math.min(f1, f2), df = Math.abs(f2 - f1);
    const s = dstar / (s1 * fmin + s2);
    return Math.min(a1, a2) * (Math.exp(-b1 * s * df) - Math.exp(-b2 * s * df));
  }
  // iki karmaşık tonun (n harmonikli, genlikler 0.88^k) toplam pürüzlülüğü
  function roughness(f1, f2, n = 6, decay = 0.88) {
    const P = [];
    for (let k = 1; k <= n; k++) { P.push([f1 * k, Math.pow(decay, k - 1)]); P.push([f2 * k, Math.pow(decay, k - 1)]); }
    let d = 0;
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) d += roughnessPair(P[i][0], P[j][0], P[i][1], P[j][1]);
    return d;
  }

  const api = {
    A4, SHARP, FLAT, LETTER, LETTER_FLAT, letter, withLetter, toLetter, isBlack, pcOf, mtof, ftom, cents, centsBetween, octaveOf, name, nearest, fraction, gcd,
    TUNINGS, JUST_FRAC, tunedFreq, pythagoreanRatios, PYTHAGOREAN_COMMA, SYNTONIC_COMMA, HOLDRIAN_COMMA,
    INTERVALS, interval, SCALES, MODES, modeSteps, degrees, scaleNotes, inScale, rotate,
    CHORDS, chord, chordName, chordLetter, chordBoth, ROMAN, DEGREE_TYPE, DEGREE_TYPE7, diatonicChord, FUNCTION,
    CIRCLE, SHARP_ORDER, FLAT_ORDER, roughnessPair, roughness,
    TEMPERAMENTS, FIFTH_ORDER, temperamentCents, triadDeviation,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.T = api;
})(this);
