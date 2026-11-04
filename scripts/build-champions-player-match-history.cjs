'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {loadObservedShooting}=require('./champions/md3-observed-shooting.cjs');
const root=path.resolve(__dirname,'..');
function build(){
 const individuals=JSON.parse(fs.readFileSync(path.join(root,'data/normalized/champions-md04-probable-individuals-2026-27.json')));
 const teams=individuals.fixtures.flatMap(f=>f.teams);
 const observed=loadObservedShooting(root,teams),players={};let appearances=0;
 for(const [key,rows]of observed.history){
  const unique=new Map();
  for(const r of rows){
   assert(r.minutes>0&&r.minutes<=120&&r.sot>=0&&r.shots>=r.sot);
   const previous=unique.get(r.matchId);
   if(previous)assert.deepEqual(r,previous,'Conflicting history '+key+' '+r.matchId);
   unique.set(r.matchId,r);
  }
  const sorted=[...unique.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.matchId.localeCompare(b.matchId));
  if(sorted.length){players[key]=sorted;appearances+=sorted.length;}
 }
 const output={schemaVersion:1,season:'2026-27',observedThrough:observed.asOf,summary:{teams:teams.length,players:Object.keys(players).length,appearances},players};
 const file=path.join(root,'data/generated/champions-player-match-history.json'),body=JSON.stringify(output,null,2)+'\n';
 if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==body)fs.writeFileSync(file,body);
 console.log(JSON.stringify(output.summary));return output;
}
if(require.main===module)build();
module.exports={build};
