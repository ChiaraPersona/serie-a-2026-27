import {imageSource} from '../core/image-source.mjs?v=20261022-assets-v1';
import {loadXgotStatistics,withXgotLeaderboards} from '../components/xgot-statistics.mjs?v=20261106-xgot';
export function createPage(deps){
  const {esc,hero,playerRoleLabel,loadTeamDirectory}=deps;
  const statisticsHeading=(title,description)=>hero("",title,"").replace('</h1>',`</h1><p class="statistics-subtitle">${esc(description)}</p>`);
  const loadPlayerLeaderboards=async()=>{const [data,xgot]=await Promise.all([deps.loadPlayerLeaderboards(),loadXgotStatistics()]);return withXgotLeaderboards(data,xgot)};
const teamDirectoryGrid=(data,standings)=>`<section class="team-directory-grid team-flip-grid" aria-label="Le 20 squadre">${data.teams.map(team=>{const current=standings.find(row=>row.team===team.id),logo=String(team.monochromeLogo||team.logo||"").replace(/^\.\.\//,""),[primary="#174fa5",secondary="#081d48"]=team.colors||[];return `<a class="team-directory-card team-flip-card" href="statistiche-squadra/${team.id}.html" style="--team-primary:${primary};--team-secondary:${secondary}" aria-label="${esc(team.name)}: apri rosa e statistiche"><span class="team-flip-inner"><span class="team-flip-face team-flip-front"><img src="${imageSource(`${esc(logo)}`)}" alt=""></span><span class="team-flip-face team-flip-back"><strong>${esc(team.name)}</strong><span>${current?`${standings.indexOf(current)+1}ª posizione · ${current.points} punti`:"Posizione N/D · Punti N/D"}</span><span>${esc(team.stadium||"Stadio N/D")}</span><span>Allenatore: ${esc(team.coach||"N/D")}</span><span>Modulo: ${esc(team.preferredFormation||"N/D")}</span><b>Apri scheda</b></span></span></a>`}).join("")}</section>`;
let directory;
const badge=id=>{const team=directory.teams.find(t=>t.id===id);return team?`<img class="player-team-badge" src="${imageSource(`${esc(String(team.logo||team.monochromeLogo||" ").replace(/^\.\.\//,""))}`)}" alt="">`:""};
const globalLeaderboardValue=value=>Number.isInteger(value)?String(value):Number(value).toFixed(2);
const rankingPlayerName=name=>{const parts=String(name||"").trim().split(/\s+/);return parts.length>1?`${Array.from(parts[0])[0]}. ${parts.slice(1).join(" ")}`:parts[0]};
function rankingRoleCategory(role){
  if(role==="Portiere")return "goalkeepers";
  if(/^(Difensore|Terzino)/.test(role||""))return "defenders";
  if(/^(Centrocampista|Mediano|Regista|Trequartista|Esterno destro|Esterno sinistro)/.test(role||""))return "midfielders";
  if(/^(Attaccante|Centravanti|Punta|Seconda punta|Ala|Esterno offensivo)/.test(role||""))return "forwards";
  return null;
}
function globalPlayerLeaderboardTable(data,periodId,metricId,filters={},sort={key:"goals",mode:"total",direction:"desc"}){
  const period=data.periods?.[periodId],metric=period?.rankings?.[metricId];
  const normalize=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("it");
  const rows=(data.comparator.periods[periodId]||[]).filter(p=>(!filters.name||normalize(p.name).includes(normalize(filters.name)))&&(!filters.team||p.currentTeamId===filters.team)&&(!filters.role||rankingRoleCategory(p.role)===filters.role)).sort((a,b)=>{
    const value=p=>sort.mode==="text"?p[sort.key]:sort.mode==="base"?p[sort.key]:(sort.mode==="per90"?p.per90:p.values)?.[sort.key];
    const av=value(a),bv=value(b),valid=v=>sort.mode==="text"?typeof v==="string"&&v.length>0:typeof v==="number"&&Number.isFinite(v);
    if(!valid(av)||!valid(bv))return Number(valid(bv))-Number(valid(av));
    const difference=sort.mode==="text"?av.localeCompare(bv,"it"):av-bv;
    return (sort.direction==="asc"?difference:-difference)||(sort.key==="goals"&&sort.mode==="total"?((b.per90?.goals??b.minutes)??-1)-((a.per90?.goals??a.minutes)??-1):0)||a.name.localeCompare(b.name,"it");
  });
  const ranking=metric?{...metric,availablePlayers:rows.length,players:rows}:null;
  if(!ranking?.players?.length)return `<div class="data-warning"><strong>Classifica ${esc(period?.label||periodId)} non disponibile</strong><p>La statistica selezionata non ha dati individuali verificati sufficienti per questo periodo.</p></div>`;
  const metrics=filters.role==="goalkeepers"?[{field:"goalsConceded",label:"Gol subiti"},{field:"cards",label:"Cartellini"}]:Object.values(period.rankings).filter(metric=>metric.field!=="xgot");
  const sortHeader=(label,key,mode)=>{const active=sort.key===key&&sort.mode===mode;return `<th scope="col" aria-sort="${active?(sort.direction==="asc"?"ascending":"descending"):"none"}"><button type="button" class="ranking-sort" data-ranking-sort="${esc(key)}" data-sort-mode="${mode}">${esc(label)}</button></th>`};
  const valueHeaders=metrics.map(metric=>sortHeader("Tot.",metric.field,"total")+sortHeader("/90",metric.field,"per90")).join("");
  return `<div class="table-wrap squad-table-wrap player-ranking-scroll" role="region" aria-label="Classifica calciatori; scorri orizzontalmente e verticalmente" tabindex="0"><table class="squad-table global-player-table${filters.role==="goalkeepers"?" goalkeeper-ranking-table":""}"><colgroup><col class="ranking-col-rank"><col class="ranking-col-player"><col class="ranking-col-team"><col class="ranking-col-base"><col class="ranking-col-base">${metrics.map(()=>'<col class="ranking-col-stat"><col class="ranking-col-stat">').join("")}</colgroup><thead><tr><th rowspan="2" scope="col">#</th>${sortHeader("CALCIATORE","name","text").replace('<th scope="col"','<th rowspan="2" scope="col"')}${sortHeader("SQUADRA","currentTeam","text").replace('<th scope="col"','<th rowspan="2" scope="col"')}<th colspan="2" scope="colgroup">Presenze</th>${metrics.map(metric=>`<th colspan="2" scope="colgroup">${esc(metric.label)}</th>`).join("")}</tr><tr>${sortHeader("PG","appearances","base")}${sortHeader("Min","minutes","base")}${valueHeaders}</tr></thead><tbody>${ranking.players.map((player,index)=>{const serieB=periodId!=="2026/27"&&player.competition==="Serie B"?'<span class="serie-b-marker" title="Il riepilogo include dati prodotti in Serie B 2025/26">* Serie B</span>':"",valueCells=metrics.map(metric=>{const value=player.values?.[metric.field],rate=player.per90?.[metric.field];return `<td><strong class="global-leader-value">${typeof value==="number"&&Number.isFinite(value)?globalLeaderboardValue(value):"N/D"}</strong></td><td><span class="global-leader-rate">${typeof rate==="number"&&Number.isFinite(rate)?rate.toFixed(2):"N/D"}</span></td>`}).join("");return `<tr><td><span class="global-leader-rank">${index+1}</span></td><td><span class="global-leader-player" title="${esc(player.name)}"><span><strong data-full-name="${esc(player.name)}">${esc(rankingPlayerName(player.name))}</strong>${serieB}</span></span></td><td><span class="player-team">${badge(player.currentTeamId)}${esc(player.currentTeam)}</span></td><td>${player.appearances??"N/D"}</td><td>${player.minutes??"N/D"}</td>${valueCells}</tr>`}).join("")}</tbody></table></div>`;
}
function globalPlayerLeaderboards(data){
  const defaultPeriod="2026/27";
  return `<section class="section global-player-leaders" id="top-15-calciatori"><div class="player-ranking-filters"><label><span class="sr-only">Squadra</span><select data-ranking-team><option value="">Squadra</option>${directory.teams.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")}</select></label><div class="ranking-role-buttons" role="group" aria-label="Filtra per ruolo"><button type="button" class="ranking-role-button" data-ranking-role="goalkeepers" aria-label="Portieri" title="Portieri" aria-pressed="false">P</button><button type="button" class="ranking-role-button" data-ranking-role="defenders" aria-label="Difensori" title="Difensori" aria-pressed="false">D</button><button type="button" class="ranking-role-button" data-ranking-role="midfielders" aria-label="Centrocampisti" title="Centrocampisti" aria-pressed="false">C</button><button type="button" class="ranking-role-button" data-ranking-role="forwards" aria-label="Attaccanti" title="Attaccanti" aria-pressed="false">A</button></div></div><div id="global-player-leaderboard" aria-live="polite">${globalPlayerLeaderboardTable(data,defaultPeriod,"goals")}</div></section>`;
}
function playerComparator(data){
  const playerSearch=(index,label)=>`<label>${label}<span class="player-autocomplete"><input type="search" data-comparator-player="${index}" role="combobox" aria-autocomplete="list" aria-controls="comparator-player-${index}-suggestions" aria-expanded="false" autocomplete="off" placeholder="Scrivi il nome…"><span class="player-suggestions" id="comparator-player-${index}-suggestions" role="listbox" hidden></span></span></label>`;
  return `<section class="section player-comparator comparator-editorial" id="comparatore-calciatori"><header class="player-comparator-heading"><h2>Confronta i giocatori</h2><p class="statistics-subtitle">Scegli due giocatori e confronta il loro rendimento, con valori totali o per 90 minuti.</p></header><div class="team-comparator-toolbar"><div class="team-comparator-options"><div class="comparison-mode" role="group" aria-label="Valori del confronto"><button type="button" data-comparator-mode="total" aria-pressed="true">Valori totali</button><button type="button" data-comparator-mode="per90" aria-pressed="false">Per 90 minuti</button></div></div></div><div class="player-comparator-controls">${playerSearch(0,"Calciatore A")}${playerSearch(1,"Calciatore B")}</div><div class="player-comparator-result" data-comparator-result aria-live="polite"></div></section>`;
}
function comparatorResult(data,periodId,keys,mode="total"){
  const players=data.comparator?.periods?.[periodId]||[],byKey=new Map(players.map(player=>[`${player.currentTeamId}:${player.id}`,player])),chosen=keys.map(key=>byKey.get(key)).filter(Boolean),metrics=[{field:"appearances",label:"Partite giocate",hasPer90:false},...(data.comparator?.metrics||[]).filter(metric=>metric.field!=="xgot")];
  if(chosen.length<2)return `<div class="data-warning"><strong>Seleziona due calciatori</strong><p>Il confronto richiede due profili disponibili nel periodo scelto.</p></div>`;
  const card=player=>`<article><div class="player-comparison-details"><h3>${esc(player.name).replace(/^(\S+)\s+(.+)$/,'$1<span class="comparison-player-surname"> $2</span>')}</h3><p>${esc(player.currentTeam)}</p></div></article>`;
  return `<div class="player-comparator-head">${chosen.map(card).join("")}</div><div class="comparison-bars">${metrics.map(metric=>{const values=chosen.map(p=>mode==="per90"&&metric.hasPer90!==false?p.per90?.[metric.field]:["minutes","appearances"].includes(metric.field)?p[metric.field]:p.values?.[metric.field]),max=Math.max(...values.filter(v=>typeof v==="number"),0),width=v=>typeof v==="number"&&max>0?100*v/max:0;return `<div class="comparison-row"><strong>${values[0]==null?"N/D":globalLeaderboardValue(values[0])}</strong><span class="comparison-track left"><i style="width:${width(values[0])}%"></i></span><span class="comparison-label">${["appearances","minutes"].includes(metric.field)?`<span class="comparison-label-full">${esc(metric.label)}</span><span class="comparison-label-short">${metric.field==="appearances"?"Partite":"Minuti"}</span>`:esc(metric.label)}${mode==="per90"&&metric.hasPer90!==false?" /90":""}</span><span class="comparison-track right"><i style="width:${width(values[1])}%"></i></span><strong>${values[1]==null?"N/D":globalLeaderboardValue(values[1])}</strong></div>`}).join("")}</div>`;
}
  async function render(){
    const page=document.body.dataset.page;
    if(page==="team-stats"&&["#top-15-calciatori","#comparatore-calciatori"].includes(location.hash)){location.replace("statistiche-giocatori.html"+location.hash);return}
    let teamDirectory,playerLeaderboards,summary;
    if(page==="team-stats"&&deps.loadHomeData){summary=await deps.loadHomeData();teamDirectory=summary.directory;}
    else [teamDirectory,playerLeaderboards]=await Promise.all([loadTeamDirectory(),page==="player-stats"?loadPlayerLeaderboards():Promise.resolve(null)]);
    directory=teamDirectory;
    let html="";
  if(page==="team-stats"){const [teams,matches]=summary?[summary.teams,summary.matches]:await Promise.all([deps.load("teams.json"),deps.load("matches.json")]);html=statisticsHeading("Statistiche squadre","Esplora rose, statistiche e rendimento delle 20 squadre.")+teamDirectoryGrid(teamDirectory,calculateStandings(teams,matches));}
  else html=statisticsHeading("Statistiche giocatori","Esplora le classifiche individuali e confronta due giocatori per statistiche totali o per 90 minuti.")+globalPlayerLeaderboards(playerLeaderboards)+playerComparator(playerLeaderboards);
    document.querySelector("#app").innerHTML=html;
  if(page==="player-stats"){const target=document.querySelector("#global-player-leaderboard");let periodId="2026/27",metricId="goals",rankingSort={key:"goals",mode:"total",direction:"desc"};
let rankingFadeFrame,rankingFadeCache,rankingWindow;
const updateRankingWindow=scroll=>{
 const table=scroll.querySelector('table'),tbody=table.tBodies[0];
 if(rankingWindow?.scroll!==scroll||rankingWindow.width!==scroll.clientWidth){
  const rows=rankingWindow?.scroll===scroll?rankingWindow.rows:[...tbody.rows];
  if(rankingWindow?.scroll===scroll){tbody.style.setProperty('--ranking-pad-top','0px');tbody.style.setProperty('--ranking-pad-bottom','0px');tbody.replaceChildren(...rows)}
  const offsets=[0];rows.forEach(row=>offsets.push(offsets.at(-1)+row.getBoundingClientRect().height));
  const height=rows[0]?.getBoundingClientRect().height||44;
  rankingWindow={scroll,table,tbody,rows,height,offsets,width:scroll.clientWidth,start:-1,end:-1};table.setAttribute('aria-rowcount',String(rows.length+2));
  rows.forEach((row,index)=>row.setAttribute('aria-rowindex',String(index+3)));
 }
 const state=rankingWindow,height=state.rows[0]?.getBoundingClientRect().height||state.height;
 state.height=height;
 const start=Math.max(0,Math.floor(Math.max(0,scroll.scrollTop-table.tHead.offsetHeight)/(height*16))*16-8),end=Math.min(state.rows.length,start+Math.ceil(scroll.clientHeight/height)+34);
 if(start===state.start&&end===state.end)return;
 state.start=start;state.end=end;
 tbody.style.setProperty('--ranking-pad-top',state.offsets[start]+'px');tbody.style.setProperty('--ranking-pad-bottom',(state.offsets.at(-1)-state.offsets[end])+'px');
 tbody.replaceChildren(...state.rows.slice(start,end));rankingFadeCache=null;
};
const prepareRankingFade=scroll=>{
 const table=scroll.querySelector('table');
 const rows=[...table.rows];
 rows.forEach(row=>[...row.cells].forEach((cell,index)=>{
  if((row.parentElement.tagName==='TBODY'||row===row.parentElement.firstElementChild)&&index<2)return;
  if(cell.querySelector('.ranking-fading-content'))return;
  const text=document.createElement('span');text.className='ranking-fading-content';text.append(...cell.childNodes);cell.append(text);
 }));
 const origin=table.getBoundingClientRect();
 const measured=rows.map(row=>{
  const rect=row.getBoundingClientRect();
  return {header:row.parentElement.tagName==='THEAD',top:rect.top-origin.top,bottom:rect.bottom-origin.top,cells:[...row.querySelectorAll('.ranking-fading-content')].map(text=>{
   const bounds=text.getBoundingClientRect();return {text,x:bounds.left-origin.left,width:bounds.width};
  })};
 });
 return {scroll,table,rows:measured,active:new Set()};
};
const updateRankingFade=()=>{
 const scroll=target.querySelector('.player-ranking-scroll');if(!scroll)return;
 cancelAnimationFrame(rankingFadeFrame);rankingFadeFrame=requestAnimationFrame(()=>{
  if(!scroll.isConnected)return;
  updateRankingWindow(scroll);
  if(rankingFadeCache?.scroll!==scroll)rankingFadeCache=prepareRankingFade(scroll);
  const cache=rankingFadeCache,bounds=scroll.getBoundingClientRect(),origin=cache.table.getBoundingClientRect(),pinned=scroll.querySelector('tbody tr td:nth-child(2)');
  const left=(pinned?.getBoundingClientRect().right||bounds.left)-origin.left,right=bounds.right-origin.left,top=scroll.scrollTop,bottom=top+scroll.clientHeight,next=new Set();
  cache.rows.forEach(row=>{
   if(!row.header&&(row.bottom<top||row.top>bottom))return;
   row.cells.forEach(({text,x,width})=>{
    if(!((x<left+18&&x+width>left)||(x<right&&x+width>right-16)))return;
    next.add(text);if(cache.left===left&&cache.right===right&&cache.active.has(text))return;text.style.setProperty('--fade-left',(left-x)+'px');text.style.setProperty('--fade-left-end',(left+18-x)+'px');text.style.setProperty('--fade-right-start',(right-16-x)+'px');text.style.setProperty('--fade-right',(right-x)+'px');
    if(!cache.active.has(text))text.classList.add('is-fading');
   });
  });
  cache.active.forEach(text=>{if(!next.has(text))text.classList.remove('is-fading')});cache.active=next;cache.left=left;cache.right=right;
 });
};
const renderRanking=()=>{target.innerHTML=globalPlayerLeaderboardTable(playerLeaderboards,periodId,metricId,{team:document.querySelector('[data-ranking-team]').value,role:(document.querySelector('[data-ranking-role][aria-pressed="true"]')?.dataset.rankingRole||'')},rankingSort);updateRankingFade()};
target.addEventListener('scroll',updateRankingFade,{capture:true,passive:true});
const rankingResize=new ResizeObserver(()=>{rankingFadeCache=null;updateRankingFade()});rankingResize.observe(target);updateRankingFade();
target.addEventListener('click',event=>{const button=event.target.closest('[data-ranking-sort]');if(!button)return;const key=button.dataset.rankingSort,mode=button.dataset.sortMode;rankingSort={key,mode,direction:rankingSort.key===key&&rankingSort.mode===mode?(rankingSort.direction==="desc"?"asc":"desc"):(mode==="text"?"asc":"desc")};const scroll=target.querySelector('.player-ranking-scroll'),left=scroll?.scrollLeft||0;renderRanking();target.querySelector('.player-ranking-scroll')?.scrollTo({left,top:0});target.querySelector(`[data-ranking-sort="${key}"][data-sort-mode="${mode}"]`)?.focus({preventScroll:true})});
document.querySelectorAll('[data-ranking-role]').forEach(button=>button.addEventListener('click',()=>{const selected=button.getAttribute('aria-pressed')!=='true';document.querySelectorAll('[data-ranking-role]').forEach(option=>option.setAttribute('aria-pressed',String(option===button&&selected)));const goalkeeper=selected&&button.dataset.rankingRole==='goalkeepers';if(goalkeeper&&!['name','currentTeam','appearances','minutes','goalsConceded','cards'].includes(rankingSort.key))rankingSort={key:'goalsConceded',mode:'total',direction:'asc'};else if(!goalkeeper&&rankingSort.key==='goalsConceded')rankingSort={key:'goals',mode:'total',direction:'desc'};renderRanking()}));

document.querySelectorAll('[data-ranking-team]').forEach(el=>el.addEventListener('input',renderRanking));const period={value:periodId},selectors=[...document.querySelectorAll("[data-comparator-player]")],result=document.querySelector("[data-comparator-result]"),searchKey=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("it"),playerKey=player=>`${player.currentTeamId}:${player.id}`,playerLabel=player=>`${player.name} · ${player.currentTeam}`,players=()=>playerLeaderboards.comparator.periods[period.value]||[];const refresh=()=>{const controls=document.querySelector(".player-comparator-controls"),mode=document.querySelector(".comparison-mode");controls.insertBefore(mode,selectors[1].closest("label"));result.before(controls);result.innerHTML=comparatorResult(playerLeaderboards,period.value,selectors.map(input=>input.dataset.playerKey||""),mode.querySelector('[aria-pressed="true"]').dataset.comparatorMode);const head=result.querySelector(".player-comparator-head");if(head)head.append(controls);document.querySelector(".team-comparator-toolbar").hidden=true};const closeSuggestions=input=>{const list=input.parentElement.querySelector(".player-suggestions");list.hidden=true;list.innerHTML="";input.setAttribute("aria-expanded","false");input.removeAttribute("aria-activedescendant")};const assignedSlots=new Set();const choose=(input,player)=>{assignedSlots.add(Number(input.dataset.comparatorPlayer));input.value=playerLabel(player);input.dataset.playerKey=playerKey(player);closeSuggestions(input);refresh()};const showSuggestions=input=>{const query=searchKey(input.value.trim()),matches=players().filter(player=>!query||searchKey(playerLabel(player)).includes(query)).slice(0,8),list=input.parentElement.querySelector(".player-suggestions"),index=input.dataset.comparatorPlayer;list.innerHTML=matches.length?matches.map((player,position)=>`<button type="button" role="option" id="comparator-player-${index}-option-${position}" data-player-key="${esc(playerKey(player))}"><strong>${esc(player.name)}</strong><small>${esc(player.currentTeam)}</small></button>`).join(""):'<span class="player-suggestions-empty">Nessun nome corrispondente</span>';list.hidden=false;input.setAttribute("aria-expanded","true")};selectors.forEach(input=>{const list=input.parentElement.querySelector(".player-suggestions");input.addEventListener("focus",()=>showSuggestions(input));input.addEventListener("input",()=>{const exact=players().filter(player=>searchKey(player.name)===searchKey(input.value.trim())||searchKey(playerLabel(player))===searchKey(input.value.trim()));if(exact.length===1){input.dataset.playerKey=playerKey(exact[0]);assignedSlots.add(Number(input.dataset.comparatorPlayer));refresh()}showSuggestions(input)});input.addEventListener("keydown",event=>{const options=[...list.querySelectorAll('[role="option"]')];if(event.key==="Escape"){closeSuggestions(input);return}if(!["ArrowDown","ArrowUp","Enter"].includes(event.key)||!options.length)return;event.preventDefault();let active=options.findIndex(option=>option.classList.contains("active"));if(event.key==="Enter"&&active>=0){const player=players().find(item=>playerKey(item)===options[active].dataset.playerKey);if(player)choose(input,player);return}active=event.key==="ArrowUp"?(active<=0?options.length-1:active-1):(active+1)%options.length;options.forEach((option,index)=>option.classList.toggle("active",index===active));input.setAttribute("aria-activedescendant",options[active].id)});list.addEventListener("pointerdown",event=>{const option=event.target.closest("[data-player-key]");if(!option)return;event.preventDefault();const player=players().find(item=>playerKey(item)===option.dataset.playerKey);if(player)choose(input,player)});input.addEventListener("blur",()=>setTimeout(()=>{if(document.activeElement!==input)closeSuggestions(input)},100))});const refreshOptions=()=>{const available=players();selectors.forEach((input,index)=>{const player=available.find(p=>playerKey(p)===input.dataset.playerKey)||available.find(p=>playerKey(p)===["inter:lautaro-martinez","roma:donyell-malen"][index])||available[Math.min(index,Math.max(0,available.length-1))];if(player){input.value=playerLabel(player);input.dataset.playerKey=playerKey(player)}else{input.value="";input.dataset.playerKey=""}closeSuggestions(input)})};document.querySelectorAll('[data-comparator-mode]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-comparator-mode]').forEach(option=>option.setAttribute('aria-pressed',String(option===button)));refresh()}));
let pendingSelection=null;
const applyRankingPlayer=(key,index)=>{const player=players().find(p=>playerKey(p)===key);if(player)choose(selectors[index],player);pendingSelection=null;target.querySelector('.compare-replacement')?.remove()};
target.addEventListener('click',event=>{
  const replacement=event.target.closest('[data-replace-slot]');
  if(replacement&&pendingSelection){applyRankingPlayer(pendingSelection,Number(replacement.dataset.replaceSlot));return}
  const button=event.target.closest('[data-compare-key]');if(!button)return;
  if(period.value!==periodId){period.value=periodId;refreshOptions();refresh()}
  const key=button.dataset.compareKey;
  target.querySelector('.compare-replacement')?.remove();
  const vacant=[0,1].find(index=>!assignedSlots.has(index));
  if(vacant!==undefined){applyRankingPlayer(key,vacant);return}
  pendingSelection=key;
  const options=document.createElement('span');options.className='compare-replacement';options.setAttribute('role','group');options.setAttribute('aria-label','Sostituisci nel confronto');
  options.innerHTML='<button type="button" data-replace-slot="0" aria-label="Sostituisci calciatore A">A</button><button type="button" data-replace-slot="1" aria-label="Sostituisci calciatore B">B</button>';
  button.parentElement.append(options);options.querySelector('button').focus();
});
target.addEventListener('keydown',event=>{if(event.key==='Escape'){const options=target.querySelector('.compare-replacement');options?.parentElement.querySelector('.compare-pick')?.focus();options?.remove();pendingSelection=null}});
refreshOptions();refresh()}
  }
  return {render};
}
