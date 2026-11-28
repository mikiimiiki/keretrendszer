// A felolvasó nem mondja ki az emojikat, jeleket és a HTML-jelölést (speechClean)
import assert from "node:assert/strict";
import { speechClean } from "../js/core/dom.js";
const cases = [
  ["📏 Szabály: az -ít végű igékben mindig hosszú í van.", "Szabály: az -ít végű igékben mindig hosszú í van."],
  ["<b>Fejlődtél!</b> 🌱 Ez korábban nehezen ment", "Fejlődtél! Ez korábban nehezen ment"],
  ["Szuper! 🦉", "Szuper!"], ["⚠️ Kivétel: a(z) „kapu”", "Kivétel: a „kapu”"],
  ["Nézzük meg együtt! 🧑‍🚀", "Nézzük meg együtt!"], ["kassza → ssz 👍🏽", "kassza ssz"], ["🇭🇺 magyar", "magyar"],
  ["Mennyi 3 + 4? Írd be: 7 vagy 8", "Mennyi 3 + 4? Írd be: 7 vagy 8"], ["Kérdés ( 🎯 ) itt", "Kérdés () itt"], ["🎉🎉", ""],
];
for (const [inp, out] of cases) assert.equal(speechClean(inp), out, inp);
console.log("Felolvasás: emojik és jelek nélkül – rendben.");

// „a” vagy „az” a következő szó kiejtése szerint – a(z) helyett
import { aAz, fixArticles } from "../js/core/dom.js";
for (const [w, want] of [["ujj", "az"], ["kapu", "a"], ["„Űrhajós”", "az"], ["Betűvadász", "a"], ["1", "az"], ["5", "az"], ["50", "az"], ["2", "a"], ["10", "a"], ["1000", "az"], ["100", "a"], ["<b>ősz</b>", "az"], ["km", "a"]]) assert.equal(aAz(w), want, w);
assert.equal(aAz("ujj", true), "Az");
assert.equal(fixArticles("Meg kell jegyezni: a(z) „ujj” szóban, a(z) „kapu” kivétel. A(z) 5 almából"), "Meg kell jegyezni: az „ujj” szóban, a „kapu” kivétel. Az 5 almából");
assert.equal(speechClean("🧠 Meg kell jegyezni: a(z) „ujj” szóban"), "Meg kell jegyezni: az „ujj” szóban");
console.log("a / az: rendben.");
