/* Ordejakt – sortera bokstäverna till ordet.
   Statisk app, inga beroenden. Tränar sambandet mellan ljud och bokstav
   (Sv, åk 1–3, Lgr22). Kärnan är ren kod: ordbank, blandning och en
   motor som verify.mjs kör utan DOM. Allt ritas med HTML/CSS, ljudet är
   färdiga mp3-filer i ljud/ med talsyntes som reserv. */
(function () {
  "use strict";

  /* ==== KÄRNA (ren kod – verify.mjs läser hit) ==== */

  /* Vanliga svenska vardagsord, inga namn. Fyra, fem och sex bokstäver. */
  var ORDBANK = {
    4: [
      { o: "boll", e: "⚽" }, { o: "katt", e: "🐱" }, { o: "hund", e: "🐶" },
      { o: "fisk", e: "🐟" }, { o: "häst", e: "🐴" }, { o: "myra", e: "🐜" },
      { o: "buss", e: "🚌" }, { o: "dörr", e: "🚪" }, { o: "hatt", e: "🎩" },
      { o: "moln", e: "☁️" }, { o: "regn", e: "🌧️" }, { o: "träd", e: "🌳" },
      { o: "gräs", e: "🌿" }, { o: "sten", e: "🪨" }, { o: "sand", e: "🏖️" },
      { o: "tält", e: "⛺" }, { o: "bröd", e: "🍞" }, { o: "kaka", e: "🍪" },
      { o: "kopp", e: "☕" }, { o: "sked", e: "🥄" }, { o: "kniv", e: "🔪" },
      { o: "stol", e: "🪑" }, { o: "bord", e: "🍽️" }, { o: "säng", e: "🛏️" }
    ],
    5: [
      { o: "fågel", e: "🐦" }, { o: "mjölk", e: "🥛" }, { o: "äpple", e: "🍎" },
      { o: "banan", e: "🍌" }, { o: "päron", e: "🍐" }, { o: "morot", e: "🥕" },
      { o: "gurka", e: "🥒" }, { o: "tårta", e: "🎂" }, { o: "glass", e: "🍦" },
      { o: "lampa", e: "💡" }, { o: "penna", e: "✏️" }, { o: "väska", e: "🎒" },
      { o: "byxor", e: "👖" }, { o: "tröja", e: "👕" }, { o: "jacka", e: "🧥" },
      { o: "mössa", e: "🧢" }, { o: "vante", e: "🧤" }, { o: "cykel", e: "🚲" },
      { o: "mamma", e: "👩" }, { o: "pappa", e: "👨" }, { o: "skola", e: "🏫" },
      { o: "kudde", e: "🛌" }, { o: "täcke", e: "🛏️" }, { o: "kvast", e: "🧹" }
    ],
    6: [
      { o: "klocka", e: "⏰" }, { o: "socker", e: "🍬" }, { o: "vatten", e: "💧" },
      { o: "gaffel", e: "🍴" }, { o: "nyckel", e: "🔑" }, { o: "papper", e: "📄" },
      { o: "linjal", e: "📏" }, { o: "stövel", e: "👢" }, { o: "kompis", e: "🧑‍🤝‍🧑" },
      { o: "syster", e: "👧" }, { o: "farmor", e: "👵" }, { o: "mormor", e: "👵" },
      { o: "moster", e: "👩" }, { o: "faster", e: "👩" }, { o: "spegel", e: "🪞" },
      { o: "trappa", e: "🪜" }, { o: "middag", e: "🍽️" }, { o: "morgon", e: "🌅" },
      { o: "sommar", e: "☀️" }, { o: "vinter", e: "❄️" }, { o: "pussel", e: "🧩" },
      { o: "sjunga", e: "🎤" }, { o: "fåtölj", e: "🛋️" }, { o: "blomma", e: "🌸" }
    ]
  };

  var NIVAR = [4, 5, 6];
  var RUNDA_LANGD = 8;

  function ordlista(niva) {
    var langd = NIVAR[(niva || 1) - 1];
    return ORDBANK[langd] || [];
  }

  /* Fisher–Yates. Math.random är utbytbart så verify.mjs kan seeda. */
  function blanda(a) {
    var i, j, t;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function olikaBokstaver(ord) {
    var s = {}, i;
    for (i = 0; i < ord.length; i++) s[ord.charAt(i)] = 1;
    return Object.keys(s).length;
  }

  /* Blandar bokstäverna så att de inte råkar stå i rätt ordning. */
  function blandaOrd(ord) {
    var b = ord.split(""), försök = 0;
    if (olikaBokstaver(ord) < 2) return b;
    do {
      blanda(b);
      försök++;
    } while (b.join("") === ord && försök < 80);
    return b;
  }

  /* 8 ord ur nivåns bank. undvik = ord som redan använts i nivån. */
  function gorRunda(niva, undvik) {
    var lista = ordlista(niva), valda = [], kvar = [], i, w;
    undvik = undvik || [];
    for (i = 0; i < lista.length; i++) {
      if (undvik.indexOf(lista[i].o) < 0) kvar.push(lista[i]);
    }
    if (kvar.length < RUNDA_LANGD) kvar = lista.slice();
    kvar = blanda(kvar.slice());
    for (i = 0; i < RUNDA_LANGD && i < kvar.length; i++) {
      w = kvar[i];
      valda.push({ ord: w.o, emoji: w.e, brickor: blandaOrd(w.o) });
    }
    return valda;
  }

  function nyMotor() {
    return {
      niva: 1, runda: [], i: 0, placerade: [], forsok: 0,
      stjarnor: 0, nivaStartStjarnor: 0, fas: "start", las: false,
      status: "", statusTyp: "", ratt: 0, fel: 0,
      anvanda: { 1: [], 2: [], 3: [] }
    };
  }

  function startaNiva(m, niva) {
    niva = niva === 2 || niva === 3 ? niva : 1;
    m.niva = niva;
    m.nivaStartStjarnor = m.stjarnor;
    m.runda = gorRunda(niva, m.anvanda[niva]);
    m.i = 0;
    m.placerade = [];
    m.forsok = 0;
    m.las = false;
    m.fas = "spel";
    m.status = "";
    m.statusTyp = "";
    return m;
  }

  function aktuell(m) { return m.runda[m.i] || null; }

  function svar(m) {
    var it = aktuell(m), s = "", i;
    if (!it) return "";
    for (i = 0; i < m.placerade.length; i++) s += it.brickor[m.placerade[i]];
    return s;
  }

  function arFull(m) {
    var it = aktuell(m);
    return !!it && m.placerade.length === it.ord.length;
  }

  /* Klick på bricka nummer idx: lägger bokstaven i nästa lediga plats. */
  function klicka(m, idx) {
    var it = aktuell(m);
    if (!it || m.fas !== "spel" || m.las) return false;
    if (idx < 0 || idx >= it.brickor.length) return false;
    if (m.placerade.indexOf(idx) >= 0) return false;
    if (m.placerade.length >= it.ord.length) return false;
    m.placerade.push(idx);
    if (m.statusTyp === "fel") { m.status = ""; m.statusTyp = ""; }
    return true;
  }

  /* Klick på en fylld plats: bokstaven går tillbaka till raden. */
  function taBort(m, plats) {
    if (!aktuell(m) || m.fas !== "spel" || m.las) return false;
    if (plats < 0 || plats >= m.placerade.length) return false;
    m.placerade.splice(plats, 1);
    return true;
  }

  /* Rättar när alla platser är fyllda. Fel kostar inget: bokstäverna
     läggs tillbaka och barnet kan sortera om hur många gånger som helst. */
  function lamna(m) {
    var it = aktuell(m), ratt, stjarna = false;
    if (!it || m.fas !== "spel" || m.las || !arFull(m)) return null;
    ratt = svar(m) === it.ord;
    if (ratt) {
      stjarna = m.forsok === 0;
      if (stjarna) m.stjarnor++;
      m.ratt++;
      m.las = true;
      m.status = "RÄTT";
      m.statusTyp = "ratt";
      return { ratt: true, stjarna: stjarna };
    }
    m.forsok++;
    m.fel++;
    m.placerade = [];
    m.status = "FEL";
    m.statusTyp = "fel";
    return { ratt: false, stjarna: false };
  }

  function nasta(m) {
    if (m.fas !== "spel") return "slut";
    if (m.i + 1 < m.runda.length) {
      m.i++;
      m.placerade = [];
      m.forsok = 0;
      m.las = false;
      m.status = "";
      m.statusTyp = "";
      return "nasta";
    }
    m.fas = "slut";
    m.las = false;
    return "slut";
  }

  function nastaNiva(m) {
    var n = m.niva + 1;
    if (n > 3) n = 3;
    return startaNiva(m, n);
  }

  function spelaIgen(m) {
    m.stjarnor = 0;
    m.ratt = 0;
    m.fel = 0;
    m.anvanda = { 1: [], 2: [], 3: [] };
    return startaNiva(m, 1);
  }

  /* Talad form av ett ord: "Boll." */
  function taltOrd(ord) {
    if (!ord) return "";
    return ord.charAt(0).toUpperCase() + ord.slice(1) + ".";
  }

  /* ==== SLUT PÅ KÄRNAN ==== */

  /* ---------------------------------------------------------------- *
   * Ljud: färdiga mp3-filer i ljud/ med talsyntes som reserv.        *
   * ---------------------------------------------------------------- */
  var ljudPa = true;
  var förladdade = [];

  function rostFil(text) {
    var R = window.__ROST || {};
    return R[text] ? "ljud/" + R[text] + ".mp3" : null;
  }

  /* Laddar rundans ordljud på en gång, så orden hörs direkt. */
  function förladdaRundan(runda) {
    förladdade = [];
    runda.forEach(function (it) {
      var fil = rostFil(taltOrd(it.ord));
      if (!fil) return;
      var a = new Audio();
      a.preload = "auto";
      a.src = fil;
      try { a.load(); } catch (e) { }
      förladdade.push(a);
    });
  }

  function spelaFil(text) {
    if (!ljudPa) return false;
    try {
      if (window.__rost && window.__rost(text, true)) return true;
    } catch (e) { }
    return false;
  }

  function sag(text) {
    if (!ljudPa || !text) return;
    if (spelaFil(text)) return;
    try {
      if (!("speechSynthesis" in window)) return;
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "sv-SE"; u.rate = 0.95; u.volume = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { }
  }

  function ton(frekvens, längd, typ) {
    if (!ljudPa) return;
    try {
      if (!window.AudioContext && !window.webkitAudioContext) return;
      var ac = ton.ac || (ton.ac = new (window.AudioContext || window.webkitAudioContext)());
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = typ || "sine";
      o.frequency.value = frekvens;
      g.gain.value = 0.001;
      o.connect(g); g.connect(ac.destination);
      var t = ac.currentTime;
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + längd);
      o.start(t); o.stop(t + längd + 0.02);
    } catch (e) { }
  }

  function spar(namn, varde) {
    try { if (window.skolappar && window.skolappar.event) window.skolappar.event(namn, varde); } catch (e) { }
  }

  /* ---------------------------------------------------------------- *
   * Spelläget i webbläsaren                                          *
   * ---------------------------------------------------------------- */
  var M = nyMotor();
  var timer = null;

  var elSlots = document.getElementById("slots");
  var elBrickor = document.getElementById("brickor");
  var elStatusRatt = document.getElementById("status");
  var elEmoji = document.getElementById("emoji");
  var elBild = document.getElementById("bild");
  var elEmojiText = document.getElementById("emoji-text");
  var elStjarnor = document.getElementById("stjarnor");
  var elPrickar = document.getElementById("prickar");
  var elNiva = document.getElementById("niva-chip");

  /* ---------------------------------------------------------------- *
   * Ritytan                                                          *
   * ---------------------------------------------------------------- */
  function ritaHud() {
    var s = "", i;
    for (i = 0; i < RUNDA_LANGD; i++) {
      s += "<i" + (i < M.i ? ' class="klar"' : (i === M.i ? ' class="nu"' : "")) + "></i>";
    }
    elPrickar.innerHTML = s;
    elStjarnor.textContent = "★ " + M.stjarnor;
    elNiva.textContent = "Nivå " + M.niva;
  }

  function ritaSlots() {
    var it = aktuell(M), s = "", i;
    if (!it) { elSlots.innerHTML = ""; return; }
    for (i = 0; i < it.ord.length; i++) {
      if (i < M.placerade.length) {
        s += '<button class="slott fylld" data-plats="' + i + '" aria-label="Ta bort ' +
          it.brickor[M.placerade[i]] + '">' + it.brickor[M.placerade[i]] + "</button>";
      } else {
        s += '<span class="slott" aria-hidden="true"></span>';
      }
    }
    elSlots.innerHTML = s;
    elSlots.classList.toggle("klar", M.statusTyp === "ratt");
  }

  function ritaBrickor() {
    var it = aktuell(M), s = "", i;
    if (!it) { elBrickor.innerHTML = ""; return; }
    for (i = 0; i < it.brickor.length; i++) {
      if (M.placerade.indexOf(i) >= 0) {
        s += '<span class="bricka-tom" aria-hidden="true"></span>';
      } else {
        s += '<button class="bricka" data-bricka="' + i + '" aria-label="Bokstaven ' +
          it.brickor[i] + '">' + it.brickor[i] + "</button>";
      }
    }
    elBrickor.innerHTML = s;
  }

  /* Bilden är en Twemoji-SVG; saknas filen visas emojiversionen i text. */
  function visaBild(it) {
    var fil = (window.__BILD || {})[it.emoji];
    if (fil) {
      elBild.src = fil;
      elBild.hidden = false;
      elEmojiText.hidden = true;
      elEmojiText.textContent = "";
      elEmoji.setAttribute("aria-label", "Ledtråd");
    } else {
      elBild.hidden = true;
      elBild.removeAttribute("src");
      elEmojiText.hidden = false;
      elEmojiText.textContent = it.emoji;
    }
  }

  function visaStatus(text, typ) {
    elStatusRatt.textContent = text;
    elStatusRatt.className = "status" + (typ ? " " + typ : "");
  }

  function nyttOrd() {
    var it = aktuell(M);
    if (!it) return;
    visaBild(it);
    visaStatus("Sortera bokstäverna till ordet.", "");
    ritaSlots();
    ritaBrickor();
    ritaHud();
    sag(taltOrd(it.ord));
  }

  /* ---------------------------------------------------------------- *
   * Spelflöde                                                        *
   * ---------------------------------------------------------------- */
  function starta() {
    clearTimeout(timer);
    M.stjarnor = 0;
    M.ratt = 0;
    M.fel = 0;
    M.anvanda = { 1: [], 2: [], 3: [] };
    startaNiva(M, 1);
    document.getElementById("startskarm").hidden = true;
    document.getElementById("overlay").hidden = true;
    document.getElementById("spel").hidden = false;
    förladdaRundan(M.runda);
    nyttOrd();
    spar("round_start", 1);
  }

  function nastaNivaKlick() {
    clearTimeout(timer);
    document.getElementById("overlay").hidden = true;
    nastaNiva(M);
    förladdaRundan(M.runda);
    nyttOrd();
    spar("round_start", M.niva);
  }

  function spelaIgenKlick() {
    clearTimeout(timer);
    document.getElementById("overlay").hidden = true;
    spelaIgen(M);
    förladdaRundan(M.runda);
    nyttOrd();
    spar("round_start", 1);
  }

  function efterRatt(res) {
    var it = aktuell(M), sista;
    visaStatus(res.stjarna ? "RÄTT! ★" : "RÄTT!", "ratt");
    visaBild(it);
    ritaSlots();
    ritaBrickor();
    ritaHud();
    if (res.stjarna) {
      elStjarnor.classList.remove("popp");
      void elStjarnor.offsetWidth;
      elStjarnor.classList.add("popp");
    }
    ton(660, 0.1, "sine");
    setTimeout(function () { ton(880, 0.14, "sine"); }, 110);
    sag("Rätt!");
    spar("level", M.niva);
    timer = setTimeout(function () {
      sista = nasta(M);
      if (sista === "slut") { visaOverlay(); return; }
      nyttOrd();
    }, 1000);
  }

  function efterFel() {
    visaStatus("FEL – prova igen", "fel");
    ritaSlots();
    ritaBrickor();
    elSlots.classList.remove("skaka");
    void elSlots.offsetWidth;
    elSlots.classList.add("skaka");
    ton(200, 0.14, "square");
    sag("Fel – prova igen.");
  }

  function kontrollera() {
    if (!arFull(M)) return;
    var res = lamna(M);
    if (!res) return;
    if (res.ratt) efterRatt(res);
    else efterFel();
  }

  function visaOverlay() {
    var niva = M.niva, fick = M.stjarnor - M.nivaStartStjarnor;
    var titel = document.getElementById("ov-titel");
    var text = document.getElementById("ov-text");
    var nastaKnapp = document.getElementById("ov-nasta");
    var igenKnapp = document.getElementById("ov-igen");
    var bild = document.getElementById("ov-bild");
    document.getElementById("overlay").hidden = false;
    visaStatus("SLUT – rundan är klar", "slut");
    document.getElementById("ov-chip").textContent = "SLUT";
    bild.textContent = "★".repeat(Math.max(1, Math.min(fick, 8)));
    if (niva === 1) {
      titel.textContent = "Nivå 1 klar";
      text.textContent = "Du klarade " + fick + " av 8 ord med stjärna på första försöket. Nu blir orden en bokstav längre.";
      nastaKnapp.hidden = false;
      nastaKnapp.textContent = "Nästa nivå";
      igenKnapp.hidden = true;
    } else if (niva === 2) {
      titel.textContent = "Nivå 2 klar";
      text.textContent = "Du klarade " + fick + " av 8 ord med stjärna på första försöket. Sista nivån har sex bokstäver.";
      nastaKnapp.hidden = false;
      nastaKnapp.textContent = "Sista nivån";
      igenKnapp.hidden = true;
    } else {
      titel.textContent = "Alla nivåer klara";
      text.textContent = "Du har sorterat 24 ord med fyra, fem och sex bokstäver, och fått " + M.stjarnor + " stjärnor. Spela igen för en ny blandning.";
      nastaKnapp.hidden = true;
      igenKnapp.hidden = false;
    }
    ton(523, 0.16, "sine");
    setTimeout(function () { ton(659, 0.16, "sine"); }, 130);
    setTimeout(function () { ton(784, 0.2, "sine"); }, 260);
    sag(niva === 3 ? "Alla nivåer klara." : "Nivå " + niva + " klar.");
    spar("round_done", M.stjarnor);
  }

  /* ---------------------------------------------------------------- *
   * Händelser                                                        *
   * ---------------------------------------------------------------- */
  function ritaLjudikon() {
    var el = document.getElementById("ljudikon");
    if (!el) return;
    el.innerHTML = '<path d="M4 9h3l4-3v12l-4-3H4z"/>' + (ljudPa
      ? '<path d="M15 8a5 5 0 0 1 0 8"/><path d="M18 5a9 9 0 0 1 0 14"/>'
      : '<path d="M16 9l5 6M21 9l-5 6"/>');
  }

  function bind() {
    document.getElementById("spela").addEventListener("click", function () {
      starta();
      try { if (ton.ac && ton.ac.state === "suspended") ton.ac.resume(); } catch (e) { }
    });

    /* Allt styrs med tryck/klick – inget dras. */
    elBrickor.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-bricka]") : null;
      if (!b) return;
      if (klicka(M, parseInt(b.getAttribute("data-bricka"), 10))) {
        ton(520, 0.05, "triangle");
        ritaSlots();
        ritaBrickor();
        kontrollera();
      }
    });

    elSlots.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-plats]") : null;
      if (!b) return;
      if (taBort(M, parseInt(b.getAttribute("data-plats"), 10))) {
        ton(300, 0.05, "sine");
        ritaSlots();
        ritaBrickor();
        if (M.statusTyp === "fel") visaStatus("Sortera bokstäverna till ordet.", "");
      }
    });

    document.getElementById("rensa").addEventListener("click", function () {
      while (M.placerade.length) taBort(M, M.placerade.length - 1);
      visaStatus("Sortera bokstäverna till ordet.", "");
      ritaSlots();
      ritaBrickor();
    });

    document.getElementById("lyssna").addEventListener("click", function () {
      var it = aktuell(M);
      if (it) sag(taltOrd(it.ord));
    });

    document.getElementById("ljud").addEventListener("click", function () {
      ljudPa = !ljudPa;
      if (!ljudPa) {
        try { window.speechSynthesis.cancel(); } catch (e) { }
        try { window.__rostStopp && window.__rostStopp(); } catch (e) { }
        spar("sound_off");
      }
      ritaLjudikon();
      this.setAttribute("aria-pressed", ljudPa ? "false" : "true");
    });

    document.getElementById("ov-nasta").addEventListener("click", nastaNivaKlick);
    document.getElementById("ov-igen").addEventListener("click", spelaIgenKlick);

    ritaLjudikon();
    ritaHud();

    window.addEventListener("keydown", function (e) {
      if (M.fas !== "spel" || document.getElementById("spel").hidden) return;
      var it = aktuell(M), i;
      if (!it) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        if (taBort(M, M.placerade.length - 1)) { ritaSlots(); ritaBrickor(); }
        return;
      }
      if (e.key === "Enter" && arFull(M)) { kontrollera(); return; }
      if (e.key >= "1" && e.key <= "6") {
        i = parseInt(e.key, 10) - 1;
        if (i < it.brickor.length && klicka(M, i)) {
          ritaSlots();
          ritaBrickor();
          kontrollera();
        }
      }
    });
  }

  /* Testkrok: hela motorn utan DOM. */
  window.__ordejakt = {
    M: M, ORDBANK: ORDBANK, starta: starta, kontrollera: kontrollera,
    klicka: klicka, taBort: taBort, lamna: lamna, nasta: nasta,
    nastaNiva: nastaNiva, spelaIgen: spelaIgen, gorRunda: gorRunda,
    aktuell: aktuell, svar: svar, taltOrd: taltOrd
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();