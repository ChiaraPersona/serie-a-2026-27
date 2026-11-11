import {imageSource} from '../core/image-source.mjs?v=20261022-assets-v1';
export function createPage(deps){
  const {esc,hero,matchdayChronology,homeMatchListItem,load}=deps;
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
  const teamCell=row=>{const team=teamFor(row);return `<span class="standing-team">${team?.logo?`<span class="standing-logo"><img src="${imageSource(`${team.logo}`)}" alt="" onerror="this.hidden=true"></span>`:'<span class="standing-logo fallback"></span>'}<span>${esc(name(row))}</span></span>`};
  const value=(row,key,index)=>key==="position"?(row.position||index+1):key==="teamName"?name(row):row[key];
  const display=(key,current)=>current===null||current===undefined?"N/D":key==="goalDifference"&&current>0?`+${current}`:current;
  const head=standingsColumns.map((column,index)=>`${index===1?'<th class="standing-pinned-logo" aria-label="Squadra"></th>':""}<th aria-sort="none"><button class="standings-sort" type="button" data-standings-sort="${column.key}" data-column-index="${index >= 1 ? index + 1 : index}" data-sort-type="${column.type}" data-default-direction="${column.direction}" title="${column.title}" aria-label="Ordina per ${column.title}" aria-pressed="false">${column.label}</button></th>`).join("");
  const body=rows.map((row,index)=>{const originalPosition=row.position||index+1,zone=originalPosition===1?"standing-zone-champion":originalPosition<=4?"standing-zone-top":originalPosition<=6?"standing-zone-europa":originalPosition===7?"standing-zone-conference":originalPosition>rows.length-3?"standing-zone-bottom":"";return `<tr class="${zone}" data-original-order="${index}">${standingsColumns.map(column=>{const current=value(row,column.key,index),sortValue=current===null||current===undefined?"":current,content=column.key==="teamName"?teamCell(row):column.key==="points"?`<strong>${display(column.key,current)}</strong>`:display(column.key,current);return `${column.key==="teamName"?`<td class="standing-pinned-logo"><span class="standing-logo" role="img" aria-label="${esc(name(row))}" title="${esc(name(row))}">${teamFor(row)?.logo?`<img src="${imageSource(teamFor(row).logo)}" alt="" onerror="this.hidden=true">`:""}</span></td>`:""}<td data-sort-value="${esc(sortValue)}">${content}</td>`}).join("")}</tr>`}).join("");
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
    {id:"general",label:"Generale",eyebrow:"",title:"",description:"",rows:standings},
    {id:"home",label:"In casa",eyebrow:"Stagione in corso · rendimento",title:"Serie A 2026/27 · In casa",description:"Classifica calcolata esclusivamente sulle partite casalinghe concluse.",rows:currentHomeRows},
    {id:"away",label:"Fuori casa",eyebrow:"Stagione in corso · rendimento",title:"Serie A 2026/27 · Fuori casa",description:"Classifica calcolata esclusivamente sulle partite in trasferta concluse.",rows:currentAwayRows}
  ];
  const archiveViews=[
    {id:"general",label:"Generale",eyebrow:"Archivio",title:"Classifica finale 2025/26",description:"Classifica fornita dall'utente; rigori e cartellini aggregati dai 380 referti gara ESPN.",rows:previousStandings.rows},
    {id:"home",label:"In casa",eyebrow:"Archivio · rendimento",title:"Serie A 2025/26 · In casa",description:"Classifica calcolata esclusivamente sulle 19 partite casalinghe.",rows:previousStandings.homeRows},
    {id:"away",label:"Fuori casa",eyebrow:"Archivio · rendimento",title:"Serie A 2025/26 · Fuori casa",description:"Classifica calcolata esclusivamente sulle 19 partite in trasferta.",rows:previousStandings.awayRows}
  ];
  const scopeTabs=views=>views.map(view=>`<button type="button" data-standings-scope-tab="${view.id}" aria-pressed="false">${view.label}</button>`).join("");
  const currentPanels=currentViews.map(view=>`<section class="section" data-standings-scope-panel="${view.id}">${view.eyebrow?`<p class="eyebrow">${view.eyebrow}</p>`:""}${view.title?`<h2>${view.title}</h2>`:""}${view.description?`<p class="muted">${view.description}</p>`:""}${standingsTable(view.rows,teams)}</section>`).join("");
  const archivePanels=archiveViews.map(view=>`<section class="section historical-standings" data-standings-scope-panel="${view.id}"><p class="eyebrow">${view.eyebrow}</p><h2>${view.title}</h2><p class="muted">${view.description}</p>${standingsTable(view.rows,standingsTeams)}</section>`).join("");
  return `<section class="section home-standings" id="classifiche"><header class="section-heading"><div><p class="eyebrow">Serie A · classifiche</p></div></header><nav class="standings-switch" aria-label="Selezione stagione"><button type="button" data-standings-tab="current">2026/27</button><button type="button" data-standings-tab="archive">2025/26</button></nav><div data-standings-panel="current"><nav class="standings-scope-switch" aria-label="Selezione rendimento 2026/27">${scopeTabs(currentViews)}</nav>${currentPanels}</div><div data-standings-panel="archive"><nav class="standings-scope-switch" aria-label="Selezione rendimento 2025/26">${scopeTabs(archiveViews)}</nav>${archivePanels}</div></section>`;
}
  function homeMatchdayPanel(side){
    return `<section class="home-next-panel" data-home-matchday-panel="${side}"><h3><strong>Giornata <span data-home-matchday-label aria-live="polite" aria-atomic="true"></span></strong></h3><ul class="home-match-list" data-home-match-list></ul></section>`;
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
    html=hero("","Il calcio, giornata dopo giornata","Calendario, numeri e contesto della Serie A Enilive 2026/27. Ogni dato resta collegato alla propria fonte.",`<div class="hero-season"><span>Serie A</span><strong>26<span>/</span>27</strong><small>${completed}/380 partite concluse</small></div>`)+`<section class="section home-dashboard"><div class="home-dashboard-grid"><div class="home-next">${homeMatchdayPanel("previous")}<div class="home-matchday-nav"><button class="home-matchday-button" type="button" data-home-previous-matchday><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16m-7-7 7 7-7 7"/></svg></button><button class="home-matchday-button" type="button" data-home-next-matchday><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16m-7-7 7 7-7 7"/></svg></button></div>${homeMatchdayPanel("current")}</div><aside class="home-rail"><a class="home-editorial-readings" href="lettura.html"><svg class="home-editorial-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 10v44h46M22 43V32m12 11V24m12 19V14M18 24l14-10 12 3 12-10"/></svg><div><strong>Letture</strong><small>Analisi e pronostici delle partite</small></div><svg class="home-editorial-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a><a class="home-editorial-champions" href="champions-league.html"><svg class="home-editorial-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 10h24v13a12 12 0 0 1-24 0V10Zm0 4H10v5a10 10 0 0 0 11 10m23-15h10v5a10 10 0 0 1-11 10M32 35v13m-12 6h24m-20 0v-6h16v6"/></svg><div><strong>Champions League</strong><small>Calendario, risultati e letture europee</small></div><svg class="home-editorial-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a><a class="home-editorial-teams" href="download.html"><svg class="home-editorial-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="18" y="5" width="28" height="54" rx="5"/><path d="M27 12h10M28 51h8M32 21v20m-8-8 8 8 8-8"/></svg><div><strong>Scarica l’app</strong><small>Il calendario e le letture sul tuo telefono</small></div><svg class="home-editorial-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a></aside></div></section>`+homeStandings(standings,currentHomeRows,currentAwayRows,previousStandings,teams,standingsTeams);
  }
    document.querySelector("#app").innerHTML=html;
  if(page==="home"){
    configureStandingsTables();
    const desktopCalendar=matchMedia("(min-width: 1001px)");
    const previousPanel=document.querySelector('[data-home-matchday-panel="previous"]');
    const currentPanel=document.querySelector('[data-home-matchday-panel="current"]');
    const previousButton=document.querySelector("[data-home-previous-matchday]");
    const nextButton=document.querySelector("[data-home-next-matchday]");
    const dayHeading=new Intl.DateTimeFormat("it-IT",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"});
    const renderMatchday=(panel,matchday)=>{
      panel.hidden=panel===previousPanel&&matchday===undefined;
      panel.querySelector("[data-home-matchday-label]").textContent=matchday??"";
      const fixtures=league.filter(match=>match.matchday===matchday).sort(matchdayChronology);
      const grouped=desktopCalendar.matches;
      let previousDate;
      const rows=fixtures.map(match=>{
        const date=match.date?.slice(0,10)||"";
        const heading=grouped&&date!==previousDate
          ? `<li class="home-match-date-heading">${date?dayHeading.format(new Date(date)):"Data da definire"}</li>`
          : "";
        previousDate=date;
        return heading+homeMatchListItem(match,teams,{grouped,showKickoff:panel!==previousPanel});
      });
      panel.querySelector("[data-home-match-list]").innerHTML=rows.join("")||(panel.hidden?"":'<li class="muted">Programmazione in aggiornamento.</li>');
    };
    const showMatchdays=()=>{
      const firstIndex=desktopCalendar.matches&&homeMatchdays.length>1?1:0;
      const index=Math.max(firstIndex,homeMatchdays.indexOf(activeHomeMatchday));
      renderMatchday(previousPanel,firstIndex?homeMatchdays[index-1]:undefined);
      renderMatchday(currentPanel,homeMatchdays[index]);
      previousButton.disabled=index<=firstIndex;
      nextButton.disabled=index>=homeMatchdays.length-1;
      previousButton.setAttribute("aria-label",firstIndex?"Scorri le giornate indietro":"Mostra la giornata precedente");
      nextButton.setAttribute("aria-label",firstIndex?"Scorri le giornate avanti":"Mostra la giornata successiva");
    };
    const moveMatchday=step=>{
      const index=homeMatchdays.indexOf(activeHomeMatchday);
      const visibleIndex=desktopCalendar.matches&&homeMatchdays.length>1?Math.max(1,index):index;
      activeHomeMatchday=homeMatchdays[visibleIndex+step];
      showMatchdays();
    };
    previousButton.addEventListener("click",()=>moveMatchday(-1));
    nextButton.addEventListener("click",()=>moveMatchday(1));
    desktopCalendar.addEventListener("change",showMatchdays);
    showMatchdays();
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
