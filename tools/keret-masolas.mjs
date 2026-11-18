// ===== A közös keret átmásolása egy appba, verziófájllal =====
// Használat (a keret-repó gyökeréből):
//   node tools/keret-masolas.mjs ../Felvételi_matek            → átmásolja a keretet, és megírja a KERET_VERZIO fájlt
//   node tools/keret-masolas.mjs ../Massalhangzok --check      → csak ellenőrzi, hogy az app keretmásolata naprakész-e
// A keret fájljai (KERET_FAJLOK) az appokban NEM szerkeszthetők – minden változás itt, a keret-repóban történik,
// utána ezzel a szkripttel kerül át. Az appok tests/keret.test.mjs tesztje jelzi, ha valaki kézzel átírta a másolatot.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { createHash } from "crypto";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = ["js/core", "js/shell"];
const SINGLE = ["css/style.css", "tests/keret.test.mjs"];

export function keretFajlok(root = ROOT) {
  return [...DIRS.flatMap(d => readdirSync(join(root, d)).filter(f => f.endsWith(".js")).sort().map(f => `${d}/${f}`)), ...SINGLE];
}
// Sorvégtől független ujjlenyomat (a git Windowson CRLF-re válthat)
export function ujjlenyomat(root, files) {
  const h = createHash("sha256");
  files.forEach(f => { h.update(f + "\n"); h.update(readFileSync(join(root, f), "utf8").replace(/\r\n/g, "\n")); });
  return h.digest("hex");
}

function main() {
  const [target, flag] = process.argv.slice(2);
  if (!target) { console.log("Használat: node tools/keret-masolas.mjs <app-mappa> [--check]"); process.exit(1); }
  const app = resolve(target), files = keretFajlok();
  const want = ujjlenyomat(ROOT, files);
  if (flag === "--check") {
    const missing = files.filter(f => !existsSync(join(app, f)));
    const have = missing.length ? null : ujjlenyomat(app, files);
    const ok = have === want;
    console.log(ok ? `✓ ${app}: a keret naprakész` : `✗ ${app}: a keret eltér${missing.length ? " (hiányzik: " + missing.join(", ") + ")" : ""} – futtasd: node tools/keret-masolas.mjs ${target}`);
    process.exit(ok ? 0 : 1);
  }
  files.forEach(f => { mkdirSync(dirname(join(app, f)), { recursive: true }); writeFileSync(join(app, f), readFileSync(join(ROOT, f))); });
  let commit = "";
  try { commit = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); } catch { /* nincs git */ }
  const pkg = JSON.parse(readFileSync(join(ROOT, "keret.json"), "utf8"));
  const info = { keret: "urkaland-keret", verzio: pkg.verzio, commit, datum: new Date().toISOString().slice(0, 10), ujjlenyomat: want, fajlok: files };
  writeFileSync(join(app, "KERET_VERZIO"), JSON.stringify(info, null, 2) + "\n");
  console.log(`✓ ${files.length} fájl átmásolva → ${app} (keret ${pkg.verzio}${commit ? " · " + commit : ""})`);
}
if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) main();
