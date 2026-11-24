import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePack,createRecordGate} from '../js/core/pack-contract.js';
import {makeRng} from '../js/core/rng.js';
import {newUser,normUser} from '../js/shell/user.js';
import {recordAnswer} from '../js/core/answers.js';
import {PACK as minimal} from '../examples/minimal-pack/index.js';
const base=()=>({contractVersion:1,version:'1.0',id:'test',topics:[{id:'a',name:'A'},{id:'b',name:'B'}],makeTask:item=>({q:'?',correctText:'2',render:()=>({read:()=>2,markWrong(){},markRight(){},lock(){},showCorrect(){}}),check:v=>({ok:v===2})})});
test('minimal contract supplies defaults without changing input',()=>{const raw=base(),p=normalizePack(raw);assert.equal(raw.plan,undefined);assert.equal(p.version,'1.0');assert.deepEqual(p.newUser(),{});assert.equal(p.record({},null,1),null);assert.equal(p.status({},'a').stars,0);assert.equal(p.help('a').title,'A');});
test('missing required members give named developer error',()=>{for(const field of ['id','topics','makeTask','version']){const raw=base();delete raw[field];assert.throws(()=>normalizePack(raw),/PACK/);}});
test('duplicate topics and future contract rejected',()=>{const raw=base();raw.topics.push(raw.topics[0]);assert.throws(()=>normalizePack(raw),/topics/);assert.throws(()=>normalizePack({...base(),contractVersion:2}),/contractVersion/);});
test('wrong optional hook type rejected at startup',()=>assert.throws(()=>normalizePack({...base(),record:true}),/record/));
test('default plan honors locks, size and empty allowed set',()=>{const p=normalizePack(base());assert.equal(p.plan({},10,makeRng(1),['b']).length,10);assert.ok(p.plan({},10,makeRng(1),['b']).every(i=>i.topic==='b'));assert.deepEqual(p.plan({},10,makeRng(1),[]),[]);assert.deepEqual(p.plan({},0,makeRng(1)),[]);});
test('custom plan cannot bypass locked topics',()=>{const p=normalizePack({...base(),plan:()=>[{topic:'a'}]});assert.throws(()=>p.plan({},1,makeRng(1),['b']),/plan.topic/);});
test('legacy hooks retain this binding',()=>{const raw=base();delete raw.contractVersion;delete raw.version;raw.levelOf=()=>2;raw.makeTask=function(i){return {...base().makeTask(i),level:this.levelOf()};};const p=normalizePack(raw);assert.equal(p.legacy,true);assert.equal(p.makeTask({topic:'a'},makeRng(1),{}).level,2);});
test('task defaults and checker result validation',()=>{const p=normalizePack(base()),t=p.makeTask({topic:'a'},makeRng(1),{});assert.equal(t.topic,'a');assert.equal(t.level,1);assert.equal(t.why(), '');assert.deepEqual(t.steps,['2']);assert.equal(t.check(2).ok,true);const bad=normalizePack({...base(),makeTask:i=>({...base().makeTask(i),check:()=>true})});assert.throws(()=>bad.makeTask({topic:'a'},makeRng(1),{}).check(2),/task.check/);});
test('invalid task fails before any score can be recorded',()=>{const u=newUser('Test','',null);const before=structuredClone(u);const p=normalizePack({...base(),makeTask:()=>({q:'?'})});assert.throws(()=>p.makeTask({topic:'a'},makeRng(1),u));assert.deepEqual(u,before);});
test('UI controller validation preserves custom methods',()=>{const t=normalizePack(base()).makeTask({topic:'a'},makeRng(1),{});const ui=t.render({},{});assert.equal(ui.read(),2);assert.equal(ui.onKey({key:'x'}),false);const raw=base();raw.makeTask=i=>({...base().makeTask(i),render:()=>({read:()=>2})});assert.throws(()=>normalizePack(raw).makeTask({topic:'a'},makeRng(1),{}).render({},{}),/ui/);});
test('per-task gate blocks duplicate common score registration',()=>{const u=newUser('Test','',null),gate=createRecordGate();const save=()=>{gate();recordAnswer(u,{topic:'a',r:1,pts:10,ms:100});};save();assert.throws(save,/TASK_ALREADY_RECORDED/);assert.equal(u.pts,10);assert.equal(u.total,1);});
test('minimal example works with common user and answer engine',()=>{const p=normalizePack(minimal),u=normUser(newUser('Test','',p),p);const item=p.plan(u,1,makeRng(1))[0],t=p.makeTask(item,makeRng(2),u);assert.equal(t.check(t.correctText).ok,true);recordAnswer(u,{topic:t.topic,r:1,pts:10,ms:100});p.record(u,t,1);assert.equal(u.pts,10);assert.equal(u.total,1);});
test('review plan retains metadata and topic restrictions',()=>{const p=normalizePack({...base(),review:{count:()=>1,plan:()=>[{topic:'a',seed:42}]}});assert.equal(p.review.count({}),1);assert.equal(p.review.plan({},1,makeRng(1),['a'])[0].seed,42);assert.throws(()=>p.review.plan({},1,makeRng(1),['b']));});

test('declared fallback allowed, undeclared fallback rejected',()=>{
 const raw={...base(),topicFallbacks:{a:['b']},makeTask:i=>({...base().makeTask(i),topic:'b'})};
 assert.equal(normalizePack(raw).makeTask({topic:'a'},makeRng(1),{}).topic,'b');
 delete raw.topicFallbacks;assert.throws(()=>normalizePack(raw).makeTask({topic:'a'},makeRng(1),{}),/task.topic/);
});
test('fallback declaration cannot name an unknown topic',()=>assert.throws(()=>normalizePack({...base(),topicFallbacks:{a:['unknown']}}),/topicFallbacks/));
