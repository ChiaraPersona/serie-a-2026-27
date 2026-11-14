'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const {parseStatmuseHtml}=require('../../parse-statmuse-game');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
// Evidence extension only: never rewrites canonical events or invents open-play/SOT tags.
function enrich(root,dataset,manifest){
 const hashes={},contexts={},roles=[],matches=[];
 for(const match of dataset.matches){
  const source=manifest.sources.find(s=>s.fixtureId===match.fixtureId);
  if(!source)throw Error('MISSING_RAW_SOURCE '+match.fixtureId);
  const bytes=fs.readFileSync(path.join(root,source.rawSnapshot)),html=zlib.gunzipSync(bytes).toString('utf8');
  if(hash(Buffer.from(html))!==source.sha256)throw Error('RAW_HASH_MISMATCH '+match.fixtureId);
  hashes[source.rawSnapshot]=hash(bytes);const raw=parseStatmuseHtml(html);
  if(String(raw.gameData.gameId)!==String(source.providerFixtureId)||raw.playByPlay.gameDate!==match.date)throw Error('RAW_FIXTURE_MISMATCH');
  const providerTeams=new Map(['home','away'].map(side=>[String(raw.gameData[side+'Team'].teamId),match[side+'Team']]));
  const events=match.events.map(e=>{
   const sequence=Number(e.id.split(':').at(-1));
   const found=raw.playByPlay.events.filter(r=>r.type===e.type&&r.eventSequence===sequence&&String(r.playerId)===e.providerPlayerId&&providerTeams.get(String(r.teamId))===e.teamId);
   if(found.length!==1)throw Error('NONUNIQUE_EVENT_JOIN '+e.id);
   const r=found[0],side=match.homeTeam===e.teamId?'home':'away',lineup=raw.gameData[side+'Team'].players.filter(p=>String(p.playerId)===e.providerPlayerId);
   const formation=lineup.length===1&&lineup[0].starter===true?lineup[0].formation:null;
   contexts[r.shotContext||'UNKNOWN']=(contexts[r.shotContext||'UNKNOWN']||0)+1;
   if(e.playerId&&formation&&!roles.some(p=>p.fixtureId===match.fixtureId&&p.teamId===e.teamId&&p.playerId===e.playerId))roles.push({fixtureId:match.fixtureId,teamId:e.teamId,playerId:e.playerId,position:formation.position||null,alignment:formation.alignment||null,scope:'STARTING_FORMATION_NOT_IN_PLAY_TRACKING'});
   return {...e,rawShotContext:r.shotContext||null,phaseVerified:e.penalty?'penalty':null,onTargetVerified:null,startingPosition:formation?.position||null,startingAlignment:formation?.alignment||null};
  });matches.push({...match,events});
 }
 return {dataset:{...dataset,matches},roles,hashes,audit:{normalizedEvents:matches.flatMap(m=>m.events).length,contexts,roleObservations:roles.length,
  allAttemptsUsed:true,openPlayVersusSetPieceAvailable:false,onTargetVersusBlockedAvailable:false,xgEventAvailable:false}};
}
module.exports={enrich};
