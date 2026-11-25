// Minimális tananyag: egy ÚJ játékban a js/pack/index.js helyére másolható.
// Mentés, pontozás, jutalom és játékosadat-átalakítás nem kell hozzá – ezt a váz végzi.
// Felületi kód és ellenőrző sem kell: az answer-leírásból a keret választja a felületet, és a megoldáshoz hasonlít.
export const PACK = {
  contractVersion: 1,
  version: '1.0.0',
  id: 'minimal-addition',
  topics: [{id:'addition',name:'Összeadás'}],
  makeTask(item,rng) {
    const saved=typeof item.sub==='string' && /^([1-9]),([1-9])$/.exec(item.sub);
    const a=saved?Number(saved[1]):rng.int(1,9), b=saved?Number(saved[2]):rng.int(1,9);
    return {
      sub:`${a},${b}`, q:`Mennyi ${a} + ${b}?`,
      answer:{kind:'number',correct:a+b},
      // saját felület is adható: render(box,io) → { read(), … } – lásd docs/tananyagcsatlakozo.md
    };
  }
};
