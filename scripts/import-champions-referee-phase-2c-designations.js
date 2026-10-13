"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const snapshotDate = "2026-10-13";
const rawRoot = path.join(root, "data/raw/champions-referee-phase-2c", snapshotDate);
const outputPath = path.join(root, "data/analysis/champions/referee-phase-2c/designation-evidence.json");
const matchesPath = path.join(root, "data/analysis/champions/referee-phase-2b/match-totals.json");
const registryPath = path.join(root, "data/analysis/champions/referee-phase-2b/referee-registry.json");
const feedUrl = "https://law5-theref.blogspot.com/feeds/posts/default/-/Champions%20League?alt=json&max-results=500";

const officialEvidenceSources = [
  {
    id: "uefa-2022-23-season-officials",
    url: "https://www.uefa.com/uefachampionsleague/news/0279-160984c272a8-33199c37b805-1000--who-is-the-referee-which-officials-are-in-charge-of-the-uefa-ch/",
    publishedDate: "2023-05-22", matchIds: ["ucl:2022-23:2037765"]
  },
  {
    id: "uefa-2023-24-season-officials",
    url: "https://www.uefa.com/uefachampionsleague/news/0285-1901e8868056-42ef504cf9d0-1000--who-is-the-referee-which-officials-are-in-charge-of-the-uefa/",
    publishedDate: "2024-05-13", matchIds: ["ucl:2023-24:2039970"]
  },
  {
    id: "uefa-2024-25-season-officials",
    url: "https://www.uefa.com/uefachampionsleague/news/0291-1bde8fcaf724-c61c8f2d311c-1000--who-is-the-referee-which-officials-are-in-charge-of-the-uefa/",
    publishedDate: "2025-05-05", matchIds: ["ucl:2024-25:2044859", "ucl:2024-25:2044858"]
  },
  {
    id: "uefa-2024-25-final-appointment",
    url: "https://www.uefa.com/uefachampionsleague/news/0299-1dbd40bcf434-d58bac71cbaa-1000--champions-league-final-referee-istvan/",
    publishedDate: "2025-05-12", matchIds: ["ucl:2024-25:2044466"]
  },
  {
    id: "uefa-2025-26-season-officials",
    url: "https://www.uefa.com/uefachampionsleague/news/029d-1eba5b367fc8-1c51c5cbbd69-1000--who-is-the-referee-which-officials-are-in-charge-of-the-uefa/",
    publishedDate: "2026-05-11", matchIds: ["ucl:2025-26:2047742"]
  }
];

const ensure = file => fs.mkdirSync(path.dirname(file), { recursive: true });
const writeJson = (file, value) => { ensure(file); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };
const writeGzip = (file, value) => { ensure(file); fs.writeFileSync(file, zlib.gzipSync(Buffer.from(typeof value === "string" ? value : JSON.stringify(value)))); };
const readGzip = file => zlib.gunzipSync(fs.readFileSync(file)).toString("utf8");
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const rel = file => path.relative(root, file).replaceAll("\\", "/");

async function fetchCached(url, file, type = "json") {
  if (fs.existsSync(file)) return type === "json" ? JSON.parse(readGzip(file)) : readGzip(file);
  const response = await fetch(url, { headers: { accept: type === "json" ? "application/json" : "text/html", "user-agent": "serie-a-2026-27-referee-phase-2c/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const body = type === "json" ? await response.json() : await response.text();
  writeGzip(file, body);
  return body;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&apos;|&#39;/gi, "'")
    .replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return String(value || "").replace(/[øØ]/g, "o").replace(/[æÆ]/g, "ae").replace(/ł/g, "l").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const aliases = {
  "fc internazionale milano": ["inter", "internazionale"], "paris saint germain": ["paris", "psg"],
  "real madrid c f": ["real madrid"], "fc bayern munchen": ["bayern", "bayern munich"],
  "borussia dortmund": ["dortmund"], "manchester city": ["manchester city", "man city"],
  "manchester united": ["manchester united", "man united"], "atletico de madrid": ["atletico", "atleti"],
  "fc barcelona": ["barcelona"], "ac milan": ["milan"], "ssc napoli": ["napoli"],
  "sporting clube de portugal": ["sporting", "sporting cp"], "f c copenhagen": ["copenhagen", "kobenhavn"],
  "gnk dinamo": ["dinamo zagreb", "gnk dinamo"], "fc salzburg": ["salzburg", "rb salzburg"],
  "rb leipzig": ["leipzig"], "bayer 04 leverkusen": ["leverkusen"], "fc porto": ["porto"],
  "sl benfica": ["benfica"], "afc ajax": ["ajax"], "celtic fc": ["celtic"], "rangers fc": ["rangers"],
  "fc shakhtar donetsk": ["shakhtar", "shakhtar donetsk"], "psv eindhoven": ["psv"],
  "losc lille": ["lille", "losc"], "fk bodo glimt": ["bodo glimt"], "fk qarabag": ["qarabag"],
  "sk slavia praha": ["slavia prague", "slavia praha"], "fk crvena zvezda": ["crvena zvezda", "red star"]
};

function teamNeedles(team) {
  const key = normalize(team.name);
  if (aliases[key]) return aliases[key].map(normalize);
  const stripped = key.replace(/\b(fc|cf|afc|sc|sk|fk|rsc|ac|as|ss|sv|bv|calcio|football club|futebol clube)\b/g, " ").replace(/\s+/g, " ").trim();
  return [stripped, key].filter((value, index, values) => value.length >= 4 && values.indexOf(value) === index);
}

function containsNeedle(text, needles) {
  return needles.some(needle => text.includes(needle));
}

function entryLink(entry) {
  return entry.link?.find(item => item.rel === "alternate")?.href || null;
}

function refereeNeedles(match, registryById) {
  const referee = registryById.get(match.refereeId);
  const names = [match.refereeName, match.refereeProviderName, ...(referee?.aliases || [])].filter(Boolean);
  const output = new Set();
  for (const name of names) {
    const normalized = normalize(name);
    output.add(normalized);
    const tokens = normalized.split(" ").filter(token => token.length > 3);
    if (tokens.length) output.add(tokens.at(-1));
  }
  return [...output];
}

function hoursBetween(earlier, later) { return (Date.parse(later) - Date.parse(earlier)) / 3600000; }

async function main() {
  const matches = JSON.parse(fs.readFileSync(matchesPath, "utf8")).matches;
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8")).referees;
  const registryById = new Map(registry.map(row => [row.id, row]));
  const rawFiles = [];

  const feedFile = path.join(rawRoot, "law5", "champions-league-feed.json.gz");
  const feed = await fetchCached(feedUrl, feedFile, "json");
  const declaredTotal = Number(feed.feed?.openSearch$totalResults?.$t || (feed.feed?.entry || []).length);
  const feedPages = [{ feed, file: feedFile, url: feedUrl }];
  for (let start = 151; start <= declaredTotal; start += 150) {
    const url = `${feedUrl.replace("max-results=500", "max-results=150")}&start-index=${start}`;
    const file = path.join(rawRoot, "law5", `champions-league-feed-page-${String(start).padStart(3, "0")}.json.gz`);
    feedPages.push({ feed: await fetchCached(url, file, "json"), file, url });
  }
  for (const page of feedPages) rawFiles.push({ file: page.file, url: page.url, provider: "Law 5 - The Referee (Blogger feed)" });
  const entries = feedPages.flatMap(page => (page.feed.feed?.entry || []).map(entry => ({
    publishedAt: entry.published?.$t || null,
    updatedAt: entry.updated?.$t || null,
    title: entry.title?.$t || null,
    url: entryLink(entry),
    rawPath: rel(page.file),
    text: normalize(decodeHtml(entry.content?.$t || entry.summary?.$t || ""))
  }))).filter(entry => entry.publishedAt && entry.url)
    .filter((entry, index, rows) => rows.findIndex(candidate => candidate.url === entry.url) === index);

  const officialByMatch = new Map();
  for (const source of officialEvidenceSources) {
    const file = path.join(rawRoot, "uefa", `${source.id}.html.gz`);
    const html = await fetchCached(source.url, file, "html");
    rawFiles.push({ file, url: source.url, provider: "UEFA" });
    const plain = normalize(decodeHtml(html));
    for (const matchId of source.matchIds) {
      const match = matches.find(row => row.matchId === matchId);
      if (!match) throw new Error(`Official evidence references unknown match ${matchId}`);
      const teamEvidence = containsNeedle(plain, teamNeedles(match.homeTeam)) && containsNeedle(plain, teamNeedles(match.awayTeam));
      const refereeEvidence = containsNeedle(plain, refereeNeedles(match, registryById));
      if (!teamEvidence || !refereeEvidence) throw new Error(`${source.id} does not prove ${matchId} in fetched HTML`);
      const publishedUpperBound = `${source.publishedDate}T23:59:59Z`;
      officialByMatch.set(matchId, { ...source, publishedUpperBound, rawPath: rel(file) });
    }
  }

  const rows = matches.map(match => {
    const official = officialByMatch.get(match.matchId);
    if (official) {
      const leadHoursLowerBound = hoursBetween(official.publishedUpperBound, match.kickoffUtc);
      return {
        matchId: match.matchId, kickoffUtc: match.kickoffUtc, refereeId: match.refereeId, refereeName: match.refereeName,
        status: "ORIGINAL_TIMESTAMP_VERIFIED", authority: "UEFA", timestampPrecision: "DAY_WITH_CONSERVATIVE_END_OF_DAY_BOUND",
        publishedDate: official.publishedDate, publishedUpperBound: official.publishedUpperBound,
        evidenceUrl: official.url, rawPath: official.rawPath,
        matchingRule: "CURATED_MATCH_ID_PLUS_FETCHED_TEAM_AND_REFEREE_TEXT_VALIDATION",
        leadHoursLowerBound: Number(leadHoursLowerBound.toFixed(2)),
        horizons: { preKickoff: leadHoursLowerBound > 0, advance48h: leadHoursLowerBound >= 48 }
      };
    }

    const kickoff = Date.parse(match.kickoffUtc);
    const homeNeedles = teamNeedles(match.homeTeam), awayNeedles = teamNeedles(match.awayTeam), refereeNames = refereeNeedles(match, registryById);
    const publishedCandidates = entries.filter(entry => {
      const published = Date.parse(entry.publishedAt);
      return published < kickoff && published >= kickoff - 14 * 86400000 &&
        containsNeedle(entry.text, homeNeedles) && containsNeedle(entry.text, awayNeedles) && containsNeedle(entry.text, refereeNames);
    });
    const candidates = publishedCandidates.filter(entry => {
      const updated = Date.parse(entry.updatedAt);
      return Number.isFinite(updated) && updated < kickoff;
    }).sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt));
    if (candidates.length) {
      const evidence = candidates[0], leadHours = hoursBetween(evidence.publishedAt, match.kickoffUtc);
      return {
        matchId: match.matchId, kickoffUtc: match.kickoffUtc, refereeId: match.refereeId, refereeName: match.refereeName,
        status: "INDIRECT_PRE_KICKOFF", authority: "THIRD_PARTY_APPOINTMENT_ARCHIVE", timestampPrecision: "ISO_DATETIME_FROM_BLOGGER_PUBLISHED_FIELD",
        publishedAt: evidence.publishedAt, evidenceUpdatedAt: evidence.updatedAt, evidenceTitle: evidence.title,
        evidenceUrl: evidence.url, rawPath: evidence.rawPath,
        matchingRule: "PUBLISHED_AND_LAST_UPDATED_BEFORE_KICKOFF_WITHIN_14_DAYS_AND_NORMALIZED_HOME_AWAY_REFEREE_TEXT_MATCH",
        leadHours: Number(leadHours.toFixed(2)),
        horizons: { preKickoff: leadHours > 0, advance48h: leadHours >= 48 }
      };
    }
    return {
      matchId: match.matchId, kickoffUtc: match.kickoffUtc, refereeId: match.refereeId, refereeName: match.refereeName,
      status: "NOT_VERIFIABLE", authority: null, timestampPrecision: null, evidenceUrl: null, rawPath: null,
      matchingRule: publishedCandidates.length
        ? "MATCHING_POST_EXISTS_BUT_CURRENT_CONTENT_WAS_UPDATED_AT_OR_AFTER_KICKOFF"
        : "NO_ADMISSIBLE_TIMESTAMPED_SOURCE_MATCH",
      rejectedPostKickoffUpdatedCandidates: publishedCandidates.filter(entry => !Number.isFinite(Date.parse(entry.updatedAt)) || Date.parse(entry.updatedAt) >= kickoff).length,
      leadHours: null,
      horizons: { preKickoff: false, advance48h: false }
    };
  });

  const counts = status => rows.filter(row => row.status === status).length;
  const output = {
    schemaVersion: 1, phase: "2C.2", snapshotDate,
    horizons: {
      preKickoff: "Evidence publication upper bound or exact timestamp must be strictly earlier than kickoff.",
      advance48h: "Evidence publication upper bound or exact timestamp must be at least 48 hours before kickoff."
    },
    sourcePolicy: {
      originalTimestampVerified: "Dated UEFA editorial page; date is conservatively bounded at 23:59:59 UTC and fetched text must contain both teams and referee.",
      indirectPreKickoff: "Timestamped third-party appointment archive; exact Blogger published and last-updated timestamps must both precede kickoff, and both teams and referee must match within 14 days before kickoff.",
      notVerifiable: "Current acquisition timestamps, undated match pages and post-match records are inadmissible."
    },
    summary: {
      matches: rows.length,
      originalTimestampVerified: counts("ORIGINAL_TIMESTAMP_VERIFIED"),
      indirectPreKickoff: counts("INDIRECT_PRE_KICKOFF"),
      notVerifiable: counts("NOT_VERIFIABLE"),
      usablePreKickoff: rows.filter(row => row.horizons.preKickoff).length,
      usableAdvance48h: rows.filter(row => row.horizons.advance48h).length,
      rejectedBecauseCurrentArchiveContentWasUpdatedAtOrAfterKickoff: rows.filter(row => row.matchingRule === "MATCHING_POST_EXISTS_BUT_CURRENT_CONTENT_WAS_UPDATED_AT_OR_AFTER_KICKOFF").length,
      law5EntriesInspected: entries.length,
      law5FeedDeclaredTotal: declaredTotal,
      law5FeedPagesFetched: feedPages.length
    },
    rows
  };
  writeJson(outputPath, output);

  const manifest = {
    schemaVersion: 1, snapshotDate,
    files: rawFiles.map(row => ({ path: rel(row.file), url: row.url, provider: row.provider, sha256: sha256(row.file), bytes: fs.statSync(row.file).size }))
  };
  writeJson(path.join(rawRoot, "manifest.json"), manifest);
  console.log(`Designation evidence: ${output.summary.originalTimestampVerified} UEFA verified, ${output.summary.indirectPreKickoff} indirect, ${output.summary.notVerifiable} not verifiable; ${output.summary.usableAdvance48h} usable at 48h`);
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
