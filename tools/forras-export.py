#!/usr/bin/env python3
# ===== Forrásfájlok exportja egyetlen Markdown-fájlba =====
# Egy git-repó összes követett szöveges fájlját egy .md fájlba gyűjti, mindegyik előtt az elérési úttal:
#
#   # js/main.js
#
#   ```javascript
#   …a fájl teljes tartalma…
#   ```
#
# Ha a fájlban magában is van ``` (pl. README), hosszabb keretet kap (````), hogy a blokk ne törjön el.
# Visszaalakítás: tools/forras-import.py
#
# Használat (bármelyik mappából):
#   python tools/forras-export.py <repó mappa> <kimenet.md> [cím]
# Példa:
#   python tools/forras-export.py ../Massalhangzok ../Massalhangzok_forras.md "Helyesírás Kaland"
import os, re, subprocess, sys

LANG = {"js": "javascript", "mjs": "javascript", "css": "css", "html": "html", "json": "json", "md": "markdown",
        "py": "python", "txt": "text", "svg": "xml", "webmanifest": "json", "gitignore": "text"}


def git(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def main():
    if len(sys.argv) < 3:
        sys.exit("Használat: python forras-export.py <repó mappa> <kimenet.md> [cím]")
    repo, out = sys.argv[1], sys.argv[2]
    title = sys.argv[3] if len(sys.argv) > 3 else os.path.basename(os.path.abspath(repo))
    files = [f for f in git(repo, "ls-files").splitlines() if f]
    commit = git(repo, "log", "-1", "--format=%h %cd", "--date=format:%Y-%m-%d %H:%M").strip()
    parts = [f"# {title} – forrásfájlok\n\nRepó: `{os.path.basename(os.path.abspath(repo))}` · commit: `{commit}` · {len(files)} fájl\n"]
    skipped = []
    for f in files:
        try:
            text = open(os.path.join(repo, f), encoding="utf-8").read().replace("\r\n", "\n")
        except UnicodeDecodeError:
            skipped.append(f)  # bináris fájl (pl. kép): nem fér egy szöveges .md-be
            continue
        base = os.path.basename(f)
        ext = base.rsplit(".", 1)[-1].lower() if "." in base.strip(".") else base.lower().lstrip(".")
        lang = LANG.get(ext, "json" if base == "KERET_VERZIO" else "text")
        longest = max([len(m) for m in re.findall(r"`+", text)] + [0])
        fence = "`" * max(3, longest + 1)
        parts.append(f"# {f}\n\n{fence}{lang}\n{text.rstrip(chr(10))}\n{fence}\n")
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(parts))
    print(f"✓ {out}: {len(files) - len(skipped)} fájl, {os.path.getsize(out) // 1024} KB"
          + (f"\n  Kihagyva (nem szöveges): {', '.join(skipped)}" if skipped else ""))


if __name__ == "__main__":
    main()
