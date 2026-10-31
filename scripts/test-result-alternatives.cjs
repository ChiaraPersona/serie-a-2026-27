const assert=require('node:assert/strict');
const {chooseSuggestions}=require('./md06-suggested-forecasts');
const catalog=require('../data/normalized/reading-md10-market-catalog.json').marketCatalog;
function chosen(matchId){
  const match=catalog.matches.find(m=>m.matchId===matchId);
  const selections=match.selections.filter(l=>/^(1x2|double-chance):/.test(l.betSelection?.compatibility?.modelTarget||''));
  return chooseSuggestions({selections},'probability-first',{resultChoice:'verified-price-prudent-probability'}).accepted.map(l=>l.selection);
}
assert.deepEqual(chosen('lazio-cagliari-2026-27-md-10'),['1X'],'A qualified double chance must beat a worse priced win');
assert.deepEqual(chosen('frosinone-torino-2026-27-md-10'),['1'],'A better priced win must remain eligible');
assert.deepEqual(chosen('udinese-roma-2026-27-md-10'),['X2'],'Away double chance must also remain eligible');
const lazio=catalog.matches.find(m=>m.matchId==='lazio-cagliari-2026-27-md-10');
const alternatives=lazio.selections.filter(l=>/^(1x2|double-chance):/.test(l.betSelection?.compatibility?.modelTarget||''));
assert.deepEqual(chooseSuggestions({selections:alternatives}).accepted.map(l=>l.selection),['1'],'Legacy archive policy must remain unchanged');
const invalid=structuredClone(alternatives);
invalid.find(l=>l.selection==='1X').betSelection.quote.verifiedAt=null;
assert(!chooseSuggestions({selections:invalid},'probability-first',{resultChoice:'verified-price-prudent-probability'}).accepted.some(l=>l.selection==='1X'),'Unverified double chance must not be admitted');
console.log('OK: 1X, X2 e vittoria semplice competono su quota verificata e probabilità prudente, senza inserimenti obbligatori.');
