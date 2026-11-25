// Hämtar Twemoji-SVG:er för ordbankens bilder till public/bild/ och skriver
// public/bild/bilder.js (emoji -> fil). Twemoji: CC-BY 4.0, se bild/LICENSE.md.
//   node tools/genbild.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HÄR = dirname(fileURLToPath(import.meta.url));
const ROT = join(HÄR, "..");
const BILD = join(ROT, "public", "bild");
mkdirSync(BILD, { recursive: true });

const src = readFileSync(join(ROT, "public", "app.js"), "utf8");
const start = src.indexOf("/* ==== KÄRNA");
const slut = src.indexOf("/* ==== SLUT PÅ KÄRNAN");
const G = new Function(src.slice(src.indexOf("\n", start), slut) + " return { ORDBANK };")();

const emojis = [...new Set(Object.values(G.ORDBANK).flat().map((w) => w.e))];
const kandidater = (e) => {
  const punkter = [...e].map((c) => c.codePointAt(0).toString(16));
  const utan = punkter.filter((p) => p !== "fe0f");
  return [...new Set([utan.join("-"), punkter.join("-")])];
};

const CDN = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.0.3/assets/svg/";
const karta = {};
const misslyckade = [];
for (const e of emojis) {
  let klar = null;
  for (const namn of kandidater(e)) {
    const fil = join(BILD, namn + ".svg");
    if (existsSync(fil) && statSync(fil).size > 200) { klar = namn; break; }
    try {
      const r = await fetch(CDN + namn + ".svg");
      if (r.ok) {
        const text = await r.text();
        if (text.includes("<svg")) {
          writeFileSync(fil, text);
          klar = namn;
          break;
        }
      }
    } catch (err) { /* prova nästa variant */ }
  }
  if (klar) karta[e] = "bild/" + klar + ".svg";
  else misslyckade.push(e);
}

writeFileSync(join(BILD, "bilder.js"),
  "/* Genererad av tools/genbild.mjs – emoji till Twemoji-SVG (CC-BY 4.0). */\n" +
  "window.__BILD = " + JSON.stringify(karta, null, 1) + ";\n");

if (!existsSync(join(BILD, "LICENSE.md"))) {
  writeFileSync(join(BILD, "LICENSE.md"),
    "# Bilder\n\nAlla SVG-bilder i den här mappen kommer från Twemoji (Twitter/X), version 15.0.3,\n" +
    "och används under CC-BY 4.0: https://creativecommons.org/licenses/by/4.0/\n" +
    "Källa: https://github.com/jdecked/twemoji\n");
}
console.log(`${Object.keys(karta).length} av ${emojis.length} bilder klara`);
if (misslyckade.length) console.log("saknas:", misslyckade.join(" "));