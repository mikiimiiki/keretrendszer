import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installFakeDom } from "../tools/fake-dom.mjs";
import { learningKey, noteLearning, normLearning, improvementsIn, IMPROVED_TITLE, FEEDBACK_LIMIT } from "../js/core/learning-feedback.js";
import { createLocalSave } from "../js/core/local-save.js";
import { roomLayout, placeInRoom } from "../js/core/room.js";
import { merge } from "../js/core/syncdiff.js";
import { normalizePack } from "../js/core/pack-contract.js";
import { makeRng } from "../js/core/rng.js";
import { dateKey, dayNum } from "../js/core/dates.js";
import { bigProgress, giftPending, pickGift } from "../js/core/dailygoal.js";
import { GAME } from "../js/game/config.js";
import { newUser, normUser } from "../js/shell/user.js";

// --- 🌱 fejlődésjelzés: rövid ujjlenyomat, csomagszintű progressKey, napi számláló ---
const identity = { id: "teszt", version: "1" };
const task = { topic: "a", sub: "b", level: 1, q: "Melyik?", viz: "<svg>A</svg>", solution: 2, correctText: "2", identityParams: { x: 1, y: 2 } };
const k = learningKey(identity, task), u = { pts: 37, badges: ["old"] };
assert.match(k, /^[0-9a-z]{4,16}$/);
assert.equal(learningKey(identity, { ...task, identityParams: { y: 2, x: 1 } }), k);
for (const patch of [{ taskVersion: "2" }, { level: 2 }, { viz: "<svg>B</svg>" }, { identityParams: { x: 2, y: 2 } }, { topic: "other" }]) assert.notEqual(learningKey(identity, { ...task, ...patch }), k);
assert.equal(learningKey(identity, { q: "nincs azonosító" }), null);
const byWord = { id: "szo", progressKey: t => t.word };
assert.equal(learningKey(byWord, { word: "kassza", level: 1 }), learningKey(byWord, { word: "kassza", level: 3, q: "más" }));
assert.equal(learningKey({ id: "x", progressKey: () => null }, task), null);
assert.equal(learningKey({ id: "x", progressKey: () => { throw new Error("hiba"); } }, task), null);
assert.equal(noteLearning(u, k, 1, false), false);
assert.equal(noteLearning(u, k, 1, true), false);
assert.equal(noteLearning(u, k, 2, false), false);
assert.equal(noteLearning(u, learningKey(identity, { ...task, sub: "other" }), 1, false), false);
assert.equal(noteLearning(u, k, 1, false, 100), true);
assert.equal(noteLearning(u, k, 1, false, 100), false);
assert.equal(u.days[dateKey(100)].imp, 1); assert.equal(improvementsIn(u, 94, 100), 1); assert.equal(improvementsIn(u, 101, 107), 0);
assert.equal(u.pts, 37); assert.deepEqual(u.badges, ["old"]); assert.deepEqual(u.learningDifficulties, []);
for (let i = 0; i < 300; i++) noteLearning(u, learningKey(identity, { ...task, q: String(i) }), 0, false);
assert.equal(u.learningDifficulties.length, FEEDBACK_LIMIT);
assert.ok(JSON.stringify(u.learningDifficulties).length < 2000, "a felhőbe csak rövid ujjlenyomatok kerülnek");
assert.deepEqual(normLearning({ 0: "abc123", 1: "<nagyon hosszú nyers kulcs>", 2: 5, 3: "abc123" }), ["abc123"]);

const wardrobe = { owned: ["known", "second"], cosmetics: { bg: "known" } };
const canUse = id => wardrobe.owned.includes(id);
assert.equal(placeInRoom([], 1, "locked", canUse), null);
assert.equal(placeInRoom([], 3, "known", canUse), null);
const placed = placeInRoom([], 0, "known", canUse);
const moved = placeInRoom(placed, 1, "known", canUse);
assert.deepEqual(moved, ["", "known", ""]);
assert.deepEqual(placeInRoom(moved, 1, "", canUse), ["", "", ""]);
assert.deepEqual(roomLayout(JSON.parse(JSON.stringify(moved)), canUse), moved);
assert.deepEqual(roomLayout({0:"unknown",1:"known",2:"known"}, canUse), moved);
assert.deepEqual(merge({room: placed}, {room: moved}, {room: placed}).room, moved);
assert.deepEqual(wardrobe, { owned: ["known", "second"], cosmetics: { bg: "known" } });
assert.deepEqual(normUser({name:"Régi", pts:37, badges:["old"], room:{0:"unknown",1:"known",2:"known"}}, null).room, ["unknown","known",""]);

// Integráció: a kezdőlap valódi gombjai, a közös rögzítő és a napi célok, szimulált DOM-mal.
const { doc } = installFakeDom();
const create = doc.createElement;
doc.createElement = tag => { const e = create(tag); e.style.setProperty = () => {}; return e; };
globalThis.window = {};
globalThis.scrollTo = () => {};
globalThis.matchMedia = () => ({ matches: true });
const scheduled = globalThis.setTimeout;
globalThis.setTimeout = () => 0;  // az animációs és automatikus továbblépési időzítők itt nem futnak
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
for (const [, id] of html.matchAll(/\bid="([a-z][\w-]+)"/g)) {
  const e = doc.createElement("div"); e.id = id;
  if (id.startsWith("scr-")) e.className = "screen";
  e.classList[Symbol.iterator] = function* () { yield* this.list; };
  e.style.setProperty = (k, v) => { e.style[k] = v; };
  doc.body.append(e);
}
doc.documentElement = doc.body;
doc.documentElement.style.setProperty = () => {};
const { C, itemIcon } = await import("../js/shell/ctx.js");
const { renderHome, show } = await import("../js/shell/home.js");
const { startMission, startReview, startFree, round, goHome, resumeInfo } = await import("../js/shell/play.js");
const { weakTopic } = await import("../js/shell/home.js");
const { roomTab } = await import("../js/shell/room-ui.js");
const { histAdd } = await import("../js/core/progress.js");
let io, input;
const pack = normalizePack({ contractVersion:1, version:"1", id:"test", topics:[{id:"a",name:"A"},{id:"b",name:"B"}], topicFallbacks:{ a:["b"] },
  plan: (u,n,rng,allowed) => Array.from({length:n}, (_, i) => ({topic:allowed[0],sub:u.fallback ? "fallback" : String(i + 1)})),
  makeTask: item => ({ topic:item.sub === "fallback" ? "b" : item.topic, sub:item.sub ?? "1", level:1, q:"Mennyi?", correctText:"2", solution:2,
    render(box, api) { io=api; return {read:() => input}; } }),
  progressKey: t => `${t.topic}:${t.sub}`,
  review: { unit: "hiba", count: (u, a) => u.due ? (a?.includes("a") === false ? 0 : 1) : 0, plan: () => [{topic:"a",sub:"1"}] },
  record: u => { u.nRecorded = (u.nRecorded ?? 0) + 1; },
});
function profile(blocked = []) {
  const child = newUser("Teszt", "T", pack); child.block = {topics:blocked};
  child.prefs = { goalTasks:1, goalMin:5, bigGoal:1, events:false, gifts:false, freeTasks:3 };
  const old = GAME.ranks;
  const ranks = { ...old, rankIndex: () => 0 };
  C.state = { current:child.name, users:{[child.name]:child}, settings:{}, deleted:{} };
  Object.assign(C, { game:{...GAME,ranks}, pack, rng:makeRng(112), defs:Object.entries(child.prefs).map(([key,v])=>({key,default:v,scope:"child"})),
    device:{kids:null}, cloud:{queue(){},checkpoint(){}}, localSave:{active:true, save:()=>true}, refreshAll:renderHome });
  show("scr-home"); renderHome(); return child;
}
const $ = id => doc.getElementById(id);
const offer = cls => $("home-offers").querySelector(cls);
function submit(v) { input=v; io.submit(); }
function scored(child) {
  return { pts:child.pts, n:child.total, ok:child.correct, days:child.days[dateKey(dayNum())].n,
    done:child.days[dateKey(dayNum())].done, streak:child.streak.n, big:bigProgress(child, 1).have, gift:giftPending(child), recorded:child.nRecorded, badges:child.badges };
}
// alapállapot: nincs mit ajánlani → a kártya rejtve, a napi küldetés a megszokott helyén
let child = profile();
assert.equal($("home-offers").hidden, true); assert.equal(offer(".offer-mission"), null);
startMission(); assert.equal(round().mode,"mission"); submit(2); io.submit();
const standard = scored(child); assert.equal(standard.n,1); assert.equal(standard.big,1); assert.equal(standard.streak,1); goHome();
assert.equal(child.resume, null, "befejezett kör után nincs folytatás");
// javító küldetés: csak ha van mit javítani a nyitott témákban; ugyanúgy számol, mint a régi ismétlő kör
child = profile(); child.due = true; renderHome(); assert.ok(offer(".offer-review")); assert.match(offer(".offer-review").textContent, /1 hiba vár/);
assert.equal($("map").querySelector(".tcard.review"), null, "a régi ismétlő kártya helyett az ajánlat van");
offer(".offer-review").click(); assert.equal(round().mode,"review"); submit(2); io.submit(); assert.equal(child.nRecorded,1); goHome();
child = profile(); child.due = true; renderHome(); startReview(); submit(2); const reviewStandard = scored(child); goHome();
child = profile(); child.due = true; renderHome(); offer(".offer-review").click(); submit(2); assert.deepEqual(scored(child), reviewStandard); goHome();
child = profile(["a"]); child.due = true; renderHome(); assert.equal(offer(".offer-review"),null);
// a betűkirakós tartalék (deklarált tartalékág) a lezárás ellenére is jöhet – mindenhol ugyanúgy
child = profile(["b"]); child.fallback = true; startMission(); assert.equal(round().task.topic,"b"); goHome();
child = profile(["a","b"]); startMission(); assert.equal(round(),null);
// 🎯 gyenge téma: ha nincs mit javítani, a leggyengébb nyitott téma
child = profile(); const today = dayNum();
for (let i = 0; i < 8; i++) { histAdd(child, "a", i < 6, 1000, today); histAdd(child, "b", i < 3, 1000, today); }
assert.equal(weakTopic(child, ["a","b"]).t.id, "b"); assert.equal(weakTopic(child, ["a"]).t.id, "a"); assert.equal(weakTopic(child, []), null);
renderHome(); assert.ok(offer(".offer-weak")); assert.match(offer(".offer-weak").textContent, /B/);
offer(".offer-weak").click(); assert.equal(round().mode, "free"); assert.equal(round().topic, "b"); goHome();
child.due = true; renderHome(); assert.equal(offer(".offer-weak"), null, "javítandónál a javító ajánlat jön");
// sorrend: az ajánlat a küldetés alatt, teljesített küldetés után fölötte
child = profile(); child.due = true; renderHome();
const order = () => [...doc.body.childNodes].map(n => n.id).filter(x => x === "mission" || x === "home-offers");
assert.deepEqual(order(), ["mission", "home-offers"]);
startMission(); submit(2); goHome(); assert.deepEqual(order(), ["home-offers", "mission"]);
// ▶ félbehagyott kör folytatása: ugyanott folytatódik, a megoldott feladat nem számolódik újra
child = profile(); startFree("a"); submit(2); io.submit();
assert.equal(round().idx, 1); goHome();
assert.deepEqual(resumeInfo(child), { done: 1, total: 3, title: round() ? "" : child.resume.title });
renderHome(); assert.ok(offer(".offer-resume")); assert.match(offer(".offer-resume").textContent, /1\/3/);
const n0 = child.total; offer(".offer-resume").click();
assert.equal(round().mode, "free"); assert.equal(round().idx, 1); assert.deepEqual(round().res, [1]); assert.equal(child.total, n0);
const next = () => { round().lockUntil = 0; io.submit(); };
submit(2); next(); submit(2); assert.equal(child.resume, null, "a kör végén a folytatás törlődik");
child.resume = { ...JSON.parse(JSON.stringify({ v:1, day: dayNum() - 1, pack: "test@1", mode:"free", topic:"a", title:"x", idx:1, res:[1], plan:[{topic:"a"},{topic:"a"}] })) };
assert.equal(resumeInfo(child), null, "tegnapi kör nem folytatható");
assert.deepEqual(normUser({ name:"R", resume: { v:1, plan:{0:{topic:"a"}}, res:{0:1} } }, null).resume.plan, [{topic:"a"}]);
goHome();
// 🌱 fejlődésjelzés: a dicséret helyén, pont és jelvény nélkül
child = profile(); startMission(); io.useLearningAid(); submit(2);
assert.notEqual($("side-body").querySelector(".fb-title")?.textContent, IMPROVED_TITLE);
const before = child.pts, previousBadges = [...child.badges]; goHome(); startMission(); submit(2);
assert.match($("side-body").innerHTML, /Fejlődtél/); assert.equal(child.pts-before, standard.pts);
assert.deepEqual(child.badges, previousBadges); assert.equal(improvementsIn(child, dayNum() - 6), 1); goHome();
// 🏠 Saját sarkom: kis sor a kezdőlapon, koppintós fül a Gyűjteményben
const id = GAME.ranks.rankItems(child.pts).find(id => GAME.catalog.itemById(id));
child.owned = [id]; renderHome(); assert.equal($("home-room").hidden, true);
assert.ok($("hero-corner").contains($("mascot")), "a kabala a sarok közepén"); assert.ok($("hero-ped").querySelector(".hc-hint"), "üres sarok: díszítő tipp");
const mem = new Map(), storage = { getItem:k=>mem.get(k) ?? null, setItem:(k,v)=>mem.set(k,v) };
const installed = createLocalSave({key:"room-test",storage});
C.localSave = {active:true, save:installed.save};
const equipBefore = child.cosmetics;
const tab = doc.createElement("div"); doc.body.append(tab);
const ctx = { redraw: () => { tab.replaceChildren(); roomTab(tab, ctx); } }; ctx.redraw();
const item = () => [...tab.querySelectorAll(".room-item")].find(b => b.title.startsWith(GAME.catalog.itemById(id).label));
const slot = i => tab.querySelectorAll(".room-slot")[i];
item().click(); slot(0).click(); assert.equal(child.room[0], id);
slot(2).click(); item().click(); assert.deepEqual(child.room, ["","",id], "áthelyezés: hely → tárgy");
const reloaded = createLocalSave({key:"room-test",storage}).load();
assert.ok(reloaded.ok); assert.deepEqual(normUser(reloaded.state.users.Teszt, pack).room,["","",id]);
renderHome(); assert.equal($("hero-corner").querySelector(".hc-right").textContent, itemIcon(id), "a jobb polcon a kitett figura");
startFree("a"); assert.match($("side-body").innerHTML, new RegExp(itemIcon(id)), "játék közben a figura a jobb oldali mezőben"); goHome();
tab.querySelector(".room-off").click(); assert.deepEqual(child.room,["","",""]);
assert.equal(child.cosmetics, equipBefore);
globalThis.setTimeout = scheduled;
console.log("Játékos bővítések: egység- és közös felületi integrációs tesztek rendben.");
