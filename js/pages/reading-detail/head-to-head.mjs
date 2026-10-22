import {esc,number,missing} from './format.mjs?v=20261022-assets-v1';
const name=team=>typeof team==='string'?team:team?.name||'Squadra N/D';
const key=m=>String(m.providerFixtureId||m.id||[m.date,name(m.homeTeam),name(m.awayTeam),m.competition].join('|'));
const pair=(a,b)=>[String(a),String(b)].sort().join('|');

// A view over the existing archives: no import, recalculation or data mutation.
export function selectHistoryRows(model,history,archives=null){
 let candidates=history?.previousMeetings||history?.recentMatches||[];
 if(model.competition==='champions'&&archives){
  const home=archives.teams.teams.find(t=>t.team===model.home.name)?.uefaTeamId;
  const away=archives.teams.teams.find(t=>t.team===model.away.name)?.uefaTeamId;
  if(home&&away){
   const wanted=pair(home,away),official=[...archives.older.matches,...archives.current.matches].filter(m=>m.status==='finished'&&pair(m.homeTeam.id,m.awayTeam.id)===wanted);
   const detailed=archives.details.pairs.find(p=>pair(...p.teamIds)===wanted)?.matches||[];
   const merged=new Map(official.map(m=>[key(m),{...m}]));
   for(const m of [...candidates,...detailed]){
    const original=merged.get(key(m));
    merged.set(key(m),{...original,...m,homeTeam:original?.homeTeam||m.homeTeam,awayTeam:original?.awayTeam||m.awayTeam});
   }
   candidates=[...merged.values()];
  }
 }
 const seen=new Set();
 // Undated future fixtures retain their curated historical archive, without inventing a kickoff date.
 return candidates.filter(m=>m.date&&(!model.fixture.date||m.date.slice(0,10)<model.fixture.date)).sort((a,b)=>b.date.localeCompare(a.date)).filter(m=>{const id=key(m);if(seen.has(id))return false;seen.add(id);return true;}).slice(0,5).map(raw=>({id:key(raw),date:raw.date.slice(0,10),competition:raw.competition||'Competizione N/D',home:name(raw.homeTeam),away:name(raw.awayTeam),score:raw.score||raw.scoreTotal||raw.score90,raw}));
}

let championsArchives;
export async function loadHistoryRows(model,evidence,read){
 const history=evidence.analysis.history;
 if(model.competition!=='champions')return selectHistoryRows(model,history);
 championsArchives??=Promise.all([
  read('data/sources/champions-team-history-map-2026-27.json'),read('data/sources/champions-head-to-head-details-2026-27.json'),
  read('data/sources/uefa-head-to-head-history-2020-23.json'),read('data/normalized/uefa-europe-history-2023-26.json')
 ]).then(([teams,details,older,current])=>({teams,details,older,current})).catch(error=>{championsArchives=null;throw error;});
 try{return selectHistoryRows(model,history,await championsArchives);}catch{return selectHistoryRows(model,history);}
}

export function cardKind(event){
 const type=String(event.type?.type||event.type||event.kind||'').toLowerCase();
 const note=[event.note,event.text].filter(Boolean).join(' ');
 if(event.secondYellow===true||/second[-_ ]yellow|yellow[-_ ]red|yellowredcard|seconda ammonizione|doppia ammonizione/i.test(type+' '+note))return 'second-yellow';
 if(/straight[-_ ]red|direct[-_ ]red|rosso diretto/i.test(type+' '+note))return 'direct-red';
 if(/red[-_ ]card|redcard|espuls/i.test(type))return 'dismissal';
 return 'yellow';
}
export function disciplineEvents(match){
 const yellow=[],red=[],seen=new Set();
 for(const [events,redContainer] of [[match.bookings,false],[match.dismissals,true],[match.redCards,true]]){
  if(!Array.isArray(events))continue;
  for(const e of events){
   const kind=cardKind(e),dismissed=redContainer||kind!=='yellow';
   const id=e.id||e.eventId||[e.playerId||e.player,e.teamId||e.team,e.minute,dismissed?'red':'yellow'].join('|');
   if(seen.has(id))continue;seen.add(id);(dismissed?red:yellow).push({event:e,kind:dismissed&&kind==='yellow'?'dismissal':kind});
  }
 }
 return {yellow,red};
}
const minute=v=>v===null||v===undefined||v===''?'minuto N/D':`${String(v).replace(/['′’]+$/,'')}′`;
function eventsMarkup(events,emptyText){
 if(!events.length)return `<p class="rd-h2h-empty">${esc(emptyText)}</p>`;
 return `<ul>${events.map(({event:e,kind})=>`<li><div><strong>${esc(e.player||'Giocatore N/D')}</strong><small>${esc(e.team||'Squadra N/D')}${e.ownGoal?' · autogol':''}${e.penalty?' · rigore':''}${kind==='second-yellow'?' · doppia ammonizione':kind==='direct-red'?' · rosso diretto':kind==='dismissal'?' · espulsione (tipo N/D)':''}${e.note?` · ${esc(e.note)}`:''}</small></div><time>${esc(minute(e.minute))}</time></li>`).join('')}</ul>`;
}
export function historyMarkup(rows){
 if(!rows.length)return missing('Precedenti verificati non disponibili per questa coppia.');
 return `<p class="rd-h2h-count">${rows.length} scontri diretti disponibili${rows.length<5?' · campione storico limitato':''}</p><ol class="rd-h2h-timeline">${rows.map((row,index)=>{
  const m=row.raw,cards=disciplineEvents(m),gaps=m.coverage?.missingFields||[];
  const goalsKnown=Array.isArray(m.goals)&&!gaps.includes('goalEvents');
  const noGoals=goalsKnown&&row.score?.home===0&&row.score?.away===0;
  const yellowKnown=Array.isArray(m.bookings)&&!gaps.includes('bookingEvents');
  const redKnown=Array.isArray(m.dismissals)||Array.isArray(m.redCards)||m.redCards===0;
  const date=new Date(row.date+'T12:00:00Z').toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Rome'});
  return `<li><details class="rd-h2h-meeting${index===0?' is-latest':''}" data-h2h-id="${esc(row.id)}" data-h2h-date="${esc(row.date)}"><summary><span class="rd-h2h-meta"><time datetime="${esc(row.date)}">${esc(date)}</time><span>${esc(row.competition)}</span>${index===0?'<small>Più recente</small>':''}<i class="rd-h2h-toggle" aria-hidden="true"></i></span><span class="rd-h2h-scoreline"><span class="rd-h2h-home">${esc(row.home)}</span><b>${number(row.score?.home,0)}<i>–</i>${number(row.score?.away,0)}</b><span class="rd-h2h-away">${esc(row.away)}</span></span></summary><div class="rd-h2h-events"><section data-h2h-event-group="goals"><h3>Marcatori</h3>${eventsMarkup((m.goals||[]).map(event=>({event})) ,noGoals?'Nessun gol':'Dettaglio marcatori N/D')}</section><section data-h2h-event-group="yellow"><h3>Ammoniti</h3>${eventsMarkup(cards.yellow,yellowKnown?'Nessun ammonito registrato':'Dettaglio ammoniti N/D')}${gaps.includes('bookingEvents')&&cards.yellow.length?'<p class="rd-h2h-empty">Dettaglio nominativo parziale.</p>':''}</section><section data-h2h-event-group="red"><h3>Espulsioni</h3>${eventsMarkup(cards.red,redKnown?'Nessuna espulsione registrata':'Dettaglio espulsioni N/D')}</section></div></details></li>`;
 }).join('')}</ol>`;
}
