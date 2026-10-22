import {settleLeg} from './betting-settlement.mjs';

// Adapt verified post-match evidence only; never rebuild a forecast or quote.
const minute=value=>Number(String(value).match(/^\d+/)?.[0] ?? NaN);
export function md3ResultMatch(fixture){
  const r=fixture.matchReport;
  if(fixture.matchday!==3||!r?.playerEvidence)return fixture;
  const team=side=>side==='home'?fixture.homeTeam:fixture.awayTeam;
  const stats=p=>({...p,shots:p.statistics.totalShots??null,shotsOnTarget:p.statistics.shotsOnTarget??null,
    foulsCommitted:p.statistics.foulsCommitted??null,foulsWon:p.statistics.foulsSuffered??null,
    goals:p.statistics.totalGoals??null,assists:p.statistics.goalAssists??null,hitWoodwork:p.statistics.hitWoodwork??null});
  return {...fixture,halfTimeScore:r.halfTimeScore,
    teamStats:Object.fromEntries(['home','away'].map((side,i)=>[side,Object.fromEntries(Object.entries(r.statistics||{}).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v[i]??null]))])),
    playerStats:Object.fromEntries(['home','away'].map(side=>[side,r.playerEvidence.filter(p=>p.team===side&&p.statistics.appearances===1).map(stats)])),
    didNotPlay:Object.fromEntries(['home','away'].map(side=>[side,r.playerEvidence.filter(p=>p.team===side&&p.statistics.appearances===0)])),
    substitutions:r.observedSubstitutions.map(s=>({...s,team:team(s.team),minute:minute(s.minute)})),
    scorers:r.goalEvents.map(g=>({...g,team:team(g.team),minute:minute(g.minute)})),
    bookings:r.bookingEvents.map(b=>({...b,team:team(b.team),minute:minute(b.minute)})),
    resultCoverage:{participation:'available',substitutions:'COMPLETE',bookings:'PARTIAL'},
    md3Observed:true};
}

export function settleMd3Leg(leg,fixture){
  const match=md3ResultMatch(fixture||{});
  if(!match.md3Observed)return settleLeg(leg,fixture);
  const market=leg.betSelection?.market||{},identity=leg.betSelection?.identity||{};
  const individual=leg.marketScope==='player'||market.scope==='player'||Boolean(leg.playerId);
  if(!individual)return settleLeg(leg,match);
  const ids=[leg.playerId,market.subject?.id,...(identity.canonicalPlayerIds||[])].filter(Boolean);
  const rows=match.matchReport.playerEvidence;
  const primary=rows.find(p=>p.playerId&&ids.includes(p.playerId));
  if(!primary)return {status:'unavailable',label:'Da verificare',reason:'EXACT_PLAYER_ID_UNRESOLVED'};
  if(!primary.starter)return {status:'excluded',label:'Escluso: non titolare',reason:'OFFICIAL_NONSTARTER'};
  const semantics=market.bookmakerSemantics||{},modifiers=market.modifiers||{};
  const duo=semantics.substituteIncluded===true||semantics.duo===true||modifiers.replacementIncluded===true||modifiers.duo===true;
  // Shared engine evaluates the direct substitute only for that contract.
  const actual={...match,substitutions:duo?match.substitutions:[]};
  const result=settleLeg({...leg,player:primary.player,playerId:primary.playerId},actual);
  return {...result,basis:'STATISTICAL_VERIFICATION',officiallySettled:false,
    ...(result.status==='unavailable'?{label:'Da verificare',reason:result.reason||'CONTRACT_OR_STATISTIC_UNAVAILABLE'}:{})};
}
