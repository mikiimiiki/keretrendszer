// 🌍 Nyelvenkénti felolvasás: a <span lang="de-DE">…</span> részt német hang mondja, a többit a játék nyelvén
import assert from "node:assert/strict";
import { de, inLang, speechSegments, speechParts, unmarkedIn, unmarkedForeign, badLangCodes } from "../js/core/lang.js";

assert.equal(de("das Haus"), '<span lang="de-DE">das Haus</span>');
assert.equal(inLang("en-GB", "colour"), '<span lang="en-GB">colour</span>');

// --- darabolás ---
assert.deepEqual(speechParts("Mit jelent? " + de("der Hund"), "hu-HU"), [{ lang: "hu-HU", text: "Mit jelent?" }, { lang: "de-DE", text: "der Hund" }]);
assert.deepEqual(speechParts("Csak magyar <b>szöveg</b>.", "hu-HU"), [{ lang: "hu-HU", text: "Csak magyar szöveg." }]);
assert.deepEqual(speechParts("das Haus", "de-DE"), [{ lang: "de-DE", text: "das Haus" }], "az egész feladat nyelve (speechLang) változatlanul működik");
assert.deepEqual(speechParts(`📏 Szabály: <b>${de("-chen")}</b> végű szó mindig ${de("das")}, pl. <i>${de("das Mädchen")}</i>.`, "hu-HU"), [
  { lang: "hu-HU", text: "Szabály:" }, { lang: "de-DE", text: "-chen" }, { lang: "hu-HU", text: "végű szó mindig" },
  { lang: "de-DE", text: "das" }, { lang: "hu-HU", text: "pl." }, { lang: "de-DE", text: "das Mädchen" }]);
assert.deepEqual(speechParts(`<div lang="de-DE">Ich <b>bin</b> <span lang="hu-HU">(vagyok)</span> müde.</div>`, "hu-HU"), [
  { lang: "de-DE", text: "Ich bin" }, { lang: "hu-HU", text: "(vagyok)" }, { lang: "de-DE", text: "müde." }], "egymásba ágyazott jelölés");
assert.deepEqual(speechParts(`${de("Hund")}<br>${de("Katze")}`, "hu-HU"), [{ lang: "de-DE", text: "Hund Katze" }], "azonos nyelvű szomszédok összeolvadnak");
assert.deepEqual(speechParts(`${de("Hund")} → ${de("Hunde")}`, "hu-HU"), [{ lang: "de-DE", text: "Hund Hunde" }], "csak jelekből álló darab nem külön mondat");
assert.deepEqual(speechParts(`<span lang='de'>Ja</span> és <span lang=de-AT>Servus</span>`, "hu-HU").map(p => p.lang), ["de", "hu-HU", "de-AT"]);
assert.deepEqual(speechParts(`<span lang="német">Hund</span>`, "hu-HU"), [{ lang: "hu-HU", text: "Hund" }], "rossz nyelvkód: a játék nyelve");
assert.deepEqual(speechParts("", "hu-HU"), []); assert.deepEqual(speechParts(null, "hu-HU"), []);
assert.deepEqual(speechParts(`A ${de("Hund")} kutya`, "hu-HU", h => h.replace(/kutya/, "eb")).map(p => p.text), ["A", "Hund", "eb"], "a csomag speechText-je darabonként fut");
assert.equal(speechSegments("<!-- x --><b>a</b>", "hu-HU").length, 1);
console.log("Nyelvenkénti darabolás – rendben.");

// --- jelöletlen idegen szöveg keresése (a játékok tesztjeihez) ---
const WORDS = ["der Hund", "Hund", "Hand", "das Mädchen", "Ich bin müde."];
assert.deepEqual(unmarkedIn(`A ${de("Hund")} kutya.`, WORDS, "de-DE"), []);
assert.deepEqual(unmarkedIn("A Hund kutya.", WORDS, "de-DE"), ["Hund"]);
assert.deepEqual(unmarkedIn(`${de("Handschuh")} = kesztyű`, WORDS, "de-DE"), [], "egész szóra illeszt");
assert.deepEqual(unmarkedIn("Handschuh = kesztyű", WORDS, "de-DE"), []);
assert.deepEqual(unmarkedIn(`<b>der</b> ${de("Hund")}`, WORDS, "de-DE"), ["der Hund"], "félig jelölt kifejezés is hiba");
assert.deepEqual(unmarkedIn(`Mondat: <i lang="de-DE">Ich bin  müde.</i>`, WORDS, "de-DE"), []);
assert.deepEqual(unmarkedIn("das M&auml;dchen", ["das Mädchen"], "de-DE"), []);
assert.deepEqual(unmarkedIn("Hund", WORDS, "de-DE", "de-DE"), [], "német alapnyelvű szövegben (speechLang) jelölés nélkül is jó");
const task = { q: `<b>Mit jelent?</b> ${de("der Hund")}`, speech: "der Hund", speechLang: "de-DE", hint: "Gondolj a Hund szóra!",
  steps: [`${de("der Hund")} = kutya`, "A helyes: der Hund"], helpSteps: ["Hund"], rule: `Mindig ${de("der")}.`, why: v => v === "macska" ? "Hand" : null, solution: "kutya" };
assert.deepEqual(unmarkedForeign(task, WORDS, "de-DE"), [
  { field: "hint", phrase: "Hund" }, { field: "steps[1]", phrase: "der Hund" }, { field: "steps[1]", phrase: "Hund" }, { field: "helpSteps[0]", phrase: "Hund" }]);
assert.deepEqual(unmarkedForeign({ ...task, why: () => "Ez a Hand" }, ["Hand"], "de-DE"), [{ field: "why()", phrase: "Hand" }]);
assert.deepEqual(unmarkedForeign({ q: "Hund" }, ["Hund"], "de-DE"), [{ field: "q", phrase: "Hund" }]);
assert.deepEqual(unmarkedForeign({ q: "Hund", speechLang: "de-DE" }, ["Hund"], "de-DE"), []);
assert.deepEqual(unmarkedForeign({ why: () => { throw new Error("x"); } }, ["Hund"], "de-DE"), []);
assert.deepEqual(badLangCodes(`<span lang="de-DE">a</span><b lang='német'>b</b><i lang=xx_YY>c</i>`), ["német", "xx_YY"]);
console.log("Jelöletlen idegen szöveg keresése – rendben.");

// --- a minta szótanuló (a német gyakorló kiindulópontja): minden német szó jelölve ---
import { PACK } from "../js/pack/index.js";
import { WORDS as MINTA } from "../js/pack/words.js";
import { normalizePack } from "../js/core/pack-contract.js";
import { makeRng } from "../js/core/rng.js";
const p = normalizePack(PACK), phrases = MINTA.flatMap(w => [w.de, `${w.art} ${w.de}`]);
let n = 0;
for (const T of p.topics) for (const w of MINTA) for (let level = 1; level <= 3; level++) {
  const t = p.makeTask({ topic: T.id, sub: w.de, level }, makeRng(n++), { words: {}, prefs: {} });
  assert.deepEqual(unmarkedForeign(t, phrases, "de-DE"), [], `${T.id} · ${w.de}`);
}
console.log(`Minta csomag: ${n} feladat, minden német szó jelölve – rendben.`);

// --- a felolvasó: darabonként, a darab nyelvének hangjával ---
const spoken = [];
globalThis.window = { speechSynthesis: true };
globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
globalThis.speechSynthesis = { cancel() { spoken.length = 0; }, getVoices: () => [{ name: "Mariska", lang: "hu-HU" }, { name: "Anna", lang: "de-DE" }], speak: u => spoken.push(u) };
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { C, speak } = await import("../js/shell/ctx.js");
C.game = { speechLang: "hu-HU" }; C.pack = p;
speak(`📖 Mit jelent? ${de("der Hund")}`);
assert.deepEqual(spoken.map(u => [u.text, u.lang, u.voice && u.voice.name]), [["Mit jelent?", "hu-HU", "Mariska"], ["der Hund", "de-DE", "Anna"]]);
speak("der Hund", "de-DE");
assert.deepEqual(spoken.map(u => [u.text, u.lang, u.voice && u.voice.name]), [["der Hund", "de-DE", "Anna"]]);
speak("🎉"); assert.equal(spoken.length, 0, "üres szöveget nem mond");
console.log("Felolvasó: nyelvenkénti hangok – rendben.");
