export function createPage(deps){
  const {esc,load}=deps;
  const dayLabel=value=>new Intl.DateTimeFormat("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Rome"}).format(new Date(`${value}T12:00:00+01:00`));
  const matchdayLabel=number=>`${number}ª giornata`;

  const scoreLabel=profile=>profile?.europeanStrengthIndex==null?"N/D":profile.europeanStrengthIndex.toFixed(1);
  const ppgLabel=value=>value==null?"N/D":value.toFixed(2);
  const technicalEdge=(fixture,profiles)=>{
    const home=profiles.get(fixture.homeTeam),away=profiles.get(fixture.awayTeam);
    if(home?.europeanStrengthIndex==null||away?.europeanStrengthIndex==null)return "Confronto europeo N/D";
    const gap=home.europeanStrengthIndex-away.europeanStrengthIndex;
    if(Math.abs(gap)<4)return "Equilibrio nella forza europea";
    return `Prevalenza europea: ${gap>0?fixture.homeTeam:fixture.awayTeam}`;
  };

  function fixtureCard(fixture,profiles,histories){
    const homeProfile=profiles.get(fixture.homeTeam),awayProfile=profiles.get(fixture.awayTeam);
    const homeHistory=histories.get(fixture.homeTeam),awayHistory=histories.get(fixture.awayTeam);
    return `<article class="champions-fixture" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}">
      <header><span>${matchdayLabel(fixture.matchday)}</span><time datetime="${esc(`${fixture.date}T${fixture.kickoff}`)}">${esc(fixture.kickoff)}</time></header>
      <div class="champions-fixture-teams"><div><strong>${esc(fixture.homeTeam)}</strong><small>Forza ${scoreLabel(homeProfile)} · Casa ${ppgLabel(homeHistory?.home?.pointsPerMatch)}</small></div><span aria-hidden="true">—</span><div><strong>${esc(fixture.awayTeam)}</strong><small>Forza ${scoreLabel(awayProfile)} · Trasf. ${ppgLabel(awayHistory?.away?.pointsPerMatch)}</small></div></div>
      <footer><span>${esc(technicalEdge(fixture,profiles))}</span><b>1/X/2 N/D</b></footer>
    </article>`;
  }

  function fixtureGroups(fixtures,profiles,histories){
    if(!fixtures.length)return `<div class="champions-empty"><strong>Nessuna partita</strong><p>Modifica i filtri per visualizzare un altro gruppo di gare.</p></div>`;
    const groups=new Map();
    for(const fixture of fixtures){
      const key=`${fixture.matchday}|${fixture.date}`;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(fixture);
    }
    return [...groups.entries()].map(([key,items])=>{
      const [matchday,date]=key.split("|");
      return `<section class="champions-fixture-day"><header><div><p>${matchdayLabel(Number(matchday))}</p><h3>${esc(dayLabel(date))}</h3></div><span>${items.length} ${items.length===1?"partita":"partite"}</span></header><div class="champions-fixture-grid">${items.map(fixture=>fixtureCard(fixture,profiles,histories)).join("")}</div></section>`;
    }).join("");
  }

  function strengthDirectory(strength){
    const rows=strength.teams.map((profile,index)=>`<tr><td>${index+1}</td><th scope="row">${esc(profile.team)}<small>${esc(profile.association)}</small></th><td>${profile.uefaRank==null?"N/D":`#${profile.uefaRank}`}</td><td>${esc(profile.lastSeason)}</td><td><strong>${scoreLabel(profile)}</strong></td><td>${profile.dataCoveragePct}%</td></tr>`).join("");
    return `<details class="champions-strength-panel"><summary><span><small>Modello preliminare</small><strong>Indice di forza europeo</strong></span><span>${strength.summary.completeProfiles}/36 profili completi</span></summary><div class="champions-strength-intro"><p>Confronto sintetico tra ranking UEFA quinquennale e percorso europeo 2025/26. I dati mancanti non valgono zero e le probabilità restano disattivate fino al backtest.</p><a href="${esc(strength.source.url)}" target="_blank" rel="noreferrer">Profili UEFA ↗</a></div><div class="champions-strength-table-wrap"><table class="champions-strength-table"><thead><tr><th>Pos.</th><th>Squadra</th><th>Ranking UEFA</th><th>Ultima stagione europea</th><th>Forza</th><th>Copertura</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }

  function historyDirectory(history){
    const rows=history.teams.map(profile=>`<tr><th scope="row">${esc(profile.team)}<small>${profile.overall.matches} gare · ${profile.seasonsPlayed} ${profile.seasonsPlayed===1?"stagione":"stagioni"}</small></th><td><strong>${ppgLabel(profile.overall.pointsPerMatch)}</strong></td><td>${ppgLabel(profile.home.pointsPerMatch)}</td><td>${ppgLabel(profile.away.pointsPerMatch)}</td><td>${ppgLabel(profile.recent10.pointsPerMatch)}</td><td>${ppgLabel(profile.averageOpponentPointsPerMatch)}</td><td>${esc(profile.progression.label)}</td><td>${profile.coverage==="sufficient"?"Sufficiente":profile.coverage==="limited"?"Limitata":"N/D"}</td></tr>`).join("");
    return `<details class="champions-strength-panel champions-history-panel"><summary><span><small>${history.summary.historicalMatches} risultati ufficiali</small><strong>Rendimento 2023/24–2025/26</strong></span><span>${history.summary.sufficient} campioni sufficienti · ${history.summary.limited} limitati · ${history.summary.unavailable} N/D</span></summary><div class="champions-strength-intro"><p>Punti per gara calcolati sui 90 minuti. Casa, trasferta, ultime dieci e livello medio degli avversari sono indicatori descrittivi: non producono ancora probabilità.</p><a href="${esc(history.source.pages.at(-1).url)}" target="_blank" rel="noreferrer">Archivio UEFA ↗</a></div><div class="champions-strength-table-wrap"><table class="champions-strength-table champions-history-table"><thead><tr><th>Squadra</th><th>P/G</th><th>Casa</th><th>Trasf.</th><th>Ultime 10</th><th>Avversari</th><th>Progressione</th><th>Campione</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }

  async function render(){
    const [data,strength,history]=await Promise.all([load("champions-league-2026-27.json"),load("champions-team-strength-2026-27.json"),load("champions-team-history-2026-27.json")]);
    const profiles=new Map(strength.teams.map(profile=>[profile.team,profile]));
    const histories=new Map(history.teams.map(profile=>[profile.team,profile]));
    const teamOptions=data.teams.map(team=>`<option value="${esc(team)}">${esc(team)}</option>`).join("");
    document.querySelector("#app").innerHTML=`
      <section class="champions-hero" aria-labelledby="champions-title">
        <div class="champions-status"><span aria-hidden="true"></span>In preparazione</div>
        <p class="eyebrow">UEFA Champions League 2026/27</p>
        <h1 id="champions-title">Tutte le notti<br>d’Europa.</h1>
        <p class="lead">Il calendario ufficiale della fase campionato, completo di tutte le partite e di tutte le squadre. Le letture verranno aggiunte gara dopo gara.</p>
        <div class="champions-hero-stats" aria-label="Riepilogo calendario"><div><strong>${data.summary.fixtures}</strong><span>partite</span></div><div><strong>${data.summary.teams}</strong><span>squadre</span></div><div><strong>${data.summary.matchdays}</strong><span>giornate</span></div></div>
        <div class="champions-orbit" aria-hidden="true"><span>★</span></div>
      </section>
      ${strengthDirectory(strength)}
      ${historyDirectory(history)}
      <section class="champions-calendar" aria-labelledby="champions-calendar-title">
        <header class="champions-calendar-heading"><div><p class="eyebrow">Fase campionato</p><h2 id="champions-calendar-title">Calendario ufficiale</h2><p>Scegli una giornata o una squadra. Con “Tutte le giornate” puoi consultare l’intero programma delle 144 gare.</p></div><a href="${esc(data.source.url)}" target="_blank" rel="noreferrer">Fonte UEFA ↗</a></header>
        <div class="champions-controls">
          <label><span>Giornata</span><select id="champions-matchday"><option value="all">Tutte le giornate</option>${Array.from({length:data.summary.matchdays},(_,index)=>`<option value="${index+1}"${index===0?" selected":""}>${matchdayLabel(index+1)}</option>`).join("")}</select></label>
          <label><span>Squadra</span><select id="champions-team"><option value="all">Tutte le squadre</option>${teamOptions}</select></label>
          <button id="champions-reset" type="button">Azzera filtri</button>
        </div>
        <div class="champions-results-head"><p id="champions-results-label" aria-live="polite"></p><span>Aggiornato al 1 settembre 2026</span></div>
        <div id="champions-fixtures"></div>
      </section>`;

    const matchdaySelect=document.querySelector("#champions-matchday");
    const teamSelect=document.querySelector("#champions-team");
    const results=document.querySelector("#champions-fixtures");
    const resultsLabel=document.querySelector("#champions-results-label");
    const applyFilters=()=>{
      const matchday=matchdaySelect.value,team=teamSelect.value;
      const filtered=data.fixtures.filter(fixture=>(matchday==="all"||fixture.matchday===Number(matchday))&&(team==="all"||fixture.homeTeam===team||fixture.awayTeam===team));
      results.innerHTML=fixtureGroups(filtered,profiles,histories);
      const context=[matchday==="all"?"tutte le giornate":matchdayLabel(Number(matchday)),team==="all"?"tutte le squadre":team];
      resultsLabel.innerHTML=`<strong>${filtered.length}</strong> ${filtered.length===1?"partita":"partite"} · ${esc(context.join(" · "))}`;
    };
    matchdaySelect.addEventListener("change",applyFilters);
    teamSelect.addEventListener("change",applyFilters);
    document.querySelector("#champions-reset").addEventListener("click",()=>{matchdaySelect.value="1";teamSelect.value="all";applyFilters()});
    applyFilters();
  }
  return {render};
}
