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

// 🔊 hangválasztás: női hang előnyben, a választott (ha van) nyer, más nyelvű hang nem jöhet
import { pickVoice, voicesFor, voiceGender, MALE_AUTO } from "../js/core/voices.js";
const V = (name, lang, localService = true) => ({ name, lang, localService });
const voices = [V("Microsoft Szabolcs - Hungarian (Hungary)", "hu-HU"), V("Google magyar", "hu-HU", false), V("Mariska", "hu-HU"), V("Anna", "de-DE"), V("Microsoft Stefan", "de-DE"), V("Samantha", "en-US")];
assert.equal(voiceGender(voices[0]), "férfi"); assert.equal(voiceGender(voices[2]), "női");
assert.equal(voiceGender(V("Microsoft Noémi Online (Natural) - Hungarian", "hu-HU", false)), "női");
assert.equal(pickVoice(voices, "hu-HU").name, "Mariska", "alapból női (helyi hang előnyben)");
assert.equal(pickVoice(voices, "hu-HU", "Microsoft Szabolcs - Hungarian (Hungary)").name, "Microsoft Szabolcs - Hungarian (Hungary)", "a választott nyer");
assert.equal(pickVoice(voices, "hu-HU", "Nincs ilyen").name, "Mariska", "nem létező választásnál automatikus");
assert.equal(pickVoice(voices, "de-DE", "Mariska").name, "Anna", "más nyelvhez az adott nyelv női hangja");
assert.equal(pickVoice([voices[0]], "hu-HU").name, "Microsoft Szabolcs - Hungarian (Hungary)", "ha nincs női, a meglévő");
assert.equal(pickVoice(voices, "fr-FR"), null); assert.equal(voicesFor(voices, "hu-HU").length, 3);
assert.equal(pickVoice(voices, "hu-HU", MALE_AUTO).name, "Microsoft Szabolcs - Hungarian (Hungary)", "automatikus férfi hang");
assert.equal(pickVoice(voices, "de-DE", MALE_AUTO).name, "Microsoft Stefan", "német férfi hang");
assert.equal(pickVoice([voices[2]], "hu-HU", MALE_AUTO).name, "Mariska", "ha nincs férfi, a meglévő");
console.log("Felolvasó hang: rendben.");
