const fs = require("fs");
const path = require("path");
const { loadPlayerIdentities } = require("./player-identity");

const root = path.resolve(__dirname, "..");
const sourceUrl = "https://www.fantacalcio.it/probabili-formazioni-serie-a";
const matchdayArgIndex = process.argv.indexOf("--matchday");
const requestedMatchday = matchdayArgIndex >= 0 ? Number(process.argv[matchdayArgIndex + 1]) : 4;
if (!Number.isInteger(requestedMatchday) || requestedMatchday < 1 || requestedMatchday > 38) throw new Error("Giornata non valida");
const outputPath = path.join(root, `data/sources/probable-lineups-md${requestedMatchday}-2026-27.json`);
const quotationsPath = path.join(root, "data/sources/fantacalcio-quotations-2026-27.json");
const inputIndex = process.argv.indexOf("--input");
const rawPath = path.join(root, `data/raw/fantacalcio/probable-lineups-md${requestedMatchday}-2026-27.html`);

const decodeHtml = value => String(value)
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
  .replace(/&agrave;/gi, "à")
  .replace(/&egrave;/gi, "è")
  .replace(/&eacute;/gi, "é")
  .replace(/&igrave;/gi, "ì")
  .replace(/&ograve;/gi, "ò")
  .replace(/&ugrave;/gi, "ù")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&nbsp;/gi, " ")
  .trim();

const normalize = value => decodeHtml(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const extractList = (teamBlock, status) => {
  const listMatch = teamBlock.match(new RegExp(`<ul class="[^"]*player-list[^"]*${status === "starter" ? "starters" : "reserves"}[^"]*">([\\s\\S]*?)<\\/ul>`));
  if (!listMatch) throw new Error(`Lista ${status} mancante`);

  return [...listMatch[1].matchAll(/<li class="player-item pill"[\s\S]*?<span class="role" data-value="([pdca])"><\/span>[\s\S]*?<a class="player-name player-link"[\s\S]*?href="[^"]+\/(\d+)"[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?aria-valuenow="(\d+)"[\s\S]*?<\/li>/gi)].map(match => ({
    sourceId: Number(match[2]),
    sourceName: decodeHtml(match[3]),
    sourceRole: match[1].toUpperCase(),
    probability: Number(match[4]),
    lineupStatus: status
  }));
};

async function main() {
  let html;
  if (inputIndex >= 0) {
    html = fs.readFileSync(path.resolve(root, process.argv[inputIndex + 1]), "utf8");
  } else {
    const response = await fetch(sourceUrl, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; SerieA2026DataImporter/1.0)",
        "accept-language": "it-IT,it;q=0.9"
      }
    });
    if (!response.ok) throw new Error(`Fantacalcio HTTP ${response.status}`);
    html = await response.text();
  }

  const matchdayMatch = html.match(/Giornata\s+(\d+)/i);
  const matchday = matchdayMatch ? Number(matchdayMatch[1]) : null;
  if (matchday !== requestedMatchday) throw new Error(`La pagina espone la giornata ${matchday ?? "N/D"}, attesa ${requestedMatchday}`);

  const quotations = JSON.parse(fs.readFileSync(quotationsPath, "utf8"));
  const activePlayers = quotations.players.filter(player => player.status === "active");
  const rosterBySourceId = new Map(activePlayers.map(player => [Number(player.sourceId), player]));
  const identities = loadPlayerIdentities(root);
  const rosterByPlayerId = new Map(activePlayers.map(player => [`${player.teamId}:${player.playerId}`, player]));
  const teamIdByName = new Map(activePlayers.map(player => [normalize(player.team), player.teamId]));

  const headerRegex = /<h3 class="h6 team-name">([^<]+)<\/h3>/g;
  const headers = [...html.matchAll(headerRegex)];
  if (headers.length !== 20) throw new Error(`Trovate ${headers.length} squadre, attese 20`);

  const omittedNonRoster = [];
  const teams = headers.map((header, index) => {
    const blockStart = header.index;
    const blockEnd = index + 1 < headers.length ? headers[index + 1].index : html.length;
    const block = html.slice(blockStart, blockEnd);
    const team = decodeHtml(header[1]);
    const teamId = teamIdByName.get(normalize(team));
    if (!teamId) throw new Error(`Squadra non collegata alla rosa Fantacalcio: ${team}`);

    const formation = decodeHtml(block.match(/<div class="h6 team-formation">([^<]+)<\/div>/)?.[1] ?? "");
    if (!/^[1-9](?:-[1-9]){2,4}$/.test(formation)) throw new Error(`Modulo non valido per ${team}: ${formation}`);

    const parsedPlayers = [
      ...extractList(block, "starter"),
      ...extractList(block, "reserve")
    ];
    const players = parsedPlayers.flatMap(player => {
      const bySource = rosterBySourceId.get(player.sourceId);
      const alias = identities.resolve(teamId, player.sourceName);
      const rosterPlayer = bySource?.teamId === teamId ? bySource : alias ? rosterByPlayerId.get(`${teamId}:${alias.playerId}`) : null;
      const verifiedAlias = rosterPlayer && rosterPlayer !== bySource;
      if (!rosterPlayer || rosterPlayer.teamId !== teamId) {
        if (player.lineupStatus === "starter") {
          return [{
            ...player,
            team,
            teamId,
            playerId: alias?.playerId || null,
            currentName: alias?.canonicalName || null,
            matchStatus: alias ? "verified-alias" : "unmatched",
            associationMethod: alias ? "verified-identity-alias" : "unmatched-source-player"
          }];
        }
        omittedNonRoster.push({ team, teamId, ...player });
        return [];
      }
      return [{
        ...player,
        team,
        teamId,
        playerId: rosterPlayer.playerId ?? null,
        currentName: rosterPlayer.currentName ?? rosterPlayer.name ?? null,
        matchStatus: verifiedAlias ? "verified-alias" : rosterPlayer.playerId ? "linked-player" : "linked-listone",
        associationMethod: verifiedAlias ? "verified-identity-alias" : rosterPlayer.playerId ? "fantacalcio-source-id" : "listone-only"
      }];
    });

    if (players.filter(player => player.lineupStatus === "starter").length !== 11) {
      throw new Error(`${team}: i titolari appartenenti alla rosa sono ${players.filter(player => player.lineupStatus === "starter").length}, attesi 11`);
    }

    const fixtureBlockStart = index % 2 === 0 ? blockStart : headers[index - 1].index;
    const fixtureBlockEnd = index + (index % 2 === 0 ? 2 : 1) < headers.length
      ? headers[index + (index % 2 === 0 ? 2 : 1)].index
      : html.length;
    const fixtureBlock = html.slice(fixtureBlockStart, fixtureBlockEnd);
    const updatedAt = decodeHtml(fixtureBlock.match(/last-update[\s\S]*?<span class="date">([^<]+)<\/span>/i)?.[1] ?? "");
    if (!updatedAt) throw new Error(`Ultimo aggiornamento mancante per ${team}`);

    return { team, teamId, formation, updatedAt, players };
  });

  const players = teams.flatMap(team => team.players);
  const dataset = {
    schemaVersion: 1,
    provider: "Fantacalcio.it",
    season: "2026/27",
    matchday,
    sourceUrl,
    rawSnapshot: path.relative(root, rawPath).replace(/\\/g, "/"),
    importedAt: new Date().toISOString(),
    interpretation: `Percentuale editoriale di probabilità di titolarità per la ${matchday}ª giornata; non è una formazione ufficiale.`,
    rosterPolicy: "Sono incluse le riserve presenti nelle rose ufficiali Fantacalcio correnti e tutti i titolari pubblicati dalla fonte; i titolari non collegati restano espliciti con playerId null. Le riserve fuori rosa sono conservate in omittedNonRoster. Infortunati e indisponibili appartenenti alla rosa non vengono esclusi.",
    coverage: {
      teams: teams.length,
      players: players.length,
      starters: players.filter(player => player.lineupStatus === "starter").length,
      reserves: players.filter(player => player.lineupStatus === "reserve").length,
      linkedPlayers: players.filter(player => player.playerId).length,
      verifiedAliases: players.filter(player => player.matchStatus === "verified-alias").length,
      linkedListoneOnly: players.filter(player => player.matchStatus === "linked-listone").length,
      unmatched: players.filter(player => player.matchStatus === "unmatched").length,
      omittedNonRoster: omittedNonRoster.length
    },
    omittedNonRoster,
    teams
  };

  fs.mkdirSync(path.dirname(rawPath), { recursive: true });
  fs.writeFileSync(rawPath, html);
  fs.writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(`Fantacalcio MD${matchday}: ${teams.length} squadre, ${dataset.coverage.starters} titolari, ${dataset.coverage.reserves} riserve, ${omittedNonRoster.length} esclusi perché fuori rosa.`);
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
