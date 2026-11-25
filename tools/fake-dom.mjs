// ===== Kis szimulált DOM a tananyag-ellenőrzőhöz (Node.js, böngésző nélkül) =====
// Csak annyit tud, amennyit a feladatfelületek használnak: elemek, osztályok, attribútumok, események, egyszerű
// szelektorok. Nem böngészőteszt: elrendezést, stílust, fókuszt és valódi érintést nem vizsgál.
class FakeEvent extends Event {
  constructor(type, target, init = {}) { super(type, { cancelable: true, bubbles: !!init.bubbles }); this._target = target; for (const [k, v] of Object.entries(init)) if (!(k in Event.prototype)) this[k] = v; }
  get target() { return this._target; }
}
function parseCompound(s) {
  const out = { tag: null, id: null, cls: [], attrs: [] };
  s = s.replace(/:not\([^)]*\)/g, "").replace(/:[\w-]+(\([^)]*\))?/g, "");
  for (const m of s.matchAll(/([#.]?)([\w-]+)|\[([\w-]+)(?:=['"]?([^'"\]]*)['"]?)?\]/g)) {
    if (m[3]) out.attrs.push([m[3], m[4]]);
    else if (m[1] === "#") out.id = m[2]; else if (m[1] === ".") out.cls.push(m[2]); else out.tag = m[2].toUpperCase();
  }
  return out;
}
const matchCompound = (el, c) => (!c.tag || el.tagName === c.tag) && (!c.id || el.id === c.id)
  && c.cls.every(k => el.classList.contains(k)) && c.attrs.every(([k, v]) => el.hasAttribute(k) && (v == null || el.getAttribute(k) === v));
function matches(el, selector) {
  return selector.split(",").some(sel => {
    const parts = sel.trim().split(/\s+/).map(parseCompound);
    if (!matchCompound(el, parts.at(-1))) return false;
    let node = el.parentNode;
    for (let i = parts.length - 2; i >= 0; i--) { while (node && !(node.tagName && matchCompound(node, parts[i]))) node = node.parentNode; if (!node) return false; node = node.parentNode; }
    return true;
  });
}
class ClassList {
  constructor(el) { this.el = el; }
  get list() { return this.el.className.split(/\s+/).filter(Boolean); }
  contains(c) { return this.list.includes(c); }
  add(...cs) { this.el.className = [...new Set([...this.list, ...cs])].join(" "); }
  remove(...cs) { this.el.className = this.list.filter(c => !cs.includes(c)).join(" "); }
  toggle(c, force) { const on = force ?? !this.contains(c); if (on) this.add(c); else this.remove(c); return on; }
}
class FakeElement extends EventTarget {
  constructor(tag, doc) {
    super(); this.tagName = String(tag).toUpperCase(); this.ownerDocument = doc; this.childNodes = []; this.parentNode = null;
    this.className = ""; this.id = ""; this.attributes = {}; this.style = {}; this.dataset = {}; this.value = ""; this.disabled = false;
    this._html = ""; this._text = ""; this.classList = new ClassList(this); this.offsetWidth = 0; this.offsetParent = null;
  }
  get children() { return this.childNodes; }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes.at(-1) || null; }
  get isConnected() { return true; }
  _adopt(n) { if (typeof n === "string") { const t = new FakeElement("#text", this.ownerDocument); t._text = n; n = t; } n.parentNode?._detach(n); n.parentNode = this; return n; }
  _detach(n) { const i = this.childNodes.indexOf(n); if (i >= 0) this.childNodes.splice(i, 1); n.parentNode = null; }
  append(...ns) { for (const n of ns) this.childNodes.push(this._adopt(n)); }
  appendChild(n) { this.append(n); return n; }
  prepend(...ns) { this.childNodes.unshift(...ns.map(n => this._adopt(n))); }
  insertBefore(n, ref) { const a = this._adopt(n), i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(a); else this.childNodes.splice(i, 0, a); return n; }
  replaceChildren(...ns) { this.childNodes.forEach(c => { c.parentNode = null; }); this.childNodes = []; this._html = ""; this._text = ""; this.append(...ns); }
  remove() { this.parentNode?._detach(this); }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  set innerHTML(v) { this.replaceChildren(); this._html = String(v); }
  get innerHTML() { return this._html; }
  set textContent(v) { this.replaceChildren(); this._text = String(v ?? ""); }
  get textContent() { return this._text + this._html.replace(/<[^>]+>/g, "") + this.childNodes.map(c => c.textContent).join(""); }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === "id") this.id = String(v); if (k === "class") this.className = String(v); }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
  hasAttribute(k) { return k in this.attributes; }
  removeAttribute(k) { delete this.attributes[k]; }
  _all() { return this.childNodes.flatMap(c => (c.tagName === "#TEXT" ? [] : [c, ...c._all()])); }
  querySelectorAll(s) { return this._all().filter(e => matches(e, s)); }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  matches(s) { return matches(this, s); }
  closest(s) { for (let x = this; x && x.tagName; x = x.parentNode) if (matches(x, s)) return x; return null; }
  dispatchEvent(e) { const r = super.dispatchEvent(e); if (e instanceof FakeEvent && e.bubbles && this.parentNode) this.parentNode.dispatchEvent(new FakeEvent(e.type, e.target, { bubbles: true })); return r; }
  click() { if (!this.disabled) this.dispatchEvent(new FakeEvent("click", this, { bubbles: true })); }
  focus() { this.ownerDocument.activeElement = this; }
  blur() {} select() {} scrollIntoView() {} setSelectionRange() {}
  getBoundingClientRect() { return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }; }
}
export function installFakeDom() {
  const doc = new EventTarget();
  Object.assign(doc, { activeElement: null, createElement: tag => new FakeElement(tag, doc), createTextNode: t => { const n = new FakeElement("#text", doc); n._text = String(t); return n; } });
  doc.body = doc.createElement("body"); doc.activeElement = doc.body;
  doc.getElementById = id => doc.body.querySelector("#" + id); doc.querySelector = s => doc.body.querySelector(s); doc.querySelectorAll = s => doc.body.querySelectorAll(s);
  globalThis.document = doc;
  return { doc, box: () => { const b = doc.createElement("div"); doc.body.append(b); return b; }, key: (k, o = {}) => new FakeEvent("keydown", null, { key: k, ...o }) };
}
