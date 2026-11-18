// ===== Újrapróbálkozás (lépcsőzetes visszavárakozás) – álidőzítővel =====
// Futtatás: node tests/retry.test.mjs
import { RETRY, retryDelay, retryStage, makeRetry } from "../js/core/retry.js";

let fails = 0;
const ok = (c, msg) => { console.log((c ? "✓ " : "✗ ") + msg); if (!c) fails++; };

// álóra és álidőzítő
function fakeTime() {
  let t = 0, seq = 0; const q = new Map();
  return {
    now: () => t,
    timer: { set: (fn, ms) => { const id = ++seq; q.set(id, { at: t + ms, fn }); return id; }, clear: id => q.delete(id) },
    async advance(ms) {
      const end = t + ms;
      for (;;) {
        const due = [...q.entries()].filter(([, x]) => x.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        q.delete(due[0]); t = due[1].at; due[1].fn(); await new Promise(r => setTimeout(r, 0));
      }
      t = end;
    },
    pending: () => q.size,
  };
}

ok([1, 2, 3, 4, 6, 7, 9, 10, 50].map(n => retryDelay(n) / 1000).join(",") === "15,15,15,60,60,300,300,900,900", "lépcső: 3×15 mp, 3×1 perc, 3×5 perc, utána 15 perc");
ok([0, 1, 3, 4, 7, 10].map(n => retryStage(n)).join(",") === "-1,0,0,1,2,3", "lépcsőfokok");

{
  const T = fakeTime(); let net = false, need = true, tries = 0; const stages = [], rec = [];
  const r = makeRetry({ attempt: async () => { tries++; if (net) need = false; return net; }, needed: () => need, onStage: s => stages.push(s), onRecover: () => rec.push(T.now()), now: T.now, timer: T.timer });
  r.failed();
  ok(r.active() && r.nextIn() === 15000 && stages.join() === "0", "első hiba: 15 mp múlva próbál, egy naplóbejegyzés");
  await T.advance(15000 * 3); ok(tries === 3 && r.stage() === 1 && r.nextIn() === 60000, "3 sikertelen 15 mp-es próba után percenként");
  await T.advance(60000 * 3); ok(tries === 6 && r.stage() === 2 && r.nextIn() === 300000, "3 perces után 5 percenként");
  await T.advance(300000 * 3); ok(tries === 9 && r.stage() === 3 && r.nextIn() === 900000, "3 ötperces után 15 percenként");
  await T.advance(900000 * 2); ok(tries === 11 && r.stage() === 3, "15 percenként marad, amíg nyitva van");
  ok(stages.join() === "0,1,2,3", "naplóba csak a lépcsőváltások kerülnek");
  net = true; await T.advance(900000); ok(!r.active() && rec.length === 1 && T.pending() === 0, "siker: vége a lépcsőnek, egy „helyreállt” bejegyzés");
}
{
  const T = fakeTime(); let need = true, tries = 0;
  const r = makeRetry({ attempt: async () => { tries++; return false; }, needed: () => need, now: T.now, timer: T.timer });
  r.failed(); need = false; await T.advance(15000);
  ok(tries === 0 && !r.active(), "ha közben nincs már mit menteni, nem próbálkozik");
}
{
  const T = fakeTime(); let vis = false, tries = 0;
  const r = makeRetry({ attempt: async () => { tries++; return false; }, needed: () => true, visible: () => vis, now: T.now, timer: T.timer });
  r.failed(); await T.advance(15000);
  ok(tries === 0 && r.waitingVisible(), "háttérben nem próbálkozik, kivár");
  vis = true; r.onVisible(); await T.advance(0);
  ok(tries === 1 && r.fails() === 2 && r.nextIn() === 15000, "előtérbe kerülve azonnal próbál, a lépcső folytatódik");
}
{
  const T = fakeTime(); let tries = 0, net = false, need = true;
  const r = makeRetry({ attempt: async () => { tries++; if (net) need = false; return net; }, needed: () => need, now: T.now, timer: T.timer });
  for (let i = 0; i < 5; i++) r.failed();
  ok(r.stage() === 1, "több hiba után a perces fokon");
  r.kick(true); await T.advance(0);
  ok(tries === 1 && r.fails() === 1 && r.nextIn() === 15000, "visszajött a net / kézi gomb: azonnal próbál, a lépcső előről indul");
  net = true; r.kick(true); await T.advance(0);
  ok(!r.active(), "kézi próba sikere lezárja a lépcsőt");
}
{
  const T = fakeTime(); let need = true;
  const r = makeRetry({ attempt: async () => false, needed: () => need, now: T.now, timer: T.timer });
  r.failed(); need = false; r.succeeded();
  ok(!r.active() && T.pending() === 0, "a szokásos úton sikerült mentés is lezárja a lépcsőt");
}

console.log(fails ? `\n✗ ${fails} hiba` : "\n✓ Minden teszt rendben");
process.exit(fails ? 1 : 0);
