import assert from "node:assert/strict";
import test from "node:test";
import { choiceUI, textUI, numberUI } from "../js/core/answer-ui.js";
import { createRecordGate } from "../js/core/pack-contract.js";

// Minimális DOM-tesztkeret valós EventTarget/AbortSignal viselkedéssel; nem böngészőteszt.
class Element extends EventTarget {
  constructor(tag) {
    super(); this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {};
    this.classList = new Set(); this.classList.remove = this.classList.delete;
    this.value = ""; this.disabled = false; this.isConnected = true;
  }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(k, v) { this.attrs[k] = v; }
  removeAttribute(k) { delete this.attrs[k]; }
  click() { if (!this.disabled) this.dispatchEvent(new Event("click")); }
  select() { this.selected = true; }
  focus() { this.focusCount = (this.focusCount ?? 0) + 1; }
}
globalThis.document = { createElement: tag => new Element(tag) };
const key = (k, opts) => Object.assign(new Event("keydown", { cancelable: true }), { key: k, ...opts });
const wait = () => new Promise(resolve => setTimeout(resolve, 65));
const box = () => new Element("div");

test("Választás: index vagy nyers érték, egy hibás opció letiltása, végleges zárolás", () => {
  const root = box(), values = [];
  const ui = choiceUI(root, { answering: () => true, submit: () => values.push(ui.read()) },
    { options: ["<első>", "második", "harmadik"], correct: 1, getValue: (_, i) => i });
  const [a, b, c] = root.children[0].children;
  assert.equal(a.textContent, "<első>"); assert.equal(ui.read(), null);
  a.click(); assert.equal(ui.read(), 0); ui.markWrong(); a.click();
  assert.equal(ui.onKey(key("2", { repeat: true })), false);
  assert.equal(ui.onKey(key("2", { ctrlKey: true })), false);
  assert.equal(ui.onKey(key("2")), true); ui.markRight(); c.click();
  assert.deepEqual(values, [0, 1]); assert.ok(a.disabled && b.disabled && c.disabled);
  assert.ok(a.classList.has("wrong") && b.classList.has("right")); ui.dispose();
});

test("Szöveg: üres választ nem olvas ki, az ékezetet és a Unicode-alakot átadja", () => {
  const root = box(), sent = [];
  const ui = textUI(root, { answering: () => true, submit: () => sent.push(ui.read()) }, { correct: "méh" });
  const [input] = root.children;
  input.value = "  "; assert.equal(ui.read(), null);
  input.value = " ME\u0301H ";
  input.dispatchEvent(new Event("compositionstart"));
  input.dispatchEvent(key("Enter", { isComposing: true })); assert.equal(ui.read(), null);
  input.dispatchEvent(new Event("compositionend"));
  input.dispatchEvent(key("Enter", { keyCode: 229 }));
  input.dispatchEvent(key("Enter", { repeat: true }));
  const enter = key("Enter"); input.dispatchEvent(enter);
  assert.ok(enter.defaultPrevented); assert.deepEqual(sent, [" ME\u0301H "]);
  ui.markWrong(); assert.equal(input.attrs["aria-invalid"], "true"); assert.ok(input.selected);
  input.dispatchEvent(new Event("input")); assert.ok(!input.classList.has("wrong"));
  ui.showCorrect(); assert.ok(input.disabled); assert.equal(input.value, "méh"); ui.dispose();
});

test("Számmező: saját értelmezés, 0, billentyűzet, hosszkorlát és zárolás", () => {
  const root = box();
  const ui = numberUI(root, { answering: () => true, submit: () => {} },
    { keypad: true, maxLength: 5, unit: "kg", read: v => Number(v.replace(",", ".")), correct: 0 });
  const [row, pad] = root.children, [input, unit] = row.children;
  assert.equal(unit.textContent, "kg"); assert.equal(input.inputMode, "numeric");
  pad.children[9].click(); assert.equal(ui.read(), 0);
  pad.children.at(-1).click(); assert.equal(ui.read(), null);
  input.value = "-1,25"; pad.children[0].click(); assert.equal(ui.read(), -1.25);
  ui.lock(); pad.children.at(-1).click(); assert.equal(input.value, "-1,25");
  assert.ok(pad.children.every(b => b.disabled)); ui.showCorrect(); assert.equal(input.value, "0"); ui.dispose();
});

test("Enter és aktiválás: azonos beküldési út, egyszeri rögzítés ismételt aktiválásnál", () => {
  for (const mode of ["enter", "click", "touch"]) {
    const root = box(), claim = createRecordGate(); let recorded = 0;
    const io = { answering: () => true, submit: () => { if (ui.read() !== "helyes") return; claim(); recorded++; ui.markRight(); } };
    const ui = mode === "enter" ? textUI(root, io) : choiceUI(root, io, { options: ["helyes"], correct: "helyes" });
    const node = mode === "enter" ? root.children[0] : root.children[0].children[0];
    if (mode === "enter") { node.value = "helyes"; node.dispatchEvent(key("Enter")); node.dispatchEvent(key("Enter")); }
    else { node.click(); node.dispatchEvent(new Event("click")); } // az érintés böngészős click eseménye innen közös
    assert.equal(recorded, 1, mode); ui.dispose();
  }
});

test("Feladatváltás: régi esemény és fókusz nem fut, az új felület fókuszt kaphat", async () => {
  const root = box(); let calls = 0;
  const io = { answering: () => true, submit: () => calls++ };
  const old = textUI(root, io), [input] = root.children;
  old.dispose(); old.dispose(); input.dispatchEvent(key("Enter"));
  const next = textUI(root, io), fresh = root.children[1];
  const noFocus = textUI(root, { ...io, canFocus: () => false });
  await wait();
  assert.equal(calls, 0); assert.equal(input.focusCount, undefined); assert.equal(fresh.focusCount, 1);
  assert.equal(root.children[2].focusCount, undefined);
  next.dispose(); noFocus.dispose();
});

test("Különleges betűk: beszúrás, hosszkorlát, zárolás után nem ír", () => {
  const root = box();
  const ui = textUI(root, { answering: () => true, submit: () => {} }, { correct: "Straße", extraKeys: ["ä", "ß"], maxLength: 6 });
  const [input, bar] = root.children, [ae, sz] = bar.children;
  assert.equal(bar.attrs["aria-label"], "Különleges betűk"); assert.equal(sz.textContent, "ß");
  input.value = "Stra"; sz.click(); assert.equal(input.value, "Straß");
  input.value = "Straße"; ae.click(); assert.equal(input.value, "Straße");
  input.value = "M"; ui.lock(); ae.click(); assert.equal(input.value, "M"); assert.ok(ae.disabled && sz.disabled); ui.dispose();
});
