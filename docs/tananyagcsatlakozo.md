# Egyszerűsített tananyagcsatlakozó, 1.0

## Mi készült el?

Ez a terv 4. ütemének implementációja: kis kötelező PACK-szerződés,
alapértelmezések, átmeneti adapter, ellenőrzés és bekötés a valódi shellbe.
Nem új terv és nem külön futó adatmodell-prototípus.

A frissen kapott keret és mindkét tananyag az alap. A helyi mentésedhez,
PIN-kezeléshez, lapátvételhez, jutalmazási táblákhoz, felhőszabályokhoz nem nyúltam.
A korábbi auditeltérés nem blokkolja a fejlesztést. Az átadott fájlok viszont a
most kapott verzióhoz készültek; újabb helyi szerkesztést nem írunk felül vakon.

## Telepítés: ajánlott az önálló Python-telepítő

Python 3.9+, Node.js 22+ és a három meglévő helyi repó szükséges. Nincs npm install.
A telepítő új könyvtárban három tesztmásolatot készít, beépíti a változtatásokat,
a keret saját másolóeszközével átviszi a közös fájlokat, majd futtatja a teszteket.
A forrásrepókhoz nem ír. A célmappa még ne létezzen.

```powershell
py tananyagcsatlakozo_telepito.py --keret "C:/munka/keretrendszer" --matek "C:/munka/Felveteli_matek" --helyesiras "C:/munka/Massalhangzok" --cel "C:/munka/tananyag-proba"
```

Az útvonalak példák. A kimenet:

```text
tananyag-proba/
  keretrendszer/     módosított keret és minta
  matek/            módosított matek, saját tananyagával
  helyesiras/       módosított helyesírás, saját tananyagával
  INSTALL_RESULT.json
```

Csak előzetes ellenőrzés, másolás nélkül: ugyanaz a parancs `--ellenorzes` kapcsolóval.
Az ellenőrzés a ténylegesen cserélendő fájlokat védi, nem a régi T01 hash-eltérést
vizsgálja. Ha azóta átírtad valamelyik cserélendő fájlt, megáll és megnevezi.
Ilyenkor a változtatást össze kell fésülni; nincs rejtett --force.

A .git és node_modules nem másolódik át. A másolatokban a képek és egyéb bináris
fájlok megmaradnak, mert a saját teljes repóidból készülnek. A Markdown-exportból
visszaállított forrásokban a korábban kimaradt bináris fájlok továbbra sincsenek.

## Kézi beillesztés az MD-ből

Az MD a felhasználó által küldött `forras-import.py` formátumát követi: `# út`,
üres sor, kódblokk. Új, üres mappába bontsd ki, NE közvetlenül a meglévő repókra.
A fájlutak keretrendszer/, matek/, helyesiras/ előtagot kapnak. Ez módosításcsomag,
nem teljes játék. A telepítő a legegyszerűbb, nem igényli a kézi importot.

A keretben új/módosított:
- js/core/pack-contract.js
- js/shell/index.js és js/shell/play.js
- js/pack/index.js: csak a szerződés és tananyag verziójának deklarációja
- examples/minimal-pack/index.js
- tests/pack-contract.test.mjs
- tools/tesztek.mjs, tools/pack-osszevetes.mjs
- keret.json: 1.9.0
- docs/tananyagcsatlakozo.md

Az appok js/pack/index.js fájljában csak szerződés/verzió deklaráció került be;
a helyesírásban a már meglévő tiles-tartalékág deklarációja is. A feladatok,
szóadatok, haladási logika és jutalmak változatlanok.
A matek sw.js listájába bekerült az új közös modul és új cache-verziót kapott.
Ez szükséges függőségfrissítés, nem a terv 6. ütemének teljes offline-frissítése.
A jelenlegi service-worker életciklust nem alakítottam át. Emiatt most elkülönített
tesztpéldányon próbáld; éles, futó kör közbeni automatikus frissítést nem igazoltam.

Kézi másolás után a KERET_VERZIO fájlt a keret saját eszköze generálja:

```powershell
cd C:/munka/tananyag-proba/keretrendszer
node tools/keret-masolas.mjs ../matek
node tools/keret-masolas.mjs ../helyesiras
```

A keretmásoló nem másolja az appok saját pack/index.js és sw.js fájlját;
ezeket a módosításcsomagból külön kell átvezetni. A Python-telepítő ezt is elvégzi.

## Az új kis szerződés

Kötelező PACK-mezők:

```javascript
export const PACK = {
  contractVersion: 1,
  version: '1.0.0',
  id: 'sajat-tananyag',
  topics: [{id:'tema',name:'Téma neve'}],
  makeTask(item,rng,user) {
    // Visszaadja a feladatot; az examples/minimal-pack teljes működő példa.
  }
};
```

A `contractVersion` az interfész verziója. A `version` a tananyagé; egyik sem
módosítja automatikusan a játékosmentés sémáját vagy a meglévő `schema` mezőt.
Régi, contractVersion nélküli PACK átmenetileg továbbra is használható.
Ismeretlen explicit szerződésverzió érthető fejlesztői hibát ad.

A feladat kötelező mezői:
- q: a feladat HTML-szövege (megbízható tananyagkód, nem külső felhasználói HTML)
- a felület: vagy egy felületleírás (`answer: { kind, … }`, 1.10.0), vagy `render(box,io)`
- az ellenőrzés: vagy `check(value)` → `{ok: boolean, feedback?: string}`, vagy egy megoldás
  (`solution`, illetve a felületleírás `correct` / `word` mezője), amelyhez a keret hasonlít
- correctText: a helyes válasz megjeleníthető szövege – megoldásnál elhagyható, abból készül

A saját felület vezérlőjéből csak a read kötelező (üres válasznál null). A markWrong,
markRight, lock, showCorrect, dispose és onKey elhagyható: ha hiányzik, a keret kihagyja,
ha hibát dob, a konzolra írja, és a kör folytatódik. A felület nem dönti el, milyen ékezet,
kisbetű vagy számformátum helyes: ezt a check, illetve a normalize / normalizeAnswer végzi.
A részleteket és a példákat a README „Közös válaszadó felületek és felületleírás” része írja le.

Élesítés előtt: `node tools/pack-ellenorzes.mjs ../app` (a `tools/tesztek.mjs` is futtatja).

Kész alapértelmezések: körtervezés a nyitott témákból, üres saját játékosadat,
változatlan normUser, no-op csomag-record, alap státusz/súgó/feliratok, üres
jelvények, metrikák, gyűjteményfülek és beállítások. A közös pontozást, napi célt,
naplót és jutalmazást továbbra is a shell meglévő motorja végzi.
Az alap státusz nem állít elsajátítást: 0 csillag és 1. szint, amíg nincs saját modell.

Minden meglévő opcionális hook megmarad, a this-kötés is. Az új tananyag nem kap
localStorage-kulcsot, és a példának nincs mentési vagy pontozási kódja.

## Témalezárás és tartalékág

A saját plan és review.plan sem adhat vissza lezárt/ismeretlen témát.
A tényleges feladat témáját a shell a megjelenítés előtt újra ellenőrzi.
A helyesírás régi működése bizonyos szavaknál betűkirakóra vált. Ezt nem töröltem:

```javascript
topicFallbacks: {hosszu:['tiles'],gap:['tiles'],jly:['tiles']}
```

Az új szerződésben csak deklarált tartalékág megengedett. A deklarált tartalékág
a szülői témalezárás ellenére is megjelenhet (így volt eddig is: a lezárás a
választható témákra vonatkozik). Nem deklarált, lezárt témájú feladatot a shell
nem indít el, és nem számol érte pontot.

## Hibakezelés és egyszeri rögzítés

A hibás feladatleírás és hibás checker-visszatérés pontozás előtt megáll.
A renderelt felület szerződését is ellenőrzi. A shell rövid hibajelzést ad;
a részletes PACK-azonosító és mező a konzolban szerepel.
Feladatonként egyszeri rögzítési kapu védi a közös pont- és jutalomelszámolást.
Ez nem adatbázis-tranzakció és nem helyettesíti a többeszközös munkamenetvédelmet.
A tananyaghookok továbbra is megbízható programkódok: az adapter nem sandbox,
és nem tud visszagörgetni egy hibás hook tetszőleges közvetlen állapotmódosítását.

## Tesztelés a saját gépeden

```powershell
cd C:/munka/tananyag-proba/keretrendszer
node tools/tesztek.mjs
node tools/tesztek.mjs ../matek
node tools/tesztek.mjs ../helyesiras
```

A runner minden tests/*.test.mjs fájlt külön folyamatban futtat, hiba esetén
nem ad PASS összesítést. A keret saját keret.test tesztje itt nem alkalmazható,
ezt a meglévő teszt saját maga jelzi; az appok keretellenőrzése ténylegesen fut.

Opcionális régi/új tananyag-összevetés:

```powershell
node tools/pack-osszevetes.mjs C:/munka/Felveteli_matek ../matek
```

Ez mesterséges, 9000 pontos játékost használ tárggyal és függő jutalommal;
nem olvas valódi böngészős vagy felhős gyerekadatot. A régi és új projekt
külön modulgráfban fut, mert a helyesírás körtervezője belső recent listát tart.
A véletlent és az időt csak a tesztben rögzíti. A játékban ezek nem változnak.

## Kézi játékpróba: még szükséges

Új localhost porton, tesztadattal: napi küldetés, szabad gyakorlás, ismétlő kör,
hibás válasz, tipp, magyarázat, ikerfeladat, beírás, lépésenkénti súgó, jutalom,
újratöltés és a saját speciális felületek. A minimális példa külön játékmásolatban
próbálható a js/pack/index.js helyére másolva. Ne cseréld vele a meglévő tananyagot.
A helyi mentésed, PIN és lapátvétel külön regresszióját is próbáld ki.

A másolatok megőrzik a Firebase-konfigurációt. Tesztkor ne jelentkezz be éles
családba. A többeszközös védelem és a biztonságos körvégi offline-frissítés továbbra
is nyitott ütem, ettől a csomagtól nem lesznek készek. Nincs új backend vagy migráció.

## Visszalépés

Az eredeti repók változatlanok. A tesztmásolat eldobható. Éles átvétel előtt
készíts saját forráscommitot és adatmentést. Az új csatlakozó nem változtatja meg
a tárolási sémát, de a teljes kiadási kapuhoz kézi próbák is kellenek.
