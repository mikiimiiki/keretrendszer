#!/usr/bin/env python3
# ===== Forrásfájlok visszaállítása egy Markdown-fájlból =====
# A tools/forras-export.py által készített .md fájlból visszaállítja a könyvtárszerkezetet és a fájlokat.
# Minden „# elérési/út” fejléc utáni kódblokk tartalma a megfelelő helyre kerül (a mappák is létrejönnek).
#
# Használat:
#   python tools/forras-import.py <forrás.md> <célmappa> [--felulir] [--proba]
# Példa:
#   python tools/forras-import.py ../Massalhangzok_forras.md ../Massalhangzok_visszaallitva
#
#   --felulir  nem üres célmappába is ír (a meglévő, azonos nevű fájlokat felülírja)
#   --proba    csak kiírja, mit hozna létre, nem ír semmit
#
# Biztonság: a célmappán kívülre nem ír (abszolút út, „..” vagy meghajtóbetű esetén leáll), és előbb az egész
# fájlt ellenőrzi, csak utána ír. A sorvégek LF-ek lesznek; a git (core.autocrlf) ezt a megszokott módon kezeli.
import os, re, sys

# „# út” + üres sor + nyitó keret (legalább 3 backtick) + nyelv + tartalom + ugyanolyan hosszú záró keret
BLOCK = re.compile(r"^# (?P<path>[^\n]+)\n\n(?P<fence>`{3,})[^\n`]*\n(?P<body>.*?)\n(?P=fence)[ \t]*$", re.S | re.M)


def safe_path(root, rel):
    rel = rel.strip()
    if not rel or os.path.isabs(rel) or re.match(r"^[A-Za-z]:", rel) or rel.startswith(("/", "\\")):
        raise ValueError(f"nem relatív út: {rel!r}")
    parts = re.split(r"[\\/]+", rel)
    if any(p in ("", ".", "..") for p in parts):
        raise ValueError(f"tiltott útrész: {rel!r}")
    full = os.path.abspath(os.path.join(root, *parts))
    if os.path.commonpath([full, os.path.abspath(root)]) != os.path.abspath(root):
        raise ValueError(f"a célmappán kívülre mutat: {rel!r}")
    return full


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    if len(args) != 2:
        sys.exit("Használat: python forras-import.py <forrás.md> <célmappa> [--felulir] [--proba]")
    md, root = args
    text = open(md, encoding="utf-8").read().replace("\r\n", "\n")
    blocks = [(m.group("path"), m.group("body")) for m in BLOCK.finditer(text)]
    if not blocks:
        sys.exit("✗ Nem találtam fájlblokkot (# út + kódblokk) ebben a fájlban.")

    # ellenőrzés írás előtt
    seen, plan = set(), []
    for rel, body in blocks:
        try:
            full = safe_path(root, rel)
        except ValueError as e:
            sys.exit(f"✗ Leállok, semmit nem írtam: {e}")
        if full in seen:
            sys.exit(f"✗ Leállok, semmit nem írtam: kétszer szerepel: {rel}")
        seen.add(full)
        plan.append((rel, full, body + "\n"))

    if os.path.isdir(root) and os.listdir(root) and "--felulir" not in flags and "--proba" not in flags:
        sys.exit(f"✗ A célmappa nem üres: {root}\n  Adj meg egy új mappát, vagy használd a --felulir kapcsolót.")

    if "--proba" in flags:
        for rel, _, body in plan:
            print(f"  {rel}  ({len(body.encode('utf-8'))} B)")
        print(f"Próba: {len(plan)} fájl jönne létre itt: {os.path.abspath(root)}")
        return

    for rel, full, body in plan:
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(body)
    print(f"✓ {len(plan)} fájl visszaállítva ide: {os.path.abspath(root)}")


if __name__ == "__main__":
    main()
