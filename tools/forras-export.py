#!/usr/bin/env python3
# ===== Forrásfájlok exportja egyetlen Markdown-fájlba =====
# Egy (vagy több) mappa összes szöveges fájlját egy .md fájlba gyűjti, mindegyik előtt az elérési úttal:
#
#   # js/main.js
#
#   ```javascript
#   …a fájl teljes tartalma…
#   ```
#
# Ha a fájlban magában is van ``` (pl. README), hosszabb keretet kap (````), hogy a blokk ne törjön el.
# Git-repóban a követett fájlok kerülnek bele; sima mappában az összes fájl (a .git, node_modules, __pycache__,
# reports mappák nélkül). Több mappánál az utak elé a mappa neve kerül (pl. matek/js/main.js).
# Visszaalakítás: tools/forras-import.py · Ablakos változat: tools/forras-export-ablak.pyw
#
# Használat (bármelyik mappából):
#   python tools/forras-export.py <mappa> <kimenet.md> [cím]
#   python tools/forras-export.py <mappa1> <mappa2> … --ki <kimenet.md> [--cim "Cím"]
# Példa:
#   python tools/forras-export.py ../Massalhangzok ../Massalhangzok_forras.md "Helyesírás Kaland"
import os, re, subprocess, sys

LANG = {"js": "javascript", "mjs": "javascript", "css": "css", "html": "html", "json": "json", "md": "markdown",
        "py": "python", "pyw": "python", "txt": "text", "svg": "xml", "webmanifest": "json", "gitignore": "text"}
SKIP_DIRS = {".git", "node_modules", "__pycache__", "reports", ".venv", "venv"}


def git(repo, *args):
    return subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True, encoding="utf-8", check=True).stdout


def is_repo(folder):
    try:
        return git(folder, "rev-parse", "--show-toplevel").strip() != ""
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def list_files(folder):
    """A mappa fájljai (relatív utak, / elválasztóval) és egy rövid leírás a forrásról (commit vagy „mappa”)."""
    if is_repo(folder):
        files = [f for f in git(folder, "ls-files").splitlines() if f]
        try:
            info = "commit: `" + git(folder, "log", "-1", "--format=%h %cd", "--date=format:%Y-%m-%d %H:%M").strip() + "`"
        except subprocess.CalledProcessError:
            info = "git-repó (még nincs commit)"
        return files, info
    files = []
    for root, dirs, names in os.walk(folder):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
        for n in sorted(names):
            files.append(os.path.relpath(os.path.join(root, n), folder).replace(os.sep, "/"))
    return files, "mappa (nem git-repó)"


def block(path, text):
    base = os.path.basename(path)
    ext = base.rsplit(".", 1)[-1].lower() if "." in base.strip(".") else base.lower().lstrip(".")
    lang = LANG.get(ext, "json" if base == "KERET_VERZIO" else "text")
    longest = max([len(m) for m in re.findall(r"`+", text)] + [0])
    fence = "`" * max(3, longest + 1)
    return f"# {path}\n\n{fence}{lang}\n{text.rstrip(chr(10))}\n{fence}\n"


def prefixes(folders):
    """Több mappánál egyedi előtag a mappa nevéből (azonos nevekhez _2, _3 …)."""
    seen, out = {}, []
    for f in folders:
        name = re.sub(r"[^\w.-]+", "_", os.path.basename(os.path.abspath(f))) or "mappa"
        seen[name] = seen.get(name, 0) + 1
        out.append(name if seen[name] == 1 else f"{name}_{seen[name]}")
    return out


def export(folders, out, title=None, progress=None):
    """Exportálás. Visszaad: {"files": db, "skipped": [kihagyott], "kb": méret}. progress(szöveg) – opcionális visszajelzés."""
    if isinstance(folders, str):
        folders = [folders]
    folders = [os.path.abspath(f) for f in folders]
    for f in folders:
        if not os.path.isdir(f):
            raise ValueError(f"Nem létező mappa: {f}")
    out_abs = os.path.abspath(out)
    multi = len(folders) > 1
    pre = prefixes(folders) if multi else [""]
    title = title or " + ".join(os.path.basename(f) for f in folders)
    parts, head, total, skipped = [], [], 0, []
    for folder, p in zip(folders, pre):
        files, info = list_files(folder)
        n = 0
        for f in files:
            full = os.path.join(folder, f)
            if os.path.abspath(full) == out_abs:
                continue  # a kimenet ne kerüljön önmagába
            try:
                text = open(full, encoding="utf-8").read().replace("\r\n", "\n")
            except (UnicodeDecodeError, OSError):
                skipped.append((p + "/" if p else "") + f)  # bináris fájl (pl. kép): nem fér egy szöveges .md-be
                continue
            parts.append(block((p + "/" if p else "") + f, text)); n += 1
        total += n
        head.append(f"- `{p or os.path.basename(folder)}` · {info} · {n} fájl")
        if progress:
            progress(f"{os.path.basename(folder)}: {n} fájl")
    if multi:
        top = (f"# {title} – teljes forrás\n\nVisszabontás: `python tools/forras-import.py <ez a fájl> <új, üres mappa>` – "
               f"a fájlok a mappák nevével kezdődő almappákba kerülnek.\n\n" + "\n".join(head) + "\n")
    else:
        top = f"# {title} – forrásfájlok\n\nRepó: `{os.path.basename(folders[0])}` · {head[0].split(' · ', 1)[1]}\n"
    os.makedirs(os.path.dirname(out_abs) or ".", exist_ok=True)
    with open(out_abs, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join([top] + parts))
    return {"files": total, "skipped": skipped, "kb": os.path.getsize(out_abs) // 1024, "out": out_abs}


def main():
    args = sys.argv[1:]
    if "--ki" in args:
        i = args.index("--ki"); out = args[i + 1]; del args[i:i + 2]
        title = None
        if "--cim" in args:
            j = args.index("--cim"); title = args[j + 1]; del args[j:j + 2]
        folders = args
    elif len(args) >= 2:
        folders, out, title = [args[0]], args[1], (args[2] if len(args) > 2 else None)
    else:
        sys.exit("Használat: python forras-export.py <mappa> <kimenet.md> [cím]\n"
                 "      vagy: python forras-export.py <mappa1> <mappa2> … --ki <kimenet.md> [--cim \"Cím\"]")
    if not folders:
        sys.exit("Adj meg legalább egy mappát.")
    r = export(folders, out, title)
    print(f"✓ {out}: {r['files']} fájl, {r['kb']} KB"
          + (f"\n  Kihagyva (nem szöveges): {', '.join(r['skipped'])}" if r["skipped"] else ""))


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    main()
