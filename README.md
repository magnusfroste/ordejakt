# Ordejakt

Sortera bokstäverna till ordet – svensk skolapp för åk 1–3 (Lgr22: sambandet
mellan ljud och bokstav). Statisk sida, inga beroenden i drift.

- **Spela:** https://ordejakt.shipholm.dev
- **72 ord** i tre nivåer (4/5/6 bokstäver), 8 ord per runda, slumpat ur 24 per nivå.
- **Peka, inte dra:** tryck en bricka för att lägga bokstaven, tryck en fylld plats
  för att ta tillbaka den. Fel kostar inget; stjärna bara på första försöket.
- **Ljud:** färdiga mp3-filer i `public/ljud/` med talsyntes som reserv.

## Filer

```
public/index.html      startskärm, spelplan, overlay
public/app.js          ordbank + motor (ren kod) + UI  – verify.mjs läser kärnan
public/styles.css
public/ljud/           77 mp3 + lines.js (text -> fil) + rosten.js (spelare)
public/bild/           72 Twemoji-SVG + bilder.js (emoji -> fil)
public/kort.png        kortbild 1200x900 (nivå 2)
verify.mjs             node verify.mjs  -> 0 fel
tools/genljud.mjs      bygger om mp3 + lines.js (kräver edge-tts)
tools/genbild.mjs      hämtar Twemoji-SVG + bilder.js
tools/playtest.mjs     spelar appen i headless Chromium via CDP
Dockerfile             nginx:1.27-alpine, port 8080
deploy/nginx.conf
```

## Kommandon

```
node verify.mjs
python3 -m http.server 8123 --directory public     # lokal förhandskontroll
node tools/playtest.mjs http://127.0.0.1:8123/ --shot /tmp/niva2.png
node tools/genljud.mjs                             # edge-tts sv-SE-SofieNeural
node tools/genbild.mjs                             # Twemoji 15.0.3 (CC-BY 4.0)
```

Logiken ligger i ett markerat block i `public/app.js` (`KÄRNA … SLUT PÅ KÄRNAN`)
och exporteras till `window.__ordejakt` för test. `verify.mjs` kör blocket i Node
utan DOM och prövar ordbank, blandning, klickmappning och hela rundor med felsvar.

Bilderna i `public/bild/` är Twemoji (Twitter/X), CC-BY 4.0 – se
`public/bild/LICENSE.md`.