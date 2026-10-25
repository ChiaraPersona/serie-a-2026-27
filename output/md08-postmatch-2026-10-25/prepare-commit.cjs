const fs=require('fs'),cp=require('child_process'),path=require('path'),assert=require('assert/strict');
const dir='output/md08-postmatch-2026-10-25',out=dir+'/commit-staging';fs.mkdirSync(out,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),head=p=>JSON.parse(cp.execFileSync('git',['show','HEAD:'+p],{encoding:'utf8',maxBuffer:90e6})),eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function delta(base,next,target,label=''){
 if(eq(base,next))return target;
 if(eq(base,target))return structuredClone(next);
 if(Array.isArray(base)&&Array.isArray(next)&&Array.isArray(target)){
  const key=['matchId','id','refereeId','playerId','teamId'].find(k=>base.length&&[base,next,target].every(a=>a.every(v=>v&&typeof v==='object'&&typeof v[k]==='string')&&new Set(a.map(v=>v[k])).size===a.length));
  if(key){const r=structuredClone(target);for(const b of base){const n=next.find(v=>v[key]===b[key]);if(eq(b,n))continue;const ti=r.findIndex(v=>v[key]===b[key]);if(n===undefined){assert(ti>=0,label);r.splice(ti,1);}else{assert(ti>=0,label+' missing '+b[key]);r[ti]=delta(b,n,r[ti],label+'/'+b[key]);}}for(const n of next)if(!base.some(b=>b[key]===n[key])){assert(!r.some(t=>t[key]===n[key]),label);r.push(n);}return r;}
  assert.equal(base.length,next.length,label+' array length');assert.equal(target.length,base.length,label+' target length');return base.map((b,i)=>delta(b,next[i],target[i],label+'/'+i));
 }
 if(base&&next&&target&&typeof base==='object'&&typeof next==='object'&&typeof target==='object'){
  const r=structuredClone(target);for(const k of new Set([...Object.keys(base),...Object.keys(next)])){if(eq(base[k],next[k]))continue;if(!(k in next))delete r[k];else if(!(k in base)){assert(!(k in r)||eq(r[k],next[k]),label+'/'+k);r[k]=structuredClone(next[k]);}else r[k]=delta(base[k],next[k],r[k],label+'/'+k);}return r;
 }
 assert(eq(base,target),label+' concurrent conflict');return structuredClone(next);
}
const staged=new Map(),put=(p,v,compact=false)=>{const f=out+'/'+p;fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v,null,compact?undefined:2)+'\n');staged.set(p,f);};
const snapshots={'data/normalized/matches.json':read(dir+'/matches-before.json'),'data/sources/match-results-2026-27.json':read(dir+'/results-before.json'),'data/sources/official-lineups-2026-27.json':read(dir+'/official-before.json'),'data/normalized/referee-history/md08-2026-27.json':read(dir+'/referees-before.json')};
for(const [f,b]of Object.entries(snapshots))put(f,delta(b,read(f),head(f),f));
for(const [name,b]of Object.entries(read(dir+'/teams-before.json'))){const f='data/teams/'+name,n=read(f);if(!eq(b,n))put(f,delta(b,n,head(f),f));}
// This overlay was clean at turn start; only the five new reports were appended.
put('data/sources/statmuse-player-stats-2026-27.json',read('data/sources/statmuse-player-stats-2026-27.json'),true);
const matches=read(out+'/data/normalized/matches.json'),matchMap=new Map(matches.map(m=>[m.id,m])),ids=new Set(read(dir+'/baseline.json').matchIds),index=read(out+'/data/teams/index.json');
const applyOfficial=v=>{const b=structuredClone(v),n=structuredClone(v);const canonical=read(out+'/data/sources/official-lineups-2026-27.json');if(n?.fixtures)n.fixtures=n.fixtures.map(f=>f.matchId==='napoli-roma-2026-27-md-08'?canonical.fixtures.find(c=>c.matchId===f.matchId):f);return n;};
for(const kind of ['matches','catalogs'])for(const file of fs.readdirSync('data/generated/readings/'+kind).filter(f=>f.endsWith('-md-08.json'))){const p='data/generated/readings/'+kind+'/'+file,h=head(p);h.finishedIds=matches.filter(m=>m.status==='finished').map(m=>m.id);if(kind==='matches'){
 h.matches=h.matches.map(m=>ids.has(m.id)?matchMap.get(m.id):m);
 h.teamDirectory.teams=index.teams;h.teamDirectory.generatedAt=index.generatedAt;for(const k of Object.keys(h.teamDirectory.officialLineups))if(index.officialLineups[k])h.teamDirectory.officialLineups[k]=index.officialLineups[k];
 if(h.artifacts?.['data/sources/official-lineups-2026-27.json'])h.artifacts['data/sources/official-lineups-2026-27.json']=applyOfficial(h.artifacts['data/sources/official-lineups-2026-27.json']);
 }put(p,h,true);}
const ri='data/generated/readings/index.json',r=head(ri);r.matches=r.matches.map(m=>ids.has(m.id)?matchMap.get(m.id):m);put(ri,r,true);
put('data/generated/schedina-index-2026-27.json',read('data/generated/schedina-index-2026-27.json'),true);
for(const p of ['docs/md08-postmatch-2026-10-25.md','scripts/update-results-md08-2026-10-25.cjs','scripts/test-md08-postmatch-2026-10-25.mjs','scripts/check-md08-postmatch-2026-10-25.cjs']){const f=out+'/'+p;fs.mkdirSync(path.dirname(f),{recursive:true});fs.copyFileSync(p,f);staged.set(p,f);}
fs.writeFileSync(dir+'/commit-manifest.json',JSON.stringify([...staged],null,2)+'\n');console.log('Prepared '+staged.size+' files, working files untouched');
