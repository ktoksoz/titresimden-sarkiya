/* Müzik hesaplarının doğruluk testleri. Kullanım: node tools/test_theory.js */
const T = require("../js/theory.js");
let fail = 0, n = 0;
function eq(name, got, want, tol = 1e-6) {
  n++;
  const ok = typeof want === "number" ? Math.abs(got - want) <= tol : JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fail++; console.log(`✗ ${name}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); }
  else console.log(`✓ ${name}`);
}

// Frekanslar
eq("La4 = 440 Hz", T.mtof(69), 440);
eq("Do4 (orta Do) ≈ 261,626 Hz", T.mtof(60), 261.6256, 1e-3);
eq("La3 = 220 Hz", T.mtof(57), 220);
eq("Do8 ≈ 4186,01 Hz (piyanonun en tizi)", T.mtof(108), 4186.009, 1e-2);
eq("440 Hz → MIDI 69", T.ftom(440), 69);
eq("443 Hz ≈ La4 +11,8 cent", T.nearest(443).cents, 11.76, 0.01);
eq("443 Hz'in adı La4", T.nearest(443).name, "La4");
eq("Do♯4 adı", T.name(61), "Do♯4");
eq("Si♭ bemollü yazım", T.name(70, { flats: true }), "Si♭4");

// Aralıklar ve cent
eq("ET beşli = 700 cent", T.cents(T.TUNINGS.equal[7]), 700);
eq("ET büyük üçlü = 400 cent", T.cents(T.TUNINGS.equal[4]), 400);
eq("Saf beşli 3/2 ≈ 701,955 cent", T.cents(3 / 2), 701.955, 1e-3);
eq("Saf büyük üçlü 5/4 ≈ 386,314 cent", T.cents(5 / 4), 386.314, 1e-3);
eq("Oktav = 1200 cent", T.cents(2), 1200);
eq("Pisagor koması ≈ 23,460 cent", T.PYTHAGOREAN_COMMA, 23.46, 1e-3);
eq("Pisagor koması = 3¹²/2¹⁹", T.PYTHAGOREAN_COMMA, T.cents(531441 / 524288), 1e-9);
eq("Sintonik koma ≈ 21,506 cent", T.SYNTONIC_COMMA, 21.506, 1e-3);
eq("Holdrian koması ≈ 22,642 cent", T.HOLDRIAN_COMMA, 22.6415, 1e-3);

// Akort sistemleri
const P = T.TUNINGS.pythagorean;
eq("Pisagor beşli = 3/2", P[7], 1.5);
eq("Pisagor büyük üçlü = 81/64", P[4], 81 / 64);
eq("Pisagor büyük üçlü ≈ 407,82 cent", T.cents(P[4]), 407.82, 0.01);
eq("Saf akort majör akor 4:5:6", [T.TUNINGS.just[4] / 1, T.TUNINGS.just[7] / 1], [1.25, 1.5]);
eq("Eşit tamperamanda Mi4 ≈ 329,63 Hz", T.tunedFreq(64, "equal"), 329.628, 1e-2);
eq("Saf akortta Mi4 = Do4 × 5/4", T.tunedFreq(64, "just"), T.mtof(60) * 1.25, 1e-9);
eq("Pisagor akortunda Sol4 = Do4 × 3/2", T.tunedFreq(67, "pythagorean"), T.mtof(60) * 1.5, 1e-9);
eq("Saf akortta Do5 = 2 × Do4", T.tunedFreq(72, "just"), T.mtof(60) * 2, 1e-9);

// Gamlar
eq("Majör gam Do'dan", T.scaleNotes(60, T.SCALES.major.steps), [60, 62, 64, 65, 67, 69, 71, 72]);
eq("Armonik minör La'dan", T.scaleNotes(57, T.SCALES.harmonic.steps), [57, 59, 60, 62, 64, 65, 68, 69]);
eq("Dor modu = majörün 2. dönüşümü", T.modeSteps(1), [2, 1, 2, 2, 2, 1, 2]);
eq("Lidya modu", T.modeSteps(3), [2, 2, 2, 1, 2, 2, 1]);
eq("Pentatonik toplamı 12", T.SCALES.pentaMajor.steps.reduce((a, b) => a + b), 12);
Object.entries(T.SCALES).forEach(([k, s]) => eq(`${k} gamı oktavı tamamlar`, s.steps.reduce((a, b) => a + b), 12));

// Akorlar
eq("Do majör akor", T.chord(60, "maj"), [60, 64, 67]);
eq("Do majör 1. çevrim", T.chord(60, "maj", 1), [64, 67, 72]);
eq("Sol7", T.chord(67, "dom7"), [67, 71, 74, 77]);
eq("Akor adı Lam", T.chordName(57, "min"), "Lam");
eq("V derecesi Do majörde Sol majör", T.diatonicChord(60, 4), { root: 67, type: "maj", roman: "V" });
eq("vii° eksik akor", T.diatonicChord(60, 6).type, "dim");

// Beşliler çemberi
eq("Çember sırası", T.CIRCLE.map((c) => c.pc), [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]);
eq("Re majör 2 diyez", T.CIRCLE[2].acc, 2);
eq("Fa majör 1 bemol", T.CIRCLE[11].acc, -1);
eq("Do majörün akraba minörü Lam", T.CIRCLE[0].minor, "Lam");

// Türk müziği: Hicaz dizisi (AEU koma değerleri)
const hicaz = [0, 5, 17, 22, 31, 39, 44, 53];
eq("Hicaz dörtlüsü 5+12+5 = 22 koma (tam dörtlü)", hicaz[3], 22);
eq("Rast beşlisi 9+8+5+9 = 31 koma (tam beşli)", hicaz[7] - hicaz[3], 31);
eq("22 koma ≈ saf dörtlü (498,1 c)", 22 * T.HOLDRIAN_COMMA, 498.11, 0.01);
eq("31 koma ≈ saf beşli (701,9 c)", 31 * T.HOLDRIAN_COMMA, 701.89, 0.01);
eq("12 koma ≈ 271,7 c (Hicaz artık ikilisi)", 12 * T.HOLDRIAN_COMMA, 271.70, 0.01);

// Pürüzlülük: beşli, triton ve küçük ikiliden daha pürüzsüz
const f = T.mtof(60);
const r = (s) => T.roughness(f, f * Math.pow(2, s / 12));
eq("Beşli < triton (pürüz)", r(7) < r(6), true);
eq("Oktav < küçük ikili (pürüz)", r(12) < r(1), true);
eq("Unison, çevresindeki en pürüzsüz nokta", r(0) < r(0.3) && r(0) < r(1), true);

// Harmonik dizisi: 7. harmonik ET Si♭'den ~31 cent pes
eq("7. harmonik −31,2 cent", T.nearest(T.mtof(36) * 7).cents, -31.17, 0.01);
eq("5. harmonik −13,7 cent", T.nearest(T.mtof(36) * 5).cents, -13.69, 0.01);

console.log(`\n${n - fail}/${n} test geçti`);
process.exit(fail ? 1 : 0);
