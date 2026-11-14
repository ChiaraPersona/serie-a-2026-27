"use strict";

// Internal research identity overlay. No name matching during fixture resolution.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const COMPETITIONS = {
  "uefa.champions": "ucl",
  "uefa.europa": "uel",
  "uefa.europa.conf": "uecl"
};
const INPUT_PATHS = {
  pilot: "data/sources/champions-pilot-match-stats-2025-27.json",
  history: "data/normalized/uefa-europe-history-2023-26.json",
  teamMap: "data/sources/champions-team-history-map-2026-27.json"
};
const key = (provider, id) => JSON.stringify([provider, String(id)]);
const validScore = score => Number.isInteger(score) && score >= 0;

function buildIdentityMap({ pilot, history, teamMap, asOf, sources = [] }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf || "")) throw new Error("Use an explicit asOf date");
  const identities = new Map(), canonical = new Map(), reconciled = new Map();
  const add = row => {
    const id = key(row.provider, row.providerTeamId), previous = identities.get(id);
    if (previous && previous.uefaTeamId !== row.uefaTeamId) throw new Error(`Conflicting identity ${id}`);
    if (!previous) identities.set(id, row);
    return !previous;
  };
  for (let index = 0; index < pilot.teams.length; index++) {
    const team = pilot.teams[index];
    // Both files already define the same canonical competition directory.
    const mappings = teamMap.teams.map((mapping, i) => ({ ...mapping, index: i })).filter(mapping => mapping.team === team.name);
    if (mappings.length !== 1 || !mappings[0].uefaTeamId || !team.id || !team.espnTeamId) throw new Error(`Missing canonical seed ${team.id}`);
    const mapping = mappings[0], uefaTeamId = String(mapping.uefaTeamId);
    if (canonical.has(team.id)) throw new Error(`Duplicate canonical ID ${team.id}`);
    canonical.set(team.id, uefaTeamId);
    add({ provider: "ESPN", providerTeamId: String(team.espnTeamId), canonicalTeamId: team.id, uefaTeamId, label: team.name, method: "existing_canonical_seed", evidence: [
      { path: INPUT_PATHS.pilot, pointer: `/teams/${index}` },
      { path: INPUT_PATHS.teamMap, pointer: `/teams/${mapping.index}` }
    ] });
  }

  // Supplemental provider identities are admitted only with explicit canonical IDs.
  for (let index = 0; index < pilot.matches.length; index++) {
    const match = pilot.matches[index];
    if (!match.source?.provider || match.date >= asOf) continue;
    for (const side of ["home", "away"]) {
      const team = match[side], uefaTeamId = canonical.get(team?.canonicalTeamId);
      if (!uefaTeamId || !team.providerTeamId) continue;
      add({ provider: match.source.provider, providerTeamId: String(team.providerTeamId), canonicalTeamId: team.canonicalTeamId, uefaTeamId, label: team.name, method: "explicit_canonical_id", evidence: [
        { path: INPUT_PATHS.pilot, pointer: `/matches/${index}/${side}`, eventId: match.eventId, source: match.source }
      ] });
    }
  }

  const byFixture = new Map();
  history.matches.forEach((match, index) => {
    if (match.date >= asOf || !validScore(match.score90?.home) || !validScore(match.score90?.away)) return;
    const signature = key(match.competitionCode, `${match.date}:${match.score90.home}:${match.score90.away}`);
    if (!byFixture.has(signature)) byFixture.set(signature, []);
    byFixture.get(signature).push({ match, index });
  });
  let changed = true, round = 0;
  while (changed) {
    changed = false;
    round++;
    for (let index = 0; index < pilot.matches.length; index++) {
      const match = pilot.matches[index], code = COMPETITIONS[match.league];
      if (match.source?.provider !== "ESPN" || !code || match.date >= asOf || !validScore(match.home?.score) || !validScore(match.away?.score)) continue;
      const home = identities.get(key("ESPN", match.home.providerTeamId));
      const away = identities.get(key("ESPN", match.away.providerTeamId));
      if (!home && !away) continue;
      const signature = key(code, `${match.date}:${match.home.score}:${match.away.score}`);
      const candidates = (byFixture.get(signature) || []).filter(({ match: candidate }) => candidate.season === match.season && (!home || String(candidate.homeTeam.id) === home.uefaTeamId) && (!away || String(candidate.awayTeam.id) === away.uefaTeamId));
      if (candidates.length !== 1) continue;
      const candidate = candidates[0];
      reconciled.set(`${match.source.provider}:${match.league}:${match.eventId}`, { providerEventId: match.eventId, uefaFixtureId: candidate.match.id, date: match.date, competitionCode: code });
      for (const side of ["home", "away"]) {
        const team = match[side], uefa = candidate.match[`${side}Team`];
        const anchors = [{ side: "home", identity: home }, { side: "away", identity: away }].filter(item => item.identity).map(item => ({ side: item.side, provider: "ESPN", providerTeamId: item.identity.providerTeamId, uefaTeamId: item.identity.uefaTeamId }));
        if (add({ provider: "ESPN", providerTeamId: String(team.providerTeamId), canonicalTeamId: null, uefaTeamId: String(uefa.id), label: team.name, uefaLabel: uefa.name, association: uefa.countryCode || null, method: "unique_anchored_historical_fixture", reconciliationRound: round, anchors, evidence: [
          { path: INPUT_PATHS.pilot, pointer: `/matches/${index}`, eventId: match.eventId, source: match.source },
          { path: INPUT_PATHS.history, pointer: `/matches/${candidate.index}`, fixtureId: candidate.match.id, date: candidate.match.date, season: candidate.match.season, competitionCode: code, score90: candidate.match.score90 }
        ] })) changed = true;
      }
    }
  }
  return {
    schemaVersion: 1, asOf, status: "internal_verified_identity_overlay", activation: false,
    policy: "Provider namespaces are separate. No fuzzy or exact-name lookup for new opponents. New IDs require a unique shared historical European fixture matched on season, competition, date, 90-minute score, home/away orientation and at least one previously known UEFA club ID. Unresolved identities remain null.",
    temporalPolicy: "Identity reconciliation may use archived evidence available now; it does not establish that these IDs were known at a historical prediction cutoff.",
    sources, summary: { identities: identities.size, canonicalSeeds: canonical.size, expandedEspnIdentities: [...identities.values()].filter(row => row.provider === "ESPN" && row.method !== "existing_canonical_seed").length, reconciledHistoricalFixtures: reconciled.size },
    canonicalIdentities: [...canonical].map(([canonicalTeamId, uefaTeamId]) => ({ canonicalTeamId, uefaTeamId })),
    identities: [...identities.values()].sort((a, b) => a.provider.localeCompare(b.provider) || a.providerTeamId.localeCompare(b.providerTeamId)),
    reconciledFixtures: [...reconciled.values()]
  };
}

function createOpponentResolver(dataset) {
  const identities = new Map(), canonical = new Map();
  for (const row of dataset.identities) {
    const id = key(row.provider, row.providerTeamId);
    if (identities.has(id)) throw new Error(`Duplicate provider identity ${id}`);
    if (!row.provider || !row.providerTeamId || !row.uefaTeamId) throw new Error("Incomplete provider identity");
    identities.set(id, row);
  }
  for (const row of dataset.canonicalIdentities) {
    if (canonical.has(row.canonicalTeamId)) throw new Error(`Duplicate canonical identity ${row.canonicalTeamId}`);
    canonical.set(row.canonicalTeamId, row.uefaTeamId);
  }
  return ({ provider, providerTeamId, canonicalTeamId }) => {
    const direct = identities.get(key(provider, providerTeamId));
    const explicit = canonicalTeamId ? canonical.get(canonicalTeamId) : null;
    if (direct && explicit && direct.uefaTeamId !== explicit) throw new Error("Provider/canonical identity conflict");
    if (direct) return { ...direct };
    if (explicit) return { provider, providerTeamId: String(providerTeamId), canonicalTeamId, uefaTeamId: explicit, method: "explicit_canonical_id" };
    return null;
  };
}

if (require.main === module) {
  const index = process.argv.indexOf("--as-of"), asOf = index < 0 ? null : process.argv[index + 1];
  const root = path.resolve(__dirname, "../..");
  const sources = [];
  const read = relative => {
    const bytes = fs.readFileSync(path.join(root, relative));
    sources.push({ path: relative, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
    return JSON.parse(bytes.toString("utf8"));
  };
  const pilot = read(INPUT_PATHS.pilot), history = read(INPUT_PATHS.history), teamMap = read(INPUT_PATHS.teamMap);
  const dataset = buildIdentityMap({ pilot, history, teamMap, asOf, sources });
  const target = "data/sources/champions-opponent-identity-map-2026-27.json";
  fs.writeFileSync(path.join(root, target), JSON.stringify(dataset, null, 2) + "\n");
  const comparisonPath = path.join(root, `data/analysis/champions/strength-comparison-${asOf}.json`);
  let coverage = null;
  if (fs.existsSync(comparisonPath)) {
    const comparison = JSON.parse(fs.readFileSync(comparisonPath, "utf8")), resolve = createOpponentResolver(dataset);
    const rated = new Set(JSON.parse(fs.readFileSync(path.join(root, "data/normalized/uefa-1x2-model-2026-27.json"))).ratings.map(row => String(row.teamId)));
    const observations = comparison.teams.flatMap(team => team.domesticForm.observations || []);
    coverage = { total: observations.length, previousDirectRated: observations.filter(row => typeof row.opponentFrozenElo === "number").length, directRated: observations.filter(row => { const found = resolve({ provider: row.source.provider, providerTeamId: row.opponentProviderId }); return found && rated.has(found.uefaTeamId); }).length };
  }
  const lines = ["# Identità degli avversari Champions: ampliamento verificato", "", `Verifica interna al ${asOf}. Nessuna modifica ai modelli o alle selezioni operative.`, "", `Identità totali: ${dataset.summary.identities}; semi canonici: ${dataset.summary.canonicalSeeds}; nuove identità ESPN: ${dataset.summary.expandedEspnIdentities}; fixture storiche riconciliate: ${dataset.summary.reconciledHistoricalFixtures}.`, "", coverage ? `Nelle finestre domestiche del confronto esistente, collegamenti a un Elo diretto: ${coverage.directRated}/${coverage.total}; il confronto precedente aveva 42/${coverage.total}.` : "Copertura delle finestre domestiche: confronto non ancora disponibile.", "", "## Verifica dell'identità", "", "Si parte dai 36 collegamenti canonici già presenti fra le squadre Champions e gli ID UEFA/ESPN. Un nuovo avversario viene collegato soltanto attraverso una stessa partita storica europea, identificata univocamente da stagione, competizione, data, punteggio nei 90 minuti e almeno una squadra con ID già noto, rispettando casa/trasferta. Il collegamento conserva gli ID delle due partite, i percorsi e i puntatori JSON degli originali e l'identità usata come ancora. Le ulteriori propagazioni mantengono la catena di evidenza.", "", "Non si associano nomi simili o tradotti. Le etichette dei nomi servono soltanto alla consultazione. I namespace provider sono separati; un ID FotMob non è un ID ESPN. I supplementi FotMob entrano solo con canonicalTeamId esplicito già riconosciuto.", "", "Il matching per firma di partita richiede corrispondenza unica: zero o più candidati non producono una nuova identità. L'identità nuova non crea automaticamente un rating: un club senza rating rimane N/D nel confronto della forza.", "", "## API e riproduzione", "", "`createOpponentResolver(dataset)({provider, providerTeamId, canonicalTeamId})` restituisce l'identità verificata e `uefaTeamId`, oppure `null`. Conflitti e duplicati producono errore. `buildIdentityMap({pilot, history, teamMap, asOf, sources})` consente test isolati.", "", `Comando: \`node scripts/champions/opponent-identity.cjs --as-of ${asOf}\`. Scrive soltanto il mapping e questo report.`, "", "## Limiti", "", "I club che non giocano le coppe europee possono restare senza rating. La riconciliazione verifica identità, non rende il campione rappresentativo dell'intero campionato. Il mapping acquisito oggi non va presentato come informazione congelata prima delle gare storiche. Nessuna sostituzione con medie di lega, nessuna probabilità inventata.", "", "## Fonti interne primarie", "", ...sources.map(source => `- \`${source.path}\`: SHA-256 e puntatori ai record nel [mapping](../../${target}).`), ""];
  const coverageLine = lines.findIndex(line => line.startsWith("Nelle finestre domestiche"));
  if (coverage && coverageLine >= 0) lines[coverageLine] = `Avversari con rating diretto: ${coverage.previousDirectRated}/${coverage.total} prima, ${coverage.directRated}/${coverage.total} dopo. Questo conteggio non richiede il rating della squadra osservata: distinguere dal residuo calcolabile per la coppia.`;
  // Keep the dated human audit (including raw-period checks) intact on rerun.
  fs.writeFileSync(path.join(root, `docs/reports/champions-opponent-identity-${asOf}.generated.md`), lines.join("\n"));
  console.log(JSON.stringify({ ...dataset.summary, coverage }));
}

module.exports = { buildIdentityMap, createOpponentResolver };
