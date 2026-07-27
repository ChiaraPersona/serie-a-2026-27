const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const target = path.join(root, "data/sources/team-pages/transfermarkt-market-values-2026-27.json");
const reportTarget = path.join(root, "data/generated/team-pages/market-value-import-report.json");
const baseUrl = "https://www.transfermarkt.it/serie-a/marktwerte/pokalwettbewerb/IT1";
const retrievedAt = new Date().toISOString().slice(0, 10);
const headers = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0 Safari/537.36",
  "accept-language": "it-IT,it;q=0.9,en;q=0.8"
};
const teamAliases = {
  "ac milan": "milan", "juventus fc": "juventus", "ssc napoli": "napoli", "as roma": "roma",
  "acf fiorentina": "fiorentina", "ss lazio": "lazio", "torino fc": "torino", "bologna fc": "bologna",
  "genoa cfc": "genoa", "udinese calcio": "udinese", "cagliari calcio": "cagliari", "parma calcio": "parma",
  "como 1907": "como", "us sassuolo": "sassuolo", "us lecce": "lecce", "venezia fc": "venezia",
  "ac monza": "monza", "frosinone calcio": "frosinone", "atalanta": "atalanta", "inter": "inter"
};
const clubs = [
  ["inter", "inter-mailand", 46], ["milan", "ac-mailand", 5], ["juventus", "juventus-turin", 506],
  ["napoli", "ssc-neapel", 6195], ["como", "como-1907", 1047], ["atalanta", "atalanta-bergamo", 800],
  ["roma", "as-rom", 12], ["fiorentina", "ac-florenz", 430], ["bologna", "fc-bologna", 1025],
  ["lazio", "lazio-rom", 398], ["udinese", "udinese-calcio", 410], ["sassuolo", "us-sassuolo", 6574],
  ["parma", "parma-calcio-1913", 130], ["genoa", "genua-cfc", 252], ["cagliari", "cagliari-calcio", 1390],
  ["torino", "fc-turin", 416], ["venezia", "venezia-fc", 607], ["lecce", "us-lecce", 1005],
  ["monza", "ac-monza", 2919], ["frosinone", "frosinone-calcio", 8970]
];
const verifiedProfiles = {
  "juventus:kenan-yildiz": {
    transfermarktId: "845654",
    name: "Kenan Yıldız",
    teamId: "juventus",
    transfermarktClubId: "506",
    club: "Juventus FC",
    marketValueEur: 75_000_000,
    marketValueLabel: "75,00 mln €",
    marketValueUpdatedAt: "2026-05-29",
    profileUrl: "https://www.transfermarkt.it/kenan-yildiz/profil/spieler/845654"
  },
  "lazio:patric": {
    transfermarktId: "126729", name: "Patric", teamId: "lazio", transfermarktClubId: "398", club: "SS Lazio",
    marketValueEur: 1_500_000, marketValueLabel: "1,50 mln €", marketValueUpdatedAt: null,
    profileUrl: "https://www.transfermarkt.it/patric/profil/spieler/126729"
  },
  "genoa:wedtoin-ouedraogo": {
    transfermarktId: "1385195", name: "Wedtoin Latif Ouedraogo", teamId: "genoa", transfermarktClubId: null, club: "Genoa Primavera",
    marketValueEur: 1_000_000, marketValueLabel: "1,00 mln €", marketValueUpdatedAt: "2026-05-11",
    profileUrl: "https://www.transfermarkt.it/latif-ouedraogo/profil/spieler/1385195"
  },
  "udinese:juan-david-arizala": {
    transfermarktId: "1118347", name: "Juan David Arizala Micolta", teamId: "udinese", transfermarktClubId: "410", club: "Udinese Calcio",
    marketValueEur: 3_500_000, marketValueLabel: "3,50 mln €", marketValueUpdatedAt: "2026-05-29",
    profileUrl: "https://www.transfermarkt.it/juan-arizala/profil/spieler/1118347"
  },
  "parma:enrico-del-prato": {
    transfermarktId: "392956", name: "Enrico Delprato", teamId: "parma", transfermarktClubId: "130", club: "Parma Calcio",
    marketValueEur: 6_000_000, marketValueLabel: "6,00 mln €", marketValueUpdatedAt: "2025-12-23",
    profileUrl: "https://www.transfermarkt.it/enrico-delprato/profil/spieler/392956"
  }
};
const verifiedProfileIds = {
  "juventus:arthur": "362842",
  "napoli:nosa-obaretin": "704456",
  "napoli:jesper-lindstrom": "513245",
  "lazio:romano-floriani": "708086",
  "torino:marcus-holmgren-pedersen": "583404",
  "torino:adrian-ismajli": "435228",
  "torino:come-bianay": "1059298",
  "torino:faustino-anjorin": "433181",
  "bologna:jon-rowe": "672381",
  "bologna:benjamin-dominguez": "961022",
  "genoa:mikael-ellertsson": "566615",
  "genoa:alexsandro-amorim": "1082774",
  "genoa:ethan-meichtry": "1172166",
  "udinese:bayo-youssouf": "375877",
  "parma:benjamin-cremaschi": "999127",
  "como:andrea-leborgne": "1204163",
  "sassuolo:agustin-alvarez-martinez": "812625",
  "lecce:kialonda-gaspar": "836441",
  "lecce:owen-kouassi": "1057563",
  "venezia:calixte-ligue": "862744",
  "venezia:enrique-perez": "527698",
  "venezia:bjarki-steinn-bjarkason": "566613",
  "monza:manga-foe-ondoa": "1143375",
  "atalanta:sulemana": "982267"
};
const decode = value => String(value || "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&#039;|&apos;/g, "'").replace(/&euro;/g, "€").replace(/<[^>]+>/g, "").trim();
const repairEncoding = value => /Ã|Ä|Å|â/.test(value) ? Buffer.from(value, "latin1").toString("utf8") : value;
const key = value => repairEncoding(decode(value)).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const parseEuro = value => {
  const text = decode(value).toLowerCase().replace(/\s/g, "").replace("€", "").replace(",", ".");
  const amount = Number.parseFloat(text);
  if (!Number.isFinite(amount)) return null;
  if (text.includes("mln")) return Math.round(amount * 1_000_000);
  if (text.includes("mila")) return Math.round(amount * 1_000);
  return Math.round(amount);
};
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};
const slugKey = value => String(value || "").split("/").filter(Boolean)[0] || "";

function parsePage(html) {
  const pattern = /<a title="([^"]+)" href="(\/[^"]+\/profil\/spieler\/(\d+))">[\s\S]*?<a title="([^"]+)" href="\/[^"]+\/startseite\/verein\/(\d+)\/saison_id\/2026">[\s\S]*?<td class="rechts hauptlink"><a[^>]*>([^<]+)<\/a>/g;
  return [...html.matchAll(pattern)].map(match => {
    return {
      transfermarktId: match[3],
      name: decode(match[1]),
      teamId: teamAliases[key(match[4])] || null,
      transfermarktClubId: match[5],
      club: decode(match[4]),
      marketValueEur: parseEuro(match[6]),
      marketValueLabel: decode(match[6]),
      profileUrl: `https://www.transfermarkt.it${match[2]}`
    };
  }).filter(Boolean);
}

function parseClubPage(html, teamId, clubId) {
  const pattern = /<a href="(\/[^"]+\/profil\/spieler\/(\d+))">\s*([^<]+?)\s*<\/a>[\s\S]*?<td class="rechts hauptlink"><a[^>]*>([^<]+)<\/a>/g;
  return [...html.matchAll(pattern)].map(match => ({
    transfermarktId: match[2],
    name: decode(match[3]),
    teamId,
    transfermarktClubId: String(clubId),
    club: teamId,
    marketValueEur: parseEuro(match[4]),
    marketValueLabel: decode(match[4]),
    profileUrl: `https://www.transfermarkt.it${match[1]}`
  })).filter(player => player.marketValueEur !== null);
}

function parseSearchPage(html) {
  const body = html.match(/<div id="player-grid"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/)?.[1] || "";
  const pattern = /<td class="hauptlink"><a title="([^"]+)" href="(\/[^"]+\/profil\/spieler\/(\d+))">[\s\S]*?<tr><td><a title="([^"]+)" href="\/[^"]+\/startseite\/verein\/(\d+)">[\s\S]*?<td class="rechts hauptlink">([^<]+)<\/td>/g;
  return [...body.matchAll(pattern)].map(match => {
    return {
      transfermarktId: match[3],
      name: decode(match[1]),
      teamId: teamAliases[key(match[4])] || null,
      transfermarktClubId: match[5],
      club: decode(match[4]),
      marketValueEur: parseEuro(match[6]),
      marketValueLabel: decode(match[6]),
      profileUrl: `https://www.transfermarkt.it${match[2]}`
    };
  }).filter(player => player && player.marketValueEur !== null);
}

async function fetchSearch(local) {
  const url = `https://www.transfermarkt.it/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(repairEncoding(local.name))}`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, { headers });
    if (response.ok) {
      const exact = parseSearchPage(await response.text()).filter(player => key(player.name) === key(local.name));
      return { url, candidates: exact };
    }
    if (attempt === 3) throw new Error(`Ricerca Transfermarkt ${local.name}: HTTP ${response.status}`);
    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
  }
  return { url, candidates: [] };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index], index);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const sourcePlayers = [];
  const seenSourceIds = new Set();
  for (const [teamId, slug, clubId] of clubs) {
    const url = `https://www.transfermarkt.it/${slug}/kader/verein/${clubId}/saison_id/2026/plus/1`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Transfermarkt rosa ${teamId}: HTTP ${response.status}`);
    const rows = parseClubPage(await response.text(), teamId, clubId);
    if (!rows.length) throw new Error(`Transfermarkt rosa ${teamId}: nessun valore trovato`);
    const fresh = rows.filter(row => !seenSourceIds.has(row.transfermarktId));
    fresh.forEach(row => seenSourceIds.add(row.transfermarktId));
    sourcePlayers.push(...fresh);
    process.stdout.write(`${teamId}: ${rows.length} valori\n`);
  }
  const localPlayers = [];
  for (const teamId of Object.values(teamAliases).filter((id, index, list) => list.indexOf(id) === index)) {
    const file = path.join(root, `data/generated/team-pages/${teamId}-squad.json`);
    if (!fs.existsSync(file)) continue;
    const squad = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const player of squad.players || []) localPlayers.push({ teamId, id: player.id, name: player.name });
  }
  const matched = [], missing = [], ambiguous = [];
  for (const local of localPlayers) {
    const verified = verifiedProfiles[`${local.teamId}:${local.id}`];
    if (verified) {
      matched.push({ ...verified, playerId: local.id, localName: local.name, matchMethod: "verified-profile" });
      continue;
    }
    const verifiedId = verifiedProfileIds[`${local.teamId}:${local.id}`];
    const verifiedSource = verifiedId ? sourcePlayers.find(source => source.transfermarktId === verifiedId) : null;
    if (verifiedSource) {
      matched.push({ ...verifiedSource, teamId: local.teamId, playerId: local.id, localName: local.name, matchMethod: "verified-profile-id" });
      continue;
    }
    const sameTeam = sourcePlayers.filter(source => source.teamId === local.teamId && key(source.name) === key(local.name));
    const global = sourcePlayers.filter(source => key(source.name) === key(local.name));
    const sameTeamSlug = sourcePlayers.filter(source => source.teamId === local.teamId && slugKey(source.profileUrl) === local.id);
    const globalSlug = sourcePlayers.filter(source => slugKey(source.profileUrl) === local.id);
    const candidates = sameTeam.length ? sameTeam : global.length ? global : sameTeamSlug.length ? sameTeamSlug : globalSlug;
    const method = sameTeam.length ? "name-and-team" : global.length ? "unique-name" : sameTeamSlug.length ? "profile-slug-and-team" : "unique-profile-slug";
    if (candidates.length === 1) matched.push({ ...candidates[0], teamId: local.teamId, playerId: local.id, localName: local.name, matchMethod: method });
    else if (candidates.length > 1) ambiguous.push({ ...local, candidates });
    else missing.push(local);
  }
  const secondPassResults = await mapLimit(missing, 3, async (local, index) => {
    const result = await fetchSearch(local);
    process.stdout.write(`secondo passaggio ${index + 1}/${missing.length}: ${local.name} (${result.candidates.length})\n`);
    return { local, ...result };
  });
  const stillMissing = [];
  for (const result of secondPassResults) {
    if (result.candidates.length === 1) {
      matched.push({
        ...result.candidates[0],
        teamId: result.local.teamId,
        playerId: result.local.id,
        localName: result.local.name,
        matchMethod: "global-search-exact",
        searchUrl: result.url
      });
    } else if (result.candidates.length > 1) {
      ambiguous.push({ ...result.local, searchUrl: result.url, candidates: result.candidates });
    } else {
      stillMissing.push({ ...result.local, searchUrl: result.url });
    }
  }
  const unmatchedSource = sourcePlayers.filter(source => !matched.some(item => item.transfermarktId === source.transfermarktId));
  const dataset = {
    schemaVersion: 1,
    season: "2026-27",
    provider: "Transfermarkt",
    sourceUrl: baseUrl,
    retrievedAt,
    currency: "EUR",
    disclaimer: "Valori stimati da Transfermarkt; non equivalgono necessariamente al prezzo di trasferimento.",
    players: matched
  };
  write(target, dataset);
  write(reportTarget, {
    generatedAt: new Date().toISOString(),
    sourcePlayers: sourcePlayers.length,
    localPlayers: localPlayers.length,
    matched: matched.length,
    firstPassMissing: missing.length,
    secondPassRecovered: secondPassResults.filter(result => result.candidates.length === 1).length,
    missing: stillMissing.length,
    ambiguous: ambiguous.length,
    unmatchedSource: unmatchedSource.length,
    missingPlayers: stillMissing,
    ambiguousPlayers: ambiguous,
    unmatchedSourcePlayers: unmatchedSource
  });
  console.log(`Valori mercato: ${matched.length}/${localPlayers.length} abbinati; ${stillMissing.length} mancanti; ${ambiguous.length} ambigui.`);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
