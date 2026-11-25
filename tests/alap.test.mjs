// A közös keret és váz alaptesztje a minta csomaggal. Futtatás: node tests/alap.test.mjs
import { readFileSync, readdirSync } from "fs";
import { score, SCORING } from "../js/core/scoring.js";
import { missionProgress, completeMission, streakNow, addCorrect, bigProgress, setMult, multOf, giftPending, pickGift } from "../js/core/dailygoal.js";
import { recordAnswer, addBonus, retypeState } from "../js/core/answers.js";
import { srsStep, newItem } from "../js/core/srs.js";
import { setToday, keyToDay } from "../js/core/dates.js";
import { inRange, claimOnce } from "../js/core/events.js";
import { diff, merge, apply, stable } from "../js/core/syncdiff.js";
import { makeRng } from "../js/core/rng.js";
import { normalizePack } from "../js/core/pack-contract.js";
import { newUser, normUser } from "../js/shell/user.js";
import { settingsDefs } from "../js/shell/settings-defs.js";
import { shCap, shEnd, shState } from "../js/core/stephelp.js";
globalThis.document = { querySelector: () => null };
const { PACK } = await import("../js/pack/index.js");
const { GAME } = await import("../js/game/config.js");

let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };
const D = k => keyToDay(k);

// pontozás
ok(score({ r: 1, level: 1 }).pts === 10 && score({ r: 1, level: 3 }).pts === 15 && score({ r: 2 }).pts === 5 && score({ r: 0 }).pts === 2, "egységes pontozás: 10 / +5 a 3. szinten / 5 / 2");
ok(score({ r: 1, level: 1, combo: 3 }).pts === 13 && score({ r: 1, level: 1, helps: 9 }).pts === SCORING.helpMin, "sorozatbónusz és segítség-levonás");
// ✍️ a helyes alak beírása (hibás válasz után)
ok(SCORING.retype === 1 && score({ r: 0 }).pts + SCORING.retype === 3, "beírás: a magyarázat 2 pontja + 1 = 3");
ok(retypeState("kassza", "kassza") === "ok" && retypeState("  Kassza ", "kassza") === "ok" && retypeState("KASSZA", "kassza") === "ok", "beírás: kis/nagybetű és szélső szóköz mindegy");
ok(retypeState("folyó", "folyó") === "ok", "beírás: a szétbontott ékezet (iPad) is jó");
ok(retypeState("kas", "kassza") === "" && retypeState("kasa", "kassza") === "bad" && retypeState("kasza", "kassza") === "bad" && retypeState("folyo", "folyó") === "bad", "beírás: az ékezet és a hosszú mássalhangzó számít, eltérésnél piros");
{
  const u = newUser("B", "🦊", PACK); setToday(D("2026-11-16")); recordAnswer(u, { topic: "jelentes", r: 0, ms: 1000, pts: 2 }); addBonus(u, 1);
  ok(u.pts === 3 && u.days["2026-11-16"].pts === 3, "beírás: a +1 a pontba és a napi összesítőbe is bekerül");
  const has = P => settingsDefs(GAME, P).some(d => d.key === "retype");
  ok(!has({}) && has({ retype: true }) && settingsDefs(GAME, { retype: true }).find(d => d.key === "retype").default === "must", "beírás: a beállítás csak beírást kérő csomagnál látszik, alapból kötelező");
}
// 💡 lépésenkénti súgó
ok(shCap(4) === 3 && shCap(3) === 2 && shCap(2) === 1 && shCap(1) === 1 && shCap(0) === 1, "súgó: a végeredményt nem mutatja (n−1 lépés), legalább 1");
{
  const st = { cut: 0, full: 0, free: 0 };
  ok(shEnd(st, 3, 3) === null && shEnd(st, 3, 3) === "reduced" && st.cut === 1 && shCap(4, st) === 2, "súgó: két egymás utáni végignyomás → eggyel kevesebb lépés");
  shEnd(st, 2, 2); ok(shEnd(st, 0, 2) === null && st.full === 0, "súgó: súgó nélküli feladat megszakítja a végignyomás-sorozatot");
  shEnd(st, 2, 2); shEnd(st, 1, 2); ok(st.full === 0 && st.cut === 1, "súgó: részleges használat nem csökkent");
  shEnd(st, 2, 2); shEnd(st, 2, 2); shEnd(st, 1, 1); shEnd(st, 1, 1); ok(st.cut === 3 && shCap(4, st) === 1 && shCap(3, st) === 1, "súgó: legfeljebb 1 lépésig csökken");
  shEnd(st, 1, 1); shEnd(st, 1, 1); ok(st.cut === 3, "súgó: a csökkentésnek van alsó határa");
  ok(shEnd(st, 0, 1) === null && shEnd(st, 0, 1) === null && shEnd(st, 0, 1) === "back" && st.cut === 2, "súgó: 3 súgó nélküli feladat → visszajön egy lépés");
  ok(shEnd(st, 0, 1) === null && shEnd(st, 0, 1) === "all" && st.cut === 0, "súgó: 5 súgó nélküli feladat → visszajön minden");
  const s2 = { cut: 2, full: 0, free: 2 }; shEnd(s2, 1, 1); ok(s2.free === 0 && shEnd(s2, 0, 1) === null && shEnd(s2, 0, 1) === null && s2.cut === 2, "súgó: súgóhasználat újraindítja a számolást");
  const u = {}; shState(u, "T1").cut = 1; ok(u.stepHelp.T1.cut === 1 && shState(u, "T2").cut === 0, "súgó: témánként külön állapot");
  ok(settingsDefs(GAME, { stepHelp: true }).some(d => d.key === "stepHelp" && d.default === true) && !settingsDefs(GAME, {}).some(d => d.key === "stepHelp"), "súgó: a beállítás csak a súgót kérő csomagnál látszik, alapból be");
}
// napi küldetés, sorozat, nagy cél
{
  const u = newUser("A", "🦊", PACK), P = { goalTasks: 3, goalMin: 15 };
  setToday(D("2026-11-16")); for (let i = 0; i < 3; i++) recordAnswer(u, { topic: "jelentes", r: 1, ms: 1000, pts: 10 });
  ok(missionProgress(u, P).pct === 1 && completeMission(u).streak === 1, "küldetés → sorozat");
  setToday(D("2026-11-18")); ok(streakNow(u) === 1, "egy kihagyott nap: a heti pajzs véd");
  for (let i = 0; i < 9; i++) addCorrect(u, 10);
  ok(addCorrect(u, 10) && giftPending(u), "a napi nagy cél megvan → ajándék jár");
  pickGift(u, { id: "b", bonus: 3 }); setToday(D("2026-11-19")); setMult(u, 2); addCorrect(u, 10);
  ok(bigProgress(u, 10).have === 5 && multOf(u) === 2, "előleg + szorzó");
  setToday(null);
}
// ismétlés, események, részleges szinkron
{ const st = newItem(); srsStep(st, true, 10); srsStep(st, true, 11); ok(st.box === 1 && st.due === 14, "Leitner: esedékesen jó → 3 nap múlva"); }
ok(inRange("12-01", "01-06", D("2027-01-03")) && !inRange("2026-12-06", "2026-12-06", D("2026-12-07")), "eseménytartományok (évváltás is)");
{ const u = { owned: [], pts: 0 }; ok(claimOnce(u, { id: "x", kind: "once", from: "2026-12-06", to: "2026-12-06", when: "m", reward: [{ pts: 5 }] }, { m: true }, D("2026-12-06")) && u.pts === 5, "egyszeri esemény jutalma"); }
{
  const base = { a: 1, b: { x: 1 } }, d = diff({ a: 2, b: { x: 1, y: 2 } }, base);
  ok(stable(d) === stable({ a: 2, "b/y": 2 }) && stable(apply(base, d)) === stable({ a: 2, b: { x: 1, y: 2 } }), "részleges szinkron: diff és apply");
  ok(merge({ p: 1, q: 1 }, { p: 1, q: 5 }, { p: 3, q: 1 }, true).q === 5, "háromutas összefésülés: a másik eszköz változása is megmarad");
}
// a minta csomag megfelel a szerződésnek
{
  const rng = makeRng(3), u = PACK.normUser(newUser("B", "🦊", PACK)), NP = normalizePack(PACK); let bad = 0;
  PACK.topics.forEach(T => { for (let i = 0; i < 100; i++) { const t = NP.makeTask({ topic: T.id, sub: null }, rng, u); if (!t.check(t.solution).ok || t.check("@@@").ok || !t.hint || !t.steps.length || !t.meta) bad++; } });
  ok(!bad, "minta csomag: minden feladat elfogadja a jó választ, elutasítja a rosszat, van tipp és magyarázat");
  ok(PACK.plan(u, 6, rng, ["nevelo"]).every(p => p.topic === "nevelo"), "témazár a küldetéstervben");
  const need = ["topics", "newUser", "normUser", "status", "levelOf", "plan", "makeTask", "record", "badges", "metrics", "help", "topicLabel", "subLabel", "parentTopics", "collectionTabs"];
  ok(need.every(k => k in PACK), "a csomag minden kötelező mezője megvan");
  ok(normUser({ name: "C" }, PACK).words && settingsDefs(GAME, PACK).some(d => d.key === "level"), "felhasználó-alapséma és csomag-beállítások");
}
// a keret és a váz játékfüggetlen
{
  const FORBID = /bolyg|⛽|planet|Matek|matek|üzemanyag|helyesír|Helyesír|"T\d+"|\.\.\/pack\/|\.\.\/game\//;
  const bad = [];
  ["js/core", "js/shell"].forEach(dir => readdirSync(new URL("../" + dir, import.meta.url)).filter(f => f.endsWith(".js")).forEach(f => {
    readFileSync(new URL(`../${dir}/${f}`, import.meta.url), "utf8").split("\n").forEach((line, i) => { if (FORBID.test(line.replace(/\/\/.*$/, ""))) bad.push(`${dir}/${f}:${i + 1}`); });
  }));
  ok(!bad.length, "a js/core és js/shell nem hivatkozik konkrét játékra" + (bad.length ? ": " + bad.slice(0, 6).join(", ") : ""));
}

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
