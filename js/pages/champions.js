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
  const probabilityLabel=(prediction,context)=>prediction?`${context?.probabilityStatus==="base-only"?"Base · ":""}1 ${prediction.displayPercentages.home.toFixed(1)}% · X ${prediction.displayPercentages.draw.toFixed(1)}% · 2 ${prediction.displayPercentages.away.toFixed(1)}%`:"1/X/2 N/D";
  const contextStatusLabel=(fixture,context)=>context?.contextStatus==="awaiting-final-domestic-refresh"
    ? "Aggiornamento dopo l’ultima gara domestica"
    : fixture.matchday===1?"Contesto N/D":"Contesto da aggiornare vicino alla gara";

  function fixtureCard(fixture,profiles,histories,predictions,contexts){
    const homeProfile=profiles.get(fixture.homeTeam),awayProfile=profiles.get(fixture.awayTeam);
    const homeHistory=histories.get(fixture.homeTeam),awayHistory=histories.get(fixture.awayTeam);
    const prediction=predictions.get(fixture.id);
    const context=contexts.get(fixture.id);
    return `<article class="champions-fixture" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}" data-context-status="${esc(context?.contextStatus||"unknown")}">
      <header><span>${matchdayLabel(fixture.matchday)}</span><time datetime="${esc(`${fixture.date}T${fixture.kickoff}`)}">${esc(fixture.kickoff)}</time></header>
      <div class="champions-fixture-teams"><div><strong>${esc(fixture.homeTeam)}</strong><small>Forza ${scoreLabel(homeProfile)} · Casa ${ppgLabel(homeHistory?.home?.pointsPerMatch)}</small></div><span aria-hidden="true">—</span><div><strong>${esc(fixture.awayTeam)}</strong><small>Forza ${scoreLabel(awayProfile)} · Trasf. ${ppgLabel(awayHistory?.away?.pointsPerMatch)}</small></div></div>
      <footer><span>${esc(technicalEdge(fixture,profiles))}</span><div class="champions-probability"><b title="Confidenza storica ${esc(prediction?.confidenceLabel||"N/D")}">${esc(probabilityLabel(prediction,context))}</b><small>${esc(contextStatusLabel(fixture,context))}</small></div></footer>
    </article>`;
  }

  function fixtureGroups(fixtures,profiles,histories,predictions,contexts){
    if(!fixtures.length)return `<div class="champions-empty"><strong>Nessuna partita</strong><p>Modifica i filtri per visualizzare un altro gruppo di gare.</p></div>`;
    const groups=new Map();
    for(const fixture of fixtures){
      const key=`${fixture.matchday}|${fixture.date}`;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(fixture);
    }
    return [...groups.entries()].map(([key,items])=>{
      const [matchday,date]=key.split("|");
      return `<section class="champions-fixture-day"><header><div><p>${matchdayLabel(Number(matchday))}</p><h3>${esc(dayLabel(date))}</h3></div><span>${items.length} ${items.length===1?"partita":"partite"}</span></header><div class="champions-fixture-grid">${items.map(fixture=>fixtureCard(fixture,profiles,histories,predictions,contexts)).join("")}</div></section>`;
    }).join("");
  }

  function strengthDirectory(strength){
    const rows=strength.teams.map((profile,index)=>`<tr><td>${index+1}</td><th scope="row">${esc(profile.team)}<small>${esc(profile.association)}</small></th><td>${profile.uefaRank==null?"N/D":`#${profile.uefaRank}`}</td><td>${esc(profile.lastSeason)}</td><td><strong>${scoreLabel(profile)}</strong></td><td>${profile.dataCoveragePct}%</td></tr>`).join("");
    return `<details class="champions-strength-panel"><summary><span><small>Profilo descrittivo</small><strong>Indice di forza europeo</strong></span><span>${strength.summary.completeProfiles}/36 profili completi</span></summary><div class="champions-strength-intro"><p>Confronto sintetico tra ranking UEFA quinquennale e percorso europeo 2025/26. I dati mancanti non valgono zero; questo indice resta distinto dal modello probabilistico validato qui sotto.</p><a href="${esc(strength.source.url)}" target="_blank" rel="noreferrer">Profili UEFA ↗</a></div><div class="champions-strength-table-wrap"><table class="champions-strength-table"><thead><tr><th>Pos.</th><th>Squadra</th><th>Ranking UEFA</th><th>Ultima stagione europea</th><th>Forza</th><th>Copertura</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }

  function modelAudit(model){
    const overall=model.validation.model,baseline=model.validation.baseline,ucl=model.validation.championsModel,uclBaseline=model.validation.championsBaseline;
    return `<details class="champions-strength-panel champions-model-panel" open><summary><span><small>Modello 1/X/2 sperimentale</small><strong>Probabilità validate sullo storico</strong></span><span>${model.fixtures.length} gare con percentuali</span></summary><div class="champions-model-body"><p>${esc(model.warning)}</p><div class="champions-model-metrics"><div><small>Test finale</small><strong>${overall.matches}</strong><span>gare 2025/26</span></div><div><small>Log-loss totale</small><strong>${overall.logLoss.toFixed(3)}</strong><span>baseline ${baseline.logLoss.toFixed(3)}</span></div><div><small>Log-loss UCL</small><strong>${ucl.logLoss.toFixed(3)}</strong><span>baseline ${uclBaseline.logLoss.toFixed(3)}</span></div><div><small>Accuratezza UCL</small><strong>${ucl.accuracyPct.toFixed(2)}%</strong><span>${ucl.matches} gare</span></div><div><small>Errore calibrazione UCL</small><strong>${(ucl.calibrationError*100).toFixed(2)}%</strong><span>soglia 6%</span></div></div><p class="champions-model-note">Il test è cronologico: parametri scelti sul 2024/25 e congelati sul 2025/26. Le percentuali non sono quote e non costituiscono certezza sul risultato.</p></div></details>`;
  }

  function contextAudit(context){
    return `<details class="champions-strength-panel champions-context-panel" open><summary><span><small>Contesto prepartita</small><strong>Forma e carico: aggiornamento finale pendente</strong></span><span>${context.summary.pendingTeams}/36 squadre in attesa</span></summary><div class="champions-model-body"><p>Prima dell’inizio della Champions ogni squadra disputerà ancora una partita. Per evitare una fotografia già vecchia, forma recente e giorni di riposo verranno chiusi soltanto dopo queste gare.</p><div class="champions-model-metrics champions-context-metrics"><div><small>Squadre in attesa</small><strong>${context.summary.pendingTeams}</strong><span>su ${context.summary.teams}</span></div><div><small>Gare residue</small><strong>${context.summary.remainingMatchesPerPendingTeam}</strong><span>per squadra</span></div><div><small>Correzioni applicate</small><strong>${context.summary.adjustedFixtures}</strong><span>nessun dato parziale</span></div><div><small>Limite futuro</small><strong>±${context.updatePolicy.maximumProbabilityShiftPctPoints}</strong><span>punti percentuali</span></div></div><p class="champions-model-note">Saranno acquisiti risultati recenti, sede, giorni di riposo e congestione. I valori mancanti resteranno N/D; la motivazione sarà aggiunta soltanto quando esisterà un contesto di classifica significativo.</p></div></details>`;
  }

  function historyDirectory(history){
    const rows=history.teams.map(profile=>`<tr><th scope="row">${esc(profile.team)}<small>${profile.overall.matches} gare · ${profile.seasonsPlayed} ${profile.seasonsPlayed===1?"stagione":"stagioni"}${profile.competitionsPlayed.length?` · ${esc(profile.competitionsPlayed.join("/"))}`:""}</small></th><td><strong>${ppgLabel(profile.overall.pointsPerMatch)}</strong></td><td>${ppgLabel(profile.levelAdjustedPointsPerMatch)}</td><td>${ppgLabel(profile.home.pointsPerMatch)}</td><td>${ppgLabel(profile.away.pointsPerMatch)}</td><td>${ppgLabel(profile.recent10.pointsPerMatch)}</td><td>${ppgLabel(profile.averageOpponentPointsPerMatch)}</td><td>${esc(profile.progression.label)}</td><td>${profile.coverage==="sufficient"?"Sufficiente":profile.coverage==="limited"?"Limitata":"N/D"}</td></tr>`).join("");
    const sourceLinks=["Champions League","UEFA Europa League","UEFA Conference League"].map(competition=>history.source.pages.find(item=>item.competition===competition&&item.season==="2025-26")).filter(Boolean).map(item=>`<a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.competition.replace("UEFA ",""))} ↗</a>`).join("");
    return `<details class="champions-strength-panel champions-history-panel"><summary><span><small>${history.summary.historicalMatches} risultati ufficiali</small><strong>Rendimento europeo 2023/24–2025/26</strong></span><span>${history.summary.sufficient} campioni sufficienti · ${history.summary.limited} limitati · ${history.summary.unavailable} N/D</span></summary><div class="champions-strength-intro"><p>Champions, Europa e Conference sui 90 minuti. Pesi provvisori: UCL 1,00 · UEL 0,78 · UECL 0,62. Casa, trasferta, ultime dieci e avversari restano indicatori descrittivi, non probabilità.</p><span class="champions-source-links">${sourceLinks}</span></div><div class="champions-strength-table-wrap"><table class="champions-strength-table champions-history-table"><thead><tr><th>Squadra</th><th>P/G</th><th>P/G pond.</th><th>Casa</th><th>Trasf.</th><th>Ultime 10</th><th>Avversari</th><th>Progressione</th><th>Campione</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }

  async function render(){
    const [data,strength,history,model,context]=await Promise.all([load("champions-league-2026-27.json"),load("champions-team-strength-2026-27.json"),load("uefa-team-history-2026-27.json"),load("champions-1x2-2026-27.json"),load("champions-pre-match-context-2026-27.json")]);
    const profiles=new Map(strength.teams.map(profile=>[profile.team,profile]));
    const histories=new Map(history.teams.map(profile=>[profile.team,profile]));
    const predictions=new Map(model.fixtures.map(prediction=>[prediction.fixtureId,prediction]));
    const contexts=new Map(context.fixtures.map(item=>[item.fixtureId,item]));
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
      ${contextAudit(context)}
      ${modelAudit(model)}
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
      results.innerHTML=fixtureGroups(filtered,profiles,histories,predictions,contexts);
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
