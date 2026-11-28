// Ugyanaz a magyarázat ne jelenjen meg kétszer-háromszor (tipp = 1. lépés = „Miért?” = „Lehet, hogy itt csúszott el”)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { textKey, sameText, coveredBy, uniqueTexts } from "../js/core/dedupe.js";

// --- az összevetés: jelölés, emoji, írásjel, szóköz, kis-/nagybetű nem számít ---
assert.equal(textKey("📏 <b>Szabály:</b> az -ít végű  igékben&nbsp;hosszú í van."), "szabály az ít végű igékben hosszú í van");
assert.ok(sameText("📏 Szabály: <b>j</b> hang – ly", "Szabály: J hang ly!"));
assert.ok(!sameText("das Haus", "der Hund"));
assert.ok(!sameText("", ""), "üres szöveg nem ismétlés");
const RULE = "🧠 Meg kell jegyezni: a „vaj” szót j-vel írjuk.";
assert.ok(coveredBy(RULE, ["<i>Meg kell jegyezni:</i> a „vaj” szót j-vel írjuk"]));
assert.ok(coveredBy("Meg kell jegyezni: a „vaj” szót j-vel írjuk.", ["Kezdés. " + RULE + " Példa: vajas kenyér."]), "hosszú szöveg, ami egy lépésben benne van");
assert.ok(!coveredBy("7", ["3 + 4 = 7"]), "rövid szöveg (pl. egy szám) nem tűnik el csak azért, mert egy lépésben szerepel");
assert.ok(!coveredBy("das", ["das Haus = ház"]));
assert.ok(!coveredBy("Meg kell jegyezni: a „vaj” szót", ["Meg kell jegyezni: a „vajas” szót j-vel írjuk"]), "csak egész szavakra");
assert.ok(coveredBy("  ", ["bármi"]), "üres szöveget nem mutatunk");
assert.deepEqual(uniqueTexts([RULE, "<b>vaj</b>", "Meg kell jegyezni: a „vaj” szót j-vel írjuk", "vaj"]), [RULE, "<b>vaj</b>"]);
assert.deepEqual(uniqueTexts([RULE, "A helyes alak: vaj"], [RULE]), ["A helyes alak: vaj"]);
console.log("Ismétlés-szűrés: összevetés – rendben.");

// --- integráció: a gyakorlókör valódi kódja szimulált oldalon ---
import { installFakeDom } from "../tools/fake-dom.mjs";
import { normalizePack } from "../js/core/pack-contract.js";
import { makeRng } from "../js/core/rng.js";
import { GAME } from "../js/game/config.js";
import { newUser } from "../js/shell/user.js";
const { doc } = installFakeDom();
const create = doc.createElement;
doc.createElement = tag => { const e = create(tag); e.style.setProperty = () => {}; e.scrollIntoView = () => {};
  Object.defineProperty(e, "lastElementChild", { get() { return this.childNodes.at(-1); } }); return e; };
globalThis.window = {}; globalThis.scrollTo = () => {}; globalThis.matchMedia = () => ({ matches: true });
globalThis.setTimeout = () => 0;
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
for (const [, id] of html.matchAll(/\bid="([a-z][\w-]+)"/g)) {
  const e = doc.createElement("div"); e.id = id;
  if (id.startsWith("scr-")) e.className = "screen";
  e.classList[Symbol.iterator] = function* () { yield* this.list; };
  e.style.setProperty = (k, v) => { e.style[k] = v; };
  doc.body.append(e);
}
doc.documentElement = doc.body; doc.documentElement.style.setProperty = () => {};
const { C } = await import("../js/shell/ctx.js");
const { renderHome, show } = await import("../js/shell/home.js");
const { startFree, round, goHome } = await import("../js/shell/play.js");
const $ = id => doc.getElementById(id);
let io, input, WHY = RULE;
// a „vaj”-eset: tipp = szabály = 1. lépés = why()
const pack = normalizePack({ contractVersion: 1, version: "1", id: "ismetles", topics: [{ id: "a", name: "A" }],
  plan: (u, n) => Array.from({ length: n }, (_, i) => ({ topic: "a", sub: String(i) })),
  makeTask: item => ({ topic: "a", sub: item.sub ?? "0", level: 1, q: "Melyik a jó: vaj vagy valy?", correctText: "vaj", solution: "vaj",
    hint: RULE, rule: RULE, why: () => WHY, steps: [RULE, RULE, "A helyes alak: <b>vaj</b>"],
    render(box, api) { io = api; return { read: () => input }; } }),
  progressKey: t => `${t.topic}:${t.sub}`, record: () => null });
function start() {
  const child = newUser("Teszt", "T", pack);
  child.prefs = { goalTasks: 5, goalMin: 5, bigGoal: 1, events: false, gifts: false, freeTasks: 3, retype: "off" };
  C.state = { current: child.name, users: { [child.name]: child }, settings: {}, deleted: {} };
  Object.assign(C, { game: { ...GAME, ranks: { ...GAME.ranks, rankIndex: () => 0 } }, pack, rng: makeRng(5), defs: Object.entries(child.prefs).map(([key, v]) => ({ key, default: v, scope: "child" })),
    device: { kids: null }, cloud: { queue() {}, checkpoint() {} }, localSave: { active: true, save: () => true }, refreshAll: renderHome });
  show("scr-home"); renderHome(); startFree("a");
}
const times = () => { const t = textKey($("side-body").textContent), k = textKey(RULE); return t.split(k).length - 1; };
const submit = v => { input = v; io.submit(); };

// tipp → jó válasz: a „Miért?” sor nem ismétli a tippet, a „Megnézem a megoldást” sem
start();
submit("valy"); assert.equal(times(), 1, "a tipp egyszer");
submit("vaj"); assert.equal(round().res.at(-1), 2, "tipp után jó");
assert.equal($("side-body").querySelector(".fb-why"), null, "a „Miért?” ugyanaz, mint a tipp → elmarad");
const see = [...$("side-body").querySelectorAll("button")].find(b => /Megnézem a megoldást/.test(b.textContent));
assert.ok(see); see.click();
assert.equal(times(), 0, "a teljes megoldásban sem jön újra a tipp szövege");
assert.match($("side-body").textContent, /A helyes alak: vaj/);
goHome();

// elsőre jó: a „Miért?” megjelenik (nem volt előtte tipp)
start(); submit("vaj");
assert.ok($("side-body").querySelector(".fb-why"), "elsőre jó válasznál ott a „Miért?”"); assert.equal(times(), 1);
goHome();

// kétszer rossz → magyarázat: a szabály csak egyszer (a „Lehet, hogy itt csúszott el” sor és a dupla lépés elmarad)
start(); submit("valy"); submit("valy");
assert.doesNotMatch($("side-body").textContent, /Lehet, hogy itt csúszott el/);
assert.equal(times(), 1, "a magyarázat első lépése egyszer");
round().lockUntil = 0; io.submit();
assert.equal(times(), 1, "a második (azonos) lépés kimarad");
assert.match($("side-body").textContent, /A helyes alak: vaj/);
goHome();

// ha a why() más, mint a lépések, megmarad
WHY = "Valószínűleg a „valy” alakra gondoltál, de az nem létezik.";
start(); submit("valy"); submit("valy");
assert.match($("side-body").textContent, /Lehet, hogy itt csúszott el: Valószínűleg/);
goHome();
console.log("Ismétlés-szűrés: gyakorlókör – rendben.");
