// ===== MINTA feladatcsomag: szótanuló (a német gyakorló kiindulópontja) =====
// Ez a fájl a csomag-szerződést mutatja be (lásd README.md). Egy új játékhoz ezt a mappát kell lecserélni;
// a váz (js/shell) és a keret (js/core) változatlan marad.
import { el, escHtml } from "../core/dom.js";
import { GERMAN_KEYS } from "../core/answer-spec.js";
import { newItem, srsStep, accuracy, isDue } from "../core/srs.js";
import { dayNum } from "../core/dates.js";
import { WORDS } from "./words.js";

const TOPICS = [
  { id: "jelentes", name: "Mit jelent?", icon: "📖", color: "#2563eb", place: "Szójelentés", sub: "Válaszd ki a magyar jelentést!" },
  { id: "nevelo", name: "der, die vagy das?", icon: "🏷️", color: "#db2777", place: "Névelők", sub: "Melyik névelő illik a szóhoz?" },
  { id: "iras", name: "Írd le németül!", icon: "✍️", color: "#0d9488", place: "Helyesírás", sub: "Írd be a német szót!" },
  { id: "tiles", name: "Betűkirakó", icon: "🔠", color: "#7c3aed", place: "Betűkirakó", sub: "Rakd ki a német szót!" },
];
const topicById = id => TOPICS.find(t => t.id === id) || TOPICS[0];
const shuffle = (a, rng) => rng.shuffle(a);
const word = w => WORDS.find(x => x.de === w);

// A minta felületi kód nélkül készül: a feladat egy felületleírást ad (answer: { kind, … }), a keret választja hozzá
// a közös felületet, és a megoldáshoz (solution) hasonlít. A német szót német hang olvassa fel (speechLang).
const DE = "de-DE";

export const PACK = {
  contractVersion: 1,
  version: "1.0.0",
  id: "minta-szotanulo",
  topics: TOPICS,
  levels: { count: 3, mode: "manual" },
  settings: [{ key: "level", group: "play", scope: "child", type: "radio", default: 1, label: "Nehézségi szint", help: "Hány válaszlehetőség legyen.", options: [{ value: 1, label: "Kezdő · 2 opció" }, { value: 2, label: "Haladó · 3 opció" }, { value: 3, label: "Mester · 4 opció" }] }],

  newUser: () => ({ words: {} }),
  normUser(u) { u.words = u.words || {}; Object.values(u.words).forEach(s => { s.last = Array.isArray(s.last) ? s.last : Object.values(s.last || {}); }); return u; },

  status(u, id) {
    const st = Object.entries(u.words || {}).filter(([k]) => k.startsWith(id + ":")).map(([, s]) => s);
    const n = st.reduce((a, s) => a + s.n, 0), ok = st.reduce((a, s) => a + s.ok, 0), p = n ? Math.round(ok / n * 100) : null;
    return { stars: n < 5 ? 0 : p >= 90 ? 3 : p >= 75 ? 2 : p >= 50 ? 1 : 0, level: 1, label: n ? `${p}% elsőre jó · ${n} feladat` : topicById(id).sub };
  },
  levelOf: u => +((u.prefs || {}).level) || 1,

  // a napi küldetés: az esedékes szavak elöl, a témák vegyesen (a lezárt témák nélkül)
  plan(u, n, rng, allowed) {
    const topics = TOPICS.map(t => t.id).filter(t => !allowed || allowed.includes(t));
    const due = WORDS.filter(w => topics.some(t => isDue(u.words[`${t}:${w.de}`], dayNum())));
    const rest = shuffle(WORDS.filter(w => !due.includes(w)), rng);
    return [...shuffle(due, rng), ...rest].slice(0, n).map((w, i) => ({ topic: topics[i % topics.length], sub: w.de }));
  },
  makeTask(item, rng, u) {
    const T = topicById(item.topic), w = word(item.sub) || rng.pick(WORDS), L = item.level || this.levelOf(u), nOpt = L + 1;
    const base = { topic: T.id, sub: w.de, level: L, meta: `${T.icon} ${T.name}`, viz: "", why: () => null, answerText: v => String(v), plainQ: w.de };
    if (T.id === "nevelo") {
      const opts = ["der", "die", "das"].slice(0, Math.max(2, nOpt)); if (!opts.includes(w.art)) opts[opts.length - 1] = w.art;
      return { ...base, q: `<b>Melyik névelő illik a szóhoz?</b><div class="word-display">… ${escHtml(w.de)}</div><p class="soft">(${escHtml(w.hu)})</p>`, solution: w.art, correctText: `${w.art} ${w.de}`,
        answer: { kind: "choice", options: shuffle(opts, rng), correct: w.art },
        hint: "A névelőt a szóval együtt érdemes megtanulni. Gondolj a többi hasonló végű szóra!", steps: [`A helyes alak: <b>${escHtml(w.art)} ${escHtml(w.de)}</b>`, `Jelentése: ${escHtml(w.hu)}`], speech: w.de, speechLang: DE };
    }
    if (T.id === "tiles") {
      return { ...base, q: `<b>Rakd ki németül!</b><div class="word-display">${escHtml(w.hu)}</div>`,
        answer: { kind: "tiles", word: w.de, clueText: w.hu, isVowel: ch => /[aeiouäöü]/i.test(ch) },
        hint: "Figyelj a kezdőbetűre és az ékezetekre! A helyükön lévő lapkák zölden maradnak.",
        steps: [`A helyes alak: <b>${escHtml(w.art)} ${escHtml(w.de)}</b>`], speech: w.hu };
    }
    if (T.id === "iras") {
      return { ...base, q: `<b>Írd le németül!</b><div class="word-display">${escHtml(w.hu)}</div>`,
        answer: { kind: "text", correct: w.de, className: "minp", placeholder: "Írd be…", empty: "Írd be a szót!", extraKeys: GERMAN_KEYS },
        hint: `A szó ${w.de.length} betűs, és „${escHtml(w.de[0])}” betűvel kezdődik. A főneveket nagybetűvel írjuk!`, steps: [`A helyes alak: <b>${escHtml(w.art)} ${escHtml(w.de)}</b>`], speech: w.hu };
    }
    const wrong = shuffle(WORDS.filter(x => x !== w), rng).slice(0, nOpt - 1).map(x => x.hu);
    return { ...base, q: `<b>Mit jelent?</b><div class="word-display">${escHtml(w.art)} ${escHtml(w.de)}</div>`,
      answer: { kind: "choice", options: shuffle([w.hu, ...wrong], rng), correct: w.hu },
      hint: "Mondd ki hangosan! Hasonlít valamelyik magyar vagy angol szóra?", steps: [`${escHtml(w.art)} ${escHtml(w.de)} = <b>${escHtml(w.hu)}</b>`], speech: w.de, speechLang: DE };
  },
  // a csomag saját haladása: szónkénti ismétlés (Leitner)
  record(u, task, r) { const k = `${task.topic}:${task.sub}`; srsStep((u.words[k] = u.words[k] || newItem()), r === 1, dayNum()); return null; },
  speechText: html => String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),

  badges: [{ id: "w20", ic: "📚", n: "20 helyes szó", t: u => Object.values(u.words || {}).reduce((a, s) => a + s.ok, 0) >= 20 }],
  metrics: { words: { label: "📚 megtanult szó", value: u => Object.values(u.words || {}).filter(s => (accuracy(s) ?? 0) >= 0.8 && s.n >= 3).length } },

  help(id) { const T = topicById(id); return { title: `${T.icon} ${T.name}`, subtitle: T.sub, about: "", items: [], example: "", tip: "" }; },
  topicLabel: id => { const T = topicById(id); return `${T.icon} ${T.name}`; },
  subLabel: (id, sub) => sub || "",
  parentTopics(box, u) { box.append(el("div", null, TOPICS.map(t => `<p><b>${t.icon} ${escHtml(t.name)}</b>: ${escHtml(this.status(u, t.id).label)}</p>`).join(""))); },
  collectionTabs: [],
};
