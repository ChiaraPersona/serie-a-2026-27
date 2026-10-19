"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const refresh = process.argv.includes("--refresh");
const retrievedAt = new Date().toISOString();
const outputPath = path.join(root, "data/sources/european-player-match-stats-2026-27.json");
const rawRoot = path.join(root, "data/raw/european-player-match-stats/playerstats");

const metrics = {
  fouls_committed: "foulsCommitted",
  fouls_drawn: "foulsDrawn",
  tackles: "tackles",
  key_passes: "keyPasses",
  shots: "shots",
  shots_on_goal: "shotsOnTarget",
  yellow_cards: "yellowCards",
  goals_scored: "goals",
  goals_assists: "assists",
  goal_involvements: "goalInvolvements",
  foul_involvements: "foulInvolvements",
  dispossesed: "dispossessed",
  offsides: "offsides"
};

const fixtures = [
  {
    fixtureId: "real-madrid-inter-2026-27-ucl-01",
    linkedFixtureId: "ucl-2026-27-md01-06",
    competition: "champions-league",
    date: "2026-09-08",
    teamId: "inter",
    venue: "away",
    opponent: "Real Madrid",
    score: { team: 1, opponent: 2 },
    sourceUrl: "https://playerstats.football/fixture/real-madrid/inter/2026-09-08",
    starters: ["Josep Martínez", "Benjamin Pavard", "Yann Bisseck", "Alessandro Bastoni", "Andy Diouf", "Nicolò Barella", "Hakan Çalhanoglu", "Curtis Jones", "Carlos Augusto", "Lautaro Martínez", "Marcus Thuram"],
    substitutions: [
      ["46", "John Stones", "Benjamin Pavard"],
      ["60", "Ange-Yoan Bonny", "Marcus Thuram"],
      ["60", "Petar Sucic", "Nicolò Barella"],
      ["60", "Piotr Zielinski", "Hakan Çalhanoglu"],
      ["83", "Henrikh Mkhitaryan", "Carlos Augusto"]
    ]
  },
  {
    fixtureId: "napoli-arsenal-2026-27-ucl-01",
    linkedFixtureId: "ucl-2026-27-md01-12",
    competition: "champions-league",
    date: "2026-09-09",
    teamId: "napoli",
    venue: "home",
    opponent: "Arsenal",
    score: { team: 0, opponent: 1 },
    sourceUrl: "https://playerstats.football/fixture/napoli/arsenal/2026-09-09",
    starters: ["Alex Meret", "Mathías Olivera", "Rafa Marín", "Amir Rrahmani", "Giovanni Di Lorenzo", "Stanislav Lobotka", "Billy Gilmour", "Kevin De Bruyne", "Alisson Santos", "Rasmus Højlund", "Matteo Politano"],
    substitutions: [
      ["46", "Vanja Milinkovic-Savic", "Alex Meret"],
      ["58", "Costantino Favasuli", "Matteo Politano"],
      ["58", "Antonio Vergara", "Alisson Santos"],
      ["76", "David Neres", "Rasmus Højlund"],
      ["77", "Lorenzo Lucca", "Stanislav Lobotka"]
    ]
  },
  {
    fixtureId: "fenerbahce-roma-2026-27-uel-01",
    linkedFixtureId: "ucl-2026-27-md01-13",
    competition: "europa-league",
    date: "2026-09-10",
    teamId: "roma",
    venue: "away",
    opponent: "Fenerbahçe",
    score: { team: 1, opponent: 1 },
    sourceUrl: "https://playerstats.football/fixture/fenerbahce/roma/2026-09-10",
    starters: ["Mile Svilar", "Mario Hermoso", "Evan Ndicka", "Gianluca Mancini", "Wesley", "Bryan Cristante", "Manu Koné", "Devyne Rensch", "Matìas Soulè", "Paulo Dybala", "Donyell Malen"],
    substitutions: [
      ["53", "Niccolò Pisilli", "Manu Koné"],
      ["74", "Leonardo Balerdi", "Gianluca Mancini"],
      ["74", "Nahuel Molina", "Devyne Rensch"],
      ["74", "Rodrigo Mora", "Matìas Soulè"],
      ["87", "Marten de Roon", "Donyell Malen"]
    ]
  },
  {
    fixtureId: "como-lipsia-2026-27-uecl-01",
    linkedFixtureId: "ucl-2026-27-md01-15",
    competition: "conference-league",
    date: "2026-09-10",
    teamId: "como",
    venue: "home",
    opponent: "RB Leipzig",
    score: { team: 4, opponent: 1 },
    sourceUrl: "https://playerstats.football/fixture/como/rb-leipzig/2026-09-10",
    starters: ["Jean Butez", "Álex Valle", "Trevoh Chalobah", "Jacobo Ramón", "Yan Couto", "Lucas Da Cunha", "Luis Milla", "Martin Baturina", "Nico Paz", "Assane Diao", "Anastasios Douvikas"],
    substitutions: [
      ["65", "Kean", "Anastasios Douvikas"],
      ["65", "Marc-Oliver Kempf", "Martin Baturina"],
      ["66", "Máximo Perrone", "Lucas Da Cunha"],
      ["74", "Ivan Smolcic", "Yan Couto"],
      ["86", "Samuele Ricci", "Assane Diao"]
    ]
  },
  {
    fixtureId: "milan-benfica-2026-27-uel-01",
    competition: "europa-league",
    date: "2026-09-16",
    teamId: "milan",
    venue: "home",
    opponent: "Benfica",
    score: { team: 0, opponent: 2 },
    sourceUrl: "https://playerstats.football/fixture/milan/benfica/2026-09-16",
    starters: ["Mike Maignan", "Strahinja Pavlović", "Koni De Winter", "Filippo Terracciano", "Davide Bartesaghi", "Yunus Musah", "Ardon Jashari", "Samuel Chukwueze", "Alphadjo Cissè", "Omari Hutchinson", "Gonçalo Ramos"],
    substitutions: [
      ["46", "Mario Gila", "Filippo Terracciano"],
      ["46", "Christian Pulisic", "Omari Hutchinson"],
      ["57", "Diego Moreira", "Alphadjo Cissè"],
      ["57", "Alexis Saelemaekers", "Davide Bartesaghi"],
      ["73", "Adrien Rabiot", "Ardon Jashari"]
    ]
  }
];

const clean = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const decode = value => String(value || "")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#039;|&apos;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">");
const minuteNumber = value => Number(String(value).match(/^\d+/)?.[0] || 0);

function rawPath(fixture) {
  return path.join(rawRoot, `${fixture.date}-${fixture.fixtureId}.html.gz`);
}

async function htmlFor(fixture) {
  const target = rawPath(fixture);
  if (!refresh && fs.existsSync(target)) return zlib.gunzipSync(fs.readFileSync(target)).toString("utf8");
  const response = await fetch(fixture.sourceUrl, { headers: { "user-agent": "Mozilla/5.0 Codex European match stats importer" } });
  if (!response.ok) throw new Error(`${fixture.fixtureId}: HTTP ${response.status}`);
  const html = await response.text();
  if (!/Player Stats/i.test(html) || !/id="stat-shots-panel"/.test(html)) throw new Error(`${fixture.fixtureId}: pagina statistica incompleta`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, zlib.gzipSync(html));
  return html;
}

function rosterIndex(teamId) {
  const team = read(`data/teams/${teamId}.json`);
  return new Map(team.squad.map(player => [clean(player.name), player]));
}

function resolvePlayer(sourceName, players) {
  const source = clean(sourceName);
  const exact = players.get(source);
  if (exact) return exact;
  const parts = source.split(" ").filter(Boolean);
  const initial = parts.length > 1 && parts[0].length === 1 ? parts[0] : null;
  const surname = parts.at(-1);
  const candidates = [...players.values()].filter(player => {
    const tokens = clean(player.name).split(" ").filter(Boolean);
    return tokens.includes(surname) && (!initial || tokens[0]?.startsWith(initial));
  });
  if (candidates.length === 1) return candidates[0];
  const compound = [...players.values()].filter(player => {
    const normalized = clean(player.name);
    return normalized.endsWith(source) || source.endsWith(normalized);
  });
  if (compound.length === 1) return compound[0];
  return null;
}

function parseMetric(html, metricId) {
  const marker = `id="stat-${metricId}-panel"`;
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const next = html.indexOf('id="stat-', start + marker.length);
  const end = next < 0 ? html.indexOf("</section>", start) : next;
  const block = html.slice(start, end > start ? end : start + 80000);
  const pattern = /text-xs truncate[^>]*>([^<]+)<\/div>[\s\S]*?w-10 h-6[^>]*>(\d+)<\/div>/g;
  return [...block.matchAll(pattern)].map(match => ({ sourceName: decode(match[1]).trim(), value: Number(match[2]) }));
}

function parseStructuredEvent(html) {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (!match) throw new Error("JSON-LD SportsEvent assente");
  return JSON.parse(match[1]);
}

function parseTeamTotals(event, venue) {
  const team = venue === "home" ? event.homeTeam : event.awayTeam;
  return Object.fromEntries((team.additionalProperty || []).map(item => [clean(item.name).replace(/ /g, "_"), Number(item.value)]));
}

function playerRow(player, starter, substitutions) {
  const off = substitutions.find(item => item.playerOut === player.name);
  const on = substitutions.find(item => item.playerIn === player.name);
  const minutesPlayed = starter ? Math.min(90, minuteNumber(off?.minute || 90)) : Math.max(0, 90 - minuteNumber(on?.minute || 90));
  return {
    playerId: player.id,
    name: player.name,
    starter,
    substituteAppearance: !starter,
    minutesPlayed,
    ...Object.fromEntries(Object.values(metrics).map(metric => [metric, 0]))
  };
}

async function main() {
  const matches = [];
  for (const fixture of fixtures) {
    const players = rosterIndex(fixture.teamId);
    const substitutions = fixture.substitutions.map(([minute, playerIn, playerOut]) => ({ minute, playerIn, playerOut }));
    const participants = [...new Set([...fixture.starters, ...substitutions.map(item => item.playerIn)])];
    const rows = participants.map(name => {
      const player = players.get(clean(name));
      if (!player) throw new Error(`${fixture.fixtureId}: giocatore non risolto ${name}`);
      return playerRow(player, fixture.starters.includes(name), substitutions);
    });
    const rowById = new Map(rows.map(row => [row.playerId, row]));
    const html = await htmlFor(fixture);
    for (const [sourceMetric, targetMetric] of Object.entries(metrics)) {
      for (const item of parseMetric(html, sourceMetric)) {
        const player = resolvePlayer(item.sourceName, players);
        if (!player || !rowById.has(player.id)) continue;
        rowById.get(player.id)[targetMetric] = item.value;
      }
    }
    const event = parseStructuredEvent(html);
    matches.push({
      fixtureId: fixture.fixtureId,
      linkedFixtureId: fixture.linkedFixtureId || null,
      competition: fixture.competition,
      date: fixture.date,
      teamId: fixture.teamId,
      venue: fixture.venue,
      opponent: fixture.opponent,
      score: fixture.score,
      sourceUrl: fixture.sourceUrl,
      sourceRetrievedAt: retrievedAt,
      teamTotals: parseTeamTotals(event, fixture.venue),
      substitutions,
      players: rows
    });
  }
  const output = {
    schemaVersion: 1,
    season: "2026-27",
    generatedAt: retrievedAt,
    scope: "Prestazioni individuali e sostituzioni delle squadre italiane nelle gare UEFA concluse fino al 2026-09-17.",
    source: {
      provider: "PlayerStats",
      note: "Gli zero sono espliciti per i calciatori scesi in campo quando il giocatore non compare nella graduatoria non-zero del singolo indicatore. I minuti derivano da titolarita e timeline dei cambi su gara regolamentare da 90 minuti."
    },
    summary: {
      matches: matches.length,
      teams: new Set(matches.map(match => match.teamId)).size,
      playerAppearances: matches.reduce((sum, match) => sum + match.players.length, 0),
      substitutions: matches.reduce((sum, match) => sum + match.substitutions.length, 0),
      europaLeagueMatches: matches.filter(match => match.competition === "europa-league").length
    },
    matches
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`OK prestazioni europee: ${output.summary.matches} gare · ${output.summary.playerAppearances} presenze · ${output.summary.substitutions} cambi`);
  console.log(path.relative(root, outputPath));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
