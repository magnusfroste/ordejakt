// Kontrollerar Ordejakts rena kärna i public/app.js:
//  – ordbanken har minst 40 svenska vardagsord i tre nivåer (4/5/6 bokstäver),
//  – varje ord finns i en oberoende ordlista med samma längd och bokstäverna stämmer,
//  – blandningen är ett anagram av ordet och aldrig redan rätt,
//  – klickmappningen (bricka -> plats) ger alltid ordet, även med dubbelbokstäver,
//  – en hel runda går att spela med två felsvar per ord: FEL, inget stjärntapp,
//    rundan fortsätter, och efter åtta ord blir det SLUT med rätt knappar,
//  – en felfri runda ger 8 stjärnor per nivå,
//  – varje ord och varje fras har en färdig mp3-fil i ljud/.
//   node verify.mjs
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HÄR = dirname(fileURLToPath(import.meta.url));
const appPath = join(HÄR, "public", "app.js");
const src = readFileSync(appPath, "utf8");

const startMark = "/* ==== KÄRNA";
const slutMark = "/* ==== SLUT PÅ KÄRNAN";
const start = src.indexOf(startMark);
const slut = src.indexOf(slutMark);
if (start < 0 || slut < 0) throw new Error("hittar inte kärnan mellan markörerna i app.js");
const ren = src.slice(src.indexOf("\n", start), slut);

const G = new Function(ren + `
  return { ORDBANK, NIVAR, RUNDA_LANGD, ordlista, gorRunda, blandaOrd, nyMotor,
           startaNiva, aktuell, svar, klicka, taBort, arFull, lamna, nasta,
           nastaNiva, spelaIgen, taltOrd, olikaBokstaver };
`)();

let fel = 0;
const kolla = (c, m, p) => {
  if (!c) {
    fel++;
    if (fel <= 30) console.log("FEL:", m, p === undefined ? "" : JSON.stringify(p));
  }
};

/* Oberoende ordlista, skriven för hand (inte samma kodväg som appens bank).
   Alla är vanliga svenska vardagsord – inga namn. */
const OBEROENDE = {
  4: ["boll", "katt", "hund", "fisk", "häst", "myra", "buss", "dörr", "hatt", "moln",
    "regn", "träd", "gräs", "sten", "sand", "tält", "bröd", "kaka", "kopp", "sked",
    "kniv", "stol", "bord", "säng", "låda", "ring", "korg", "hink", "lina", "hage"],
  5: ["fågel", "mjölk", "äpple", "banan", "päron", "morot", "gurka", "tårta", "glass",
    "lampa", "penna", "väska", "byxor", "tröja", "jacka", "mössa", "vante", "cykel",
    "mamma", "pappa", "skola", "kudde", "täcke", "kvast", "pojke", "stuga", "skärm",
    "ficka", "kasse", "vågor"],
  6: ["klocka", "socker", "vatten", "gaffel", "nyckel", "papper", "linjal", "stövel",
    "kompis", "syster", "farmor", "mormor", "moster", "faster", "spegel", "trappa",
    "middag", "morgon", "sommar", "vinter", "pussel", "sjunga", "fåtölj", "blomma",
    "flicka", "mössor", "fickor", "vanten", "skogen"]
};
const ordbok = new Set();
for (const längd of Object.keys(OBEROENDE)) {
  for (const w of OBEROENDE[Number(längd)]) {
    kolla(w.length === Number(längd), "oberoende ordlistan har fel längd på " + w, w.length);
    kolla(/^[a-zåäö]+$/.test(w), "oberoende ordlistan har otillåtet tecken: " + w);
    ordbok.add(w);
  }
}
kolla(ordbok.size >= 60, "oberoende ordlistan är för liten", ordbok.size);

/* 1. Ordbanen: tre nivåer, 4/5/6 bokstäver, minst 40 ord, inga dubbletter. */
kolla(G.RUNDA_LANGD === 8, "rundan ska vara 8 ord", G.RUNDA_LANGD);
kolla(JSON.stringify(G.NIVAR) === "[4,5,6]", "nivåerna ska vara 4, 5 och 6 bokstäver", G.NIVAR);

const allaOrd = new Set();
let antalOrd = 0;
let kortaste = 99, längsta = 0;
for (let niva = 1; niva <= 3; niva++) {
  const lista = G.ordlista(niva);
  const längd = G.NIVAR[niva - 1];
  kolla(lista.length >= 16, "nivå " + niva + " har för få ord", lista.length);
  kolla(lista.length >= 3 * G.RUNDA_LANGD, "nivå " + niva + " räcker inte till tre rundor", lista.length);
  for (const w of lista) {
    antalOrd++;
    kortaste = Math.min(kortaste, w.o.length);
    längsta = Math.max(längsta, w.o.length);
    kolla(w.o.length === längd, "fel längd i nivå " + niva + ": " + w.o);
    kolla(/^[a-zåäö]+$/.test(w.o), "otillåtna tecken i " + w.o);
    kolla(w.o === w.o.toLowerCase(), "ordet är inte gemener: " + w.o);
    kolla(!allaOrd.has(w.o), "ordet finns i två nivåer: " + w.o);
    allaOrd.add(w.o);
    kolla(typeof w.e === "string" && w.e.length > 0, "ordet saknar bild: " + w.o);
    kolla(ordbok.has(w.o), "ordet finns inte i den oberoende ordlistan: " + w.o);
  }
}
kolla(antalOrd >= 40, "färre än 40 ord totalt", antalOrd);
kolla(kortaste === 4 && längsta === 6, "orden spänner inte 4–6 bokstäver", { kortaste, längsta });
kolla(allaOrd.size === antalOrd, "dubblerade ord i banken", allaOrd.size);

/* 2. Blandningen: alltid ett anagram, aldrig löst från början. */
const sortera = (s) => s.split("").sort().join("");
for (let k = 0; k < 3000; k++) {
  const niva = (k % 3) + 1;
  const runda = G.gorRunda(niva, []);
  kolla(runda.length === 8, "rundan har inte 8 ord", runda.length);
  const sedda = new Set();
  for (const it of runda) {
    kolla(!sedda.has(it.ord), "samma ord två gånger i rundan", it.ord);
    sedda.add(it.ord);
    kolla(it.ord.length === G.NIVAR[niva - 1], "rundan blandar nivåer", it.ord);
    kolla(Array.isArray(it.brickor) && it.brickor.length === it.ord.length, "fel antal brickor", it);
    kolla(sortera(it.brickor.join("")) === sortera(it.ord), "brickorna är inte ordets bokstäver", it);
    if (G.olikaBokstaver(it.ord) > 1) {
      kolla(it.brickor.join("") !== it.ord, "brickorna står redan i rätt ordning", it);
    }
  }
}
/* Slumpen ska ge olika rundor, inte samma åtta ord varje gång. */
const rundor = new Set();
for (let k = 0; k < 200; k++) rundor.add(G.gorRunda(2, []).map((x) => x.ord).join(","));
kolla(rundor.size > 150, "ordvalet är inte slumpmässigt", rundor.size);

/* 3. Klickmappning: rätt bricka på rätt plats ger ordet. */
function fyll(m, ordning) {
  for (const idx of ordning) {
    if (!G.klicka(m, idx)) return false;
  }
  return G.arFull(m);
}
function hittaOrdning(m, ord) {
  const it = G.aktuell(m), kvar = it.brickor.map((b, i) => i);
  const val = [];
  for (const bokstav of ord) {
    const pos = kvar.findIndex((i) => it.brickor[i] === bokstav && !val.includes(i));
    if (pos < 0) return null;
    val.push(kvar.splice(pos, 1)[0]);
  }
  return val;
}
for (let niva = 1; niva <= 3; niva++) {
  for (const w of G.ordlista(niva)) {
    for (let rep = 0; rep < 12; rep++) {
      const m = G.nyMotor();
      G.startaNiva(m, niva);
      m.runda = [{ ord: w.o, emoji: w.e, brickor: G.blandaOrd(w.o) }];
      m.i = 0;
      const ordning = hittaOrdning(m, w.o);
      kolla(ordning !== null, "hittar ingen klickordning för " + w.o);
      kolla(fyll(m, ordning), "kunde inte fylla alla platser för " + w.o);
      kolla(G.svar(m) === w.o, "klickmappningen gav fel svar", { ord: w.o, svar: G.svar(m) });
      const res = G.lamna(m);
      kolla(res && res.ratt === true, "rätt svar godkändes inte: " + w.o);
      kolla(res && res.stjarna === true, "första försöket gav ingen stjärna: " + w.o);
    }
  }
}

/* 4. En hel runda med två felsvar per ord. */
function felOrdning(m, ord) {
  const it = G.aktuell(m), n = it.brickor.length;
  const alla = [...Array(n).keys()];
  const kandidater = [alla.slice().reverse()];
  for (let i = 0; i < n - 1; i++) {
    const k = alla.slice();
    [k[i], k[i + 1]] = [k[i + 1], k[i]];
    kandidater.push(k);
  }
  for (const k of kandidater) {
    if (k.map((i) => it.brickor[i]).join("") !== ord) return k;
  }
  return null;
}

let kontrolleradeFelsvar = 0, kontrolleradeRatt = 0;
for (let niva = 1; niva <= 3; niva++) {
  const m = G.nyMotor();
  G.startaNiva(m, niva);
  kolla(m.fas === "spel", "nivån startar inte", m.fas);
  kolla(m.stjarnor === 0, "stjärnor från början", m.stjarnor);
  for (let i = 0; i < 8; i++) {
    const it = G.aktuell(m);
    kolla(!!it, "rundan tar slut för tidigt på ord " + i);
    if (!it) break;
    for (let varv = 0; varv < 2; varv++) {
      const ordning = felOrdning(m, it.ord);
      kolla(ordning !== null, "hittar inget felsvar för " + it.ord);
      kolla(fyll(m, ordning), "kunde inte fylla felsvaret för " + it.ord);
      const res = G.lamna(m);
      kontrolleradeFelsvar++;
      kolla(res && res.ratt === false, "fel svar godkändes: " + it.ord);
      kolla(res && res.stjarna === false, "fel svar gav stjärna: " + it.ord);
      kolla(m.status === "FEL", "status är inte FEL efter felsvar", m.status);
      kolla(m.placerade.length === 0, "bokstäverna gick inte tillbaka efter fel", m.placerade);
      kolla(m.i === i, "fel svar flyttade fram rundan", m.i);
      kolla(m.stjarnor === 0, "fel svar kostade eller gav stjärna", m.stjarnor);
    }
    const ordning = hittaOrdning(m, it.ord);
    kolla(fyll(m, ordning), "kunde inte fylla rätt svar efter två fel: " + it.ord);
    const res = G.lamna(m);
    kontrolleradeRatt++;
    kolla(res && res.ratt === true, "rätt svar efter fel godkändes inte: " + it.ord);
    kolla(res && res.stjarna === false, "stjärna trots två felsvar: " + it.ord);
    const steg = G.nasta(m);
    kolla(steg === (i === 7 ? "slut" : "nasta"), "fel steg efter ord " + i, steg);
  }
  kolla(m.ratt === 8, "rundan räknade inte 8 rätta", m.ratt);
  kolla(m.fel === 16, "felräkningen stämmer inte", m.fel);
  kolla(m.stjarnor === 0, "stjärnor utan första-försök", m.stjarnor);
  kolla(m.fas === "slut", "rundan tar inte slut", m.fas);
  kolla(m.i === 7, "sista ordet är inte det åttonde", m.i);
}

/* 5. Felfri runda: 8 stjärnor per nivå, Nästa nivå och Spela igen. */
const m = G.nyMotor();
G.startaNiva(m, 1);
for (let niva = 1; niva <= 3; niva++) {
  kolla(m.niva === niva, "fel nivå efter Nästa nivå", m.niva);
  kolla(m.runda.every((it) => it.ord.length === G.NIVAR[niva - 1]), "fel ordlängd på nivå " + niva);
  for (let i = 0; i < 8; i++) {
    const it = G.aktuell(m);
    kolla(fyll(m, hittaOrdning(m, it.ord)), "kunde inte fylla " + it.ord);
    kolla(G.lamna(m).stjarna === true, "första försöket gav ingen stjärna: " + it.ord);
    G.nasta(m);
  }
  kolla(m.stjarnor === 8 * niva, "stjärnorna stämmer inte efter nivå " + niva, m.stjarnor);
  kolla(m.fas === "slut", "nivån tar inte slut", m.fas);
  if (niva < 3) {
    G.nastaNiva(m);
    kolla(m.fas === "spel", "Nästa nivå startar inte", m.fas);
    kolla(m.i === 0 && m.placerade.length === 0, "Nästa nivå nollställer inte", m);
  }
}
const föreIgen = m.stjarnor;
G.spelaIgen(m);
kolla(m.niva === 1 && m.stjarnor === 0 && m.fas === "spel", "Spela igen återställer inte", m);
kolla(föreIgen === 24, "24 stjärnor för tre felfria nivåer", föreIgen);

/* 6. FEL- och SLUT-texterna finns i appen och i sidan (reserv när ljudet är av). */
for (const text of ["FEL", "SLUT", "FEL – prova igen", "SLUT – rundan är klar"]) {
  kolla(src.includes(text), "texten saknas i app.js: " + text);
}
const html = readFileSync(join(HÄR, "public", "index.html"), "utf8");
kolla(html.includes("SLUT"), "SLUT finns inte i index.html");
kolla(html.includes("FEL") || src.includes("FEL"), "FEL finns inte som text");

/* 7. Ljud: varje ord och varje fras har en mp3-fil. */
const linesPath = join(HÄR, "public", "ljud", "lines.js");
kolla(existsSync(linesPath), "ljud/lines.js saknas");
let ROST = {};
if (existsSync(linesPath)) {
  const lines = readFileSync(linesPath, "utf8");
  const json = lines.slice(lines.indexOf("=") + 1).trim().replace(/;\s*$/, "");
  ROST = JSON.parse(json);
}
let ljudSaknas = [];
for (let niva = 1; niva <= 3; niva++) {
  for (const w of G.ordlista(niva)) {
    const nyckel = G.taltOrd(w.o);
    if (!ROST[nyckel]) { ljudSaknas.push(nyckel); continue; }
    const fil = join(HÄR, "public", "ljud", ROST[nyckel] + ".mp3");
    if (!existsSync(fil) || statSync(fil).size < 400) ljudSaknas.push(nyckel);
  }
}
for (const fras of ["Rätt!", "Fel – prova igen.", "Nivå 1 klar.", "Nivå 2 klar.", "Alla nivåer klara."]) {
  if (!ROST[fras]) ljudSaknas.push(fras);
}
kolla(ljudSaknas.length === 0, "ord eller fraser utan mp3", ljudSaknas.slice(0, 10));
kolla(Object.keys(ROST).length >= antalOrd + 5, "för få ljudfiler i lines.js", Object.keys(ROST).length);

/* 8. Bilder: varje ord har en SVG (Twemoji), så ledtråden syns utan emojiteckensnitt. */
const bildPath = join(HÄR, "public", "bild", "bilder.js");
kolla(existsSync(bildPath), "bild/bilder.js saknas");
let BILD = {};
if (existsSync(bildPath)) {
  const b = readFileSync(bildPath, "utf8");
  BILD = JSON.parse(b.slice(b.indexOf("=") + 1).trim().replace(/;\s*$/, ""));
}
const bildSaknas = [];
for (let niva = 1; niva <= 3; niva++) {
  for (const w of G.ordlista(niva)) {
    const fil = BILD[w.e];
    if (!fil) { bildSaknas.push(w.o + " (" + w.e + ")"); continue; }
    const full = join(HÄR, "public", fil);
    if (!existsSync(full) || statSync(full).size < 200) bildSaknas.push(w.o);
  }
}
kolla(bildSaknas.length === 0, "ord utan bildfil", bildSaknas.slice(0, 10));

if (fel) {
  console.log("\n" + fel + " fel");
  process.exit(1);
}
console.log("0 fel – " + antalOrd + " ord i 3 nivåer, 3000 rundor, " +
  kontrolleradeFelsvar + " felsvar och " + kontrolleradeRatt + " rätta svar i genomspelade rundor, " +
  Object.keys(ROST).length + " ljudfiler kontrollerade.");