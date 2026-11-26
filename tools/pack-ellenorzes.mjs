// ===== Tananyag-ellenőrző: egy app (vagy a minta) tananyagának gépi átvizsgálása élesítés előtt =====
// Használat (a keret-repó gyökeréből): node tools/pack-ellenorzes.mjs [app mappa] [--db 40]
// Minden témából és szintről sok feladatot készít rögzített kezdőértékkel, és ellenőrzi, hogy
//   – a csomag és a feladatok megfelelnek-e a szerződésnek (kötelező mezők, típusok, felületleírás),
//   – a feladat elfogadja-e a saját megoldását (solution), és elutasít-e egy biztosan rossz választ,
//   – a felület elkészül-e szimulált oldalon, van-e read(), és a többi felületi metódus nem dob-e hibát,
//   – az ikerfeladat („Próbáld ki egy hasonlóval!”) tényleg MÁSIK feladat-e, nem ugyanaz, mint az elrontott.
// Hiba esetén 1-es kilépési kóddal áll le (a tools/tesztek.mjs is futtatja). Böngészős próbát nem helyettesít.
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import { installFakeDom } from "./fake-dom.mjs";
const key = t => `${String(t.q ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}|${t.correctText}`;

const args = process.argv.slice(2), dbAt = args.indexOf("--db");
const N = dbAt >= 0 ? Math.max(1, +args[dbAt + 1] || 40) : 40;
const target = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--db");
const root = target ? resolve(target) : resolve(dirname(fileURLToPath(import.meta.url)), "..");
const imp = f => import(pathToFileURL(join(root, f)).href);
if (!existsSync(join(root, "js/pack/index.js"))) { console.log(`Nincs tananyag: ${root}`); process.exit(0); }

const dom = installFakeDom();
const consoleError = console.error, logged = [];
console.error = (...a) => logged.push(a.map(x => (x && x.message) || String(x)).join(" "));
const errors = new Map(), warnings = new Map();
const note = (map, key, example) => { const e = map.get(key) || { n: 0, example }; e.n++; map.set(key, e); };
const where = (task, item) => `${task?.topic || item.topic}${item.level ? "/" + item.level + ". szint" : ""}${task?.sub != null && task.sub !== "" ? " · " + String(task.sub).slice(0, 40) : ""}`;
const plain = h => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const WRONG = ["\u0000biztosan-rossz-válasz", -987654321];

let PACK, normalizePack, makeRng, newUser, normUser;
try {
  ({ PACK } = await imp("js/pack/index.js"));
  ({ normalizePack } = await imp("js/core/pack-contract.js"));
  ({ makeRng } = await imp("js/core/rng.js"));
  ({ newUser, normUser } = await imp("js/shell/user.js"));
} catch (e) { console.error = consoleError; console.log(`✗ A tananyag nem tölthető be: ${e.message}`); process.exit(1); }

let p;
try { p = normalizePack(PACK); }
catch (e) { console.error = consoleError; console.log(`✗ A csomag nem felel meg a szerződésnek: ${e.message}`); process.exit(1); }
const freshUser = () => { const u = normUser(newUser("Próba", "", p), p); u.prefs = u.prefs || {}; return u; };

let count = 0;
const twins = { n: {}, same: {} };
function inspect(item, seed) {
  const u = freshUser(), rng = makeRng(seed);
  let t;
  try { t = p.makeTask(item, rng, u); } catch (e) { note(errors, `makeTask hibát dob: ${e.message}`, where(null, item)); return; }
  count++;
  const at = where(t, item);
  if (!plain(t.q)) note(errors, "üres feladatszöveg (q)", at);
  if (!plain(t.correctText)) note(errors, "üres helyes válasz szöveg (correctText)", at);
  if (!plain(t.hint) || t.hint === "Gondold át még egyszer!") note(warnings, "nincs saját tipp (hint)", t.topic);
  if (t.solution === undefined) note(warnings, "nincs megoldás (solution): az ellenőrző nem próbálható ki gépileg", t.topic);
  else {
    try { if (!t.check(t.solution).ok) note(errors, "a feladat nem fogadja el a saját megoldását (solution)", at); }
    catch (e) { note(errors, `check(solution) hibát dob: ${e.message}`, at); }
    try { t.answerText(t.solution); } catch (e) { note(errors, `answerText hibát dob: ${e.message}`, at); }
  }
  for (const v of WRONG) { try { if (t.check(v).ok) note(errors, "egy biztosan rossz választ is elfogad", at); } catch { /* rossz típusú bevitel: a felület ilyet nem ad */ } }
  // ikerfeladat: ugyanaz-e, mint az eredeti?
  twins.n[t.topic] = (twins.n[t.topic] || 0) + 1;
  try {
    const it = p.twin(t, item, makeRng(seed + 7777), u), t2 = p.makeTask(it, makeRng(seed + 9999), u);
    if (key(t2) === key(t)) twins.same[t.topic] = (twins.same[t.topic] || 0) + 1;
  } catch (e) { note(errors, `ikerfeladat hibát dob: ${e.message}`, at); }
  // felület szimulált oldalon
  const box = dom.box(), ctl = new AbortController(), before = logged.length;
  const io = { submit() {}, answering: () => true, canFocus: () => false, signal: ctl.signal, focus() {}, toast() {}, useHelp() {} };
  let ui;
  try { ui = t.render(box, io); } catch (e) { note(errors, `a felület nem készül el: ${e.message}`, at); box.remove(); return; }
  try { const v = ui.read(); if (v != null && !(Array.isArray(v) && !v.length) && v !== "") note(warnings, "üres felületen is ad választ (read)", t.topic); }
  catch (e) { note(errors, `read() hibát dob: ${e.message}`, at); }
  const base = Object.getPrototypeOf(ui);
  for (const m of ["markWrong", "markRight", "lock", "showCorrect"]) if (typeof base[m] !== "function") note(warnings, `ui.${m} hiányzik (a keret kihagyja)`, t.topic);
  for (const m of ["markWrong", "showCorrect", "lock", "markRight", "dispose"]) ui[m]();
  try { ui.onKey(dom.key("1")); } catch { /* a keret elkapja */ }
  logged.slice(before).forEach(msg => note(errors, `felületi hiba: ${msg.slice(0, 160)}`, at));
  ctl.abort(); box.remove();
}

let seed = 1;
const levels = p.levels.count;
for (const T of p.topics) for (let level = 1; level <= levels; level++) for (let i = 0; i < N; i++) inspect({ topic: T.id, sub: null, level }, seed++);
// a csomag saját terve (a napi küldetés) – a lezárt témákat sem kerülheti meg
for (let i = 0; i < 5; i++) {
  const u = freshUser(), rng = makeRng(1000 + i);
  try { p.plan(u, 20, rng).forEach((item, k) => inspect(item, 5000 + i * 100 + k)); } catch (e) { note(errors, `plan hibát dob: ${e.message}`, "plan"); }
  const one = p.topics[i % p.topics.length].id;
  try { p.plan(u, 10, makeRng(i), [one]); } catch (e) { note(errors, `plan a lezárt témákat nem tartja be: ${e.message}`, "plan"); }
}
console.error = consoleError;
for (const [topic, same] of Object.entries(twins.same)) {
  const n = twins.n[topic], msg = `az ikerfeladat („Próbáld ki egy hasonlóval!”) ugyanaz, mint az elrontott feladat – adj meg PACK.twin-t`;
  if (same / n >= 0.5) note(errors, msg, `${topic}: ${same}/${n}`); else note(warnings, msg.replace(" – adj meg PACK.twin-t", " (néha)"), `${topic}: ${same}/${n}`);
}

const show = (map, mark) => [...map].sort((a, b) => b[1].n - a[1].n).forEach(([k, v]) => console.log(`  ${mark} ${k} (${v.n}×, pl. ${v.example})`));
console.log(`Tananyag-ellenőrzés: ${p.id} ${p.version}${p.legacy ? " (régi szerződés)" : ""} · ${p.topics.length} téma · ${levels} szint · ${count} feladat`);
show(errors, "✗"); show(warnings, "⚠");
console.log(errors.size ? `✗ HIBA: ${[...errors.values()].reduce((a, e) => a + e.n, 0)} hibás eset` : `✓ Rendben${warnings.size ? ` (${warnings.size} figyelmeztetés)` : ""}`);
process.exit(errors.size ? 1 : 0);
