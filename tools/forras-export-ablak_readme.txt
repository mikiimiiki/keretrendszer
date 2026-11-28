Elkészült az ablakos forrásexport: dupla kattintással indul, kiválasztod benne a mappá(ka)t, és egy gombbal kész az md fájl. Kipróbáltam és feltöltöttem (keretrendszer b74e268).

Indítás: dupla kattintás a C:\Doksik\AI\keretrendszer\tools\forras-export-ablak.pyw fájlra. Fekete konzolablak nem nyílik, csak maga a felület.

Használat:

Mappák: a „➕ Mappa hozzáadása…” gombbal választasz egyet vagy többet. A sorrendet a ▲ / ▼ gombokkal állíthatod.
Hová mentsem: a fájlnevet magától javasolja (például keretrendszer_Felvételi_matek_Massalhangzok_forras_20261128.md), de a „Tallózás…” gombbal máshová is mentheted.
Cím: nem kötelező.
📄 Exportálás: az ablak alján megjelenik az eredmény (fájlok száma, méret, kihagyott képek). A „📂 Megnyitás a mappában” gomb megmutatja a kész fájlt az Intézőben.

Az utoljára használt mappákat és a kimeneti fájlt megjegyzi, így legközelebb elég az Exportálás gombot megnyomni. Ha a kimeneti fájl már létezik, felülírás előtt rákérdez.

Amit tud még:

Több mappa egy fájlba, mint a legutóbbi teljes export. A fájlok a mappa nevével kezdődő utat kapnak, így a visszabontáskor mappánként szétválnak.
Sima, nem git-es mappa is exportálható. Ilyenkor minden fájl bekerül, kivéve a .git, node_modules, __pycache__ és reports mappákat. A képek és más bináris fájlok kimaradnak.
A parancssoros használat a régi formátumban is működik. Mellé jött a több mappás változat:
python tools/forras-export.py . ../Felvételi_matek ../Massalhangzok --ki ../Teljes_forras.md --cim "Gyakorló játékok"

Ellenőrzés:

Egy mappa: a kimenet ugyanolyan, mint eddig.
Három mappa: egy fájlba exportáltam, a forras-import.py-jal visszabontottam, és mind a 269 fájlt összevetettem. A tartalom egyezik; csak a Helyesírás words.js fájljának végén tér el egy sortörés, mint a korábbi exportoknál.
Sima mappa: a node_modules és a kép kimaradt.
Az ablak: programból végigkattintottam, és lefényképeztem. Rendben működött és jól nézett ki; a képernyőnagyításhoz is beállítottam, hogy ne legyen elmosódott.

Az ablakhoz nem kell semmit telepíteni: a Python beépített ablakkezelőjét (tkinter) használja.