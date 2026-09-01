"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const resultsPath = path.join(root, "data/sources/match-results-2026-27.json");
const playerStatsPath = path.join(root, "data/sources/statmuse-player-stats-2026-27.json");
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const playerStats = JSON.parse(fs.readFileSync(playerStatsPath, "utf8"));

const aliases = {
  "Łukasz Skorupski": ["lukasz-skorupski", "Lukasz Skorupski"],
  Kialonda: ["kialonda-gaspar", "Kialonda Gaspar"],
  "Amar Ahmed": ["amar-fatah", "Amar Fatah"],
  "Matìas Soulé": ["matias-soule", "Matìas Soulè"],
  "Konan N'dri": ["konan-n-dri", "Konan N’Dri"]
};
const slug = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const normalizedPlayer = name => ({ playerId: aliases[name]?.[0] || slug(name), player: aliases[name]?.[1] || name });
const player = (name, rating, minutes, goals, assists, shotsOnTarget, expectedGoals, shots, foulsCommitted, foulsDrawn, starter) => ({
  ...normalizedPlayer(name), rating, minutes, goals, assists, shotsOnTarget, expectedGoals, shots, foulsCommitted, foulsDrawn, starter
});
const scorer = (team, name, minute, assistName = null) => ({ team, ...normalizedPlayer(name), minute, assistPlayerId: assistName ? normalizedPlayer(assistName).playerId : null, assist: assistName ? normalizedPlayer(assistName).player : null });
const booking = (team, name, minute) => ({ team, ...normalizedPlayer(name), minute, card: "yellow" });
const substitution = (team, minute, playerInName, playerOutName) => ({ team, minute, playerIn: normalizedPlayer(playerInName).player, playerInId: normalizedPlayer(playerInName).playerId, playerOut: normalizedPlayer(playerOutName).player, playerOutId: normalizedPlayer(playerOutName).playerId });
const teamStats = values => ({
  possessionPct: values[0], expectedGoals: values[1], expectedAssists: values[2], shots: values[3], shotsOnTarget: values[4], shotsOffTarget: values[5], shotsBlocked: values[6], hitWoodwork: values[7], bigChancesMissed: values[8], corners: values[9],
  passesCompleted: values[10], passesAttempted: values[11], passAccuracyPct: values[12], keyPasses: values[13], tackles: values[14], tacklesWon: values[15], interceptions: values[16], clearances: values[17], recoveries: values[18], fouls: values[19], yellowCards: values[20], secondYellowCards: 0, straightRedCards: values[21], penaltiesFor: values[22], penaltiesAgainst: values[23], duelsWon: values[24], aerialsWon: values[25], goalkeeperSaves: values[26]
});

const games = [
  {
    matchId: "atalanta-bologna-2026-27-md-02",
    url: "https://www.statmuse.com/fc/match/8-31-2026-ata-vs-bol-112092",
    score: [1, 0], half: [0, 0], attendance: null, weather: 25, formations: ["4-3-3", "4-2-3-1"], mvp: ["atalanta", "Lazar Samardzic"], abbreviations: ["ATA", "BOL"],
    didNotPlay: { home: [normalizedPlayer("Lorenzo Bernasconi")], away: [] },
    stats: { home: [42,.16,.34,6,2,4,2,0,0,1,414,484,86,5,8,6,12,15,31,10,1,0,0,0,30,4,3], away: [59,1.06,.66,16,3,13,3,1,1,2,627,691,91,13,18,9,11,19,46,13,0,0,0,0,40,6,1] },
    players: {
      home: [
        player("Davide Zappacosta",6.7,90,0,0,0,0,0,1,0,true), player("Mario Pašalić",7,90,0,0,0,0,0,0,0,true), player("Sead Kolašinac",6.7,77,0,0,0,0,0,0,1,true), player("Gianluca Scamacca",6.1,67,0,0,1,.04,1,2,3,true),
        player("Lazar Samardzic",9,23,1,0,1,.02,1,0,0,false), player("Odilon Kossounou",6.8,90,0,0,0,0,0,0,1,true), player("Eljif Elmas",6.1,35,0,0,0,0,0,0,0,false), player("Raoul Bellanova",7,13,0,0,0,0,0,0,1,false),
        player("Gianluca Gaetano",6.3,90,0,0,0,0,0,2,1,true), player("Giacomo Raspadori",5.1,55,0,0,0,.06,2,0,0,true), player("Charles De Ketelaere",6.2,54,0,0,0,0,0,1,2,true), player("Giorgio Scalvini",6.8,90,0,0,0,0,0,2,1,true),
        player("Éderson",6.8,67,0,0,0,0,0,1,2,true), player("Nicola Zalewski",7.3,36,0,1,0,.04,2,1,1,false), player("Marco Carnesecchi",7.7,90,0,0,0,0,0,0,0,true), player("Nikola Krstović",6.5,23,0,0,0,0,0,0,0,false)
      ],
      away: [
        player("Artem Dovbyk",5.7,31,0,0,0,.2,2,1,0,false), player("Federico Bernardeschi",7.3,90,0,0,1,.11,2,1,0,true), player("Łukasz Skorupski",6,90,0,0,0,0,0,0,0,true), player("Riccardo Orsolini",6.5,20,0,0,0,0,0,0,0,false),
        player("Roberto Piccoli",5.7,59,0,0,1,.49,3,0,0,true), player("Nicolò Cambiaghi",7.6,90,0,0,1,.12,3,3,3,true), player("Jens Odgaard",6.2,59,0,0,0,.04,2,0,3,true), player("Tommaso Pobega",6.8,71,0,0,0,.02,1,1,0,true),
        player("Lewis Ferguson",7.4,90,0,0,0,.01,1,3,0,true), player("Nikola Moro",6.6,11,0,0,0,0,0,0,0,false), player("Emil Holm",7.3,71,0,0,0,.04,1,0,0,true), player("Nadir Zortea",6.9,19,0,0,0,0,0,0,0,false),
        player("Rahim Bonkano",7.8,90,0,0,0,0,0,1,1,true), player("Torbjørn Heggem",7.8,90,0,0,0,0,0,1,1,true), player("Eivind Helland",7.5,90,0,0,0,0,0,2,1,true), player("Mikel Amondarain",6.2,19,0,0,0,.03,1,0,1,false)
      ]
    },
    scorers: [scorer("atalanta", "Lazar Samardzic", 90, "Nicola Zalewski")],
    bookings: [booking("atalanta", "Nikola Krstović", 73)],
    substitutions: [substitution("atalanta",55,"Nicola Zalewski","Charles De Ketelaere"),substitution("atalanta",56,"Eljif Elmas","Giacomo Raspadori"),substitution("bologna",60,"Riccardo Orsolini","Jens Odgaard"),substitution("bologna",60,"Artem Dovbyk","Roberto Piccoli"),substitution("atalanta",68,"Nikola Krstović","Gianluca Scamacca"),substitution("atalanta",68,"Lazar Samardzic","Éderson"),substitution("bologna",72,"Nadir Zortea","Emil Holm"),substitution("bologna",72,"Mikel Amondarain","Tommaso Pobega"),substitution("atalanta",78,"Raoul Bellanova","Sead Kolašinac"),substitution("bologna",80,"Nikola Moro","Riccardo Orsolini")]
  },
  {
    matchId: "lecce-roma-2026-27-md-02",
    url: "https://www.statmuse.com/fc/match/8-31-2026-lec-vs-rom-112095",
    score: [0, 4], half: [0, 3], attendance: 27031, weather: 29, formations: ["3-5-2", "3-4-2-1"], mvp: ["roma", "Donyell Malen"], abbreviations: ["LEC", "ROM"],
    stats: { home: [36,.8,.38,7,3,4,0,0,2,2,301,382,79,5,16,7,8,22,49,9,1,0,0,0,37,4,4], away: [64,3.28,2.72,15,8,7,0,1,4,1,604,685,88,11,33,19,13,9,72,8,1,0,0,0,61,8,2] },
    players: {
      home: [
        player("Corrie Ndaba",5.8,90,0,0,0,0,0,0,0,true), player("Wladimiro Falcone",5.3,90,0,0,0,0,0,0,0,true), player("Youssef Maleh",6.4,45,0,0,0,.04,1,0,0,false), player("Ivan Ilić",6.9,19,0,0,0,0,0,1,0,false),
        player("Lassana Coulibaly",6.6,90,0,0,0,0,0,0,2,true), player("Santiago Pierotti",6.6,71,0,0,1,.02,1,2,0,true), player("Kialonda",5.4,90,0,0,1,.26,1,0,3,true), player("Amar Ahmed",6.8,19,0,0,0,0,0,1,1,false),
        player("Willem Geubbels",5.9,53,0,0,1,.43,2,1,0,true), player("Danilo Veiga",5.2,90,0,0,0,0,0,1,0,true), player("Tiago Gabriel",6,45,0,0,0,0,0,0,0,true), player("Konan N'dri",5.6,45,0,0,0,.05,2,1,0,false),
        player("Olaf Gorter",6,45,0,0,0,0,0,0,0,true), player("Jamil Siebert",5.6,90,0,0,0,0,0,1,0,true), player("Nikola Štulić",6.5,37,0,0,0,0,0,1,1,false), player("Oumar Ngom",6,71,0,0,0,0,0,0,0,true)
      ],
      away: [
        player("Donyell Malen",9.2,66,2,0,3,1.3,5,1,0,true), player("Marten de Roon",6.5,7,0,0,0,0,0,0,0,false), player("Mario Hermoso",7.4,90,0,0,0,0,0,0,1,true), player("Nahuel Molina",6.8,31,0,0,0,0,0,0,0,false),
        player("Manu Koné",7.4,66,0,0,0,0,0,0,0,true), player("Bryan Cristante",6.3,90,0,0,0,0,0,1,1,true), player("Paulo Dybala",7.7,83,0,0,1,.37,3,0,0,true), player("Gianluca Mancini",7.5,90,0,1,0,0,0,1,2,true),
        player("Mile Svilar",7.1,90,0,0,0,0,0,0,0,true), player("Niccolò Pisilli",6.8,24,0,0,0,0,0,0,0,false), player("Matìas Soulé",8.7,59,1,0,3,.85,4,0,1,true), player("Santiago Castro",5.8,24,0,0,0,.05,1,3,0,false),
        player("Daniele Ghilardi",6.7,90,0,0,0,0,0,1,1,true), player("Wesley",7,59,0,1,0,.03,1,1,2,true), player("Emanuele Lulli",7.5,90,0,0,0,0,0,0,0,true), player("Rodrigo Mora",8.8,31,1,0,1,.68,1,0,1,false)
      ]
    },
    scorers: [scorer("roma","Donyell Malen",4),scorer("roma","Donyell Malen",23,"Wesley"),scorer("roma","Matìas Soulé",25),scorer("roma","Rodrigo Mora",65,"Gianluca Mancini")],
    bookings: [booking("roma","Donyell Malen",9),booking("lecce","Ivan Ilić",90)],
    substitutions: [substitution("lecce",46,"Konan N'dri","Tiago Gabriel"),substitution("lecce",46,"Youssef Maleh","Olaf Gorter"),substitution("lecce",54,"Nikola Štulić","Willem Geubbels"),substitution("roma",60,"Nahuel Molina","Wesley"),substitution("roma",60,"Rodrigo Mora","Matìas Soulé"),substitution("roma",67,"Santiago Castro","Donyell Malen"),substitution("roma",67,"Niccolò Pisilli","Manu Koné"),substitution("lecce",72,"Amar Ahmed","Santiago Pierotti"),substitution("lecce",72,"Ivan Ilić","Oumar Ngom"),substitution("roma",84,"Marten de Roon","Paulo Dybala")]
  }
];

results.retrievedAt = "2026-09-01";
const mvpSource = results.sources.find(item => item.sourceType === "official-player-of-the-match");
if (mvpSource) mvpSource.retrievedAt = "2026-09-01";

for (const game of games) {
  if (!results.sources.some(item => item.url === game.url)) results.sources.push({ provider: "StatMuse", sourceType: "match-report-stats", url: game.url, retrievedAt: "2026-09-01" });
  const [mvpTeam, mvpName] = game.mvp;
  const result = {
    matchId: game.matchId, status: "finished", score: { home: game.score[0], away: game.score[1] }, halfTimeScore: { home: game.half[0], away: game.half[1] }, attendance: game.attendance, weatherCelsius: game.weather,
    formations: { home: game.formations[0], away: game.formations[1] }, scorers: game.scorers, bookings: game.bookings, substitutions: game.substitutions, didNotPlay: game.didNotPlay || { home: [], away: [] },
    teamStats: { home: teamStats(game.stats.home), away: teamStats(game.stats.away) },
    playerStats: { home: game.players.home.map(({ foulsCommitted, foulsDrawn, ...entry }) => entry), away: game.players.away.map(({ foulsCommitted, foulsDrawn, ...entry }) => entry) },
    mvp: { team: mvpTeam, ...normalizedPlayer(mvpName), sourceUrl: mvpSource.url }, sourceUrl: game.url
  };
  const index = results.matches.findIndex(item => item.matchId === game.matchId);
  if (index >= 0) results.matches[index] = result; else results.matches.push(result);

  const overlay = [game.url, game.abbreviations[0], game.players.home.map(entry => [entry.player, entry.shots, entry.shotsOnTarget, entry.foulsCommitted, entry.foulsDrawn]), game.abbreviations[1], game.players.away.map(entry => [entry.player, entry.shots, entry.shotsOnTarget, entry.foulsCommitted, entry.foulsDrawn])];
  const overlayIndex = playerStats.matches.findIndex(item => item[0] === game.url);
  if (overlayIndex >= 0) playerStats.matches[overlayIndex] = overlay; else playerStats.matches.push(overlay);
}

playerStats.updatedAt = "2026-09-01";
fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(playerStatsPath, `${JSON.stringify(playerStats)}\n`);
console.log(`Aggiornati ${games.length} risultati finali del 31 agosto 2026.`);
