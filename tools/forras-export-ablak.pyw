#!/usr/bin/env python3
# ===== Forrásfájlok exportja Markdown-fájlba – ablakos felület =====
# Dupla kattintással indul (Windows: .pyw, nincs fekete konzolablak). Kiválasztod a mappá(ka)t és a kimeneti
# .md fájlt, és egy gombnyomással elkészül. Több mappa egy fájlba is mehet (pl. keret + két játék).
# A tényleges munkát a forras-export.py végzi; visszaalakítás: forras-import.py.
# Az utoljára használt mappákat és a kimenetet megjegyzi (a felhasználói mappában: .forras-export.json).
import datetime, importlib.util, json, os, queue, re, subprocess, sys, threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("forras_export", os.path.join(HERE, "forras-export.py"))
fx = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(fx)
MEMO = os.path.join(os.path.expanduser("~"), ".forras-export.json")


def load_memo():
    try:
        with open(MEMO, encoding="utf-8") as fh:
            m = json.load(fh)
        return {"folders": [f for f in m.get("folders", []) if os.path.isdir(f)], "out": m.get("out", ""), "title": m.get("title", "")}
    except Exception:
        return {"folders": [], "out": "", "title": ""}


def save_memo(folders, out, title):
    try:
        with open(MEMO, "w", encoding="utf-8") as fh:
            json.dump({"folders": folders, "out": out, "title": title}, fh, ensure_ascii=False, indent=2)
    except OSError:
        pass


if sys.platform.startswith("win"):
    try:  # éles betűk nagyított (pl. 125%-os) kijelzőn is
        import ctypes; ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        pass


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Forrás exportálása Markdown-fájlba")
        self.minsize(720, 480)
        memo = load_memo()
        pad = {"padx": 10, "pady": 4}

        ttk.Label(self, text="1. Melyik mappá(ka)t alakítsam át?", font=("Segoe UI", 11, "bold")).grid(row=0, column=0, columnspan=3, sticky="w", **pad)
        self.lst = tk.Listbox(self, height=6, selectmode=tk.EXTENDED, activestyle="none")
        self.lst.grid(row=1, column=0, columnspan=2, sticky="nsew", padx=10)
        side = ttk.Frame(self); side.grid(row=1, column=2, sticky="n", padx=(0, 10))
        ttk.Button(side, text="➕ Mappa hozzáadása…", width=24, command=self.add).pack(fill="x", pady=2)
        ttk.Button(side, text="➖ Kijelölt eltávolítása", command=self.remove).pack(fill="x", pady=2)
        ttk.Button(side, text="▲ Fel", command=lambda: self.move(-1)).pack(fill="x", pady=2)
        ttk.Button(side, text="▼ Le", command=lambda: self.move(1)).pack(fill="x", pady=2)
        ttk.Label(self, text="Git-repóban a követett fájlok, sima mappában minden szöveges fájl kerül bele. Több mappánál "
                             "a fájlok elé a mappa neve kerül.", foreground="#555", wraplength=600).grid(row=2, column=0, columnspan=3, sticky="w", **pad)

        ttk.Label(self, text="2. Hová mentsem?", font=("Segoe UI", 11, "bold")).grid(row=3, column=0, columnspan=3, sticky="w", **pad)
        self.out = tk.StringVar(value=memo["out"])
        ttk.Entry(self, textvariable=self.out).grid(row=4, column=0, columnspan=2, sticky="ew", padx=10)
        ttk.Button(self, text="Tallózás…", command=self.browse).grid(row=4, column=2, sticky="ew", padx=(0, 10))

        ttk.Label(self, text="3. Cím (elhagyható)", font=("Segoe UI", 11, "bold")).grid(row=5, column=0, columnspan=3, sticky="w", **pad)
        self.ttl = tk.StringVar(value=memo["title"])
        ttk.Entry(self, textvariable=self.ttl).grid(row=6, column=0, columnspan=3, sticky="ew", padx=10)

        bar = ttk.Frame(self); bar.grid(row=7, column=0, columnspan=3, sticky="ew", padx=10, pady=12)
        self.go = ttk.Button(bar, text="📄 Exportálás", command=self.run); self.go.pack(side="left")
        self.open_btn = ttk.Button(bar, text="📂 Megnyitás a mappában", command=self.reveal, state="disabled"); self.open_btn.pack(side="left", padx=8)
        self.status = tk.StringVar(value="Válassz mappát, aztán nyomd meg az Exportálás gombot.")
        ttk.Label(self, textvariable=self.status, wraplength=610, justify="left").grid(row=8, column=0, columnspan=3, sticky="w", padx=10, pady=(0, 10))

        self.columnconfigure(0, weight=1); self.columnconfigure(1, weight=1); self.rowconfigure(1, weight=1)
        for f in memo["folders"]:
            self.lst.insert("end", f)
        self.bind("<Return>", lambda e: self.run())

    def folders(self):
        return list(self.lst.get(0, "end"))

    def suggest_out(self):
        fs = self.folders()
        if not fs:
            return
        names = "_".join(re.sub(r"[^\w.-]+", "_", os.path.basename(f)) for f in fs[:3]) + ("_stb" if len(fs) > 3 else "")
        day = datetime.date.today().strftime("%Y%m%d")
        self.out.set(os.path.join(os.path.dirname(fs[0]), f"{names}_forras_{day}.md").replace("/", os.sep))

    def add(self):
        start = os.path.dirname(self.folders()[-1]) if self.folders() else os.path.expanduser("~")
        d = filedialog.askdirectory(title="Válassz egy mappát", initialdir=start, mustexist=True)
        if not d:
            return
        d = os.path.normpath(d)
        if d in self.folders():
            return
        self.lst.insert("end", d)
        if not self.out.get().strip() or os.path.basename(self.out.get()).count("_forras_"):
            self.suggest_out()

    def remove(self):
        for i in reversed(self.lst.curselection()):
            self.lst.delete(i)
        if os.path.basename(self.out.get()).count("_forras_"):
            self.suggest_out()

    def move(self, step):
        sel = self.lst.curselection()
        if len(sel) != 1:
            return
        i, j = sel[0], sel[0] + step
        if 0 <= j < self.lst.size():
            v = self.lst.get(i); self.lst.delete(i); self.lst.insert(j, v); self.lst.selection_set(j)

    def browse(self):
        cur = self.out.get().strip()
        f = filedialog.asksaveasfilename(title="Mentés ide", defaultextension=".md", filetypes=[("Markdown", "*.md"), ("Minden fájl", "*.*")],
                                         initialdir=os.path.dirname(cur) if cur else None, initialfile=os.path.basename(cur) if cur else "forras.md")
        if f:
            self.out.set(os.path.normpath(f))

    def run(self):
        fs, out, title = self.folders(), self.out.get().strip(), self.ttl.get().strip() or None
        if not fs:
            return messagebox.showwarning("Hiányzik a mappa", "Adj hozzá legalább egy mappát.")
        if not out:
            self.suggest_out(); out = self.out.get().strip()
        if not out.lower().endswith(".md"):
            out += ".md"; self.out.set(out)
        if os.path.exists(out) and not messagebox.askyesno("Már létezik", f"A fájl már létezik:\n{out}\n\nFelülírjam?"):
            return
        self.go.config(state="disabled"); self.open_btn.config(state="disabled")
        self.status.set("Dolgozom…")

        q = queue.Queue()   # a háttérszál csak ide ír; az ablakot a főszál frissíti (Tk-szabály)

        def work():
            try:
                r = fx.export(fs, out, title, progress=lambda t: q.put(("status", "Dolgozom… " + t)))
                msg = f"✓ Kész: {r['out']}\n{r['files']} fájl, {r['kb']} KB."
                if r["skipped"]:
                    msg += f"\nKihagyva (nem szöveges, pl. kép): {len(r['skipped'])} fájl – " + ", ".join(r["skipped"][:6]) + (" …" if len(r["skipped"]) > 6 else "")
                save_memo(fs, out, title or "")
                q.put(("done", msg, True))
            except Exception as e:  # pl. nincs jogosultság, hibás út
                q.put(("done", f"✗ Hiba: {e}", False))

        def poll():
            try:
                while True:
                    m = q.get_nowait()
                    if m[0] == "status":
                        self.status.set(m[1])
                    else:
                        return self.done(m[1], m[2])
            except queue.Empty:
                self.after(100, poll)
        threading.Thread(target=work, daemon=True).start()
        self.after(100, poll)

    def done(self, msg, ok):
        self.status.set(msg); self.go.config(state="normal")
        if ok:
            self.open_btn.config(state="normal")

    def reveal(self):
        out = os.path.abspath(self.out.get().strip())
        if sys.platform.startswith("win"):
            subprocess.run(["explorer", "/select,", out])
        elif sys.platform == "darwin":
            subprocess.run(["open", "-R", out])
        else:
            subprocess.run(["xdg-open", os.path.dirname(out)])


if __name__ == "__main__":
    App().mainloop()
