// Bygger ljudet: en mp3 per ord och per fras, plus ljud/lines.js och ljud/rosten.js.
//   node tools/genljud.mjs
// Kräver edge-tts (sv-SE-SofieNeural). Fallgården i appen är webbläsarens talsyntes,
// så en saknad fil gör appen tystare – inte trasig.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const kör = promisify(execFile);
const HÄR = dirname(fileURLToPath(import.meta.url));
const ROT = join(HÄR, "..");
const LJUD = join(ROT, "public", "ljud");
mkdirSync(LJUD, { recursive: true });

const src = readFileSync(join(ROT, "public", "app.js"), "utf8");
const start = src.indexOf("/* ==== KÄRNA");
const slut = src.indexOf("/* ==== SLUT PÅ KÄRNAN");
const ren = src.slice(src.indexOf("\n", start), slut);
const G = new Function(ren + " return { ORDBANK, taltOrd };")();

const texter = [];
for (const längd of Object.keys(G.ORDBANK)) {
  for (const w of G.ORDBANK[längd]) texter.push(G.taltOrd(w.o));
}
texter.push("Rätt!", "Fel – prova igen.", "Nivå 1 klar.", "Nivå 2 klar.", "Alla nivåer klara.");

const unika = [...new Set(texter)];
const id = (t) => createHash("sha1").update(t, "utf8").digest("hex").slice(0, 10);

async function synth(t) {
  const fil = join(LJUD, id(t) + ".mp3");
  if (existsSync(fil) && statSync(fil).size > 400) return id(t);
  for (let försök = 0; försök < 4; försök++) {
    try {
      await kör("edge-tts", ["--text", t, "--voice", "sv-SE-SofieNeural", "--rate", "-4%", "--write-media", fil], { timeout: 90000 });
      if (existsSync(fil) && statSync(fil).size > 400) return id(t);
    } catch (e) { /* försök igen */ }
  }
  return null;
}

const lines = {};
let klara = 0;
for (let i = 0; i < unika.length; i += 4) {
  const grupp = unika.slice(i, i + 4);
  const svar = await Promise.all(grupp.map(synth));
  grupp.forEach((t, k) => { if (svar[k]) { lines[t] = svar[k]; klara++; } });
  console.log(`${Math.min(i + 4, unika.length)}/${unika.length}`);
}
writeFileSync(join(LJUD, "lines.js"),
  "/* Genererad av tools/genljud.mjs – text till färdig mp3-fil. */\n" +
  "window.__ROST = " + JSON.stringify(lines, null, 1) + ";\n");
copyFileSync(join(HÄR, "rosten.js"), join(LJUD, "rosten.js"));
console.log(`${klara} av ${unika.length} ljudfiler klara`);