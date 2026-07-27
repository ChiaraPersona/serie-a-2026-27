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
    const sameTeam = sourcePlayers.filter(source => source.teamId === local.teamId && key(source.name) === key(local.name));
    const global = sourcePlayers.filter(source => key(source.name) === key(local.name));
    const candidates = sameTeam.length ? sameTeam : global;
    if (candidates.length === 1) matched.push({ ...candidates[0], playerId: local.id, localName: local.name, matchMethod: sameTeam.length ? "name-and-team" : "unique-name" });
    else if (candidates.length > 1) ambiguous.push({ ...local, candidates });
    else missing.push(local);
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
    missing: missing.length,
    ambiguous: ambiguous.length,
    unmatchedSource: unmatchedSource.length,
    missingPlayers: missing,
    ambiguousPlayers: ambiguous,
    unmatchedSourcePlayers: unmatchedSource
  });
  console.log(`Valori mercato: ${matched.length}/${localPlayers.length} abbinati; ${missing.length} mancanti; ${ambiguous.length} ambigui.`);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
