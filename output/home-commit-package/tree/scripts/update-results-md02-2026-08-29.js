"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const resultsPath = path.join(root, "data/sources/match-results-2026-27.json");
const playerStatsPath = path.join(root, "data/sources/statmuse-player-stats-2026-27.json");
const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
const playerStats = JSON.parse(fs.readFileSync(playerStatsPath, "utf8"));

const slug = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const aliases = {
  "João Mário Lopes": "joao-mario",
  "José Romero": "jose-david-romero"
};
const playerId = name => aliases[name] || slug(name);
const sourceUrl = id => `https://www.statmuse.com/fc/match/${id}`;
const makePlayers = (rows, starters) => rows.map(([player, rating, minutes, goals, assists, shotsOnTarget, expectedGoals, shots]) => ({
  playerId: playerId(player), player, starter: starters.includes(player), minutes, rating, goals, assists, shotsOnTarget, expectedGoals, shots
}));
const foulStats = {"FIO":[["David De Gea",0,1],["Radu Drăgușin",1,1],["Marin Pongračić",3,0],["Rolando Mandragora",0,1],["Nicolò Fagioli",0,0],["Marco Brescianini",1,0],["Alejandro Jiménez",1,1],["Albert Guðmundsson",2,1],["Arthur Atta",1,1],["Cher Ndour",0,1],["Mateo Pellegrino",1,4],["Victor Valdepeñas",0,2],["João Mário Lopes",0,2],["Franco Mastantuono",1,2],["Viery",2,0],["Christ Inao Oulaï",1,4]],"FRO":[["Florian Grillitsch",2,0],["Giacomo Calò",1,2],["Alessio Zerbin",1,1],["Aleksa Terzić",0,0],["Ilario Monterisi",3,1],["Antonio Raimondo",2,1],["Giorgio Cittadini",1,0],["Seydou Fini",0,1],["Giorgi Kvernadze",1,1],["Anthony Oyono",1,4],["Lorenzo Palmisani",0,1],["Patrizio Masini",2,1],["Romano Schmid",2,1],["Gabriele Calvani",1,0],["Gabriele Bracaglia",3,0],["Daniel Bîrligea",1,0]],"MON":[["Patrick Cutrone",2,3],["Omari Forson",0,0],["Michael Folorunsho",1,4],["Filippo Delli Carri",2,0],["Andrea Colpani",0,1],["Demba Thiam",0,0],["Andrea Carboni",1,0],["Ebenezer Akinsanmiro",1,1],["Samuele Birindelli",0,0],["Dany Mota",0,0],["Eddy Kouadio",0,0],["Lorenzo Lucchesi",1,0],["Ricardo Mangas",1,1],["Gustavo Varela",1,0],["Mathis Mout",0,1],["Manga Foe Ondoa",0,0]],"UDI":[["Keinan Davis",0,0],["Hassane Kamara",1,0],["Unai Gómez",1,1],["Oier Zarraga",0,1],["Maduka Okoye",0,1],["Jurgen Ekkelenkamp",1,2],["Mërgim Vojvoda",0,0],["Enzo Ebossé",1,0],["James Abankwah",3,1],["Nicolò Bertola",0,0],["Oumar Solet",0,1],["Jesper Karlström",0,1],["Jakub Piotrowski",1,0],["Idrissa Guèye",0,2],["Lennon Miller",4,0],["Juan Arizala",0,0]],"SAS":[["Arijanet Muric",0,1],["Nemanja Matić",2,0],["Rafel Obrador",0,1],["Domenico Berardi",0,1],["Cristian Volpato",1,1],["Armand Lauriente",0,1],["Kristian Thorstvedt",0,0],["Josh Doig",1,0],["Luca Lipani",0,0],["Vasilije Adžić",2,0],["Benjamín Domínguez",0,2],["Jay Idzes",1,1],["Darryl Bakola",2,0],["Fedde Leysen",0,0],["Simone Cinquegrano",1,0],["Kieron Bowie",2,1]],"TOR":[["Ché Adams",1,0],["Nikola Vlašić",2,0],["Saúl Coco",1,0],["Eray Cömert",0,2],["Duván Zapata",0,0],["Emirhan İlkhan",0,0],["Gvidas Gineitis",1,3],["Ardian Ismajli",0,0],["Pietro Comuzzo",1,0],["Niccolò Fortini",0,0],["Giovanni Simeone",0,1],["Zakaria Aboukhlal",2,0],["Alessio Cacciamani",1,3],["Sandro Kulenović",0,0],["Kian Fitz-Jim",0,3],["Diego Mascardi",0,0]],"JUV":[["Douglas Luiz",4,2],["Jérémie Boga",0,0],["Lloyd Kelly",1,0],["Guglielmo Vicario",0,0],["Randal Kolo Muani",6,3],["Kerim Alajbegović",0,0],["Nicolás González",0,2],["Manuel Locatelli",5,2],["Bremer",2,0],["Pierre Kalulu",0,2],["Teun Koopmeiners",0,0],["Zeki Çelik",0,0],["Andrea Cambiaso",0,0],["Jhon Lucumí",1,0],["Francisco Conceição",4,1],["Jonathan David",0,0]],"PAR":[["Adrián Bernabé",1,3],["El Bilal Touré",2,1],["Enrico Delprato",0,1],["Edoardo Corvi",0,0],["Emanuele Valeri",1,0],["Pontus Almqvist",0,0],["Mandela Keita",0,3],["Christian Ordoñez",1,1],["Mariano Troilo",1,2],["Sascha Britschgi",0,1],["Ben Cremaschi",1,1],["Abdou-Salam Konaté",2,0],["Dominik Drobnič",2,0],["Nesta Elphege",1,0],["Simone Lontani",0,3],["José Romero",0,2]]};
const statOverlay = (rows, team) => {
  const fouls = new Map((foulStats[team] || []).map(([name, committed, won]) => [name, [committed, won]]));
  return rows.map(([name,,,,, shotsOnTarget,, shots]) => [name, shots, shotsOnTarget, ...(fouls.get(name) || [null, null])]);
};
const sub = (team, minute, playerIn, playerOut) => ({ team, minute, playerIn, playerInId: playerId(playerIn), playerOut, playerOutId: playerId(playerOut) });
const booking = (team, player, minute) => ({ team, playerId: playerId(player), player, minute, card: "yellow" });
const scorer = (team, player, minute, assist = null) => ({ team, playerId: playerId(player), player, minute, assistPlayerId: assist ? playerId(assist) : null, assist });
const teamStats = values => ({
  possessionPct: values[0], expectedGoals: values[1], expectedAssists: values[2], shots: values[3], shotsOnTarget: values[4], shotsOffTarget: values[5], shotsBlocked: values[6], hitWoodwork: values[7], bigChancesMissed: values[8], corners: values[9],
  passesCompleted: values[10], passesAttempted: values[11], passAccuracyPct: values[12], keyPasses: values[13], tackles: values[14], tacklesWon: values[15], interceptions: values[16], clearances: values[17], recoveries: values[18], fouls: values[19], yellowCards: values[20], secondYellowCards: 0, straightRedCards: values[21], penaltiesFor: 0, penaltiesAgainst: 0, duelsWon: values[22], aerialsWon: values[23], goalkeeperSaves: values[24]
});

const games = [
  {
    matchId: "fiorentina-frosinone-2026-27-md-02", url: sourceUrl("8-29-2026-fio-vs-fro-112089"), score: [0, 3], half: [0, 2], weather: 28, formations: ["4-3-3", "4-2-3-1"],
    mvp: ["frosinone", "Antonio Raimondo"],
    starters: {
      home: ["David De Gea", "Victor Valdepeñas", "Marin Pongračić", "Radu Drăgușin", "Alejandro Jiménez", "Arthur Atta", "Christ Inao Oulaï", "Cher Ndour", "Albert Guðmundsson", "Mateo Pellegrino", "Franco Mastantuono"],
      away: ["Lorenzo Palmisani", "Gabriele Bracaglia", "Ilario Monterisi", "Gabriele Calvani", "Anthony Oyono", "Giacomo Calò", "Patrizio Masini", "Giorgi Kvernadze", "Romano Schmid", "Seydou Fini", "Antonio Raimondo"]
    },
    players: {
      home: [["David De Gea",5.5,90,0,0,null,null,null],["Christ Inao Oulaï",7.6,70,0,0,0,0,0],["João Mário Lopes",7.1,7,0,0,0,0,0],["Cher Ndour",7,60,0,0,0,.07,2],["Rolando Mandragora",6.9,20,0,0,1,.03,1],["Marco Brescianini",6.9,20,0,0,0,0,0],["Viery",6.5,30,0,0,0,0,0],["Nicolò Fagioli",6.3,30,0,0,0,.06,1],["Marin Pongračić",6.3,60,0,0,0,0,0],["Albert Guðmundsson",6.3,70,0,0,1,.26,4],["Alejandro Jiménez",6.3,83,0,0,0,.02,1],["Radu Drăgușin",6.2,90,0,0,0,0,0],["Victor Valdepeñas",6.1,90,0,0,0,.25,1],["Arthur Atta",5.6,90,0,0,1,.42,5],["Mateo Pellegrino",4.9,90,0,0,0,.36,3],["Franco Mastantuono",4.8,90,0,0,1,.43,7]],
      away: [["Lorenzo Palmisani",7.6,90,0,0,null,null,null],["Antonio Raimondo",9.5,88,2,0,2,.37,2],["Giacomo Calò",8.6,81,0,1,0,0,0],["Giorgi Kvernadze",7.8,90,0,1,0,.06,2],["Gabriele Bracaglia",7.6,73,1,1,2,.17,2],["Seydou Fini",7.1,45,0,0,0,.15,1],["Aleksa Terzić",6.7,17,0,0,0,0,0],["Giorgio Cittadini",6.7,17,0,0,0,.07,1],["Gabriele Calvani",6.7,73,0,0,0,0,0],["Anthony Oyono",6.6,90,0,0,1,.11,2],["Patrizio Masini",6.6,90,0,0,0,.09,0],["Daniel Bîrligea",6.6,2,0,0,0,0,0],["Alessio Zerbin",6.3,45,0,0,0,0,0],["Ilario Monterisi",6.2,90,0,0,1,.15,2],["Florian Grillitsch",5.9,9,0,0,0,0,0],["Romano Schmid",5.6,90,0,0,0,0,0]]
    },
    stats: { home: [60,1.90,1.67,25,4,21,8,2,1,8,356,424,84,19,15,10,8,28,45,14,3,0,62,14,3], away: [40,1.17,.96,12,6,6,3,0,0,5,206,277,74,9,29,18,12,37,58,21,3,0,66,8,4] },
    scorers: [scorer("frosinone","Antonio Raimondo",26,"Giorgi Kvernadze"),scorer("frosinone","Gabriele Bracaglia",38,"Giacomo Calò"),scorer("frosinone","Antonio Raimondo",68,"Gabriele Bracaglia")],
    bookings: [booking("frosinone","Antonio Raimondo",8),booking("frosinone","Gabriele Bracaglia",24),booking("fiorentina","Alejandro Jiménez",24),booking("frosinone","Gabriele Calvani",45),booking("fiorentina","Albert Guðmundsson",49),booking("fiorentina","Radu Drăgușin",90)],
    substitutions: [sub("frosinone",45,"Alessio Zerbin","Seydou Fini"),sub("fiorentina",61,"Nicolò Fagioli","Cher Ndour"),sub("fiorentina",61,"Viery","Marin Pongračić"),sub("fiorentina",71,"Rolando Mandragora","Albert Guðmundsson"),sub("fiorentina",71,"Marco Brescianini","Christ Inao Oulaï"),sub("frosinone",74,"Aleksa Terzić","Gabriele Bracaglia"),sub("frosinone",74,"Giorgio Cittadini","Gabriele Calvani"),sub("frosinone",82,"Florian Grillitsch","Giacomo Calò"),sub("fiorentina",84,"João Mário Lopes","Alejandro Jiménez"),sub("frosinone",89,"Daniel Bîrligea","Antonio Raimondo")]
  },
  {
    matchId: "monza-udinese-2026-27-md-02", url: sourceUrl("8-29-2026-mon-vs-udi-112096"), score: [2,3], half: [1,3], weather: null, formations: ["3-4-2-1","3-4-2-1"], mvp: ["udinese","Hassane Kamara"],
    starters: { home: ["Demba Thiam","Andrea Carboni","Lorenzo Lucchesi","Eddy Kouadio","Samuele Birindelli","Mathis Mout","Manga Foe Ondoa","Ricardo Mangas","Andrea Colpani","Patrick Cutrone","Gustavo Varela"], away: ["Maduka Okoye","James Abankwah","Oumar Solet","Enzo Ebossé","Hassane Kamara","Jesper Karlström","Jakub Piotrowski","Mërgim Vojvoda","Jurgen Ekkelenkamp","Unai Gómez","Keinan Davis"] },
    players: {
      home: [["Demba Thiam",5.3,90,0,0,null,null,null],["Gustavo Varela",8.1,90,1,0,1,.29,3],["Ebenezer Akinsanmiro",7.9,37,0,1,0,0,0],["Michael Folorunsho",7.5,37,0,0,0,.07,2],["Andrea Colpani",7.5,83,1,0,1,.4,2],["Ricardo Mangas",7.3,90,0,1,0,0,0],["Filippo Delli Carri",7,30,0,0,0,0,0],["Manga Foe Ondoa",6.9,53,0,0,1,.06,2],["Omari Forson",6.9,7,0,0,0,0,0],["Lorenzo Lucchesi",6.6,60,0,0,0,0,0],["Eddy Kouadio",6.4,90,0,0,0,0,0],["Patrick Cutrone",6.4,90,0,0,0,.39,2],["Samuele Birindelli",6.3,83,0,0,1,.03,1],["Dany Mota",6,7,0,0,0,.02,1],["Andrea Carboni",6,90,0,0,1,.4,2],["Mathis Mout",5.5,53,0,0,0,0,0]],
      away: [["Maduka Okoye",6.8,90,0,0,null,null,null],["Hassane Kamara",9,90,1,1,1,.02,1],["Jurgen Ekkelenkamp",8.6,90,1,0,2,.23,3],["Jakub Piotrowski",8.1,59,1,0,1,.39,3],["Oier Zarraga",6.8,31,0,0,0,0,0],["Oumar Solet",6.7,90,0,0,0,0,0],["Juan Arizala",6.7,6,0,0,0,0,0],["Mërgim Vojvoda",6.5,84,0,0,0,0,0],["Enzo Ebossé",6.5,67,0,0,0,0,0],["Nicolò Bertola",6.5,23,0,0,0,0,0],["James Abankwah",6.3,90,0,0,0,0,0],["Jesper Karlström",6,90,0,0,0,0,0],["Unai Gómez",5.9,59,0,0,1,.15,2],["Idrissa Guèye",5.8,23,0,0,0,.05,1],["Keinan Davis",5.7,67,0,0,0,.06,2],["Lennon Miller",5.7,31,0,0,0,0,0]]
    },
    stats: { home: [51,1.66,1.32,15,5,10,4,0,1,3,351,426,82,12,12,5,12,26,52,10,1,0,40,14,2], away: [49,.90,.51,12,5,7,4,0,0,3,340,421,81,8,10,7,6,41,50,12,0,0,40,15,3] },
    scorers: [scorer("udinese","Jakub Piotrowski",32),scorer("monza","Andrea Colpani",37,"Ricardo Mangas"),scorer("udinese","Hassane Kamara",45),scorer("udinese","Jurgen Ekkelenkamp",45),scorer("monza","Gustavo Varela",63,"Ebenezer Akinsanmiro")],
    bookings: [booking("monza","Lorenzo Lucchesi",46)],
    substitutions: [sub("monza",54,"Michael Folorunsho","Manga Foe Ondoa"),sub("monza",54,"Ebenezer Akinsanmiro","Mathis Mout"),sub("udinese",60,"Lennon Miller","Jakub Piotrowski"),sub("udinese",60,"Oier Zarraga","Unai Gómez"),sub("monza",61,"Filippo Delli Carri","Lorenzo Lucchesi"),sub("udinese",68,"Idrissa Guèye","Keinan Davis"),sub("udinese",68,"Nicolò Bertola","Enzo Ebossé"),sub("monza",84,"Omari Forson","Samuele Birindelli"),sub("monza",84,"Dany Mota","Andrea Colpani"),sub("udinese",85,"Juan Arizala","Mërgim Vojvoda")]
  },
  {
    matchId: "sassuolo-torino-2026-27-md-02", url: sourceUrl("8-30-2026-sas-vs-tor-112094"), score: [2,1], half: [1,1], weather: 27, formations: ["4-3-3","5-3-2"], mvp: ["sassuolo","Domenico Berardi"],
    starters: { home: ["Arijanet Muric","Josh Doig","Fedde Leysen","Jay Idzes","Simone Cinquegrano","Darryl Bakola","Nemanja Matić","Vasilije Adžić","Armand Lauriente","Kieron Bowie","Cristian Volpato"], away: ["Diego Mascardi","Alessio Cacciamani","Eray Cömert","Saúl Coco","Pietro Comuzzo","Niccolò Fortini","Nikola Vlašić","Kian Fitz-Jim","Gvidas Gineitis","Ché Adams","Giovanni Simeone"] },
    players: {
      home: [["Arijanet Muric",7.3,90,0,0,null,null,null],["Cristian Volpato",9.5,59,1,0,2,.15,3],["Domenico Berardi",8.8,19,1,0,1,.07,1],["Darryl Bakola",7.7,90,0,0,0,0,0],["Simone Cinquegrano",7.4,90,0,0,1,.21,2],["Vasilije Adžić",7.2,59,0,1,0,.02,1],["Jay Idzes",7.1,90,0,0,0,0,0],["Kristian Thorstvedt",7.1,31,0,0,0,.02,1],["Rafel Obrador",7.1,30,0,0,0,0,0],["Nemanja Matić",7,89,0,0,0,.02,1],["Josh Doig",6.8,60,0,0,0,0,0],["Luca Lipani",6.7,1,0,0,0,0,0],["Fedde Leysen",6.7,90,0,1,0,0,0],["Benjamín Domínguez",6.7,31,0,0,0,0,0],["Armand Lauriente",6.1,90,0,0,2,.49,7],["Kieron Bowie",5.6,71,0,0,1,.86,3]],
      away: [["Diego Mascardi",6.9,90,0,0,null,null,null],["Alessio Cacciamani",7.9,90,0,1,0,.08,1],["Pietro Comuzzo",7.8,90,1,0,1,.07,1],["Saúl Coco",7.2,90,0,0,1,.26,1],["Kian Fitz-Jim",7.2,90,0,0,0,.02,1],["Eray Cömert",7,66,0,0,0,.18,0],["Nikola Vlašić",7,90,0,0,1,.25,2],["Niccolò Fortini",6.9,72,0,0,0,0,0],["Duván Zapata",6.7,8,0,0,0,0,0],["Ardian Ismajli",6.7,24,0,0,0,0,0],["Zakaria Aboukhlal",6.6,18,0,0,0,.03,1],["Emirhan İlkhan",6.5,24,0,0,0,0,0],["Sandro Kulenović",6.5,18,0,0,0,0,0],["Ché Adams",6.3,82,0,0,1,.38,1],["Giovanni Simeone",5.9,72,0,0,0,.1,1],["Gvidas Gineitis",5.9,66,0,0,0,.08,1]]
    },
    stats: { home: [46,1.84,.99,19,7,12,6,1,1,4,390,440,89,16,9,5,3,19,43,12,3,0,36,12,3], away: [54,1.45,1.42,10,4,6,3,0,3,3,481,533,90,6,17,11,2,27,41,9,1,0,49,6,5] },
    scorers: [scorer("sassuolo","Cristian Volpato",32,"Vasilije Adžić"),scorer("torino","Pietro Comuzzo",45,"Alessio Cacciamani"),scorer("sassuolo","Domenico Berardi",78,"Fedde Leysen")],
    bookings: [booking("torino","Gvidas Gineitis",23),booking("sassuolo","Nemanja Matić",40),booking("sassuolo","Cristian Volpato",47),booking("sassuolo","Armand Lauriente",70)],
    substitutions: [sub("sassuolo",60,"Kristian Thorstvedt","Vasilije Adžić"),sub("sassuolo",60,"Benjamín Domínguez","Cristian Volpato"),sub("sassuolo",61,"Rafel Obrador","Josh Doig"),sub("torino",67,"Emirhan İlkhan","Gvidas Gineitis"),sub("torino",67,"Ardian Ismajli","Eray Cömert"),sub("sassuolo",72,"Domenico Berardi","Kieron Bowie"),sub("torino",73,"Sandro Kulenović","Giovanni Simeone"),sub("torino",73,"Zakaria Aboukhlal","Niccolò Fortini"),sub("torino",83,"Duván Zapata","Ché Adams"),sub("sassuolo",90,"Luca Lipani","Nemanja Matić")]
  },
  {
    matchId: "juventus-parma-2026-27-md-02", url: sourceUrl("8-29-2026-juv-vs-par-112087"), score: [2,0], half: [0,0], weather: 24, formations: ["4-4-2","4-4-2"], mvp: ["juventus","Nicolás González"],
    starters: { home: ["Guglielmo Vicario","Zeki Çelik","Jhon Lucumí","Bremer","Pierre Kalulu","Jérémie Boga","Douglas Luiz","Manuel Locatelli","Francisco Conceição","Jonathan David","Randal Kolo Muani"], away: ["Edoardo Corvi","Emanuele Valeri","Dominik Drobnič","Mariano Troilo","Enrico Delprato","Mandela Keita","Adrián Bernabé","Christian Ordoñez","Sascha Britschgi","El Bilal Touré","Simone Lontani"] },
    players: {
      home: [["Guglielmo Vicario",7.6,90,0,0,null,null,null],["Nicolás González",9.6,34,1,0,2,.11,4],["Manuel Locatelli",8.8,90,0,1,0,0,0],["Teun Koopmeiners",8.4,5,1,0,1,.05,1],["Francisco Conceição",8.2,75,0,0,0,.07,2],["Pierre Kalulu",8.1,90,0,0,0,0,0],["Douglas Luiz",7.5,90,0,0,2,.27,6],["Jérémie Boga",7,56,0,0,0,0,0],["Zeki Çelik",6.9,90,0,0,0,0,0],["Jhon Lucumí",6.8,74,0,0,0,.08,1],["Andrea Cambiaso",6.8,10,0,0,0,0,0],["Bremer",6.8,90,0,0,0,.1,1],["Kerim Alajbegović",6.5,34,0,0,0,0,0],["Lloyd Kelly",6.1,16,0,0,0,0,0],["Jonathan David",5.8,56,0,0,0,.09,2],["Randal Kolo Muani",5.3,90,0,0,1,.92,4]],
      away: [["Edoardo Corvi",6.3,90,0,0,null,null,null],["Adrián Bernabé",7.4,79,0,0,0,0,0],["Enrico Delprato",7.3,90,0,0,0,0,0],["Pontus Almqvist",6.8,7,0,0,0,0,0],["José Romero",6.8,29,0,0,3,.16,3],["Mariano Troilo",6.8,90,0,0,0,0,0],["Mandela Keita",6.6,90,0,0,0,0,0],["Dominik Drobnič",6.5,90,0,0,0,0,0],["Nesta Elphege",6.5,11,0,0,0,0,0],["Emanuele Valeri",6.3,90,0,0,0,0,0],["Simone Lontani",6.2,61,0,0,0,0,0],["Christian Ordoñez",6.2,60,0,0,0,.06,1],["Ben Cremaschi",6.1,30,0,0,0,0,0],["El Bilal Touré",6.1,79,0,0,0,0,0],["Abdou-Salam Konaté",5.8,11,0,0,0,0,0],["Sascha Britschgi",5.6,83,0,0,0,0,0]]
    },
    stats: { home: [58,1.69,1.68,21,6,15,3,2,2,10,488,544,90,13,16,12,11,14,42,23,2,0,46,12,3], away: [42,.22,.26,4,3,1,0,0,0,2,345,408,85,5,10,6,10,27,35,12,3,0,40,9,4] },
    scorers: [scorer("juventus","Nicolás González",62),scorer("juventus","Teun Koopmeiners",88,"Manuel Locatelli")],
    bookings: [booking("juventus","Jhon Lucumí",10),booking("juventus","Manuel Locatelli",54),booking("parma","Enrico Delprato",55),booking("parma","Mariano Troilo",78),booking("parma","Abdou-Salam Konaté",90)],
    substitutions: [sub("juventus",57,"Kerim Alajbegović","Jérémie Boga"),sub("juventus",57,"Nicolás González","Jonathan David"),sub("parma",61,"Ben Cremaschi","Christian Ordoñez"),sub("parma",62,"José Romero","Simone Lontani"),sub("juventus",75,"Lloyd Kelly","Jhon Lucumí"),sub("juventus",76,"Andrea Cambiaso","Francisco Conceição"),sub("parma",80,"Nesta Elphege","El Bilal Touré"),sub("parma",80,"Abdou-Salam Konaté","Adrián Bernabé"),sub("parma",84,"Pontus Almqvist","Sascha Britschgi"),sub("juventus",86,"Teun Koopmeiners","Andrea Cambiaso")],
    didNotPlay: { home: [{ playerId: "weston-mckennie", player: "Weston McKennie" }], away: [] }
  }
];

results.retrievedAt = "2026-08-30";
const mvpSource = results.sources.find(item => item.sourceType === "official-player-of-the-match");
if (mvpSource) mvpSource.retrievedAt = "2026-08-30";
for (const game of games) {
  if (!results.sources.some(item => item.url === game.url)) results.sources.push({ provider: "StatMuse", sourceType: "match-report-stats", url: game.url, retrievedAt: "2026-08-30" });
  const result = {
    matchId: game.matchId, status: "finished", score: { home: game.score[0], away: game.score[1] }, halfTimeScore: { home: game.half[0], away: game.half[1] }, attendance: null, weatherCelsius: game.weather,
    formations: { home: game.formations[0], away: game.formations[1] }, scorers: game.scorers, bookings: game.bookings, substitutions: game.substitutions,
    didNotPlay: game.didNotPlay || { home: [], away: [] }, teamStats: { home: teamStats(game.stats.home), away: teamStats(game.stats.away) },
    playerStats: { home: makePlayers(game.players.home, game.starters.home), away: makePlayers(game.players.away, game.starters.away) },
    mvp: { team: game.mvp[0], playerId: playerId(game.mvp[1]), player: game.mvp[1], sourceUrl: mvpSource.url }, sourceUrl: game.url
  };
  const index = results.matches.findIndex(item => item.matchId === game.matchId);
  if (index >= 0) results.matches[index] = result; else results.matches.push(result);

  const overlay = [game.url, game.mvp[0] === "fiorentina" ? "FIO" : game.matchId.split("-")[0].slice(0,3).toUpperCase(), [], "", []];
  const abbreviations = { "fiorentina-frosinone-2026-27-md-02": ["FIO","FRO"], "monza-udinese-2026-27-md-02": ["MON","UDI"], "sassuolo-torino-2026-27-md-02": ["SAS","TOR"], "juventus-parma-2026-27-md-02": ["JUV","PAR"] }[game.matchId];
  overlay[1] = abbreviations[0]; overlay[3] = abbreviations[1];
  overlay[2] = statOverlay(game.players.home, abbreviations[0]); overlay[4] = statOverlay(game.players.away, abbreviations[1]);
  const overlayIndex = playerStats.matches.findIndex(item => item[0] === game.url);
  if (overlayIndex >= 0) playerStats.matches[overlayIndex] = overlay; else playerStats.matches.push(overlay);
}
playerStats.updatedAt = "2026-08-30";

fs.writeFileSync(resultsPath, `${JSON.stringify(results, null, 2)}\n`);
fs.writeFileSync(playerStatsPath, `${JSON.stringify(playerStats)}\n`);
console.log(`Aggiornati ${games.length} risultati finali del 29 agosto 2026.`);
