'use strict';
// Use established aggregators; retain unrelated club records and every pre-match contract.
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const dir='output/torino-monza-md08-postmatch',read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,d)=>{fs.writeFileSync(p+'.tmp',JSON.stringify(d,null,2)+'\n');fs.renameSync(p+'.tmp',p);};
const run=(p,args=[])=>execFileSync(process.execPath,['--experimental-require-module',p,...args],{stdio:'inherit'});
const before=read(dir+'/teams-before.json');
run('scripts/team-pages/build.js');
for(const [file,original]of Object.entries(before)){
 if(['index.json','player-leaderboards.json'].includes(file))continue;
 const target='data/teams/'+file;
 if(!['torino.json','monza.json'].includes(file)){write(target,original);continue;}
 const next=read(target);
 for(const key of ['probableLineup','projectedLineup']){
  if(key in original)next[key]=original[key];else delete next[key];
 }
 write(target,next);
}
const index=read('data/teams/index.json');
index.teams=before['index.json'].teams.map(team=>['torino','monza'].includes(team.id)?{...team,lastUpdated:read('data/teams/'+team.id+'.json').lastUpdated}:team);
index.officialLineups=before['index.json'].officialLineups;
write('data/teams/index.json',index);
const archive='data/normalized/referee-history/md08-2026-27.json';
if(!fs.existsSync(dir+'/referees-before.json'))write(dir+'/referees-before.json',read(archive));
// Recreate the destination instead of overwriting a Windows-locked generated file.
const retainedArchive=dir+'/referees-last-build.json';
fs.renameSync(archive,retainedArchive);
try{run('scripts/build-referee-history-database.cjs',['--matchday','8','--as-of','2026-10-24','--manifest','data/raw/referee-stats/md08-history-2026-10-23/manifest.json','--include-current-season']);}
catch(error){fs.renameSync(retainedArchive,archive);throw error;}
const old=read(dir+'/referees-before.json'),next=read(archive),referee=read('data/normalized/matches.json').find(m=>m.id==='torino-monza-2026-27-md-08').refereeAssignment.referee.slug;
next.referees=old.referees.map(r=>r.refereeId===referee?next.referees.find(n=>n.refereeId===referee):r);write(archive,next);
assert(next.referees.find(r=>r.refereeId===referee).matches.some(m=>m.date==='2026-10-23'&&m.observations.some(o=>o.provenance.fixtureId==='torino-monza-2026-27-md-08')));
run('scripts/apply-official-starter-policy.js');
// --presentation-only refreshes projections without recalculating forecasts.
run('scripts/build-site.js',['--presentation-only','--matchday','8']);
console.log('Club/player aggregates, referee archive and MD8 browser projections refreshed.');
