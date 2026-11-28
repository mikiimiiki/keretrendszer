// Közös Firebase-projekt (1.19.0): több játék egy adatbázisban, játékonként külön ágon (families/{fam}/apps/{app}).
// Futtatás: node tests/kozos-felho.test.mjs – a memóriabeli „ál-Firebase” a cloud.test.mjs-ből van átvéve.
// ---- böngésző-környezet pótlása Node alatt ----
const mem = new Map();
const mkStorage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; };
globalThis.localStorage = mkStorage();
globalThis.document = { visibilityState: "visible", addEventListener() {} };
const winL = {}; globalThis.addEventListener = (ev, fn) => { (winL[ev] = winL[ev] || []).push(fn); };
void mem;

// ---- memóriabeli Realtime Database ----
const clone = v => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
function prune(v) {
  if (Array.isArray(v)) { const a = v.map(prune).filter(x => x !== null); return a.length ? a : null; }
  if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) { const p = prune(x); if (p !== null) o[k] = p; } return Object.keys(o).length ? o : null; }
  return v === undefined ? null : v;
}
function makeServer() {
  let root = {};
  const listeners = [];
  const parts = p => p.split("/").filter(Boolean);
  const getAt = p => parts(p).reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), root);
  function setAt(p, v) {
    const ks = parts(p); if (!ks.length) { root = prune(v) || {}; return; }
    let o = root; ks.slice(0, -1).forEach(k => { if (!o[k] || typeof o[k] !== "object") o[k] = {}; o = o[k]; });
    o[ks[ks.length - 1]] = clone(v); root = prune(root) || {};
  }
  const notify = () => listeners.forEach(l => { const v = clone(getAt(l.path)) ?? null; const s = JSON.stringify(v); if (s !== l.last) { l.last = s; l.cb({ val: () => clone(v) }); } });
  return { getAt, setAt, notify, listeners, dump: () => clone(root) };
}
function fakeFirebase(server, email, net = { down: false, calls: 0 }) {
  let online = true;
  const conn = [];
  const db = {};
  const dbm = {
    getDatabase: () => db,
    ref: (_db, path) => ({ path }),
    get: async r => { net.calls++; if (net.down) throw { code: "network-request-failed" }; if (!online) throw { code: "offline" }; return { val: () => clone(server.getAt(r.path)) ?? null }; },
    set: async (r, v) => { net.calls++; if (net.down) throw { code: "network-request-failed" }; if (!online) throw { code: "offline" }; server.setAt(r.path, v); server.notify(); },
    update: async (r, obj) => { net.calls++; if (net.down) throw { code: "network-request-failed" }; if (!online) throw { code: "offline" }; for (const [k, v] of Object.entries(obj)) { if (/\.|#|\$|\[|\]/.test(k)) throw new Error("invalid key " + k); server.setAt(r.path + "/" + k, v); } server.notify(); },
    remove: async r => { server.setAt(r.path, null); server.notify(); },
    onValue: (r, cb) => {
      if (r.path === ".info/connected") { const l = { cb }; conn.push(l); setTimeout(() => cb({ val: () => online }), 0); return () => conn.splice(conn.indexOf(l), 1); }
      const l = { path: r.path, cb, last: undefined }; server.listeners.push(l); setTimeout(() => server.notify(), 0);
      return () => server.listeners.splice(server.listeners.indexOf(l), 1);
    },
    goOnline: () => { if (!online) { online = true; conn.forEach(l => setTimeout(() => l.cb({ val: () => true }), 0)); } },
    goOffline: () => { if (online) { online = false; conn.forEach(l => l.cb({ val: () => false })); } },
  };
  const am = {
    getAuth: () => ({}),
    onAuthStateChanged: (_a, cb) => setTimeout(() => cb({ email }), 0),
    GoogleAuthProvider: class { setCustomParameters() {} },
    signInWithPopup: async () => {}, signOut: async () => {},
  };
  const app = { initializeApp: () => ({}) };
  return { load: async () => [app, dbm, am], get online() { return online; } };
}

// ---- az app részei, amiket a felhőmodul használ ----
const { createCloud, safeKey } = await import("../js/core/cloud.js");
const { createDevice } = await import("../js/core/device.js");
globalThis.document.querySelector = () => null;
const { PACK } = await import("../js/pack/index.js");
const { newUser, normUser } = await import("../js/shell/user.js");
const { recordAnswer } = await import("../js/core/answers.js");
const { migrateUser, migrateFamily } = await import("../js/game/migrate.js");
// a közös keret egy válasz-rögzítése (a minta csomaggal)
const E = { newUser: (n, a) => newUser(n, a, PACK), normUser: u => normUser(u, PACK) };

let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const play = (u, n, good = 1) => { for (let i = 0; i < n; i++) recordAnswer(u, { topic: ["jelentes", "nevelo", "iras"][i % 3], r: good, ms: 20000, pts: good ? 10 : 2, log: { s: "Hund", lvl: 1, q: "Mit jelent: der Hund?", a: "macska", c: "kutya" } }); u.upd = Date.now(); };

const FAM = "fkozos00000000000000000";
const server = makeServer();
server.setAt(`families/${FAM}/members/szulo@example,com`, true);
server.setAt(`memberOf/szulo@example,com/${FAM}`, true);

// egy játék egy eszközön: saját tároló, saját mentési kulcs, saját felhőág (app)
function game(app, users = {}, { familyCode = FAM, parent } = {}) {
  globalThis.localStorage = mkStorage();
  const state = { familyCode, current: Object.keys(users)[0] || "", users, settings: {}, deleted: {}, ...(parent ? { parent } : {}) };
  migrateFamily(state);
  Object.keys(users).forEach(n => { users[n] = migrateUser(E.normUser(users[n]), state); });
  const dev = createDevice("k_" + app);
  const cloud = createCloud({
    app, state: () => state, persist: () => {}, refresh: () => {},
    normUser: u => migrateUser(E.normUser(u), state), device: dev, storeKey: "k_" + app,
    onDevice: () => {}, firebase: fakeFirebase(server, "szulo@example.com").load,
  });
  return { state, cloud, dev };
}
const waitReady = async c => { for (let i = 0; i < 100 && !(c.ready && c.status().text.startsWith("Szinkronban")); i++) await sleep(20); };

// 1) két játék, ugyanaz a gyereknév: nem írják felül egymást
const annaM = E.newUser("Anna", "🦊"); play(annaM, 30);
const annaH = E.newUser("Anna", "🦊"); play(annaH, 5);
const M = game("matek", { Anna: annaM }, { parent: { salt: "s1", hash: "h-matek" } });
await M.cloud.init(); await waitReady(M.cloud); await M.cloud.flush();
const H = game("helyesiras", { Anna: annaH }, { parent: { salt: "s2", hash: "h-helyes" } });
await H.cloud.init(); await waitReady(H.cloud); await H.cloud.flush();
const rm = server.getAt(`families/${FAM}/apps/matek/users/Anna`), rh = server.getAt(`families/${FAM}/apps/helyesiras/users/Anna`);
ok(rm && rm.total === M.state.users.Anna.total, "matek: Anna a saját ágán (apps/matek/users)");
ok(rh && rh.total === H.state.users.Anna.total && rh.total !== rm.total, "helyesírás: Anna a saját ágán, a matekos adat nem írta felül");
ok(!server.getAt(`families/${FAM}/users`) && !server.getAt(`families/${FAM}/logs`), "a család gyökerén nincs játékos és hibanapló");
ok(server.getAt(`families/${FAM}/apps/matek/devices/${M.dev.id}`) && server.getAt(`families/${FAM}/apps/helyesiras/devices/${H.dev.id}`), "az eszközök játékonként külön ágon");

// 2) közös szülői PIN: az elsőként feltöltött marad, a másik játék átveszi
ok((server.getAt(`families/${FAM}/parent`) || {}).hash === "h-matek", "PIN: családszinten, a matek PIN-je került fel");
ok(H.state.parent && H.state.parent.hash === "h-matek", "PIN: a helyesírás átvette a közös PIN-t");

// 3) beállítások játékonként
M.state.settings = { upd: Date.now(), goalTasks: 12 }; M.cloud.pushSettings(); await sleep(30);
ok((server.getAt(`families/${FAM}/apps/matek/settings`) || {}).goalTasks === 12 && !server.getAt(`families/${FAM}/settings`), "beállítások: apps/matek/settings, a családgyökéren nincs");

// 4) átköltözés: régi családkóddal induló harmadik játék megtalálja a közös családot, és feltölti a helyi adatot
const kata = E.newUser("Kata", "🐱"); play(kata, 8);
const N = game("nemet", { Kata: kata }, { familyCode: "fregi0000000000000000000" });
await N.cloud.init(); await waitReady(N.cloud); await N.cloud.flush();
ok(N.state.familyCode === FAM, "átköltözés: a régi családkód helyett a közös családot vette át");
ok((server.getAt(`families/${FAM}/apps/nemet/users/Kata`) || {}).total === N.state.users.Kata.total, "átköltözés: a helyi eredmények felkerültek az apps/nemet ágra");
ok(N.state.parent && N.state.parent.hash === "h-matek", "átköltözés: a közös PIN megjött");

// 5) törlés csak a saját ágon
M.cloud.markDeleted("Anna", Date.now()); await sleep(30);
ok(!server.getAt(`families/${FAM}/apps/matek/users/Anna`) && server.getAt(`families/${FAM}/apps/helyesiras/users/Anna`), "törlés: a matekos Anna lekerült, a helyesírásos megmaradt");

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
