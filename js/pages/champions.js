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
    const home=branding.get(fixture.homeTeam).colors;
    const away=branding.get(fixture.awayTeam).colors;
    const palette=`--home-color-1:${home[0]};--home-color-2:${home[1]};--away-color-1:${away[0]};--away-color-2:${away[1]}`;
    if(analysis){
      return `<a class="reading-fixture match fixture-card fixture-card-link champions-fixture champions-pilot-card" href="champions-league.html?match=${esc(analysis.fixtureId)}" aria-label="Apri la lettura di ${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}" style="${esc(palette)}"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata ${fixture.matchday}</span></div><span class="match-date">${esc(shortDate(fixture.date))} · ${esc(fixture.kickoff)}</span></header><span class="reading-fixture-teams">${teamBadge(fixture.homeTeam,branding)}<b>VS</b>${teamBadge(fixture.awayTeam,branding)}</span></a>`;
    }
    return `<article class="reading-fixture match fixture-card champions-fixture" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}" style="${esc(palette)}"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata ${fixture.matchday}</span></div><time class="match-date" datetime="${esc(`${fixture.date}T${fixture.kickoff}`)}">${esc(shortDate(fixture.date))} · ${esc(fixture.kickoff)}</time></header><span class="reading-fixture-teams">${teamBadge(fixture.homeTeam,branding)}<b>VS</b>${teamBadge(fixture.awayTeam,branding)}</span></article>`;
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

  const venueLabel=venue=>venue==="home"?"Casa":"Trasferta";
  const metricValue=(metric,venue)=>metric
    ?`<strong>${metric.central.toFixed(1)}</strong><small>${venueLabel(venue)} · fascia ${metric.min.toFixed(1)}–${metric.max.toFixed(1)}</small>`
    :`<strong>N/D</strong><small>${venueLabel(venue)}</small>`;
  const channelLabel=value=>({left:"Fascia sinistra",central:"Zona centrale",right:"Fascia destra"}[value]||"N/D");
  const attackChannelsPanel=profile=>{
    const channels=profile?.attackChannels;
    if(!channels)return `<div class="prediction-channels prediction-channels-unavailable"><span>Lati d'attacco</span><p><strong>N/D</strong> · ${esc(profile?.unavailableReason||"WhoScored non espone una ripartizione verificabile per questa squadra.")}</p></div>`;
    return `<div class="prediction-channels"><span>Lati d'attacco</span>${[["left","Sinistra"],["central","Centro"],["right","Destra"]].map(([key,label])=>`<div><small>${label}</small><i aria-hidden="true"><b style="width:${channels[key]}%"></b></i><strong>${channels[key]}%</strong></div>`).join("")}<em>Canale prevalente: ${channelLabel(channels.dominant)}</em></div>`;
  };

  const resultSelection=fixture=>fixture.verdict
    ?[fixture.verdict.outcome,fixture.verdict.probabilityPct,fixture.verdict.label]
    :[
      ["1",fixture.probabilities.home,fixture.homeTeam],
      ["X",fixture.probabilities.draw,"Pareggio"],
      ["2",fixture.probabilities.away,fixture.awayTeam]
    ].sort((a,b)=>b[1]-a[1])[0];

  function probableFormationCard(fixture,squads,onlyTeam=null){
    const probable=fixture.probableFormation;
    const official=probable?.status==="official"; const coach=team=>[probable?.home,probable?.away].find(item=>item?.team===team)?.coach||squads.teams.find(item=>item.team===team)?.coach||"N/D";
    if(!probable)return `<article class="round16-info-box round16-formations champions-reading-lineups"><header class="champions-reading-block-heading"><div><p class="eyebrow">Proiezione editoriale</p><h2>Probabili formazioni</h2></div><p>Conferme e indisponibili restano espliciti.</p></header><div class="reading-panel-empty reading-panel-empty-compact"><strong>N/D</strong><span>Moduli e giocatori non disponibili.</span></div></article>`;
    const side=item=>{
      if(item.formation===null)return `<article class="reading-lineup-card champions-reading-lineup-card"><header><span>${esc(item.team)}</span><strong>Modulo N/D</strong></header><ol>${item.players.map(player=>`<li>${esc(player)}</li>`).join("")}</ol><footer><span>Allenatore: ${esc(coach(item.team))}</span><p>Modulo non indicato da Diretta; elenco titolari senza disposizione tattica.</p><p>Panchina: ${(item.bench||[]).map(esc).join(", ")}</p></footer></article>`;
      if(item.players?.length!==11)return `<article class="reading-lineup-card champions-reading-lineup-card"><header><span>${esc(item.team)}</span><strong>${esc(item.formation)}</strong></header><div class="reading-panel-empty reading-panel-empty-compact"><strong>N/D</strong><span>Undici titolare non disponibile.</span></div><footer><span>Allenatore: ${esc(coach(item.team))}</span></footer></article>`;
      const shape=item.formation.split("-").map(Number),units=[1,...shape];
      let offset=0;
      const rows=units.map(size=>{
        const players=item.players.slice(offset,offset+size).reverse();
        offset+=size;
        return `<div class="reading-lineup-row" style="--reading-lineup-count:${size}">${players.map(player=>`<strong>${esc(player)}</strong>`).join("")}</div>`;
      }).reverse().join("");
      const notes=(item.notes||[]).map(note=>`<p class="champions-probable-note">${esc(note)}</p>`).join("");
      return `<article class="reading-lineup-card champions-reading-lineup-card" style="--reading-lineup-primary:#105ac5;--reading-lineup-secondary:#052b78;--reading-lineup-head-ink:#fff"><header><span>${esc(item.team)}</span><strong>${esc(item.formation)}</strong></header><div class="reading-lineup-field" aria-label="${official?"Formazione ufficiale":"Probabile formazione"} ${esc(item.team)} con modulo ${esc(item.formation)}"><i class="reading-lineup-centre" aria-hidden="true"></i>${rows}</div><footer><span>Allenatore: ${esc(coach(item.team))}</span>${notes}${item.bench?`<p>Panchina: ${item.bench.map(esc).join(", ")}</p>`:""}</footer></article>`;
    };
    const complete=[probable.home,probable.away].every(item=>item.players?.length===11);
    const confidenceLabel=official?"Ufficiali":({"very-high":"Molto alta","medium-high":"Medio-alta",lower:"Più bassa"})[probable.lineupConfidence?.band]||"N/D";
    const uncertainTeams=(probable.lineupConfidence?.uncertainSides||[]).map(venue=>probable[venue]?.team).filter(Boolean);
    const uncertainty=uncertainTeams.length?`<em>XI da ricontrollare: ${uncertainTeams.map(esc).join(", ")}</em>`:"";
    const coverageNote=official?`Formazioni ufficiali · <a href="${esc(probable.source.url)}" target="_blank" rel="noreferrer">Diretta</a>`:complete?"Moduli e undici editoriali disponibili; non sono distinte ufficiali.":"Sono disponibili soltanto i moduli; gli undici titolari non forniti restano N/D.";
    return `<article class="round16-info-box round16-formations champions-reading-lineups"><header class="champions-reading-block-heading"><div><p class="eyebrow">${official?"Confermate · Diretta":"Proiezione editoriale · non ufficiale"}</p><h2>${official?"Formazioni ufficiali":"Probabili formazioni"}</h2></div><p>Conferme e indisponibili restano espliciti.</p></header><div class="champions-lineup-confidence"><span>Confidenza XI</span><strong>${esc(confidenceLabel)}</strong>${uncertainty}</div><div class="reading-lineup-grid">${[probable.home,probable.away].filter(item=>!onlyTeam||item.team===onlyTeam).map(side).join("")}</div><p class="objective-method">Aggiornamento ${esc(shortDate(probable.updatedAt))}. ${coverageNote}</p></article>`;
  }

  function tacticalBaselinePanel(fixture,styleProfiles,volumeProfiles,branding){
    const profiles=new Map((styleProfiles?.profiles||[]).map(profile=>[profile.teamId,profile]));
    const volumeByTeam=new Map((volumeProfiles||[]).map(profile=>[profile.teamId,profile]));
    const projectionFor=team=>fixture.teamProjections.find(item=>item.team===team);
    const list=(label,items)=>`<div><strong>${label}</strong>${items?.length?`<ul>${items.slice(0,5).map(item=>`<li>${esc(item.label)}</li>`).join("")}</ul>`:'<p class="muted">N/D dal provider</p>'}</div>`;
    const card=team=>{
      const projection=projectionFor(team),profile=profiles.get(projection?.teamId);
      if(!profile){
        const volume=volumeByTeam.get(projection?.teamId),overall=volume?.venues?.overall;
        if(!volume?.usableForDetailedVolumes||!overall)return "";
        return `<article class="reading-tactical-card champions-reading-tactical-card is-statistical-fallback">${teamBadge(team,branding)}<span class="sample-label sample-low">Baseline statistica</span><dl><div><dt>Campione</dt><dd>${esc(volume.league)} · ${volume.matches} gare</dd></div><div><dt>Tiri / gara</dt><dd>${overall.totalShots.for.mean.toFixed(1)}</dd></div><div><dt>Tiri nello specchio / gara</dt><dd>${overall.shotsOnTarget.for.mean.toFixed(1)}</dd></div><div><dt>Gol / gara</dt><dd>${overall.goals.for.mean.toFixed(2)}</dd></div><div><dt>Corner / gara</dt><dd>${overall.wonCorners.for.mean.toFixed(1)}</dd></div></dl></article>`;
      }
      const quality=profile.dataQuality==="complete"?"Profilo completo":profile.dataQuality==="limited-sample"?"Campione limitato":"Solo statistiche";
      return `<article class="reading-tactical-card champions-reading-tactical-card">${teamBadge(team,branding)}<span class="sample-label sample-${profile.dataQuality==="complete"?"strong":"low"}">${quality}</span><dl><div><dt>Campione</dt><dd>${esc(profile.competition)} · ${profile.summary.appearances} gare</dd></div><div><dt>Modulo più usato</dt><dd>${esc(profile.formation.code||"N/D")}${profile.formation.appearances?` · ${profile.formation.appearances} gare`:""}</dd></div><div><dt>Possesso</dt><dd>${profile.summary.possessionPct===null?"N/D":`${profile.summary.possessionPct}%`}</dd></div><div><dt>Tiri / gara</dt><dd>${profile.summary.shotsPerGame??"N/D"}</dd></div><div><dt>Gol / gara</dt><dd>${profile.derived.goalsPerGame}</dd></div></dl><div class="reading-tactical-traits">${list("Punti di forza",profile.strengths)}${list("Vulnerabilità",profile.weaknesses)}${list("Stile",profile.playingStyle)}</div>${profile.notes?.length?`<p class="reading-tactical-note">${profile.notes.map(esc).join(" ")}</p>`:""}<a href="${esc(profile.source.url)}" target="_blank" rel="noreferrer">Fonte WhoScored</a></article>`;
    };
    const cards=[fixture.homeTeam,fixture.awayTeam].map(card).filter(Boolean).join("");
    if(!cards)return "";
    return `<section class="section reading-tactical-baseline champions-reading-tactics" id="champions-tactics"><header class="section-heading"><div><p class="eyebrow">WhoScored · baseline 2025/26</p><h2>Baseline tattica delle squadre</h2></div></header><div>${cards}</div><p class="objective-method">Il profilo è contesto storico, non previsione autonoma.</p></section>`;
  }

  function matchAttackChannelsPanel(fixture,attackByTeam,branding){
    const card=team=>{
      const profile=attackByTeam.get(team);
      if(!profile?.attackChannels)return "";
      const source=profile?.sourceUrl?`<a href="${esc(profile.sourceUrl)}" target="_blank" rel="noreferrer">Fonte WhoScored</a>`:"<span>Fonte non disponibile</span>";
      return `<article class="champions-reading-attack-card">${teamBadge(team,branding)}${attackChannelsPanel(profile)}<footer><span>${profile?.competition?esc(profile.competition):"Campione N/D"}${profile?.dataQuality==="uefa-fallback"?" · fallback UEFA":""}</span>${source}</footer></article>`;
    };
    const cards=[fixture.homeTeam,fixture.awayTeam].map(card).filter(Boolean).join("");
    if(!cards)return "";
    return `<section class="section champions-reading-attack" aria-labelledby="champions-reading-attack-title"><header class="section-heading"><div><p class="eyebrow">WhoScored · baseline 2025/26</p><h2 id="champions-reading-attack-title">Fasce d'attacco</h2></div><p>Distribuzione storica separata dai volumi di gara.</p></header><div>${cards}</div></section>`;
  }

  const motivationLevel=level=>({low:"LOW",medium:"MEDIUM",high:"HIGH",very_high:"VERY HIGH",extreme:"EXTREME"}[level]||"N/D");
  const reasonLabel=reason=>({must_win:"Deve vincere",top8_race:"Corsa alla top 8",top24_race:"Corsa alla top 24",elimination_risk:"Rischio eliminazione",already_qualified:"Qualificazione già acquisita",big_match:"Grande sfida europea",elite_opponent:"Avversario di prima fascia",historic_match:"Partita storica per il club",champions_debut:"Debutto assoluto in Champions",return_to_champions:"Ritorno in Champions",home_pressure:"Pressione del pubblico di casa",hostile_away_environment:"Trasferta ad alta pressione",coach_under_pressure:"Allenatore sotto pressione",poor_recent_form:"Forma recente negativa",excellent_recent_form:"Forma europea recente positiva",revenge_factor:"Fattore rivincita",former_coach:"Ex allenatore",former_player:"Ex giocatore",title_contender:"Ambizione da candidata al titolo",rotation_expected:"Turnover da monitorare",fixture_congestion:"Calendario congestionato",strong_ucl_ambition:"Forte ambizione europea",underdog_opportunity:"Occasione da outsider"}[reason]||reason);
  function motivationPanel(entry){
    if(!entry)return `<section class="section champions-motivation-card"><header><p class="eyebrow">Motivation</p><h2>Dati N/D</h2></header></section>`;
    const side=({team,motivation})=>`<article class="champions-motivation-team"><header><strong>${esc(team)}</strong><span class="motivation-level is-${esc(motivation.level)}">${esc(motivationLevel(motivation.level))}</span></header><div class="champions-motivation-score"><b>${motivation.score}</b><span>/100<small>Motivazione</small></span></div><dl><div><dt>Urgenza</dt><dd>${motivation.urgency}/100</dd></div><div><dt>Pressione</dt><dd>${motivation.pressure}/100</dd></div><div><dt>Turnover</dt><dd>${motivation.rotationRisk}/100</dd></div><div><dt>Confidence</dt><dd>${Math.round(motivation.confidence*100)}%</dd></div></dl><ul>${motivation.reasons.slice(0,3).map(reason=>`<li>${esc(reasonLabel(reason))}</li>`).join("")}</ul><details><summary>Come è calcolato</summary><div class="champions-motivation-debug">${Object.entries(motivation.debug.formula).map(([key,item])=>`<span><b>${esc(key)}</b>${item.value} × ${Math.round(item.weight*100)}% = ${item.contribution}</span>`).join("")}<span><b>Context adjustment</b>${motivation.contextAdjustment.value>=0?"+":""}${motivation.contextAdjustment.value}</span><strong>Final Motivation: ${motivation.score}</strong></div></details></article>`;
    return `<section class="section champions-motivation-card" aria-labelledby="motivation-title"><header><div><p class="eyebrow">Motivation</p><h2 id="motivation-title">Motivation Index</h2></div><p>Indicatori distinti, non probabilità di vittoria.</p></header><div class="champions-motivation-grid">${side(entry.home)}${side(entry.away)}</div><p class="champions-motivation-note">Forma domestica finale pendente: momentum europeo usato come proxy e confidence ridotta. Il rischio turnover corregge separatamente la forza prevista.</p></section>`;
  }

  function motivationOnlyDetail(fixture,entry,branding,squads){
    const hasLineups=[fixture.probableFormation?.home,fixture.probableFormation?.away].every(side=>side?.players?.length===11);
    const availability=hasLineups?"Per questa gara sono disponibili Motivation Index, moduli e undici editoriali; le proiezioni statistiche complete restano N/D.":"Per questa gara sono disponibili Motivation Index e moduli probabili; gli undici titolari e le proiezioni statistiche complete restano N/D.";
    return `<nav class="reading-back champions-reading-back"><a href="champions-league.html">← Calendario Champions</a><span>Giornata ${fixture.matchday}</span></nav><section class="reading-match-hero champions-reading-match-hero"><div><p class="eyebrow">UEFA Champions League · Motivation Index</p><h1>${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}</h1><p>${esc(dayLabel(fixture.date))} · ${esc(fixture.kickoff)}</p></div><div class="reading-matchup champions-reading-matchup">${teamBadge(fixture.homeTeam,branding,{showName:false})}<b>VS</b>${teamBadge(fixture.awayTeam,branding,{showName:false})}</div></section><aside class="reading-prototype-banner champions-reading-warning"><strong>Lettura parziale</strong><p>${availability}</p></aside>${motivationPanel(entry)}<section class="section reading-info-grid champions-reading-info">${probableFormationCard(fixture,squads)}</section>`;
  }

  function motivationOverview(data,branding){
    const objectives=data.objectiveLabels||{};
    const rows=[...data.teams].sort((a,b)=>b.baseline.baselineMotivation-a.baseline.baselineMotivation||a.team.localeCompare(b.team,"it")).map(side=>{const base=side.baseline;return `<tr><th scope="row">${teamBadge(side.team,branding)}</th><td>${esc(base.country)}</td><td data-sort-value="${base.baselineMotivation}"><strong>${base.baselineMotivation}</strong></td><td>${esc(objectives[base.seasonObjective]||base.seasonObjective)}</td><td data-sort-value="${base.clubPressure}">${base.clubPressure}</td><td>${esc(base.experienceLevel)}</td></tr>`}).join("");
    return `<nav class="reading-back champions-reading-back"><a href="champions-league.html">← Champions League</a><span>Overview 36 squadre</span></nav><section class="champions-motivation-overview"><header><p class="eyebrow">UEFA Champions League 2026/27</p><h1>Motivation Index</h1><p>Baseline stagionale separata dai punteggi dinamici delle singole partite.</p></header><div class="champions-motivation-overview-meta"><strong>${data.teams.length}</strong><span>squadre</span><a href="output/champions-motivation-md01-report.md">Report MD1 ↗</a></div><div class="champions-motivation-table-wrap"><table id="motivation-table"><thead><tr><th>Squadra</th><th>Paese</th><th><button type="button" data-sort="2">Motivation baseline ↕</button></th><th>Obiettivo</th><th><button type="button" data-sort="4">Pressione ↕</button></th><th>Esperienza Champions</th></tr></thead><tbody>${rows}</tbody></table></div><aside><strong>Trasparenza</strong><p>${esc(data.warning)}</p></aside></section>`;
  }

  function surpriseFactorSignal(entry){
    if(!entry)return `<div class="reading-hero-signal reading-hero-surprise"><span>Fattore sorpresa</span><strong>N/D</strong><small>Dato non disponibile</small></div>`;
    const info="Misura quanto è probabile che la partita si discosti dal risultato più atteso, considerando mercato, forma, campo, assenze, matchup tattico e motivazione.";
    const reasons=entry.reasons?.length?`<ul>${entry.reasons.map(reason=>`<li>${esc(reason)}</li>`).join("")}</ul>`:"";
    const componentLabels={market:"Mercato",form:"Forma",venue:"Casa/trasferta",absences:"Assenze",tactical:"Matchup",motivation:"Motivazione"};
    const components=Object.entries(entry.components||{}).map(([key,value])=>`<span><small>${esc(componentLabels[key]||key)}</small><b>${value}</b></span>`).join("");
    return `<div class="reading-hero-signal reading-hero-surprise champions-surprise-factor is-${esc(entry.surpriseLevel.replace(/\s+/g,"-"))}" title="${esc(info)}"><span>Fattore sorpresa <i aria-label="${esc(info)}">i</i></span><strong>${entry.surpriseFactor}/100</strong><small>${esc(entry.surpriseLevel)} · confidence ${esc(entry.confidence.label)}</small><div class="champions-surprise-bar" role="progressbar" aria-label="Fattore sorpresa ${entry.surpriseFactor} su 100" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${entry.surpriseFactor}"><b style="width:${entry.surpriseFactor}%"></b></div><details><summary>Perché</summary>${reasons}<div class="champions-surprise-components">${components}</div>${entry.confidence.missingOrFallbackComponents?.length?`<p>Dati mancanti o in fallback: ${entry.confidence.missingOrFallbackComponents.map(key=>esc(componentLabels[key]||key)).join(", ")}.</p>`:""}</details></div>`;
  }

  function pilotReadingDetail(fixture,pilot,backtest,squads,branding,h2h,motivationEntry,styleProfiles,attackByTeam,surpriseEntry,playerMarketEntry,playerMarketDataset){
    const scoreCards=fixture.scoreForecast.display.map((score,index)=>`<div class="${index===0?"is-central":""}"><strong>${esc(score.score)}</strong><small>${esc(score.label)} · ${score.probabilityPct.toFixed(1)}%</small></div>`).join("");
    const confidence=fixture.confidence==="high"?"Alta":fixture.confidence==="medium"?"Media":fixture.confidence==="low"?"Bassa":"N/D";
    const combinedMetric=key=>{const values=fixture.teamProjections.map(team=>team[key]);return values.every(Boolean)?{central:values.reduce((sum,item)=>sum+item.central,0),min:values.reduce((sum,item)=>sum+item.min,0),max:values.reduce((sum,item)=>sum+item.max,0)}:null};
    const range=metric=>metric?`${metric.central.toFixed(1)} <small>${metric.min.toFixed(1)}–${metric.max.toFixed(1)}</small>`:"N/D";
    const matchProjectionData=fixture.matchProjection||{shotsTotal:combinedMetric("shotsTotal"),shotsOnTarget:combinedMetric("shotsOnTarget"),corners:combinedMetric("corners")};
    const matchProjection=`<article class="prediction-match-volume champions-combined-volume"><div><p class="eyebrow">Totale partita</p><h3>Valori combinati</h3><small>Valore centrale · intervallo storico p20–p80</small></div><dl><div><dt>Gol attesi medi</dt><dd>${fixture.expectedGoals.total.toFixed(2)} <small>${fixture.expectedGoals.home.toFixed(2)}–${fixture.expectedGoals.away.toFixed(2)}</small></dd></div><div><dt>Fascia gol probabile</dt><dd>${fixture.goalBand.min}–${fixture.goalBand.max} <small>${fixture.goalBand.probabilityPct.toFixed(1)}%</small></dd></div><div><dt>Tiri totali</dt><dd>${range(matchProjectionData.shotsTotal)}</dd></div><div><dt>Tiri nello specchio</dt><dd>${range(matchProjectionData.shotsOnTarget)}</dd></div><div><dt>Corner</dt><dd>${range(matchProjectionData.corners)}</dd></div></dl><p class="champions-goal-explainer">I gol attesi sono la media di tutti gli scenari, non un secondo risultato esatto.</p></article>`;
    const teamProjection=team=>`<article class="prediction-team-volume champions-reading-team-volume">${teamBadge(team.team,branding)}<div class="prediction-volume-metrics"><div><span>Gol attesi</span><strong>${team.expectedGoals.toFixed(2)}</strong><small>${venueLabel(team.venue)}</small></div><div><span>Tiri totali</span>${metricValue(team.shotsTotal,team.venue)}</div><div><span>Tiri nello specchio</span>${metricValue(team.shotsOnTarget,team.venue)}</div><div><span>Corner</span>${metricValue(team.corners,team.venue)}</div><div><span>Falli</span>${metricValue(team.fouls,team.venue)}</div><div><span>Cartellini</span>${metricValue(team.cards,team.venue)}</div></div></article>`;
    const h2hFixture=h2h.fixtures.find(item=>item.fixtureId===fixture.fixtureId);
    const h2hEvents=(items,emptyLabel)=>Array.isArray(items)?items.length?`<ul>${items.map(item=>`<li><strong>${esc(item.player)}</strong><small>${esc(item.team)} · ${item.minute?`${esc(item.minute)}'`:"minuto N/D"}${item.penalty?" · rigore":""}${item.ownGoal?" · autogol":""}${item.note?` · ${esc(item.note)}`:""}</small></li>`).join("")}</ul>`:`<p class="reading-h2h-empty">${emptyLabel}</p>`:'<p class="reading-h2h-empty">Dettaglio N/D</p>';
    const h2hRows=(h2hFixture?.recentMatches||[]).map((match,index)=>{const fallbackSource=h2h.source.pages.find(page=>page.competition===match.competition&&page.season===match.season),sources=match.sources||[fallbackSource].filter(Boolean);return `<details class="reading-h2h-match"${index===0?" open":""}><summary><span>${esc(shortDate(match.date))} · ${esc(match.competition)}</span><strong>${esc(match.homeTeam)} ${match.score90.home}-${match.score90.away} ${esc(match.awayTeam)}</strong></summary><div class="reading-h2h-events"><section><h3>Marcatori</h3>${h2hEvents(match.goals,"Nessun gol")}</section><section><h3>Ammoniti</h3>${h2hEvents(match.bookings,"Nessun ammonito")}</section></div>${sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noreferrer">Fonte ${esc(source.provider||"UEFA")}</a>`).join("")}</details>`}).join("");
    const h2hPanel=h2hRows?`<section class="section reading-h2h-section champions-reading-h2h" id="champions-history"><header class="section-heading"><div><p class="eyebrow">Storico ufficiale · UEFA</p><h2>Ultimi ${h2hFixture.meetings} scontri diretti disponibili</h2></div><p>${h2hFixture.meetings}/${h2hFixture.maximumMeetings||4} precedenti · competizioni UEFA</p></header><div class="reading-h2h-list">${h2hRows}</div></section>`:"";
    const bookedPanel=playerMarketEntry?.likelyBooked?.length?`<section class="prediction-booked-panel"><header><div><p class="eyebrow">Gerarchia disciplinare</p><h2>5 probabili ammoniti</h2></div><p>Indice comparativo; la quota è aggiunta dopo il calcolo.</p></header><ol>${playerMarketEntry.likelyBooked.map(candidate=>`<li class="${candidate.possibleFirstBooked?"possible-first-booked":""}"><span>${candidate.rank}</span><div><strong>${esc(candidate.name)}</strong><small>${esc(candidate.team)} · ${esc(candidate.role)}${candidate.possibleFirstBooked?" · possibile primo ammonito":""}</small><em>${candidate.evidence.map(esc).join(" · ")}</em>${candidate.sisal?`<small>Quota Sisal ${candidate.sisal.odds.toFixed(2)} · sostituto incluso</small>`:"<small>Quota Sisal N/D</small>"}</div><b>${candidate.riskScore}/100</b></li>`).join("")}</ol></section>`:"";
    const mvp=playerMarketEntry?.mvpCandidate;
    const mvpPanel=mvp?`<aside class="prediction-mvp"><p class="eyebrow">Candidato MVP</p><strong>${esc(mvp.name)}</strong><span>${esc(mvp.team)} · ${esc(mvp.role)} · indice ${mvp.score}/100</span><div class="prediction-mvp-history"><b>Storico MVP 2025/26</b><span>N/D · nessuno storico Champions omogeneo integrato</span></div><ul>${mvp.evidence.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>${mvp.surpriseCandidate?`<em>Alternativa sorpresa: ${esc(mvp.surpriseCandidate.name)} (${esc(mvp.surpriseCandidate.team)})</em>`:""}<small>Confidenza ${esc(mvp.confidence)} · stessi pesi strutturali usati in Serie A</small></aside>`:"";
    const shooterList=(items,key,marketKey)=>`<ol>${items.map(item=>{const quote=item.markets?.[marketKey];return `<li><span>${item.rank}</span><div><strong>${esc(item.name)}</strong><small>${esc(item.team)} · ${esc(item.role)}</small><em>${item.dataStatus==="role-baseline"?"Baseline di ruolo":`${item.minutes} minuti verificati nel 2025/26`}</em></div><b>${item[key].toFixed(2)}<small>${quote?`Sisal ${quote.odds.toFixed(2)}`:"quota N/D"}</small></b></li>`}).join("")}</ol>`;
    const shooters=playerMarketEntry?.shooters;
    const shootersPanel=shooters?`<section class="section champions-shooters" aria-labelledby="champions-shooters-title"><header class="section-heading"><div><p class="eyebrow">Probabili titolari · proiezione individuale</p><h2 id="champions-shooters-title">Possibili migliori tiratori</h2></div><p>Volumi previsti, non soglie dettate dalle quote.</p></header><div><article><h3>Tiri totali</h3><p>Media prevista del giocatore</p>${shooterList(shooters.totalShots,"projectedShots","shotsOver05")}</article><article><h3>Tiri in porta</h3><p>Media prevista nello specchio</p>${shooterList(shooters.shotsOnTarget,"projectedShotsOnTarget","shotsOnTargetOver05")}</article></div><p class="objective-method">Le frequenze per 90 minuti sono regolarizzate per ruolo e scalate sul volume atteso della squadra. “Sisal” è soltanto la quota disponibile per almeno un tiro o un tiro in porta con sostituto incluso.</p></section>`:"";
    const comboCard=combo=>combo.qualityStatus==="nd"||!combo.legs?.length?`<article class="prediction-combo-card prediction-combo-card-nd"><span>${esc(combo.scenario)} · rischio ${esc(combo.risk)}</span><div><strong>N/D</strong><small>${esc(combo.unavailableReason)}</small></div></article>`:`<article class="prediction-combo-card" data-quality="${esc(combo.qualityStatus)}"><span>${esc(combo.scenario)} · rischio ${esc(combo.risk)}</span><strong>Quota Sisal ${combo.odds.toFixed(2)} · obiettivo ${combo.targetOdds.toFixed(2)}${combo.targetReached === false ? " · non raggiunto" : ""}</strong><ul class="prediction-combo-legs">${combo.legs.map(leg=>`<li><span>${esc(leg.label)}${leg.replacementIncluded?" · sostituto incluso":""}</span><b>@ ${leg.odds.toFixed(2)}</b></li>`).join("")}</ul>${Number.isFinite(combo.prudentProbabilityPct)?`<dl class="prediction-combo-metrics"><div><dt>Prob. prudenziale</dt><dd>${combo.prudentProbabilityPct}%</dd></div><div><dt>Quota equa</dt><dd>${combo.fairOdds.toFixed(2)}</dd></div></dl>`:""}<p>${esc(combo.probabilityMethod)}</p></article>`;
    const myCombo=playerMarketEntry?`<section class="section reading-panel-grid champions-reading-combo"><section class="reading-data-panel reading-data-panel-wide"><span>MyCombo</span><p class="champions-combo-policy">Combinazioni selezionate dal modello con obiettivi di quota 5, 10 e 20. Quote indicative calcolate come prodotto delle singole selezioni.</p><div class="prediction-combos">${playerMarketEntry.combinations.map(comboCard).join("")}</div><small>Quote aggiornate ${esc(shortDate(String(playerMarketDataset?.oddsRetrievedAt||"").slice(0,10)))}. Esclusi cartellini, DNB, confronti tiri, prima a corner, quasi ammonito e mercati non compatibili.</small></section></section>`:"";
    return `<nav class="reading-back champions-reading-back"><a href="champions-league.html">← Tutte le letture</a><span>Giornata 1</span></nav>
      <section class="reading-match-hero champions-reading-match-hero" aria-labelledby="champions-reading-title"><div><p class="eyebrow">UEFA Champions League · Giornata 1 · prepartita</p><h1 id="champions-reading-title">${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}</h1><p>${esc(dayLabel(fixture.date))} · ${esc(fixture.kickoff)}</p></div><div class="reading-matchup champions-reading-matchup" aria-label="${esc(fixture.homeTeam)} contro ${esc(fixture.awayTeam)}">${teamBadge(fixture.homeTeam,branding,{showName:false})}<b>VS</b>${teamBadge(fixture.awayTeam,branding,{showName:false})}</div><div class="reading-summary reading-summary-prototype reading-hero-summary reading-result-summary champions-reading-summary"><div class="reading-exact-scores"><span>3 risultati esatti possibili</span><div class="reading-score-list">${scoreCards}</div></div>${surpriseFactorSignal(surpriseEntry)}<div class="reading-hero-signal"><span>Confidenza</span><strong>${confidence}</strong><small>${esc(fixture.dataQuality.label)}</small></div></div></section>
      <section class="section reading-projection-prototype prediction-volume-section champions-reading-volume" id="champions-forecast"><header class="section-heading"><div><p class="eyebrow">Pronostico e dati di gara</p><h2>Scenario principale</h2></div><p>Distribuzione dei gol e volumi della partita.</p></header><section class="champions-reading-volume-block" id="champions-volumes">${matchProjection}<header class="section-heading"><div><p class="eyebrow">Proiezione per squadra</p><h2>Gol, tiri, specchio, corner, falli e cartellini</h2></div><p>Storico distinto tra casa e trasferta.</p></header><div class="prediction-volume-grid">${fixture.teamProjections.map(teamProjection).join("")}</div><p class="objective-method">Tiri e corner combinano produzione per sede, valori concessi dall'avversaria e ultime otto gare; le fasce sono percentili p20–p80, non margini fissi. La designazione arbitrale è verificata ma non viene applicata come moltiplicatore automatico dei cartellini. I dati mancanti restano N/D.</p></section></section>
      ${shootersPanel}
      <section class="section champions-player-predictions"><div class="prediction-players-grid">${bookedPanel}${mvpPanel}</div></section>
      <section class="section reading-info-grid champions-reading-info" id="champions-lineups">${probableFormationCard(fixture,squads)}</section>
      ${tacticalBaselinePanel(fixture,styleProfiles,pilot.profiles,branding)}
      ${matchAttackChannelsPanel(fixture,attackByTeam,branding)}
      <section class="champions-reading-context" id="champions-context" aria-labelledby="champions-context-title"><header class="champions-reading-section-heading"><div><p class="eyebrow">Contesto della gara</p><h2 id="champions-context-title">Motivazione e direzione arbitrale</h2></div><p>Indicatori di contesto separati dal pronostico quantitativo.</p></header><div class="champions-reading-context-grid">${motivationPanel(motivationEntry)}${refereeReadingPanel(fixture.refereeAssignment)}</div></section>
      ${h2hPanel}
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

  function championsTeamDetail(team,strength,history,pilot,squads,attackProfile,data,branding){
    const teamFixtures=data.fixtures.filter(item=>item.homeTeam===team.team||item.awayTeam===team.team).sort((a,b)=>`${a.date}T${a.kickoff}`.localeCompare(`${b.date}T${b.kickoff}`));
    const nextFixture=teamFixtures.find(item=>item.probableFormation);
    const probableSide=nextFixture?.probableFormation?.[nextFixture.homeTeam===team.team?"home":"away"];
    const calendarRows=teamFixtures.map(item=>{
      const reading=pilot.fixtures.find(entry=>entry.fixtureId===item.id);
      const content=`<span class="champions-calendar-round">${item.matchday}ª</span><span class="champions-calendar-date">${esc(shortDate(item.date))} · ${esc(item.kickoff)}</span><strong>${esc(item.homeTeam)} – ${esc(item.awayTeam)}</strong><span class="champions-calendar-venue">${item.homeTeam===team.team?"Casa":"Trasferta"}</span><span class="champions-calendar-action">${reading?"Lettura →":""}</span>`;
      return `<li data-team-home="${esc(item.homeTeam)}" data-team-away="${esc(item.awayTeam)}">${reading?`<a href="champions-league.html?match=${esc(reading.fixtureId)}">${content}</a>`:`<div>${content}</div>`}</li>`;
    }).join("");
    const calendarPanel=`<section class="champions-team-calendar" aria-labelledby="team-calendar-title"><header><div><h2 id="team-calendar-title">Calendario</h2><p>Fase campionato · ${teamFixtures.length} partite · orari italiani</p></div><a href="${esc(data.source.url)}" target="_blank" rel="noreferrer">Fonte UEFA ↗</a></header><ul class="champions-calendar-list">${calendarRows}</ul></section>`;
    const roleLabel=position=>({goalkeeper:"Portiere",defender:"Difensore",midfielder:"Centrocampista",forward:"Attaccante"}[position]||"N/D");
    const fixture=pilot.fixtures.find(item=>item.homeTeam===team.team||item.awayTeam===team.team);
    const stat=value=>typeof value==="number"?value.toLocaleString("it-IT",{maximumFractionDigits:2}):"N/D";
    const playerCards=entry=>{
      const values=[entry?.yellowCards,entry?.secondYellowCards,entry?.straightRedCards];
      return values.every(value=>value==null)?null:values.reduce((sum,value)=>sum+(value??0),0);
    };
    const playerRows=team.players.map(player=>{
      const previous=player.previousSeason?.totals;
      const competitions=[...new Set((player.previousSeason?.entries||[]).map(entry=>entry.competition))];
      return `<tr data-champions-player="${esc(player.id)}"><th scope="row"><span>${esc(player.name)}${player.registrationList==="B"?"<em>Lista B</em>":""}</span><small>${competitions.length?esc(competitions.join(" · ")):"Storico 2025/26 N/D"}</small></th><td>${esc(roleLabel(player.position))}</td><td>${stat(previous?.appearances)}</td><td>${stat(previous?.minutes)}</td><td>${stat(previous?.goals)}</td><td>${stat(previous?.per90?.goals)}</td><td>${stat(previous?.assists)}</td><td>${stat(previous?.per90?.assists)}</td><td>${stat(previous?.shots)}</td><td>${stat(previous?.per90?.shots)}</td><td>${stat(previous?.shotsOnTarget)}</td><td>${stat(previous?.per90?.shotsOnTarget)}</td><td>${stat(playerCards(previous))}</td><td>${stat(previous?.per90?.cards)}</td><td>${stat(previous?.foulsCommitted)}</td><td>${stat(previous?.per90?.foulsCommitted)}</td><td>${stat(previous?.foulsWon)}</td><td>${stat(previous?.per90?.foulsWon)}</td></tr>`;
    }).join("");
    const strengthValue=strength?.europeanStrengthIndex==null?"N/D":strength.europeanStrengthIndex.toFixed(1);
    const historyValue=history?.overall?.pointsPerMatch==null?"N/D":history.overall.pointsPerMatch.toFixed(2);
    const volume=pilot.profiles.find(profile=>profile.team===team.team);
    const volumeMetrics=[
      ["Gol",volume?.venues.overall.goals],
      ["Tiri",volume?.venues.overall.totalShots],
      ["Tiri in porta",volume?.venues.overall.shotsOnTarget],
      ["Corner",volume?.venues.overall.wonCorners],
      ["Falli",volume?.venues.overall.foulsCommitted],
      ["Cartellini gialli",volume?.venues.overall.yellowCards]
    ];
    const metricCell=value=>value?.mean==null?"N/D":value.mean.toFixed(2);
    const volumeRows=volumeMetrics.map(([label,value])=>`<tr><th scope="row">${esc(label)}</th><td>${metricCell(value?.for)}</td><td>${metricCell(value?.against)}</td><td>${value?.for.matches??0}</td></tr>`).join("");
    const volumeSource=volume?.baselineKind==="uefa-fallback"?`${volume.league} · fallback UEFA`:(volume?.league||"N/D");
    const volumePanel=volume?.usableForDetailedVolumes
      ?`<section class="champions-team-volume" aria-labelledby="champions-team-volume-title"><header><div><p class="eyebrow">Statistiche di squadra</p><h2 id="champions-team-volume-title">Produzione e concessioni</h2></div><p>${esc(volumeSource)} · ${volume.matches} gare complete · casa/trasferta ${volume.homeMatches}/${volume.awayMatches}</p></header><div class="champions-strength-table-wrap"><table><thead><tr><th>Metrica</th><th>Prodotti / gara</th><th>Concessi / gara</th><th>Campione</th></tr></thead><tbody>${volumeRows}</tbody></table></div><p class="objective-method">Medie storiche usate per i volumi della lettura. Il fallback UEFA è dichiarato e non viene presentato come campionato domestico.</p></section>`
      :`<section class="champions-team-volume is-unavailable" aria-labelledby="champions-team-volume-title"><header><div><p class="eyebrow">Statistiche di squadra</p><h2 id="champions-team-volume-title">Dati N/D</h2></div><p>${esc(volumeSource)}</p></header><div class="reading-panel-empty"><strong>N/D</strong><p>Il provider non espone un campione con tiri, corner, falli e cartellini verificabili. Nessuno zero è stato dedotto.</p></div></section>`;
    const channelSource=attackProfile?.sourceUrl?`<a href="${esc(attackProfile.sourceUrl)}" target="_blank" rel="noreferrer">Fonte WhoScored ↗</a>`:"<span>Fonte non disponibile</span>";
    const attackPanel=attackProfile?.attackChannels?`<section class="champions-team-attack" aria-labelledby="champions-team-attack-title"><header><div><p class="eyebrow">Statistiche di squadra · 2025/26</p><h2 id="champions-team-attack-title">Fasce d'attacco</h2></div><p>${esc(attackProfile?.competition||"Campione N/D")}${attackProfile?.dataQuality==="uefa-fallback"?" · fallback UEFA":""}</p></header>${attackChannelsPanel(attackProfile)}<footer>${attackProfile?.totalTouches?`<span>${attackProfile.totalTouches.toLocaleString("it-IT")} tocchi classificati</span>`:"<span>Nessuno zero dedotto</span>"}${channelSource}</footer></section>`:"";
    return `<nav class="champions-reading-back"><a href="champions-league.html">← Champions League</a><span>Scheda squadra</span></nav><section class="champions-team-hero"><div><p class="eyebrow">UEFA Champions League 2026/27</p><h1>${esc(team.team)}</h1><p>Allenatore: ${esc(team.coach||"N/D")}</p></div><div><small>Rosa registrata</small><strong>${team.counts.total}</strong><span>${team.counts.listB} Lista B</span></div></section><section class="champions-team-status" aria-label="Stato dati squadra"><article><small>Registrazione UEFA</small><strong>Integrata</strong><span>${esc(shortDate(team.registration.updatedAt))}</span></article><article><small>Disponibilità</small><strong>N/D</strong><span>Nessuna deduzione</span></article><article><small>Probabile formazione</small><strong>${esc(probableSide?.formation||"N/D")}</strong><span>${probableSide?"Editoriale · non ufficiale":"Fonte non integrata"}</span></article><article><small>Convocati gara</small><strong>N/D</strong><span>Non pubblicati nel dataset</span></article><article><small>Distinta ufficiale</small><strong>N/D</strong><span>Da aggiornare a ridosso della gara</span></article></section><section class="champions-team-overview"><article><small>Indice europeo</small><strong>${strengthValue}</strong><span>${strength?.dataCoveragePct??"N/D"}% copertura</span></article><article><small>Punti/gara europei</small><strong>${historyValue}</strong><span>${history?.overall?.matches??"N/D"} gare storiche</span></article><article><small>Prossima lettura</small><strong>${fixture?`${esc(fixture.homeTeam)} – ${esc(fixture.awayTeam)}`:"N/D"}</strong>${fixture?`<a href="champions-league.html?match=${esc(fixture.fixtureId)}">Apri lettura →</a>`:"<span>Nessuna lettura pilot</span>"}</article></section>${calendarPanel}${nextFixture?`<section class="champions-team-lineup">${probableFormationCard(nextFixture,squads,team.team)}</section>`:""}${volumePanel}${attackPanel}<section class="champions-team-players"><header><div><p class="eyebrow">Statistiche 2025/26</p><h2>Giocatori</h2></div><p>Storico 2025/26; per i campionati ad anno solare è indicato il 2025. Dati ESPN e schede Serie A, con N/D per le statistiche non disponibili.</p></header><div class="champions-strength-table-wrap" role="region" aria-label="Statistiche giocatori; scorri orizzontalmente" tabindex="0"><table class="champions-player-stats-table"><thead><tr><th rowspan="2">Calciatore</th><th rowspan="2">Ruolo</th><th rowspan="2">PG</th><th rowspan="2">Min</th><th colspan="2">Gol</th><th colspan="2">Assist</th><th colspan="2">Tiri totali</th><th colspan="2">Tiri nello specchio</th><th colspan="2">Cartellini</th><th colspan="2">Falli commessi</th><th colspan="2">Falli subiti</th></tr><tr><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th></tr></thead><tbody>${playerRows}</tbody></table></div><p class="champions-player-stats-note">Le statistiche Champions 2026/27 restano separate e saranno valorizzate solo dopo le gare ufficiali. Fonte storica: referti e statistiche stagionali ESPN. Per le italiane sono prioritari i profili Serie A; i dati mancanti sono integrati solo con associazioni verificate. Le competizioni ad anno solare riportano il 2025.</p></section>`;
  }

  function historyDirectory(history){
    const rows=history.teams.map(profile=>`<tr><th scope="row">${esc(profile.team)}<small>${profile.overall.matches} gare · ${profile.seasonsPlayed} ${profile.seasonsPlayed===1?"stagione":"stagioni"}${profile.competitionsPlayed.length?` · ${esc(profile.competitionsPlayed.join("/"))}`:""}</small></th><td><strong>${ppgLabel(profile.overall.pointsPerMatch)}</strong></td><td>${ppgLabel(profile.levelAdjustedPointsPerMatch)}</td><td>${ppgLabel(profile.home.pointsPerMatch)}</td><td>${ppgLabel(profile.away.pointsPerMatch)}</td><td>${ppgLabel(profile.recent10.pointsPerMatch)}</td><td>${ppgLabel(profile.averageOpponentPointsPerMatch)}</td><td>${esc(profile.progression.label)}</td><td>${profile.coverage==="sufficient"?"Sufficiente":profile.coverage==="limited"?"Limitata":"N/D"}</td></tr>`).join("");
    const sourceLinks=["Champions League","UEFA Europa League","UEFA Conference League"].map(competition=>history.source.pages.find(item=>item.competition===competition&&item.season==="2025-26")).filter(Boolean).map(item=>`<a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.competition.replace("UEFA ",""))} ↗</a>`).join("");
    return `<details class="champions-strength-panel champions-history-panel"><summary><span><small>${history.summary.historicalMatches} risultati ufficiali</small><strong>Rendimento europeo 2023/24–2025/26</strong></span><span>${history.summary.sufficient} campioni sufficienti · ${history.summary.limited} limitati · ${history.summary.unavailable} N/D</span></summary><div class="champions-strength-intro"><p>Champions, Europa e Conference sui 90 minuti. Pesi provvisori: UCL 1,00 · UEL 0,78 · UECL 0,62. Casa, trasferta, ultime dieci e avversari restano indicatori descrittivi, non probabilità.</p><span class="champions-source-links">${sourceLinks}</span></div><div class="champions-strength-table-wrap"><table class="champions-strength-table champions-history-table"><thead><tr><th>Squadra</th><th>P/G</th><th>P/G pond.</th><th>Casa</th><th>Trasf.</th><th>Ultime 10</th><th>Avversari</th><th>Progressione</th><th>Campione</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }

  async function render(){
    const requestedMatchId=new URLSearchParams(location.search).get("match");
    const requestedTeamId=new URLSearchParams(location.search).get("team");
    const [data,strength,history,model,h2h,pilot,backtest,squads,motivation,styleProfiles,attackChannels,surpriseFactors,playerMarkets]=await Promise.all([load("champions-league-2026-27.json"),load("champions-team-strength-2026-27.json"),load("uefa-team-history-2026-27.json"),load("champions-1x2-2026-27.json"),load("champions-head-to-head-2026-27.json"),load("champions-pilot-predictions-2026-27.json"),load("champions-pilot-volume-backtest.json"),load("champions-registered-squads-2026-27.json"),load("champions-motivation-md01-2026-27.json"),load("team-style-profiles.json"),load("champions-attack-channels-2025-26.json"),load("champions-surprise-factor-md01-2026-27.json"),load("champions-player-markets-md01-2026-27.json")]);
    const profiles=new Map(strength.teams.map(profile=>[profile.team,profile]));
    const histories=new Map(history.teams.map(profile=>[profile.team,profile]));
    const attackByTeam=new Map(attackChannels.profiles.map(profile=>[profile.team,profile]));
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
      const surpriseByFixture=new Map(surpriseFactors.fixtures.map(item=>[item.fixtureId,item]));
      document.querySelector("#app").innerHTML=pilotReadingDetail(requestedFixture,pilot,backtest,squads,branding,h2h,motivationByFixture.get(requestedMatchId),styleProfiles,attackByTeam,surpriseByFixture.get(requestedMatchId),playerMarkets.fixtures.find(item=>item.fixtureId===requestedMatchId),playerMarkets);
      return;
    }
    if(requestedCalendarFixture&&motivationByFixture.has(requestedMatchId)){
      document.querySelector("#app").innerHTML=motivationOnlyDetail(requestedCalendarFixture,motivationByFixture.get(requestedMatchId),branding,squads);
      return;
    }
    const requestedTeam=requestedTeamId?squads.teams.find(team=>team.id===requestedTeamId):null;
    if(requestedTeam){
      document.querySelector("#app").innerHTML=`<div class="champions-team-detail">`+championsTeamDetail(requestedTeam,profiles.get(requestedTeam.team),histories.get(requestedTeam.team),pilot,squads,attackByTeam.get(requestedTeam.team),data,branding)+`</div>`;
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
