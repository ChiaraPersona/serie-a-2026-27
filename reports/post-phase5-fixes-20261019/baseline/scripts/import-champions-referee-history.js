"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const FIXTURES = path.join(ROOT, "data/sources/champions-league-2026-27.json");
const REGISTRY = path.join(ROOT, "data/sources/champions-referees/registry-2026-27.json");
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const flag = name => args.includes(`--${name}`);
const asOf = option("as-of", "2026-10-13");
const assignmentRelative = option("assignments", "data/sources/champions-referee-assignments-md02-2026-27.json");
const ASSIGNMENTS = path.resolve(ROOT, assignmentRelative);
const refresh = flag("refresh");
const rawRoot = path.join(ROOT, "data/raw/champions-referees", asOf);
const normalizedFile = path.join(ROOT, `data/normalized/champions-referee-history-${asOf}.json`);
const reportJsonFile = path.join(ROOT, `data/analysis/champions/referee-coverage-${asOf}.json`);
const reportMdFile = path.join(ROOT, `data/analysis/champions/referee-coverage-${asOf}.md`);

const readJson = file => JSON.parse(fs.readFileSync(file, "utf8"));
const ensure = file => fs.mkdirSync(path.dirname(file), { recursive: true });
const writeJson = (file, value) => {
  ensure(file);
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const round = (value, digits = 3) => value == null ? null : Number(value.toFixed(digits));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const n = value => value === "n/a" || value == null ? null : Number(value);
const pct = (hits, matches) => matches ? round(hits / matches, 4) : null;

function decodeHtml(value) {
  return value
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function htmlLines(html) {
  const withoutScripts = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const withLines = withoutScripts
    .replace(/<\/(tr|p|div|section|h1|h2|h3|li|table|thead|tbody|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeHtml(withLines).split(/\r?\n/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean);
}

async function fetchSnapshot(url, file) {
  if (!refresh && fs.existsSync(file)) return zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");
  const response = await fetch(url, { headers: { "user-agent": "serie-a-2026-27 referee archive/1.0" } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const html = await response.text();
  ensure(file);
  fs.writeFileSync(file, zlib.gzipSync(Buffer.from(html)));
  return html;
}

const monthNumber = label => ({ Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 })[label];

function attachIsoDates(rows, cutoff) {
  let year = Number(cutoff.slice(0, 4));
  let previousMonth = Number(cutoff.slice(5, 7));
  return rows.map(row => {
    const [dayText, monthText] = row.dateLabel.split(" ");
    const month = monthNumber(monthText);
    if (month > previousMonth) year -= 1;
    previousMonth = month;
    return { ...row, date: `${year}-${String(month).padStart(2, "0")}-${String(Number(dayText)).padStart(2, "0")}` };
  });
}

function parseRecent(lines) {
  const start = lines.indexOf("Last 20 refereed · cards, fouls and penalties");
  const end = lines.findIndex((line, index) => index > start && line.startsWith("Average over 20"));
  if (start < 0 || end < 0) return [];
  const matchPattern = /^(\d{1,2} [A-Z][a-z]{2}) (.+?) (\d+) - (\d+) (.+?) (\d+|n\/a) (\d+|n\/a) (\d+(?:\.\d+)?|n\/a) (\d+|n\/a)$/u;
  const rows = [];
  for (const line of lines.slice(start + 1, end)) {
    const match = line.match(matchPattern);
    if (!match) continue;
    rows.push({
      dateLabel: match[1],
      homeTeamCode: match[2],
      homeGoals: Number(match[3]),
      awayGoals: Number(match[4]),
      awayTeamCode: match[5],
      yellowCards: n(match[6]),
      redCards: n(match[7]),
      fouls: n(match[8]),
      penalties: n(match[9]),
      totalCards: n(match[6]) == null || n(match[7]) == null ? null : n(match[6]) + n(match[7])
    });
  }
  return attachIsoDates(rows, asOf);
}

function parseSeasonCompetition(lines) {
  const start = lines.indexOf("By season & competition");
  const end = lines.findIndex((line, index) => index > start && line.startsWith("About "));
  if (start < 0 || end < 0) return [];
  const seasonPattern = /^(\d{2}\/\d{2}|\d{4}) \d+ (?:\d+|n\/a) (?:\d+|n\/a) (?:\d+|n\/a) (?:\d+|n\/a)$/;
  const rowPattern = /^(.+?) (\d+) (\d+|n\/a) \( (\d+(?:\.\d+)?|n\/a) \) (\d+|n\/a) \( (\d+(?:\.\d+)?|n\/a) \) (\d+|n\/a) \( (\d+(?:\.\d+)?|n\/a) \) (\d+|n\/a)$/;
  let seasonLabel = null;
  const rows = [];
  for (const line of lines.slice(start + 1, end)) {
    if (seasonPattern.test(line)) {
      seasonLabel = line.match(seasonPattern)[1];
      continue;
    }
    const match = line.match(rowPattern);
    if (!match || !seasonLabel) continue;
    rows.push({
      seasonLabel,
      competition: match[1],
      matches: Number(match[2]),
      yellowCards: { total: n(match[3]), perMatch: n(match[4]) },
      redCards: { total: n(match[5]), perMatch: n(match[6]) },
      fouls: { total: n(match[7]), perMatch: n(match[8]) },
      penalties: { total: n(match[9]), perMatch: pct(n(match[9]), Number(match[2])) }
    });
  }
  return rows;
}

function competitionGroup(name) {
  if (name === "Champions League") return "champions-league";
  if (/(Europa|Conference|Nations League|World Cup|Qualification|European Championship|Friendly|Friendlies|AFC|CONCACAF|CONMEBOL|CAF|Olympic)/i.test(name)) return "other-competitions";
  if (/(Cup|Copa|Coupe|Pokal|Taça|Taca|Coppa|Play-?offs?|Relegation|Kings Cup)/i.test(name)) return "other-competitions";
  return "national-leagues";
}

function periodScope(seasonLabel) {
  return seasonLabel === "26/27" || seasonLabel === "2026" ? "current" : "historical";
}

function aggregate(rows) {
  const matches = rows.reduce((sum, row) => sum + row.matches, 0);
  const sum = key => rows.reduce((total, row) => total + (row[key].total || 0), 0);
  const availability = key => rows.every(row => row[key].total != null);
  const yellowTotal = availability("yellowCards") ? sum("yellowCards") : null;
  const redTotal = availability("redCards") ? sum("redCards") : null;
  const foulTotal = availability("fouls") ? sum("fouls") : null;
  const penaltyTotal = availability("penalties") ? sum("penalties") : null;
  return {
    matches,
    yellowCards: { total: yellowTotal, perMatch: matches && yellowTotal != null ? round(yellowTotal / matches) : null },
    redCards: { total: redTotal, perMatch: matches && redTotal != null ? round(redTotal / matches) : null },
    totalCards: { total: yellowTotal != null && redTotal != null ? yellowTotal + redTotal : null, perMatch: matches && yellowTotal != null && redTotal != null ? round((yellowTotal + redTotal) / matches) : null },
    fouls: { total: foulTotal, perMatch: matches && foulTotal != null ? round(foulTotal / matches) : null },
    penalties: { total: penaltyTotal, perMatch: matches && penaltyTotal != null ? round(penaltyTotal / matches) : null }
  };
}

function recentSummary(matches) {
  const rows = matches.slice(0, 10);
  const available = key => rows.filter(row => row[key] != null);
  const metric = key => {
    const sample = available(key);
    const total = sample.reduce((sum, row) => sum + row[key], 0);
    return { matches: sample.length, total: sample.length ? total : null, perMatch: sample.length ? round(total / sample.length) : null };
  };
  const cardRows = available("totalCards");
  const rate = threshold => ({
    matches: cardRows.length,
    hits: cardRows.filter(row => row.totalCards > threshold).length,
    frequency: cardRows.length ? pct(cardRows.filter(row => row.totalCards > threshold).length, cardRows.length) : null
  });
  return {
    period: rows.length ? { from: rows[rows.length - 1].date, to: rows[0].date } : null,
    matches: rows.length,
    yellowCards: metric("yellowCards"),
    redCards: metric("redCards"),
    totalCards: metric("totalCards"),
    fouls: metric("fouls"),
    penalties: metric("penalties"),
    overCardFrequencies: { over3_5: rate(3.5), over4_5: rate(4.5), over5_5: rate(5.5) },
    homeAwayCards: null,
    homeAwayCardsMissingReason: "La tabella pubblica delle ultime partite espone il totale gara, non lo split cartellini casa/trasferta.",
    matchLog: rows
  };
}

function parseProfile(referee, html) {
  const lines = htmlLines(html);
  const text = lines.join("\n");
  const career = text.match(new RegExp(`Across (\\d+) matches, .*? averages ([\\d.]+) yellow cards and ([\\d.]+) red cards per match, with ([\\d.]+) fouls awarded per match\\. (\\d+) penalt(?:y|ies) and (\\d+) red cards across the full sample`, "i"));
  const totals = text.match(new RegExp(`${referee.providers.footymetrics.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} shows an average of ([\\d.]+) cards per game \\(yellow and red combined\\) across the (\\d+) matches tracked`, "i"));
  const overs = text.match(/Over 4\.5 total cards has landed in (\d+)% .*?and over 5\.5 cards in (\d+)%, based on the (\d+) matches tracked/s);
  const sides = text.match(/cards the (home|away) side more, averaging ([\d.]+) cards a game to them versus ([\d.]+) to the (home|away) side\. The (?:home|away) team picks up more cards in (\d+)%/i);
  if (!career || !totals) throw new Error(`${referee.id}: riepilogo carriera non riconosciuto`);
  const seasonCompetition = parseSeasonCompetition(lines).map(row => ({ ...row, periodScope: periodScope(row.seasonLabel), competitionGroup: competitionGroup(row.competition) }));
  const seasonCompetitionMatches = seasonCompetition.reduce((sum, row) => sum + row.matches, 0);
  const groupedSamples = {};
  for (const scope of ["current", "historical"]) for (const group of ["champions-league", "national-leagues", "other-competitions"]) {
    groupedSamples[`${scope}:${group}`] = aggregate(seasonCompetition.filter(row => row.periodScope === scope && row.competitionGroup === group));
  }
  const recentMatches = parseRecent(lines);
  const careerMatches = Number(career[1]);
  return {
    refereeId: referee.id,
    name: referee.name,
    country: referee.country,
    source: {
      provider: "FootyMetrics",
      providerRefereeId: referee.providers.footymetrics.id,
      providerDisplayName: referee.providers.footymetrics.name,
      url: referee.providers.footymetrics.url,
      retrievedAt: asOf,
      rawSha256: sha256(html),
      coverageNote: "Il provider aggiorna i profili nel tempo; questo record e legato allo snapshot raw compresso del 2026-10-13."
    },
    career: {
      period: "intero storico tracciato dal provider fino allo snapshot",
      matches: careerMatches,
      yellowCards: { perMatch: Number(career[2]), total: null },
      redCards: { perMatch: Number(career[3]), total: Number(career[6]) },
      totalCards: { perMatch: Number(totals[1]), definition: "yellowCards + redCards" },
      fouls: { perMatch: Number(career[4]), total: null },
      penalties: { total: Number(career[5]), perMatch: round(Number(career[5]) / careerMatches) },
      overCardFrequencies: {
        over3_5: { frequency: null, missingReason: "Il profilo pubblico non espone un tasso carriera uniforme Over 3,5." },
        over4_5: overs ? { frequency: Number(overs[1]) / 100, matches: Number(overs[3]) } : { frequency: null },
        over5_5: overs ? { frequency: Number(overs[2]) / 100, matches: Number(overs[3]) } : { frequency: null }
      },
      homeAwayCards: sides ? {
        favoredSide: sides[1],
        favoredSideCardsPerMatch: Number(sides[2]),
        otherSide: sides[4],
        otherSideCardsPerMatch: Number(sides[3]),
        favoredSideMoreCardsFrequency: Number(sides[5]) / 100,
        cardDefinition: "yellowCards + redCards"
      } : null
    },
    sourceConsistency: {
      careerMatches,
      seasonCompetitionMatches,
      matchesDelta: seasonCompetitionMatches - careerMatches,
      status: seasonCompetitionMatches === careerMatches ? "consistent" : "provider-internal-mismatch"
    },
    seasonCompetitionSamples: seasonCompetition,
    groupedSamples,
    last10: recentSummary(recentMatches)
  };
}

function reportMarkdown(report) {
  const rows = report.referees.map(row => `| ${row.name} | ${row.officialDesignation ? "SI" : "NO"} | ${row.career ? row.careerMatches : "N/D"} | ${row.currentUclMatches} | ${row.historicalUclMatches} | ${row.last10Matches}/10 | ${row.missing.join(", ") || "-"} |`).join("\n");
  return `# Copertura archivio arbitri Champions League MD2\n\n` +
    `Snapshot: ${report.asOf} · designazioni UEFA: ${report.coverage.officialDesignations}/${report.coverage.expected} · profili statistici: ${report.coverage.statisticalProfiles}/${report.coverage.expected}.\n\n` +
    `| Arbitro | UEFA | Storico gare | UCL 26/27 | UCL storico | Ultime 10 | Mancanze |\n|---|---:|---:|---:|---:|---:|---|\n${rows}\n\n` +
    `## Metodo\n\n- Le designazioni sono verificate esclusivamente sulla pagina ufficiale UEFA e collegate ai fixture ID canonici.\n- Le statistiche provengono da FootyMetrics e sono conservate con URL, timestamp, hash SHA-256 e snapshot HTML compresso.\n- Ogni riga stagione/competizione resta separata. Gli aggregati sommano soltanto conteggi omogenei; le medie sono ricalcolate come totale/partite.\n- Cartellini gialli, rossi e totali sono campi distinti. Totale cartellini = gialli + rossi secondo la definizione del provider.\n- Stagione corrente = 26/27 oppure anno solare 2026; tutto il resto e storico.\n- Champions League e un gruppo autonomo. I campionati nazionali sono le competizioni non internazionali/non di coppa; coppe, play-off e competizioni UEFA/FIFA diverse dalla Champions confluiscono in altre competizioni.\n- Le ultime 10 sono le dieci gare piu recenti nello snapshot; i tassi Over sono ricalcolati sui totali gara disponibili.\n\n## Anomalie e limiti\n\n${report.anomalies.map(item => `- ${item}`).join("\n")}\n`;
}

async function main() {
  const assignments = readJson(ASSIGNMENTS);
  const targetMatchday = Number(assignments.matchday);
  const fixtures = readJson(FIXTURES).fixtures.filter(fixture => fixture.matchday === targetMatchday);
  const registry = readJson(REGISTRY);
  const uefaUrl = assignments.source?.url;
  if (!uefaUrl || assignments.source?.provider !== "UEFA") throw new Error("La fonte designazioni deve essere una pagina UEFA esplicita.");
  const registryById = new Map(registry.referees.map(referee => [referee.id, referee]));
  const fixtureById = new Map(fixtures.map(fixture => [fixture.id, fixture]));

  const matchdayLabel = String(targetMatchday).padStart(2, "0");
  const uefaRawFile = path.join(rawRoot, `uefa/official-md${matchdayLabel}-designations.html.gz`);
  const uefaHtml = await fetchSnapshot(uefaUrl, uefaRawFile);
  const uefaText = htmlLines(uefaHtml).join("\n");
  const officialChecks = assignments.assignments.map(assignment => {
    const fixture = fixtureById.get(assignment.fixtureId);
    const referee = registryById.get(assignment.refereeId);
    if (!fixture || !referee) throw new Error(`${assignment.fixtureId}: fixture o refereeId non risolto`);
    const fixtureNeedle = `${fixture.homeTeam} vs ${fixture.awayTeam}`;
    const sourceLine = htmlLines(uefaHtml).find(line => line.includes(fixtureNeedle) && line.includes(referee.name)) || null;
    return { fixtureId: fixture.id, refereeId: referee.id, fixture: fixtureNeedle, referee: referee.name, confirmed: sourceLine != null, sourceLine };
  });

  const profiles = [];
  for (const referee of registry.referees) {
    const rawFile = path.join(rawRoot, "footymetrics", `${referee.providers.footymetrics.id}.html.gz`);
    const html = await fetchSnapshot(referee.providers.footymetrics.url, rawFile);
    profiles.push(parseProfile(referee, html));
    console.log(`${referee.name}: ${profiles[profiles.length - 1].career.matches} gare`);
  }

  const data = {
    schemaVersion: 1,
    asOf,
    status: "research-only-not-model-input",
    sourcePolicy: {
      designations: "UEFA official only",
      statistics: "FootyMetrics public referee profiles",
      rawSnapshots: path.relative(ROOT, rawRoot).replace(/\\/g, "/"),
      noCrossSampleBlending: true
    },
    metricDefinitions: {
      yellowCards: "Cartellini gialli mostrati nel campione.",
      redCards: "Cartellini rossi mostrati nel campione secondo il provider.",
      totalCards: "yellowCards + redCards; non equivale ai soli gialli e non usa booking points.",
      fouls: "Falli fischiati registrati dal provider.",
      penalties: "Rigori concessi registrati dal provider.",
      over3_5: "Quota di gare con almeno 4 totalCards.",
      over4_5: "Quota di gare con almeno 5 totalCards.",
      over5_5: "Quota di gare con almeno 6 totalCards."
    },
    officialVerification: { provider: "UEFA", matchday: targetMatchday, url: uefaUrl, retrievedAt: asOf, rawSha256: sha256(uefaHtml), checks: officialChecks },
    referees: profiles
  };
  writeJson(normalizedFile, data);

  const reportRows = profiles.map(profile => ({
    refereeId: profile.refereeId,
    name: profile.name,
    officialDesignation: officialChecks.some(check => check.refereeId === profile.refereeId && check.confirmed),
    career: profile.career.matches > 0,
    careerMatches: profile.career.matches,
    currentUclMatches: profile.groupedSamples["current:champions-league"].matches,
    historicalUclMatches: profile.groupedSamples["historical:champions-league"].matches,
    currentNationalLeagueMatches: profile.groupedSamples["current:national-leagues"].matches,
    historicalNationalLeagueMatches: profile.groupedSamples["historical:national-leagues"].matches,
    last10Matches: profile.last10.matches,
    missing: [
      profile.career.overCardFrequencies.over3_5.frequency == null ? "Over 3,5 carriera" : null,
      profile.last10.matches < 10 ? `ultime 10 (${profile.last10.matches})` : null,
      profile.career.homeAwayCards == null ? "split casa/trasferta carriera" : null
    ].filter(Boolean)
  }));
  const sourceMismatchAnomalies = profiles.filter(profile => profile.sourceConsistency.status !== "consistent").map(profile => `${profile.name}: il riepilogo carriera riporta ${profile.sourceConsistency.careerMatches} gare, mentre la somma delle righe stagione/competizione e ${profile.sourceConsistency.seasonCompetitionMatches}; entrambi i valori sono conservati e non riconciliati arbitrariamente.`);
  const anomalies = [
    "FootyMetrics espone due profili per Sven Jablonski (ID 191 e 33247): e stato scelto l'ID 191, collegato alla designazione corrente e con il campione completo; 33247 resta registrato come duplicato rifiutato.",
    "Il provider non espone un tasso carriera Over 3,5 uniforme: il campo resta null. Over 3,5/4,5/5,5 e invece ricalcolato sulle ultime 10 gare.",
    "Lo split casa/trasferta delle ultime 10 non e disponibile nella tabella pubblica; e disponibile soltanto il profilo carriera aggregato.",
    "I nomi gara abbreviati nel log recente sono conservati come codici provider; non vengono inventate espansioni non verificate.",
    "Il dato statistico e di fonte secondaria, dinamico e soggetto a revisione; gli snapshot raw e gli hash congelano l'evidenza usata.",
    "Nessun dato di questo archivio e collegato al motore pronostici, alla schedina, alle letture o alla UI."
  ].concat(sourceMismatchAnomalies);
  const report = {
    schemaVersion: 1,
    asOf,
    coverage: {
      expected: 18,
      officialDesignations: reportRows.filter(row => row.officialDesignation).length,
      statisticalProfiles: reportRows.filter(row => row.career).length,
      fullLast10: reportRows.filter(row => row.last10Matches === 10).length,
      currentUcl: reportRows.filter(row => row.currentUclMatches > 0).length,
      historicalUcl: reportRows.filter(row => row.historicalUclMatches > 0).length,
      currentNationalLeagues: reportRows.filter(row => row.currentNationalLeagueMatches > 0).length,
      historicalNationalLeagues: reportRows.filter(row => row.historicalNationalLeagueMatches > 0).length,
      careerYellowCards: profiles.filter(profile => profile.career.yellowCards.perMatch != null).length,
      careerRedCards: profiles.filter(profile => profile.career.redCards.perMatch != null).length,
      careerFouls: profiles.filter(profile => profile.career.fouls.perMatch != null).length,
      careerPenalties: profiles.filter(profile => profile.career.penalties.total != null).length,
      careerOver3_5: profiles.filter(profile => profile.career.overCardFrequencies.over3_5.frequency != null).length,
      careerOver4_5: profiles.filter(profile => profile.career.overCardFrequencies.over4_5.frequency != null).length,
      careerOver5_5: profiles.filter(profile => profile.career.overCardFrequencies.over5_5.frequency != null).length,
      careerHomeAway: profiles.filter(profile => profile.career.homeAwayCards != null).length,
      last10Over3_5_4_5_5: profiles.filter(profile => ["over3_5", "over4_5", "over5_5"].every(key => profile.last10.overCardFrequencies[key].frequency != null)).length,
      last10HomeAway: profiles.filter(profile => profile.last10.homeAwayCards != null).length,
      sourceInternalConsistency: profiles.filter(profile => profile.sourceConsistency.status === "consistent").length
    },
    referees: reportRows,
    anomalies
  };
  writeJson(reportJsonFile, report);
  ensure(reportMdFile);
  fs.writeFileSync(reportMdFile, reportMarkdown(report));
  console.log(JSON.stringify(report.coverage, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
