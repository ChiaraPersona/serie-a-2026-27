import {settleMd3Leg as settleLeg} from './champions-md3-results.mjs?v=20261022-assets-v1';
// Reuse shared settlement; forecasts and unfinished scores never settle a leg.
export function settleMd3(data,calendar){
 const fixtures=new Map(calendar.fixtures.map(f=>[f.id,f]));
 return {...data,slips:data.slips.map(slip=>({...slip,legs:slip.legs.map(leg=>{
  const match=fixtures.get(leg.fixtureId);
  return {...leg,settlement:match?.status==='finished'?settleLeg(leg,match):{status:'pending',label:'Da giocare'}};
 })}))};
}
export function approvedMd3Markup(data,esc){
 return `<section class="betting-slip betting-slip--champions" data-cl3-approved><header><h2>7 esiti preliminari approvati</h2></header><p>Singole indipendenti · simulazione di 1 € per esito verificato. La combinabilità non è verificata. Nessuna multipla automatica.</p><ol>${data.slips.flatMap(s=>s.legs).map(leg=>`<li class="betting-leg--${esc(leg.settlement.status)}" data-settlement="${esc(leg.settlement.status)}" data-approved-selection="${esc(leg.selectionId)}"><div><strong>${esc(leg.fixture)}</strong><span>${esc(leg.label)}</span><span class="betting-leg-result">${esc(leg.settlement.label)}</span></div><b>${leg.odds.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}</b></li>`).join('')}</ol></section>`;
}
