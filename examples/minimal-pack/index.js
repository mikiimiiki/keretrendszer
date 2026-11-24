// Minimális tananyag: egy ÚJ játékban a js/pack/index.js helyére másolható.
// Mentés, pontozás, jutalom és játékosadat-átalakítás nem kell hozzá – ezt a váz végzi.
export const PACK = {
  contractVersion: 1,
  version: '1.0.0',
  id: 'minimal-addition',
  topics: [{id:'addition',name:'Összeadás'}],
  makeTask(item,rng) {
    const saved=typeof item.sub==='string' && /^([1-9]),([1-9])$/.exec(item.sub);
    const a=saved?Number(saved[1]):rng.int(1,9), b=saved?Number(saved[2]):rng.int(1,9), answer=String(a+b);
    return {
      sub:`${a},${b}`, q:`Mennyi ${a} + ${b}?`, correctText:answer,
      check:value=>({ok:String(value).trim()===answer}),
      render(box,io) {
        const input=box.ownerDocument.createElement('input');
        input.className='ans-in';input.inputMode='numeric';input.setAttribute('aria-label','Válasz');box.append(input);input.focus();
        return {
          read:()=>input.value.trim() || null, auto:false, empty:'Írd be az eredményt!',
          markWrong:()=>input.classList.add('wrong'),
          markRight:()=>input.classList.add('right'),
          lock:()=>{input.disabled=true;},
          showCorrect:()=>{input.value=answer;input.classList.add('right');}
        };
      }
    };
  }
};
