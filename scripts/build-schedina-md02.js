const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const write = (relative, value) => fs.writeFileSync(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`);
const predictions = read("data/normalized/predictions.json");
const matches = read("data/normalized/matches.json");
const teams = read("data/teams/index.json").teams;
const odds = read("data/normalized/odds/sisal/serie-a.json");
const teamName = new Map(teams.map(team => [team.id, team.name]));
const matchById = new Map(matches.map(match => [match.id, match]));
const roundPredictions = predictions.predictions.filter(prediction => prediction.matchId.endsWith("-md-02"));

const admitted = roundPredictions.flatMap(prediction => prediction.combinations
  .filter(combo => combo.qualityStatus === "qualificata")
  .map(combo => ({ prediction, combo })));

const slips = admitted.map(({ prediction, combo }, index) => {
  const match = matchById.get(prediction.matchId);
  if (!match) throw new Error(`Partita non trovata: ${prediction.matchId}`);
  const fixture = `${teamName.get(match.homeTeam) || match.homeTeam} – ${teamName.get(match.awayTeam) || match.awayTeam}`;
  const risk = prediction.decisionSupport?.portfolios?.find(portfolio => portfolio.tier === combo.tier);
  if (!risk?.allowed) throw new Error(`Portafoglio ${prediction.matchId}/${combo.tier} non ammesso dal livello decisionale`);
  const weakest = combo.legs.find(leg => leg.label === combo.weakestLeg?.label) || combo.legs.reduce((a, b) => a.prudentProbabilityPct < b.prudentProbabilityPct ? a : b);
  return {
    id: `${prediction.matchId}-${combo.tier.toLowerCase()}`,
    type: "same-match-mycombo",
    number: index + 1,
    eyebrow: `MyCombo · ${combo.tier}`,
    name: fixture,
    description: combo.logic,
    selectionPolicy: "Numero di gambe determinato dalla qualità, senza riempimento forzato.",
    marketFamilies: [...new Set(combo.legs.map(leg => leg.market))],
    combinedOdds: combo.odds,
    jointModelProbabilityPct: combo.prudentProbabilityPct,
    fairOdds: combo.fairOdds,
    expectedValuePct: combo.prudentExpectedValuePct,
    qualityStatus: "qualificata",
    qualityLabel: "Nei limiti",
    excludedLegsCount: 0,
    filterNote: `Rischio ${risk.riskScore}/100 · ${risk.strongDependencies} dipendenze forti · ${risk.contradictions} contraddizioni.`,
    weakestLeg: {
      fixture,
      label: weakest.label,
      expectedValuePct: weakest.expectedValuePct
    },
    risk: {
      score: risk.riskScore,
      level: risk.riskLevel,
      strongDependencies: risk.strongDependencies,
      contradictions: risk.contradictions,
      status: risk.status
    },
    legs: combo.legs.map(leg => ({
      matchId: prediction.matchId,
      fixture,
      startsAt: `${match.date}T${match.kickoff}:00`,
      market: leg.market,
      marketScope: leg.marketScope,
      marketFamily: leg.market,
      player: null,
      selection: leg.selection,
      variant: leg.variant,
      threshold: leg.threshold,
      label: leg.label,
      odds: leg.odds,
      modelProbabilityPct: leg.prudentProbabilityPct,
      fairOdds: leg.fairOdds,
      expectedValuePct: leg.expectedValuePct,
      reliability: "prudenziale",
      evidenceLabel: `${leg.prudentProbabilityPct.toLocaleString("it-IT")}% prudenziale · ${leg.method}`,
      coherent: true,
      providerSelectionId: leg.providerSelectionId
    }))
  };
});

const output = {
  schemaVersion: 1,
  competition: "serie-a",
  season: "2026-27",
  matchday: 2,
  generatedAt: new Date().toISOString(),
  title: "MyCombo della seconda giornata",
  description: "Proposte qualificate senza forzare il numero di gambe o la quota obiettivo; i profili che non superano i limiti restano N/D.",
  provider: odds.provider,
  sourceUrl: odds.sourceUrl,
  oddsRetrievedAt: odds.retrievedAt,
  modelVersion: predictions.engine.version,
  selectionRule: "Sono pubblicate soltanto MyCombo con EV prudenziale non negativo e portafoglio ammesso dai limiti del profilo. Le correlazioni sono valutate sulla matrice dei punteggi.",
  methodology: "Le probabilità derivano dal motore Poisson/xG e non dalle quote. Ogni proposta usa la congiunzione esatta dei mercati di risultato e gol, con stime prudenti per le dipendenze residue; quota equa = 1/probabilità prudenziale ed EV = probabilità prudenziale × quota Sisal − 1. Il numero di gambe non è prefissato e la distanza dalla quota obiettivo è tollerata quando migliora la qualità.",
  coverage: {
    fixtures: roundPredictions.length,
    profilesEvaluated: roundPredictions.length * 3,
    qualifiedProfiles: slips.length,
    unavailableProfiles: roundPredictions.length * 3 - slips.length
  },
  slips
};

if (output.coverage.fixtures !== 10 || slips.length !== 6) {
  throw new Error(`Copertura inattesa: ${output.coverage.fixtures} partite, ${slips.length} profili qualificati`);
}

write("data/normalized/schedina-md02.json", output);
console.log(`Schedina MD2 generata: ${slips.length} proposte qualificate, ${output.coverage.unavailableProfiles} profili N/D.`);
