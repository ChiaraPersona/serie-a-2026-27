"use strict";
const fs=require('fs'),path=require('path');
const {normalizeEvent,disciplinaryCoverage,coverageStatus,playerCardOutcome,eventEligibility,teamCardPoints,firstBookedOutcome,MARKET_RULES,nameKey}=require('../../../js/pages/disciplinary.mjs');
const {CONFIG}=require('./config');
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const read=(root,f)=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const localCache=new Map(),formatters=new Map();
function localInstant(date,time='23:59:59',zone='Europe/Rome'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!/^\d{2}:\d{2}(:\d{2})?$/.test(time||''))return null;
  const key=`${date}|${time}|${zone}`;if(localCache.has(key))return localCache.get(key);
  const desired=Date.parse(`${date}T${time.length===5?time+':00':time}Z`);
  if(!formatters.has(zone))formatters.set(zone,new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}));
  const parts=formatters.get(zone).formatToParts(new Date(desired));
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  const displayed=Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
  const result=new Date(desired-(displayed-desired)).toISOString();localCache.set(key,result);return result;
}
const instant=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s))?new Date(s).toISOString():null;
const availability=s=>instant(s)||(/^\d{4}-\d{2}-\d{2}$/.test(s||'')?localInstant(s):null);
function kickoff(m){return instant(m.kickoffAt)||localInstant(m.date,m.kickoff,m.timezone||'Europe/Rome');}
function priorMatches(matches,target){const cut=kickoff(target);if(!cut)return [];return matches.filter(m=>m.id!==target.id&&m.status==='finished'&&m.competition==='serie-a'&&m.season===target.season&&
  (instant(m.completedAt)?Date.parse(m.completedAt)<Date.parse(cut):m.date<target.date&&Date.parse(localInstant(m.date,'23:59:59',m.timezone||'Europe/Rome'))<Date.parse(cut))).sort((a,b)=>kickoff(a).localeCompare(kickoff(b))||a.id.localeCompare(b.id));}
function roles(raw,player,available){
  const detailed=available?player?.detailedRole:null;
  const text=nameKey(detailed);
  const group=/difensorecentrale|centreback|centerback/.test(text)?'CB':/terzin|wingback|fullback|esternodestro|esternosinistro|laterale/.test(text)?'FB/WB':/median|centrocampistacentrale|centralmidfielder|defensivemidfielder|mezzala|regista/.test(text)?'CM/DM':/trequartist|attackingmidfielder|secondapunta/.test(text)?'AM':/ala|winger/.test(text)?'W':/centravanti|prima punta|punta centrale|striker|centreforward/.test(text)?'CF/ST':/portier|goalkeeper/.test(text)?'GK':'UNKNOWN';
  const broad=raw.sourceRole==='P'?'GK':raw.sourceRole==='D'?'DEF':raw.sourceRole==='C'?'MID':raw.sourceRole==='A'?'ATT':available?(/difensor/i.test(player?.role||'')?'DEF':/centrocamp/i.test(player?.role||'')?'MID':/attacc/i.test(player?.role||'')?'ATT':/portier/i.test(player?.role||'')?'GK':'UNKNOWN'):'UNKNOWN';
  return {role:broad,detailedRole:detailed??null,roleGroup:group};
}
function matchContextCertified(m){return disciplinaryCoverage(m)==='COMPLETE'&&coverageStatus(m.resultCoverage?.cardMarketContexts??m.coverage?.cardMarketContexts)==='COMPLETE'&&
  (m.bookings||[]).every(raw=>{const e=normalizeEvent(raw,m);return e.eventType!=='unknown'&&e.playerId&&eventEligibility(e,MARKET_RULES[CONFIG.ruleId])!==null;});}
function marketTargets(m,p){
  const outcome=playerCardOutcome(m,{playerId:p.playerId,playerName:p.playerName,teamId:p.team},'PLAYER_YELLOW',MARKET_RULES[CONFIG.ruleId]);
  return {value:typeof outcome.value==='boolean'?Number(outcome.value):null,reason:outcome.reason??null,void:outcome.void??false,coverage:outcome.coverage,marketContextsCertified:matchContextCertified(m)};
}
function recordedYellowTarget(m,p){
  const coverage=disciplinaryCoverage(m);
  if(coverage!=='COMPLETE')return {value:null,reason:'OBSERVATIONAL_DISCIPLINARY_FEED_INCOMPLETE',coverage,target:'RECORDED_YELLOW',targetVersion:CONFIG.targetVersion,disclaimer:CONFIG.targetDisclaimer,events:[]};
  if(!p.playerName&&!p.playerId)return {value:null,reason:'CANDIDATE_IDENTITY_UNAVAILABLE',coverage,target:'RECORDED_YELLOW',targetVersion:CONFIG.targetVersion,disclaimer:CONFIG.targetDisclaimer,events:[]};
  const candidates=(m.bookings||[]).map(raw=>normalizeEvent(raw,m)).filter(e=>{
    const sameTeam=!p.team||e.teamId===p.team||e.team===p.team;
    if(!sameTeam)return false;
    if(p.playerId)return e.playerId===p.playerId;
    return nameKey(e.playerName??e.player)===nameKey(p.playerName);
  });
  const ordinary=candidates.filter(e=>e.eventType==='yellow');
  return {value:Number(ordinary.length>0),reason:null,coverage,target:'RECORDED_YELLOW',targetVersion:CONFIG.targetVersion,disclaimer:CONFIG.targetDisclaimer,
    identityMatch:p.playerId?'CANONICAL_PLAYER_ID':'EXACT_NORMALIZED_NAME_WITHIN_TEAM',ordinaryYellowEvents:ordinary.length,
    events:ordinary.map(e=>({eventType:e.eventType,minute:e.minute??null,period:e.period??null,contextKnown:e.contextKnown??([e.onPitchAtEvent,e.benchEvent,e.postMatchEvent].every(v=>typeof v==='boolean')),onPitchAtEvent:e.onPitchAtEvent??null,benchEvent:e.benchEvent??null,postMatchEvent:e.postMatchEvent??null}))};
}
const targets=marketTargets;
function load(root){
  const matches=read(root,'data/normalized/matches.json'),completed=matches.filter(m=>m.competition==='serie-a'&&m.season==='2026-27'&&m.status==='finished');
  const teams=read(root,'data/teams/index.json').teams;
  const squads=new Map(teams.map(t=>[t.id,read(root,`data/generated/team-pages/${t.id}-squad.json`)]));
  const probable=new Map(Array.from({length:6},(_,i)=>[i+1,read(root,`data/sources/probable-lineups-md${i+1}-2026-27.json`)]));
  const official=read(root,'data/sources/official-lineups-2026-27.json').fixtures;
  const designations=read(root,'data/sources/referee-assignments-2026-27.json');
  return {matches,completed,teams,squads,probable,official,designations};
}
function infoUniverse(input,m,info){
  const cutoff=kickoff(m);if(!cutoff)return {rows:[],reason:'KICKOFF_UNAVAILABLE',source:null};
  if(info==='PREMATCH_OFFICIAL'){
    const f=input.official.find(f=>f.matchId===m.id),stamp=instant(f?.availableAt)||instant(f?.publishedAt)||instant(f?.retrievedAt);
    if(!f)return {rows:[],reason:'OFFICIAL_LINEUP_ABSENT',source:null};
    if(!stamp)return {rows:[],reason:'OFFICIAL_PREMATCH_TIMESTAMP_UNVERIFIED',source:'data/sources/official-lineups-2026-27.json'};
    if(Date.parse(stamp)>=Date.parse(cutoff))return {rows:[],reason:'OFFICIAL_LINEUP_NOT_AVAILABLE_BEFORE_KICKOFF',source:'data/sources/official-lineups-2026-27.json'};
    return {rows:f.teams.flatMap(t=>[...(t.players||[]).map(p=>({...p,teamId:t.teamId,lineupStatus:'starter'})),...(t.substitutes||[]).map(p=>({...p,teamId:t.teamId,lineupStatus:'reserve'}))]),reason:null,availableAt:stamp,source:'data/sources/official-lineups-2026-27.json'};
  }
  const d=input.probable.get(m.matchday),stamp=instant(d?.importedAt);
  if(!stamp)return {rows:[],reason:'PROBABLE_PREMATCH_TIMESTAMP_UNVERIFIED',source:null};
  if(Date.parse(stamp)>=Date.parse(cutoff))return {rows:[],reason:'PROBABLE_LINEUP_NOT_AVAILABLE_BEFORE_KICKOFF',source:`data/sources/probable-lineups-md${m.matchday}-2026-27.json`};
  return {rows:d.teams.filter(t=>[m.homeTeam,m.awayTeam].includes(t.teamId)).flatMap(t=>t.players.map(p=>({...p,teamId:t.teamId}))),reason:null,availableAt:stamp,source:`data/sources/probable-lineups-md${m.matchday}-2026-27.json`};
}
function refereeBefore(input,m){const d=input.designations.matchdays.find(d=>d.matchday===m.matchday),stamp=availability(d?.publishedAt),a=d?.assignments.find(a=>a.matchId===m.id);return stamp&&kickoff(m)&&stamp<kickoff(m)&&a?.referee?.slug?{identity:a.referee.slug,name:a.referee.name,availableAt:stamp,source:d.source,status:'DESIGNATED'}:{identity:null,status:a?'DESIGNATION_TIMING_UNVERIFIED':'NO_DESIGNATION_AVAILABLE'};}
function makeRow(input,m,raw,u,info){
  const team=raw.teamId,side=m.homeTeam===team?'home':'away';
  const id=raw.playerId??null,name=raw.currentName??raw.sourceName??null;
  const roster=input.squads.get(team),player=roster?.players.find(p=>p.id===id);
  const playerSourceDates=(player?.sources||[]).map(s=>availability(s.retrievedAt)).filter(Boolean).sort();
  const historicalDates=(player?.previousSeason?.entries||[]).map(e=>availability(e.lastUpdated)).filter(Boolean).sort();
  const playerEvidenceAvailableAt=[...playerSourceDates,...historicalDates].sort()[0]??null;
  const rosterAvailable=Boolean(playerEvidenceAvailableAt&&playerEvidenceAvailableAt<kickoff(m));
  const stat=id?(m.playerStats?.[side]||[]).find(p=>p.playerId===id):null;
  const unused=id?(m.didNotPlay?.[side]||[]).some(p=>p.playerId===id):false;
  const row={rowId:`${info}|${m.id}|${team}|${id??'unresolved:'+nameKey(name)}`,category:'RETROSPECTIVE_RESEARCH',state:'RESEARCH',modelVersion:CONFIG.version,playerId:id,playerName:name,team,opponent:side==='home'?m.awayTeam:m.homeTeam,matchId:m.id,matchday:m.matchday,date:m.date,homeAway:side,
    cutoff:kickoff(m),informationSet:info,...roles(raw,player,rosterAvailable),projectedStarter:raw.lineupStatus==='starter',startingProbability:finite(raw.probability)?raw.probability/100:null,
    actualStarter:stat?.starter??(unused?false:null),actualMinutes:finite(stat?.minutes)?stat.minutes:unused?0:null,participation:stat&&stat.minutes>0?'PLAYED':unused?'UNUSED':'UNKNOWN',
    actualFoulsCommitted:stat?.foulsCommitted??null,actualFoulsSuffered:stat?.foulsWon??null,expectedMinutes:null,expectedMinutesReliability:null,substitutionRisk:null,exposureSemantics:null,
    referee:refereeBefore(input,m),target:null,targetCoverage:null,exclusionReasons:[],warnings:[],secondaryTargets:{state:'DATA_ONLY_NOT_MODELLED',PLAYER_YELLOW:null,PLAYER_ANY_CARD:null,PLAYER_DUO_CARD:null,FIRST_BOOKED_PLAYER:null,TEAM_CARD_POINTS:null},
    sourceRecordedOrdinaryYellow:id?m.bookings?.filter(e=>e.playerId===id&&e.team===team&&e.eventType==='yellow').length??null:null,
    provenance:{lineup:{source:u.source,availableAt:u.availableAt},role:rosterAvailable?{source:`data/generated/team-pages/${team}-squad.json`,availableAt:playerEvidenceAvailableAt,interpretation:'Position source timestamp predates target; current team linkage comes from target lineup ID'}:{source:u.source,fallback:'SOURCE_BROAD_ROLE_OR_UNKNOWN'},actual:{provider:m.resultSource?.provider,url:m.resultSource?.url,fields:['bookings','playerStats','didNotPlay'],interpretation:'Post-match outcomes, never feature inputs'},exposure:{status:'RECONSTRUCTIBLE_FROM_PREMATCH_HISTORY_FOR_PROJECTED_STARTERS',availableAt:u.availableAt,source:u.source,semantics:'PREMATCH_EXPECTED_MINUTES'},identity:{method:id?'CANONICAL_SOURCE_ID':'UNRESOLVED_NAME_ONLY',noAliasInvention:true}}};
  const t=recordedYellowTarget(m,row),market=marketTargets(m,row);row.target=t.value;row.recordedYellow=t.value;row.targetCoverage=t;row.marketCertifiedTarget={target:'PLAYER_YELLOW',targetVersion:CONFIG.marketTargetVersion,...market};
  const events=(m.bookings||[]).filter(e=>id&&e.playerId===id&&e.team===team),categoriesKnown=Boolean(id)&&disciplinaryCoverage(m)==='COMPLETE'&&events.every(e=>e.eventType!=='unknown');
  row.secondaryTargets={state:'DATA_ONLY_NOT_MODELLED',sourceCounts:{ordinaryYellow:categoriesKnown?events.filter(e=>e.eventType==='yellow').length:null,secondYellowDismissal:categoriesKnown?events.filter(e=>e.eventType==='yellowRedCard').length:null,straightRed:categoriesKnown?events.filter(e=>e.eventType==='redCard').length:null,interpretation:'Source-recorded categories, not eligibility-certified outcomes'},PLAYER_YELLOW:market,
    PLAYER_ANY_CARD:playerCardOutcome(m,{playerId:id,playerName:name,teamId:team},'PLAYER_ANY_CARD',MARKET_RULES[CONFIG.ruleId]),PLAYER_DUO_CARD:{value:null,reason:'BOOKMAKER_DUO_RULE_NOT_CERTIFIED',noIndividualProbabilityProxy:true},FIRST_BOOKED_PLAYER:firstBookedOutcome(m,MARKET_RULES[CONFIG.ruleId]),TEAM_CARD_POINTS:teamCardPoints(m,MARKET_RULES[CONFIG.ruleId],team)};
  if(!id)row.warnings.push('UNRESOLVED_PLAYER_IDENTITY_NAME_ONLY_OBSERVATIONAL_MATCH');
  if(!stat&&!unused)row.warnings.push('PARTICIPATION_UNRESOLVED_NOT_REQUIRED_BY_OBSERVATIONAL_TARGET');
  if(t.value===null)row.exclusionReasons.push(t.reason||'OBSERVATIONAL_TARGET_UNVERIFIED');
  if(!market.marketContextsCertified)row.warnings.push('PLAYER_YELLOW_MARKET_CONTEXT_NOT_SOURCE_CERTIFIED');
  row.primaryEligible=row.exclusionReasons.length===0;
  return row;
}
function construct(input){const rows=[],matchAudits=[],participantAudit=[];
  for(const m of [...input.completed].sort((a,b)=>kickoff(a).localeCompare(kickoff(b))||a.id.localeCompare(b.id))){
    for(const side of ['home','away']){const team=side==='home'?m.homeTeam:m.awayTeam;for(const p of m.playerStats?.[side]||[])participantAudit.push({matchId:m.id,matchday:m.matchday,team,playerId:p.playerId,playerName:p.player,actualMinutes:p.minutes??null,actualStarter:p.starter??null,participation:'PLAYED',target:recordedYellowTarget(m,{playerId:p.playerId,team,playerName:p.player}),marketTarget:marketTargets(m,{playerId:p.playerId,team,playerName:p.player}),recordedOrdinaryYellow:(m.bookings||[]).filter(e=>e.playerId===p.playerId&&e.team===team&&e.eventType==='yellow').length});for(const p of m.didNotPlay?.[side]||[])participantAudit.push({matchId:m.id,matchday:m.matchday,team,playerId:p.playerId,playerName:p.player,actualMinutes:0,actualStarter:false,participation:'UNUSED',target:recordedYellowTarget(m,{playerId:p.playerId,team,playerName:p.player}),marketTarget:marketTargets(m,{playerId:p.playerId,team,playerName:p.player}),recordedOrdinaryYellow:(m.bookings||[]).filter(e=>e.playerId===p.playerId&&e.team===team&&e.eventType==='yellow').length});}
    for(const info of ['PREMATCH_PROBABLE','PREMATCH_OFFICIAL']){const u=infoUniverse(input,m,info),seen=new Set();let duplicates=0;for(const raw of u.rows){const key=`${raw.teamId}|${raw.playerId??nameKey(raw.currentName??raw.sourceName)}`;if(seen.has(key)){duplicates++;continue;}seen.add(key);rows.push(makeRow(input,m,raw,u,info));}
      matchAudits.push({matchId:m.id,informationSet:info,cutoff:kickoff(m),source:u.source,availableAt:u.availableAt??null,candidateCount:u.rows.length,duplicates,exclusionReason:u.reason,primaryMatchContextCertified:matchContextCertified(m),actualParticipantsNotInProjectedUniverse:participantAudit.filter(p=>p.matchId===m.id&&p.participation==='PLAYED'&&!u.rows.some(q=>q.playerId===p.playerId&&q.teamId===p.team)).map(p=>p.playerId)});}
  }return {rows,matchAudits,participantAudit};}
module.exports={finite,read,instant,availability,localInstant,kickoff,priorMatches,roles,matchContextCertified,targets,marketTargets,recordedYellowTarget,load,infoUniverse,refereeBefore,makeRow,construct};
