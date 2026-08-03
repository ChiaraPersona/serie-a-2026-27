const standingsNumber = value => value === null || value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const standingsFirstNumber = (...values) => values.map(standingsNumber).find(value => value !== null) ?? null;
const standingsSideStats = (match, side) => match.teamStats?.[side] || match.statistics?.[side] || null;
const standingsCardTotal = stats => {
  if (!stats) return null;
  const values = [stats.yellowCards, stats.secondYellowCards, stats.straightRedCards].map(standingsNumber);
  return values.every(value => value === null) ? null : values.reduce((total, value) => total + (value ?? 0), 0);
};

function calculateStandings(teams, matches) {
  const rows = new Map(teams.map(team => [team.id, {
    team: team.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    penaltiesFor: 0,
    penaltiesAgainst: 0,
    cardsFor: 0,
    cardsAgainst: 0,
    disciplineCoverage: { penaltiesFor: 0, penaltiesAgainst: 0, cardsFor: 0, cardsAgainst: 0 }
  }]));
  const addDiscipline = (row, ownStats, opponentStats) => {
    const values = {
      penaltiesFor: standingsFirstNumber(ownStats?.penaltiesFor, ownStats?.penaltiesWon, ownStats?.penaltiesAwarded),
      penaltiesAgainst: standingsFirstNumber(ownStats?.penaltiesAgainst, ownStats?.penaltiesConceded, opponentStats?.penaltiesFor, opponentStats?.penaltiesWon),
      cardsFor: standingsCardTotal(opponentStats),
      cardsAgainst: standingsCardTotal(ownStats)
    };
    for (const [key, value] of Object.entries(values)) {
      if (value === null) continue;
      row[key] += value;
      row.disciplineCoverage[key]++;
    }
  };
  for (const match of matches) {
    if (match.competition !== "serie-a" || match.status !== "finished" || !match.score) continue;
    const home = rows.get(match.homeTeam); const away = rows.get(match.awayTeam);
    if (!home || !away) throw new Error(`Squadra mancante per ${match.id}`);
    home.played++; away.played++; home.goalsFor += match.score.home; home.goalsAgainst += match.score.away; away.goalsFor += match.score.away; away.goalsAgainst += match.score.home;
    addDiscipline(home, standingsSideStats(match, "home"), standingsSideStats(match, "away"));
    addDiscipline(away, standingsSideStats(match, "away"), standingsSideStats(match, "home"));
    if (match.score.home > match.score.away) { home.won++; away.lost++; home.points += 3; }
    else if (match.score.home < match.score.away) { away.won++; home.lost++; away.points += 3; }
    else { home.drawn++; away.drawn++; home.points++; away.points++; }
  }
  return [...rows.values()].map(row => {
    const completeValue = key => row.played === 0 ? 0 : row.disciplineCoverage[key] === row.played ? row[key] : null;
    const { disciplineCoverage, ...standing } = row;
    return {
      ...standing,
      goalDifference: row.goalsFor - row.goalsAgainst,
      penaltiesFor: completeValue("penaltiesFor"),
      penaltiesAgainst: completeValue("penaltiesAgainst"),
      cardsFor: completeValue("cardsFor"),
      cardsAgainst: completeValue("cardsAgainst")
    };
  }).sort((a,b) => b.points-a.points || b.goalDifference-a.goalDifference || b.goalsFor-a.goalsFor || a.team.localeCompare(b.team));
}
if (typeof module !== "undefined") module.exports = { calculateStandings };
