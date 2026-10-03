// Shared by importers, builders, research and settlement. No prediction formula.
export const DISCIPLINARY_VERSION = 'card-data-v1';
export const TARGET_VERSION = 'card-targets-v1';
export const CARD_TYPES = Object.freeze(['yellow', 'yellowRedCard', 'redCard', 'unknown']);
export const COVERAGE = Object.freeze(['COMPLETE', 'PARTIAL', 'UNAVAILABLE', 'UNKNOWN']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
export const nameKey = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function coverageStatus(value) {
  const key = String(value?.status ?? value ?? '').toUpperCase();
  return COVERAGE.includes(key) ? key : 'UNKNOWN';
}
export function disciplinaryCoverage(match) {
  const status = coverageStatus(match?.resultCoverage?.bookings ?? match?.coverage?.bookings);
  return !Array.isArray(match?.bookings) && status === 'COMPLETE' ? 'UNAVAILABLE' : status;
}
export function cardType(value) {
  return ({yellow:'yellow',yellowCard:'yellow','yellow-card':'yellow',yellowRedCard:'yellowRedCard','yellow-red-card':'yellowRedCard',redCard:'redCard','red-card':'redCard'})[value] ?? 'unknown';
}
export function componentAggregate(components) {
  const knownComponents = Object.fromEntries(Object.entries(components).filter(([,v]) => finite(v)));
  const missingComponents = Object.keys(components).filter(k => !finite(components[k]));
  return { value:missingComponents.length ? null : Object.values(knownComponents).reduce((a,b) => a+b,0), knownSubtotal:Object.values(knownComponents).reduce((a,b) => a+b,0), coverage:missingComponents.length ? Object.keys(knownComponents).length ? 'PARTIAL' : 'UNKNOWN' : 'COMPLETE', knownComponents, missingComponents };
}
const samePlayer = (a,b) => a?.playerId && b?.playerId ? a.playerId === b.playerId : Boolean(nameKey(a?.playerName ?? a?.player) && nameKey(a?.playerName ?? a?.player) === nameKey(b?.playerName ?? b?.player));
export function normalizeEvent(event, match = {}) {
  const eventType = cardType(event.eventType ?? event.card);
  const side = event.team === match.homeTeam ? 'home' : event.team === match.awayTeam ? 'away' : null;
  const stat = side ? (match.playerStats?.[side] || []).find(p => samePlayer(event,p)) : null;
  const unused = side ? (match.didNotPlay?.[side] || []).some(p => samePlayer(event,typeof p === 'string' ? {player:p} : p)) : false;
  let onPitch = event.onPitchAtEvent ?? null;
  let participationStatus = event.participationStatus ?? (unused ? 'UNUSED' : stat ? 'PLAYED' : 'unknown');
  let contextSource = event.contextSource ?? null;
  if (onPitch === null && unused && (match.resultCoverage?.participation ?? match.coverage?.participation) === 'available') { onPitch = false; contextSource = 'verified-didNotPlay'; }
  const substitutionsComplete = coverageStatus(match.resultCoverage?.substitutions ?? match.coverage?.substitutions) === 'COMPLETE';
  if (onPitch === null && stat && finite(event.minute) && substitutionsComplete && event.postMatchEvent === false) {
    const relevant = (match.substitutions || []).filter(s => !event.team || s.team === event.team);
    const entry = relevant.find(s => samePlayer(event,{playerId:s.playerInId,player:s.playerIn}));
    const exit = relevant.find(s => samePlayer(event,{playerId:s.playerOutId,player:s.playerOut}));
    if ((entry && entry.minute === event.minute) || (exit && exit.minute === event.minute)) onPitch = null;
    else if (stat.starter === true || entry && finite(entry.minute)) {
      onPitch = (stat.starter === true || event.minute > entry.minute) && (!exit || finite(exit.minute) && event.minute < exit.minute);
      contextSource = 'verified-lineup-and-substitutions';
    }
  }
  return {...event, playerId:event.playerId ?? null, playerName:event.playerName ?? event.player ?? null, teamId:event.teamId ?? event.team ?? null,
    minute:finite(event.minute) ? event.minute : null, addedTime:event.addedTime ?? null, eventType, card:eventType,
    period:event.period ?? 'unknown', eventOrder:event.eventOrder ?? null, participationStatus,
    onPitchAtEvent:onPitch, benchEvent:event.benchEvent ?? (onPitch === null ? null : !onPitch), postMatchEvent:event.postMatchEvent ?? null,
    source:event.source ?? match.resultSource ?? match.sourceUrl ?? null, sourceEventType:event.sourceEventType ?? event.card ?? null,
    classificationConfidence:eventType === 'unknown' ? 'UNRESOLVED' : event.classificationConfidence ?? 'SOURCE_EXPLICIT', contextSource};
}
export function eventCounts(match, team = null) {
  const events = (match.bookings || []).filter(e => !team || e.team === team).map(e => normalizeEvent(e,match));
  const coverage = disciplinaryCoverage(match);
  const counts = {yellowCards:0,secondYellowCards:0,straightRedCards:0};
  for (const e of events) { const key = {yellow:'yellowCards',yellowRedCard:'secondYellowCards',redCard:'straightRedCards'}[e.eventType]; if (key) counts[key]++; }
  const unknownEvents = events.filter(e => e.eventType === 'unknown').length;
  const complete = coverage === 'COMPLETE' && !unknownEvents;
  return {value:complete ? counts : Object.fromEntries(Object.keys(counts).map(k => [k,null])), knownComponents:counts, coverage:unknownEvents && coverage === 'COMPLETE' ? 'PARTIAL' : coverage,
    eventCount:complete ? events.length : null, observedEventCount:events.length,
    sanctionCount:complete ? counts.yellowCards + counts.secondYellowCards * 2 + counts.straightRedCards : null, unknownEvents};
}
export const TARGETS = Object.freeze({
  PLAYER_YELLOW:{version:TARGET_VERSION,types:['yellow'],question:'At least one ordinary yellow; second-yellow dismissal alone is not ordinary yellow.'},
  PLAYER_ANY_CARD:{version:TARGET_VERSION,types:['yellow','yellowRedCard','redCard'],question:'At least one eligible card under the named rule.'},
  PLAYER_DUO_CARD:{version:TARGET_VERSION,types:['yellow','yellowRedCard','redCard'],question:'Player OR direct qualifying replacement, never an individual probability proxy.'},
  FIRST_BOOKED_PLAYER:{version:TARGET_VERSION,types:['yellow'],question:'Earliest eligible ordinary yellow; tied timestamps require official order or a set of tied IDs.'},
  TEAM_CARD_POINTS:{version:TARGET_VERSION,types:['yellow','yellowRedCard','redCard'],question:'Named rule applied per player, not array length.'}
});
const ruleSource = 'https://www.sisal.it/content/dam/new-dam/italy/canali/sisal-it/doc-pdf/scommesse/info-scommesse/calcio.pdf';
export const MARKET_RULES = Object.freeze({
  SISAL_CARD_POINTS_REGULATION_V1:{id:'SISAL_CARD_POINTS_REGULATION_V1',source:ruleSource,pages:[427,428],periods:['firstHalf','secondHalf'],bench:false,postMatch:false,points:{yellow:1,yellowRedCard:1,redCard:1},maxPerPlayer:2,requiresParticipation:true},
  SISAL_PLAYER_CARD_INC_TS_V1:{id:'SISAL_PLAYER_CARD_INC_TS_V1',source:ruleSource,periods:['firstHalf','secondHalf','extraTimeFirstHalf','extraTimeSecondHalf'],bench:false,postMatch:false,requiresParticipation:true},
  SISAL_DUO_CARD_INC_TS_V1:{id:'SISAL_DUO_CARD_INC_TS_V1',source:ruleSource,periods:['firstHalf','secondHalf','extraTimeFirstHalf','extraTimeSecondHalf'],bench:false,postMatch:false,requiresParticipation:true,directReplacement:true},
  SISAL_DUO_CARD_ALL_CONTEXTS_V1:{id:'SISAL_DUO_CARD_ALL_CONTEXTS_V1',source:ruleSource,pages:[233,234],periods:null,bench:true,postMatch:true,requiresParticipation:true,directReplacement:true,requiredScope:'ALL_CONTEXTS'}
});
export function eventEligibility(event, rule) {
  if (!rule) return null;
  let unknown=false;
  if (!rule.postMatch) { if (event.postMatchEvent === true) return false; if (event.postMatchEvent !== false) unknown=true; }
  if (!rule.bench) { if (event.onPitchAtEvent === false || event.benchEvent === true) return false; if (event.onPitchAtEvent !== true) unknown=true; }
  if (rule.periods && !rule.periods.includes(event.period)) {if(event.period!=='unknown')return false;unknown=true;}
  return unknown?null:true;
}
export function identityInMatch(match, identity) {
  if (!identity.playerId) {
    const aliases = (match.playerIdentityAliases || []).filter(p => (!identity.teamId || p.teamId === identity.teamId) && [p.canonicalName,...(p.aliases || [])].some(n=>nameKey(n)===nameKey(identity.playerName ?? identity.player)));
    if (aliases.length > 1) return null;
    if (aliases.length === 1) identity = {...identity,playerId:aliases[0].playerId,teamId:aliases[0].teamId,verifiedAlias:true};
  }
  const rows = ['home','away'].flatMap(side => [...(match.playerStats?.[side] || []), ...(match.didNotPlay?.[side] || []).map(p => typeof p === 'string' ? {player:p} : p)].map(p => ({...p,team:side === 'home' ? match.homeTeam : match.awayTeam})));
  const matches = rows.filter(p => (!identity.teamId || p.team === identity.teamId) && (identity.playerId ? p.playerId === identity.playerId : nameKey(p.player) === nameKey(identity.playerName ?? identity.player)));
  const distinct = [...new Map(matches.map(p => [`${p.team}:${p.playerId || nameKey(p.player)}`,p])).values()];
  return distinct.length === 1 ? { ...distinct[0],identityResolution:identity.verifiedAlias ? 'VERIFIED_ALIAS' : identity.playerId ? 'CANONICAL_ID' : 'NAME_ONLY_VERIFIED_UNIQUE' } : null;
}
export function playerCardOutcome(match, identity, target, rule) {
  const unknown = reason => ({value:null,coverage:disciplinaryCoverage(match),reason});
  if (!['PLAYER_YELLOW','PLAYER_ANY_CARD','PLAYER_DUO_CARD'].includes(target) || !rule) return unknown('UNKNOWN_TARGET_OR_MARKET_RULE');
  if (disciplinaryCoverage(match) !== 'COMPLETE') return unknown('DISCIPLINARY_FEED_NOT_COMPLETE');
  if (rule.requiredScope && (match.resultCoverage?.disciplinaryScope ?? match.coverage?.disciplinaryScope) !== rule.requiredScope) return unknown('REQUIRED_CONTEXT_SCOPE_NOT_CERTIFIED');
  const primary = identityInMatch(match,identity);
  if (!primary) return unknown('UNRESOLVED_PLAYER_IDENTITY');
  const participationAvailable = (match.resultCoverage?.participation ?? match.coverage?.participation) === 'available';
  if (rule.requiresParticipation && !participationAvailable) return unknown('PARTICIPATION_UNAVAILABLE');
  if (rule.requiresParticipation && !finite(primary.minutes)) {
    const unused = ['home','away'].some(side => (match.didNotPlay?.[side] || []).some(p => samePlayer(primary,typeof p === 'string' ? {player:p} : p)));
    return unused ? {value:null,coverage:'COMPLETE',void:true,reason:'VERIFIED_DID_NOT_PLAY'} : unknown('MINUTES_UNAVAILABLE');
  }
  if (rule.requiresParticipation && primary.minutes === 0) return {value:null,coverage:'COMPLETE',void:true,reason:'VERIFIED_DID_NOT_PLAY'};
  const players = [primary];
  if (target === 'PLAYER_DUO_CARD') {
    if (coverageStatus(match.resultCoverage?.substitutions ?? match.coverage?.substitutions) !== 'COMPLETE') return unknown('SUBSTITUTIONS_UNAVAILABLE');
    const replacements = (match.substitutions || []).filter(s => (!s.team || s.team === primary.team) && samePlayer(primary,{playerId:s.playerOutId,player:s.playerOut}));
    if (replacements.length > 1) return unknown('AMBIGUOUS_REPLACEMENT');
    if (replacements.length) {
      const s = replacements[0], replacement = identityInMatch(match,{playerId:s.playerInId,player:s.playerIn,teamId:primary.team});
      if (!replacement) return unknown('UNRESOLVED_REPLACEMENT');
      players.push(replacement);
    }
  }
  let found = false;
  for (const raw of match.bookings) {
    const event = normalizeEvent(raw,match);
    // Unresolved named events cannot silently be treated as another player's card.
    if (!event.playerId && !event.playerName) return unknown('UNRESOLVED_EVENT_IDENTITY');
    if (!players.some(p => (!event.team || event.team === p.team) && samePlayer(p,event))) continue;
    const eligible = eventEligibility(event,rule);
    if (eligible === false) continue;
    if (eligible === null || event.eventType === 'unknown') return unknown('EVENT_CONTEXT_OR_TYPE_UNKNOWN');
    if (TARGETS[target].types.includes(event.eventType)) found = true;
  }
  return {value:found,coverage:'COMPLETE',identityResolution:primary.identityResolution,targetVersion:TARGET_VERSION,ruleId:rule.id};
}
export function teamCardPoints(match, rule, team = null) {
  const coverage = disciplinaryCoverage(match), missingComponents = [];
  if (!rule?.points || !Array.isArray(match.bookings)) return {value:null,knownSubtotal:0,coverage,missingComponents:['complete-feed-or-market-rule']};
  if (coverage !== 'COMPLETE') missingComponents.push('incomplete-feed');
  const byPlayer = new Map();
  for (const raw of match.bookings) {
    if (team && raw.team !== team) continue;
    const event = normalizeEvent(raw,match), eligible = eventEligibility(event,rule);
    if (eligible === false) continue;
    if (eligible === null || event.eventType === 'unknown' || !event.playerId || !event.teamId) {missingComponents.push('event-context-type-or-identity');continue;}
    const key = `${event.teamId}:${event.playerId}`;
    byPlayer.set(key,Math.min(rule.maxPerPlayer, (byPlayer.get(key) || 0) + rule.points[event.eventType]));
  }
  const knownSubtotal = [...byPlayer.values()].reduce((a,b) => a+b,0);
  return {value:missingComponents.length ? null : knownSubtotal,knownSubtotal,coverage:missingComponents.length ? 'PARTIAL' : 'COMPLETE',knownComponents:Object.fromEntries(byPlayer),missingComponents,ruleId:rule.id,targetVersion:TARGET_VERSION};
}
export function firstBookedOutcome(match, rule) {
  if (!rule || disciplinaryCoverage(match) !== 'COMPLETE') return {playerIds:null,coverage:disciplinaryCoverage(match),reason:'INCOMPLETE_FEED_OR_RULE'};
  const events=[];
  for (const raw of match.bookings) {
    const e=normalizeEvent(raw,match),eligible=eventEligibility(e,rule);
    if (eligible===false || !['yellow','unknown'].includes(e.eventType)) continue;
    if (eligible===null || e.eventType==='unknown' || e.minute===null || !e.playerId || e.period==='unknown') return {playerIds:null,coverage:'PARTIAL',reason:'FIRST_CARD_CONTEXT_ORDER_OR_IDENTITY_UNKNOWN'};
    events.push(e);
  }
  if (!events.length) return {playerIds:[],coverage:'COMPLETE',tie:false,minute:null};
  const periods=['firstHalf','interval','secondHalf','extraTimeFirstHalf','extraTimeSecondHalf','shootout','postMatch'];
  events.sort((a,b)=>periods.indexOf(a.period)-periods.indexOf(b.period)||a.minute-b.minute);
  let earliest=events.filter(e=>e.period===events[0].period&&e.minute===events[0].minute);
  if(earliest.every(e=>finite(e.addedTime))) {const minimum=Math.min(...earliest.map(e=>e.addedTime));earliest=earliest.filter(e=>e.addedTime===minimum);}
  if (earliest.length>1 && earliest.every(e=>Number.isInteger(e.eventOrder)) && new Set(earliest.map(e=>e.eventOrder)).size===earliest.length) earliest.sort((a,b)=>a.eventOrder-b.eventOrder);
  const ordered=earliest.length===1||earliest.every(e=>Number.isInteger(e.eventOrder))&&new Set(earliest.map(e=>e.eventOrder)).size===earliest.length;
  return {playerIds:ordered?[earliest[0].playerId]:earliest.map(e=>e.playerId),coverage:'COMPLETE',tie:!ordered,minute:events[0].minute,orderingSource:ordered&&earliest.length>1?'SOURCE_EVENT_ORDER':earliest.length===1?'DISTINCT_MINUTE':'UNRESOLVED_TIE_SET'};
}
