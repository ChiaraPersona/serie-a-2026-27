import {bookingTacticalCopy,bookingAverageCopy} from './booking-tactical-copy.mjs';
import {esc,number,finite} from './format.mjs?v=20261022-assets-v1';

// Display only the ranking already attached to this fixture; never derive a new one.
export function bookingsMarkup(model,evidence){
 const candidates=model.prediction?.likelyBooked||[];
 const identified=evidence.lineups.filter(l=>['official','probable'].includes(l.status));
 const rows=candidates.filter(p=>!identified.length||identified.some(l=>l.players.some(q=>q.id&&q.id===p.playerId)));
 const hypothesis=model.prediction?.bookingHypothesis;
 const notice=hypothesis?`<p class="rd-footnote" data-booking-hypothesis>${hypothesis.status==='OFFICIAL_LINEUP_HYPOTHESIS'?`Ipotesi preliminari sui titolari ufficiali. Minuti effettivi non certi. ${hypothesis.refereeName?`Arbitro: ${esc(hypothesis.refereeName)}; fattore neutro nel ranking.`:'Contesto arbitrale N/D.'}`:'Ipotesi preliminari sugli ultimi undici di riferimento. Titolarità, disponibilità e minuti da riconfermare.'} Nessuna selezione operativa.</p>`:'';
 return `<section class="prediction-booked-panel" data-reading-bookings data-booking-tactical-copy>${rows.length?`${notice}<p class="rd-footnote">Indice comparativo, non probabilità di ammonizione.</p><ol>${rows.map(p=>`<li><span>${esc(p.rank??'—')}</span><div><strong>${esc(p.name||'N/D')}</strong><small>${esc(p.team||'')} · ${esc(p.role||'Ruolo N/D')}</small><small class="booking-averages">${esc(bookingAverageCopy(p))}</small><em>${esc(bookingTacticalCopy(p,evidence.lineups))}</em></div><b>${finite(p.riskScore)?number(p.riskScore,0)+'/100':'N/D'}</b></li>`).join('')}</ol>`:'<p class="prediction-v2-empty">Candidati ammonizione N/D</p><p class="rd-footnote">Ranking individuale non disponibile per questa partita.</p>'}</section>`;
}
