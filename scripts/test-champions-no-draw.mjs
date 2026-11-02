import fs from 'node:fs';
import assert from 'node:assert/strict';
import {isExcludedStraightDraw,isPublishedForecast} from '../js/pages/shared-forecast-contract.mjs';
import {createPersonalBetslipStore,PERSONAL_BETSLIP_STORAGE_KEY} from '../js/pages/personal-betslip-store.mjs';
const read=p=>JSON.parse(fs.readFileSync(p));
const old=read('data/technical-archive/champions-md04/recalculations/2026-11-02-before-no-draw-policy.json');
const current=read('data/normalized/schedina-champions-md04.json');
let replaced=0;
for(const m of current.marketCatalog.matches){
 const previous=old.marketCatalog.matches.find(x=>x.matchId===m.matchId);
 const selected=m.selections.filter(l=>l.suggestionAnalysis?.suggested&&l.marketScope==='match');
 assert(selected.every(l=>['1','2','1X','X2'].includes(l.selection)));
 assert(!m.selections.filter(l=>l.suggestionAnalysis?.suggested).some(isExcludedStraightDraw));
 const playerContracts=rows=>rows.filter(l=>l.marketScope==='player').map(l=>{const c=structuredClone(l);delete c.suggestionAnalysis.rank;return c;});
 assert(JSON.stringify(playerContracts(m.selections))===JSON.stringify(playerContracts(previous.selections)),'Player contracts/projections changed beyond display rank');
 for(const l of m.selections){const before=previous.selections.find(x=>x.selectionId===l.selectionId);assert.deepEqual(l.betSelection.quote,before.betSelection.quote);assert.deepEqual(l.betSelection.evaluation,before.betSelection.evaluation);}
 if(previous.selections.some(l=>l.suggestionAnalysis?.suggested&&isExcludedStraightDraw(l))){assert.equal(selected.length,1);replaced++;}
}
assert.equal(replaced,4);
const draw=old.marketCatalog.matches.flatMap(m=>m.selections).find(l=>l.suggestionAnalysis?.suggested&&isExcludedStraightDraw(l));
assert(!isPublishedForecast(draw));
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const context={competition:'champions',season:'2026-27',matchday:4};
const allowed=current.marketCatalog.matches[0].selections.find(l=>l.suggestionAnalysis?.suggested&&l.marketScope==='match');
let store=createPersonalBetslipStore({storage});store.setContext(context);
assert.equal(store.add(draw).status,'STRAIGHT_DRAW_EXCLUDED');
assert.equal(store.add(allowed).status,'ADDED');
const saved=JSON.parse(memory.get(PERSONAL_BETSLIP_STORAGE_KEY));saved.contexts[saved.activeContext].selections=[draw];memory.set(PERSONAL_BETSLIP_STORAGE_KEY,JSON.stringify(saved));
store=createPersonalBetslipStore({storage});store.setContext(context);assert.equal(store.getSnapshot().selections.length,0,'Saved straight draw must be excluded');
assert(!isExcludedStraightDraw({...draw,context:{competition:'serie-a',season:'2026-27',matchday:10},matchId:'test-md-10',betSelection:{...draw.betSelection,identity:{...draw.betSelection.identity,matchId:'test-md-10'}}}),'Unrelated competition changed');
console.log('OK: 4 straight draws replaced via existing ranking; exact quote/evaluation and player contracts preserved; saved draw excluded.');
