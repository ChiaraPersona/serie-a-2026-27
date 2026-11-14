"use strict";
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {CONFIG}=require('./config'),D=require('./data'),M=require('./models');
const sha=value=>crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const read=(root,file)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));

function playerMarketInputs(root){
  const file='data/predictions/snapshots/2026-27/md-06.json',container=read(root,file),byMatch=new Map();
  for(const snapshot of container.snapshots||[])byMatch.set(snapshot.matchId,{generatedAt:snapshot.generatedAt,snapshotId:snapshot.snapshotId,players:new Map((snapshot.prediction?.players||[]).map(p=>[p.playerId,p]))});
  return {file,sha256:sha(fs.readFileSync(path.join(root,file))),byMatch};
}
function legacyScores(root){
  const file='data/normalized/predictions.json',raw=read(root,file),predictions=Array.isArray(raw)?raw:raw.predictions||[],scores=new Map();
  for(const prediction of predictions)for(const candidate of prediction.likelyBooked||[])if(candidate.playerId)scores.set(`${prediction.matchId}|${candidate.playerId}`,candidate.riskScore??null);
  return {file,sha256:sha(fs.readFileSync(path.join(root,file))),scores};
}
function snapshotSchema(){return {$schema:'https://json-schema.org/draft/2020-12/schema',title:'Card C0-C4 research snapshot',type:'object',required:['schemaVersion','snapshotId','season','competition','matchday','generatedAt','cutoff','configurationHash','targetDefinitions','modelState','researchLeader','matches','actualsExcluded','integrity'],properties:{schemaVersion:{const:2},snapshotId:{type:'string'},season:{const:'2026-27'},competition:{const:'serie-a'},matchday:{const:6},generatedAt:{type:'string',format:'date-time'},cutoff:{type:'object'},configurationHash:{type:'string'},targetDefinitions:{type:'object'},modelState:{const:'RESEARCH'},researchLeader:{enum:['C0','C1','C2','C3','C4','UNRESOLVED']},matches:{type:'array'},actualsExcluded:{const:true},integrity:{type:'object'}},additionalProperties:true,metadata:{disclaimer:CONFIG.targetDisclaimer,observationalTarget:CONFIG.target,marketTarget:CONFIG.marketTarget}};}
function candidatePayload(row,features,prediction,legacyRiskScore,researchLeader){
  const probability=researchLeader==='UNRESOLVED'?null:prediction[`pRecordedYellow_${researchLeader}`];
  return {playerId:row.playerId,playerName:row.playerName,team:row.team,opponent:row.opponent,role:row.role,detailedRole:row.detailedRole,probableXIState:features.probableXIState,expectedMinutes:features.expectedMinutes,expectedMinutesReliability:features.expectedMinutesReliability,substitutionRisk:features.substitutionRisk,
    C0:prediction.pRecordedYellow_C0,C1:prediction.pRecordedYellow_C1,C2:prediction.pRecordedYellow_C2,C3:prediction.pRecordedYellow_C3,C4:prediction.pRecordedYellow_C4,researchLeaderProbability:probability,legacyRiskScore:legacyRiskScore??null,maturity:prediction.maturity,fallback:prediction.fallback,
    sample:{historical:features.historicalAvailableSample,current:{appearances:features.dataOnly.individualPriorAppearances,minutes:features.dataOnly.individualPriorMinutes,recordedPriorCards:features.dataOnly.recordedPriorCards}},fouls:{current:features.dataOnly.foulsCommitted,currentMinutes:features.dataOnly.foulsMinutes,currentPer90:features.dataOnly.foulsPer90,historical:features.dataOnly.historicalFoulsCommitted,historicalMinutes:features.dataOnly.historicalFoulsMinutes,featureLogRatio:features.foulLogRatio},matchupState:prediction.components.C3,referee:{...features.referee,modelState:prediction.components.C4},featureProvenance:features.provenance,
    targetDefinitions:{observational:{id:CONFIG.target,version:CONFIG.targetVersion,disclaimer:CONFIG.targetDisclaimer},marketCertified:{id:CONFIG.marketTarget,version:CONFIG.marketTargetVersion,status:'NOT_VALIDATED'}},modelVersions:{ladder:CONFIG.version,state:'RESEARCH'}};
}
function buildPreview(root,input,retrospectivePredictions,{generatedAt=new Date().toISOString(),configurationHash,researchLeader='UNRESOLVED'}={}){
  const market=playerMarketInputs(root),legacy=legacyScores(root),matches=[];
  for(const match of input.matches.filter(m=>m.competition==='serie-a'&&m.season===CONFIG.snapshot.season&&m.matchday===CONFIG.snapshot.matchday).sort((a,b)=>D.kickoff(a).localeCompare(D.kickoff(b))||a.id.localeCompare(b.id))){
    const universe=D.infoUniverse(input,match,'PREMATCH_PROBABLE'),marketMatch=market.byMatch.get(match.id),candidates=[];
    for(const raw of universe.rows){
      const row=D.makeRow(input,match,raw,universe,'PREMATCH_PROBABLE'),serialized=marketMatch?.players.get(row.playerId);
      if(serialized&&marketMatch.generatedAt<D.kickoff(match)){row.expectedMinutes=serialized.expectedMinutes??null;row.expectedMinutesReliability=null;row.substitutionRisk=null;row.provenance.exposure={source:market.file,snapshotId:marketMatch.snapshotId,availableAt:marketMatch.generatedAt,status:'FROZEN_PLAYER_MARKET_V2_INPUT_REFERENCE',semantics:CONFIG.exposure.semanticsRequired};}
      const features=M.features(input,row),sourceIds=new Set(features.provenance.sourceMatchIds),train=retrospectivePredictions.filter(p=>p.informationSet==='PREMATCH_PROBABLE'&&p.primaryEligible&&sourceIds.has(p.matchId)),prediction=M.predict(features,train);
      candidates.push(candidatePayload(row,features,prediction,legacy.scores.get(`${match.id}|${row.playerId}`),researchLeader));
    }
    matches.push({matchId:match.id,kickoff:D.kickoff(match),homeTeam:match.homeTeam,awayTeam:match.awayTeam,lineupSource:{file:universe.source,availableAt:universe.availableAt},referee: D.refereeBefore(input,match),candidates});
  }
  const payload={schemaVersion:2,snapshotId:`card-research-${CONFIG.snapshot.season}-md-${String(CONFIG.snapshot.matchday).padStart(2,'0')}`,season:CONFIG.snapshot.season,competition:'serie-a',matchday:CONFIG.snapshot.matchday,generatedAt,cutoff:{mode:'PER_MATCH_KICKOFF_STRICT_AS_OF',completedOnly:true,targetAndFutureExcluded:true},configurationHash,targetDefinitions:{observational:{id:CONFIG.target,version:CONFIG.targetVersion,disclaimer:CONFIG.targetDisclaimer},marketCertified:{id:CONFIG.marketTarget,version:CONFIG.marketTargetVersion,status:'NOT_VALIDATED'}},modelState:'RESEARCH',modelVersions:Array.from({length:5},(_,i)=>({id:`C${i}`,version:CONFIG.version,state:'RESEARCH'})),researchLeader,matches,actualsExcluded:true,sourceHashes:{playerMarketSnapshot:market.sha256,legacyPredictions:legacy.sha256},integrity:null};
  payload.integrity={algorithm:'SHA-256',scope:'snapshot payload excluding integrity metadata',sha256:sha({...payload,integrity:null})};
  return payload;
}
function validatePreview(payload){
  const errors=[];
  if(payload.schemaVersion!==2||payload.modelState!=='RESEARCH'||payload.actualsExcluded!==true)errors.push('TOP_LEVEL_CONTRACT');
  if(payload.targetDefinitions?.observational?.id!==CONFIG.target||payload.targetDefinitions?.observational?.disclaimer!==CONFIG.targetDisclaimer)errors.push('OBSERVATIONAL_TARGET_METADATA');
  if(payload.targetDefinitions?.marketCertified?.id!==CONFIG.marketTarget)errors.push('MARKET_TARGET_METADATA');
  if(payload.matches.length!==10)errors.push('FIXTURE_COUNT');
  const forbidden=/^(target|outcome|recordedYellow|playerYellow|actualMinutes|actuals)$/i;
  const inspect=value=>{if(Array.isArray(value))return value.forEach(inspect);if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){if(forbidden.test(key))errors.push(`ACTUAL_FIELD:${key}`);inspect(child);}};inspect(payload);
  for(const match of payload.matches){if(!(match.lineupSource?.availableAt<match.kickoff))errors.push(`LINEUP_CUTOFF:${match.matchId}`);const ids=match.candidates.map(c=>`${c.team}|${c.playerId??c.playerName}`);if(new Set(ids).size!==ids.length)errors.push(`DUPLICATE_CANDIDATE:${match.matchId}`);for(const c of match.candidates){for(const key of ['C0','C1','C2','C3','C4'])if(!(typeof c[key]==='number'&&c[key]>=0&&c[key]<=1))errors.push(`PROBABILITY:${match.matchId}:${c.playerName}:${key}`);}}
  if(payload.integrity?.sha256!==sha({...payload,integrity:null}))errors.push('HASH_MISMATCH');
  return {valid:errors.length===0,errors,matches:payload.matches.length,candidates:payload.matches.reduce((n,m)=>n+m.candidates.length,0),actualsExcluded:payload.actualsExcluded};
}
function freezeGate(payload,now=new Date().toISOString()){
  const earliest=payload.matches.map(m=>m.kickoff).sort()[0],latestLineup=payload.matches.map(m=>m.lineupSource.availableAt).sort().at(-1),ageHours=(Date.parse(earliest)-Date.parse(latestLineup))/36e5,referees=payload.matches.filter(m=>m.referee.identity).length,validation=validatePreview(payload),reasons=[];
  if(!validation.valid)reasons.push('SNAPSHOT_SCHEMA_OR_ACTUALS_GATE');if(Date.parse(now)>=Date.parse(earliest))reasons.push('FIRST_KICKOFF_ALREADY_REACHED');if(ageHours>CONFIG.snapshot.maximumLineupAgeHours)reasons.push('PROBABLE_LINEUPS_EXPECTED_TO_CHANGE');if(CONFIG.snapshot.requireAllRefereeDesignationsForFinalFreeze&&referees<10)reasons.push('REFEREE_DESIGNATIONS_INCOMPLETE');
  return {infrastructure:validation.valid?'READY':'NOT_READY',finalFreeze:reasons.length?'WAIT_FOR_LATER_PRE_KICKOFF_REFRESH':'READY_TO_FREEZE',reasons,earliestKickoff:earliest,latestLineupSource:latestLineup,lineupAgeHoursBeforeFirstKickoff:ageHours,refereeDesignations:referees,validation};
}
function writeFrozenSnapshot(root,payload,{replace=false,reason=null}={}){
  const gate=freezeGate(payload,payload.generatedAt);if(gate.finalFreeze!=='READY_TO_FREEZE')throw new Error(`FINAL_MD6_SNAPSHOT_GATE: ${gate.reasons.join(',')}`);
  const target=path.join(root,CONFIG.snapshot.path),manifestFile=path.join(root,CONFIG.snapshot.manifestPath);fs.mkdirSync(path.dirname(target),{recursive:true});const existed=fs.existsSync(target);if(existed&&!replace)throw new Error('SNAPSHOT_ALREADY_EXISTS');if(existed&&(!reason||!reason.trim()))throw new Error('REPLACEMENT_REASON_REQUIRED');
  const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):{schemaVersion:1,season:CONFIG.snapshot.season,competition:'serie-a',history:[]};
  if(existed){const previous=fs.readFileSync(target,'utf8'),revisionDir=path.join(path.dirname(target),'revisions');fs.mkdirSync(revisionDir,{recursive:true});const revision=`md-06-r${String(manifest.history.length+1).padStart(2,'0')}.json`;fs.writeFileSync(path.join(revisionDir,revision),previous);manifest.history.push({action:'REPLACED_PRE_KICKOFF',reason,archivedAs:`revisions/${revision}`,replacedAt:payload.generatedAt,previousSha256:sha(previous)});}
  const bytes=JSON.stringify(payload,null,2)+'\n',tmp=target+'.tmp';fs.writeFileSync(tmp,bytes);fs.renameSync(tmp,target);manifest.current={file:'2026-27/md-06.json',sha256:sha(bytes),generatedAt:payload.generatedAt,configurationHash:payload.configurationHash};fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');return {path:CONFIG.snapshot.path,manifestPath:CONFIG.snapshot.manifestPath,sha256:sha(bytes),replaced:existed};
}
function futureActuals(match,candidate){const observational=D.recordedYellowTarget(match,{playerId:candidate.playerId,playerName:candidate.playerName,team:candidate.team}),market=D.marketTargets(match,{playerId:candidate.playerId,playerName:candidate.playerName,team:candidate.team});return {matchId:match.id,playerId:candidate.playerId??null,playerName:candidate.playerName,observational:{target:CONFIG.target,version:CONFIG.targetVersion,value:observational.value,coverage:observational.coverage,events:observational.events,disclaimer:CONFIG.targetDisclaimer},marketCertified:{target:CONFIG.marketTarget,version:CONFIG.marketTargetVersion,value:market.value,reason:market.reason,coverage:market.coverage,contextsCertified:market.marketContextsCertified}};}
module.exports={sha,playerMarketInputs,legacyScores,snapshotSchema,candidatePayload,buildPreview,validatePreview,freezeGate,writeFrozenSnapshot,futureActuals};
