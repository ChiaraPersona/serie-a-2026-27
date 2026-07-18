function calculateStandings(teams, matches) {
  const rows = new Map(teams.map(team => [team.id, { team: team.id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }]));
  for (const match of matches) {
    if (match.competition !== "serie-a" || match.status !== "finished" || !match.score) continue;
    const home = rows.get(match.homeTeam); const away = rows.get(match.awayTeam);
    if (!home || !away) throw new Error(`Squadra mancante per ${match.id}`);
    home.played++; away.played++; home.goalsFor += match.score.home; home.goalsAgainst += match.score.away; away.goalsFor += match.score.away; away.goalsAgainst += match.score.home;
    if (match.score.home > match.score.away) { home.won++; away.lost++; home.points += 3; }
    else if (match.score.home < match.score.away) { away.won++; home.lost++; away.points += 3; }
    else { home.drawn++; away.drawn++; home.points++; away.points++; }
  }
  return [...rows.values()].map(r => ({...r, goalDifference: r.goalsFor-r.goalsAgainst})).sort((a,b) => b.points-a.points || b.goalDifference-a.goalDifference || b.goalsFor-a.goalsFor || a.team.localeCompare(b.team));
}
if (typeof module !== "undefined") module.exports = { calculateStandings };
