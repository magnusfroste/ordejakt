// Spelar Ordejakt i headless Chromium via CDP och samlar bevis.
//   node tools/playtest.mjs <url> [--shot <fil>] [--json <fil>]
// Kräver en chrome-binär i CHROME eller /opt/hermes/tools/chromium-1248/chrome-linux64/chrome.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const URL_ARG = process.argv[2];
if (!URL_ARG) { console.error("ange url"); process.exit(2); }
const argShot = process.argv.indexOf("--shot");
const SHOT = argShot > 0 ? process.argv[argShot + 1] : null;
const argJson = process.argv.indexOf("--json");
const JSON_OUT = argJson > 0 ? process.argv[argJson + 1] : null;

const CHROME = process.env.CHROME || "/opt/hermes/tools/chromium-1248/chrome-linux64/chrome";
const PORT = 9300 + Math.floor(Math.random() * 300);
const PROFIL = join(tmpdir(), "ordejakt-chrome-" + PORT);

const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=" + PORT, "--no-sandbox", "--disable-gpu",
  "--disable-dev-shm-usage", "--mute-audio", "--autoplay-policy=no-user-gesture-required",
  "--user-data-dir=" + PROFIL, "--window-size=1024,768", "about:blank"
], { stdio: "ignore" });

async function vantaChrome() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return;
    } catch (e) { }
    await sleep(250);
  }
  throw new Error("chrome startade inte");
}
await vantaChrome();

const lista = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const sida = lista.find((t) => t.type === "page");
const ws = new WebSocket(sida.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let nastaId = 0;
const vantar = new Map();
const lyssnare = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && vantar.has(m.id)) {
    const { res, rej } = vantar.get(m.id);
    vantar.delete(m.id);
    if (m.error) rej(new Error(m.error.message)); else res(m.result);
  } else if (m.method) {
    lyssnare.forEach((f) => f(m));
  }
};
function cdp(method, params = {}) {
  return new Promise((res, rej) => {
    const id = ++nastaId;
    vantar.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
function once(method, timeout = 20000) {
  return new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("timeout " + method)), timeout);
    const f = (m) => { if (m.method === method) { clearTimeout(t); lyssnare.splice(lyssnare.indexOf(f), 1); res(m.params); } };
    lyssnare.push(f);
  });
}
async function ev(uttryck) {
  const r = await cdp("Runtime.evaluate", { expression: uttryck, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error("JS-fel: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}
async function navigera(url) {
  const klar = once("Page.loadEventFired");
  await cdp("Page.navigate", { url });
  await klar;
  await sleep(400);
}
async function matt(w, h) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 });
  await sleep(250);
}
async function klicka(sel) {
  const rect = await ev(`(() => { const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height}; })()`);
  if (!rect) throw new Error("hittar inte " + sel);
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x, y: rect.y });
  await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 });
  await sleep(90);
  return rect;
}
const scroll = () => ev("({h:document.documentElement.scrollHeight-innerHeight,w:document.documentElement.scrollWidth-innerWidth})");

/* --- 1. Scroll i fyra storlekar: startskärm och spel --- */
await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Network.enable");
await cdp("Network.setCacheDisabled", { cacheDisabled: true });
const scrollRes = {};
for (const [w, h, namn] of [[1024, 768, "1024x768"], [768, 1024, "768x1024"], [390, 844, "390x844"], [1440, 900, "1440x900"]]) {
  await matt(w, h);
  await navigera(URL_ARG + "?size=" + namn);
  const fore = await scroll();
  await klicka("#spela");
  await sleep(700);
  const efter = await scroll();
  const utanfor = await ev(`(() => { const b=[...document.querySelectorAll('#spel button')]; return b.filter(e=>{const r=e.getBoundingClientRect(); return r.bottom>innerHeight+1||r.right>innerWidth+1||r.left<-1||r.top<-1;}).length; })()`);
  scrollRes[namn] = { start: fore, spel: efter, knappar_utanfor: utanfor };
}

/* --- 2. Spela: felsvar två gånger, stjärnor, hela vägen --- */
await matt(1024, 768);
await navigera(URL_ARG + "?play=1");
await klicka("#spela");
await sleep(1200);

const mp3 = await ev(`performance.getEntriesByType('resource').filter(e=>/\\/ljud\\/.*\\.mp3/.test(e.name)).map(e=>e.name.split('/').pop())`);
const mp3unika = [...new Set(mp3)];

const ordData = () => ev(`(() => { const it=__ordejakt.aktuell(__ordejakt.M); return {ord:it.ord, brickor:it.brickor, niva:__ordejakt.M.niva, i:__ordejakt.M.i}; })()`);

function felOrdning(brickor, ord) {
  const n = brickor.length;
  const alla = [...Array(n).keys()];
  const kandidater = [alla.slice().reverse()];
  for (let i = 0; i < n - 1; i++) { const k = alla.slice(); [k[i], k[i + 1]] = [k[i + 1], k[i]]; kandidater.push(k); }
  return kandidater.find((k) => k.map((i) => brickor[i]).join("") !== ord);
}
function rattOrdning(brickor, ord) {
  const kvar = [...Array(brickor.length).keys()];
  const ut = [];
  for (const ch of ord) {
    const p = kvar.findIndex((i) => brickor[i] === ch);
    ut.push(kvar.splice(p, 1)[0]);
  }
  return ut;
}
async function klickaBrickor(idx) {
  for (const i of idx) await klicka(`[data-bricka="${i}"]`);
}
const status = () => ev("document.getElementById('status').textContent");
const stjarnor = () => ev("document.getElementById('stjarnor').textContent.trim()");

/* ord 1: två felsvar, sedan rätt */
let it = await ordData();
const bevis = { ord1: it.ord, niva: it.niva, felsvar: [] };
for (let g = 0; g < 2; g++) {
  await klickaBrickor(felOrdning(it.brickor, it.ord));
  await sleep(350);
  bevis.felsvar.push({ status: await status(), stjarnor: await stjarnor(), placerade: await ev("__ordejakt.M.placerade.length") });
}
bevis.foreRatt = { status: await status(), stjarnor: await stjarnor() };
await klickaBrickor(rattOrdning(it.brickor, it.ord));
await sleep(300);
bevis.efterRatt = { status: await status(), stjarnor: await stjarnor() };
await sleep(1100);
bevis.ord1_stjarna = (await stjarnor());

/* ord 2–8: rätt på första */
for (let i = 1; i < 8; i++) {
  it = await ordData();
  await klickaBrickor(rattOrdning(it.brickor, it.ord));
  await sleep(1250);
}
const niva1 = {
  overlay: await ev("!document.getElementById('overlay').hidden"),
  titel: await ev("document.getElementById('ov-titel').textContent"),
  text: await ev("document.getElementById('ov-text').textContent"),
  stjarnor: await stjarnor(),
  chip: await ev("document.getElementById('ov-chip').textContent")
};
await klicka("#ov-nasta");
await sleep(900);
const niva2start = await ordData();

/* nivå 2: fyll två platser och ta kortbild i 1200×900 */
const k2 = rattOrdning(niva2start.brickor, niva2start.ord).slice(0, 2);
await klickaBrickor(k2);
await sleep(300);
const aktiva = await ev("({placerade:__ordejakt.M.placerade.length, slots:[...document.querySelectorAll('.slott.fylld')].map(e=>e.textContent).join('')})");
let skarmfil = null;
if (SHOT) {
  await matt(1200, 900);
  await sleep(500);
  const r = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  mkdirSync(SHOT.replace(/\/[^/]+$/, ""), { recursive: true });
  writeFileSync(SHOT, Buffer.from(r.data, "base64"));
  skarmfil = SHOT;
  await matt(1024, 768);
  await sleep(300);
}

/* spela klart nivå 2 och 3 */
async function spelaKlartNiva() {
  for (let i = 0; i < 8; i++) {
    const d = await ordData();
    // töm platserna först (kan vara delvis fyllda)
    const fyllda = await ev("__ordejakt.M.placerade.length");
    for (let j = 0; j < fyllda; j++) await klicka("[data-plats]");
    const ny = await ordData();
    await klickaBrickor(rattOrdning(ny.brickor, ny.ord));
    await sleep(1250);
  }
}
bevis.niva2_start = { ord: niva2start.ord, aktiva };
await spelaKlartNiva();
const efterNiva2 = {
  overlay: await ev("!document.getElementById('overlay').hidden"),
  titel: await ev("document.getElementById('ov-titel').textContent"),
  knapp: await ev("document.getElementById('ov-nasta').textContent"),
  stjarnor: await stjarnor()
};
await klicka("#ov-nasta");
await sleep(900);
const niva3start = await ordData();
await spelaKlartNiva();
const slut = {
  overlay: await ev("!document.getElementById('overlay').hidden"),
  titel: await ev("document.getElementById('ov-titel').textContent"),
  text: await ev("document.getElementById('ov-text').textContent"),
  chip: await ev("document.getElementById('ov-chip').textContent"),
  nastaDold: await ev("document.getElementById('ov-nasta').hidden"),
  igenSynlig: await ev("!document.getElementById('ov-igen').hidden"),
  stjarnor: await stjarnor(),
  statusBakom: await ev("document.getElementById('status').textContent")
};
await klicka("#ov-igen");
await sleep(900);
const efterIgen = {
  niva: await ev("__ordejakt.M.niva"),
  stjarnor: await stjarnor(),
  i: await ev("__ordejakt.M.i"),
  spelSynlig: await ev("!document.getElementById('spel').hidden")
};

/* Ladda om = återställning */
const klar2 = once("Page.loadEventFired");
await cdp("Page.reload", { ignoreCache: true });
await klar2;
await sleep(600);
const efterOmladdning = {
  startSynlig: await ev("!document.getElementById('startskarm').hidden"),
  spelDold: await ev("document.getElementById('spel').hidden"),
  spelaKnapp: await ev("!!document.getElementById('spela')")
};

const ut = {
  url: URL_ARG,
  scroll: scrollRes,
  mp3_antal: mp3unika.length,
  mp3_filer: mp3unika.slice(0, 12),
  bevis, niva1, niva2start: { ord: niva2start.ord, aktiva }, efterNiva2,
  niva3start: { ord: niva3start.ord }, slut, efterIgen, efterOmladdning,
  skarmfil
};
console.log(JSON.stringify(ut, null, 2));
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(ut, null, 2));

ws.close();
chrome.kill("SIGKILL");
process.exit(0);