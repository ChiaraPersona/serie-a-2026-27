import assert from "node:assert/strict";
import fs from "node:fs";
import {lineupPositions, renderLineupField} from "../js/components/lineup-field.mjs";
import {fixtureLineupForMatch} from "../js/pages/readings.js";

const directory = JSON.parse(fs.readFileSync(new URL("../data/teams/index.json", import.meta.url)));
const matches = JSON.parse(fs.readFileSync(new URL("../data/normalized/matches.json", import.meta.url)));
for (const id of ["milan-atalanta-2026-27-md-07", "bologna-inter-2026-27-md-07", "atalanta-sassuolo-2026-27-md-01"]) {
  const match = matches.find(item => item.id === id);
  const sides = [match.homeTeam, match.awayTeam].map(id => {
    const team = directory.teams.find(item => item.id === id);
    return {team, lineup: fixtureLineupForMatch(match, team, directory)};
  });
  const snapshot = JSON.stringify(sides);
  sides.forEach(({lineup}, side) => {
    const positions = lineupPositions(lineup, side === 1);
    assert.equal(positions.length, 11, `${id}: eleven per team`);
    assert.deepEqual(positions.map(player => player.name), lineup.players, `${id}: preserve order`);
    assert.equal(positions.filter(player => player.goalkeeper).length, 1);
    assert(positions.every(player => side ? player.x > 50 : player.x < 50));
    const opposite = lineupPositions(lineup, side === 0);
    positions.forEach((player, index) => {
      assert.equal(player.x + opposite[index].x, 100);
      assert(Math.abs(player.y + opposite[index].y - 100) < 1e-9);
    });
    // At the minimum 1040px pitch width, each 94x75 player area is distinct.
    positions.forEach((player, index) => positions.slice(index + 1).forEach(other => {
      assert(Math.abs(player.x - other.x) * 10.4 >= 94 || Math.abs(player.y - other.y) * (1040 / 1080 * 6) >= 75, `${id}: player collision`);
    }));
  });
  const html = renderLineupField(sides);
  assert.equal((html.match(/class="reading-kit-shirt"/g) || []).length, 22);
  assert.equal(renderLineupField(sides, {orientation: "horizontal"}).replace(/lineup-kit-\d+/g, 'kit'), html.replace(/lineup-kit-\d+/g, 'kit'));
  for (const side of sides) {
    const vertical = renderLineupField([side], {orientation: "vertical"});
    assert.equal((vertical.match(/class="reading-kit-shirt"/g) || []).length, 11);
    assert(vertical.includes('data-orientation="vertical"'));
    assert.equal((vertical.match(/is-goalkeeper/g) || []).length, 1);
  }
  assert.equal(JSON.stringify(sides), snapshot, `${id}: no source mutation`);
}
console.log("OK horizontal lineups: 3 fixtures, 22 players, mirrored positions, spacing and unchanged source data.");
