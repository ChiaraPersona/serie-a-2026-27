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

  function refereeReadingPanel(assignment){
    if(!assignment||assignment.status!=="assigned")return `<section class="section reading-referee-assignment champions-reading-referee" id="lettura-referee"><header class="section-heading"><div><p class="eyebrow">Designazione arbitrale</p><h2>Arbitro</h2></div><p>Designazione e profilo disciplinare.</p></header><div class="reading-panel-empty"><strong>N/D</strong><p>La designazione ufficiale non è ancora disponibile nel dataset.</p></div></section>`;
    const stats=assignment.statistics;
    return `<section class="section reading-referee-assignment champions-reading-referee" id="lettura-referee" aria-labelledby="champions-reading-referee-title"><header class="section-heading"><div><p class="eyebrow">Designazione arbitrale</p><h2 id="champions-reading-referee-title">${refereeName(assignment)}</h2></div><p>Designazione e profilo disciplinare.</p></header><div class="reading-referee-stats champions-reading-referee-stats"><article><span>Gialli / gara</span>${refereeMetric(stats.yellowCardsPerMatch)}</article><article><span>Rossi / gara</span>${refereeMetric(stats.redCardsPerMatch)}</article><article><span>Falli / gara</span>${refereeMetric(stats.foulsPerMatch)}</article><article><span>Rigori / gara</span>${refereeMetric(stats.penaltiesPerMatch)}</article></div><p class="reading-referee-method">Profilo storico riportato come fornito; non applicato automaticamente alle proiezioni della partita.</p></section>`;
  }

  function fixtureCard(fixture,branding,pilotByFixture){
    const analysis=pilotByFixture.get(fixture.id);
    if(analysis){
      const selection=resultSelection(analysis);
      const confidence=analysis.confidence==="high"?"Alta":analysis.confidence==="medium"?"Media":analysis.confidence==="low"?"Bassa":"N/D";
      return `<a class="reading-fixture match fixture-card fixture-card-link champions-fixture champions-pilot-card" href="champions-league.html?match=${esc(analysis.fixtureId)}" aria-label="Apri la lettura di ${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}" style="--home-color-1:#105ac5;--home-color-2:#052b78;--away-color-1:#1879d5;--away-color-2:#061a57"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata ${fixture.matchday}</span></div><span class="match-date">${esc(shortDate(fixture.date))} · ${esc(fixture.kickoff)}</span></header><span class="reading-fixture-teams">${teamBadge(fixture.homeTeam,branding)}<b>VS</b>${teamBadge(fixture.awayTeam,branding)}</span><span class="reading-fixture-preview" aria-label="Anteprima della lettura"><span><small>Verdetto</small><strong>${esc(selection[0])} · ${esc(selection[2])}</strong></span><span><small>Risultato</small><strong>${esc(analysis.exactScores[0]?.score||"N/D")}</strong></span><span><small>Confidenza</small><strong>${confidence}</strong></span></span></a>`;
    }
    return `<article class="reading-fixture match fixture-card champions-fixture" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}" style="--home-color-1:#105ac5;--home-color-2:#052b78;--away-color-1:#1879d5;--away-color-2:#061a57"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata ${fixture.matchday}</span></div><time class="match-date" datetime="${esc(`${fixture.date}T${fixture.kickoff}`)}">${esc(shortDate(fixture.date))} · ${esc(fixture.kickoff)}</time></header><span class="reading-fixture-teams">${teamBadge(fixture.homeTeam,branding)}<b>VS</b>${teamBadge(fixture.awayTeam,branding)}</span></article>`;
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

  function probableFormationCard(fixture,squads){
    const probable=fixture.probableFormation;
    const coach=team=>squads.teams.find(item=>item.team===team)?.coach||"N/D";
    if(!probable)return `<article class="round16-info-box round16-formations"><span>1</span><p class="eyebrow">Proiezione editoriale</p><h2>Probabili formazioni</h2><div class="reading-panel-empty reading-panel-empty-compact"><strong>N/D</strong><span>Moduli e giocatori non disponibili.</span></div></article>`;
    const side=item=>{
      const players=item.players?.length===11?`<p class="champions-probable-label">XI probabile · ordine fornito</p><ol class="champions-probable-xi">${item.players.map(player=>`<li>${esc(player)}</li>`).join("")}</ol>`:`<small>Giocatori: N/D</small>`;
      const notes=(item.notes||[]).map(note=>`<p class="champions-probable-note">${esc(note)}</p>`).join("");
      return `<div class="reading-base-shape"><strong>${esc(item.team)} · ${esc(item.formation)}</strong><p>Allenatore: ${esc(coach(item.team))}</p>${players}${notes}</div>`;
    };
    const complete=[probable.home,probable.away].every(item=>item.players?.length===11);
    const coverageNote=complete?"Moduli e undici editoriali disponibili; non sono distinte ufficiali.":"Sono disponibili soltanto i moduli; gli undici titolari non forniti restano N/D.";
    return `<article class="round16-info-box round16-formations"><span>1</span><p class="eyebrow">Proiezione editoriale · non ufficiale</p><h2>Probabili formazioni</h2>${side(probable.home)}${side(probable.away)}<p class="objective-method">Aggiornamento ${esc(shortDate(probable.updatedAt))}. ${coverageNote}</p></article>`;
  }

  const motivationLevel=level=>({low:"LOW",medium:"MEDIUM",high:"HIGH",very_high:"VERY HIGH",extreme:"EXTREME"}[level]||"N/D");
  const reasonLabel=reason=>({must_win:"Deve vincere",top8_race:"Corsa alla top 8",top24_race:"Corsa alla top 24",elimination_risk:"Rischio eliminazione",already_qualified:"Qualificazione già acquisita",big_match:"Grande sfida europea",elite_opponent:"Avversario di prima fascia",historic_match:"Partita storica per il club",champions_debut:"Debutto assoluto in Champions",return_to_champions:"Ritorno in Champions",home_pressure:"Pressione del pubblico di casa",hostile_away_environment:"Trasferta ad alta pressione",coach_under_pressure:"Allenatore sotto pressione",poor_recent_form:"Forma recente negativa",excellent_recent_form:"Forma europea recente positiva",revenge_factor:"Fattore rivincita",former_coach:"Ex allenatore",former_player:"Ex giocatore",title_contender:"Ambizione da candidata al titolo",rotation_expected:"Turnover da monitorare",fixture_congestion:"Calendario congestionato",strong_ucl_ambition:"Forte ambizione europea",underdog_opportunity:"Occasione da outsider"}[reason]||reason);
  function motivationPanel(entry){
    if(!entry)return `<section class="section champions-motivation-card"><header><p class="eyebrow">Motivation</p><h2>Dati N/D</h2></header></section>`;
    const side=({team,motivation})=>`<article class="champions-motivation-team"><header><strong>${esc(team)}</strong><span class="motivation-level is-${esc(motivation.level)}">${esc(motivationLevel(motivation.level))}</span></header><div class="champions-motivation-score"><b>${motivation.score}</b><span>/100<small>Motivazione</small></span></div><dl><div><dt>Urgenza</dt><dd>${motivation.urgency}/100</dd></div><div><dt>Pressione</dt><dd>${motivation.pressure}/100</dd></div><div><dt>Turnover</dt><dd>${motivation.rotationRisk}/100</dd></div><div><dt>Confidence</dt><dd>${Math.round(motivation.confidence*100)}%</dd></div></dl><ul>${motivation.reasons.slice(0,3).map(reason=>`<li>${esc(reasonLabel(reason))}</li>`).join("")}</ul><details><summary>Come è calcolato</summary><div class="champions-motivation-debug">${Object.entries(motivation.debug.formula).map(([key,item])=>`<span><b>${esc(key)}</b>${item.value} × ${Math.round(item.weight*100)}% = ${item.contribution}</span>`).join("")}<span><b>Context adjustment</b>${motivation.contextAdjustment.value>=0?"+":""}${motivation.contextAdjustment.value}</span><strong>Final Motivation: ${motivation.score}</strong></div></details></article>`;
    return `<section class="section champions-motivation-card" aria-labelledby="motivation-title"><header><div><p class="eyebrow">Motivation</p><h2 id="motivation-title">Motivazione, urgenza e pressione</h2></div><p>Indicatori distinti, non probabilità di vittoria.</p></header><div class="champions-motivation-grid">${side(entry.home)}${side(entry.away)}</div><p class="champions-motivation-note">Forma domestica finale pendente: momentum europeo usato come proxy e confidence ridotta. Il rischio turnover corregge separatamente la forza prevista.</p></section>`;
  }

  function motivationOnlyDetail(fixture,entry,branding,squads){
    return `<nav class="reading-back champions-reading-back"><a href="champions-league.html">← Calendario Champions</a><span>Giornata ${fixture.matchday}</span></nav><section class="reading-match-hero champions-reading-match-hero"><div><p class="eyebrow">UEFA Champions League · Motivation Index</p><h1>${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}</h1><p>${esc(dayLabel(fixture.date))} · ${esc(fixture.kickoff)}</p></div><div class="reading-matchup champions-reading-matchup">${teamBadge(fixture.homeTeam,branding,{showName:false})}<b>VS</b>${teamBadge(fixture.awayTeam,branding,{showName:false})}</div></section><aside class="reading-prototype-banner champions-reading-warning"><strong>Lettura parziale</strong><p>Per questa gara sono disponibili Motivation Index e moduli probabili; gli undici titolari e le proiezioni statistiche complete restano N/D.</p></aside>${motivationPanel(entry)}<section class="section reading-info-grid champions-reading-info">${probableFormationCard(fixture,squads)}</section>`;
  }

  function motivationOverview(data,branding){
    const objectives=data.objectiveLabels||{};
    const rows=[...data.teams].sort((a,b)=>b.baseline.baselineMotivation-a.baseline.baselineMotivation||a.team.localeCompare(b.team,"it")).map(side=>{const base=side.baseline;return `<tr><th scope="row">${teamBadge(side.team,branding)}</th><td>${esc(base.country)}</td><td data-sort-value="${base.baselineMotivation}"><strong>${base.baselineMotivation}</strong></td><td>${esc(objectives[base.seasonObjective]||base.seasonObjective)}</td><td data-sort-value="${base.clubPressure}">${base.clubPressure}</td><td>${esc(base.experienceLevel)}</td></tr>`}).join("");
    return `<nav class="reading-back champions-reading-back"><a href="champions-league.html">← Champions League</a><span>Overview 36 squadre</span></nav><section class="champions-motivation-overview"><header><p class="eyebrow">UEFA Champions League 2026/27</p><h1>Motivation Index</h1><p>Baseline stagionale separata dai punteggi dinamici delle singole partite.</p></header><div class="champions-motivation-overview-meta"><strong>${data.teams.length}</strong><span>squadre</span><a href="output/champions-motivation-md01-report.md">Report MD1 ↗</a></div><div class="champions-motivation-table-wrap"><table id="motivation-table"><thead><tr><th>Squadra</th><th>Paese</th><th><button type="button" data-sort="2">Motivation baseline ↕</button></th><th>Obiettivo</th><th><button type="button" data-sort="4">Pressione ↕</button></th><th>Esperienza Champions</th></tr></thead><tbody>${rows}</tbody></table></div><aside><strong>Trasparenza</strong><p>${esc(data.warning)}</p></aside></section>`;
  }

  function pilotReadingDetail(fixture,pilot,backtest,squads,branding,h2h,motivationEntry){
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
    const h2hFixture=h2h.fixtures.find(item=>item.fixtureId===fixture.fixtureId);
    const h2hEvents=(items,emptyLabel)=>Array.isArray(items)?items.length?`<ul>${items.map(item=>`<li><strong>${esc(item.player)}</strong><small>${esc(item.team)} · ${item.minute?`${esc(item.minute)}'`:"minuto N/D"}${item.penalty?" · rigore":""}${item.ownGoal?" · autogol":""}${item.note?` · ${esc(item.note)}`:""}</small></li>`).join("")}</ul>`:`<p class="reading-h2h-empty">${emptyLabel}</p>`:'<p class="reading-h2h-empty">Dettaglio N/D</p>';
    const h2hRows=(h2hFixture?.recentMatches||[]).map((match,index)=>{const fallbackSource=h2h.source.pages.find(page=>page.competition===match.competition&&page.season===match.season),sources=match.sources||[fallbackSource].filter(Boolean);return `<details class="reading-h2h-match"${index===0?" open":""}><summary><span>${esc(shortDate(match.date))} · ${esc(match.competition)}</span><strong>${esc(match.homeTeam)} ${match.score90.home}-${match.score90.away} ${esc(match.awayTeam)}</strong></summary><div class="reading-h2h-events"><section><h3>Marcatori</h3>${h2hEvents(match.goals,"Nessun gol")}</section><section><h3>Ammoniti</h3>${h2hEvents(match.bookings,"Nessun ammonito")}</section></div>${sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noreferrer">Fonte ${esc(source.provider||"UEFA")}</a>`).join("")}</details>`}).join("");
    const h2hPanel=`<section class="section reading-h2h-section champions-reading-h2h"><header class="section-heading"><div><p class="eyebrow">Storico ufficiale · UEFA</p><h2>${h2hFixture?.meetings?`Ultimi ${h2hFixture.meetings} scontri diretti disponibili`:"Precedenti N/D"}</h2></div><p>${h2hFixture?.meetings||0}/${h2hFixture?.maximumMeetings||4} precedenti · competizioni UEFA</p></header>${h2hRows?`<div class="reading-h2h-list">${h2hRows}</div>`:'<aside class="data-warning"><strong>Campione storico non disponibile</strong><p>I precedenti mancanti non vengono ricostruiti.</p></aside>'}</section>`;
    const bookedPanel=`<section class="prediction-booked-panel"><header><div><p class="eyebrow">Gerarchia disciplinare</p><h2>5 probabili ammoniti</h2></div><p>Graduatoria unica sulle due squadre.</p></header><div class="reading-panel-empty"><strong>N/D</strong><p>I dati individuali non sono stati forniti; i soli moduli probabili non consentono una graduatoria attendibile.</p></div></section>`;
    const mvpPanel=`<aside class="prediction-mvp"><p class="eyebrow">Candidato MVP</p><strong>N/D</strong><span>Valutazione non disponibile</span><div class="prediction-mvp-history"><b>Storico MVP</b><span>N/D · nessuno storico Champions comparabile integrato</span></div><small>Il candidato verrà mostrato soltanto con dati verificati.</small></aside>`;
    const myCombo=`<section class="section reading-panel-grid champions-reading-combo"><section class="reading-data-panel reading-data-panel-wide"><span>MyCombo</span><div class="reading-panel-empty reading-panel-empty-compact"><strong>N/D</strong><span>Nessuna combinazione Champions ancora sottoposta al controllo prudenziale.</span></div></section></section>`;
    return `<nav class="reading-back champions-reading-back"><a href="champions-league.html">← Tutte le letture</a><span>Giornata 1</span></nav>
      <section class="reading-match-hero champions-reading-match-hero" aria-labelledby="champions-reading-title"><div><p class="eyebrow">UEFA Champions League · Giornata 1 · prepartita</p><h1 id="champions-reading-title">${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}</h1><p>${esc(dayLabel(fixture.date))} · ${esc(fixture.kickoff)} · Stadio N/D</p></div><div class="reading-matchup champions-reading-matchup" aria-label="${esc(fixture.homeTeam)} contro ${esc(fixture.awayTeam)}">${teamBadge(fixture.homeTeam,branding,{showName:false})}<b>VS</b>${teamBadge(fixture.awayTeam,branding,{showName:false})}</div><div class="reading-summary reading-summary-prototype reading-hero-summary reading-result-summary champions-reading-summary"><div class="reading-exact-scores"><span>3 risultati esatti possibili</span><div class="reading-score-list">${scoreCards}</div></div><div class="reading-hero-signal reading-hero-surprise"><span>Fattore sorpresa</span><strong>N/D</strong><small>Dato non disponibile</small></div><div class="reading-hero-signal"><span>Confidenza</span><strong>${confidence}</strong><small>Pilot statistico</small></div></div></section>
      <aside class="reading-prototype-banner champions-reading-warning"><strong>Lettura sperimentale</strong><p>${esc(pilot.warning)}</p></aside>
      ${motivationPanel(motivationEntry)}${h2hPanel}${refereeReadingPanel(fixture.refereeAssignment)}
      <section class="section reading-info-grid champions-reading-info">${probableFormationCard(fixture,squads)}<div class="reading-context-rail" aria-label="Contesto squadre">${relatedTeams.map(contextCard).join("")}</div></section>
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
    const [data,strength,history,model,h2h,pilot,backtest,squads,motivation]=await Promise.all([load("champions-league-2026-27.json"),load("champions-team-strength-2026-27.json"),load("uefa-team-history-2026-27.json"),load("champions-1x2-2026-27.json"),load("champions-head-to-head-2026-27.json"),load("champions-pilot-predictions-2026-27.json"),load("champions-pilot-volume-backtest.json"),load("champions-registered-squads-2026-27.json"),load("champions-motivation-md01-2026-27.json")]);
    const profiles=new Map(strength.teams.map(profile=>[profile.team,profile]));
    const histories=new Map(history.teams.map(profile=>[profile.team,profile]));
    const branding=new Map(data.teamBranding.map(team=>[team.team,team]));
    const motivationByFixture=new Map(motivation.fixtures.map(fixture=>[fixture.matchId,fixture]));
    const baselineByTeam=new Map(motivation.baselines.map(team=>[team.team,team]));
    motivation.teams.forEach(side=>side.baseline=baselineByTeam.get(side.team));
    if((location.pathname||"").endsWith("/champions-2026-27/motivazione.html")){
      document.querySelector("#app").innerHTML=motivationOverview(motivation,branding);
      document.querySelectorAll("[data-sort]").forEach(button=>button.addEventListener("click",()=>{const body=document.querySelector("#motivation-table tbody"),index=Number(button.dataset.sort),descending=button.dataset.direction!=="desc";button.dataset.direction=descending?"desc":"asc";[...body.rows].sort((a,b)=>(Number(a.cells[index].dataset.sortValue)||0)-(Number(b.cells[index].dataset.sortValue)||0)).sort((a,b)=>(descending?-1:1)*((Number(a.cells[index].dataset.sortValue)||0)-(Number(b.cells[index].dataset.sortValue)||0))).forEach(row=>body.append(row))}));
      return;
    }
    const requestedPilotFixture=requestedMatchId?pilot.fixtures.find(fixture=>fixture.fixtureId===requestedMatchId):null;
    const requestedCalendarFixture=requestedMatchId?data.fixtures.find(fixture=>fixture.id===requestedMatchId):null;
    const requestedFixture=requestedPilotFixture?{...requestedPilotFixture,refereeAssignment:requestedCalendarFixture?.refereeAssignment||null,probableFormation:requestedCalendarFixture?.probableFormation||null}:null;
    if(requestedFixture){
      document.querySelector("#app").innerHTML=pilotReadingDetail(requestedFixture,pilot,backtest,squads,branding,h2h,motivationByFixture.get(requestedMatchId));
      return;
    }
    if(requestedCalendarFixture&&motivationByFixture.has(requestedMatchId)){
      document.querySelector("#app").innerHTML=motivationOnlyDetail(requestedCalendarFixture,motivationByFixture.get(requestedMatchId),branding,squads);
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
        <div class="champions-hero-stats" aria-label="Riepilogo calendario"><div><strong>${data.summary.fixtures}</strong><span>partite</span></div><div><strong>${data.summary.teams}</strong><span>squadre</span></div><div><strong>${data.summary.matchdays}</strong><span>giornate</span></div></div><a class="champions-motivation-cta" href="champions-2026-27/motivazione.html">Motivation Index · 36 squadre →</a>
        <div class="champions-orbit" aria-hidden="true"><span>★</span></div>
      </section>
      ${teamLogoDirectory(data.teamBranding,squads)}
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
