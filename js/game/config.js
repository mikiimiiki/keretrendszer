// ===== MINTA játék paraméterei a közös vázhoz =====
// Egy új játéknál ezt kell átírni: cím, téma, szavak, alapértékek, Firebase, tárgyak, ünnepek, ajándékok.
import { PACK } from "../pack/index.js";
import { settingsDefs } from "../shell/settings-defs.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";
import * as ranks from "./ranks.js";
import * as catalog from "./cosmetics-catalog.js";
import * as events from "./events.js";
import * as gifts from "./gifts.js";
import { migrateFamily, migrateUser, newId } from "./migrate.js";

export const GAME = {
  id: "minta-szotanulo",
  title: "Szótanuló (minta)",
  settingsTitle: "⚙️ Szülői beállítások",
  storeKey: "minta_szotanulo_v1", simKey: "minta_szotanulo_sim",
  firebase: FIREBASE_CONFIG,      // üres apiKey → helyi mód
  serviceWorker: "",              // offline működéshez: "sw.js"
  bodyClass: "",                  // pl. "theme-light" világos témához (a játék saját CSS-ében)
  logo: "🚀", mascot: "🧑‍🚀",
  pointsIcon: "⭐", pointsName: "pont",
  topicWord: { one: "téma", many: "témák", acc: "témára", tab: "📚 Témák" },
  homeWord: "főmenü",
  praise: ["Szuper!", "Helyes! ⭐", "Telitalálat! 🎯", "Így kell ezt! 💪"],
  texts: {
    welcome: "Üdv a Szótanulóban! 🚀", pickAvatar: "Hogy hívnak? Válassz egy avatart is!",
    unlockHint: "🎁 Gyakorlással újabb avatarokat és hátteret nyithatsz ki!", go: "Indulás! 🚀",
    helloTodo: "Indulhat a mai küldetés?", helloDone: "A mai küldetés kész! 🌟",
    start: "🚀 Indítás", cont: "🚀 Folytatás", again: "🚀 Még egy kör", mission: "🚀 Napi küldetés", plus: "🚀 Plusz kör",
    explainTitle: "Nézzük meg együtt! 🧑‍🚀", sideIcon: "🧑‍🚀", helpTitle: "❓ Milyen témák vannak?",
    homeTip: "", playTip: "",
  },
  legendLine: "Te vagy a Legenda! 🌟",
  defaults: { goalTasks: 10, goalMin: 15, bigGoal: 30, freeTasks: 5 },
  speechLang: "hu-HU",
  ranks, catalog, events, gifts,
  migrate: { family: migrateFamily, user: migrateUser, newId },
};

export const SETTINGS = settingsDefs(GAME, PACK);
