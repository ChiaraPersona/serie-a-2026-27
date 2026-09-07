const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const round = value => Number(Number(value).toFixed(2));

const playerMarkets = read("data/normalized/champions-player-markets-md01-2026-27.json");
const odds = read("data/normalized/odds/sisal/champions-league.json");

const candidates = playerMarkets.fixtures.map(fixture => {
  const best = fixture.likelyBooked.find(candidate => candidate.sisal?.odds > 1);
  return best ? { fixture, candidate: best } : null;
}).filter(Boolean).sort((a, b) => b.candidate.riskScore - a.candidate.riskScore || a.fixture.fixtureId.localeCompare(b.fixture.fixtureId));

const selected = [];
const usedPlayers = new Set();
for (const row of candidates) {
  const key = row.candidate.playerId;
  if (usedPlayers.has(key)) continue;
  selected.push(row);
  usedPlayers.add(key);
  if (selected.length === 8) break;
}

if (selected.length < 8) throw new Error(`Servono otto ammoniti quotati in otto partite diverse; disponibili ${selected.length}.`);

const slip = (rows, index) => {
  const legs = rows.map(({ fixture, candidate }) => ({
    matchId: fixture.fixtureId,
    fixture: `${fixture.homeTeam} - ${fixture.awayTeam}`,
    player: candidate.name,
    team: candidate.team,
    label: `${candidate.name} riceve un cartellino (sostituto incluso)`,
    odds: candidate.sisal.odds,
    riskScore: candidate.riskScore,
    evidenceLabel: candidate.evidence.join(" · "),
    marketCode: candidate.sisal.marketCode,
    marketName: candidate.sisal.marketName,
    variantName: candidate.sisal.variantName,
    providerMarketId: candidate.sisal.providerMarketId,
    providerSelectionId: candidate.sisal.providerSelectionId,
    replacementIncluded: candidate.sisal.replacementIncluded
  }));
  return {
    id: `champions-poker-ammoniti-${index}`,
    eyebrow: "Champions League · Poker ammoniti",
    name: `Poker ammoniti ${index}`,
    description: "Quattro calciatori differenti, ciascuno scelto in una partita differente.",
    combinedOdds: round(legs.reduce((total, leg) => total * leg.odds, 1)),
    legs
  };
};

const slips = [slip(selected.slice(0, 4), 1), slip(selected.slice(4, 8), 2)];
const output = {
  schemaVersion: 1,
  competition: "UEFA Champions League",
  season: "2026/27",
  matchday: 1,
  generatedAt: new Date().toISOString(),
  provider: "Sisal",
  oddsRetrievedAt: odds.retrievedAt,
  sourceUrl: odds.sourceUrl,
  selectionRule: "I candidati sono ordinati esclusivamente dall'indice disciplinare del modello; la quota Sisal viene associata dopo e resta un numero esterno.",
  exclusions: ["risultati esatti", "risultati esatti multiesito", "quasi ammonito", "Draw No Bet", "confronti tiri giocatore", "prima a corner"],
  summary: { slips: slips.length, legs: 8, distinctPlayers: 8, distinctFixtures: 8 },
  slips
};

write("data/normalized/schedina-champions-md01.json", output);
console.log(`Schedina Champions: ${output.summary.slips} poker, ${output.summary.distinctPlayers} giocatori, ${output.summary.distinctFixtures} partite.`);
