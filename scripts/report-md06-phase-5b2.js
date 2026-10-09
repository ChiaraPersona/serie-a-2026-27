"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const output = path.join(root, "output/reports/serie-a-md06-phase-5b2-2026-10-09.md");
const schedina = read("data/normalized/schedina-md06.json");
const audit = read("output/reports/serie-a-md06-group-b-audit-2026-10-09.json");
const catalog = schedina.marketCatalog;
const rows = catalog.matches.flatMap(match => match.selections);
const b2 = rows.filter(row => row.catalogOrigin === "gruppo-b2");
const dnb = rows.filter(row => row.catalogOrigin === "dnb-b1");
const previous = rows.filter(row => !["gruppo-b2", "dnb-b1"].includes(row.catalogOrigin));
const auditedB2 = audit.classifications.filter(row => row.level === "B2");
const evCounts = subset => ({
  positive: subset.filter(row => Number(row.betSelection.evaluation.expectedValuePct) > 0).length,
  negative: subset.filter(row => Number(row.betSelection.evaluation.expectedValuePct) < 0).length,
  zero: subset.filter(row => Number.isFinite(row.betSelection.evaluation.expectedValuePct) && Number(row.betSelection.evaluation.expectedValuePct) === 0).length,
  notModelled: subset.filter(row => !Number.isFinite(row.betSelection.evaluation.expectedValuePct)).length,
});
const table = (headers, body) => [
  `| ${headers.join(" | ")} |`,
  `| ${headers.map(() => "---").join(" | ")} |`,
  ...body.map(row => `| ${row.join(" | ")} |`),
].join("\n");

assert.equal(rows.length, 383);
assert.equal(previous.length, 160);
assert.equal(dnb.length, 20);
assert.equal(b2.length, 203);
assert.deepEqual(new Set(b2.map(row => row.selectionId)), new Set(auditedB2.map(row => row.selectionId)));

const familyRows = [
  ["DNB canonico", dnb],
  ["Multigoal partita", b2.filter(row => row.derivedMarketFamily === "multigoal-match")],
  ["Multigoal squadra", b2.filter(row => row.derivedMarketFamily === "multigoal-team")],
  ["Gol squadra · Over", b2.filter(row => row.derivedMarketFamily === "team-goals-over")],
].map(([label, subset]) => {
  const ev = evCounts(subset);
  return [label, subset.length, subset.length - ev.notModelled, ev.notModelled, ev.positive, ev.negative, ev.zero];
});

const perMatch = catalog.matches.map(match => {
  const matchDnb = match.selections.filter(row => row.catalogOrigin === "dnb-b1");
  const matchB2 = match.selections.filter(row => row.catalogOrigin === "gruppo-b2");
  const ev = evCounts(match.selections);
  return [
    match.matchId,
    match.total,
    match.evaluated,
    match.notModelled,
    matchDnb.length,
    matchB2.filter(row => row.derivedMarketFamily === "multigoal-match").length,
    matchB2.filter(row => row.derivedMarketFamily === "multigoal-team").length,
    matchB2.filter(row => row.derivedMarketFamily === "team-goals-over").length,
    ev.positive,
    ev.negative,
    ev.zero,
  ];
});

const totalEv = evCounts(rows);
const previousEv = evCounts(previous);
const dnbEv = evCounts(dnb);
const b2Ev = evCounts(b2);
const b2IdDifferences = {
  missing: auditedB2.filter(row => !b2.some(leg => leg.selectionId === row.selectionId)).length,
  unexpected: b2.filter(leg => !auditedB2.some(row => row.selectionId === leg.selectionId)).length,
};
assert.deepEqual(totalEv, { positive: 67, negative: 300, zero: 0, notModelled: 16 });
assert.deepEqual(dnbEv, { positive: 7, negative: 13, zero: 0, notModelled: 0 });
assert.deepEqual(b2Ev, { positive: 21, negative: 182, zero: 0, notModelled: 0 });

const markdown = `# Serie A 2026/27 — Fase 5B.2: integrazione DNB e mercati B2

Generato: ${schedina.generatedAt}. Ambito: esclusivamente Schedina Serie A MD6.

## Esito

Stato: **COMPLETATO**. Il catalogo passa da **160** a **383** selezioni: **20 DNB canonici** e **203 B2** aggiunti. Restano **367 valutate** e **16 NOT_MODELLED**. B3 e B4 non sono stati importati.

| Perimetro | Richiesti | Recuperati | Respinti |
| --- | --- | --- | --- |
| DNB fuori dai 886 | ${catalog.totals.dnbRequested} | ${catalog.totals.dnbRecovered} | ${catalog.totals.dnbRejected} |
| B2 auditati | ${catalog.totals.groupB2Requested} | ${catalog.totals.groupB2Recovered} | ${catalog.totals.groupB2Rejected} |

Le 160 righe precedenti restano presenti: **${previous.length - previousEv.notModelled} valutate** e **${previousEv.notModelled} NOT_MODELLED**. Nessun ID B2 manca rispetto all'audit e nessun ID inatteso è stato aggiunto (mancanti ${b2IdDifferences.missing}, inattesi ${b2IdDifferences.unexpected}).

## Conteggi per famiglia

${table(["Famiglia", "Righe", "Valutate", "NOT_MODELLED", "EV +", "EV -", "EV = 0"], familyRows)}

Totale finale: EV positivo **${totalEv.positive}**, EV negativo **${totalEv.negative}**, EV zero **${totalEv.zero}**, NOT_MODELLED **${totalEv.notModelled}**. Incrementi: DNB ${dnbEv.positive}/${dnbEv.negative}/${dnbEv.zero} e B2 ${b2Ev.positive}/${b2Ev.negative}/${b2Ev.zero} per EV positivo/negativo/zero.

## Conteggi per partita

${table(["matchId", "Totale", "Valutate", "N/D", "DNB", "MG partita", "MG squadra", "Over squadra", "EV +", "EV -", "EV 0"], perMatch)}

## Metodo e semantica

- DNB: solo le 20 righe già presenti in \`predictions.marketComparison\`. La probabilità visualizzata e la quota equa sono condizionate all'assenza del pareggio; l'EV resta quello canonico \`P(vittoria) × quota + P(pareggio) - 1\`. Il pareggio è serializzato come push/rimborso sul tempo regolamentare.
- B2: somma delle celle compatibili della matrice punteggi V2 normalizzata. Probabilità prudente uguale al minimo tra matrice centrale e le quattro sensibilità lambda ±10%; fair \`1/P prudente\`; EV \`P prudente × quota - 1\`.
- Predicati: intervalli Multigoal inclusivi; squadra 1=casa e squadra 2=trasferta; Over squadra applicato alla soglia esatta del mercato.
- Provenienza: providerMarketId/providerSelectionId, snapshot quote, versione modello, timestamp previsione, predicato e sensibilità sono conservati nel BetSelection.
- Nessuna nuova lambda, formula, distribuzione o probabilità DNB è stata introdotta.

## Verifiche

- 4/4 valutazioni B2 omologhe già serializzate riprodotte.
- 20/20 DNB riprodotti con formula push-aware; la formula binaria \`P condizionata × quota - 1\` è rifiutata dai test.
- Normalizzazione matrici, estremi Multigoal inclusivi, distinzione casa/trasferta, soglie Over, sensibilità/prudenza, fair ed EV verificati.
- Rigenerazione stabile a input invariati; selectionId univoci; quote aperte e valide; identità provider verificate.
- Policy preservata: zero Under, falli individuali, corner per periodo e doppia chance 12; nessun mercato giocatore non valido.
- UI invariata nella struttura: nessun filtro, top-N o nuova sezione; ordinamento EV, click riga e schedina personale conservati. Il DNB esplicita soltanto “Prob. senza X” e “Rimborso sul pareggio”.

## Anomalie e differenze

- Respinti DNB: ${catalog.dnbRejected.length}. Respinti B2 auditati: ${catalog.groupB2Rejected.length}.
- B2 rispetto all'audit 5B.1: mancanti ${b2IdDifferences.missing}, inattesi ${b2IdDifferences.unexpected}.
- B3: ${audit.summary.levelTotals.B3}, B4: ${audit.summary.levelTotals.B4}; entrambi lasciati fuori dal catalogo.
- Lo snapshot quote contiene una selezione Over squadra non aperta esterna ai 203 B2 auditati; resta esclusa e non altera la riconciliazione.

## File interessati

- \`scripts/predictions/engine.js\` (sole esportazioni di funzioni pure già esistenti)
- \`scripts/score-market-evaluation.js\`
- \`scripts/betting-selection-contract.js\`
- \`scripts/md06-market-catalog.js\`
- \`scripts/build-md06-betting-decision-package.mjs\`
- \`scripts/test-score-market-evaluation.js\`
- \`scripts/test-schedina-md06.js\`
- \`scripts/check-schedina-md06-browser.cjs\`
- \`js/pages/betting.js\`
- \`data/normalized/schedina-md06.json\`
- \`output/reports/serie-a-md06-betting-selection-2026-10-09.{json,md}\`
- \`output/md06/schedina-1440x1000.png\` e \`output/md06/schedina-390x844-betslip.png\`
- \`output/reports/serie-a-md06-phase-5b2-2026-10-09.md\`

## Stato finale del worktree

Il worktree resta intenzionalmente non pulito: contiene le modifiche e gli artefatti della Fase 5B.2 sopra elencati, oltre agli input/report dell'audit 5B.1 e a modifiche Champions preesistenti estranee. Questi ultimi non sono stati modificati né inclusi nell'integrazione. Nessun file MD1–MD5, MyCombo, quota sorgente o previsione originale risulta modificato dalla Fase 5B.2.

Non sono stati modificati Engine V2 nelle formule, previsioni originarie, quote sorgente, MyCombo, MD1–MD5, Champions/multileague, B3 o B4. Nessun commit, push o deploy eseguito.
`;

fs.writeFileSync(output, markdown);
console.log(`OK report Fase 5B.2: ${path.relative(root, output)} · ${rows.length} selezioni`);
