# Diversia Tag Blur

🇬🇧 [English](README.en.md)

> **GenAI-projekt.** Koden, dokumentationen och bilderna i det här repot är framtagna
> med generativ AI (Claude). Ingen korrekturläsning eller oberoende granskning har
> gjorts. Använd efter eget omdöme.

Ett webbläsartillägg för **Chrome, Firefox och Safari** som suddar ut bilder på
[diversia.social](https://diversia.social) som har taggar du väljer. Utsuddade bilder visar vilka taggar som matchade, och ett
klick visar bilden.

![Utsuddade miniatyrer i ett galleri och i sidopanelen](docs/exempel-utsuddning.png)

<sub>Demosida med påhittade bilder. Överlägget och texterna är tilläggets riktiga CSS.</sub>

## Innehåll

- [Installation](#installation)
  - [Chrome (och Edge, Brave…)](#chrome-och-edge-brave)
  - [Firefox](#firefox)
  - [Safari (Mac)](#safari-mac)
  - [Bygga själv](#bygga-själv)
- [Användning](#användning)
  - [1. Välj taggar](#1-välj-taggar)
  - [2. Surfa](#2-surfa)
- [Så fungerar det](#så-fungerar-det)
- [Bakgrundskontroller](#bakgrundskontroller)
- [Versionskontroll](#versionskontroll)
- [Integritet](#integritet)
- [Om det slutar fungera](#om-det-slutar-fungera)
- [Utveckling](#utveckling)
  - [Att det fungerar i tre webbläsare](#att-det-fungerar-i-tre-webbläsare)
- [Licens](#licens)

## Installation

Tillägget finns inte i någon webbläsarbutik, så du installerar det själv från en
zip-fil. Det tar ungefär en minut, och du behöver inte kunna något om kod.

> **Butikerna:** jag har i dagsläget ingen avsikt att publicera tillägget i Chrome
> Web Store, på addons.mozilla.org eller i App Store. Installera det enligt stegen
> nedan.

**1. Hämta filen.** Öppna [senaste versionen](https://github.com/JanJoh/Chrome-Diversia-Tagblur/releases/latest) och ladda ner den som passar
din webbläsare:

| Fil att ladda ner | För |
|---|---|
| `diversia-tagblur-chrome-*.zip` | Chrome, Edge, Brave, Opera, Vivaldi |
| `diversia-tagblur-firefox-*.zip` | Firefox 140 eller senare, på dator och Android |
| `diversia-tagblur-safari-*.zip` | Safari på macOS, iOS och iPadOS |

**2. Packa upp den.** Dubbelklicka på zip-filen. Du får en mapp — det är den som
webbläsaren ska läsa in, inte zip-filen.

**3. Läs in mappen.** Följ stegen för din webbläsare nedan.

### Chrome (och Edge, Brave…)

1. Öppna `chrome://extensions` i adressfältet.
2. Slå på **Utvecklarläge** uppe till höger.
3. Klicka på **Läs in uppackat** och välj mappen du packade upp.
4. Valfritt: fäst tillägget via pusselbitsikonen i verktygsfältet.

Tillägget blir kvar tills du tar bort det.

**Uppdatera:** ersätt mappen med den nya versionen och klicka på ladda om-pilen på
tilläggets kort i `chrome://extensions`.

### Firefox

Kräver Firefox 140 eller senare.

1. Öppna `about:debugging#/runtime/this-firefox`.
2. Klicka på **Läs in temporärt tillägg…** och välj filen `manifest.json` inuti
   mappen.

Det ligger kvar tills Firefox startas om, och måste läsas in igen efter det. Det är
Firefox som fungerar så med tillägg som inte kommer från deras butik.

**Behörigheter:** i Firefox bestämmer du själv över sidåtkomst. Om inget suddas ut
på Diversia klickar du på Tillägg (pusselbiten) och tillåter tillägget på den sajten.

### Safari (Mac)

Kräver Safari 26 eller senare.

1. Gå till Safari → Inställningar → **Utvecklare**. Syns den inte, slå först på
   *Visa funktioner för webbutvecklare* under Avancerat.
2. Klicka på **Lägg till temporärt tillägg…** och välj mappen du packade upp.

Det laddas ur när Safari avslutas, så lägg till det igen efter omstart.

**Behörigheter:** Safari ber dig tillåta tillägget per webbplats. Välj *Tillåt alltid
på den här webbplatsen* för Diversia.

**På iPhone och iPad** går det inte att läsa in ett tillägg för hand. Safari-tillägg
måste komma från App Store, vilket kräver Apple Developer Program — se
[Bygga själv](#bygga-själv) nedan.

### Bygga själv

Bara om du vill bygga från källkoden i stället för att hämta en färdig fil:

```bash
npm run build
```

Det skapar `dist/chrome`, `dist/firefox` och `dist/safari` att läsa in, plus en zip
per webbläsare. Roten i förrådet är också ett giltigt Chrome-tillägg, så den går att
läsa in direkt.

## Användning

### 1. Välj taggar

Klicka på tilläggets ikon. Panelen är på svenska som standard; byt med
**Språk / Language** uppe till höger.

<img src="docs/installningar-v4.png" alt="Inställningspanelen" width="384">

Tagglistan (kategorier och taggar, runt 240 stycken) är **inbyggd**, så den finns där
från första klicket. När du öppnar panelen och är inloggad på diversia uppdateras listan
från sajten i bakgrunden (högst en gång per dygn; **Uppdatera** tvingar fram det).

- **Sök** för att filtrera listan och **kryssa i** taggarna som ska suddas ut. Ikryssade
  taggar visas under *Valda* högst upp.
- **Andra taggar:** taggar som inte finns i listan, med namn (`Latex/gummi`) eller id
  (`k40`), en per rad. Id:t är det som står efter `?tag=` i en tagglänk.
- **Kontrollera miniatyrer i bakgrunden** (på som standard): hämtar taggarna för
  miniatyrer du ser. Läs [Bakgrundskontroller](#bakgrundskontroller) innan du bestämmer dig.
- **Sudda ut bilder tills de har kontrollerats** (på som standard): miniatyrer är
  utsuddade från början och visas när deras taggar är kända, så en taggad bild syns
  aldrig ens för ett ögonblick.
- **Oskärpa (px):** hur mycket bilden suddas.
- **Sök efter nya versioner** (på som standard): frågar GitHub en gång per dygn om det
  finns en nyare version, och visar i så fall en rad högst upp i panelen. Se
  [Versionskontroll](#versionskontroll).
- **Spara.** Öppna diversia-flikar uppdateras direkt.
- **Glöm kontrollerade bilder** tömmer cachen med kontrollerade bilder (se nedan).

### 2. Surfa

- Matchande bilder täcks av en oskärpa och en text:
  **Innehåller tag(s): Blod, Nållekar (klicka för att visa)**.
  Små miniatyrer (som i galleriets sidopanel) visar bara taggnamnen.
- **Klicka en gång** för att visa bilden, och en gång till för att öppna den som vanligt.
- Håll muspekaren över bilden för att se samma text som verktygstips.

## Så fungerar det

| Sida | Var taggarna hämtas |
|---|---|
| Enskild bild (`/pic/?bild=…`) | Läses direkt från sidan. |
| Galleri för en tagg du blockerat (`/pic/?tag=…`) | Alla miniatyrer har taggen, så alla suddas ut utan fler uppslag. |
| Flödet, andra gallerier, sidopanelen | Miniatyrerna saknar taggar. Tillägget hämtar varje bilds taggar i bakgrunden (se nedan). |

Resultaten sparas per bild i 30 dagar, så ett återbesök kostar ingenting. Bilder du
själv öppnar kontrolleras direkt från sidan utan extra anrop.

## Bakgrundskontroller

Översiktssidor (flödet, gallerier, sidopanelen) visar inte bildernas taggar, så tillägget
hämtar taggarna för de miniatyrer du ser från sajten i bakgrunden.

Att använda bakgrundskontroller sker **på egen risk**, och det kan strida mot sajtens regler.

> Stänger du av **Kontrollera miniatyrer i bakgrunden** görs inga anrop i bakgrunden,
> men då **kan alla foton på översiktssidor visas utsuddade**: okontrollerade miniatyrer
> förblir utsuddade (med *Sudda ut bilder tills de har kontrollerats* på), och bara bilder
> du själv öppnar kontrolleras. Stänger du även av den inställningen visas okontrollerade
> miniatyrer som vanligt, utan filtrering.

Profilbilden och sidhuvudets bild har inga taggar och suddas aldrig ut.

## Versionskontroll

Tillägget installeras uppackat och uppdaterar sig inte självt, så det frågar i stället
GitHub om det finns en nyare version. När du öppnar panelen, och senast dygnet innan,
hämtas den senaste utgåvans versionsnummer från
`https://api.github.com/repos/JanJoh/Chrome-Diversia-Tagblur/releases/latest`
och jämförs med den installerade versionen. Är den nyare visas en rad högst upp i
panelen med en länk till [Releases](https://github.com/JanJoh/Chrome-Diversia-Tagblur/releases);
annars syns ingenting. Misslyckas anropet står det ingenting om det, och nästa försök
sker tidigast ett dygn senare.

Anropet skickar inga kakor och inga egna huvuden, och innehåller inget om dig, dina
taggar eller vad du har tittat på — bara en förfrågan om det senaste versionsnumret.
GitHub ser förstås, som varje webbserver, din IP-adress. Stäng av **Sök efter nya
versioner** i panelen så görs anropet inte alls; då får du uppdatera manuellt genom att
titta på Releases-sidan.

## Integritet

- Allt stannar i din webbläsare. Inställningarna sparas i Chromes synkade lagring,
  cachen och tagglistan i lokal lagring.
- Tillägget körs bara på `diversia.social` och pratar bara med `diversia.social` — med
  ett undantag: en återkommande kontroll av om det finns en ny version, högst en gång
  per dygn, mot GitHubs API. Den kan stängas av, och ingenting om dig skickas med. Se
  [Versionskontroll](#versionskontroll).
- Ingen statistik. Inga andra externa anrop än versionskontrollen ovan.
- Sajtens skydd mot högerklick och nedladdning lämnas orört. Tillägget lägger bara en
  CSS-oskärpa över de element som visar bilder.

## Om det slutar fungera

Tillägget är beroende av hur diversias sidor är uppbyggda. Om sajten ändras är det här
ställena att titta på (`content.js`, `blur.css`):

| Vad | Selektor |
|---|---|
| Miniatyr | `a[href*="bild="]` med bakgrundsstil eller en `<img>` inuti |
| Huvudbild | den `img.picshadow` som *inte* ligger i en `bild=`-länk (sidopanelens miniatyrer har samma klass) |
| Taggar på en bildsida | `a[href*="/pic/?tag="]` i samma `.row` som huvudbilden |
| Hela tagglistan | `.gcats2 a[href*="tag="]` på gallerisidor |

Ärenden och pull requests är välkomna.

## Utveckling

Inget byggsteg för att köra koden: ändra filerna och ladda om tillägget i
`chrome://extensions`. Roten i förrådet är ett giltigt Chrome-tillägg.

```bash
npm run build   # dist/{chrome,firefox,safari} + en zip per webbläsare
npm test        # paketen är kompletta, och koden går att köra i alla tre
```

Testerna kräver inget annat än Node: de kontrollerar att varje paket innehåller
det manifestet hänvisar till, att manifesten har rätt form per webbläsare, och att
koden använder `browser`/`chrome`-skalet i stället för `chrome.*` direkt.

| Fil | Vad den gör |
|---|---|
| `content.js` | Hittar miniatyrer och huvudbilder, slår upp taggar och suddar |
| `blur.css` | Överlägget, taggetiketterna och hur en visad bild ser ut |
| `options.html`, `options.js` | Panelen: tagglista, egna taggar, oskärpa, språk, versionskontroll |
| `i18n.js` | Svenska och engelska strängar, delade av panelen och sidan |
| `tags.json` | Tagglistan som följer med, innan den uppdaterats från sajten |
| `scripts/build.mjs` | Manifest och paket per webbläsare |
| `test/build.test.mjs` | Att de tre paketen är kompletta och rätt formade |
| `test/shim.test.mjs` | Att inget anrop är Chrome-bara: inga callbacks till `storage`, ingen `lastError` |

### Att det fungerar i tre webbläsare

Koden använder bara API:er som Chrome, Firefox och Safari alla har, genom
`globalThis.browser || globalThis.chrome`. Anropen till `storage` är skrivna som
löften, eftersom `browser.storage` i Firefox och Safari struntar i en callback och
den då aldrig hade körts. Firefox-paketet linteras rent av Mozillas egen
`web-ext lint`.

**Firefox och Safari är byggda och paketerade men ännu inte provkörda i de
webbläsarna.** Det som är kontrollerat är paketens form och att inga Chrome-bara
anrop finns kvar.

## Licens

[MIT](LICENSE). Ej knutet till eller godkänt av diversia.social.
