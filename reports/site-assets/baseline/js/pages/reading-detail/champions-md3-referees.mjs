import {createReadingView} from './view-model.mjs';
import {heroMarkup} from './shell.mjs?v=20261019-md3-referees-v1';
import {esc} from './format.mjs';
import {whistle} from './referee-dashboard.mjs';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const fmt=v=>finite(v)?v.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
export function md3RefereeMarkup(fixture,profile,branding){
 const team=name=>{const b=branding.get(name);return {name,id:b?.id,logo:b?.logo};};
 const model=createReadingView({competition:'champions',fixture:{...fixture,id:fixture.id},home:team(fixture.homeTeam),away:team(fixture.awayTeam)});
 const sample=profile?.sample,metrics=profile?.metrics||{};
 const label=sample?.scope==='historical_UCL_provider_cards'?'Champions League · campione storico':sample?.scope==='mixed_2025-26_2026-27_league'?'Campionato nazionale non specificato · 2025/26–2026/27':'Campione statistico non disponibile';
 const values=[['yellowCardsPerMatch','Gialli',8,'yellow'],['redCardsPerMatch','Rossi',1,'red'],['foulsPerMatch','Falli',40,'green'],['providerCardsPerMatch','Cartellini',10,'blue']];
 const indicators=values.map(([key,title,scale,color])=>{const v=metrics[key],max=Math.max(scale,finite(v)?v:0);return `<div class="rf-indicator rf-${color}" data-referee-metric="${key}"><strong>${fmt(v)}</strong><span>${title} / partita</span><div class="rf-bar" role="img" aria-label="${title}: ${fmt(v)}"><i style="width:${finite(v)?v/max*100:0}%"></i></div><small>${finite(v)?`Campione ${sample?.scope==='historical_UCL_provider_cards'?'storico Champions':'nazionale misto'} · n=${sample.matches}`:'Dato non disponibile'}</small></div>`;}).join('');
 return `<div class="rd-shell" data-reading-fixture="${esc(fixture.id)}">${heroMarkup(model)}<section class="rd-section" id="lettura-disciplina"><header class="rd-section-heading"><span class="rd-section-number">01</span><h2>Disciplina e profilo arbitrale</h2></header><div class="rd-section-content"><aside class="reading-referee-assignment rf-panel" data-referee-id="${esc(fixture.refereeAssignment.refereeId)}"><div class="rf-dashboard" aria-label="Designazione arbitrale"><h3 class="rf-heading">Designazione arbitrale</h3><section class="rf-card rf-designation"><div class="rf-identity">${whistle}<div><span class="rf-label">Arbitro</span><h3>${esc(fixture.refereeAssignment.referee.name)}</h3><p class="rf-season">${esc(label)}${finite(sample?.matches)?` · n=${sample.matches}`:''}</p></div></div></section><section class="rf-card rf-indicators" aria-label="Medie descrittive · campioni separati">${indicators}</section><p class="rf-note">${sample?.scope?'Periodo di riferimento non certificato. Medie descrittive, escluse dai pronostici.':'Statistiche arbitrali non disponibili.'}</p></div></aside></div></section></div>`;
}
