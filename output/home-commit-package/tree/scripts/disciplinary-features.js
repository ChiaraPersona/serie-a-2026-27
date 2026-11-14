"use strict";
const {disciplinaryCoverage,normalizeEvent,nameKey,componentAggregate,TARGET_VERSION} = require('../js/pages/disciplinary.mjs');
function historicalDisciplinaryFeatures(player) {
  const totals=player?.previousSeason?.totals;
  if(!totals)return null;
  const cards=componentAggregate({yellowCards:totals.yellowCards,secondYellowCards:totals.secondYellowCards,straightRedCards:totals.straightRedCards});
  return {...totals,per90:{...totals.per90,cards:cards.coverage==='COMPLETE'?totals.per90?.cards??null:null},disciplinaryCoverage:cards,
    targetInterpretation:'HISTORICAL_PROVIDER_CATEGORIES_DATA_ONLY',sources:player.sources??[],normalization:'Copy of prior-season totals; all-card rate withheld when any component is missing',usedInLegacyRiskScore:false};
}
// Research data only. Callers must not feed these fields into legacy riskScore.
function aggregateDisciplinaryFeatures(matches, teamId, cutoff = {}) {
  const eligible = matches.filter(m => m.competition === 'serie-a' && m.season === '2026-27' && m.status === 'finished' &&
    (m.homeTeam === teamId || m.awayTeam === teamId) && m.id !== cutoff.targetMatchId &&
    (!cutoff.asOfMatchdayExclusive || m.matchday < cutoff.asOfMatchdayExclusive) && (!cutoff.asOf || new Date(m.date || m.kickoff) < new Date(cutoff.asOf)));
  const rows = new Map();
  for (const match of eligible) {
    const side = match.homeTeam === teamId ? 'home' : 'away';
    const participants = [...(match.playerStats?.[side] || []), ...(match.didNotPlay?.[side] || [])];
    for (const raw of match.bookings || []) if (raw.team === teamId && !participants.some(p => raw.playerId && p.playerId === raw.playerId || !raw.playerId && nameKey(p.player) === nameKey(raw.player))) participants.push({playerId:raw.playerId,player:raw.player});
    const seen = new Set();
    for (const p of participants) {
      const key = p.playerId || `name:${nameKey(p.player)}`;
      if (seen.has(key)) continue; seen.add(key);
      if (!rows.has(key)) rows.set(key,{playerId:p.playerId ?? null,playerName:p.player,teamId,appearances:0,starts:0,minutes:0,minutesCoverage:0,startsCoverage:0,participationSamples:0,
        appearancesCoverage:0,ordinaryYellows:0,secondYellowDismissals:0,straightReds:0,anyQualifyingCard:0,knownCardEvents:0,disciplinarySamples:0,completeSamples:0,unknownEvents:0,
        foulsCommitted:0,foulsCommittedCoverage:0,foulsSuffered:0,foulsSufferedCoverage:0,sources:[]});
      const row = rows.get(key), played = typeof p.minutes === 'number' && p.minutes > 0;
      const unused = (match.didNotPlay?.[side] || []).some(x => x.playerId && x.playerId === p.playerId);
      row.participationSamples++;
      if (typeof p.minutes === 'number' || unused) row.appearancesCoverage++;
      if (played) row.appearances++;
      if (played && typeof p.starter === 'boolean') {row.startsCoverage++;if (p.starter) row.starts++;}
      if (typeof p.minutes === 'number') {row.minutes += p.minutes;row.minutesCoverage++;} else if (unused) row.minutesCoverage++;
      for (const [field,source] of [['foulsCommitted','foulsCommitted'],['foulsSuffered','foulsWon']]) if (played && typeof p[source] === 'number') {row[field]+=p[source];row[`${field}Coverage`]++;}
      const cards = (match.bookings || []).filter(e => e.team === teamId && (p.playerId && e.playerId ? e.playerId === p.playerId : nameKey(e.player) === nameKey(p.player))).map(e => normalizeEvent(e,match));
      row.disciplinarySamples++;
      if (disciplinaryCoverage(match) === 'COMPLETE' && cards.every(e => e.eventType !== 'unknown')) row.completeSamples++;
      row.unknownEvents += cards.filter(e => e.eventType === 'unknown').length;
      row.ordinaryYellows += cards.filter(e => e.eventType === 'yellow').length;
      row.secondYellowDismissals += cards.filter(e => e.eventType === 'yellowRedCard').length;
      row.straightReds += cards.filter(e => e.eventType === 'redCard').length;
      row.knownCardEvents += cards.filter(e => e.eventType !== 'unknown').length;
      // ALL_RECORDED_CONTEXTS describes data, not bookmaker eligibility.
      if (cards.some(e => e.eventType !== 'unknown')) row.anyQualifyingCard++;
      row.sources.push({matchId:match.id,provider:match.resultSource?.provider ?? 'StatMuse',url:match.resultSource?.url ?? match.sourceUrl ?? null,fields:['bookings','playerStats','didNotPlay'],coverage:disciplinaryCoverage(match)});
    }
  }
  return [...rows.values()].map(row => {
    const complete = row.completeSamples === row.disciplinarySamples;
    const knownComponents = {ordinaryYellows:row.ordinaryYellows,secondYellowDismissals:row.secondYellowDismissals,straightReds:row.straightReds,anyQualifyingCard:row.anyQualifyingCard};
    const appearancesComplete=row.appearancesCoverage===row.participationSamples;
    const ratesValid = complete && row.minutesCoverage === row.participationSamples && row.minutes > 0;
    return {...row,knownAppearances:row.appearances,appearances:row.appearancesCoverage===row.participationSamples?row.appearances:null,identityResolution:row.playerId?'CANONICAL_ID':'NAME_ONLY_FALLBACK',...Object.fromEntries(Object.entries(knownComponents).map(([k,v]) => [k,complete ? v : null])),
      cardsPer90:ratesValid ? row.knownCardEvents*90/row.minutes : null,yellowPer90:ratesValid ? row.ordinaryYellows*90/row.minutes : null,
      knownFoulsCommitted:row.foulsCommitted,knownFoulsSuffered:row.foulsSuffered,knownMinutes:row.minutes,knownStarts:row.starts,
      foulsCommitted:appearancesComplete && row.foulsCommittedCoverage === row.appearances ? row.foulsCommitted : null,
      foulsCommittedPer90:appearancesComplete && row.minutesCoverage===row.participationSamples && row.foulsCommittedCoverage === row.appearances && row.minutes > 0 ? row.foulsCommitted*90/row.minutes : null,
      foulsSuffered:appearancesComplete && row.foulsSufferedCoverage === row.appearances ? row.foulsSuffered : null,
      minutes:row.minutesCoverage === row.participationSamples ? row.minutes : null,starts:appearancesComplete && row.startsCoverage === row.appearances ? row.starts : null,
      disciplinaryCoverage:{status:complete ? 'COMPLETE' : row.completeSamples || row.knownCardEvents ? 'PARTIAL' : 'UNKNOWN',completeSamples:row.completeSamples,sampleSize:row.disciplinarySamples,knownComponents,missingComponents:complete ? [] : ['incomplete-match-feeds']},
      targetInterpretation:'ALL_RECORDED_CONTEXTS_DATA_ONLY',targetVersion:TARGET_VERSION,asOf:cutoff,usedInLegacyRiskScore:false};
  });
}
module.exports = {aggregateDisciplinaryFeatures,historicalDisciplinaryFeatures};
