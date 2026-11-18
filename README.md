# Keretrendszer

Közös, paraméterezhető váz gyakorló játékokhoz. A váz egységes; játékonként csak a **feladatcsomag** (`js/pack`) és a **játék paraméterei** (`js/game`) térnek el.

Erre épül: **Matek Űrkaland** (felvételi felkészítő), **Helyesírás Kaland** (Massalhangzok), és ebből indul a **német gyakorló**. A repó maga is futtatható: egy minta szótanuló játék (der/die/das, szójelentés, begépelés), amely a német gyakorló kiindulópontja.

## Rétegek

| Mappa | Mi van benne | Hol szerkesztjük |
|---|---|---|
| `js/core/` | Játékfüggetlen keret: billentyűk, ablakok, fülek, beállításűrlap, fejlődés-adatok, diagram, **egységes pontozás** (`scoring.js`), **kétszintű napi cél** (`dailygoal.js`), válaszrögzítés, jelvénymotor, ismétlés (`srs.js`), felhő (`cloud.js`: szinkronmódok, részleges mentés, összefésülés), eszköz és forgalom, tárgyak, események, hóesés | **csak itt** |
| `js/shell/` | A váz képernyői: kezdőlap, gyakorlókör (tipp → magyarázat → ikerfeladat), ⚙️ 6 fülös szülői ablak, 🎒 Gyűjtemény, ünnepek és adventi naptár, játékosok és eszközök, PIN, felhő-UI, súgó, napi nagy cél (serlegeső, ajándékdobozok, szorzó) | **csak itt** |
| `css/style.css`, `index.html` | A váz stílusa és HTML-sablonja (a szövegeket a váz tölti ki) | **csak itt** |
| `js/game/` | A játék paraméterei: `config.js` (GAME), ranglétra, tárgykatalógus, ünnepek, ajándékok, adatátállás, Firebase | játékonként |
| `js/pack/` | A feladatcsomag (PACK) | játékonként |
| `js/main.js` | `startShell({ game: GAME, pack: PACK })` | játékonként |

## Új játék (pl. német gyakorló)

1. Hozz létre egy új repót, és másold bele ennek a repónak a tartalmát (vagy indítsd a mintából).
2. Írd át a `js/game/config.js`-t: cím, `storeKey`, téma (`logo`, `mascot`, `pointsIcon`, `topicWord`, `texts`), `defaults`, Firebase.
3. Cseréld le a `js/pack/`-ot a saját feladataidra (a minta `js/pack/index.js` a szerződés minden mezőjét bemutatja).
4. Szabd testre a ranglétrát (`js/game/ranks.js`: a ranghatárok közösek, a nevek és tárgyak sajátok), a tárgyakat, az ünnepeket és az ajándékokat.
5. Futtasd: `python -m http.server`, majd `http://localhost:8000/#debug`.

## Egységes kinézet

A váz minden játékban ugyanúgy néz ki és működik; játékonként csak az tér el, aminek muszáj (téma, szövegek a `GAME.texts`-ben, ranglétra, tárgyak, feladatcsomag). Például: a felhőjelző a felső sávban csak ikon (online kapcsolatnál 📡), a 🎒 Gyűjtemény ablaknak nincs külön címe, a tárgyak füle „Gyűjteményem”.

## A feladatcsomag szerződése (PACK)

```js
{
  id, topics: [{ id, name, icon, color, place, sub }],           // a kezdőlap témakártyái
  levels: { count: 3, mode: "auto" | "manual" }, settings: [...],  // csomag-saját beállítások (leírók)
  newUser(), normUser(u),                                          // a gyerek csomag-saját mezői
  status(u, id) → { stars, level, label }, levelOf(u, id),
  plan(u, n, rng, nyitottTémák) → [{ topic, sub }],                 // a napi küldetés terve (témazárral)
  makeTask(item, rng, u) → Task, record(u, task, r) → { text, confetti } | null,
  speechText(html), badges: [...], metrics: { kulcs: { label, value(u) } },
  help(id), topicLabel(id), subLabel(id, sub), parentTopics(box, u), collectionTabs: [...], coming?: [...],
  retype?: true                                                    // kér-e a csomag „írd le a helyes alakot” lépést
}
```

**Task:** `{ topic, sub, level, meta, q, viz, render(box, io) → ui, check(v) → { ok, feedback }, hint, steps[], why(v), answerText(v), correctText, solution, speech, plainQ, retype? }`

**✍️ A helyes alak beírása:** ha a csomag `retype: true`, és a feladat megadja a `retype` szöveget (pl. `"kassza"`), akkor hibás válasz és magyarázat után középen felugrik egy beíró ablak; a továbblépő gomb csak a helyes beírás után aktív. Egyezés: betűre pontosan (ékezet, hosszú mássalhangzó), de a kis/nagybetű, a szélső szóköz és az Unicode-alak mindegy. +1 pont (`SCORING.retype`). Gyerekenként állítható (⚙️ Beállítások): kötelező (alap) / kihagyható / kikapcsolt; a beállítás csak beírást kérő csomagnál látszik. A mező fókusza azonnal, a koppintás kezelőjében kerül a helyére, így iPaden magától felugrik a billentyűzet. Esc: ki a körből a főmenübe.

**io** (a váz adja): `submit()`, `answering()`, `toast(üzenet)`, `useHelp()` (segítség → pontlevonás)

**ui** (a feladat felülete adja): `read()`, `auto` (a választás maga az ellenőrzés), `empty`, `markWrong()` (újrapróba előtt), `markRight()`, `lock()`, `showCorrect()`, `onKey(e)`

## Egységes pontozás (`js/core/scoring.js`)

Elsőre jó 10 (2. szinten +2, 3. szinten +5) · tipp után 5 · magyarázat után 2 · sorozatbónusz +3 a 3. egymás utáni elsőre jótól · hibából tanulás +3 · segítség −3 (legalább 2). Rossz válaszért nincs levonás. A ranghatárok (0–9000) is közösek.

## A keret átvitele az appokba

A keretet **csak ebben a repóban** szerkesztjük. Változtatás után:

```bash
node tools/keret-masolas.mjs ../Felvételi_matek
node tools/keret-masolas.mjs ../Massalhangzok
```

A szkript átmásolja a `js/core`, `js/shell`, `css/style.css` és `tests/keret.test.mjs` fájlokat, és megírja az app `KERET_VERZIO` fájlját (verzió, commit, ujjlenyomat). Az app `tests/keret.test.mjs` tesztje jelzi, ha valaki kézzel átírta a másolatot. Ellenőrzés másolás nélkül: `node tools/keret-masolas.mjs ../Massalhangzok --check`.

## Tesztek

```bash
node tests/alap.test.mjs     # pontozás, napi cél, ismétlés, események, szinkron, minta csomag, játékfüggetlenség
node tests/cloud.test.mjs    # két eszköz ál-Firebase-szel: részleges mentés, összefésülés, régi eszköz, törlés
```
