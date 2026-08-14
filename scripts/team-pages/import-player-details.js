const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const marketPath = path.join(root, "data/sources/team-pages/transfermarkt-market-values-2026-27.json");
const targetPath = path.join(root, "data/sources/team-pages/transfermarkt-player-details-2026-27.json");
const market = JSON.parse(fs.readFileSync(marketPath, "utf8"));
const headers = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0 Safari/537.36",
  "accept-language": "it-IT,it;q=0.9,en;q=0.8"
};

const decode = value => String(value || "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&#039;|&apos;/g, "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const isoDate = value => {
  const match = String(value || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
};
const between = (html, pattern) => decode(html.match(pattern)?.[1]);
const parseProfile = html => {
  const birthDate = isoDate(between(html, /itemprop="birthDate"[^>]*>([\s\S]*?)<\/span>/i));
  const birthplace = between(html, /itemprop="birthPlace"[^>]*>([\s\S]*?)<\/span>/i) || null;
  const nationality = between(html, /itemprop="nationality"[^>]*>([\s\S]*?)<\/span>/i) || null;
  const heightText = between(html, /itemprop="height"[^>]*>([\s\S]*?)<\/span>/i);
  const heightMatch = heightText.match(/(\d)[,.](\d{2})\s*m/i);
  const foot = between(html, /Piede:<\/span>\s*<span[^>]*info-table__content--bold[^>]*>([\s\S]*?)<\/span>/i) || null;
  const clubSince = isoDate(between(html, /In rosa da:[\s\S]*?<span[^>]*data-header__content[^>]*>([\s\S]*?)<\/span>/i));
  return {
    dateOfBirth: birthDate,
    birthplace,
    nationality,
    heightCm: heightMatch ? Number(heightMatch[1]) * 100 + Number(heightMatch[2]) : null,
    preferredFoot: foot,
    clubSince
  };
};

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index], index);
      await new Promise(resolve => setTimeout(resolve, 120));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const previous = fs.existsSync(targetPath) ? JSON.parse(fs.readFileSync(targetPath, "utf8")) : { players: [] };
  const previousById = new Map(previous.players.map(player => [`${player.teamId}:${player.playerId}`, player]));
  const rows = await mapLimit(market.players, 4, async (player, index) => {
    const cacheKey = `${player.teamId}:${player.playerId}`;
    try {
      const response = await fetch(player.profileUrl, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const details = parseProfile(await response.text());
      process.stdout.write(`profilo ${index + 1}/${market.players.length}: ${player.localName}\n`);
      return { teamId: player.teamId, playerId: player.playerId, name: player.localName, transfermarktId: player.transfermarktId, profileUrl: player.profileUrl, ...details };
    } catch (error) {
      process.stderr.write(`profilo non aggiornato ${player.localName}: ${error.message}\n`);
      return previousById.get(cacheKey) || null;
    }
  });
  const players = rows.filter(Boolean);
  const output = {
    schemaVersion: 1,
    season: "2026-27",
    provider: "Transfermarkt",
    retrievedAt: new Date().toISOString().slice(0, 10),
    sourceUrl: market.sourceUrl,
    fields: ["dateOfBirth", "birthplace", "nationality", "heightCm", "preferredFoot", "clubSince"],
    players
  };
  fs.writeFileSync(targetPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Profili Transfermarkt: ${players.length}/${market.players.length}.`);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
