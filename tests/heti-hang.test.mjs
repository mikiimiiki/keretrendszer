// 📅 heti összefoglaló és 🔔 hangjelzés (keret 1.12.0)
import assert from "node:assert/strict";
import { weekdayOf, weekStart, weekStats, weeklyDue, markWeeklySeen } from "../js/core/weekly.js";
import { playSound, SOUNDS } from "../js/core/sound.js";
import { dateKey, keyToDay } from "../js/core/dates.js";

// a hét hétfőn kezdődik (2026-11-23 hétfő, 2026-11-29 vasárnap)
const mon = keyToDay("2026-11-23"), sun = keyToDay("2026-11-29");
assert.equal(weekdayOf(mon), 0); assert.equal(weekdayOf(sun), 6);
assert.equal(weekStart(sun), mon); assert.equal(weekStart(mon + 7), mon + 7);

const u = { days: {} };
const put = (d, o) => { u.days[dateKey(d)] = { n: 0, ok: 0, ms: 0, done: false, ...o }; };
put(mon - 7, { n: 4, ok: 2 });                       // tegnapelőtti hét
put(mon, { n: 10, ok: 8, ms: 600000, done: true, imp: 1 });
put(mon + 1, { n: 14, ok: 10, ms: 900000, done: true, imp: 2 });
put(mon + 3, { n: 6, ok: 6 });
const s = weekStats(u, mon);
assert.deepEqual([s.n, s.ok, s.pct, s.missions, s.imp, s.activeDays, s.min], [30, 24, 80, 2, 3, 3, 25]);
assert.equal(s.best.on, "kedden"); assert.equal(s.best.n, 14);

// a következő hét bármelyik napján az első belépéskor jön, egyszer
const next = mon + 7;
assert.equal(weeklyDue(u, mon + 3).last.n, 4, "mindig az előző, lezárt hétről szól");
const due = weeklyDue(u, next + 2);
assert.equal(due.week, next); assert.equal(due.last.n, 30); assert.equal(due.prev.n, 4);
markWeeklySeen(u, due.week);
assert.equal(weeklyDue(u, next + 4), null, "egy héten csak egyszer");
assert.ok(weeklyDue(u, next + 7) === null, "gyakorlás nélküli hét után nincs ablak");
assert.equal(weeklyDue({ days: {} }, next), null);

// 🔔 hang: hangkártya nélkül (Node) csendben marad, és nem dob hibát
assert.equal(playSound("ok"), false);
assert.equal(playSound("nincs-ilyen"), false);
// álhangkártyával a dallam lejátszódik
let osc = 0;
globalThis.window = { AudioContext: class {
  constructor() { this.currentTime = 0; this.state = "running"; this.destination = {}; }
  createOscillator() { osc++; return { type: "", frequency: {}, connect() {}, start() {}, stop() {} }; }
  createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
} };
for (const name of Object.keys(SOUNDS)) assert.equal(playSound(name), true, name);
assert.equal(osc, Object.values(SOUNDS).reduce((a, n) => a + n.length, 0));
console.log("Heti összefoglaló és hangjelzés: rendben.");
