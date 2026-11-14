"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const officialPath = path.join(root, "data", "sources", "official-lineups-2026-27.json");
const capturedPath = path.join(root, "output", "reports", "_tmp-two-official-predictions.json");
const originalRead = fs.readFileSync.bind(fs);
const originalWrite = fs.writeFileSync.bind(fs);

const fixtures = [
  {
    matchId: "lazio-monza-2026-27-md-06",
    label: "Lazio - Monza",
    provider: "S.S. Lazio + distinte Diretta.it fornite dall'utente",
    sourceUrl: "https://www.sslazio.it/it/news/match-report/serie-a-enilive-or-lazio-monza-le-formazioni-ufficiali-a",
    retrievedAt: "2026-10-11T13:35:00+02:00",
    matchday: 6,
    date: "2026-10-11",
    kickoff: "15:00",
    teams: [
      {
        team: "Lazio", teamId: "lazio", formation: "4-3-3", coach: "Gennaro Gattuso",
        players: ["Christos Mandas", "Nuno Tavares", "Oliver Provstgaard", "Danilho Doekhi", "Romano Floriani", "Kenneth Taylor", "Reda Belahyane", "Davide Frattesi", "Mattia Zaccagni", "Tijjani Noslin", "Gustav Isaksen"].map(currentName => ({ sourceName: currentName, currentName }))
      },
      {
        team: "Monza", teamId: "monza", formation: "3-4-2-1", coach: "Ivan Juric",
        players: ["Noel Törnqvist", "Eddy Kouadio", "Lorenzo Lucchesi", "Andrea Carboni", "Samuele Birindelli", "Cyril Ngonge", "Ebenezer Akinsanmiro", "Ricardo Mangas", "Michael Folorunsho", "Zeballos", "Gustavo Varela"].map(currentName => ({ sourceName: currentName, currentName }))
      }
    ]
  },
  {
    matchId: "lecce-bologna-2026-27-md-06",
    label: "Lecce - Bologna",
    provider: "Distinte Diretta.it fornite dall'utente + convocati prepartita verificati",
    sourceUrl: "https://www.diretta.it/partita/calcio/bologna-0M9xNN8N/lecce-G8lYsMgU/riassunto/formazioni/?mid=C61PNRvH",
    retrievedAt: "2026-10-11T13:35:00+02:00",
    matchday: 6,
    date: "2026-10-11",
    kickoff: "15:00",
    teams: [
      {
        team: "Lecce", teamId: "lecce", formation: "4-3-3", coach: "Eusebio Di Francesco",
        players: ["Wladimiro Falcone", "Danilo Veiga", "Tiago Gabriel", "Jamil Siebert", "Antonino Gallo", "Lassana Coulibaly", "Ivan Ilic", "Youssef Maleh", "Santiago Pierotti", "Paco Esteban", "Amar Fatah"].map(currentName => ({ sourceName: currentName, currentName }))
      },
      {
        team: "Bologna", teamId: "bologna", formation: "3-4-2-1", coach: "Raffaele Palladino",
        players: ["Massimo Pessina", "Nicolo Casale", "Nadir Zortea", "Torbjørn Heggem", "Matteo Darmian", "Lewis Ferguson", "Tommaso Pobega", "Juan Miranda", "Riccardo Orsolini", "Nicolò Cambiaghi", "Roberto Piccoli"].map(currentName => ({ sourceName: currentName, currentName }))
      }
    ]
  }
];

fs.readFileSync = function patchedRead(file, ...args) {
  if (path.resolve(String(file)) !== officialPath) return originalRead(file, ...args);
  const payload = JSON.parse(originalRead(file, ...args));
  const ids = new Set(fixtures.map(fixture => fixture.matchId));
  payload.fixtures = [...payload.fixtures.filter(fixture => !ids.has(fixture.matchId)), ...fixtures];
  return JSON.stringify(payload);
};

fs.writeFileSync = function patchedWrite(file, data, ...args) {
  const resolved = path.resolve(String(file));
  if (resolved.endsWith(path.join("data", "generated", "prediction-preview-md06-2026-27.json"))) {
    return originalWrite(capturedPath, data, ...args);
  }
  return originalWrite(file, data, ...args);
};

process.env.SERIE_A_PREDICTION_PREVIEW_MATCHDAY = "6";
require("./build-predictions.js");
