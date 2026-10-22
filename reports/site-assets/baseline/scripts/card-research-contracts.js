"use strict";
const {normalizeEvent,disciplinaryCoverage,identityInMatch,playerCardOutcome,teamCardPoints,eventEligibility,TARGETS,MARKET_RULES,TARGET_VERSION} = require('../js/pages/disciplinary.mjs');
const SCHEMA_VERSION = 1;
function futureCardCandidate({candidate,match,generatedAt,cutoff,referee=null,refereeEvidence=null,duelEvidence=null}) {
  if (!generatedAt || !cutoff) throw new Error('Card research contract requires generatedAt and cutoff/asOf');
  const f = candidate.cardResearchFeatures || {};
  return {schemaVersion:SCHEMA_VERSION,playerId:candidate.playerId ?? null,playerName:candidate.playerName ?? candidate.name,team:candidate.teamId,opponent:candidate.teamId===match.homeTeam?match.awayTeam:match.homeTeam,
    role:candidate.role ?? null,detailedRole:candidate.detailedRole ?? null,probableXIState:f.probableXIState ?? 'unknown',expectedMinutes:f.expectedMinutes ?? null,expectedMinutesReliability:f.expectedMinutesReliability ?? null,
    startingProbability:f.startingProbability ?? null,substitutionRisk:f.substitutionRisk ?? null,historicalDisciplinarySample:f.historicalDisciplinarySample ?? null,currentDisciplinarySample:f.currentDisciplinarySample ?? null,
    foulsCommitted:f.currentDisciplinarySample?.foulsCommitted ?? null,foulsSuffered:f.currentDisciplinarySample?.foulsSuffered ?? null,
    referee:{identity:referee,status:referee?'DESIGNATED':'NO_DESIGNATION_AVAILABLE',evidence:refereeEvidence,fallbackSource:candidate.refereeFactorSource ?? 'NO_DESIGNATION_AVAILABLE'},duelEvidence,
    legacyRiskScore:candidate.riskScore ?? null,calibratedProbability:null,targetDefinition:{version:TARGET_VERSION,target:'PLAYER_ANY_CARD',marketRuleId:null},coverage:f.currentDisciplinarySample?.disciplinaryCoverage ?? {status:'UNKNOWN'},
    generatedAt,cutoff,modelVersion:'card-research-data-v1',modelState:'DATA_ONLY_NO_VALIDATED_CARD_MODEL',identityResolution:candidate.identityResolution ?? 'UNRESOLVED_NAME_ONLY'};
}
function cardActuals(match,identity,{ruleId,target='PLAYER_ANY_CARD'}={}) {
  const rule = MARKET_RULES[ruleId], resolved=identityInMatch(match,identity), events = (match.bookings || []).map(e=>normalizeEvent(e,match)).filter(e=>resolved?.playerId&&e.playerId===resolved.playerId&&(!identity.teamId||e.teamId===identity.teamId));
  const coverage = disciplinaryCoverage(match), complete = Boolean(resolved)&&coverage==='COMPLETE'&&events.every(e=>e.eventType!=='unknown');
  const stat = ['home','away'].flatMap(s=>match.playerStats?.[s]||[]).find(p=>p.playerId===identity.playerId);
  const unused = ['home','away'].some(s=>(match.didNotPlay?.[s]||[]).some(p=>p.playerId===identity.playerId));
  const contextCount=field=>events.some(e=>e[field]===null||e[field]===undefined)?null:complete?events.filter(e=>e[field]===true).length:null;
  const outcome=playerCardOutcome(match,identity,target,rule);
  const individual=playerCardOutcome(match,identity,'PLAYER_ANY_CARD',rule);
  const eligible=events.filter(e=>eventEligibility(e,rule)===true&&TARGETS.PLAYER_ANY_CARD.types.includes(e.eventType));
  const firstMinute = individual.value===true&&eligible.length>0&&eligible.every(e=>e.minute!==null)?Math.min(...eligible.map(e=>e.minute)):null;
  return {schemaVersion:SCHEMA_VERSION,matchId:match.id,playerId:identity.playerId??null,
    ordinaryYellow:complete?events.filter(e=>e.eventType==='yellow').length:null,secondYellowDismissal:complete?events.filter(e=>e.eventType==='yellowRedCard').length:null,straightRed:complete?events.filter(e=>e.eventType==='redCard').length:null,
    anyQualifyingPlayerCard:individual.value,duoQualifyingCard:target==='PLAYER_DUO_CARD'?outcome.value:null,firstQualifyingCardMinute:firstMinute,participation:stat?'PLAYED':unused?'UNUSED':'unknown',minutesPlayed:stat?.minutes??(unused?0:null),
    cardWhileOnPitch:contextCount('onPitchAtEvent'),cardWhileOnBench:contextCount('benchEvent'),postMatchCard:contextCount('postMatchEvent'),
    teamCardPoints:teamCardPoints(match,MARKET_RULES.SISAL_CARD_POINTS_REGULATION_V1,identity.teamId),coverage,eligibility:outcome,events,targetDefinition:{version:TARGET_VERSION,target,marketRuleId:ruleId??null}};
}
module.exports={SCHEMA_VERSION,futureCardCandidate,cardActuals};
