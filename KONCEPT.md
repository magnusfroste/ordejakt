# Ordejakt – sortera bokstäverna till ordet

**Ett mål:** barnet hör ett ord, ser en bild och sätter bokstäverna i rätt
ordning – sambandet mellan ljud och bokstav, i praktiken.

**Målgrupp:** åk 1–3 (7–9 år). Den som kan bokstävernas ljud men ännu inte
läser flytande.

**Kärnmekanik (peka, inte dra):** ordets bokstäver ligger blandade i en rad
längst ned. Ett tryck på en bricka lägger bokstaven i nästa lediga plats i
ordet; ett tryck på en fylld plats skickar tillbaka bokstaven. När alla platser
är fyllda rättas svaret direkt. Rätt ord ger en stjärna om det gick på första
försöket. Fel kostar ingenting: bokstäverna går tillbaka och barnet kan sortera
om hur många gånger som helst.

**Nivåer:** 1) fyra bokstäver, 2) fem bokstäver, 3) sex bokstäver. Åtta ord per
runda, slumpat ur 24 ord per nivå (72 ord totalt) – varje runda blir en ny
blandning. Efter rundan: ”Nästa nivå”, och efter sista nivån ”Spela igen”.

**5-minuterssession:** 8 + 8 + 8 ord, stjärna per ord som blir rätt direkt,
stjärnräknare i hörnet, en bild per ord och ordet uppläst på svenska.

**Belöning barnet kan berätta om:** ”Jag fick sju stjärnor och klarade ordet
*fågel* på första försöket.”

**Vad barnet lär:** att lyssna efter ljuden i ett ord och koppla dem till
bokstävernas ordning – avkodning, inte gissning. Ord med dubbelbokstäver
(katt, mamma, pussel) tränar att samma bokstav kan behövas två gånger.

**Lgr22 (ordagrant, Skolverket):** Svenska, centralt innehåll åk 1–3:
”Gemensam och enskild läsning. Sambandet mellan ljud och bokstav. Strategier
för att avkoda, förstå och tolka ord, begrepp och texter.”

**Varför iPad:** allt ryms på en skärm, brickorna är i tumstorlek, ingen text
måste läsas (ordet läses upp), inget går att förlora och inget har en tid som
räknar ned.

**Ljud:** färdiga mp3-filer i `public/ljud/` (en per ord och en per fras) med
webbläsarens talsyntes som reserv. Ljudknappen stänger av både filer och tal.

## Testplan (mätbara krav)
1. `node verify.mjs`: 0 fel – ordbanken har ≥40 ord i 4/5/6 bokstäver, varje ord
   finns i en oberoende ordlista, blandningen är ett anagram, klickmappningen ger
   ordet (även dubbelbokstäver), en hel runda med två felsvar per ord ger FEL utan
   stjärna och utan att rundan stannar, felfri runda ger 8 stjärnor per nivå.
2. 0 px scroll (`scrollHeight-innerHeight`, `scrollWidth-innerWidth`) i 1024×768,
   768×1024, 390×844 och 1440×900, både startskärm och spel.
3. Minsta tryckyta ≥ 44 px; brickorna är större.
4. Hel runda spelad med riktiga musklick i headless Chromium: två felsvar, rätt
   svar utan stjärna, sju stjärnor på nivå 1, Nästa nivå, alla tre nivåerna,
   ”Spela igen” och omladdning som återställer.
5. Mp3-filer laddas efter Spela (performance entries under `ljud/`), och FEL/SLUT
   finns alltid som text även om ljudet är av.
6. Kortbild `public/kort.png` 1200×900, spelmoment ur nivå 2.