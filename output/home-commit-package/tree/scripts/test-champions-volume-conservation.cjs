'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {projectDocumentedTeam}=require('./champions/current-season-offline');
const {scaleShotProjections}=require('./champions/player-volume-utils');
const {conserveTeamVolume}=require('./champions/substitute-minutes');
const dataset=JSON.parse(fs.readFileSync('data/normalized/champions-md04-probable-individuals-2026-27.json'));
let preserved=0,released=[];
for(const f of dataset.fixtures)for(const t of f.teams){
 const old=t.reconciliation,raw=old.players.length?old.players:old.diagnostic?.unapprovedRaw||[];
 if(!raw.length)continue;
 const ids=new Set(raw.map(p=>p.playerId));
 const input={teamId:t.teamId,lineupVerified:true,benchVerified:true,targetShots:old.targetShots,targetSOT:old.targetSOT,players:t.players.filter(p=>ids.has(p.playerId)).map(p=>({playerId:p.playerId,roleKey:p.role||p.uefaRole,expectedMinutes:p.expectedMinutes,per90:{shots:p.baseline.candidate.shots,shotsOnTarget:p.baseline.candidate.sot}}))};
 const before=structuredClone(input),result=projectDocumentedTeam(input);
 assert.deepEqual(input,before);assert.deepEqual(projectDocumentedTeam(input),result);
 if(old.status==='offline-conditional-only'){assert.deepEqual(result.players,old.players,t.teamId);preserved++;}
 if(result.players.length){
  assert(result.players.every(p=>Number.isFinite(p.shots)&&Number.isFinite(p.sot)&&p.sot>=0&&p.sot<=p.shots));
  for(const [key,target,field]of [['shots',input.targetShots,'shots'],['shotsOnTarget',input.targetSOT,'sot']]){
   assert(Math.abs(result.players.reduce((s,p)=>s+p[field],0)-target)<=0.020000001,t.teamId);
   if(result.conservationApplied){const expected=conserveTeamVolume(scaleShotProjections(input.players,key,target,4),target);for(const p of result.players)assert.equal(p[field],expected.find(x=>x.player.playerId===p.playerId).projection);}
  }
  if(!old.players.length)released.push({fixtureId:f.fixtureId,team:t.teamId});
 }
}
const real=dataset.fixtures.flatMap(f=>f.teams).find(t=>t.teamId==='real-madrid');
assert(real.reconciliation.players.length||released.some(t=>t.team==='real-madrid'));
const synthetic={teamId:'real-madrid',lineupVerified:true,benchVerified:true,targetShots:10,targetSOT:4,players:[{playerId:'p',expectedMinutes:90,roleKey:'forward',per90:{shots:2,shotsOnTarget:1}}]};
const conserved=projectDocumentedTeam(synthetic);
assert.equal(conserved.conservationApplied,true);assert.equal(conserved.players[0].shots,10);assert.equal(conserved.players[0].sot,4);
assert.equal(projectDocumentedTeam({...synthetic,targetSOT:11}).status,'blocked-team-volumes');
assert.equal(projectDocumentedTeam({...synthetic,players:[{...synthetic.players[0],per90:{shots:0,shotsOnTarget:0}}]}).players.length,0);
assert.equal(projectDocumentedTeam({...synthetic,targetSOT:5,players:[
 {playerId:'a',roleKey:'forward',expectedMinutes:90,per90:{shots:1,shotsOnTarget:1}},
 {playerId:'b',roleKey:'forward',expectedMinutes:90,per90:{shots:9,shotsOnTarget:0}}
]}).status,'blocked-existing-reconciliation-limit','Conservation must not force SOT above player shots');
assert(preserved>0);
console.log(JSON.stringify({preserved,released,inputsUnchanged:true,totalsConserved:true}));
