'use strict';
// Descriptive browser enrichment only. Never consumed by scoring or selections.
const side = role => /destr[oa]/i.test(role || '') ? 'right' : /sinistr[oa]/i.test(role || '') ? 'left' : null;
function withReadingDuels(prediction, squads) {
  const players = prediction.shooters?.allPlayers || [];
  const member = p => (squads.get(p.teamId)?.players || []).find(q => p.playerId && q.id === p.playerId);
  return {...prediction, likelyBooked: (prediction.likelyBooked || []).map(candidate => {
    const own = players.find(p => candidate.playerId && p.playerId === candidate.playerId && p.teamId === candidate.teamId);
    const flank = side(candidate.detailedRole || own?.detailedRole || (own && member(own)?.detailedRole));
    if (!flank || !['Difensore', 'Centrocampista'].includes(candidate.role)) return candidate;
    const seen = new Set();
    const readingDuels = players.filter(p => p.teamId !== candidate.teamId && p.role !== 'Portiere').flatMap(p => {
      const roster = member(p), opposite = side(p.detailedRole || roster?.detailedRole);
      if (!roster || !opposite || opposite === flank || seen.has(p.playerId)) return [];
      seen.add(p.playerId);
      const value = roster.previousSeason?.totals?.per90?.foulsWon;
      return [{playerId: p.playerId, name: p.name || roster.name, foulsWonPer90: Number.isFinite(value) ? value : null}];
    });
    return {...candidate, readingDuels};
  })};
}
module.exports = {withReadingDuels};
