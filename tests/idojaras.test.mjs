// ❄️ időjárás alapú hóesés (keret 1.13.0): napi egy lekérdezés, gyorsítótár, hiba esetén tartalék
import assert from "node:assert/strict";
import { snowToday, isSnowDay, cachedSnow, normCity } from "../js/core/weather.js";
import { clampValue } from "../js/core/settings.js";
import { settingsDefs } from "../js/shell/settings-defs.js";

assert.equal(isSnowDay({ snowfall_sum: [0.4], weather_code: [3] }), true, "volt / várható hó");
assert.equal(isSnowDay({ snowfall_sum: [0], weather_code: [73] }), true, "hó kód (WMO 73)");
assert.equal(isSnowDay({ snowfall_sum: [0], weather_code: [61] }), false, "eső");
assert.equal(isSnowDay(null), false);
assert.equal(normCity("  GYŐR "), "győr");

const mem = new Map(), store = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
const calls = [];
const fake = (snow, code = 3, found = true) => async url => {
  calls.push(url);
  if (url.includes("geocoding")) return { json: async () => (found ? { results: [{ name: "Győr", latitude: 47.68, longitude: 17.63 }] } : {}) };
  return { json: async () => ({ daily: { snowfall_sum: [snow], weather_code: [code] } }) };
};
const opts = f => ({ store, key: "teszt_weather", fetchFn: f });

let r = await snowToday("Győr", "2026-12-01", opts(fake(1.2)));
assert.deepEqual([r.snow, r.place], [true, "Győr"]); assert.equal(calls.length, 2);
assert.match(calls[0], /name=Gy%C5%91r/, "csak a város neve megy ki");
// ugyanaznap: nincs újabb lekérdezés (kis- és nagybetű, szóköz mindegy)
r = await snowToday(" győr ", "2026-12-01", opts(fake(0))); assert.equal(r.snow, true); assert.equal(calls.length, 2);
assert.equal(cachedSnow(store, "teszt_weather", "Győr", "2026-12-01").snow, true);
// másnap: új lekérdezés
r = await snowToday("Győr", "2026-12-02", opts(fake(0, 1))); assert.equal(r.snow, false); assert.equal(calls.length, 4);
// másik város: új lekérdezés
calls.length = 0; r = await snowToday("Sopron", "2026-12-02", opts(fake(0, 71))); assert.equal(r.snow, true); assert.equal(calls.length, 2);
// ismeretlen város: null (a naptári tartalék dönt), és aznap nem kérdezi újra
calls.length = 0; r = await snowToday("Nincsilyenváros", "2026-12-02", opts(fake(1, 3, false))); assert.equal(r.snow, null);
await snowToday("Nincsilyenváros", "2026-12-02", opts(fake(1, 3, false))); assert.equal(calls.length, 1);
// nincs internet: null, nem tárol (legközelebb újra próbálja)
r = await snowToday("Pécs", "2026-12-02", opts(async () => { throw new Error("offline"); })); assert.equal(r.snow, null);
assert.equal(cachedSnow(store, "teszt_weather", "Pécs", "2026-12-02"), null);
// üres város: nincs lekérdezés
calls.length = 0; r = await snowToday("  ", "2026-12-02", opts(fake(1))); assert.equal(r.snow, null); assert.equal(calls.length, 0);

// a város beállítás: szöveg, alapból Győr, üresen is Győr, hosszkorláttal
const city = settingsDefs({ defaults: {} }, null).find(d => d.key === "city");
assert.equal(city.default, "Győr"); assert.equal(city.type, "text"); assert.equal(city.group, "holiday");
assert.equal(clampValue(city, "  Szeged  "), "Szeged"); assert.equal(clampValue(city, ""), "Győr");
assert.equal(clampValue(city, "x".repeat(200)).length, 60);
assert.equal(settingsDefs({ defaults: { city: "Debrecen" } }, null).find(d => d.key === "city").default, "Debrecen");
console.log("Időjárás alapú hóesés: rendben.");
