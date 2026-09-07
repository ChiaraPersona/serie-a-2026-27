export function createPage(deps){
  const {esc,load}=deps;
  const dayLabel=value=>new Intl.DateTimeFormat("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Rome"}).format(new Date(`${value}T12:00:00+01:00`));
  const matchdayLabel=number=>`${number}ª giornata`;
  const shortDate=value=>new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Rome"}).format(new Date(`${value}T12:00:00Z`));

  const scoreLabel=profile=>profile?.europeanStrengthIndex==null?"N/D":profile.europeanStrengthIndex.toFixed(1);
  const ppgLabel=value=>value==null?"N/D":value.toFixed(2);
  const teamBadge=(teamName,branding,{showName=true}={})=>{
    const team=branding.get(teamName);
    const initials=team?.shortName||teamName.split(/\s+/).map(part=>part[0]).join("").slice(0,3).toUpperCase();
    return `<span class="team-with-logo"><span class="team-logo"><img src="${esc(team?.logo||"")}" alt="Stemma ${esc(teamName)}" loading="lazy" onerror="this.hidden=true;this.parentElement.classList.add('fallback')"><b>${esc(initials)}</b></span>${showName?`<span class="team-name">${esc(teamName)}</span>`:""}</span>`;
  };

  const refereeMetric=metric=>metric?`<strong class="${metric.highlight?"is-highlighted":""}">${esc(metric.display)}</strong>`:"N/D";
  const refereeName=assignment=>assignment?.status==="assigned"?`${esc(assignment.referee.name)} <span aria-label="Nazionalità">${esc(assignment.referee.countryFlag)}</span>`:"Da designare";

  function refereeAssignmentPanel(data){
    const {fixtures,refereeAssignmentsSource:source,refereeVerification:verification,refereeMethodology:methodology,refereeWatchlist:watchlist}=data;
    const assignments=fixtures.filter(fixture=>fixture.matchday===1&&fixture.refereeAssignment);
    const rows=assignments.map(fixture=>{
      const assignment=fixture.refereeAssignment,stats=assignment.statistics;
      return `<tr><td>${esc(shortDate(fixture.date).slice(0,5))}</td><th scope="row">${esc(fixture.homeTeam)} – ${esc(fixture.awayTeam)}</th><td class="champions-referee-name">${refereeName(assignment)}</td><td>${refereeMetric(stats?.yellowCardsPerMatch)}</td><td>${refereeMetric(stats?.redCardsPerMatch)}</td><td>${refereeMetric(stats?.foulsPerMatch)}</td><td>${refereeMetric(stats?.penaltiesPerMatch)}</td></tr>`;
    }).join("");
    const assigned=assignments.filter(fixture=>fixture.refereeAssignment.status==="assigned").length;
    const byId=new Map(fixtures.map(fixture=>[fixture.id,fixture]));
    const attentionCards=watchlist.map(item=>{const fixture=byId.get(item.fixtureId),assignment=fixture.refereeAssignment;return `<article><span>${esc(fixture.homeTeam)} – ${esc(fixture.awayTeam)}</span><strong>${refereeName(assignment)}</strong><p>${esc(item.reason)}</p></article>`}).join("");
    const godinho=byId.get("ucl-2026-27-md01-01").refereeAssignment.context;
    const kabakov=byId.get("ucl-2026-27-md01-05").refereeAssignment.context;
    const massa=byId.get("ucl-2026-27-md01-09").refereeAssignment.context;
    return `<section class="champions-referees" aria-labelledby="champions-referees-title"><header><div><p class="eyebrow">Prima giornata · conferma ${esc(verification.designationsProvider)}</p><h2 id="champions-referees-title">Designazioni arbitrali</h2><p>${assigned} arbitri designati su ${assignments.length} gare, confermati sulle designazioni pubblicate il ${esc(shortDate(verification.publishedAt))}. ${esc(methodology.note)}</p></div><span>${assigned}/${assignments.length}<small>designati</small></span></header><div class="champions-referee-table-wrap"><table><thead><tr><th>Data</th><th>Partita</th><th>Arbitro</th><th>G/partita</th><th>R/partita</th><th>Falli/partita</th><th>Rig/partita</th></tr></thead><tbody>${rows}</tbody></table></div><div class="champions-referee-footnotes"><p><b>* Godinho</b> ${esc(godinho.primarySample)}: 5,13 gialli, 0,04 rossi, 17,13 falli e 0,35 rigori; RefOdds arriva a ${godinho.alternateStatistics.yellowCardsPerMatch.toFixed(2).replace(".",",")} gialli/gara.</p><p><b>† Kabakov</b> Cartellini su ${kabakov.cardsSampleMatches} gare: 5,67 gialli e 0,42 rossi. Il dato falli è anomalo/incompleto e resta escluso dai pronostici sui falli.</p><p><b>‡ Massa</b> RefOdds internazionale usato per uniformità; il campione più ampio porta a ${massa.alternateStatistics.yellowCardsPerMatch.toFixed(2).replace(".",",")} gialli e ${massa.alternateStatistics.foulsPerMatch.toFixed(2).replace(".",",")} falli/gara.</p></div><section class="champions-referee-watchlist"><header><p class="eyebrow">Cartellini · falli · contesto</p><h3>Partite da monitorare</h3></header><div>${attentionCards}</div></section><p class="champions-referee-note">${esc(source.note)} I valori non disponibili restano N/D.</p></section>`;
  }

  function refereeReadingPanel(assignment){
    if(!assignment||assignment.status!=="assigned")return `<section class="section reading-referee-assignment champions-reading-referee" id="lettura-referee"><header class="section-heading"><div><p class="eyebrow">Designazione arbitrale</p><h2>Arbitro</h2></div><p>Designazione e profilo disciplinare.</p></header><div class="reading-panel-empty"><strong>N/D</strong><p>La designazione ufficiale non è ancora disponibile nel dataset.</p></div></section>`;
    const stats=assignment.statistics;
    return `<section class="section reading-referee-assignment champions-reading-referee" id="lettura-referee" aria-labelledby="champions-reading-referee-title"><header class="section-heading"><div><p class="eyebrow">Designazione arbitrale</p><h2 id="champions-reading-referee-title">${refereeName(assignment)}</h2></div><p>Designazione e profilo disciplinare.</p></header><dl><div><dt>Assistenti</dt><dd>N/D</dd></div><div><dt>IV ufficiale</dt><dd>N/D</dd></div><div><dt>VAR</dt><dd>N/D</dd></div><div><dt>AVAR</dt><dd>N/D</dd></div></dl><div class="reading-referee-stats champions-reading-referee-stats"><article><span>Gialli / gara</span>${refereeMetric(stats.yellowCardsPerMatch)}</article><article><span>Rossi / gara</span>${refereeMetric(stats.redCardsPerMatch)}</article><article><span>Falli / gara</span>${refereeMetric(stats.foulsPerMatch)}</article><article><span>Rigori / gara</span>${refereeMetric(stats.penaltiesPerMatch)}</article></div><p class="reading-referee-method">Profilo storico riportato come fornito; non applicato automaticamente alle proiezioni della partita.</p></section>`;
  }

  function fixtureCard(fixture,branding,pilotByFixture){
    const analysis=pilotByFixture.get(fixture.id);
    const refereeFooter=fixture.refereeAssignment?`<footer class="champions-referee-summary"><span>Arbitro${fixture.refereeAttention?" · da monitorare":""}</span><b>${refereeName(fixture.refereeAssignment)}</b></footer>`:"";
    if(analysis){
      const selection=resultSelection(analysis);
      const confidence=analysis.confidence==="high"?"Alta":analysis.confidence==="medium"?"Media":analysis.confidence==="low"?"Bassa":"N/D";
      return `<a class="reading-fixture match fixture-card fixture-card-link champions-fixture champions-pilot-card" href="champions-league.html?match=${esc(analysis.fixtureId)}" aria-label="Apri la lettura di ${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}" style="--home-color-1:#105ac5;--home-color-2:#052b78;--away-color-1:#1879d5;--away-color-2:#061a57"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata ${fixture.matchday}</span></div><span class="match-date">${esc(shortDate(fixture.date))} · ${esc(fixture.kickoff)}</span></header><span class="reading-fixture-teams">${teamBadge(fixture.homeTeam,branding)}<b>VS</b>${teamBadge(fixture.awayTeam,branding)}</span><span class="reading-fixture-preview" aria-label="Anteprima della lettura"><span><small>Verdetto</small><strong>${esc(selection[0])} · ${esc(selection[2])}</strong></span><span><small>Risultato</small><strong>${esc(analysis.exactScores[0]?.score||"N/D")}</strong></span><span><small>Confidenza</small><strong>${confidence}</strong></span></span>${refereeFooter}</a>`;
    }
    return `<article class="reading-fixture match fixture-card champions-fixture" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}" style="--home-color-1:#105ac5;--home-color-2:#052b78;--away-color-1:#1879d5;--away-color-2:#061a57"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata ${fixture.matchday}</span></div><time class="match-date" datetime="${esc(`${fixture.date}T${fixture.kickoff}`)}">${esc(shortDate(fixture.date))} · ${esc(fixture.kickoff)}</time></header><span class="reading-fixture-teams">${teamBadge(fixture.homeTeam,branding)}<b>VS</b>${teamBadge(fixture.awayTeam,branding)}</span>${refereeFooter}</article>`;
  }

  function fixtureGroups(fixtures,branding,pilotByFixture){
    if(!fixtures.length)return `<div class="champions-empty"><strong>Nessuna partita</strong><p>Modifica i filtri per visualizzare un altro gruppo di gare.</p></div>`;
    const groups=new Map();
    for(const fixture of fixtures){
      const key=`${fixture.matchday}|${fixture.date}`;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(fixture);
    }
    return [...groups.entries()].map(([key,items])=>{
      const [matchday,date]=key.split("|");
      return `<section class="champions-fixture-day"><header><div><p>${matchdayLabel(Number(matchday))}</p><h3>${esc(dayLabel(date))}</h3></div><span>${items.length} ${items.length===1?"partita":"partite"}</span></header><div class="champions-fixture-grid">${items.map(fixture=>fixtureCard(fixture,branding,pilotByFixture)).join("")}</div></section>`;
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

  function teamLogoDirectory(teams,squads){
    const squadIds=new Map(squads.teams.map(team=>[team.team,team.id]));
    const logos=teams.map(team=>`<a href="champions-league.html?team=${esc(squadIds.get(team.team))}" aria-label="Apri la scheda Champions di ${esc(team.team)}" title="${esc(team.team)}"><img src="${esc(team.logo)}" alt="" loading="eager"></a>`).join("");
    return `<nav id="champions-team-directory" class="champions-team-logo-directory" aria-label="Squadre della Champions League"><div class="champions-team-logo-scroll"><div class="champions-team-logo-grid">${logos}</div></div></nav>`;
  }

  const metricValue=metric=>metric?`${metric.central.toFixed(1)} · ${metric.min.toFixed(1)}–${metric.max.toFixed(1)}`:"N/D";
  const probabilityRows=rows=>rows.map(row=>`<span><b>O ${row.threshold.toFixed(1)}</b>${row.overPct.toFixed(1)}%<small>${row.market?`Sisal ${row.market.overOdds.toFixed(2)} · `:""}U ${row.underPct.toFixed(1)}%</small></span>`).join("");

  const resultSelection=fixture=>[
    ["1",fixture.probabilities.home,fixture.homeTeam],
    ["X",fixture.probabilities.draw,"Pareggio"],
    ["2",fixture.probabilities.away,fixture.awayTeam]
  ].sort((a,b)=>b[1]-a[1])[0];

  function pilotReadingDetail(fixture,pilot,backtest,squads,branding,h2h){
    const relatedTeams=[fixture.homeTeam,fixture.awayTeam].map(name=>squads.teams.find(team=>team.team===name)).filter(Boolean);
    const teamMeta=name=>relatedTeams.find(team=>team.team===name)||{};
    const scoreCards=fixture.exactScores.map((score,index)=>`<div class="${index===0?"is-central":""}"><strong>${esc(score.score)}</strong><small>${index===0?"Più atteso":"Alternativa"} · ${score.probabilityPct.toFixed(1)}%</small></div>`).join("");
    const confidence=fixture.confidence==="high"?"Alta":fixture.confidence==="medium"?"Media":fixture.confidence==="low"?"Bassa":"N/D";
    const combinedMetric=key=>{const values=fixture.teamProjections.map(team=>team[key]);return {central:values.reduce((sum,item)=>sum+item.central,0),min:values.reduce((sum,item)=>sum+item.min,0),max:values.reduce((sum,item)=>sum+item.max,0)}};
    const range=metric=>`${metric.central.toFixed(1)} <small>${metric.min.toFixed(1)}–${metric.max.toFixed(1)}</small>`;
    const matchProjectionData=fixture.matchProjection||{shotsTotal:combinedMetric("shotsTotal"),shotsOnTarget:combinedMetric("shotsOnTarget"),corners:combinedMetric("corners")};
    const matchProjection=`<article class="prediction-match-volume"><div><p class="eyebrow">Totale partita</p><h3>Volumi combinati</h3><small>Valore centrale · intervallo storico p20–p80</small></div><dl><div><dt>Tiri totali</dt><dd>${range(matchProjectionData.shotsTotal)}</dd></div><div><dt>Tiri nello specchio</dt><dd>${range(matchProjectionData.shotsOnTarget)}</dd></div><div><dt>Corner</dt><dd>${range(matchProjectionData.corners)}</dd></div></dl></article>`;
    const teamProjection=team=>`<article class="prediction-team-volume champions-reading-team-volume">${teamBadge(team.team,branding)}<div class="prediction-volume-metrics"><div><span>Gol attesi</span><strong>${team.expectedGoals.toFixed(2)}</strong></div><div><span>Tiri totali</span><strong>${esc(metricValue(team.shotsTotal))}</strong></div><div><span>Tiri nello specchio</span><strong>${esc(metricValue(team.shotsOnTarget))}</strong></div><div><span>Corner</span><strong>${esc(metricValue(team.corners))}</strong></div><div><span>Falli</span><strong>${esc(metricValue(team.fouls))}</strong></div><div><span>Cartellini</span><strong>${esc(metricValue(team.cards))}</strong></div></div></article>`;
    const contextCard=team=>`<article class="reading-evidence-card champions-reading-evidence">${teamBadge(team.team,branding)}<dl><div><dt>Stagione 2025/26</dt><dd>N/D</dd></div><div><dt>Obiettivo 2026/27</dt><dd>N/D</dd></div><div><dt>Sistema di riferimento</dt><dd>N/D</dd></div></dl></article>`;
    const decisionPanel=`<section class="section prediction-decision-panel champions-reading-decision"><header class="section-heading"><div><p class="eyebrow">Livello decisionale</p><h2>Scenari e dipendenze</h2></div><p>Stessa configurazione delle Letture Serie A.</p></header><div class="reading-panel-empty"><strong>N/D</strong><p>Scenari e grafo delle dipendenze non ancora prodotti dal modello Champions.</p></div></section>`;
    const h2hFixture=h2h.fixtures.find(item=>item.fixtureId===fixture.fixtureId);
    const h2hRows=(h2hFixture?.recentMatches||[]).map((match,index)=>{const source=h2h.source.pages.find(page=>page.competition===match.competition&&page.season===match.season);return `<details class="reading-h2h-match"${index===0?" open":""}><summary><span>${esc(shortDate(match.date))} · ${esc(match.competition)}</span><strong>${esc(match.homeTeam)} ${match.score90.home}-${match.score90.away} ${esc(match.awayTeam)}</strong></summary><div class="reading-h2h-events"><section><h3>Marcatori</h3><p class="reading-h2h-empty">Dettaglio marcatori N/D</p></section><section><h3>Ammoniti</h3><p class="reading-h2h-empty">Dettaglio ammoniti N/D</p></section></div>${source?`<a href="${esc(source.url)}" target="_blank" rel="noreferrer">Fonte UEFA</a>`:""}</details>`}).join("");
    const h2hPanel=`<section class="section reading-h2h-section champions-reading-h2h"><header class="section-heading"><div><p class="eyebrow">Storico ufficiale · UEFA</p><h2>${h2hFixture?.meetings?`Ultimi ${h2hFixture.meetings} scontri diretti disponibili`:"Precedenti N/D"}</h2></div><p>${h2hFixture?.meetings||0}/4 precedenti · competizioni UEFA</p></header>${h2hRows?`<div class="reading-h2h-list">${h2hRows}</div>`:'<aside class="data-warning"><strong>Campione storico non disponibile</strong><p>I precedenti mancanti non vengono ricostruiti.</p></aside>'}</section>`;
    const bookedPanel=`<section class="prediction-booked-panel"><header><div><p class="eyebrow">Gerarchia disciplinare</p><h2>5 probabili ammoniti</h2></div><p>Graduatoria unica sulle due squadre.</p></header><div class="reading-panel-empty"><strong>N/D</strong><p>Dati individuali e probabili formazioni non ancora integrati.</p></div></section>`;
    const mvpPanel=`<aside class="prediction-mvp"><p class="eyebrow">Candidato MVP</p><strong>N/D</strong><span>Valutazione non disponibile</span><div class="prediction-mvp-history"><b>Storico MVP</b><span>N/D · nessuno storico Champions comparabile integrato</span></div><small>Il candidato verrà mostrato soltanto con dati verificati.</small></aside>`;
    const myCombo=`<section class="section reading-panel-grid champions-reading-combo"><section class="reading-data-panel reading-data-panel-wide"><span>MyCombo</span><div class="reading-panel-empty reading-panel-empty-compact"><strong>N/D</strong><span>Nessuna combinazione Champions ancora sottoposta al controllo prudenziale.</span></div></section></section>`;
    return `<nav class="reading-back champions-reading-back"><a href="champions-league.html">← Tutte le letture</a><span>Giornata 1</span></nav>
      <section class="reading-match-hero champions-reading-match-hero" aria-labelledby="champions-reading-title"><div><p class="eyebrow">UEFA Champions League · Giornata 1 · prepartita</p><h1 id="champions-reading-title">${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}</h1><p>${esc(dayLabel(fixture.date))} · ${esc(fixture.kickoff)} · Stadio N/D</p></div><div class="reading-matchup champions-reading-matchup" aria-label="${esc(fixture.homeTeam)} contro ${esc(fixture.awayTeam)}">${teamBadge(fixture.homeTeam,branding,{showName:false})}<b>VS</b>${teamBadge(fixture.awayTeam,branding,{showName:false})}</div><div class="reading-summary reading-summary-prototype reading-hero-summary reading-result-summary champions-reading-summary"><div class="reading-exact-scores"><span>3 risultati esatti possibili</span><div class="reading-score-list">${scoreCards}</div></div><div class="reading-hero-signal reading-hero-surprise"><span>Fattore sorpresa</span><strong>N/D</strong><small>Dato non disponibile</small></div><div class="reading-hero-signal"><span>Confidenza</span><strong>${confidence}</strong><small>Pilot statistico</small></div></div></section>
      <aside class="reading-prototype-banner champions-reading-warning"><strong>Lettura sperimentale</strong><p>${esc(pilot.warning)}</p></aside>
      ${decisionPanel}${h2hPanel}${refereeReadingPanel(fixture.refereeAssignment)}
      <section class="section reading-info-grid champions-reading-info"><article class="round16-info-box round16-formations"><span>1</span><h2>Sistemi di riferimento</h2><div class="reading-base-shape"><strong>${esc(fixture.homeTeam)} · N/D</strong><p>Allenatore: ${esc(teamMeta(fixture.homeTeam).coach||"N/D")}</p></div><div class="reading-base-shape"><strong>${esc(fixture.awayTeam)} · N/D</strong><p>Allenatore: ${esc(teamMeta(fixture.awayTeam).coach||"N/D")}</p></div></article><div class="reading-context-rail" aria-label="Contesto squadre">${relatedTeams.map(contextCard).join("")}</div></section>
      <section class="section reading-projection-prototype prediction-volume-section champions-reading-volume"><header class="section-heading"><div><p class="eyebrow">Proiezione per squadra</p><h2>Gol, tiri, specchio, corner, falli e cartellini</h2></div><p>Storico distinto tra casa e trasferta.</p></header>${matchProjection}<div class="prediction-volume-grid">${fixture.teamProjections.map(teamProjection).join("")}</div><p class="objective-method">Campioni squadra: ${fixture.dataQuality.teamSamples.join(" / ")} gare. Le fasce sono percentili p20–p80; i dati mancanti restano N/D.</p><div class="prediction-players-grid">${bookedPanel}${mvpPanel}</div></section>
      ${myCombo}`;
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
    const [data,strength,history,model,h2h,pilot,backtest,squads]=await Promise.all([load("champions-league-2026-27.json"),load("champions-team-strength-2026-27.json"),load("uefa-team-history-2026-27.json"),load("champions-1x2-2026-27.json"),load("champions-head-to-head-2026-27.json"),load("champions-pilot-predictions-2026-27.json"),load("champions-pilot-volume-backtest.json"),load("champions-registered-squads-2026-27.json")]);
    const profiles=new Map(strength.teams.map(profile=>[profile.team,profile]));
    const histories=new Map(history.teams.map(profile=>[profile.team,profile]));
    const branding=new Map(data.teamBranding.map(team=>[team.team,team]));
    const requestedPilotFixture=requestedMatchId?pilot.fixtures.find(fixture=>fixture.fixtureId===requestedMatchId):null;
    const requestedCalendarFixture=requestedMatchId?data.fixtures.find(fixture=>fixture.id===requestedMatchId):null;
    const requestedFixture=requestedPilotFixture?{...requestedPilotFixture,refereeAssignment:requestedCalendarFixture?.refereeAssignment||null}:null;
    if(requestedFixture){
      document.querySelector("#app").innerHTML=pilotReadingDetail(requestedFixture,pilot,backtest,squads,branding,h2h);
      return;
    }
    const requestedTeam=requestedTeamId?squads.teams.find(team=>team.id===requestedTeamId):null;
    if(requestedTeam){
      document.querySelector("#app").innerHTML=championsTeamDetail(requestedTeam,profiles.get(requestedTeam.team),histories.get(requestedTeam.team),pilot,squads);
      return;
    }
    const pilotByFixture=new Map(pilot.fixtures.map(fixture=>[fixture.fixtureId,fixture]));
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
      ${teamLogoDirectory(data.teamBranding,squads)}
      ${refereeAssignmentPanel(data)}
      <section class="champions-calendar" aria-labelledby="champions-calendar-title">
        <header class="champions-calendar-heading"><div><p class="eyebrow">Fase campionato</p><h2 id="champions-calendar-title">Calendario ufficiale</h2><p>Le partite con una lettura disponibile sono apribili direttamente dal calendario. Con “Tutte le giornate” puoi consultare l’intero programma delle 144 gare.</p></div><a href="${esc(data.source.url)}" target="_blank" rel="noreferrer">Fonte UEFA ↗</a></header>
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
      results.innerHTML=fixtureGroups(filtered,branding,pilotByFixture);
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
