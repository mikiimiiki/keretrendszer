// Hiányzó rész felület (answer kind: "gap") – szimulált DOM
import assert from "node:assert/strict";
import { installFakeDom } from "../tools/fake-dom.mjs";
const { box } = installFakeDom();
const { normalizePack } = await import("../js/core/pack-contract.js");
const { answerSpecProblem } = await import("../js/core/answer-spec.js");
const { makeRng } = await import("../js/core/rng.js");

const mk = answer => normalizePack({ contractVersion: 1, version: "1", id: "g", topics: [{ id: "a", name: "A" }],
  makeTask: () => ({ q: "Pótold!", answer }) }).makeTask({ topic: "a" }, makeRng(1), {});
const io = () => { const sent = []; return { sent, answering: () => true, submit() { sent.push(1); }, toast() {}, focus() {}, signal: new AbortController().signal }; };

// választós: a választott rész beíródik a hiányba, a megoldás a rész
let t = mk({ kind: "gap", word: "bútor", part: "ú", options: ["ú", "u"] });
assert.equal(t.solution, "ú"); assert.equal(t.correctText, "ú"); assert.equal(t.check("ú").ok, true); assert.equal(t.check("u").ok, false);
let root = box(), api = io(), ui = t.render(root, api);
const word = () => root.querySelector(".gap-word").textContent;
assert.equal(word(), "b tor", "üres hiány: egy betűnyi hely, egy aláhúzás");
root.querySelectorAll("button.opt").find(b => b.textContent === "u").click();
assert.equal(ui.read(), "u"); assert.equal(word(), "butor"); assert.equal(api.sent.length, 1);
ui.markWrong(); assert.ok(root.querySelector(".gap").classList.contains("wrong"));
ui.showCorrect(); assert.equal(word(), "bútor"); assert.ok(root.querySelector(".gap").classList.contains("right"));

// beírós: a beírt rész élőben a hiányba kerül; különleges betűk gombsora
t = mk({ kind: "gap", word: "tanít", start: 3, part: "ít", input: "text", extraKeys: ["í"] });
root = box(); api = io(); ui = t.render(root, api);
const inp = root.querySelector("input"); inp.value = "ít"; inp.dispatchEvent(new Event("input"));
assert.equal(word(), "tanít"); assert.equal(ui.read(), "ít"); assert.ok(root.querySelector(".xkeys"));
assert.equal(t.check(" ít ").ok, true, "szélső szóköz nem számít");

// hibás leírások érthető hibát adnak
for (const bad of [{ kind: "gap", word: "", part: "a", options: ["a", "b"] }, { kind: "gap", word: "kapu", part: "ú", options: ["ú", "u"] },
  { kind: "gap", word: "kapu", part: "u", options: ["ú"] }, { kind: "gap", word: "kapu", start: 0, part: "u", options: ["u", "ú"] },
  { kind: "gap", word: "kapu", part: "u", input: "rajz" }]) assert.ok(answerSpecProblem(bad), JSON.stringify(bad));
assert.equal(answerSpecProblem({ kind: "gap", word: "kapu", part: "u", input: "text" }), null);
console.log("Hiányzó rész (gap): rendben.");
