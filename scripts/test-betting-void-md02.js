"use strict";

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));

(async () => {
  const { settleLeg } = await import("../js/pages/betting-settlement.mjs");
  const matches = read("data/normalized/matches.json");
  const schedina = read("data/normalized/schedina-md02.json");
  const match = matches.find(item => item.id === "juventus-parma-2026-27-md-02");
  const leg = schedina.slips.flatMap(item => item.legs).find(item => item.matchId === match.id && item.player === "Weston McKennie");
  assert(match?.didNotPlay?.home?.some(item => item.player === "Weston McKennie"), "McKennie deve risultare non impiegato");
  assert(leg, "Quota McKennie assente dalla schedina MD2");
  assert.deepStrictEqual(settleLeg(leg, match), { status: "void", label: "Annullata" });
  const finishedIds = new Set(["fiorentina-frosinone-2026-27-md-02", "monza-udinese-2026-27-md-02", "sassuolo-torino-2026-27-md-02", "juventus-parma-2026-27-md-02"]);
  const matchById = new Map(matches.map(item => [item.id, item]));
  const settlements = schedina.slips.flatMap(item => item.legs).filter(item => finishedIds.has(item.matchId)).map(item => settleLeg(item, matchById.get(item.matchId)).status);
  assert(settlements.every(status => ["won", "lost", "void"].includes(status)), "Le quote delle quattro gare concluse devono essere tutte liquidate");
  const counts = Object.fromEntries(["won", "lost", "void"].map(status => [status, settlements.filter(item => item === status).length]));
  assert.strictEqual(counts.void, 1, "Deve esserci una sola quota annullata nelle gare del 29 agosto");
  console.log(`Liquidazione 29 agosto valida: ${counts.won} esatte, ${counts.lost} sbagliate, ${counts.void} annullata.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
