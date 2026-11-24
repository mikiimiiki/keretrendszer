// Régi/új tananyag összevetése (csak olvas): node tools/pack-osszevetes.mjs <RÉGI projekt> <ÚJ projekt>. Csak mesterséges játékossal.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {normalizePack} from '../js/core/pack-contract.js';
const [before,after]=process.argv.slice(2);
if(!before||!after||resolve(before)===resolve(after))throw new Error('Két külön projektmappa szükséges: RÉGI ÚJ');
const load=(root,file)=>import(pathToFileURL(resolve(root,file)));
const {PACK:raw}=await load(before,'js/pack/index.js');
const {PACK:next}=await load(after,'js/pack/index.js');
const {newUser,normUser}=await load(after,'js/shell/user.js');
const {makeRng}=await load(after,'js/core/rng.js');
function seeded(seed,fn){const saved=Math.random;let n=seed;Math.random=()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};try{return fn();}finally{Math.random=saved;}}
const savedNow=Date.now;Date.now=()=>1800000000000;
try{
 const p=normalizePack(next),a=normUser(newUser('Synthetic','',raw),raw),b=normUser(newUser('Synthetic','',p),p);
 for(const u of [a,b])Object.assign(u,{pts:9000,owned:['synthetic-item'],claimed:{synthetic:true},goal:{gift:{due:'2026-11-23',picked:''}},rewards:[{id:'synthetic',done:false}]});
 assert.deepEqual(a,b);const ids=p.topics.map(t=>t.id);
 assert.deepEqual(seeded(55,()=>raw.plan(a,5,makeRng(55),ids)),seeded(55,()=>p.plan(b,5,makeRng(55),ids)));
 let count=0;
 for(const topic of ids)for(let seed=1;seed<=20;seed++){
  const item={topic,sub:null};
  const x=seeded(seed,()=>raw.makeTask({...item},makeRng(seed),a));
  const y=seeded(seed,()=>p.makeTask({...item},makeRng(seed),b));
  assert.equal(x.q,y.q);assert.equal(x.correctText,y.correctText);
  assert.deepEqual(x.check(''),y.check(''));assert.deepEqual(x.check(x.solution),y.check(y.solution));
  const ua=structuredClone(a),ub=structuredClone(b);
  assert.deepEqual(raw.record(ua,x,seed%3),p.record(ub,y,seed%3));
  delete ua.upd;delete ub.upd;assert.deepEqual(ua,ub);count++;
 }
 console.log('PASS '+raw.id+': '+count+' feladat, terv, rögzítés és jutalommezők összevetve.');
}finally{Date.now=savedNow;}
