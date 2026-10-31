const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {readJsonFile} = require('../../scripts/sisal/dataset-store.cjs');
const dataset = readJsonFile('data/normalized/odds/sisal/serie-a.json');
const fixtures = require('../../data/normalized/matches.json').filter(m => m.competition === 'serie-a' && m.season === '2026-27' && m.matchday === 10);
const baseline = require('./baseline.json');
for (const old of baseline) {
  const event = dataset.events.find(e => e.canonicalMatchId === old.id);
  assert(event, `Evento precedente perso: ${old.id}`);
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex'), old.sha256, `Evento precedente modificato: ${old.id}`);
}
const events = fixtures.map(fixture => {
  const matches = dataset.events.filter(e => e.canonicalMatchId === fixture.id);
  assert.equal(matches.length, 1, `Copertura non univoca: ${fixture.id}`);
  const event = matches[0];
  assert(event.markets.length > 0);
  assert(event.retrievedAt.startsWith('2026-10-31'));
  const raw = JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(event.rawFile)));
  assert(raw.pages.every(p => p.renderedOdds > 0), `Pagina senza quote: ${fixture.id}`);
  return {id: fixture.id, name: event.name, retrievedAt: event.retrievedAt, markets: event.markets.length, playerMarkets: event.markets.filter(m => m.marketScope === 'player').length, selections: event.markets.reduce((n,m) => n+m.selections.length,0), rawFile: event.rawFile};
});
assert.equal(events.length,10);
const report = {matchday:10, competition:'serie-a', preservedPreviousEvents:baseline.length, events:events.length, markets:events.reduce((n,e)=>n+e.markets,0), selections:events.reduce((n,e)=>n+e.selections,0), playerMarkets:events.reduce((n,e)=>n+e.playerMarkets,0), fixtures:events};
fs.writeFileSync('output/sisal-md10-2026-10-31/report.json', JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
