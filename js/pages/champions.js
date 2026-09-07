export function createPage(deps){
  const {esc,load}=deps;
  const dayLabel=value=>new Intl.DateTimeFormat("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Rome"}).format(new Date(`${value}T12:00:00+01:00`));
  const matchdayLabel=number=>`${number}ª giornata`;
  const shortDate=value=>new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Rome"}).format(new Date(`${value}T12:00:00Z`));

  const scoreLabel=profile=>profile?.europeanStrengthIndex==null?"N/D":profile.europeanStrengthIndex.toFixed(1);
  const ppgLabel=value=>value==null?"N/D":value.toFixed(2);
  const teamBadge=(teamName,branding)=>{
    const team=branding.get(teamName);
    const initials=team?.shortName||teamName.split(/\s+/).map(part=>part[0]).join("").slice(0,3).toUpperCase();
    return `<span class="team-with-logo"><span class="team-logo"><img src="${esc(team?.logo||"")}" alt="Stemma ${esc(teamName)}" loading="lazy" onerror="this.hidden=true;this.parentElement.classList.add('fallback')"><b>${esc(initials)}</b></span><span class="team-name">${esc(teamName)}</span></span>`;
  };

  function fixtureCard(fixture,branding){
    return `<article class="reading-fixture match fixture-card champions-fixture" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}" style="--home-color-1:#105ac5;--home-color-2:#052b78;--away-color-1:#1879d5;--away-color-2:#061a57"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata ${fixture.matchday}</span></div><time class="match-date" datetime="${esc(`${fixture.date}T${fixture.kickoff}`)}">${esc(shortDate(fixture.date))} · ${esc(fixture.kickoff)}</time></header><span class="reading-fixture-teams">${teamBadge(fixture.homeTeam,branding)}<b>VS</b>${teamBadge(fixture.awayTeam,branding)}</span></article>`;
  }

  function fixtureGroups(fixtures,branding){
    if(!fixtures.length)return `<div class="champions-empty"><strong>Nessuna partita</strong><p>Modifica i filtri per visualizzare un altro gruppo di gare.</p></div>`;
    const groups=new Map();
    for(const fixture of fixtures){
      const key=`${fixture.matchday}|${fixture.date}`;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(fixture);
    }
    return [...groups.entries()].map(([key,items])=>{
      const [matchday,date]=key.split("|");
      return `<section class="champions-fixture-day"><header><div><p>${matchdayLabel(Number(matchday))}</p><h3>${esc(dayLabel(date))}</h3></div><span>${items.length} ${items.length===1?"partita":"partite"}</span></header><div class="champions-fixture-grid">${items.map(fixture=>fixtureCard(fixture,branding)).join("")}</div></section>`;
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

  const resultSelection=fixture=>[
    ["1",fixture.probabilities.home,fixture.homeTeam],
    ["X",fixture.probabilities.draw,"Pareggio"],
    ["2",fixture.probabilities.away,fixture.awayTeam]
  ].sort((a,b)=>b[1]-a[1])[0];

  function pilotForecasts(pilot,backtest,branding){
    const cards=pilot.fixtures.map(fixture=>{
      const selection=resultSelection(fixture);
      const confidence=fixture.confidence==="high"?"Alta":fixture.confidence==="medium"?"Media":fixture.confidence==="low"?"Bassa":"N/D";
      return `<a class="reading-fixture match fixture-card fixture-card-link champions-pilot-card" href="champions-league.html?match=${esc(fixture.fixtureId)}" aria-label="Apri la lettura di ${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}" style="--home-color-1:#105ac5;--home-color-2:#052b78;--away-color-1:#1879d5;--away-color-2:#061a57"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata 1</span></div><span class="match-date">${esc(shortDate(fixture.date))} · ${esc(fixture.kickoff)}</span></header><span class="reading-fixture-teams">${teamBadge(fixture.homeTeam,branding)}<b>VS</b>${teamBadge(fixture.awayTeam,branding)}</span><span class="reading-fixture-preview" aria-label="Anteprima della lettura"><span><small>Verdetto</small><strong>${esc(selection[0])} · ${esc(selection[2])}</strong></span><span><small>Risultato</small><strong>${esc(fixture.exactScores[0]?.score||"N/D")}</strong></span><span><small>Confidenza</small><strong>${confidence}</strong></span></span></a>`;
    }).join("");
    const validation=[["Tiri",backtest.metrics.totalShots],["Tiri in porta",backtest.metrics.shotsOnTarget],["Corner",backtest.metrics.wonCorners],["Gialli",backtest.metrics.yellowCards]].map(([label,result])=>`<div><small>${label}</small><strong>MAE ${result.mae.toFixed(2)}</strong><span>${result.maeImprovementPct>0?"+":""}${result.maeImprovementPct.toFixed(1)}% vs media campionato</span></div>`).join("");
    return `<section class="champions-pilot" aria-labelledby="champions-pilot-title"><header><div><p class="eyebrow">Prima giornata · letture</p><h2 id="champions-pilot-title">Analisi delle italiane</h2><p>Apri una partita per consultare 1X2, gol attesi, tiri, tiri in porta, corner e cartellini in una lettura dedicata.</p></div><span>${pilot.coverage.completeSourceMatches} referti completi<br>${pilot.coverage.oddsMatched}/4 quote collegate</span></header><div class="champions-pilot-validation"><p><strong>Test cronologico 2026/27</strong><span>Solo dati disponibili prima di ogni gara · ${backtest.metrics.totalShots.samples} osservazioni squadra</span></p>${validation}</div><div class="champions-pilot-grid">${cards}</div><p class="champions-pilot-note">Le anteprime mostrano il segnale centrale del modello. Quote, limiti del campione e intervalli completi sono riportati dentro ogni lettura.</p></section>`;
  }

  function pilotReadingDetail(fixture,pilot,backtest,squads){
    const teamProjection=team=>`<article class="prediction-team-volume champions-reading-team-volume"><header><span>${team.venue==="home"?"Casa":"Trasferta"}</span><h3>${esc(team.team)}</h3></header><div class="prediction-volume-metrics"><div><span>Gol attesi</span><strong>${team.expectedGoals.toFixed(2)}</strong></div><div><span>Tiri totali</span><strong>${esc(metricValue(team.shotsTotal))}</strong></div><div><span>Tiri nello specchio</span><strong>${esc(metricValue(team.shotsOnTarget))}</strong></div><div><span>Corner</span><strong>${esc(metricValue(team.corners))}</strong></div><div><span>Falli</span><strong>${esc(metricValue(team.fouls))}</strong></div><div><span>Cartellini</span><strong>${esc(metricValue(team.cards))}</strong></div></div></article>`;
    const scoreCards=fixture.exactScores.map((score,index)=>`<div class="${index===0?"is-central":""}"><strong>${esc(score.score)}</strong><small>${index===0?"Più atteso":"Alternativa"} · ${score.probabilityPct.toFixed(1)}%</small></div>`).join("");
    const selection=resultSelection(fixture);
    const probabilityCards=fixture.market.result1x2.map(row=>`<article><span>${esc(row.selection)}</span><strong>${row.modelPct.toFixed(1)}%</strong><small>Quota Sisal ${row.odds.toFixed(2)} · scarto ${row.edgePct>0?"+":""}${row.edgePct.toFixed(1)} pp</small></article>`).join("");
    const marketRows=(rows,label)=>rows.map(row=>`<article><span>${label} ${row.threshold.toFixed(1)}</span><strong>${row.overPct.toFixed(1)}%</strong><small>Under ${row.underPct.toFixed(1)}%${row.market?` · quota O ${row.market.overOdds.toFixed(2)}`:" · quota N/D"}</small></article>`).join("");
    const squadCard=team=>`<article class="reading-evidence-card champions-reading-evidence"><div><span>${team.team===fixture.homeTeam?"Casa":"Trasferta"}</span><h3>${esc(team.team)}</h3></div><dl><div><dt>Allenatore</dt><dd>${esc(team.coach||"N/D")}</dd></div><div><dt>Rosa UEFA</dt><dd>${team.counts.total} registrati${team.counts.listB?` · ${team.counts.listB} Lista B`:""}</dd></div><div><dt>Disponibilità gara</dt><dd>N/D</dd></div></dl></article>`;
    const relatedTeams=[fixture.homeTeam,fixture.awayTeam].map(name=>squads.teams.find(team=>team.team===name)).filter(Boolean);
    const relatedSquads={...squads,teams:relatedTeams,summary:{...squads.summary,teams:relatedTeams.length,players:relatedTeams.reduce((sum,team)=>sum+team.counts.total,0)}};
    return `<nav class="reading-back champions-reading-back"><a href="champions-league.html">← Tutte le letture Champions</a><span>1ª giornata</span></nav>
      <section class="reading-match-hero champions-reading-match-hero" aria-labelledby="champions-reading-title"><div><p class="eyebrow">UEFA Champions League · prepartita</p><h1 id="champions-reading-title">${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}</h1><p>${esc(dayLabel(fixture.date))} · ${esc(fixture.kickoff)}</p></div><div class="reading-matchup champions-reading-matchup" aria-label="${esc(fixture.homeTeam)} contro ${esc(fixture.awayTeam)}"><span><small>Casa</small><strong>${esc(fixture.homeTeam)}</strong></span><b>VS</b><span><small>Trasferta</small><strong>${esc(fixture.awayTeam)}</strong></span></div><div class="reading-summary reading-summary-prototype reading-hero-summary reading-result-summary champions-reading-summary"><div class="reading-exact-scores"><span>3 risultati esatti possibili</span><div class="reading-score-list">${scoreCards}</div></div><div class="reading-hero-signal"><span>Esito più probabile</span><strong>${esc(selection[0])}</strong><small>${esc(selection[2])} · ${selection[1].toFixed(1)}%</small></div><div class="reading-hero-signal"><span>Confidenza</span><strong>${fixture.confidence==="medium"?"Media":esc(fixture.confidence||"N/D")}</strong><small>Pilot statistico</small></div></div></section>
      <aside class="reading-prototype-banner champions-reading-warning"><strong>Lettura sperimentale</strong><p>${esc(pilot.warning)}</p></aside>
      <section class="section reading-info-grid champions-reading-info"><article class="round16-info-box round16-formations"><span>1</span><h2>Sistemi di riferimento</h2><div class="reading-base-shape"><strong>${esc(fixture.homeTeam)} · N/D</strong><p>Probabile formazione non integrata</p></div><div class="reading-base-shape"><strong>${esc(fixture.awayTeam)} · N/D</strong><p>Probabile formazione non integrata</p></div></article><div class="reading-context-rail" aria-label="Contesto squadre">${relatedTeams.map(squadCard).join("")}</div></section>
      <section class="section reading-projection-prototype prediction-volume-section champions-reading-volume"><header class="section-heading"><div><p class="eyebrow">Proiezione per squadra</p><h2>Gol, tiri, specchio, corner, falli e cartellini</h2></div><p>Valore centrale · intervallo storico p20–p80.</p></header><div class="prediction-volume-grid">${fixture.teamProjections.map(teamProjection).join("")}</div><p class="objective-method">Campioni squadra: ${fixture.dataQuality.teamSamples.join(" / ")} gare. Quote sui volumi, arbitro e probabili formazioni restano N/D.</p></section>
      <section class="section reading-panel-grid champions-reading-market-grid"><section class="reading-data-panel champions-reading-market-panel"><span>1X2</span><h2>Esito della partita</h2><div class="champions-reading-market-list">${probabilityCards}</div></section><section class="reading-data-panel champions-reading-market-panel"><span>Gol</span><h2>Over/Under</h2><div class="champions-reading-market-list">${marketRows(fixture.goals,"Over")}</div></section><section class="reading-data-panel champions-reading-market-panel"><span>Disciplina</span><h2>Over cartellini</h2><div class="champions-reading-market-list">${marketRows(fixture.cards.lines,"Over")}</div><p>${esc(fixture.cards.refereeStatus)}</p></section></section>
      <section class="section champions-reading-validation"><header class="section-heading"><div><p class="eyebrow">Controllo del modello</p><h2>Validazione storica</h2></div><p>Errore assoluto medio sul test cronologico.</p></header><div class="champions-reading-method"><div><small>Tiri totali</small><strong>MAE ${backtest.metrics.totalShots.mae.toFixed(2)}</strong></div><div><small>Tiri in porta</small><strong>MAE ${backtest.metrics.shotsOnTarget.mae.toFixed(2)}</strong></div><div><small>Corner</small><strong>MAE ${backtest.metrics.wonCorners.mae.toFixed(2)}</strong></div><div><small>Gialli</small><strong>MAE ${backtest.metrics.yellowCards.mae.toFixed(2)}</strong></div></div></section>
      ${registeredSquadsDirectory(relatedSquads,{detail:true})}`;
  }

  function registeredSquadsDirectory(squads,{detail=false}={}){
    const positionOrder=["goalkeeper","defender","midfielder","forward","unknown"];
    const cards=squads.teams.map(team=>{
      const groups=positionOrder.map(position=>{
        const players=team.players.filter(player=>(player.position||"unknown")===position);
        if(!players.length)return "";
        return `<section class="champions-squad-group"><h4>${esc(squads.positionLegend[position])}<span>${players.length}</span></h4><ul>${players.map(player=>`<li><span>${esc(player.name)}</span>${player.registrationList==="B"?'<em title="Marcato come Lista B dalla fonte ufficiale">Lista B</em>':""}</li>`).join("")}</ul></section>`;
      }).join("");
      const sources=team.sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.provider)} ↗</a>`).join("");
      return `<details class="champions-squad-card" data-squad-team="${esc(team.team)}"><summary><span><small>${team.counts.total} registrati${team.counts.listB?` · ${team.counts.listB} Lista B`:""}</small><strong>${esc(team.team)}</strong></span><span>${team.sourceNote?'Verifica fonte aperta':'Fonte ufficiale'}</span></summary><div class="champions-squad-card-body"><div class="champions-squad-meta"><p>Allenatore: <strong>${esc(team.coach||"N/D")}</strong></p><span>${sources}</span></div><a class="champions-team-open" href="champions-league.html?team=${esc(team.id)}">Apri scheda squadra <b aria-hidden="true">→</b></a>${team.sourceNote?`<p class="champions-squad-alert"><strong>Discrepanza segnalata.</strong> ${esc(team.sourceNote)}</p>`:""}<div class="champions-squad-groups">${groups}</div></div></details>`;
    }).join("");
    return `<section class="champions-squads${detail?" champions-squads-detail":""}" aria-labelledby="champions-squads-title"><header><div><p class="eyebrow">${detail?"Contesto della partita":`${squads.summary.teams} squadre · fase campionato`}</p><h2 id="champions-squads-title">Rose registrate UEFA</h2><p>${esc(squads.statusNote)}</p></div><span><strong>${squads.summary.players}</strong> giocatori<br>snapshot ${esc(shortDate(squads.snapshotDate))}</span></header><div class="champions-squad-notice"><strong>Attenzione alla lettura:</strong> “registrato” non significa convocato, disponibile o titolare per la prossima gara. Questi dati non modificano ancora i pronostici.</div><div class="champions-squad-grid">${cards}</div><p class="champions-squad-footnote">La sigla Lista B compare solo quando è esplicitamente marcata dalla fonte UEFA; in assenza del marcatore il campo resta non classificato, senza dedurre automaticamente Lista A.</p></section>`;
  }

  function championsTeamDetail(team,strength,history,pilot,squads){
    const roleLabel=position=>({goalkeeper:"Portiere",defender:"Difensore",midfielder:"Centrocampista",forward:"Attaccante"}[position]||"N/D");
    const fixture=pilot.fixtures.find(item=>item.homeTeam===team.team||item.awayTeam===team.team);
    const playerRows=team.players.map(player=>`<tr><th scope="row">${esc(player.name)}${player.registrationList==="B"?"<em>Lista B</em>":""}</th><td>${esc(roleLabel(player.position))}</td><td>Registrato</td><td>${esc(player.availability.status||"N/D")}</td><td>${esc(player.matchCallup.status||"N/D")}</td><td>${player.statistics.appearances??"N/D"}</td><td>${player.statistics.minutes??"N/D"}</td></tr>`).join("");
    const strengthValue=strength?.europeanStrengthIndex==null?"N/D":strength.europeanStrengthIndex.toFixed(1);
    const historyValue=history?.overall?.pointsPerMatch==null?"N/D":history.overall.pointsPerMatch.toFixed(2);
    return `<nav class="champions-reading-back"><a href="champions-league.html">← Champions League</a><span>Scheda squadra</span></nav><section class="champions-team-hero"><div><p class="eyebrow">UEFA Champions League 2026/27</p><h1>${esc(team.team)}</h1><p>Allenatore: ${esc(team.coach||"N/D")}</p></div><div><small>Rosa registrata</small><strong>${team.counts.total}</strong><span>${team.counts.listB} Lista B</span></div></section><section class="champions-team-status" aria-label="Stato dati squadra"><article><small>Registrazione UEFA</small><strong>Integrata</strong><span>${esc(shortDate(team.registration.updatedAt))}</span></article><article><small>Disponibilità</small><strong>N/D</strong><span>Nessuna deduzione</span></article><article><small>Probabile formazione</small><strong>N/D</strong><span>Fonte non integrata</span></article><article><small>Convocati gara</small><strong>N/D</strong><span>Non pubblicati nel dataset</span></article><article><small>Distinta ufficiale</small><strong>N/D</strong><span>Da aggiornare a ridosso della gara</span></article></section><section class="champions-team-overview"><article><small>Indice europeo</small><strong>${strengthValue}</strong><span>${strength?.dataCoveragePct??"N/D"}% copertura</span></article><article><small>Punti/gara europei</small><strong>${historyValue}</strong><span>${history?.overall?.matches??"N/D"} gare storiche</span></article><article><small>Prossima lettura</small><strong>${fixture?`${esc(fixture.homeTeam)} – ${esc(fixture.awayTeam)}`:"N/D"}</strong>${fixture?`<a href="champions-league.html?match=${esc(fixture.fixtureId)}">Apri lettura →</a>`:"<span>Nessuna lettura pilot</span>"}</article></section>${registeredSquadsDirectory({...squads,teams:[team],summary:{...squads.summary,teams:1,players:team.counts.total}},{detail:true})}<section class="champions-team-players"><header><div><p class="eyebrow">Profili iniziali</p><h2>Giocatori</h2></div><p>La struttura è pronta per statistiche, disponibilità e convocazioni. I campi non ancora verificati restano N/D.</p></header><div class="champions-strength-table-wrap"><table><thead><tr><th>Giocatore</th><th>Ruolo</th><th>UEFA</th><th>Disponibilità</th><th>Convocazione</th><th>Presenze</th><th>Minuti</th></tr></thead><tbody>${playerRows}</tbody></table></div></section>`;
  }

  function historyDirectory(history){
    const rows=history.teams.map(profile=>`<tr><th scope="row">${esc(profile.team)}<small>${profile.overall.matches} gare · ${profile.seasonsPlayed} ${profile.seasonsPlayed===1?"stagione":"stagioni"}${profile.competitionsPlayed.length?` · ${esc(profile.competitionsPlayed.join("/"))}`:""}</small></th><td><strong>${ppgLabel(profile.overall.pointsPerMatch)}</strong></td><td>${ppgLabel(profile.levelAdjustedPointsPerMatch)}</td><td>${ppgLabel(profile.home.pointsPerMatch)}</td><td>${ppgLabel(profile.away.pointsPerMatch)}</td><td>${ppgLabel(profile.recent10.pointsPerMatch)}</td><td>${ppgLabel(profile.averageOpponentPointsPerMatch)}</td><td>${esc(profile.progression.label)}</td><td>${profile.coverage==="sufficient"?"Sufficiente":profile.coverage==="limited"?"Limitata":"N/D"}</td></tr>`).join("");
    const sourceLinks=["Champions League","UEFA Europa League","UEFA Conference League"].map(competition=>history.source.pages.find(item=>item.competition===competition&&item.season==="2025-26")).filter(Boolean).map(item=>`<a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.competition.replace("UEFA ",""))} ↗</a>`).join("");
    return `<details class="champions-strength-panel champions-history-panel"><summary><span><small>${history.summary.historicalMatches} risultati ufficiali</small><strong>Rendimento europeo 2023/24–2025/26</strong></span><span>${history.summary.sufficient} campioni sufficienti · ${history.summary.limited} limitati · ${history.summary.unavailable} N/D</span></summary><div class="champions-strength-intro"><p>Champions, Europa e Conference sui 90 minuti. Pesi provvisori: UCL 1,00 · UEL 0,78 · UECL 0,62. Casa, trasferta, ultime dieci e avversari restano indicatori descrittivi, non probabilità.</p><span class="champions-source-links">${sourceLinks}</span></div><div class="champions-strength-table-wrap"><table class="champions-strength-table champions-history-table"><thead><tr><th>Squadra</th><th>P/G</th><th>P/G pond.</th><th>Casa</th><th>Trasf.</th><th>Ultime 10</th><th>Avversari</th><th>Progressione</th><th>Campione</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }

  async function render(){
    const requestedMatchId=new URLSearchParams(location.search).get("match");
    const requestedTeamId=new URLSearchParams(location.search).get("team");
    const [data,strength,history,model,context,h2h,pilot,backtest,squads]=await Promise.all([load("champions-league-2026-27.json"),load("champions-team-strength-2026-27.json"),load("uefa-team-history-2026-27.json"),load("champions-1x2-2026-27.json"),load("champions-pre-match-context-2026-27.json"),load("champions-head-to-head-2026-27.json"),load("champions-pilot-predictions-2026-27.json"),load("champions-pilot-volume-backtest.json"),load("champions-registered-squads-2026-27.json")]);
    const profiles=new Map(strength.teams.map(profile=>[profile.team,profile]));
    const histories=new Map(history.teams.map(profile=>[profile.team,profile]));
    const requestedFixture=requestedMatchId?pilot.fixtures.find(fixture=>fixture.fixtureId===requestedMatchId):null;
    if(requestedFixture){
      document.querySelector("#app").innerHTML=pilotReadingDetail(requestedFixture,pilot,backtest,squads);
      return;
    }
    const requestedTeam=requestedTeamId?squads.teams.find(team=>team.id===requestedTeamId):null;
    if(requestedTeam){
      document.querySelector("#app").innerHTML=championsTeamDetail(requestedTeam,profiles.get(requestedTeam.team),histories.get(requestedTeam.team),pilot,squads);
      return;
    }
    const branding=new Map(data.teamBranding.map(team=>[team.team,team]));
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
      ${pilotForecasts(pilot,backtest,branding)}
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
      results.innerHTML=fixtureGroups(filtered,branding);
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
