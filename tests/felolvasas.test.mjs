// A felolvasó nem mondja ki az emojikat, jeleket és a HTML-jelölést (speechClean)
import assert from "node:assert/strict";
import { speechClean } from "../js/core/dom.js";
const cases = [
  ["📏 Szabály: az -ít végű igékben mindig hosszú í van.", "Szabály: az -ít végű igékben mindig hosszú í van."],
  ["<b>Fejlődtél!</b> 🌱 Ez korábban nehezen ment", "Fejlődtél! Ez korábban nehezen ment"],
  ["Szuper! 🦉", "Szuper!"], ["⚠️ Kivétel: a(z) „kapu”", "Kivétel: a(z) „kapu”"],
  ["Nézzük meg együtt! 🧑‍🚀", "Nézzük meg együtt!"], ["kassza → ssz 👍🏽", "kassza ssz"], ["🇭🇺 magyar", "magyar"],
  ["Mennyi 3 + 4? Írd be: 7 vagy 8", "Mennyi 3 + 4? Írd be: 7 vagy 8"], ["Kérdés ( 🎯 ) itt", "Kérdés () itt"], ["🎉🎉", ""],
];
for (const [inp, out] of cases) assert.equal(speechClean(inp), out, inp);
console.log("Felolvasás: emojik és jelek nélkül – rendben.");
