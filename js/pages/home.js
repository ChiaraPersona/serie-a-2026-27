export function createPage(deps){
  const {esc,hero,empty,matchdayChronology,homeMatchListItem,load}=deps;
const standingsColumns=[
  {key:"position",label:"#",title:"Posizione",type:"number",direction:"asc"},
  {key:"teamName",label:"Squadra",title:"Squadra",type:"text",direction:"asc"},
  {key:"points",label:"PT",title:"Punti",type:"number",direction:"desc"},
  {key:"played",label:"PG",title:"Partite giocate",type:"number",direction:"desc"},
  {key:"won",label:"V",title:"Vittorie",type:"number",direction:"desc"},
  {key:"drawn",label:"N",title:"Pareggi",type:"number",direction:"desc"},
  {key:"lost",label:"P",title:"Sconfitte",type:"number",direction:"desc"},
  {key:"goalsFor",label:"GF",title:"Gol fatti",type:"number",direction:"desc"},
  {key:"goalsAgainst",label:"GS",title:"Gol subiti",type:"number",direction:"desc"},
  {key:"goalDifference",label:"DR",title:"Differenza reti",type:"number",direction:"desc"},
  {key:"penaltiesFor",label:"R+",title:"Rigori assegnati a favore",type:"number",direction:"desc"},
  {key:"penaltiesAgainst",label:"R-",title:"Rigori subiti contro",type:"number",direction:"desc"},
  {key:"cardsFor",label:"C+",title:"Cartellini assegnati agli avversari",type:"number",direction:"desc"},
  {key:"cardsAgainst",label:"C-",title:"Cartellini ricevuti dalla squadra",type:"number",direction:"desc"}
];
function standingsTable(rows,teams){
  const teamFor=row=>teams.find(team=>team.id===row.team),name=row=>row.teamName||teamFor(row)?.name||row.team;
  const teamCell=row=>{const team=teamFor(row);return `<span class="standing-team">${team?.logo?`<span class="standing-logo"><img src="${team.logo}" alt="" onerror="this.hidden=true"></span>`:'<span class="standing-logo fallback"></span>'}<span>${esc(name(row))}</span></span>`};
  const value=(row,key,index)=>key==="position"?(row.position||index+1):key==="teamName"?name(row):row[key];
  const display=(key,current)=>current===null||current===undefined?"N/D":key==="goalDifference"&&current>0?`+${current}`:current;
  const head=standingsColumns.map((column,index)=>`<th aria-sort="none"><button class="standings-sort" type="button" data-standings-sort="${column.key}" data-column-index="${index}" data-sort-type="${column.type}" data-default-direction="${column.direction}" title="${column.title}" aria-label="Ordina per ${column.title}" aria-pressed="false">${column.label}</button></th>`).join("");
  const body=rows.map((row,index)=>{const originalPosition=row.position||index+1,zone=originalPosition===1?"standing-zone-champion":originalPosition<=4?"standing-zone-top":originalPosition<=6?"standing-zone-europa":originalPosition===7?"standing-zone-conference":originalPosition>rows.length-3?"standing-zone-bottom":"";return `<tr class="${zone}" data-original-order="${index}">${standingsColumns.map(column=>{const current=value(row,column.key,index),sortValue=current===null||current===undefined?"":current,content=column.key==="teamName"?teamCell(row):column.key==="points"?`<strong>${display(column.key,current)}</strong>`:display(column.key,current);return `<td data-sort-value="${esc(sortValue)}">${content}</td>`}).join("")}</tr>`}).join("");
  return `<div class="table-wrap"><table class="standings-table" data-sortable-standings><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function configureStandingsTables(){
  document.querySelectorAll("[data-sortable-standings]").forEach(table=>{
    const tbody=table.querySelector("tbody"),buttons=[...table.querySelectorAll("[data-standings-sort]")];
    buttons.forEach(button=>button.addEventListener("click",()=>{
      const header=button.closest("th"),active=header.getAttribute("aria-sort"),direction=active==="ascending"?"desc":active==="descending"?"asc":button.dataset.defaultDirection,index=Number(button.dataset.columnIndex),numeric=button.dataset.sortType==="number";
      const rows=[...tbody.querySelectorAll("tr")];
      rows.sort((left,right)=>{const leftValue=left.children[index].dataset.sortValue,rightValue=right.children[index].dataset.sortValue,leftMissing=leftValue==="",rightMissing=rightValue==="";if(leftMissing||rightMissing)return leftMissing===rightMissing?Number(left.dataset.originalOrder)-Number(right.dataset.originalOrder):leftMissing?1:-1;const comparison=numeric?Number(leftValue)-Number(rightValue):leftValue.localeCompare(rightValue,"it",{sensitivity:"base"});return (direction==="asc"?comparison:-comparison)||Number(left.dataset.originalOrder)-Number(right.dataset.originalOrder)});
      buttons.forEach(item=>{item.closest("th").setAttribute("aria-sort","none");item.setAttribute("aria-pressed",String(item===button))});
      table.querySelectorAll(".standings-column-active").forEach(cell=>cell.classList.remove("standings-column-active"));
      header.classList.add("standings-column-active");
      rows.forEach(row=>row.children[index].classList.add("standings-column-active"));
      header.setAttribute("aria-sort",direction==="asc"?"ascending":"descending");
      rows.forEach((row,rowIndex)=>{row.children[0].textContent=String(rowIndex+1);tbody.appendChild(row)});
    }));
  });
}
function homeStandings(standings,currentHomeRows,currentAwayRows,previousStandings,teams,standingsTeams){
  const currentViews=[
    {id:"general",label:"Generale",eyebrow:"Stagione in corso",title:"Serie A 2026/27",description:"Classifica generale calcolata sui risultati ufficiali disponibili.",rows:standings},
    {id:"home",label:"In casa",eyebrow:"Stagione in corso · rendimento",title:"Serie A 2026/27 · In casa",description:"Classifica calcolata esclusivamente sulle partite casalinghe concluse.",rows:currentHomeRows},
    {id:"away",label:"Fuori casa",eyebrow:"Stagione in corso · rendimento",title:"Serie A 2026/27 · Fuori casa",description:"Classifica calcolata esclusivamente sulle partite in trasferta concluse.",rows:currentAwayRows}
  ];
  const archiveViews=[
    {id:"general",label:"Generale",eyebrow:"Archivio",title:"Classifica finale 2025/26",description:"Classifica fornita dall'utente; rigori e cartellini aggregati dai 380 referti gara ESPN.",rows:previousStandings.rows},
    {id:"home",label:"In casa",eyebrow:"Archivio · rendimento",title:"Serie A 2025/26 · In casa",description:"Classifica calcolata esclusivamente sulle 19 partite casalinghe.",rows:previousStandings.homeRows},
    {id:"away",label:"Fuori casa",eyebrow:"Archivio · rendimento",title:"Serie A 2025/26 · Fuori casa",description:"Classifica calcolata esclusivamente sulle 19 partite in trasferta.",rows:previousStandings.awayRows}
  ];
  const scopeTabs=views=>views.map(view=>`<button type="button" data-standings-scope-tab="${view.id}" aria-pressed="false">${view.label}</button>`).join("");
  const currentPanels=currentViews.map(view=>`<section class="section" data-standings-scope-panel="${view.id}"><p class="eyebrow">${view.eyebrow}</p><h2>${view.title}</h2><p class="muted">${view.description}</p>${standingsTable(view.rows,teams)}</section>`).join("");
  const archivePanels=archiveViews.map(view=>`<section class="section historical-standings" data-standings-scope-panel="${view.id}"><p class="eyebrow">${view.eyebrow}</p><h2>${view.title}</h2><p class="muted">${view.description}</p>${standingsTable(view.rows,standingsTeams)}</section>`).join("");
  return `<section class="section home-standings" id="classifiche"><header class="section-heading"><div><p class="eyebrow">Serie A · classifiche</p><h2>La situazione del campionato</h2></div><p>La stagione in corso e l'archivio completo 2025/26, ora consultabili direttamente dalla Home.</p></header><nav class="standings-switch" aria-label="Selezione stagione"><button type="button" data-standings-tab="current">Classifica 2026/27</button><button type="button" data-standings-tab="archive">Classifica 2025/26</button></nav><div data-standings-panel="current"><nav class="standings-scope-switch" aria-label="Selezione rendimento 2026/27">${scopeTabs(currentViews)}</nav>${currentPanels}</div><div data-standings-panel="archive"><nav class="standings-scope-switch" aria-label="Selezione rendimento 2025/26">${scopeTabs(archiveViews)}</nav>${archivePanels}</div></section>`;
}
  async function render(){
    const page="home",[teams,matches,previousStandings]=await Promise.all([load("teams.json"),load("matches.json"),load("standings-2025-26.json")]);
    const league=matches.filter(m=>m.competition==="serie-a"),calculateStandings=globalThis.calculateStandings;
    let html="",homeMatchdays=[],activeHomeMatchday=null;
  if(page==="home"){
    const standings=calculateStandings(teams,matches),currentHomeRows=calculateStandings(teams,matches,"home"),currentAwayRows=calculateStandings(teams,matches,"away"),standingsTeams=[...teams,...previousStandings.historicalTeams];
    const completed=league.filter(match=>match.status==="finished").length;
    homeMatchdays=[...new Set(league.map(match=>match.matchday))].sort((left,right)=>left-right);
    activeHomeMatchday=homeMatchdays.find(matchday=>league.some(match=>match.matchday===matchday&&match.status!=="finished"))??homeMatchdays.at(-1);
    const matchdayMatches=league.filter(match=>match.matchday===activeHomeMatchday).sort(matchdayChronology);
    html=hero("Stagione ufficiale","Il calcio italiano, giornata dopo giornata.","Calendario, numeri e contesto della Serie A Enilive 2026/27. Ogni dato resta collegato alla propria fonte.",`<div class="hero-season"><span>Serie A</span><strong>26<span>/</span>27</strong><small>${completed}/380 partite concluse</small></div>`)+`<section class="section home-dashboard"><header class="section-heading"><div><p class="eyebrow">In primo piano</p><h2>Dentro la stagione</h2></div></header><div class="home-dashboard-grid"><div class="home-next"><div class="home-next-head"><h3><span>Partite e risultati</span> - Giornata <b data-home-matchday-label>${activeHomeMatchday}</b></h3><div class="home-matchday-nav"><button class="home-matchday-button" type="button" data-home-previous-matchday>Giornata precedente</button><button class="home-matchday-button" type="button" data-home-next-matchday>Giornata successiva</button></div></div>${matchdayMatches.length?`<ul class="home-match-list" data-home-match-list>${matchdayMatches.map(match=>homeMatchListItem(match,teams)).join("")}</ul>`:empty("Programmazione in aggiornamento.")}</div><aside class="home-rail"><a href="#classifiche"><span>Classifiche</span><strong>Situazione e archivio</strong><small>Posizioni, verdetti e storico stagionale</small></a><a href="statistiche-squadre.html"><span>Squadre</span><strong>Rose e leader</strong><small>Statistiche individuali e valori per 90'</small></a><a href="arbitri.html"><span>Arbitri</span><strong>Numeri e campioni</strong><small>Confronti neutrali tra le fonti</small></a></aside></div></section>`+homeStandings(standings,currentHomeRows,currentAwayRows,previousStandings,teams,standingsTeams);
  }
    document.querySelector("#app").innerHTML=html;
  if(page==="home"){
    configureStandingsTables();
    const matchList=document.querySelector("[data-home-match-list]"),matchdayLabel=document.querySelector("[data-home-matchday-label]"),previousMatchdayButton=document.querySelector("[data-home-previous-matchday]"),nextMatchdayButton=document.querySelector("[data-home-next-matchday]");
    const showMatchday=matchday=>{const currentIndex=homeMatchdays.indexOf(matchday),matchdayMatches=league.filter(match=>match.matchday===matchday).sort(matchdayChronology);activeHomeMatchday=matchday;matchdayLabel.textContent=String(matchday);matchList.innerHTML=matchdayMatches.map(match=>homeMatchListItem(match,teams)).join("");previousMatchdayButton.disabled=currentIndex===0;previousMatchdayButton.setAttribute("aria-label",previousMatchdayButton.disabled?"Prima giornata disponibile":`Mostra la giornata ${homeMatchdays[currentIndex-1]}`);nextMatchdayButton.disabled=currentIndex===homeMatchdays.length-1;nextMatchdayButton.setAttribute("aria-label",nextMatchdayButton.disabled?"Ultima giornata disponibile":`Mostra la giornata ${homeMatchdays[currentIndex+1]}`)};
    previousMatchdayButton.addEventListener("click",()=>{const previousMatchday=homeMatchdays[homeMatchdays.indexOf(activeHomeMatchday)-1];if(previousMatchday!==undefined)showMatchday(previousMatchday)});
    nextMatchdayButton.addEventListener("click",()=>{const nextMatchday=homeMatchdays[homeMatchdays.indexOf(activeHomeMatchday)+1];if(nextMatchday!==undefined)showMatchday(nextMatchday)});
    showMatchday(activeHomeMatchday);
    const activate=value=>{document.querySelectorAll("[data-standings-panel]").forEach(panel=>panel.hidden=panel.dataset.standingsPanel!==value);document.querySelectorAll("[data-standings-tab]").forEach(button=>{const active=button.dataset.standingsTab===value;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))});history.replaceState(null,"",value==="archive"?"#classifica-2025-26":location.pathname)};
    const activateScope=value=>{document.querySelectorAll("[data-standings-scope-panel]").forEach(panel=>panel.hidden=panel.dataset.standingsScopePanel!==value);document.querySelectorAll("[data-standings-scope-tab]").forEach(button=>{const active=button.dataset.standingsScopeTab===value;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))})};
    document.querySelectorAll("[data-standings-tab]").forEach(button=>button.addEventListener("click",()=>activate(button.dataset.standingsTab)));
    document.querySelectorAll("[data-standings-scope-tab]").forEach(button=>button.addEventListener("click",()=>activateScope(button.dataset.standingsScopeTab)));
    activateScope("general");
    activate(location.hash==="#classifica-2025-26"?"archive":"current");
  }
  }
  return {render};
}
