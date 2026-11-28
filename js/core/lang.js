// ===== 🌍 Nyelvenkénti felolvasás =====
// A feladat bármely szövegében (q, speech, hint, steps, rule, …) meg lehet jelölni az idegen nyelvű részt
// szabványos HTML-lel: <span lang="de-DE">das Haus</span>  (rövidebben: de("das Haus") vagy inLang("de-DE", …)).
// A felolvasó a szöveget nyelv szerinti darabokra bontja, és mindegyiket a saját nyelvű hanggal mondja.
import { speechClean } from "./dom.js";
import { decodeEntities } from "./dedupe.js";

export const LANG_CODE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
export const inLang = (lang, html) => `<span lang="${lang}">${html}</span>`;
export const de = html => inLang("de-DE", html);
export const sameLang = (a, b) => String(a || "").slice(0, 2).toLowerCase() === String(b || "").slice(0, 2).toLowerCase();

const VOID = new Set(["br", "hr", "img", "input", "wbr", "meta", "link", "area", "source", "col", "embed"]);
const TAG = /<\/?([a-zA-Z][\w-]*)\b([^>]*)>|<!--[\s\S]*?-->/g;
const langAttr = attrs => { const m = /\blang\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs || ""); return m ? (m[1] ?? m[2] ?? m[3]).trim() : null; };

// HTML → [{ lang, html }] darabok; a jelöletlen rész a defaultLang nyelvű. Az egymás melletti azonos nyelvű darabok összeolvadnak.
export function speechSegments(html, defaultLang) {
  const s = String(html ?? ""), out = [], stack = [{ tag: null, lang: defaultLang }];
  const push = piece => {
    if (!piece) return;
    const lang = stack[stack.length - 1].lang, prev = out[out.length - 1];
    if (prev && prev.lang === lang) prev.html += piece; else out.push({ lang, html: piece });
  };
  let last = 0, m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(s))) {
    push(s.slice(last, m.index)); last = TAG.lastIndex;
    if (!m[1]) continue;                                   // megjegyzés
    const tag = m[1].toLowerCase();
    if (m[0][1] === "/") {                                 // záró címke: a hozzá tartozó nyitóig lépünk vissza
      push(m[0]);
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
    } else if (VOID.has(tag) || /\/\s*$/.test(m[2])) push(m[0]);
    else { const l = langAttr(m[2]); stack.push({ tag, lang: l && LANG_CODE.test(l) ? l : stack[stack.length - 1].lang }); push(m[0]); }
  }
  push(s.slice(last));
  return out;
}

// Felolvasásra kész darabok: [{ lang, text }] – üres / csak jelekből álló darab nélkül.
// speechText: a csomag saját átalakítója (PACK.speechText), darabonként fut.
export function speechParts(html, defaultLang, speechText) {
  const conv = typeof speechText === "function" ? speechText : (x => String(x));
  const out = [];
  for (const seg of speechSegments(html, defaultLang)) {
    const text = speechClean(conv(seg.html)).replace(/^[,.;:!?)\]]+\s*/, "");   // az előző darabhoz tartozó írásjel nélkül
    if (!/[\p{L}\p{N}]/u.test(text)) continue;
    const prev = out[out.length - 1];
    if (prev && prev.lang === seg.lang) prev.text += " " + text; else out.push({ lang: seg.lang, text });
  }
  return out;
}

// A szöveg sima változata karakterenkénti nyelvvel (a jelöletlenség-ellenőrzéshez)
function langText(html, defaultLang) {
  let text = "", langs = [];
  for (const seg of speechSegments(html, defaultLang)) {
    const t = decodeEntities(seg.html.replace(/<[^>]+>/g, " ")).normalize("NFC");
    text += t; langs = langs.concat(Array(t.length).fill(seg.lang));
  }
  return { text, langs };
}
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");

// Hol szerepel a megadott idegen szövegek (szavak, mondatok) valamelyike nyelvjelölés nélkül egy HTML-szövegben?
// Egész szóra illeszt (a „Hand” nem találat a „Handschuh”-ban), kis- és nagybetű számít.
export function unmarkedIn(html, phrases, lang, defaultLang = "hu-HU") {
  const { text, langs } = langText(html, defaultLang), found = [];
  for (const p of new Set((phrases || []).map(x => String(x ?? "").normalize("NFC").trim()).filter(Boolean))) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escRe(p)}(?![\\p{L}\\p{N}])`, "gu");
    for (const m of text.matchAll(re)) {
      if (langs.slice(m.index, m.index + m[0].length).some((l, i) => !/\s/.test(m[0][i]) && !sameLang(l, lang))) { found.push(p); break; }
    }
  }
  return found;
}

// Egy feladat minden megjelenő / felolvasott szövegét átnézi: [{ field, phrase }] a jelöletlen idegen részekről.
// A kérdés és a speech alapnyelve a feladat speechLang-ja (ha van), a többié a játék nyelve (defaultLang).
// Használat egy játék tesztjében:  assert.deepEqual(unmarkedForeign(task, NEMET_SZAVAK, "de-DE"), []);
export function unmarkedForeign(task, phrases, lang, defaultLang = "hu-HU") {
  const t = task || {}, out = [], taskLang = t.speechLang || defaultLang;
  const fields = [["q", t.q, taskLang], ["speech", t.speech, taskLang], ["hint", t.hint, defaultLang], ["rule", t.rule, defaultLang]];
  (Array.isArray(t.steps) ? t.steps : []).forEach((s, i) => fields.push([`steps[${i}]`, s, defaultLang]));
  (Array.isArray(t.helpSteps) ? t.helpSteps : []).forEach((s, i) => fields.push([`helpSteps[${i}]`, s, defaultLang]));
  if (typeof t.why === "function") {
    for (const v of [t.solution === undefined ? undefined : [].concat(t.solution)[0], "\u0000rossz"]) {
      try { const w = t.why(v); if (typeof w === "string") fields.push(["why()", w, defaultLang]); } catch { /* a why hibáját a tananyag-ellenőrző jelzi */ }
    }
  }
  const seen = new Set();
  for (const [field, html, base] of fields) {
    if (typeof html !== "string") continue;
    for (const phrase of unmarkedIn(html, phrases, lang, base)) { const k = field + "\u0000" + phrase; if (!seen.has(k)) { seen.add(k); out.push({ field, phrase }); } }
  }
  return out;
}

// Rossz nyelvkódú lang-jelölések egy HTML-szövegben (pl. lang="német")
export const badLangCodes = html => [...String(html ?? "").matchAll(/<[a-zA-Z][^>]*\blang\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
  .map(m => (m[1] ?? m[2] ?? m[3]).trim()).filter(l => !LANG_CODE.test(l));
