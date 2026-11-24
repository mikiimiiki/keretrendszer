// Egységes tesztindító: a mappa összes tests/*.test.mjs fájlja, mindegyik külön folyamatban. Használat: node tools/tesztek.mjs [app mappa]
import {readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=process.argv[2] ? resolve(process.argv[2]) : resolve(dirname(fileURLToPath(import.meta.url)),'..');
const reports=join(root,'reports','pack-contract');mkdirSync(reports,{recursive:true});
const results=[];
for(const name of readdirSync(join(root,'tests')).filter(n=>n.endsWith('.test.mjs')).sort()){
 const r=spawnSync(process.execPath,[join(root,'tests',name)],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024});
 writeFileSync(join(reports,name+'.log'),(r.stdout||'')+(r.stderr||'')+(r.error?.stack||''));
 results.push({test:name,status:r.status===0&&!r.error?'PASS':'FAIL',exitCode:r.status});
 console.log(results.at(-1).status+' '+name);
}
writeFileSync(join(reports,'results.json'),JSON.stringify(results,null,2)+'\n');
process.exitCode=results.some(r=>r.status==='FAIL')?1:0;
