const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { captureSisalPage } = require("./sisal/browser-capture");
const { normalizeSisalCapture } = require("./sisal/normalize");

const root = path.resolve(__dirname, "..");
const sourceConfig = JSON.parse(fs.readFileSync(path.join(root, "data", "sources", "sisal-odds.json"), "utf8"));

function readArguments(argv) {
  const options = { competition: "serie-a", waitMs: 15000, headed: true, details: true };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--competition") options.competition = argv[++index];
    else if (argument === "--url") options.url = argv[++index];
    else if (argument === "--matchday") options.matchday = Number(argv[++index]);
    else if (argument === "--match-id") options.matchId = argv[++index];
    else if (argument === "--limit") options.limit = Number(argv[++index]);
    else if (argument === "--wait-ms") options.waitMs = Number(argv[++index]);
    else if (argument === "--headed") options.headed = true;
    else if (argument === "--headless") options.headed = false;
    else if (argument === "--no-details") options.details = false;
    else if (argument === "--help") options.help = true;
    else throw new Error(`Argomento non riconosciuto: ${argument}`);
  }
  return options;
}

function fixturePageUrls(competition, options) {
  if (options.url) return [{ url: options.url, canonicalMatchId: null }];
  if (!competition?.eventUrlTemplate || !competition.matchSource) return [{ url: competition?.url, canonicalMatchId: null }];
  const matchday = options.matchday ?? competition.defaultMatchday;
  if (!Number.isInteger(matchday) || matchday < 1 || matchday > 38) {
    throw new Error("--matchday deve essere un numero intero compreso tra 1 e 38.");
  }
  const matches = JSON.parse(fs.readFileSync(path.join(root, competition.matchSource), "utf8"));
  const fixtures = matches.filter((match) =>
    match.competition === competition.canonicalCompetition &&
    (!competition.season || match.season === competition.season) &&
    match.matchday === matchday
  ).sort((left, right) =>
    String(left.date || "").localeCompare(String(right.date || "")) ||
    String(left.kickoff || "").localeCompare(String(right.kickoff || "")) ||
    left.id.localeCompare(right.id)
  );
  if (fixtures.length !== 10) throw new Error(`Calendario canonico incompleto per la giornata ${matchday}: ${fixtures.length}/10 gare.`);
  if (options.matchId) {
    if (options.limit !== undefined) throw new Error("--match-id e --limit non possono essere usati insieme.");
    const fixture = fixtures.find((match) => match.id === options.matchId);
    if (!fixture) throw new Error(`Partita non trovata nella giornata ${matchday}: ${options.matchId}.`);
    return [{
      canonicalMatchId: fixture.id,
      url: competition.eventUrlTemplate
        .replace("{homeTeam}", encodeURIComponent(String(fixture.homeTeam).toLowerCase()))
        .replace("{awayTeam}", encodeURIComponent(String(fixture.awayTeam).toLowerCase())),
    }];
  }
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > fixtures.length)) {
    throw new Error(`--limit deve essere un numero intero compreso tra 1 e ${fixtures.length}.`);
  }
  return fixtures.slice(0, options.limit || fixtures.length).map((match) => ({
    canonicalMatchId: match.id,
    url: competition.eventUrlTemplate
      .replace("{homeTeam}", encodeURIComponent(String(match.homeTeam).toLowerCase()))
      .replace("{awayTeam}", encodeURIComponent(String(match.awayTeam).toLowerCase())),
  }));
}

function timestampForFile(date) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function summarize(events) {
  const matchEvents = events.filter((event) => event.eventType === "MATCH");
  const markets = events.flatMap((event) => event.markets);
  return {
    events: events.length,
    matchEvents: matchEvents.length,
    antepostEvents: events.filter((event) => event.eventType === "ANTEPOST").length,
    matchedEvents: matchEvents.filter((event) => event.canonicalMatchId).length,
    unmatchedEvents: matchEvents.filter((event) => !event.canonicalMatchId).length,
    markets: markets.length,
    playerMarkets: markets.filter((market) => market.marketScope === "player").length,
    selections: markets.reduce((sum, market) => sum + market.selections.length, 0),
  };
}

async function main() {
  const options = readArguments(process.argv.slice(2));
  if (options.help) {
    console.log("Uso: node scripts/import-sisal-odds.js [--competition serie-a] [--matchday 1] [--match-id ID | --limit 4] [--url URL] [--wait-ms 15000] [--headless] [--no-details]");
    return;
  }
  const competition = sourceConfig.competitions[options.competition];
  const pages = fixturePageUrls(competition, options);
  const pageUrls = pages.map((page) => page.url).filter(Boolean);
  if (!pageUrls.length) throw new Error(`Competizione Sisal non configurata: ${options.competition}. Usa --url.`);
  if (!Number.isFinite(options.waitMs) || options.waitMs < 1000 || options.waitMs > 60000) {
    throw new Error("--wait-ms deve essere compreso tra 1000 e 60000.");
  }

  const retrievedAt = new Date();
  const directFixtureImport = pages.some((page) => page.canonicalMatchId);
  const normalizedDirectory = path.join(root, "data", "normalized", "odds", "sisal");
  const normalizedFile = path.join(normalizedDirectory, `${options.competition}.json`);
  const previous = fs.existsSync(normalizedFile)
    ? JSON.parse(fs.readFileSync(normalizedFile, "utf8"))
    : null;
  const previousRegulatorIds = new Map((previous?.events || [])
    .filter((event) => event.canonicalMatchId && event.regulatorEventId)
    .map((event) => [event.canonicalMatchId, String(event.regulatorEventId)]));
  const detailRegulatorEventIds = pages
    .map((page) => previousRegulatorIds.get(page.canonicalMatchId))
    .filter(Boolean);
  const capture = await captureSisalPage({
    pageUrls,
    waitMs: options.waitMs,
    headed: options.headed,
    includeDetails: directFixtureImport ? false : options.details,
    detailRegulatorEventIds,
  });
  const failedPages = capture.pages.filter((page) => page.url?.startsWith("chrome-error://") || page.renderedOdds === 0);
  if (capture.responses.length === 0) {
    throw new Error("Sisal non ha restituito dati API.");
  }
  if (directFixtureImport && failedPages.length) {
    console.warn(`Attenzione: ${failedPages.length}/${capture.pages.length} schede senza quote visibili: ${failedPages.map((page) => page.sourceUrl).join(", ")}`);
  }
  const artifact = {
    provider: "sisal",
    competition: options.competition,
    retrievedAt: retrievedAt.toISOString(),
    sourceUrl: pageUrls.length === 1 ? pageUrls[0] : competition.url,
    sourceUrls: pageUrls,
    requestedFixtures: pages,
    acquisition: "public-page-browser-cdp",
    ...capture,
  };
  const outputDirectory = path.join(root, "data", "raw", "odds", "sisal", options.competition);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputFile = path.join(outputDirectory, `${timestampForFile(retrievedAt)}.json.gz`);
  fs.writeFileSync(outputFile, zlib.gzipSync(`${JSON.stringify(artifact)}\n`, { level: 9 }));
  const relativeRawFile = path.relative(root, outputFile).replace(/\\/g, "/");
  const normalized = normalizeSisalCapture({ capture: artifact, competitionKey: options.competition, competition: competition || {}, rawFile: relativeRawFile, root });
  fs.mkdirSync(normalizedDirectory, { recursive: true });
  const incremental = directFixtureImport && pages.length < 10 && fs.existsSync(normalizedFile);
  const updatedEvents = normalized.events.map((event) => ({ ...event, retrievedAt: normalized.retrievedAt, rawFile: relativeRawFile }));
  let output = { ...normalized, events: updatedEvents };
  if (incremental) {
    const updatedIds = new Set(updatedEvents.map((event) => event.canonicalMatchId));
    const retainedEvents = previous.events
      .filter((event) => !updatedIds.has(event.canonicalMatchId))
      .map((event) => ({
        ...event,
        retrievedAt: event.retrievedAt || previous.retrievedAt,
        rawFile: event.rawFile || previous.rawFile,
      }));
    const events = [...updatedEvents, ...retainedEvents]
      .sort((left, right) => String(left.startsAt).localeCompare(String(right.startsAt)) || left.name.localeCompare(right.name, "it"));
    output = {
      ...normalized,
      sourceUrl: competition.url,
      rawFiles: [...new Set(events.map((event) => event.rawFile).filter(Boolean))],
      summary: summarize(events),
      events,
    };
  }
  fs.writeFileSync(normalizedFile, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Sisal: ${artifact.responses.length} risposte API, ${updatedEvents.length} eventi aggiornati; dataset ${output.summary.events} eventi, ${output.summary.markets} mercati, ${output.summary.selections} quote, ${output.summary.playerMarkets} mercati giocatore.`);
  console.log(path.relative(root, outputFile));
  console.log(path.relative(root, normalizedFile));
}

main().catch((error) => {
  console.error(`Import Sisal fallito: ${error.message}`);
  process.exitCode = 1;
});
