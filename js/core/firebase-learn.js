// ===== A közös „learn” Firebase-projekt (1.19.0) – minden gyakorló játék ezt használja =====
// Egy család egyszer jön létre; egy új játék a belépés után magától megtalálja (memberOf).
// A játék adatai a families/{család}/apps/{cloudApp} ág alá kerülnek (a játék config.js-ében: cloudApp).
// Az apiKey nem titkos: a hozzáférést az adatbázis szabályai (database.rules.json) védik.
export const LEARN_FIREBASE = {
  apiKey: "AIzaSyAoi9VOyAxUNeJYCfbz4SNyE2l4EXN0Lyk",
  authDomain: "learn-18d3f.firebaseapp.com",
  databaseURL: "https://learn-18d3f-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "learn-18d3f",
  storageBucket: "learn-18d3f.firebasestorage.app",
  messagingSenderId: "57220874297",
  appId: "1:57220874297:web:e6b7a8b914d7fcd1864de8",
};
