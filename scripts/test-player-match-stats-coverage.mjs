import fs from "node:fs";
import assert from "node:assert/strict";

const matches = JSON.parse(fs.readFileSync(new URL("../data/normalized/matches.json", import.meta.url), "utf8"));
const finished = matches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && match.status === "finished");
const fields = ["minutes", "rating", "goals", "assists", "shots", "shotsOnTarget", "expectedGoals", "foulsCommitted", "foulsWon"];
let playerRows = 0;

assert.equal(finished.length, 24, "Numero di partite concluse inatteso");
for (const match of finished) {
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
    assert.equal(sum("foulsCommitted"), match.teamStats[side].fouls, `${match.id} ${side}: falli non riconciliati`);
  }
}

assert.equal(playerRows, 766, "Numero di righe calciatore-partita inatteso");
console.log(`Copertura individuale completa: ${finished.length} partite, ${playerRows} righe, ${fields.length} metriche senza N/D.`);
