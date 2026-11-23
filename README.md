# Keretrendszer

Közös, paraméterezhető váz gyakorló játékokhoz. A váz egységes; játékonként csak a **feladatcsomag** (`js/pack`) és a **játék paraméterei** (`js/game`) térnek el.

Erre épül: **Matek Űrkaland** (felvételi felkészítő), **Helyesírás Kaland** (Massalhangzok), és ebből indul a **német gyakorló**. A repó maga is futtatható: egy minta szótanuló játék (der/die/das, szójelentés, begépelés), amely a német gyakorló kiindulópontja.

## Rétegek

| Mappa | Mi van benne | Hol szerkesztjük |
|---|---|---|
| `js/core/` | Játékfüggetlen keret: billentyűk, ablakok, fülek, beállításűrlap, fejlődés-adatok, diagram, **egységes pontozás** (`scoring.js`), **kétszintű napi cél** (`dailygoal.js`), válaszrögzítés (`answers.js`, a helyes alak egyezése is), jelvénymotor, ismétlés (`srs.js`), lépésenkénti súgó (`stephelp.js`), felhő (`cloud.js`: szinkronmódok, részleges mentés, összefésülés) és újrapróbálkozás (`retry.js`), eszköz és forgalom, tárgyak, események, hóesés | **csak itt** |
| `js/shell/` | A váz képernyői: kezdőlap (🩹 Ismétlő kör kártya), gyakorlókör (tipp → magyarázat → ✍️ beírás → ikerfeladat, 💡 lépésenkénti súgó), ⚙️ 6 fülös szülői ablak, 🎒 Gyűjtemény, ünnepek és adventi naptár, játékosok és eszközök, PIN, felhő-UI, súgó, napi nagy cél (serlegeső, ajándékdobozok, szorzó) | **csak itt** |
| `css/style.css` | A váz stílusa | **csak itt** |
| `index.html` | A váz HTML-sablonja (a szövegeket a váz tölti ki). **Nem másolódik**: minden app saját példányt tart (saját cím, leírás, ikon, kabala, a csomag stíluslapja), a minta változásait kézzel kell átvezetni. | itt a minta, appban a saját |
| `js/game/` | A játék paraméterei: `config.js` (GAME), ranglétra, tárgykatalógus, ünnepek, ajándékok, adatátállás, Firebase | játékonként |
| `js/pack/` | A feladatcsomag (PACK) | játékonként |
| `js/main.js` | `startShell({ game: GAME, pack: PACK })` | játékonként |

## Új játék (pl. német gyakorló)

1. Hozz létre egy új repót, és másold bele ennek a repónak a tartalmát (vagy indítsd a mintából).
2. Írd át a `js/game/config.js`-t: cím, `storeKey`, téma (`logo`, `mascot`, `pointsIcon`, `topicWord`, `texts`), `defaults`, Firebase.
3. Cseréld le a `js/pack/`-ot a saját feladataidra (a minta `js/pack/index.js` a szerződés minden mezőjét bemutatja).
4. Szabd testre a ranglétrát (`js/game/ranks.js`: a ranghatárok közösek, a nevek és tárgyak sajátok), a tárgyakat, az ünnepeket és az ajándékokat.
5. Futtasd: `python -m http.server`, majd `http://localhost:8000/#debug`.

## Ha a szerver nem érhető el

„Minden feladat után” és „Főmenübe lépéskor” módban, ha egy mentés vagy letöltés nem sikerül, lépcsőzetesen próbálkozik újra (`js/core/retry.js`): 3× 15 mp-enként → 3× percenként → 3× 5 percenként → utána 15 percenként, amíg az app nyitva van. Csak akkor, ha van várakozó adat, és csak előtérben (háttérbe kerüléskor kivár, előtérbe kerüléskor azonnal próbál). Közben a gyerek válaszai nem indítanak külön próbát, csak gyűlnek (📴 · N vár); a felhőjelző buborékja mutatja, mikor jön a következő próba. Azonnali próba, a lépcső előről: ha a böngésző jelzi, hogy visszajött a net (`online`), vagy a ☁️ ablakban „Mentés most” / „Újrakapcsolódás”. A naplóba csak a fordulópontok kerülnek (első hiba, lépcsőváltás, helyreállás). Folyamatos módban a Firebase saját újrakapcsolódása dolgozik. Tesztek: `tests/retry.test.mjs`, `tests/cloud.test.mjs`.

## Biztonságos helyi mentés

Mindig ez fut (ha a böngésző letiltja a tárolást, a régi egyszerű mentés). A mentés formátuma és kulcsa a régi. Részei (`js/core/local-save.js`, `js/core/tab-lease.js`, `js/shell/local-save-ui.js`):

- mentés előtt alapszerkezet-ellenőrzés, írás után visszaolvasás; az előző mentés megmarad (`<kulcs>__previous_v1`);
- írási hiba (pl. tele a tárhely): piros sáv, a legújabb állapot függőben marad, lépcsőzetes újrapróbálás – rendben működés közben nincs sáv;
- **egy aktív lap:** az újonnan megnyitott lap átveszi a mentést, a régi lezárul („A játék egy másik lapon fut · Átveszem itt”), és sem helyben, sem a felhőbe nem ír;
- **sérült mentés:** a játék nem indul el és semmit nem ír felül; a szülő (az előző mentés PIN-jével) visszaállíthat az előző mentésből vagy indulhat üresen (a felhős család újra letölti); a nyers eredeti megmarad (`<kulcs>__corrupt_v1`) és letölthető;
- a mentés letöltése (JSON) a ⚙️ → Felhő fülön, PIN mögött.

Korlát: a localStorage több lap között nem zárolható atomikusan – két, ugyanabban a pillanatban induló lap közül az utolsó nyer. Két eszköz között a felhőszinkron a megszokott módon fésül össze. Tesztek: `tests/local-save.test.mjs`.

## Egységes kinézet

A váz minden játékban ugyanúgy néz ki és működik; játékonként csak az tér el, aminek muszáj (téma, szövegek a `GAME.texts`-ben, ranglétra, tárgyak, feladatcsomag). Például: a felhőjelző és a Súgó gomb a felső sávban csak ikon (online kapcsolatnál 📡), a 🎒 Gyűjtemény ablaknak nincs külön címe, a tárgyak füle „Gyűjteményem”, a szinkronmód csak a ⚙️ Felhő fülön látszik, a kör végi gomb ragja a hangrend szerint igazodik („Vissza a főmenüre / térképre”).

## A feladatcsomag szerződése (PACK)

```js
{
  id, topics: [{ id, name, icon, color, place, sub }],           // a kezdőlap témakártyái
  levels: { count: 3, mode: "auto" | "manual" }, settings: [...],  // csomag-saját beállítások (leírók)
  newUser(), normUser(u),                                          // a gyerek csomag-saját mezői
  status(u, id) → { stars, level, label }, levelOf(u, id),
  plan(u, n, rng, nyitottTémák) → [{ topic, sub }],                 // a napi küldetés terve (témazárral)
  makeTask(item, rng, u) → Task, record(u, task, r) → { text?, confetti?, gather?: { key, n } } | null,
  gatherText?: { kulcs: db => szöveg },                              // a gather-események összesítve a kör végén (pl. „🃏 3 új szókártya”)
  speechText(html), badges: [...], metrics: { kulcs: { label, value(u) } },
  help(id), topicLabel(id), subLabel(id, sub), parentTopics(box, u), collectionTabs: [...], coming?: [...],
  retype?: true,                                                   // kér-e a csomag „írd le a helyes alakot” lépést
  stepHelp?: true,                                                 // kér-e lépésenkénti súgót (❓ / F1 feladat közben)
  review?: { count(u), plan(u, n, rng, nyitottTémák) → [{ topic, sub, … }], unit? } // 🩹 Ismétlő kör a hibás / esedékes feladatokból
}
```

**Task:** `{ topic, sub, level, meta, q, viz, render(box, io) → ui, check(v) → { ok, feedback }, hint, steps[], why(v), answerText(v), correctText, solution, speech, plainQ, retype?, helpSteps? }`

**💡 Lépésenkénti súgó:** ha a csomag `stepHelp: true`, feladat közben a ❓ / F1 a megoldás levezetésének (`task.steps`) következő lépését mutatja a jobb oldali sávban – a végeredményt (utolsó lépés) soha, egylépéses feladatnál a tippet. A csomag a feladatban megadhatja, pontosan mely lépéseket mutathatja a súgó (`task.helpSteps`, pl. kitakart eredménnyel vagy a megoldást felsoroló lépések nélkül; üres lista esetén a tipp jelenik meg). Minden lépés egy segítség (−3 pont, legalább 2 marad). A ❓ gombon a hátralévő lépések száma látszik. Témánként és gyerekenként (`u.stepHelp`, `js/core/stephelp.js`): ha két egymás utáni feladatban végignyomja az összes elérhető lépést, a következőtől eggyel kevesebb érhető el (legalább 1); 3 súgó nélküli feladat után eggyel több, 5 után minden visszajön. Gyerekenként kikapcsolható (⚙️ Beállítások), alapból be; a beállítás csak súgót kérő csomagnál látszik.

**✍️ A helyes alak beírása:** ha a csomag `retype: true`, és a feladat megadja a `retype` szöveget (pl. `"kassza"`), akkor már az első hibás válasznál (tipp-újrapróba nélkül) jön a magyarázat, utána középen felugrik egy beíró ablak; a továbblépő gomb csak a helyes beírás után aktív. Egyezés: betűre pontosan (ékezet, hosszú mássalhangzó), de a kis/nagybetű, a szélső szóköz és az Unicode-alak mindegy. +1 pont (`SCORING.retype`). Gyerekenként állítható (⚙️ Beállítások): kötelező (alap) / kihagyható / kikapcsolt; a beállítás csak beírást kérő csomagnál látszik. A mező fókusza azonnal, a koppintás kezelőjében kerül a helyére, így iPaden magától felugrik a billentyűzet. Esc: ki a körből a főmenübe.

**🩹 Ismétlő kör:** ha a csomag megadja a `review` objektumot, a kezdőlapon – csak ha `count(u) > 0` – megjelenik az „Ismétlő kör (N …)” kártya. A kör hossza a „Szabad gyakorlás egy körben” beállítás, legfeljebb `count(u)`; a tervet a `plan()` adja (a lezárt témák kihagyásával), a feladatokat a szokásos `makeTask()` készíti el (a tervelem tetszőleges mezőt vihet, pl. a matek a feladat magját). Ha a kör végén elfogytak az ismétlendők és minden elsőre jó volt: „Ügyes vagy, az összes hibát kijavítottad!”; különben összegzés és „Még egy ismétlő kör”.

**Napi küldetés:** aznap összesen `goalTasks` feladat (a már megoldottak beszámítanak) vagy `goalMin` perc; teljesítés után a „Még egy kör” is `goalTasks` feladatos.

**io** (a váz adja): `submit()`, `answering()`, `toast(üzenet)`, `useHelp()` (segítség → pontlevonás)

**ui** (a feladat felülete adja): `read()`, `auto` (a választás maga az ellenőrzés), `empty`, `markWrong()` (újrapróba előtt), `markRight()`, `lock()`, `showCorrect()`, `onKey(e)`

## Egységes pontozás (`js/core/scoring.js`)

Elsőre jó 10 (2. szinten +2, 3. szinten +5) · tipp után 5 · magyarázat után 2 · a helyes alak beírása +1 · sorozatbónusz +3 a 3. egymás utáni elsőre jótól · hibából tanulás +3 · segítség (pl. súgólépés) −3 (legalább 2). Rossz válaszért nincs levonás. A ranghatárok (0–9000) is közösek.

## A keret átvitele az appokba

A keretet **csak ebben a repóban** szerkesztjük. Változtatás után:

```bash
node tools/keret-masolas.mjs ../Felvételi_matek
node tools/keret-masolas.mjs ../Massalhangzok
```

A szkript átmásolja a `js/core`, `js/shell`, `css/style.css` és `tests/keret.test.mjs` fájlokat (az `index.html`-t nem), és megírja az app `KERET_VERZIO` fájlját (verzió, commit, ujjlenyomat). Az app `tests/keret.test.mjs` tesztje jelzi, ha valaki kézzel átírta a másolatot. Ellenőrzés másolás nélkül: `node tools/keret-masolas.mjs ../Massalhangzok --check`.

## Forrásfájlok exportja és visszaállítása

Egy repó összes követett szöveges fájlja egyetlen Markdown-fájlba (pl. e-mailhez, átnézéshez, AI-nak), mindegyik előtt az elérési úttal (`# js/main.js` + kódblokk), és vissza:

```bash
python tools/forras-export.py ../Massalhangzok ../Massalhangzok_forras.md "Helyesírás Kaland"
python tools/forras-import.py ../Massalhangzok_forras.md ../Massalhangzok_visszaallitva
```

A visszaállítás csak üres vagy új mappába ír (`--felulir`: meglévőbe is, `--proba`: csak kiírja, mit hozna létre), és nem ír a célmappán kívülre. A sorvégek LF-ek lesznek; a bináris fájlok (pl. képek) kimaradnak az exportból.

## Tesztek

```bash
node tests/alap.test.mjs     # pontozás, napi cél, ismétlés, események, szinkron, minta csomag, játékfüggetlenség
node tests/cloud.test.mjs    # két eszköz ál-Firebase-szel: részleges mentés, összefésülés, régi eszköz, törlés, szerverkiesés
node tests/retry.test.mjs    # az újrapróbálkozás lépcsője álidőzítővel
node tests/local-save.test.mjs  # biztonságos helyi mentés, sérült mentés, egy aktív lap
```

A `tests/keret.test.mjs` az appokban fut (a másolat érintetlenségét nézi); itt, a keret-repóban kihagyja az ellenőrzést.
