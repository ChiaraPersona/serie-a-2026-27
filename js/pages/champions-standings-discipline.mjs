const count = value => Number.isInteger(value) && value >= 0 ? value : null;

// Reconcile player card events with the archived team totals. Conflicting or
// incomplete reports must never become a complete season total.
export function fixtureDiscipline(report, side) {
  const stats = report?.observedTeamStatistics?.[side];
  const penalties = count(stats?.penaltyKickShots);
  let cards = null;
  if (Array.isArray(report?.bookingEvents)) {
    const events = report.bookingEvents.filter(event => event.team === side);
    const yellow = events.filter(event => event.eventType === 'yellow-card').length;
    const second = events.filter(event => ['yellow-red-card', 'second-yellow-card'].includes(event.eventType)).length;
    const straight = events.filter(event => event.eventType === 'red-card').length;
    const known = events.every(event => ['yellow-card', 'red-card', 'yellow-red-card', 'second-yellow-card'].includes(event.eventType));
    if (known && count(stats?.yellowCards) === yellow && count(stats?.redCards) === straight + second) {
      cards = yellow + second + straight;
    }
  }
  return {penalties, cards};
}

export function championsStandingsDiscipline(fixtures) {
  const totals = new Map();
  const add = (team, values) => {
    if (!totals.has(team)) totals.set(team, {penaltiesFor: 0, penaltiesAgainst: 0, cardsFor: 0, cardsAgainst: 0});
    const row = totals.get(team);
    for (const [key, value] of Object.entries(values)) row[key] = row[key] === null || value === null ? null : row[key] + value;
  };
  for (const fixture of fixtures.filter(item => item.status === 'finished')) {
    const home = fixtureDiscipline(fixture.matchReport, 'home');
    const away = fixtureDiscipline(fixture.matchReport, 'away');
    add(fixture.homeTeam, {penaltiesFor: home.penalties, penaltiesAgainst: away.penalties, cardsFor: away.cards, cardsAgainst: home.cards});
    add(fixture.awayTeam, {penaltiesFor: away.penalties, penaltiesAgainst: home.penalties, cardsFor: home.cards, cardsAgainst: away.cards});
  }
  return totals;
}
