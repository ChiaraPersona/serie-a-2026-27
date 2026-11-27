import {lineupPositions} from '../../components/lineup-field.mjs?v=20261022-assets-v1';

export function bookingAverageCopy(player){
 const sample=player.cardResearchFeatures?.currentDisciplinarySample;
 const format=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}):'N/D';
 const valid=sample&&sample.playerId===player.playerId&&sample.minutes>0&&sample.appearances>0&&sample.minutesCoverage>=sample.appearances;
 const fouls=valid&&sample.foulsCommittedCoverage>=sample.appearances?sample.foulsCommittedPer90:null;
 const yellows=valid&&sample.disciplinaryCoverage?.status==='COMPLETE'?sample.yellowPer90:null;
 return `Falli / 90′: ${format(fouls)} · Gialli / 90′: ${format(yellows)}`;
}

// Exact player IDs identify the starter; mirrored formation slots suggest opponents.
// These are editorial hypotheses, never model inputs or verified man-marking assignments.
export function probableBookingOpponents(player,lineups=[]){
 const ownIndex=lineups.findIndex(l=>['probable','official'].includes(l.status)&&l.players.some(p=>p.id&&p.id===player.playerId));
 if(ownIndex<0)return [];
 const own=lineups[ownIndex],other=lineups[1-ownIndex];
 if(!other||!['probable','official'].includes(other.status))return [];
 const positions=lineupPositions(own),slot=positions.find(p=>p.name.id===player.playerId);
 const opponents=lineupPositions(other,true).filter(p=>!p.goalkeeper&&p.name.id);
 if(!slot||slot.goalkeeper||!opponents.length)return [];
 const lastOwn=Math.max(...positions.map(p=>p.line)),lastOther=Math.max(...opponents.map(p=>p.line));
 const targetLine=Math.max(1,lastOther+1-slot.line*lastOther/lastOwn);
 const ranked=opponents.map(p=>({p,distance:Math.abs(p.line-targetLine)*24+Math.abs(p.y-slot.y)})).sort((a,b)=>a.distance-b.distance);
 return ranked.filter(p=>p.distance<=ranked[0].distance+10).slice(0,2).map(({p})=>p.name.name);
}
// Editorial hypotheses from serialized role and matchup; never alter ranking inputs.
export function bookingTacticalCopy(player,lineups=[]){
 const role=String(player.detailedRole||player.role||'').toLowerCase();
 const evidence=Array.isArray(player.evidence)?player.evidence:[];
 const channel=evidence.find(v=>typeof v==='string'&&/^duelli sul canale (destro|sinistro|centrale)$/.test(v));
 const zone=channel?.endsWith('destro')?'sul lato destro':channel?.endsWith('sinistro')?'sul lato sinistro':channel?'nelle zone interne':'';
 const projected=probableBookingOpponents(player,lineups);
 if(projected.length)return `Potrebbe affrontare ${projected.join(' e ')} nella sua zona.`;
 const opponents=(player.readingDuels||[]).map(p=>p.name).filter(Boolean);
 if(!opponents.length&&player.directOpponent&&player.role!=='Difensore')opponents.push(player.directOpponent);
 if(opponents.length)return `Potrebbe essere chiamato a contenere ${opponents.join(' e ')}${zone?' '+zone:''}: il rischio da osservare è un intervento in ritardo quando il duello si apre in velocità.`;
 if(/terzino|esterno|ala/.test(role))return `Potrebbe esporsi al fallo nei ripiegamenti ${zone||'sulla fascia'}, soprattutto se costretto a inseguire dopo una perdita di palla.`;
 if(/punta|attaccante/.test(role))return `Il rischio tattico è soprattutto nel primo pressing${zone?' '+zone:''}: un'uscita in ritardo potrebbe portarlo a fermare la ripartenza avversaria.`;
 if(/mediano|centrocampista|mezzala/.test(role))return `Potrebbe dover interrompere le ripartenze ${zone||'a centrocampo'}: attenzione agli interventi di copertura quando la prima pressione viene superata.`;
 if(/difensore|centrale/.test(role))return `Potrebbe essere chiamato a proteggere la profondità ${zone||'in difesa'}: il rischio è arrivare in ritardo se l'avversario riceve e si gira verso la porta.`;
 return 'Il rischio tattico da osservare è il fallo di copertura dopo una perdita di palla; il compito preciso dipenderà dalla posizione effettiva in campo.';
}
