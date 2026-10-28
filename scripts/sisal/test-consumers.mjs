import { readJsonFile as storageReadJson } from './dataset-store.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { normalizeSisalCapture } from './normalize.js';
import { createBetSelection } from '../betting-selection-contract.js';
import { createPersonalBetslipStore } from '../../js/pages/personal-betslip-store.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = file => storageReadJson(new URL(`../../${file}`, import.meta.url));
const rawFile = 'data/raw/odds/sisal/serie-a/2026-10-15T17-42-11-541Z.json.gz';
const dataset = normalizeSisalCapture({
  capture: JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(`../../${rawFile}`, import.meta.url)))),
  competitionKey: 'serie-a', competition: read('data/sources/sisal-odds.json').competitions['serie-a'], rawFile, root,
});
const context = { competition: 'serie-a', season: '2026-27', matchday: 7 };
const now = () => dataset.retrievedAt;
const legacy = value => JSON.parse(JSON.stringify(value, (key, entry) => ['originalIdentifiers', 'identifierProvenance'].includes(key) ? undefined : entry));

for (const ids of [
  ['5374643143', '5374622790', '5374652624'], // Traditional multiple
  ['5379608122', '5379608479', '5374622790'], // Same-event MyCombo, including DUO
]) {
  function simulate(withIdentifiers) {
    const values = new Map();
    const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
    const store = createPersonalBetslipStore({ storage, now });
    store.setContext(context);
    const rows = ids.map(id => {
      const event = dataset.events.find(event => event.markets.some(market => market.selections.some(selection => selection.providerSelectionId === id)));
      let market = event.markets.find(market => market.selections.some(selection => selection.providerSelectionId === id));
      let selection = market.selections.find(selection => selection.providerSelectionId === id);
      if (!withIdentifiers) { market = legacy(market); selection = legacy(selection); }
      const betSelection = createBetSelection({
        provider: 'sisal', matchId: event.canonicalMatchId, matchday: 7, marketObject: market, selectionObject: selection,
        verifiedAt: dataset.retrievedAt, quoteSource: dataset,
      });
      return { selectionId: betSelection.selectionId, context, fixture: event.name, label: `${market.variantName}: ${selection.name}`, market: market.marketName, betSelection };
    });
    const result = store.addMany(rows);
    const eligible=rows.filter(row=>globalThis.officialStarterPolicy.eligible(row));
    assert(eligible.length>0, 'fixture di test senza selezioni ammissibili');
    assert.equal(result.added, eligible.length);
    assert.equal(result.added + (result.rejected?.length||0), rows.length);
    assert.equal(store.addMany(rows).duplicates, eligible.length, 'stable IDs must still deduplicate');
    const beforeReload = store.getSnapshot();
    const restored = createPersonalBetslipStore({ storage, now }).getSnapshot();
    assert.equal(restored.selections.length, eligible.length);
    assert.deepEqual(restored.assessment, beforeReload.assessment);
    return { rows, result, restored };
  }
  assert.deepEqual(simulate(true), simulate(false), 'original identifiers must not change prices, combinability, MyCombo addition, deduplication or saved slips');
}
console.log('OK Sisal consumer regression: real multiple/MyCombo/DUO, addMany, deduplication, assessment and saved-slip reload unchanged');
