"use strict";

const fs = require("fs");
const path = require("path");
const { buildCandidate, sha256File } = require("./champions/complete-forecast-snapshots");
const { buildSubstituteForecastCandidate } = require("./champions/substitute-minutes");

const root = path.resolve(__dirname, "..");
const auditDate = "2026-10-13";
const generatedAtArgument = process.argv.find(argument => argument.startsWith("--generated-at="));
const generatedAt = generatedAtArgument ? generatedAtArgument.slice("--generated-at=".length) : new Date().toISOString();
if (!Number.isFinite(new Date(generatedAt).getTime())) throw new Error(`Invalid --generated-at: ${generatedAt}`);

const calendarPath = path.join(root, "data/normalized/champions-league-2026-27.json");
const kickoffVerification = {
  provider: "UEFA",
  source: {
    url: "https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures-a/",
    title: "2026/27 Champions League: All the league phase fixtures and results",
    lastUpdated: "2026-10-09"
  },
  verifiedAt: "2026-10-13T09:40:00.000Z",
  matchdays: [1, 2, 3],
  timezone: "Europe/Rome",
  statedTimeBasis: "UEFA page lists all times as CET; repository calendar stores the corresponding Europe/Rome local kickoffs.",
  calendarSha256: sha256File(calendarPath)
};

const baseCandidate = buildCandidate({ root, generatedAt, kickoffVerification });
const candidate = buildSubstituteForecastCandidate({ root, baseCandidate });
const outputPath = path.join(root, `data/analysis/champions/substitute-forecast-candidate-${auditDate}.json`);
fs.writeFileSync(outputPath, `${JSON.stringify(candidate, null, 2)}\n`);

const universe = candidate.fixtures.flatMap(fixture => fixture.players.filter(player => ["starter", "potential-substitute"].includes(player.lineupStatus)));
const evaluable = universe.filter(player => player.minutesEstimate?.status === "evaluable");
const confidence = Object.fromEntries(["high", "medium", "low", "none"].map(level => [level, universe.filter(player => player.minutesEstimate?.confidence === level).length]));
const scope = Object.fromEntries(["uefa-only", "cross-competition-fallback"].map(level => [level, evaluable.filter(player => player.minutesEstimate?.sample?.competitionScope === level).length]));
const nonEvaluableReasons = universe.filter(player => player.minutesEstimate?.status === "not-evaluable").reduce((result, player) => {
  const key = player.minutesEstimate.reason || "unknown";
  result[key] = (result[key] || 0) + 1;
  return result;
}, {});
const percentage = (value, total) => total ? `${(value / total * 100).toFixed(1).replace(".", ",")}%` : "N/D";
const maxMinuteAllocation = Math.max(...candidate.fixtures.flatMap(fixture => fixture.teamMinutes.map(team => team.allocatedExpectedMinutes)));
const reconciliationRows = candidate.fixtures.flatMap(fixture => fixture.volumeReconciliation);
const maxShotsDelta = Math.max(...reconciliationRows.map(row => Math.abs(row.shots.delta ?? 0)));
const maxSotDelta = Math.max(...reconciliationRows.map(row => Math.abs(row.shotsOnTarget.delta ?? 0)));

const report = `# Champions League 2026/27 — Fase 11 substitute minutes & full player forecast coverage

Data audit: **${auditDate}**  
Gate finale: **PARTIAL**

## 1. Copertura

| universo | totale | con expected minutes | copertura |
|---|---:|---:|---:|
| titolari | ${candidate.summary.starters} | ${candidate.summary.startersWithExpectedMinutes} | ${percentage(candidate.summary.startersWithExpectedMinutes, candidate.summary.starters)} |
| potenziali subentranti | ${candidate.summary.potentialSubstitutes} | ${candidate.summary.potentialSubstitutesWithExpectedMinutes} | ${percentage(candidate.summary.potentialSubstitutesWithExpectedMinutes, candidate.summary.potentialSubstitutes)} |
| universo snapshot | ${candidate.summary.snapshotUniversePlayers} | ${evaluable.length} | ${percentage(evaluable.length, candidate.summary.snapshotUniversePlayers)} |

- Giocatori esplicitamente non valutabili: **${candidate.summary.nonEvaluablePlayers}**.
- Forecast completi tiri + SOT: **${candidate.summary.completeForecastRows}** (titolari **${candidate.summary.startersWithForecast}**, potenziali subentranti **${candidate.summary.potentialSubstitutesWithForecast}**).
- Squadre supportate: **${candidate.summary.supportedTeams}/36**.
- Riserve registrate non indicate in panchina: conservate nel payload come \`registered-reserve\`, fuori dall'universo minuti della partita.

## 2. Provenienza e qualità delle stime

La Serie A V2 viene riusata come architettura (minuti separati dai rate per 90, audit dell'evidenza e riconciliazione ai volumi squadra), ma **nessun coefficiente minuti Serie A è trasferito**. In particolare non sono usati i prior 79/76/74 né l'assunzione fissa di 22 minuti per subentro.

- Titolari: media aritmetica degli ultimi massimi 8 minuti osservati da titolare, con almeno 3 presenze esatte.
- Subentranti: frequenza osservata di ingresso su panchine nominate, moltiplicata per i minuti medi effettivi condizionati all'ingresso; minimo 3 panchine e 2 ingressi.
- Priorità alla stessa competizione UEFA; fallback documentato al campione cross-competition senza coefficienti di conversione.
- Tutti gli eventi e i relativi raw devono precedere il kickoff; anche \`retrievedAt\` deve essere non successivo al kickoff.
- Disponibilità/infortuni: non incorporati perché manca un feed individuale timestampato verificabile; nessuna assenza è inventata.

Qualità: high **${confidence.high}**, medium **${confidence.medium}**, low **${confidence.low}**, none/non valutabile **${confidence.none}**. Campione UEFA-only **${scope["uefa-only"]}**; fallback cross-competition **${scope["cross-competition-fallback"]}**.

Motivi non valutabili: ${Object.entries(nonEvaluableReasons).map(([reason, count]) => `\`${reason}\` ${count}`).join("; ") || "nessuno"}.

## 3. Modifiche matematiche solo Champions

1. Per i subentranti i minuti sono esposizione **non condizionata**: \`P(ingresso | panchina nominata) × minuti medi se entra\`.
2. Se la somma squadra supera 990 minuti, un unico fattore proporzionale la riporta al massimo regolamentare; i minuti mancanti non vengono assegnati a giocatori senza dati. Massima allocazione osservata: **${maxMinuteAllocation.toFixed(1)}**.
3. I rate tiri/SOT per 90 e la prima riconciliazione player-volume esistente restano invariati; un secondo fattore Champions-only conserva esattamente il target squadra dopo l'espansione a titolari + subentranti.
4. Probabilità evento prodotte: **${candidate.summary.eventProbabilitiesProduced}**; restano null perché il motore non le produce.

Scarto massimo dopo arrotondamento rispetto ai target squadra: tiri **${maxShotsDelta.toFixed(2)}**, SOT **${maxSotDelta.toFixed(2)}**.

## 4. Snapshot e cronologia

- I 18 fixture MD1 restano **ricalcoli post-kickoff**, non previsioni originali.
- Snapshot MD1 storici modificati: **0**.
- Il freezer accetta la copertura Fase 11 solo quando ogni titolare/potenziale subentrante è classificato e ogni giocatore valutabile ha tiri e SOT; continua a rifiutare timestamp post-kickoff o kickoff non verificati.
- Snapshot realmente congelati in questa fase: **0**, perché il dataset disponibile è MD1 e il timestamp di generazione è successivo ai kickoff.

## 5. Blocchi residui e gate

1. **${candidate.summary.nonEvaluablePlayers}** giocatori non raggiungono le soglie minime oppure non hanno un provider ID verificato.
2. Manca un feed prepartita timestampato per disponibilità, infortuni e rotazioni documentate.
3. Non è presente un input completo di giornata futura da congelare prima del kickoff; MD1 non può essere retro-promosso a originale.
4. La qualità predittiva dei nuovi minuti non è calibrata né validata out-of-sample: questa fase non esegue calibrazione.

**Gate: PARTIAL.** L'estensione è operativa, auditabile e fail-closed sulle 36 squadre, ma non è READY finché restano giocatori non valutabili e non esiste almeno una giornata futura congelata pre-kickoff con successivo riscontro actual.
`;
fs.writeFileSync(path.join(root, `output/reports/champions-substitute-minutes-${auditDate}.md`), report);

console.log(`Champions substitute forecasts: starters ${candidate.summary.startersWithExpectedMinutes}/${candidate.summary.starters} · substitutes ${candidate.summary.potentialSubstitutesWithExpectedMinutes}/${candidate.summary.potentialSubstitutes} · non evaluable ${candidate.summary.nonEvaluablePlayers}.`);
