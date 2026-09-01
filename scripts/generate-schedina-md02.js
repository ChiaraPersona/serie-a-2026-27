"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const matchdayIndex = process.argv.indexOf("--matchday");
const matchday = matchdayIndex >= 0 ? Number(process.argv[matchdayIndex + 1]) : 2;
if (!Number.isInteger(matchday) || matchday < 2 || matchday > 38) throw new Error("--matchday deve essere compreso tra 2 e 38.");
const matchdayCode = String(matchday).padStart(2, "0");
const roman = value => {
  const symbols = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let number = value, output = "";
  for (const [amount, symbol] of symbols) while (number >= amount) { output += symbol; number -= amount; }
  return output;
};
const suffix = roman(matchday);
const odds = read("data/normalized/odds/sisal/serie-a.json");
const predictions = read("data/normalized/predictions.json").predictions.filter(item => item.matchId.endsWith(`-md-${matchdayCode}`));
const matches = read("data/normalized/matches.json").filter(item => item.matchday === matchday && item.competition === "serie-a");
const teams = new Map(read("data/teams/index.json").teams.map(team => [team.id, read(`data/teams/${team.id}.json`)]));
const predictionById = new Map(predictions.map(item => [item.matchId, item]));
const matchById = new Map(matches.map(item => [item.id, item]));
const eventById = new Map(odds.events.map(item => [item.canonicalMatchId, item]));
const used = new Set();
const clean = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const round = value => Math.round(value * 10) / 10;

if (matches.length !== 10 || predictions.length !== 10 || odds.events.length !== 10) {
  throw new Error(`Copertura MD${matchdayCode} incompleta: ${matches.length} partite, ${predictions.length} pronostici, ${odds.events.length} eventi Sisal.`);
}
if (predictions.some(item => String(item.market?.retrievedAt) !== String(eventById.get(item.matchId)?.retrievedAt))) {
  throw new Error("Pronostici e quote Sisal non appartengono allo stesso snapshot.");
}

function normalCdf(value) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  return 0.5 * (1 + erf);
}

function marketFamily(name) {
  if (/1X2|DOPPIA CHANCE/.test(name)) return "Esito";
  if (name === "DRAW NO BET") return "Draw No Bet";
  if (name === "UNDER/OVER") return "Under/Over";
  if (name === "GOAL/NOGOAL") return "Goal/No Goal";
  if (/^(CASA|OSPITE): SEGNA GOAL$/.test(name)) return "Gol squadra";
  if (/CORNER/.test(name)) return "Corner";
  if (/PUNTI CARTELLINI/.test(name)) return "Cartellini";
  if (/PARATE/.test(name)) return "Parate squadra";
  if (/TIRI IN PORTA GIOCATORE/.test(name)) return "Tiri in porta giocatore";
  if (/TIRI TOTALI GIOCATORE/.test(name)) return "Tiri giocatore";
  if (name === "ASSIST (DUO) INC TS") return "Assist giocatore";
  if (name === "GIOCATORE (DUO) SEGNA O FA ASSIST INC TS") return "Gol o assist giocatore";
  if (/MARCATORE/.test(name)) return "Marcatori";
  if (/TIRI IN PORTA/.test(name)) return "Tiri in porta";
  if (/TIRI TOTALI/.test(name)) return "Tiri totali";
  return name;
}

function sourcePick(event, market, selection, label, extra = {}) {
  return {
    selectionId: String(selection.providerSelectionId),
    family: marketFamily(market.marketName),
    matchId: event.canonicalMatchId,
    odds: selection.odds,
    pick: {
      matchId: event.canonicalMatchId,
      market: market.marketName,
      variant: market.variantName,
      selection: selection.name,
      label,
      ...extra
    }
  };
}

function scoreCandidates() {
  const candidates = [];
  for (const prediction of predictions) {
    const event = eventById.get(prediction.matchId);
    const index = new Map(event.markets.flatMap(market => market.selections.map(selection => [String(selection.providerSelectionId), { market, selection }])));
    for (const row of prediction.marketComparison || []) {
      if (!row.scenarioCompatible || row.selection === "12" || row.expectedValuePct < -10 || row.odds < 1.1) continue;
      if (!["1x2", "double-chance", "draw-no-bet", "goals", "btts", "team-goal"].includes(row.family)) continue;
      const resolved = index.get(String(row.providerSelectionId));
      if (!resolved || !["1X2 ESITO FINALE", "DOPPIA CHANCE", "DRAW NO BET", "UNDER/OVER", "GOAL/NOGOAL", "CASA: SEGNA GOAL", "OSPITE: SEGNA GOAL"].includes(resolved.market.marketName)) continue;
      const label = row.family === "goals"
        ? `${row.selection === "OVER" ? "Over" : "Under"} ${String(resolved.market.threshold).replace(".", ",")} gol`
        : row.family === "btts" ? (row.selection === "GOAL" ? "Entrambe le squadre segnano" : "Almeno una squadra non segna")
        : row.family === "team-goal" ? `${resolved.market.marketName.startsWith("CASA") ? event.home.name : event.away.name} ${row.selection === "SI" ? "segna almeno un gol" : "non segna"}`
        : row.family === "draw-no-bet" ? `${row.selection === "1" ? event.home.name : event.away.name} Draw No Bet`
        : row.selection === "1" ? `${event.home.name} vincente`
          : row.selection === "2" ? `${event.away.name} vincente`
            : row.selection === "1X" ? `${event.home.name} o pareggio`
              : row.selection === "X2" ? `${event.away.name} o pareggio` : "Pareggio";
      candidates.push({
        ...sourcePick(event, resolved.market, resolved.selection, label),
        ev: row.expectedValuePct,
        probability: Number(row.modelProbabilityPct) / 100
      });
    }
  }
  return candidates;
}

function volumeCandidates() {
  const candidates = [];
  for (const event of odds.events) {
    const prediction = predictionById.get(event.canonicalMatchId);
    for (const market of event.markets) {
      let metric = null;
      if (/^U\/O CORNER(?: SQUADRA X)?$/.test(market.marketName)) {
        const side = market.variantName.match(/SQUADRA ([12])/i)?.[1];
        metric = side ? prediction.teamProjections?.[Number(side) - 1]?.corners : prediction.matchProjection?.corners;
      } else if (/U\/O TIRI TOTALI(?: SQUADRA X)?$/.test(market.marketName)) {
        const side = market.variantName.match(/SQUADRA ([12])/i)?.[1];
        metric = side ? prediction.teamProjections?.[Number(side) - 1]?.shotsTotal : prediction.matchProjection?.shotsTotal;
      } else if (/U\/O TIRI IN PORTA(?: SQUADRA X)?$/.test(market.marketName)) {
        const side = market.variantName.match(/SQUADRA ([12])/i)?.[1];
        metric = side ? prediction.teamProjections?.[Number(side) - 1]?.shotsOnTarget : prediction.matchProjection?.shotsOnTarget;
      } else continue;
      const central = Number(metric?.central), sd = Number(metric?.sd), threshold = Number(market.threshold);
      if (![central, sd, threshold].every(Number.isFinite) || sd <= 0) continue;
      for (const selection of market.selections) {
        if (selection.status !== "open" || selection.odds < 1.1 || !["OVER", "UNDER"].includes(selection.name)) continue;
        const coherent = selection.name === "OVER" ? central > threshold : central < threshold;
        if (!coherent) continue;
        const under = normalCdf((threshold - central) / sd);
        const probability = selection.name === "OVER" ? 1 - under : under;
        const ev = (probability * selection.odds - 1) * 100;
        if (ev < -10) continue;
        const side = market.variantName.match(/SQUADRA ([12])/i)?.[1];
        const teamName = side ? (side === "1" ? event.home.name : event.away.name) : "Partita";
        const measure = market.marketName.includes("CORNER") ? "corner" : market.marketName.includes("TIRI IN PORTA") ? "tiri in porta" : "tiri totali";
        const amount = selection.name === "OVER" ? Math.floor(threshold) + 1 : `meno di ${String(threshold).replace(".", ",")}`;
        const label = `${teamName} ${selection.name === "OVER" ? "almeno " : ""}${amount} ${measure}`;
        candidates.push({ ...sourcePick(event, market, selection, label), ev: round(ev), probability });
      }
    }
  }
  return candidates;
}

function takeMixed(pool, name, eyebrow, description, targetLegs, minFamilies, minOdds, maxOdds) {
  const grouped = new Map();
  for (const item of pool.filter(candidate => !used.has(candidate.selectionId) && candidate.ev >= -10 && Number.isFinite(candidate.probability))) {
    const key = `${item.matchId}|${item.family}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  }
  const candidates = [...grouped.values()]
    .flatMap(items => items.sort((a, b) => b.probability - a.probability || b.ev - a.ev || a.odds - b.odds).slice(0, 2))
    .sort((a, b) => b.probability - a.probability || b.ev - a.ev || a.odds - b.odds);
  let best = null;

  function visit(start, chosen, matchIds, families, oddsProduct, probabilityProduct) {
    if (chosen.length === targetLegs) {
      if (oddsProduct < minOdds || oddsProduct > maxOdds || families.size < minFamilies || !families.has("Esito")) return;
      if (!best || probabilityProduct > best.probability || (probabilityProduct === best.probability && oddsProduct < best.odds)) {
        best = { chosen: chosen.slice(), probability: probabilityProduct, odds: oddsProduct };
      }
      return;
    }
    for (let index = start; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (matchIds.has(candidate.matchId) || oddsProduct * candidate.odds > maxOdds) continue;
      chosen.push(candidate);
      matchIds.add(candidate.matchId);
      visit(index + 1, chosen, matchIds, new Set(families).add(candidate.family), oddsProduct * candidate.odds, probabilityProduct * candidate.probability);
      matchIds.delete(candidate.matchId);
      chosen.pop();
    }
  }

  visit(0, [], new Set(), new Set(), 1, 1);
  if (!best) throw new Error(`${name}: nessuna combinazione rispetta ${targetLegs} gambe, ${minFamilies} famiglie e quota ${minOdds}–${maxOdds}.`);
  for (const candidate of best.chosen) used.add(candidate.selectionId);
  return { id: clean(name).replace(/ /g, "-"), eyebrow, name, description, picks: best.chosen.map(item => item.pick) };
}

function projectedPlayer(variantName, match) {
  const variant = clean(variantName);
  for (const [teamPosition, teamId] of [match.homeTeam, match.awayTeam].entries()) {
    const team = teams.get(teamId);
    for (const entry of team?.probableLineup?.players || []) {
      const name = entry.name || entry;
      const tokens = clean(name).split(" ").filter(Boolean);
      if (tokens.length < 2) continue;
      const surname = tokens.at(-1), first = tokens[0];
      if (variant.includes(surname) && (variant.includes(first) || variant.includes(`${surname} ${first[0]}`))) {
        const player = team.squad?.find(item => clean(item.name) === clean(name));
        if (player) return { name: player.name, player, teamPosition, teamSide: teamPosition === 0 ? "home" : "away" };
      }
    }
  }
  return null;
}

function playerCandidates() {
  const allowed = new Set([
    "U/O TIRI TOTALI GIOCATORE (DUO) INC TS",
    "U/O  TIRI IN PORTA GIOCATORE (DUO) INC PALI TRAVERSE INC TS",
    "ASSIST (DUO) INC TS",
    "GIOCATORE (DUO) SEGNA O FA ASSIST INC TS",
    "MARCATORE SI/NO (DUO) INC TS"
  ]);
  const candidates = [];
  for (const event of odds.events) {
    const match = matchById.get(event.canonicalMatchId), prediction = predictionById.get(event.canonicalMatchId);
    const score = prediction.scoreForecast.primary.score.split("-").map(Number);
    for (const market of event.markets) {
      if (!allowed.has(market.marketName)) continue;
      const context = projectedPlayer(market.variantName, match);
      const totals = context?.player?.previousSeason?.totals;
      if (!context || Number(totals?.minutes) < 700) continue;
      const isShots = /TIRI.*GIOCATORE/.test(market.marketName);
      const isAssist = market.marketName === "ASSIST (DUO) INC TS";
      const isGoalAssist = market.marketName === "GIOCATORE (DUO) SEGNA O FA ASSIST INC TS";
      const isScorer = market.marketName === "MARCATORE SI/NO (DUO) INC TS";
      if (!isShots && score[context.teamPosition] < 1) continue;
      if (isAssist && !Number.isFinite(Number(totals?.per90?.assists))) continue;
      if ((isGoalAssist || isScorer) && !Number.isFinite(Number(totals?.per90?.goals))) continue;
      if (isGoalAssist && !Number.isFinite(Number(totals?.per90?.assists))) continue;
      const target = isShots ? "OVER" : "SI";
      const selection = market.selections.find(item => item.status === "open" && item.name === target && item.odds >= 1.1);
      if (!selection) continue;
      const threshold = Number(market.threshold);
      const label = isShots
        ? `${context.name} almeno ${Math.floor(threshold) + 1} ${market.marketName.includes("TIRI IN PORTA") ? "tiri in porta" : "tiri"} · sostituto incluso`
        : isAssist ? `${context.name} assist · sostituto incluso`
          : isGoalAssist ? `${context.name} gol o assist · sostituto incluso`
            : `${context.name} marcatore · sostituto incluso`;
      candidates.push({
        ...sourcePick(event, market, selection, label, { player: context.name, ...(isScorer ? { teamSide: context.teamSide } : {}) }),
        priority: isAssist ? 5 : isGoalAssist ? 4 : isScorer ? 3 : market.marketName.includes("TIRI IN PORTA") ? 2 : 1
      });
    }
  }
  return candidates;
}

function takePlayers(pool, name, eyebrow, description, offset) {
  if (new Set(pool.map(item => item.matchId)).size < 8 || new Set(pool.map(item => item.family)).size < 3) {
    return {
      id: clean(name).replace(/ /g, "-"),
      type: "player-only",
      eyebrow,
      name,
      description,
      status: "N/D",
      reason: "Mercati giocatore insufficienti nello snapshot Sisal: non vengono forzate selezioni su allenatori o calciatori non coperti dal modello.",
      picks: []
    };
  }
  const chosen = [], matchIds = new Set();
  const families = ["Assist giocatore", "Gol o assist giocatore", "Marcatori", "Tiri in porta giocatore", "Tiri giocatore"];
  for (const family of families) {
    const options = pool.filter(item => item.family === family && !used.has(item.selectionId) && !matchIds.has(item.matchId)).sort((a, b) => b.priority - a.priority || a.odds - b.odds);
    const candidate = options[offset % Math.max(1, Math.min(2, options.length))] || options[0];
    if (!candidate) continue;
    chosen.push(candidate); used.add(candidate.selectionId); matchIds.add(candidate.matchId);
  }
  while (chosen.length < 8) {
    const candidate = pool.filter(item => !used.has(item.selectionId) && !matchIds.has(item.matchId)).sort((a, b) => b.priority - a.priority || a.odds - b.odds)[0];
    if (!candidate) break;
    chosen.push(candidate); used.add(candidate.selectionId); matchIds.add(candidate.matchId);
  }
  if (chosen.length !== 8 || new Set(chosen.map(item => item.family)).size < 3) throw new Error(`${name}: servono otto mercati giocatore su gare diverse.`);
  return { id: clean(name).replace(/ /g, "-"), type: "player-only", eyebrow, name, description, picks: chosen.map(item => item.pick) };
}

function automaticMultigoalSlip() {
  return {
    id: `costellazione-md${matchday}`,
    type: "single-market-full-round",
    selectionPolicy: { type: "poisson-narrow", quantile: 0.9, maxTeamRangeWidth: 2, minModelProbability: 0.55, minLegOdds: 1.1, maxLegOdds: 1.8 },
    eyebrow: "10 partite · Multigol casa/ospite",
    name: `Costellazione ${suffix}`,
    description: `Tutta la ${matchday}ª giornata con intervalli casa/ospite stretti, scelti dal modello senza allargare le code per inseguire la quota.`,
    picks: matches.map(match => ({ matchId: match.id, market: "MULTIGOAL CASA + MULTIGOAL OSPITE", variant: "MULTIGOAL CASA + MULTIGOAL OSPITE MULTIESITI 91 ESITI", selection: "AUTO" }))
  };
}

function exactSlip() {
  const ranked = predictions.slice().sort((a, b) => b.confidence.value - a.confidence.value).slice(0, 4);
  return {
    id: `quadrante-md${matchday}`, type: "exact-score", eyebrow: "4 partite · Risultato esatto", name: `Quadrante ${suffix}`,
    description: "Quattro risultati esatti sulle gare con maggiore robustezza relativa dello scenario centrale.",
    picks: ranked.map(prediction => ({ matchId: prediction.matchId, market: "RISULTATO ESATTO 26 ESITI", variant: "RISULTATO ESATTO 26 ESITI", selection: prediction.scoreForecast.primary.score, label: `Risultato esatto ${prediction.scoreForecast.primary.score.replace("-", "–")}` }))
  };
}

function exactMultiSlip() {
  const picks = [];
  for (const prediction of predictions.slice().sort((a, b) => b.confidence.value - a.confidence.value)) {
    const event = eventById.get(prediction.matchId), score = prediction.scoreForecast.primary.score;
    const candidate = event.markets.flatMap(market => /^RISULTATO ESATTO MULTI ESITI [1-5]$/.test(market.marketName)
      ? market.selections.filter(selection => selection.status === "open" && selection.name.split("/").map(item => item.trim()).includes(score)).map(selection => ({ market, selection })) : [])
      .sort((a, b) => a.selection.odds - b.selection.odds)[0];
    if (!candidate) continue;
    picks.push({ matchId: prediction.matchId, market: candidate.market.marketName, variant: candidate.market.variantName, selection: candidate.selection.name, label: `Risultati ${candidate.selection.name.replace(/-/g, "–")}` });
    if (picks.length === 6) break;
  }
  if (picks.length !== 6) throw new Error(`Ventaglio ${suffix}: copertura multiesito insufficiente.`);
  return { id: `ventaglio-md${matchday}`, type: "exact-score-multi", eyebrow: "6 partite · Risultato esatto multiesito", name: `Ventaglio ${suffix}`, description: "Sei gruppi di risultati vicini che includono sempre lo scenario centrale del modello.", picks };
}

const mixedPool = [...scoreCandidates(), ...volumeCandidates()];
const playerPool = playerCandidates();
console.log(`Candidati Schedina MD${matchdayCode}: ${mixedPool.length} misti · ${playerPool.length} giocatore · ${new Set(playerPool.map(item => item.matchId)).size} gare con giocatori`);
const slips = [
  takeMixed(mixedPool, `Scintilla ${suffix}`, "Quota contenuta", "Tre selezioni prudenti, tre famiglie di mercato e quota complessiva nella fascia della Scintilla della prima giornata.", 3, 3, 4, 6),
  takeMixed(mixedPool, `Bagliore ${suffix}`, "Quota intermedia", "Tre mercati differenti, nessuna selezione Sisal ripetuta e una fascia quota coerente con Bagliore della prima giornata.", 3, 3, 6, 10),
  takeMixed(mixedPool, `Supernova ${suffix}`, `Tutta la ${matchday}ª giornata`, "Cinque gare e cinque famiglie di mercato, senza aggiunte forzate e con la fascia di rischio della Supernova della prima giornata.", 5, 5, 5, 10),
  takePlayers(playerPool, `Prisma ${suffix}`, "Marcatori · tiri · tiri in porta", "Otto mercati giocatore su otto gare, limitati ai titolari proiettati con storico sufficiente.", 0),
  takePlayers(playerPool, `Quasar ${suffix}`, "Mix ad alta intensità", `Secondo portafoglio di otto mercati giocatore senza riutilizzare selezioni già presenti in Prisma ${suffix}.`, 1),
  automaticMultigoalSlip(),
  exactSlip(),
  exactMultiSlip()
];

const output = {
  schemaVersion: 1,
  competition: "serie-a",
  season: "2026-27",
  matchday,
  title: `Otto schedine, otto letture · ${matchday}ª giornata`,
  description: "La stessa scomposizione della prima giornata: tre schedine miste, due dedicate ai giocatori, una Multigol casa/ospite sull'intero turno, una sui risultati esatti e una multiesito. Non è un elenco di MyCombo per partita: ogni blocco è una schedina autonoma. Quote esterne al modello, quota minima 1,10, nessun esito 12 e nessuna selezione Sisal duplicata.",
  slips
};

const destination = path.join(root, "data/sources", `schedina-serie-a-2026-27-md-${matchdayCode}.json`);
fs.writeFileSync(destination, `${JSON.stringify(output, null, 2)}\n`);
console.log(`OK fonte Schedina MD${matchdayCode}: ${slips.length} proposte · ${slips.reduce((sum, slip) => sum + slip.picks.length, 0)} selezioni · snapshot ${odds.retrievedAt}`);
