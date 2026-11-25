import assert from 'node:assert/strict';
import test from 'node:test';
import { PACK } from '../js/pack/index.js';
import { makeRng } from '../js/core/rng.js';
import { normalizePack } from '../js/core/pack-contract.js';
import { tilesUI } from '../js/core/tile-ui.js';

class Element extends EventTarget {
  constructor() { super(); this.children = []; this.style = {}; this.classList = new Set();
    this.classList.remove = this.classList.delete; this.classList.contains = this.classList.has; }
  append(...nodes) { this.children.push(...nodes); }
  get lastChild() { return this.children.at(-1); }
  set innerHTML(value) { this.children = []; }
  setAttribute() {}
  querySelectorAll() { return this.children; }
  click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
}
globalThis.document = { createElement: () => new Element() };
const pack = normalizePack(PACK);
function fixture(word, direct = false) {
  const root = new Element(), seen = []; let paid = 0;
  const task = pack.makeTask({ topic: 'tiles', sub: word.normalize('NFC') }, makeRng(20), { words: {}, prefs: {} });
  const io = { answering: () => true, useHelp: () => paid++, toast: () => {}, submit() {
    const read = ui.read(); seen.push(read);
    if (task.check(read).ok) ui.markRight(); else ui.markWrong();
  } };
  const ui = direct ? tilesUI(root, io, { word, clueText: '', arrange: a => a.reverse(), isVowel: c => /[äe]/i.test(c) }) : task.render(root, io);
  const [, row, pool, help] = root.children;
  return { ui, row, pool, help, seen, task, paid: () => paid,
    tap: c => { const b = pool.children.find(b => b.textContent === c && !b.classList.has('used')); assert.ok(b, c); b.click(); } };
}
test('Nemet minta: az a es az umlautos betu kulonbozik; a kezdo nagybetu es az egyszeri bekuldes megmarad', () => {
  const f = fixture('Mädchen'); assert.equal(f.pool.children.length, 7);
  assert.equal(f.ui.onKey({ key: 'm' }), true); assert.equal(f.ui.onKey({ key: 'a' }), false);
  assert.equal(f.ui.onKey({ key: 'ä', isComposing: true }), false);
  for (const c of 'a\u0308dchen'.normalize('NFC')) assert.equal(f.ui.onKey({ key: c }), true);
  for (const b of f.pool.children) b.click();
  assert.deepEqual(f.seen, ['Mädchen']); assert.equal(f.task.check('mädchen').ok, false);
  assert.ok(f.pool.children.every(b => b.disabled)); f.ui.dispose();
});
test('Nemet minta: a sharp s egy lapka; rossz sorrend utan javithato', () => {
  const f = fixture('Straße'); assert.equal(f.pool.children.length, 6);
  assert.equal(f.pool.children.filter(b => b.textContent === 'ß').length, 1);
  for (const c of 'Straeß') f.tap(c);
  assert.deepEqual(f.row.children.slice(0, 4).map(b => b.textContent), [...'Stra']);
  f.tap('ß'); f.tap('e'); assert.deepEqual(f.seen, ['Straeß', 'Straße']);
  assert.equal(f.task.check('Strasse').ok, false); f.ui.dispose();
});
test('NFC, csomagbol erkezo maganhangzo-sugo es dispose', () => {
  const f = fixture('Ma\u0308dchen', true); assert.equal(f.pool.children.length, 7);
  f.help.children[0].click(); f.help.children[1].click(); assert.equal(f.paid(), 1);
  assert.equal(f.row.children[1].textContent, 'ä'); assert.equal(f.row.children[5].textContent, 'e');
  f.ui.dispose(); assert.equal(f.ui.onKey({ key: 'M' }), false); for (const b of f.pool.children) b.click();
  assert.deepEqual(f.seen, []);
});

test('Billentyű: a következő helyre illő kis- vagy nagybetű kerül le (Schwester)', () => {
  const f = fixture('Schwester', true), word = () => f.row.children.map(b => b.textContent || '').join('');
  assert.equal(f.ui.onKey({ key: 's' }), true); assert.equal(f.row.children[0].textContent, 'S');
  for (const c of 'chwe') f.ui.onKey({ key: c });
  assert.equal(f.ui.onKey({ key: 'S' }), true); assert.equal(f.row.children[5].textContent, 's');
  for (const c of 'ter') f.ui.onKey({ key: c });
  assert.deepEqual(f.seen, ['Schwester']); assert.equal(word(), 'Schwester'); f.ui.dispose();
});
test('Jelentés nélkül nincs Jelentés gomb', () => {
  const f = fixture('Haus', true);
  assert.equal(f.help.children.length, 2); assert.ok(f.help.children.every(b => !/Jelentés/.test(b.textContent || ''))); f.ui.dispose();
});
