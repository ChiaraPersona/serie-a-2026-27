const fs = require("fs");
const path = require("path");

function normalizedName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(f c|a c|a s|s s c|fc|ac|as|ssc|calcio|football club)\b/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildTeamLookup(root, aliases = {}) {
  const teams = JSON.parse(fs.readFileSync(path.join(root, "data", "normalized", "teams.json"), "utf8"));
  const lookup = new Map();
  for (const team of teams) {
    for (const label of [team.id, team.name, team.shortName, team.officialName]) {
      if (label) lookup.set(normalizedName(label), team.id);
    }
  }
  for (const [teamId, labels] of Object.entries(aliases)) {
    for (const label of labels) lookup.set(normalizedName(label), teamId);
  }
  return lookup;
}

function matchCanonicalEvent(event, competition, root, teamLookup) {
  if (event.eventType !== "MATCH" || !event.firstCompetitor || !event.secondCompetitor) {
    return { canonicalMatchId: null, homeTeamId: null, awayTeamId: null, matchStatus: "not-applicable" };
  }
  if (!competition.canonicalCompetition || !competition.matchSource) {
    return { canonicalMatchId: null, homeTeamId: null, awayTeamId: null, matchStatus: "not-configured" };
  }
  const homeTeamId = teamLookup.get(normalizedName(event.firstCompetitor?.description)) || null;
  const awayTeamId = teamLookup.get(normalizedName(event.secondCompetitor?.description)) || null;
  if (!homeTeamId || !awayTeamId) {
    return { canonicalMatchId: null, homeTeamId, awayTeamId, matchStatus: "team-unmatched" };
  }
  const matches = JSON.parse(fs.readFileSync(path.join(root, competition.matchSource), "utf8"));
  const candidates = matches.filter((match) =>
    match.competition === competition.canonicalCompetition &&
    (!competition.season || match.season === competition.season) &&
    match.homeTeam === homeTeamId && match.awayTeam === awayTeamId
  );
  if (candidates.length !== 1) {
    return { canonicalMatchId: null, homeTeamId, awayTeamId, matchStatus: candidates.length ? "ambiguous" : "fixture-unmatched" };
  }
  const canonical = candidates[0];
  const eventDate = event.data ? String(event.data).slice(0, 10) : null;
  const dateAgreement = !canonical.date || !eventDate || canonical.date === eventDate;
  return {
    canonicalMatchId: canonical.id,
    homeTeamId,
    awayTeamId,
    matchStatus: dateAgreement ? "matched" : "matched-date-difference",
    canonicalDate: canonical.date,
  };
}

function normalizeMarket(info, market) {
  const providerPlayerIds = [...new Set((Array.isArray(info.playerIds) ? info.playerIds : []).map(String))];
  const selections = (info.esitoList || [])
    .filter((selection) => Number.isFinite(selection.quota) && selection.quota > 0)
    .map((selection) => ({
      providerSelectionId: String(selection.selectionId),
      code: String(selection.codiceEsito),
      name: String(selection.descrizione || "").trim(),
      odds: Number((selection.quota / 100).toFixed(2)),
      oddsRaw: selection.quota,
      status: selection.stato === 1 ? "open" : "suspended",
    }));
  return {
    providerMarketId: String(info.marketId),
    marketCode: String(info.codiceScommessa),
    marketName: String(market?.descrizione || info.descrizione || "").trim(),
    variantName: String(info.descrizione || "").trim(),
    threshold: info.soglia === "" || info.soglia == null ? null : String(info.soglia),
    status: info.stato === 1 ? "open" : "suspended",
    updatedAt: info.dataUltimaModifica || market?.dataUltimaModifica || null,
    marketScope: providerPlayerIds.length ? "player" : "match",
    providerPlayerIds,
    selections,
  };
}

function normalizeSisalCapture({ capture, competitionKey, competition, rawFile, root }) {
  const teamLookup = buildTeamLookup(root, competition.teamAliases || {});
  const details = capture.responses
    .filter((response) => response.url.includes("/eventDetail/") && response.payload?.avvenimentoFe)
    .map((response) => response.payload);
  const payloadByEvent = new Map(details.map((payload) => [
    String(payload.avvenimentoFe.regulatorEventId || `${payload.avvenimentoFe.codicePalinsesto}-${payload.avvenimentoFe.codiceAvvenimento}`),
    payload,
  ]));
  for (const response of details.length ? [] : capture.responses.filter((item) => Array.isArray(item.payload?.avvenimentoFeList))) {
    for (const event of response.payload.avvenimentoFeList) {
      const regulatorEventId = String(event.regulatorEventId || `${event.codicePalinsesto}-${event.codiceAvvenimento}`);
      if (!payloadByEvent.has(regulatorEventId)) {
        payloadByEvent.set(regulatorEventId, {
          avvenimentoFe: event,
          scommessaMap: response.payload.scommessaMap || {},
          infoAggiuntivaMap: response.payload.infoAggiuntivaMap || {},
        });
      }
    }
  }
  const events = [...payloadByEvent.values()].map((payload) => {
    const event = payload.avvenimentoFe;
    const isMatch = event.eventType === "MATCH" && event.firstCompetitor && event.secondCompetitor;
    const match = matchCanonicalEvent(event, competition, root, teamLookup);
    const markets = Object.values(payload.infoAggiuntivaMap || {})
      .filter((info) => info.codicePalinsesto === event.codicePalinsesto && info.codiceAvvenimento === event.codiceAvvenimento)
      .filter((info) => Array.isArray(info.esitoList) && info.esitoList.length)
      .map((info) => {
        const key = `${info.codicePalinsesto}-${info.codiceAvvenimento}-${info.codiceScommessa}`;
        return normalizeMarket(info, payload.scommessaMap?.[key]);
      })
      .filter((market) => market.selections.length)
      .sort((a, b) => a.marketName.localeCompare(b.marketName, "it") || a.variantName.localeCompare(b.variantName, "it"));
    return {
      providerEventId: String(event.eventId),
      regulatorEventId: String(event.regulatorEventId || `${event.codicePalinsesto}-${event.codiceAvvenimento}`),
      providerScheduleId: String(event.codicePalinsesto),
      providerMatchId: String(event.codiceAvvenimento),
      name: event.descrizione,
      startsAt: event.data,
      eventType: event.eventType || "UNKNOWN",
      status: event.stato === 1 ? "open" : "suspended",
      home: isMatch ? { providerTeamId: String(event.firstCompetitor.competitorId), name: event.firstCompetitor.description, canonicalTeamId: match.homeTeamId } : null,
      away: isMatch ? { providerTeamId: String(event.secondCompetitor.competitorId), name: event.secondCompetitor.description, canonicalTeamId: match.awayTeamId } : null,
      canonicalMatchId: match.canonicalMatchId,
      matchStatus: match.matchStatus,
      canonicalDate: match.canonicalDate || null,
      markets,
    };
  }).sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)) || a.name.localeCompare(b.name, "it"));

  const selectionCount = events.reduce((sum, event) => sum + event.markets.reduce((marketSum, market) => marketSum + market.selections.length, 0), 0);
  const playerMarketCount = events.reduce((sum, event) => sum + event.markets.filter((market) => market.marketScope === "player").length, 0);
  const matchEvents = events.filter((event) => event.eventType === "MATCH");
  const matchedEvents = matchEvents.filter((event) => event.canonicalMatchId).length;
  return {
    provider: "sisal",
    competition: competitionKey,
    canonicalCompetition: competition.canonicalCompetition || null,
    season: competition.season || null,
    retrievedAt: capture.retrievedAt,
    sourceUrl: capture.sourceUrl,
    rawFile,
    acquisition: capture.acquisition,
    summary: {
      events: events.length,
      matchEvents: matchEvents.length,
      antepostEvents: events.filter((event) => event.eventType === "ANTEPOST").length,
      matchedEvents,
      unmatchedEvents: matchEvents.length - matchedEvents,
      markets: events.reduce((sum, event) => sum + event.markets.length, 0),
      playerMarkets: playerMarketCount,
      selections: selectionCount,
    },
    events,
  };
}

module.exports = { normalizeSisalCapture, normalizedName };
