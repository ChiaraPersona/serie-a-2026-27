import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPage } from '../js/pages/champions.js';
const load = async name => JSON.parse(fs.readFileSync(new URL(`../data/normalized/${name}`, import.meta.url), 'utf8'));
const calendar = await load('champions-league-2026-27.json');
const markets = await load('champions-player-markets-md01-2026-27.json');
const app = { innerHTML: '' };
globalThis.document = { querySelector: () => app };
for (const [id, names, excluded] of [
  ['ucl-2026-27-md01-07', ['Christensen', 'Nacho', 'Zechiel'], /Gabriel Jesus|Gordon|Steijn|Targhalline/i],
  ['ucl-2026-27-md01-08', ['Bredlow', 'Promel', 'Moi'], /Karazor|Vagnoman|Botheim|Postema/i],
  ['ucl-2026-27-md01-01', ['Brignoli', 'Koita', 'Tornich'], /Gacinovic|Strakosha|Alemão/i],
  ['ucl-2026-27-md01-02', ['Virgili', 'Maatsen', 'Hemmings'], /Diakhon|Ruggeri|Garnacho/i],
  ['ucl-2026-27-md01-03', ['Sabitzer', 'Veerman', 'Oluwaseyi'], /Bellingham|Nwaneri|Moleiro|Moreno|Pépé/i],
  ['ucl-2026-27-md01-06', ['Dumfries', 'Diouf', 'Jones'], /Akanji|Luis Henrique|Sučić|Diomande/i],
  ['ucl-2026-27-md01-04', ['Varela', 'Bouaddi'], /Anderson|Hwang/i],
  ['ucl-2026-27-md01-05', ['Perrin', 'Ueda', 'Bellerin', 'Isco'], /Giroud|Sahraoui|Ortiz|\bRoca\b/i]
]) {
  const lineup = calendar.fixtures.find(f => f.id === id).probableFormation;
  assert.equal(lineup.status, 'official');
  assert.equal(lineup.editorialProjection.status, 'editorial-probable');
  for (const side of ['home', 'away']) assert.equal(lineup[side].players.length, 11);
  const market = markets.fixtures.find(f => f.fixtureId === id);
  assert(!excluded.test(JSON.stringify([market.shooters, market.likelyBooked, market.combinations])));
  globalThis.location = { search: `?match=${id}` };
  await createPage({ load, esc: value => String(value ?? '') }).render();
  assert(app.innerHTML.includes('Formazioni ufficiali'));
  for (const name of names) assert(app.innerHTML.includes(name));
  assert(app.innerHTML.includes('Panchina:'));
}
assert.equal(calendar.fixtures[8].probableFormation.status, 'editorial-probable');
console.log('OK ufficiali Champions: precedenza, panchine escluse, rendering, altre gare preservate');
