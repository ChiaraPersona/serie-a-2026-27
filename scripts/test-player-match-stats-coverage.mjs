import fs from "node:fs";
import assert from "node:assert/strict";

const matches = JSON.parse(fs.readFileSync(new URL("../data/normalized/matches.json", import.meta.url), "utf8"));
const finished = matches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.status === "finished");
const fields = ["minutes", "goals", "assists", "shots", "shotsOnTarget", "expectedGoals", "foulsCommitted", "foulsWon"];
let playerRows = 0;
let coveredMatches = 0;

assert.equal(finished.length, 50, "Numero di partite concluse inatteso");
for (const match of finished) {
  if (match.resultCoverage?.playerStats === "unavailable") {
    assert.equal(match.playerStats?.home?.length, 0, `${match.id}: dati home N/D non vuoti`);
    assert.equal(match.playerStats?.away?.length, 0, `${match.id}: dati away N/D non vuoti`);
    continue;
  }
  coveredMatches += 1;
  for (const side of ["home", "away"]) {
    const rows = match.playerStats?.[side] || [];
    assert(rows.length >= 11, `${match.id} ${side}: tabellino individuale incompleto`);
    playerRows += rows.length;
    for (const row of rows) for (const field of fields) {
      assert(Number.isFinite(row[field]), `${match.id} ${row.player}: ${field} mancante`);
    }
    const sum = field => rows.reduce((total, row) => total + row[field], 0);
    assert.equal(sum("shots"), match.teamStats[side].shots, `${match.id} ${side}: tiri non riconciliati`);
    assert.equal(sum("shotsOnTarget"), match.teamStats[side].shotsOnTarget, `${match.id} ${side}: tiri in porta non riconciliati`);
    if (Number.isFinite(match.teamStats[side].fouls)) assert.equal(sum("foulsCommitted"), match.teamStats[side].fouls, `${match.id} ${side}: falli non riconciliati`);
  }
}

assert.equal(coveredMatches, 50, "Numero di partite con copertura individuale inatteso");
assert.equal(playerRows, 1590, "Numero di righe calciatore-partita inatteso");
console.log(`Copertura individuale completa: ${coveredMatches}/${finished.length} partite, ${playerRows} righe, ${fields.length} metriche senza N/D.`);
