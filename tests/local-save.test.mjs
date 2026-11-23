// Biztonságos helyi mentés és egy aktív lap – ál-tárolóval. Futtatás: node tests/local-save.test.mjs
import { createLocalSave, validateState, parseStored, PREV, BAD } from "../js/core/local-save.js";
import { createTabLease } from "../js/core/tab-lease.js";

let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };
// localStorage-szerű ál-tároló; full: ennyi karakter fölött kvótahiba
function mem(init = {}, full = Infinity) {
  const m = new Map(Object.entries(init));
  return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { const size = [...m].reduce((a, [kk, vv]) => a + (kk === k ? 0 : vv.length), 0) + String(v).length; if (size > full) throw new Error("QuotaExceededError"); m.set(k, String(v)); }, removeItem: k => m.delete(k) };
}
const fakeTimers = () => { const q = []; return { q, schedule: (f, ms) => { q.push({ f, ms }); return q.length; }, cancel: () => {}, run: () => { const x = q.shift(); if (x) x.f(); return x; } }; };
const S = (pts = 10) => ({ familyCode: "", current: "Anna", users: { Anna: { name: "Anna", pts } }, settings: {}, deleted: {} });
const K = "jatek_v1";

// --- alapok
ok(parseStored(null).ok && parseStored(null).empty, "üres tároló: üres kezdőállapot");
ok(!parseStored("{nem json").ok && !parseStored('{"users":[]}').ok && !parseStored('{"users":{"A":{"pts":-1}}}').ok, "hibás JSON, hibás szerkezet, negatív pont: elutasítva");
let thrown = false; try { validateState({ users: {}, current: 5 }); } catch { thrown = true; }
ok(thrown, "hibás mezőtípus: elutasítva");
{
  const st = mem(), seen = [];
  const s = createLocalSave({ key: K, storage: st, onStatus: x => seen.push(x.phase) });
  ok(s.load().ok && s.save(S(10)) && JSON.parse(st.getItem(K)).users.Anna.pts === 10, "mentés: ugyanaz a JSON ugyanazon a kulcson");
  ok(st.getItem(K + PREV) === null, "első mentésnél nincs előző");
  s.save(S(20));
  ok(JSON.parse(st.getItem(K + PREV)).users.Anna.pts === 10 && JSON.parse(st.getItem(K)).users.Anna.pts === 20, "a következő mentés előtt az előző megmarad");
  ok(s.status.lastSaved && seen.includes("saved"), "állapot: mentve, időponttal");
  ok(!s.save({ users: "rossz" }) && s.status.phase === "invalid" && JSON.parse(st.getItem(K)).users.Anna.pts === 20, "hibás memóriabeli állapot: nem írja ki, a régi mentés marad");
}
// --- tele tárhely → hiba, a legújabb függőben marad, újrapróbálás után megy
{
  const st = mem({}, 200), t = fakeTimers();
  const s = createLocalSave({ key: K, storage: st, schedule: t.schedule, cancel: t.cancel });
  s.load(); s.save(S(1));
  const big = S(2); big.users.Anna.note = "x".repeat(300);
  ok(!s.save(big) && s.status.phase === "error" && s.status.pending && t.q.length === 1, "tele tárhely: hibajelzés, függőben marad, újrapróbálás ütemezve");
  ok(JSON.parse(st.getItem(K)).users.Anna.pts === 1, "a hiba alatt a korábbi mentés ép marad");
  st.m.delete(K + PREV); // hely szabadul fel
  const st2 = mem({}, 10000); st2.m = st.m; Object.assign(st, { setItem: (k, v) => st.m.set(k, String(v)) });
  t.run();
  ok(s.status.phase === "saved" && JSON.parse(st.getItem(K)).users.Anna.pts === 2, "újrapróbálás után a legújabb állapot mentve");
}
// --- sérült mentés: előző mentésből visszaállítás, vagy üresen; a nyers eredeti megmarad
{
  const prev = JSON.stringify({ ...S(77), parent: { salt: "ab", hash: "cd" } });
  const st = mem({ [K]: "{sérült", [K + PREV]: prev });
  const s = createLocalSave({ key: K, storage: st });
  const r = s.load();
  ok(!r.ok && r.raw === "{sérült" && r.previous.users.Anna.pts === 77 && r.previous.parent.hash === "cd", "sérült mentés: betöltés megáll, az ép előző és a szülői PIN elérhető");
  ok(st.getItem(K) === "{sérült", "betöltéskor semmit nem ír felül");
  s.restorePrevious(r.raw, r.previous);
  ok(JSON.parse(st.getItem(K)).users.Anna.pts === 77 && st.getItem(K + BAD) === "{sérült", "visszaállítás: az előző mentésből, a sérült eredeti külön kulcson megmarad");
  const st2 = mem({ [K]: '{"users":7}' }), s2 = createLocalSave({ key: K, storage: st2 }), r2 = s2.load();
  ok(!r2.ok && r2.previous === null && s2.startEmpty(r2.raw) && JSON.parse(st2.getItem(K)).users && st2.getItem(K + BAD) === '{"users":7}', "előző nélkül: indulás üresen, a sérült eredeti megmarad");
  ok(createLocalSave({ key: K, storage: mem({ [K + PREV]: "{x" , [K]: "{y" }) }).load().previous === null, "sérült előző mentést nem ajánl fel");
}
// --- egy aktív lap: az új lap átveszi, a régi nem ír többé
{
  const st = mem(), lost = [];
  const A = createTabLease({ key: K, storage: st, id: "A", onLost: o => lost.push(o) });
  const sA = createLocalSave({ key: K, storage: st, canWrite: () => A.isActive() });
  sA.load(); A.claim(); sA.save(S(5));
  const B = createTabLease({ key: K, storage: st, id: "B" });
  const sB = createLocalSave({ key: K, storage: st, canWrite: () => B.isActive() });
  ok(sB.load().state.users.Anna.pts === 5, "az új lap a friss mentésből indul");
  B.claim();
  A.onStorage({ key: K + "__tab_v1" });
  ok(lost.length === 1 && lost[0] === "B" && A.lost, "a régi lap észreveszi az átvételt (egyszer)");
  ok(!sA.save(S(999)) && JSON.parse(st.getItem(K)).users.Anna.pts === 5, "a régi lap írása elutasítva – nem írja felül az újat");
  ok(sB.save(S(6)) && JSON.parse(st.getItem(K)).users.Anna.pts === 6, "az új lap ír");
  A.claim();
  ok(A.isActive() && !B.isActive(), "„Átveszem itt”: a régi lap újra aktív, az új lesz inaktív");
}

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
