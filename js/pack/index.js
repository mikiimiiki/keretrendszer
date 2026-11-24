// ===== MINTA feladatcsomag: szótanuló (a német gyakorló kiindulópontja) =====
// Ez a fájl a csomag-szerződést mutatja be (lásd README.md). Egy új játékhoz ezt a mappát kell lecserélni;
// a váz (js/shell) és a keret (js/core) változatlan marad.
import { el, btn, escHtml } from "../core/dom.js";
import { newItem, srsStep, accuracy, isDue } from "../core/srs.js";
import { dayNum } from "../core/dates.js";
import { WORDS } from "./words.js";

const TOPICS = [
  { id: "jelentes", name: "Mit jelent?", icon: "📖", color: "#2563eb", place: "Szójelentés", sub: "Válaszd ki a magyar jelentést!" },
  { id: "nevelo", name: "der, die vagy das?", icon: "🏷️", color: "#db2777", place: "Névelők", sub: "Melyik névelő illik a szóhoz?" },
  { id: "iras", name: "Írd le németül!", icon: "✍️", color: "#0d9488", place: "Helyesírás", sub: "Írd be a német szót!" },
];
const topicById = id => TOPICS.find(t => t.id === id) || TOPICS[0];
const shuffle = (a, rng) => rng.shuffle(a);
const word = w => WORDS.find(x => x.de === w);

// --- válaszadó felületek (a vezérlő: read, auto, empty, markWrong, markRight, lock, showCorrect, onKey) ---
function optionsUI(box, opts, correct, io) {
  const wrap = el("div", "opts"); let picked = null, clicked = null;
  const bs = opts.map((o, i) => { const b = btn("opt", escHtml(o), () => { if (!io.answering() || b.disabled) return; picked = o; clicked = b; io.submit(); }); b.setAttribute("aria-label", `${i + 1}. ${o}`); wrap.append(b); return b; });
  box.append(wrap);
  return {
    read: () => picked, auto: true, empty: "Válassz egyet!",
    markWrong: () => { if (clicked) { clicked.classList.add("wrong"); clicked.disabled = true; } },
    markRight: () => { if (clicked) clicked.classList.add("right"); },
    lock: () => bs.forEach(b => { b.disabled = true; }),
    showCorrect: () => bs.forEach(b => { if (b.textContent === correct) b.classList.add("right"); }),
    onKey: e => { if (/^[1-4]$/.test(e.key)) { const b = bs[+e.key - 1]; if (b) { b.click(); return true; } } return false; },
  };
}
function typingUI(box, correct, io) {
  const i = el("input", "minp"); i.autocomplete = "off"; i.spellcheck = false; i.placeholder = "Írd be…";
  i.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); io.submit(); } });
  box.append(i); setTimeout(() => i.focus(), 30);
  return {
    read: () => i.value.trim() || null, empty: "Írd be a szót!",
    markWrong: () => { i.classList.remove("wrong"); void i.offsetWidth; i.classList.add("wrong"); i.select(); },
    markRight: () => { i.classList.add("right"); i.disabled = true; },
    lock: () => { i.disabled = true; },
    showCorrect: () => { i.value = correct; i.classList.add("right"); },
  };
}

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
        render: (box, io) => optionsUI(box, shuffle(opts, rng), w.art, io), check: v => ({ ok: v === w.art }),
        hint: "A névelőt a szóval együtt érdemes megtanulni. Gondolj a többi hasonló végű szóra!", steps: [`A helyes alak: <b>${escHtml(w.art)} ${escHtml(w.de)}</b>`, `Jelentése: ${escHtml(w.hu)}`], speech: w.de };
    }
    if (T.id === "iras") {
      return { ...base, q: `<b>Írd le németül!</b><div class="word-display">${escHtml(w.hu)}</div>`, solution: w.de, correctText: w.de,
        render: (box, io) => typingUI(box, w.de, io), check: v => ({ ok: v === w.de }),
        hint: `A szó ${w.de.length} betűs, és „${escHtml(w.de[0])}” betűvel kezdődik. A főneveket nagybetűvel írjuk!`, steps: [`A helyes alak: <b>${escHtml(w.art)} ${escHtml(w.de)}</b>`], speech: w.hu };
    }
    const wrong = shuffle(WORDS.filter(x => x !== w), rng).slice(0, nOpt - 1).map(x => x.hu);
    return { ...base, q: `<b>Mit jelent?</b><div class="word-display">${escHtml(w.art)} ${escHtml(w.de)}</div>`, solution: w.hu, correctText: w.hu,
      render: (box, io) => optionsUI(box, shuffle([w.hu, ...wrong], rng), w.hu, io), check: v => ({ ok: v === w.hu }),
      hint: "Mondd ki hangosan! Hasonlít valamelyik magyar vagy angol szóra?", steps: [`${escHtml(w.art)} ${escHtml(w.de)} = <b>${escHtml(w.hu)}</b>`], speech: w.de };
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
