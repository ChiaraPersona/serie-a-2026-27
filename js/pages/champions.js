export function createPage(deps){
  const {esc,load}=deps;
  const dayLabel=value=>new Intl.DateTimeFormat("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Rome"}).format(new Date(`${value}T12:00:00+01:00`));
  const matchdayLabel=number=>`${number}ª giornata`;
  const shortDate=value=>new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Rome"}).format(new Date(`${value}T12:00:00Z`));

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

  function headToHeadBlock(fixture,h2h){
    if(!h2h?.meetings)return `<p class="champions-h2h-empty">H2H UEFA dal 2020/21: N/D</p>`;
    const summary=`${h2h.meetings} ${h2h.meetings===1?"precedente":"precedenti"} · ${fixture.homeTeam} ${h2h.homeWins}V · ${h2h.draws}N · ${fixture.awayTeam} ${h2h.awayWins}V`;
    const rows=h2h.recentMatches.map(match=>`<li><time datetime="${esc(match.date)}">${esc(shortDate(match.date))}</time><span>${esc(match.homeTeam)} <strong>${match.score90.home}-${match.score90.away}</strong> ${esc(match.awayTeam)}</span><small>${esc(match.competition.replace("UEFA ",""))}</small></li>`).join("");
    return `<details class="champions-h2h"><summary>${esc(summary)}</summary><ul>${rows}</ul></details>`;
  }

  function fixtureCard(fixture,profiles,histories,predictions,contexts,headToHeads){
    const homeProfile=profiles.get(fixture.homeTeam),awayProfile=profiles.get(fixture.awayTeam);
    const homeHistory=histories.get(fixture.homeTeam),awayHistory=histories.get(fixture.awayTeam);
    const prediction=predictions.get(fixture.id);
    const context=contexts.get(fixture.id);
    const h2h=headToHeads.get(fixture.id);
    return `<article class="champions-fixture" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}" data-context-status="${esc(context?.contextStatus||"unknown")}">
      <header><span>${matchdayLabel(fixture.matchday)}</span><time datetime="${esc(`${fixture.date}T${fixture.kickoff}`)}">${esc(fixture.kickoff)}</time></header>
      <div class="champions-fixture-teams"><div><strong>${esc(fixture.homeTeam)}</strong><small>Forza ${scoreLabel(homeProfile)} · Casa ${ppgLabel(homeHistory?.home?.pointsPerMatch)}</small></div><span aria-hidden="true">—</span><div><strong>${esc(fixture.awayTeam)}</strong><small>Forza ${scoreLabel(awayProfile)} · Trasf. ${ppgLabel(awayHistory?.away?.pointsPerMatch)}</small></div></div>
      ${headToHeadBlock(fixture,h2h)}
      <footer><span>${esc(technicalEdge(fixture,profiles))}</span><div class="champions-probability"><b title="Confidenza storica ${esc(prediction?.confidenceLabel||"N/D")}">${esc(probabilityLabel(prediction,context))}</b><small>${esc(contextStatusLabel(fixture,context))}</small></div></footer>
    </article>`;
  }

  function fixtureGroups(fixtures,profiles,histories,predictions,contexts,headToHeads){
    if(!fixtures.length)return `<div class="champions-empty"><strong>Nessuna partita</strong><p>Modifica i filtri per visualizzare un altro gruppo di gare.</p></div>`;
    const groups=new Map();
    for(const fixture of fixtures){
      const key=`${fixture.matchday}|${fixture.date}`;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(fixture);
    }
    return [...groups.entries()].map(([key,items])=>{
      const [matchday,date]=key.split("|");
      return `<section class="champions-fixture-day"><header><div><p>${matchdayLabel(Number(matchday))}</p><h3>${esc(dayLabel(date))}</h3></div><span>${items.length} ${items.length===1?"partita":"partite"}</span></header><div class="champions-fixture-grid">${items.map(fixture=>fixtureCard(fixture,profiles,histories,predictions,contexts,headToHeads)).join("")}</div></section>`;
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
    return `<details class="champions-strength-panel champions-context-panel"><summary><span><small>Contesto generale · snapshot 2 settembre</small><strong>Forma e carico delle 36 squadre da aggiornare</strong></span><span>${context.summary.pendingTeams}/36 stati ancora pendenti</span></summary><div class="champions-model-body"><p>Questo riepilogo generale è fermo al 2 settembre e non viene presentato come attuale. Il pilot delle quattro italiane qui sotto usa invece referti aggiornati al 6 settembre; l’estensione alle altre 28 squadre resta pendente.</p><div class="champions-model-metrics champions-context-metrics"><div><small>Stati da aggiornare</small><strong>${context.summary.pendingTeams}</strong><span>su ${context.summary.teams}</span></div><div><small>Snapshot</small><strong>02/09</strong><span>non corrente</span></div><div><small>Correzioni applicate</small><strong>${context.summary.adjustedFixtures}</strong><span>nessun dato parziale</span></div><div><small>Limite futuro</small><strong>±${context.updatePolicy.maximumProbabilityShiftPctPoints}</strong><span>punti percentuali</span></div></div><p class="champions-model-note">Gli H2H UEFA dal 2020/21 restano descrittivi e non modificano le percentuali. I valori mancanti rimangono N/D.</p></div></details>`;
  }

  const metricValue=metric=>metric?`${metric.central.toFixed(1)} · ${metric.min.toFixed(1)}–${metric.max.toFixed(1)}`:"N/D";
  const probabilityRows=rows=>rows.map(row=>`<span><b>O ${row.threshold.toFixed(1)}</b>${row.overPct.toFixed(1)}%<small>${row.market?`Sisal ${row.market.overOdds.toFixed(2)} · `:""}U ${row.underPct.toFixed(1)}%</small></span>`).join("");

  function pilotForecasts(pilot,backtest){
    const cards=pilot.fixtures.map(fixture=>{
      const teams=fixture.teamProjections.map(team=>`<div class="champions-pilot-team"><h4>${esc(team.team)}</h4><dl><div><dt>Tiri totali</dt><dd>${esc(metricValue(team.shotsTotal))}</dd></div><div><dt>Tiri in porta</dt><dd>${esc(metricValue(team.shotsOnTarget))}</dd></div><div><dt>Corner</dt><dd>${esc(metricValue(team.corners))}</dd></div><div><dt>Cartellini</dt><dd>${esc(metricValue(team.cards))}</dd></div></dl></div>`).join("");
      const scores=fixture.exactScores.map(score=>`${score.score} (${score.probabilityPct.toFixed(1)}%)`).join(" · ");
      const resultOdds=fixture.market.result1x2.map(row=>`${row.selection} ${row.odds.toFixed(2)}`).join(" · ");
      return `<article class="champions-pilot-card">
        <header><div><small>${esc(shortDate(fixture.date))} · ${esc(fixture.kickoff)}</small><h3>${esc(fixture.homeTeam)} <span>–</span> ${esc(fixture.awayTeam)}</h3></div><div class="champions-pilot-result"><b>1 ${fixture.probabilities.home.toFixed(1)}% · X ${fixture.probabilities.draw.toFixed(1)}% · 2 ${fixture.probabilities.away.toFixed(1)}%</b><small>Sisal ${esc(resultOdds)}</small></div></header>
        <div class="champions-pilot-score"><div><small>Gol attesi</small><strong>${fixture.expectedGoals.home.toFixed(2)} – ${fixture.expectedGoals.away.toFixed(2)}</strong></div><p>${esc(scores)}</p></div>
        <div class="champions-pilot-teams">${teams}</div>
        <div class="champions-pilot-markets"><div><h4>Over/Under gol</h4><div>${probabilityRows(fixture.goals)}</div></div><div><h4>Over cartellini</h4><div>${probabilityRows(fixture.cards.lines)}</div><small>${esc(fixture.cards.refereeStatus)}</small></div></div>
        <footer>Campioni squadra: ${fixture.dataQuality.teamSamples.join(" / ")} gare · quote volume, arbitro e probabili XI ancora N/D</footer>
      </article>`;
    }).join("");
    const validation=[["Tiri",backtest.metrics.totalShots],["Tiri in porta",backtest.metrics.shotsOnTarget],["Corner",backtest.metrics.wonCorners],["Gialli",backtest.metrics.yellowCards]].map(([label,result])=>`<div><small>${label}</small><strong>MAE ${result.mae.toFixed(2)}</strong><span>${result.maeImprovementPct>0?"+":""}${result.maeImprovementPct.toFixed(1)}% vs media campionato</span></div>`).join("");
    return `<section class="champions-pilot" aria-labelledby="champions-pilot-title"><header><div><p class="eyebrow">Prima giornata · laboratorio</p><h2 id="champions-pilot-title">Primi pronostici quantitativi</h2><p>${esc(pilot.warning)} Gli intervalli accanto ai volumi sono stime p20–p80.</p></div><span>${pilot.coverage.completeSourceMatches} referti completi<br>${pilot.coverage.oddsMatched}/4 quote collegate</span></header><div class="champions-pilot-validation"><p><strong>Test cronologico 2026/27</strong><span>Solo dati disponibili prima di ogni gara · ${backtest.metrics.totalShots.samples} osservazioni squadra</span></p>${validation}</div><div class="champions-pilot-grid">${cards}</div><p class="champions-pilot-note">Le quote 1X2 e gol servono solo al confronto e non modificano il modello. Sisal non espone ancora, per queste quattro gare, le linee richieste su tiri di squadra, tiri in porta, corner e cartellini. I cartellini indicano il numero di gialli, non i punti cartellini.</p></section>`;
  }

  function registeredSquadsDirectory(squads){
    const positionOrder=["goalkeeper","defender","midfielder","forward","unknown"];
    const cards=squads.teams.map(team=>{
      const groups=positionOrder.map(position=>{
        const players=team.players.filter(player=>(player.position||"unknown")===position);
        if(!players.length)return "";
        return `<section class="champions-squad-group"><h4>${esc(squads.positionLegend[position])}<span>${players.length}</span></h4><ul>${players.map(player=>`<li><b>${player.number}</b><span>${esc(player.name)}</span>${player.registrationList==="B"?'<em title="Marcato come Lista B dalla fonte ufficiale">Lista B</em>':""}</li>`).join("")}</ul></section>`;
      }).join("");
      const sources=team.sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.provider)} ↗</a>`).join("");
      return `<details class="champions-squad-card" data-squad-team="${esc(team.team)}"><summary><span><small>${team.counts.total} registrati${team.counts.listB?` · ${team.counts.listB} Lista B`:""}</small><strong>${esc(team.team)}</strong></span><span>${team.sourceNote?'Verifica fonte aperta':'Fonte ufficiale'}</span></summary><div class="champions-squad-card-body"><div class="champions-squad-meta"><p>Allenatore: <strong>${esc(team.coach||"N/D")}</strong></p><span>${sources}</span></div>${team.sourceNote?`<p class="champions-squad-alert"><strong>Discrepanza segnalata.</strong> ${esc(team.sourceNote)}</p>`:""}<div class="champions-squad-groups">${groups}</div></div></details>`;
    }).join("");
    return `<section class="champions-squads" aria-labelledby="champions-squads-title"><header><div><p class="eyebrow">Pilot · 8 squadre</p><h2 id="champions-squads-title">Rose registrate UEFA</h2><p>${esc(squads.statusNote)}</p></div><span><strong>${squads.summary.players}</strong> giocatori<br>snapshot ${esc(shortDate(squads.snapshotDate))}</span></header><div class="champions-squad-notice"><strong>Attenzione alla lettura:</strong> “registrato” non significa convocato, disponibile o titolare per la prossima gara. Questi dati non modificano ancora i pronostici.</div><div class="champions-squad-grid">${cards}</div><p class="champions-squad-footnote">La sigla Lista B compare solo quando è esplicitamente marcata dalla fonte UEFA; in assenza del marcatore il campo resta non classificato, senza dedurre automaticamente Lista A.</p></section>`;
  }

  function historyDirectory(history){
    const rows=history.teams.map(profile=>`<tr><th scope="row">${esc(profile.team)}<small>${profile.overall.matches} gare · ${profile.seasonsPlayed} ${profile.seasonsPlayed===1?"stagione":"stagioni"}${profile.competitionsPlayed.length?` · ${esc(profile.competitionsPlayed.join("/"))}`:""}</small></th><td><strong>${ppgLabel(profile.overall.pointsPerMatch)}</strong></td><td>${ppgLabel(profile.levelAdjustedPointsPerMatch)}</td><td>${ppgLabel(profile.home.pointsPerMatch)}</td><td>${ppgLabel(profile.away.pointsPerMatch)}</td><td>${ppgLabel(profile.recent10.pointsPerMatch)}</td><td>${ppgLabel(profile.averageOpponentPointsPerMatch)}</td><td>${esc(profile.progression.label)}</td><td>${profile.coverage==="sufficient"?"Sufficiente":profile.coverage==="limited"?"Limitata":"N/D"}</td></tr>`).join("");
    const sourceLinks=["Champions League","UEFA Europa League","UEFA Conference League"].map(competition=>history.source.pages.find(item=>item.competition===competition&&item.season==="2025-26")).filter(Boolean).map(item=>`<a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.competition.replace("UEFA ",""))} ↗</a>`).join("");
    return `<details class="champions-strength-panel champions-history-panel"><summary><span><small>${history.summary.historicalMatches} risultati ufficiali</small><strong>Rendimento europeo 2023/24–2025/26</strong></span><span>${history.summary.sufficient} campioni sufficienti · ${history.summary.limited} limitati · ${history.summary.unavailable} N/D</span></summary><div class="champions-strength-intro"><p>Champions, Europa e Conference sui 90 minuti. Pesi provvisori: UCL 1,00 · UEL 0,78 · UECL 0,62. Casa, trasferta, ultime dieci e avversari restano indicatori descrittivi, non probabilità.</p><span class="champions-source-links">${sourceLinks}</span></div><div class="champions-strength-table-wrap"><table class="champions-strength-table champions-history-table"><thead><tr><th>Squadra</th><th>P/G</th><th>P/G pond.</th><th>Casa</th><th>Trasf.</th><th>Ultime 10</th><th>Avversari</th><th>Progressione</th><th>Campione</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }

  async function render(){
    const [data,strength,history,model,context,h2h,pilot,backtest,squads]=await Promise.all([load("champions-league-2026-27.json"),load("champions-team-strength-2026-27.json"),load("uefa-team-history-2026-27.json"),load("champions-1x2-2026-27.json"),load("champions-pre-match-context-2026-27.json"),load("champions-head-to-head-2026-27.json"),load("champions-pilot-predictions-2026-27.json"),load("champions-pilot-volume-backtest.json"),load("champions-registered-squads-2026-27.json")]);
    const profiles=new Map(strength.teams.map(profile=>[profile.team,profile]));
    const histories=new Map(history.teams.map(profile=>[profile.team,profile]));
    const predictions=new Map(model.fixtures.map(prediction=>[prediction.fixtureId,prediction]));
    const contexts=new Map(context.fixtures.map(item=>[item.fixtureId,item]));
    const headToHeads=new Map(h2h.fixtures.map(item=>[item.fixtureId,item]));
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
      ${pilotForecasts(pilot,backtest)}
      ${registeredSquadsDirectory(squads)}
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
      results.innerHTML=fixtureGroups(filtered,profiles,histories,predictions,contexts,headToHeads);
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
