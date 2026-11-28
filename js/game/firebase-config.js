// ===== MINTA: Firebase-beállítás – üres apiKey mellett az app helyi módban fut (felhő nélkül) =====
// Egy valódi játék a közös learn-projektet használja (1.19.0):
//   import { LEARN_FIREBASE } from "../core/firebase-learn.js";
//   export const FIREBASE_CONFIG = LEARN_FIREBASE;
// és a config.js-ben egy saját, egyedi cloudApp nevet ad meg (pl. "nemet").
export const FIREBASE_CONFIG = { apiKey: "", authDomain: "", databaseURL: "", projectId: "", appId: "" };
