// ===== Ismétlődő magyarázatok kiszűrése =====
// Hibás vagy tipp utáni válasznál ugyanaz a szabály ne jelenjen meg kétszer-háromszor
// (pl. tipp = 1. magyarázatlépés = „Miért?” sor = „Lehet, hogy itt csúszott el”).
// Az összevetés „sima szövegen” történik: HTML-jelölés, emojik, írásjelek, szóközök és kis-/nagybetű nélkül.
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
export const decodeEntities = s => String(s ?? "").replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, k) => ENTITIES[k]);
export const textKey = html => decodeEntities(String(html ?? "").replace(/<[^>]+>/g, " "))
  .replace(/[\p{Extended_Pictographic}\p{Regional_Indicator}\u{FE0F}\u{FE0E}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}]/gu, " ")
  .normalize("NFC").toLocaleLowerCase("hu")
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Ennél hosszabb szöveg akkor is ismétlésnek számít, ha egy másikban szó szerint benne van
// (rövid szövegnél nem: egy „7” vagy „das” még nem ugyanaz a magyarázat, mint egy lépés, amely tartalmazza).
export const CONTAIN_MIN = 20;
export function sameText(a, b) {
  const ka = textKey(a), kb = textKey(b);
  return !!ka && ka === kb;
}
// Benne van-e már (ugyanaz, vagy elég hosszú és szó szerint része) valamelyik szövegben a listából?
export function coveredBy(text, list) {
  const k = textKey(text);
  if (!k) return true;
  return (list || []).some(o => { const ko = textKey(o); return ko === k || (k.length >= CONTAIN_MIN && ` ${ko} `.includes(` ${k} `)); });
}
// Egyforma szövegekből csak az első marad (a sorrend megmarad)
export function uniqueTexts(list, already = []) {
  const seen = [...already], out = [];
  for (const t of list || []) { if (!textKey(t) || seen.some(s => sameText(s, t))) continue; seen.push(t); out.push(t); }
  return out;
}
