import {championsShirtNumber} from '../components/champions-shirt-numbers.mjs';
import {renderLineupField} from '../components/lineup-field.mjs';
import {isReadingPilot} from './reading-detail/view-model.mjs';
export function createPage(deps){
  const {esc,load,loadDerived}=deps;
  const dayLabel=value=>new Intl.DateTimeFormat("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Rome"}).format(new Date(`${value}T12:00:00+01:00`));
  const matchdayLabel=number=>`${number}ª giornata`;
  const shortDate=value=>new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Rome"}).format(new Date(`${value}T12:00:00Z`));

  const scoreLabel=profile=>profile?.europeanStrengthIndex==null?"N/D":profile.europeanStrengthIndex.toFixed(1);
  const ppgLabel=value=>value==null?"N/D":value.toFixed(2);
  const coachDisplayName=value=>String(value??"").replace(/\s*[-\u2010-\u2015]{3,}\s*$/u,"").trim()||"N/D";
  const teamBadge=(teamName,branding,{showName=true}={})=>{
    const team=branding.get(teamName);
    const initials=team?.shortName||teamName.split(/\s+/).map(part=>part[0]).join("").slice(0,3).toUpperCase();
    return `<span class="team-with-logo"><span class="team-logo"><img src="${esc(team?.logo||"")}" alt="Stemma ${esc(teamName)}" loading="lazy" onerror="this.hidden=true;this.parentElement.classList.add('fallback')"><b>${esc(initials)}</b></span>${showName?`<span class="team-name">${esc(teamName)}</span>`:""}</span>`;
  };

  const refereeMetric=metric=>metric?`<strong class="${metric.highlight?"is-highlighted":""}">${esc(metric.display)}</strong>`:"N/D";
  const refereeNumber=(value,digits=2)=>Number.isFinite(value)?value.toLocaleString("it-IT",{minimumFractionDigits:digits,maximumFractionDigits:digits}):"N/D";
  const refereePercent=value=>Number.isFinite(value)?`${Math.round(value*100)}%`:"N/D";
  const refereeDate=value=>value?new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Rome"}).format(new Date(`${value}T12:00:00Z`)):"N/D";
  const refereeName=(assignment,profile)=>assignment?.status==="assigned"?`${esc(assignment.referee.name)} <span class="champions-reading-referee-country"><span aria-hidden="true">${esc(assignment.referee.countryFlag)}</span> ${profile?.country?esc(profile.country):"Nazionalità N/D"}</span>`:"Da designare";
  const refereeOvers=(frequencies,label)=>{
    const rows=[["over3_5","Over 3,5"],["over4_5","Over 4,5"],["over5_5","Over 5,5"]].filter(([key])=>Number.isFinite(frequencies?.[key]?.frequency));
    if(!rows.length)return "";
    return `<section class="champions-reading-referee-overs"><h3>${esc(label)}</h3><div>${rows.map(([key,name])=>{const metric=frequencies[key];return `<span><small>${name}</small><strong>${refereePercent(metric.frequency)}</strong><em>n=${metric.matches}</em></span>`}).join("")}</div></section>`;
  };

  function refereeReadingPanel(assignment,profile){
    if(!assignment||assignment.status!=="assigned")return "";
    if(profile){
      const career=profile.career;
      const recent=profile.last10;
      const currentUcl=profile.groupedSamples?.["current:champions-league"];
      const historicalUcl=profile.groupedSamples?.["historical:champions-league"];
      const roles=[
        ["Assistenti",assignment.assistants?.join(" · ")],
        ["IV ufficiale",assignment.fourthOfficial],
        ["VAR",assignment.var],
        ["AVAR",assignment.avar]
      ].filter(([,value])=>value);
      const officials=roles.length?`<dl>${roles.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`:"";
      const recentSummary=recent?`<section class="champions-reading-referee-recent"><h3>Ultime ${recent.matches} gare</h3><p>${refereeDate(recent.period.from)}–${refereeDate(recent.period.to)} · <strong>${refereeNumber(recent.yellowCards.perMatch)}</strong> gialli · <strong>${refereeNumber(recent.redCards.perMatch)}</strong> rossi · <strong>${refereeNumber(recent.fouls.perMatch)}</strong> falli per gara</p>${refereeOvers(recent.overCardFrequencies,`Over recenti · n=${recent.matches}`)}</section>`:"";
      const careerOvers=refereeOvers(career.overCardFrequencies,`Over carriera · n=${career.matches}`);
      return `<aside class="reading-referee-assignment champions-reading-referee champions-reading-hero-referee has-validated-profile" id="lettura-referee" aria-labelledby="champions-reading-referee-title" data-referee-id="${esc(profile.refereeId)}"><header><div><p class="eyebrow">Designazione arbitrale</p><h2 id="champions-reading-referee-title">${refereeName(assignment,profile)}</h2></div><p>Profilo disciplinare validato.</p></header>${officials}<div class="champions-reading-referee-profile"><div class="reading-referee-stats champions-reading-referee-stats"><article><span>Partite arbitrate</span><strong>${career.matches}</strong></article><article><span>Gialli / gara</span><strong>${refereeNumber(career.yellowCards.perMatch)}</strong></article><article><span>Rossi / gara</span><strong>${refereeNumber(career.redCards.perMatch)}</strong></article><article><span>Falli / gara</span><strong>${refereeNumber(career.fouls.perMatch)}</strong></article></div><p class="champions-reading-referee-sample"><strong>Campione principale:</strong> carriera, tutte le competizioni · ${esc(career.period)} · n=${career.matches}. <strong>Champions League separata:</strong> 2026/27 n=${currentUcl?.matches??0} · storico n=${historicalUcl?.matches??0}.</p><div class="champions-reading-referee-detail">${careerOvers}${recentSummary}</div><p class="reading-referee-method">Fonte statistiche: <a href="${esc(profile.source.url)}" target="_blank" rel="noreferrer">${esc(profile.source.provider)} ↗</a> · snapshot ${refereeDate(profile.source.retrievedAt)}. TotalCards = gialli + rossi; campioni non combinati. Dati informativi: nessun correttivo applicato ai pronostici.</p></div></aside>`;
    }
    const stats=assignment.statistics;
    const roles=[
      ["Assistenti",assignment.assistants?.join(" · ")],
      ["IV ufficiale",assignment.fourthOfficial],
      ["VAR",assignment.var],
      ["AVAR",assignment.avar]
    ].filter(([,value])=>value);
    const officials=roles.length?`<dl>${roles.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`:"";
    const statistics=stats?`<div class="reading-referee-stats champions-reading-referee-stats"><article><span>Gialli / gara</span>${refereeMetric(stats.yellowCardsPerMatch)}</article><article><span>Rossi / gara</span>${refereeMetric(stats.redCardsPerMatch)}</article><article><span>Falli / gara</span>${refereeMetric(stats.foulsPerMatch)}</article><article><span>Rigori / gara</span>${refereeMetric(stats.penaltiesPerMatch)}</article></div><p class="reading-referee-method">Profilo storico riportato come fornito; non applicato automaticamente alle proiezioni della partita.</p>`:`<div class="reading-referee-stats champions-reading-referee-stats"><article><span>Statistiche disciplinari</span><strong>N/D</strong></article></div><p class="reading-referee-method">Le statistiche arbitrali non sono presenti nelle fonti e restano N/D. La designazione non modifica automaticamente il pronostico.</p>`;
    return `<aside class="reading-referee-assignment champions-reading-referee champions-reading-hero-referee" id="lettura-referee" aria-labelledby="champions-reading-referee-title"><header><div><p class="eyebrow">Designazione arbitrale</p><h2 id="champions-reading-referee-title">${refereeName(assignment)}</h2></div><p>Designazione e profilo disciplinare.</p></header>${officials}${statistics}</aside>`;
  }


  function matchReport(fixture){
    if(fixture?.status!=="finished")return "";
    const report=fixture.matchReport;
    const scorers=side=>report.scorers?.[side]?.length?report.scorers[side].map(esc).join(" · "):fixture.score[side]===0?"Nessun gol":"N/D";
    const stats=report.statistics;
    const statsPanel=stats?`<h2>Statistiche finali</h2><table><thead><tr><th>Dato</th><th>Casa</th><th>Ospite</th></tr></thead><tbody>${[["Tiri","shots"],["Nello specchio","shotsOnTarget"],["Corner","corners"],["Falli","fouls"]].filter(([,key])=>stats[key]).map(([label,key])=>`<tr><th>${label}</th><td>${stats[key][0]}</td><td>${stats[key][1]}</td></tr>`).join("")}</tbody></table><a href="${esc(stats.sourceUrl)}" target="_blank" rel="noreferrer">Fonte statistiche ↗</a>`:"<p>Statistiche finali: da verificare.</p>";
    let cards=report.cards?`<h2>Ammoniti</h2><p><strong>Casa:</strong> ${report.cards.yellow.home.map(esc).join(" · ")||"Nessuno"}</p><p><strong>Ospite:</strong> ${report.cards.yellow.away.map(esc).join(" · ")||"Nessuno"}</p><p>${esc(report.cards.coverage)}</p><a href="${esc(report.cards.sourceUrl)}" target="_blank" rel="noreferrer">Fonte cartellini ↗</a>`:"<p>Ammoniti: da verificare.</p>";
    if(report.redCards)cards+=`<h2>Espulsi</h2><p>${[...report.redCards.home,...report.redCards.away].map(esc).join(" · ")}</p><a href="${esc(report.redCards.sourceUrl)}" target="_blank" rel="noreferrer">Fonte espulsioni ↗</a>`;
    if(stats?.note)cards+=`<p>${esc(stats.note)}</p>`;
    return `<section class="champions-match-report champions-strength-panel"><header><p class="eyebrow">${esc(fixture.matchday||2)}ª giornata · Finale</p><h1>${esc(fixture.homeTeam)} ${fixture.score.home}–${fixture.score.away} ${esc(fixture.awayTeam)}</h1></header><h2>Marcatori</h2><p><strong>${esc(fixture.homeTeam)}:</strong> ${scorers("home")}</p><p><strong>${esc(fixture.awayTeam)}:</strong> ${scorers("away")}</p><p>Minuti, assist e sostituzioni completi: da verificare. I nomi sono raggruppati per squadra.</p><a href="${esc(report.scorersSourceUrl||report.sourceUrl)}" target="_blank" rel="noreferrer">Fonte marcatori ↗</a>${statsPanel}${cards}<p>Le sezioni seguenti conservano le proiezioni prepartita.</p></section>`;
  }
  function roundTable(data){
    const rows=new Map(data.teams.map(team=>[team,{team,played:0,points:0,gf:0,ga:0}]));
    for(const f of data.fixtures.filter(f=>f.status==="finished"))for(const [side,other] of [["home","away"],["away","home"]]){
      const row=rows.get(f[`${side}Team`]);row.played++;row.gf+=f.score[side];row.ga+=f.score[other];row.points+=f.score[side]>f.score[other]?3:f.score[side]===f.score[other]?1:0;
    }
    const sorted=[...rows.values()].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.team.localeCompare(b.team));
    return `<details class="champions-strength-panel champions-round-summary"><summary><strong>Riepilogo punti · fase campionato</strong><span>${data.summary.finished}/${data.fixtures.length} partite concluse</span></summary><p>Ordine per punti, differenza reti e gol segnati; a parità, ordine alfabetico. Non applica tutti gli spareggi della classifica UEFA.</p><div class="champions-strength-table-wrap"><table><thead><tr><th>Squadra</th><th>G</th><th>Punti</th><th>GF</th><th>GS</th><th>DR</th></tr></thead><tbody>${sorted.map(r=>`<tr><th>${esc(r.team)}</th><td>${r.played}</td><td>${r.points}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gf-r.ga}</td></tr>`).join("")}</tbody></table></div></details>`;
  }

  function fixtureCard(fixture,branding,pilotByFixture){
    const analysis=pilotByFixture.get(fixture.id);
    const finalScore=fixture.status==="finished"?`${fixture.score.home}–${fixture.score.away}`:"VS";
    const home=branding.get(fixture.homeTeam).colors;
    const away=branding.get(fixture.awayTeam).colors;
    const palette=`--home-color-1:${home[0]};--home-color-2:${home[1]};--away-color-1:${away[0]};--away-color-2:${away[1]}`;
    if(analysis){
      return `<a class="reading-fixture match fixture-card fixture-card-link champions-fixture champions-pilot-card" href="champions-league.html?match=${esc(analysis.fixtureId)}" aria-label="Apri la lettura di ${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}" style="${esc(palette)}"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata ${fixture.matchday}</span></div><span class="match-date">${esc(shortDate(fixture.date))} · ${esc(fixture.kickoff)}</span></header><span class="reading-fixture-teams">${teamBadge(fixture.homeTeam,branding)}<b>${finalScore}</b>${teamBadge(fixture.awayTeam,branding)}</span></a>`;
    }
    return `<article class="reading-fixture match fixture-card champions-fixture" data-team-home="${esc(fixture.homeTeam)}" data-team-away="${esc(fixture.awayTeam)}" style="${esc(palette)}"><header class="match-head"><div class="match-badges"><span class="matchday-chip">Giornata ${fixture.matchday}</span></div><time class="match-date" datetime="${esc(`${fixture.date}T${fixture.kickoff}`)}">${esc(shortDate(fixture.date))} · ${esc(fixture.kickoff)}</time></header><span class="reading-fixture-teams">${teamBadge(fixture.homeTeam,branding)}<b>${finalScore}</b>${teamBadge(fixture.awayTeam,branding)}</span></article>`;
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
    const official=probable?.status==="official"; const coach=team=>coachDisplayName([probable?.home,probable?.away].find(item=>item?.team===team)?.coach||squads.teams.find(item=>item.team===team)?.coach);
    const sourceProvider=probable?.source?.provider||"Fonte ufficiale";
    if(!probable)return `<article class="round16-info-box round16-formations champions-reading-lineups"><header class="champions-reading-block-heading"><div><p class="eyebrow">Proiezione editoriale</p><h2>Probabili formazioni</h2></div><p>Conferme e indisponibili restano espliciti.</p></header><div class="reading-panel-empty reading-panel-empty-compact"><strong>N/D</strong><span>Moduli e giocatori non disponibili.</span></div></article>`;
    const side=item=>{
      if(item.formation===null)return `<article class="reading-lineup-card champions-reading-lineup-card"><header><span>${esc(item.team)}</span><strong>Modulo N/D</strong></header><ol>${item.players.map(player=>`<li>${esc(player)}</li>`).join("")}</ol><footer><span>Allenatore: ${esc(coach(item.team))}</span><p>Modulo non indicato da ${esc(sourceProvider)}; elenco titolari senza disposizione tattica.</p><p>Panchina: ${(item.bench||[]).map(esc).join(", ")}</p></footer></article>`;
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
    const confidenceLabel=official?"Ufficiali":({"very-high":"Molto alta","medium-high":"Medio-alta",lower:"Più bassa","not-rated":"Non indicata dalla fonte"})[probable.lineupConfidence?.band]||"N/D";
    const uncertainTeams=(probable.lineupConfidence?.uncertainSides||[]).map(venue=>probable[venue]?.team).filter(Boolean);
    const uncertainty=uncertainTeams.length?`<em>XI da ricontrollare: ${uncertainTeams.map(esc).join(", ")}</em>`:"";
    const editorialSource=probable.source?.url?` Fonte: <a href="${esc(probable.source.url)}" target="_blank" rel="noreferrer">${esc(probable.source.provider||"fonte editoriale")}</a>.`:"";
    const coverageNote=official?`Formazioni ufficiali · <a href="${esc(probable.source.url)}" target="_blank" rel="noreferrer">${esc(sourceProvider)}</a>`:complete?`Moduli e undici editoriali disponibili; non sono distinte ufficiali.${editorialSource}`:"Sono disponibili soltanto i moduli; gli undici titolari non forniti restano N/D.";
    return `<article class="round16-info-box round16-formations champions-reading-lineups"><header class="champions-reading-block-heading"><div><p class="eyebrow">${official?`Confermate · ${esc(sourceProvider)}`:"Proiezione editoriale · non ufficiale"}</p><h2>${official?"Formazioni ufficiali":"Probabili formazioni"}</h2></div><p>Conferme e indisponibili restano espliciti.</p></header><div class="champions-lineup-confidence"><span>Confidenza XI</span><strong>${esc(confidenceLabel)}</strong>${uncertainty}</div>${!onlyTeam&&complete&&[probable.home,probable.away].every(item=>typeof item.formation==="string"&&item.formation.split("-").map(Number).reduce((a,b)=>a+b,1)===11)?renderLineupField([probable.home,probable.away].map(item=>({team:{name:item.team,colors:["#105ac5","#052b78"],coach:coach(item.team)},lineup:{formation:item.formation,players:item.players,coach:coach(item.team),status:official?"official":"probable",substitutes:item.bench||[]}})),{competition:"champions",shirtNumberFor:(player,team)=>championsShirtNumber(squads.shirtNumbers,squads.teams.find(t=>t.team===team.name)||team,player)}):`<div class="reading-lineup-grid">${[probable.home,probable.away].filter(item=>!onlyTeam||item.team===onlyTeam).map(side).join("")}</div>`}<p class="objective-method">Aggiornamento ${esc(shortDate(probable.updatedAt))}. ${coverageNote}</p></article>`;
  }

  function tacticalAnalysisPanel(fixture,styleProfiles,volumeProfiles,attackByTeam,branding){
    const profiles=new Map((styleProfiles?.profiles||[]).map(profile=>[profile.teamId,profile]));
    const volumeByTeam=new Map((volumeProfiles||[]).map(profile=>[profile.teamId,profile]));
    const projectionFor=team=>fixture.teamProjections.find(item=>item.team===team);
    const itemList=items=>items?.length?items.slice(0,5).map(item=>item.label).join(" · "):null;
    const baseline=team=>{
      const projection=projectionFor(team),profile=profiles.get(projection?.teamId);
      if(!profile){
        const volume=volumeByTeam.get(projection?.teamId),overall=volume?.venues?.overall;
        if(!volume?.usableForDetailedVolumes||!overall)return null;
        return {team,quality:"Baseline statistica",competition:`${volume.league} · ${volume.matches} gare`,formation:null,possession:null,shots:overall.totalShots.for.mean.toFixed(1),shotsOnTarget:overall.shotsOnTarget.for.mean.toFixed(1),goals:overall.goals.for.mean.toFixed(2),corners:overall.wonCorners.for.mean.toFixed(1),strengths:null,weaknesses:null,style:null,notes:null,source:null};
      }
      const quality=profile.dataQuality==="complete"?"Profilo completo":profile.dataQuality==="limited-sample"?"Campione limitato":"Solo statistiche";
      return {team,quality,competition:`${profile.competition} · ${profile.summary.appearances} gare`,formation:`${profile.formation.code||"N/D"}${profile.formation.appearances?` · ${profile.formation.appearances} gare`:""}`,possession:profile.summary.possessionPct===null?null:`${profile.summary.possessionPct}%`,shots:profile.summary.shotsPerGame??null,shotsOnTarget:null,goals:profile.derived.goalsPerGame,corners:null,strengths:itemList(profile.strengths),weaknesses:itemList(profile.weaknesses),style:itemList(profile.playingStyle),notes:profile.notes?.length?profile.notes.join(" "):null,source:profile.source};
    };
    const baselines=[fixture.homeTeam,fixture.awayTeam].map(baseline);
    const hasBaseline=baselines.some(Boolean);
    const baselineRows=hasBaseline?[
      ["Qualità dati","quality"],["Campione e competizione","competition"],["Modulo più usato","formation"],["Possesso","possession"],["Tiri / gara","shots"],["Tiri nello specchio / gara","shotsOnTarget"],["Gol / gara","goals"],["Corner / gara","corners"],["Punti di forza","strengths"],["Vulnerabilità","weaknesses"],["Stile","style"],["Note","notes"]
    ].filter(([,key])=>baselines.some(item=>item?.[key]!=null)).map(([label,key])=>`<tr><th scope="row">${label}</th>${baselines.map(item=>`<td>${item?.[key]!=null?esc(item[key]):"N/D"}</td>`).join("")}</tr>`).join(""):"";
    const sources=hasBaseline?baselines.map(item=>item?.source?.url?`<a href="${esc(item.source.url)}" target="_blank" rel="noreferrer">${esc(item.team)} · Fonte ${esc(item.source.provider||"WhoScored")}</a>`:`<span>${esc(item?.team||"Squadra")} · fonte statistica integrata</span>`).join(""):"";
    const attackCard=team=>{
      const profile=attackByTeam.get(team);
      if(!profile?.attackChannels)return "";
      const source=profile?.sourceUrl?`<a href="${esc(profile.sourceUrl)}" target="_blank" rel="noreferrer">Fonte WhoScored</a>`:"<span>Fonte non disponibile</span>";
      return `<article class="champions-reading-attack-card">${teamBadge(team,branding)}${attackChannelsPanel(profile)}<footer><span>${profile?.competition?esc(profile.competition):"Campione N/D"}${profile?.dataQuality==="uefa-fallback"?" · fallback UEFA":""}</span>${source}</footer></article>`;
    };
    const attackCards=[fixture.homeTeam,fixture.awayTeam].map(attackCard).filter(Boolean).join("");
    if(!hasBaseline&&!attackCards)return "";
    const baselinePanel=hasBaseline?`<section class="champions-tactical-subsection champions-tactical-baseline" aria-labelledby="champions-tactical-baseline-title"><header><div><p class="eyebrow">WhoScored · baseline 2025/26</p><h3 id="champions-tactical-baseline-title">Baseline storica</h3></div><p>Contesto storico, non forecast della partita.</p></header><div class="champions-tactical-table-wrap"><table><thead><tr><th>Dato</th>${baselines.map(item=>`<th scope="col">${item?teamBadge(item.team,branding):"N/D"}</th>`).join("")}</tr></thead><tbody>${baselineRows}</tbody></table></div><footer>${sources}</footer></section>`:"";
    const attackPanel=attackCards?`<section class="champions-tactical-subsection champions-reading-attack" aria-labelledby="champions-reading-attack-title"><header><div><p class="eyebrow">WhoScored · baseline 2025/26</p><h3 id="champions-reading-attack-title">Fasce d'attacco</h3></div><p>Distribuzione storica separata dai volumi di gara.</p></header><div>${attackCards}</div></section>`:"";
    return `<section class="section reading-tactical-baseline champions-reading-tactics champions-reading-tactical-analysis" id="champions-tactics"><header class="section-heading"><div><p class="eyebrow">Confronto storico</p><h2>Analisi tattica delle squadre</h2></div><p>Baseline e direzioni d'attacco restano distinte dal forecast della gara.</p></header>${baselinePanel}${attackPanel}</section>`;
  }

  const motivationLevel=level=>({low:"LOW",medium:"MEDIUM",high:"HIGH",very_high:"VERY HIGH",extreme:"EXTREME"}[level]||"N/D");
  const reasonLabel=reason=>({must_win:"Deve vincere",top8_race:"Corsa alla top 8",top24_race:"Corsa alla top 24",elimination_risk:"Rischio eliminazione",already_qualified:"Qualificazione già acquisita",big_match:"Grande sfida europea",elite_opponent:"Avversario di prima fascia",historic_match:"Partita storica per il club",champions_debut:"Debutto assoluto in Champions",return_to_champions:"Ritorno in Champions",home_pressure:"Pressione del pubblico di casa",hostile_away_environment:"Trasferta ad alta pressione",coach_under_pressure:"Allenatore sotto pressione",poor_recent_form:"Forma recente negativa",excellent_recent_form:"Forma europea recente positiva",revenge_factor:"Fattore rivincita",former_coach:"Ex allenatore",former_player:"Ex giocatore",title_contender:"Ambizione da candidata al titolo",rotation_expected:"Turnover da monitorare",fixture_congestion:"Calendario congestionato",strong_ucl_ambition:"Forte ambizione europea",underdog_opportunity:"Occasione da outsider"}[reason]||reason);
  function motivationPanel(entry){
    if(!entry)return "";
    const side=({team,motivation})=>`<article class="champions-motivation-team"><header><strong>${esc(team)}</strong><span class="motivation-level is-${esc(motivation.level)}">${esc(motivationLevel(motivation.level))}</span></header><div class="champions-motivation-score"><b>${motivation.score}</b><span>/100<small>Motivazione</small></span></div><dl><div><dt>Urgenza</dt><dd>${motivation.urgency}/100</dd></div><div><dt>Pressione</dt><dd>${motivation.pressure}/100</dd></div><div><dt>Turnover</dt><dd>${motivation.rotationRisk}/100</dd></div><div><dt>Confidence</dt><dd>${Math.round(motivation.confidence*100)}%</dd></div></dl><ul>${motivation.reasons.slice(0,3).map(reason=>`<li>${esc(reasonLabel(reason))}</li>`).join("")}</ul><details><summary>Come è calcolato</summary><div class="champions-motivation-debug">${Object.entries(motivation.debug.formula).map(([key,item])=>`<span><b>${esc(key)}</b>${item.value} × ${Math.round(item.weight*100)}% = ${item.contribution}</span>`).join("")}<span><b>Context adjustment</b>${motivation.contextAdjustment.value>=0?"+":""}${motivation.contextAdjustment.value}</span><strong>Final Motivation: ${motivation.score}</strong></div></details></article>`;
    return `<section class="section champions-motivation-card" aria-labelledby="motivation-title"><header><div><p class="eyebrow">Motivation</p><h2 id="motivation-title">Motivation Index</h2></div><p>Indicatori distinti, non probabilità di vittoria.</p></header><div class="champions-motivation-grid">${side(entry.home)}${side(entry.away)}</div><p class="champions-motivation-note">Forma domestica finale pendente: momentum europeo usato come proxy e confidence ridotta. Il rischio turnover corregge separatamente la forza prevista.</p></section>`;
  }

  function motivationOnlyDetail(fixture,entry,branding,squads){
    const hasLineups=[fixture.probableFormation?.home,fixture.probableFormation?.away].every(side=>side?.players?.length===11);
    const availability=hasLineups?"Per questa gara sono disponibili Motivation Index, moduli e undici editoriali; le proiezioni statistiche complete restano N/D.":"Per questa gara sono disponibili Motivation Index e moduli probabili; gli undici titolari e le proiezioni statistiche complete restano N/D.";
    return `<nav class="reading-back champions-reading-back"><a href="champions-league.html">← Calendario Champions</a><span>Giornata ${fixture.matchday}</span></nav><section class="reading-match-hero champions-reading-match-hero"><div><p class="eyebrow">UEFA Champions League · Motivation Index</p><h1>${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}</h1><p>${esc(dayLabel(fixture.date))} · ${esc(fixture.kickoff)}</p></div><div class="reading-matchup champions-reading-matchup">${teamBadge(fixture.homeTeam,branding,{showName:false})}<b>VS</b>${teamBadge(fixture.awayTeam,branding,{showName:false})}</div></section><aside class="reading-prototype-banner champions-reading-warning"><strong>Lettura parziale</strong><p>${availability}</p></aside>${motivationPanel(entry)}<section class="section reading-info-grid champions-reading-info">${probableFormationCard(fixture,squads)}</section>`;
  }

  function surpriseFactorSignal(entry){
    if(!entry)return `<div class="reading-hero-signal reading-hero-surprise"><span>Fattore sorpresa</span><strong>N/D</strong><small>Dato non disponibile</small></div>`;
    const info="Misura quanto è probabile che la partita si discosti dal risultato più atteso, considerando mercato, forma, campo, assenze, matchup tattico e motivazione.";
    const reasons=entry.reasons?.length?`<ul>${entry.reasons.map(reason=>`<li>${esc(reason)}</li>`).join("")}</ul>`:"";
    const componentLabels={market:"Mercato",form:"Forma",venue:"Casa/trasferta",absences:"Assenze",tactical:"Matchup",motivation:"Motivazione"};
    const components=Object.entries(entry.components||{}).map(([key,value])=>`<span><small>${esc(componentLabels[key]||key)}</small><b>${value}</b></span>`).join("");
    return `<div class="reading-hero-signal reading-hero-surprise champions-surprise-factor is-${esc(entry.surpriseLevel.replace(/\s+/g,"-"))}" title="${esc(info)}"><span>Fattore sorpresa <i aria-label="${esc(info)}">i</i></span><strong>${entry.surpriseFactor}/100</strong><small>${esc(entry.surpriseLevel)} · confidence ${esc(entry.confidence.label)}</small><div class="champions-surprise-bar" role="progressbar" aria-label="Fattore sorpresa ${entry.surpriseFactor} su 100" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${entry.surpriseFactor}"><b style="width:${entry.surpriseFactor}%"></b></div><details><summary>Perché</summary>${reasons}<div class="champions-surprise-components">${components}</div>${entry.confidence.missingOrFallbackComponents?.length?`<p>Dati mancanti o in fallback: ${entry.confidence.missingOrFallbackComponents.map(key=>esc(componentLabels[key]||key)).join(", ")}.</p>`:""}</details></div>`;
  }

  function pilotReadingDetail(fixture,pilot,backtest,squads,branding,h2h,motivationEntry,styleProfiles,attackByTeam,surpriseEntry,playerMarketEntry,playerMarketDataset,md2MarketEntry,md2SchedinaFixture){
    const statusLabel=fixture.status==='finished'?'conclusa':['live','in_progress'].includes(fixture.status)?'in corso':fixture.status==='postponed'?'rinviata':fixture.status==='cancelled'?'annullata':'prepartita';
    const hasScore=Number.isFinite(fixture.score?.home)&&Number.isFinite(fixture.score?.away);
    const scoreLabel=['finished','live','in_progress'].includes(fixture.status)?(hasScore?`${fixture.score.home} – ${fixture.score.away}`:'Risultato N/D'):'VS';
    const scoreCards=fixture.scoreForecast.display.map((score,index)=>`<div class="${index===0?"is-central":""}"><strong>${esc(score.score)}</strong><small>${esc(score.label)} · ${score.probabilityPct.toFixed(1)}%</small></div>`).join("");
    const confidence=Number.isFinite(fixture.confidenceScore)?`${fixture.confidenceScore}/100`:"N/D";
    const combinedMetric=key=>{const values=fixture.teamProjections.map(team=>team[key]);return values.every(Boolean)?{central:values.reduce((sum,item)=>sum+item.central,0),min:values.reduce((sum,item)=>sum+item.min,0),max:values.reduce((sum,item)=>sum+item.max,0)}:null};
    const range=metric=>metric?`${metric.central.toFixed(1)} <small>${metric.min.toFixed(1)}–${metric.max.toFixed(1)}</small>`:"N/D";
    const matchProjectionData=fixture.matchProjection||{shotsTotal:combinedMetric("shotsTotal"),shotsOnTarget:combinedMetric("shotsOnTarget"),corners:combinedMetric("corners")};
    const matchProjection=`<article class="prediction-match-volume champions-combined-volume"><div><p class="eyebrow">Totale partita</p><h3>Valori combinati</h3><small>Valore centrale · intervallo storico p20–p80</small></div><dl><div><dt>Gol attesi medi</dt><dd>${fixture.expectedGoals.total.toFixed(2)} <small>${fixture.expectedGoals.home.toFixed(2)}–${fixture.expectedGoals.away.toFixed(2)}</small></dd></div><div><dt>Fascia gol probabile</dt><dd>${fixture.goalBand.min}–${fixture.goalBand.max} <small>${fixture.goalBand.probabilityPct.toFixed(1)}%</small></dd></div><div><dt>Tiri totali</dt><dd>${range(matchProjectionData.shotsTotal)}</dd></div><div><dt>Tiri nello specchio</dt><dd>${range(matchProjectionData.shotsOnTarget)}</dd></div><div><dt>Corner</dt><dd>${range(matchProjectionData.corners)}</dd></div></dl><p class="champions-goal-explainer">I gol attesi sono la media di tutti gli scenari, non un secondo risultato esatto.</p></article>`;
    const projections=[fixture.teamProjections.find(team=>team.venue==="home")||fixture.teamProjections[0],fixture.teamProjections.find(team=>team.venue==="away")||fixture.teamProjections[1]];
    const comparisonMetrics=[
      {key:"expectedGoals",label:"Gol attesi",digits:2,value:team=>team?.expectedGoals,detail:team=>venueLabel(team.venue)},
      {key:"shotsTotal",label:"Tiri totali",digits:1,value:team=>team?.shotsTotal?.central,detail:team=>team?.shotsTotal?`${venueLabel(team.venue)} · fascia ${team.shotsTotal.min.toFixed(1)}–${team.shotsTotal.max.toFixed(1)}`:""},
      {key:"shotsOnTarget",label:"Tiri nello specchio",digits:1,value:team=>team?.shotsOnTarget?.central,detail:team=>team?.shotsOnTarget?`${venueLabel(team.venue)} · fascia ${team.shotsOnTarget.min.toFixed(1)}–${team.shotsOnTarget.max.toFixed(1)}`:""},
      {key:"corners",label:"Corner",digits:1,value:team=>team?.corners?.central,detail:team=>team?.corners?`${venueLabel(team.venue)} · fascia ${team.corners.min.toFixed(1)}–${team.corners.max.toFixed(1)}`:""},
      {key:"fouls",label:"Falli",digits:1,value:team=>team?.fouls?.central,detail:team=>team?.fouls?`${venueLabel(team.venue)} · fascia ${team.fouls.min.toFixed(1)}–${team.fouls.max.toFixed(1)}`:""},
      {key:"cards",label:"Cartellini",digits:1,value:team=>team?.cards?.central,detail:team=>team?.cards?`${venueLabel(team.venue)} · fascia ${team.cards.min.toFixed(1)}–${team.cards.max.toFixed(1)}`:""}
    ];
    const comparisonRows=comparisonMetrics.map(metric=>{
      const values=projections.map(metric.value);
      if(!values.some(Number.isFinite))return "";
      const scale=Math.max(...values.filter(Number.isFinite),0);
      const widths=values.map(value=>Number.isFinite(value)&&scale>0?Math.max(4,value/scale*100):0);
      const formatted=values.map(value=>Number.isFinite(value)?value.toFixed(metric.digits):"N/D");
      return `<div class="champions-comparison-row" data-statistic="${esc(metric.key)}"><div class="champions-comparison-value is-home"><strong>${formatted[0]}</strong><small>${esc(metric.detail(projections[0]))}</small></div><span class="champions-comparison-track is-home" role="img" aria-label="${esc(projections[0]?.team||fixture.homeTeam)}: ${formatted[0]} ${esc(metric.label)}"><i style="width:${widths[0]}%"></i></span><span class="champions-comparison-label">${esc(metric.label)}</span><span class="champions-comparison-track is-away" role="img" aria-label="${esc(projections[1]?.team||fixture.awayTeam)}: ${formatted[1]} ${esc(metric.label)}"><i style="width:${widths[1]}%"></i></span><div class="champions-comparison-value is-away"><strong>${formatted[1]}</strong><small>${esc(metric.detail(projections[1]))}</small></div></div>`;
    }).filter(Boolean).join("");
    const teamComparison=comparisonRows?`<section class="champions-team-comparison" aria-labelledby="champions-team-comparison-title"><header><span>${teamBadge(projections[0]?.team||fixture.homeTeam,branding)}</span><div><p class="eyebrow">Confronto per metrica</p><h3 id="champions-team-comparison-title">Volumi delle squadre</h3></div><span>${teamBadge(projections[1]?.team||fixture.awayTeam,branding)}</span></header><div>${comparisonRows}</div></section>`:"";
    const h2hFixture=h2h.fixtures.find(item=>item.fixtureId===fixture.fixtureId);
    const h2hEvents=(items,emptyLabel)=>Array.isArray(items)?items.length?`<ul>${items.map(item=>`<li><strong>${esc(item.player)}</strong><small>${esc(item.team)} · ${item.minute?`${esc(item.minute)}'`:"minuto N/D"}${item.penalty?" · rigore":""}${item.ownGoal?" · autogol":""}${item.note?` · ${esc(item.note)}`:""}</small></li>`).join("")}</ul>`:`<p class="reading-h2h-empty">${emptyLabel}</p>`:'<p class="reading-h2h-empty">Dettaglio N/D</p>';
    const h2hRows=(h2hFixture?.recentMatches||[]).map((match,index)=>{const fallbackSource=h2h.source.pages.find(page=>page.competition===match.competition&&page.season===match.season),sources=match.sources||[fallbackSource].filter(Boolean);return `<details class="reading-h2h-match"><summary><span>${esc(shortDate(match.date))} · ${esc(match.competition)}</span><strong>${esc(match.homeTeam)} ${match.score90.home}-${match.score90.away} ${esc(match.awayTeam)}</strong></summary><div class="reading-h2h-events"><section><h3>Marcatori</h3>${h2hEvents(match.goals,"Nessun gol")}</section><section><h3>Ammoniti</h3>${h2hEvents(match.bookings,"Nessun ammonito")}</section></div>${sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noreferrer">Fonte ${esc(source.provider||"UEFA")}</a>`).join("")}</details>`}).join("");
    const h2hPanel=h2hRows?`<details class="section reading-h2h-section champions-reading-h2h champions-reading-history-disclosure" id="champions-history"><summary><span><small>Storico ufficiale · UEFA</small><strong>Ultimi ${h2hFixture.meetings} scontri diretti disponibili</strong></span><span>${h2hFixture.meetings}/${h2hFixture.maximumMeetings||4} precedenti · competizioni UEFA</span></summary><div class="reading-h2h-list">${h2hRows}</div></details>`:"";
    const bookedPanel=playerMarketEntry?.likelyBooked?.length?`<section class="prediction-booked-panel"><header><div><p class="eyebrow">Gerarchia disciplinare</p><h2>5 probabili ammoniti</h2></div><p>Indice comparativo, non probabilità. Primo nome: euristica del ranking.</p></header><ol>${playerMarketEntry.likelyBooked.map(candidate=>`<li class="${candidate.possibleFirstBooked?"possible-first-booked":""}"><span>${candidate.rank}</span><div><strong>${esc(candidate.name)}</strong><small>${esc(candidate.team)} · ${esc(candidate.role)}${candidate.possibleFirstBooked?" · possibile primo ammonito (euristica)":""}</small><em>${candidate.evidence.map(esc).join(" · ")}</em>${candidate.sisal?`<small>Quota Sisal ${candidate.sisal.odds.toFixed(2)} · sostituto incluso</small>`:"<small>Quota Sisal N/D</small>"}</div><b>${candidate.riskScore}/100</b></li>`).join("")}</ol></section>`:"";
    const shooterList=(items,key,marketKey)=>`<ol>${items.map(item=>{const quote=item.markets?.[marketKey];return `<li><span>${item.rank}</span><div><strong>${esc(item.name)}</strong><small>${esc(item.team)} · ${esc(item.role)}</small><em>${item.dataStatus==="role-baseline"?"Baseline di ruolo":`${item.minutes} minuti verificati nel 2025/26`}</em></div><b>${item[key].toFixed(2)}<small>${quote?`Sisal ${quote.odds.toFixed(2)}`:"quota N/D"}</small></b></li>`}).join("")}</ol>`;
    const shooters=playerMarketEntry?.shooters;
    const shootersPanel=shooters?`<section class="section champions-shooters" aria-labelledby="champions-shooters-title"><header class="section-heading"><div><p class="eyebrow">Probabili titolari · proiezione individuale</p><h2 id="champions-shooters-title">Possibili migliori tiratori</h2></div><p>Volumi previsti, non soglie dettate dalle quote.</p></header><div><article><h3>Tiri totali</h3><p>Media prevista del giocatore</p>${shooterList(shooters.totalShots,"projectedShots","shotsOver05")}</article><article><h3>Tiri in porta</h3><p>Media prevista nello specchio</p>${shooterList(shooters.shotsOnTarget,"projectedShotsOnTarget","shotsOnTargetOver05")}</article></div><p class="objective-method">Le frequenze per 90 minuti sono regolarizzate per ruolo e scalate sul volume atteso della squadra. “Sisal” è soltanto la quota disponibile per almeno un tiro o un tiro in porta con sostituto incluso.</p></section>`:"";
    const comboCard=combo=>combo.qualityStatus==="nd"||!combo.legs?.length?`<article class="prediction-combo-card prediction-combo-card-nd"><span>${esc(combo.scenario)} · rischio ${esc(combo.risk)}</span><div><strong>N/D</strong><small>${esc(combo.unavailableReason)}</small></div></article>`:`<article class="prediction-combo-card" data-quality="${esc(combo.qualityStatus)}"><span>${esc(combo.scenario)} · rischio ${esc(combo.risk)}</span><strong>Quota Sisal ${combo.odds.toFixed(2)} · obiettivo ${combo.targetOdds.toFixed(2)}${combo.targetReached === false ? " · non raggiunto" : ""}</strong><ul class="prediction-combo-legs">${combo.legs.map(leg=>`<li><span>${esc(leg.label)}${leg.replacementIncluded?" · sostituto incluso":""}</span><b>@ ${leg.odds.toFixed(2)}</b></li>`).join("")}</ul>${Number.isFinite(combo.prudentProbabilityPct)?`<dl class="prediction-combo-metrics"><div><dt>Prob. prudenziale</dt><dd>${combo.prudentProbabilityPct}%</dd></div><div><dt>Quota equa</dt><dd>${combo.fairOdds.toFixed(2)}</dd></div></dl>`:""}<p>${esc(combo.probabilityMethod)}</p></article>`;
    const myCombo=playerMarketEntry?.combinations?`<section class="section reading-panel-grid champions-reading-combo"><section class="reading-data-panel reading-data-panel-wide"><span>MyCombo</span><p class="champions-combo-policy">Combinazioni selezionate dal modello con obiettivi di quota 5, 10 e 20. Quote indicative calcolate come prodotto delle singole selezioni.</p><div class="prediction-combos">${playerMarketEntry.combinations.map(comboCard).join("")}</div><small>Quote aggiornate ${esc(shortDate(String(playerMarketDataset?.oddsRetrievedAt||"").slice(0,10)))}. Esclusi cartellini, DNB, confronti tiri, prima a corner, quasi ammonito e mercati non compatibili.</small></section></section>`:"";
    const publishedSelections=md2SchedinaFixture?.selections||[];
    const publishedModifierLabels=selection=>[selection.modifiers?.replacementIncluded?"Sostituto incluso":null,selection.modifiers?.woodworkIncluded?"Pali/traverse inclusi":null,selection.modifiers?.periodScope==="first-half"?"Primo tempo":null,selection.modifiers?.periodScope==="both-halves"?"Entrambi i tempi":null,selection.threshold!=null?`Soglia ${selection.threshold}`:null].filter(Boolean);
    const publishedEditorialBadges=selection=>[selection.isOutsider===true?'<b class="champions-outsider-badge">OUTSIDER</b>':null,selection.reviewStatus?`<b class="champions-lineup-review-badge">${esc(selection.reviewStatus.replaceAll("_"," "))}</b>`:null].filter(Boolean).join("");
    const metricLabel=(label,value,suffix="")=>`<span><small>${label}</small><strong>${Number.isFinite(value)?`${Number(value).toLocaleString("it-IT",{minimumFractionDigits:1,maximumFractionDigits:1})}${suffix}`:"N/D"}</strong></span>`;
    const publishedPanel=publishedSelections.length?`<div class="champions-published-forecasts" data-champions-published-root data-fixture-id="${esc(md2MarketEntry.fixtureId)}"><ol>${publishedSelections.map(selection=>`<li class="${selection.isOutsider===true?"is-outsider":""}"${md2SchedinaFixture?.status==="finished"?` data-settlement="${esc(selection.settlement?.status||"pending")}"`:""} data-published-selection-id="${esc(selection.selectionId)}"${selection.isOutsider===true?' data-outsider="true"':""}><div class="champions-published-main"><small>${esc(selection.marketScope==="player"?`${selection.player?.canonicalName||"Giocatore"} · ${selection.marketFamily}`:`${selection.fixture} · ${selection.marketFamily}`)}</small>${publishedEditorialBadges(selection)?`<span class="champions-editorial-badges">${publishedEditorialBadges(selection)}</span>`:""}<strong>${esc(selection.label)}</strong>${md2SchedinaFixture?.status==="finished"&&(!["won","lost"].includes(selection.settlement?.status)||selection.settlement?.nonStarter)?`<span class="champions-published-result" title="${esc(selection.settlement?.reason||"")}">${esc([!["won","lost"].includes(selection.settlement?.status)?"DA VERIFICARE":null,selection.settlement?.nonStarter?"NON TITOLARE":null].filter(Boolean).join(" · "))}</span>`:""}<span>${esc(selection.evidenceLabel)}</span>${selection.limitation?`<em>${esc(selection.limitation)}</em>`:""}<span class="champions-published-modifiers">${publishedModifierLabels(selection).map(label=>`<b>${esc(label)}</b>`).join("")||"Contratto standard"}</span></div><div class="champions-published-metrics">${metricLabel("Quota Sisal",Number(selection.odds))}${metricLabel("Probabilità",selection.modelProbabilityPct,"%")} ${metricLabel("EV",selection.expectedValuePct,"%")}</div><button type="button" data-add-published-selection="${esc(selection.selectionId)}" aria-pressed="false"${md2SchedinaFixture?.status==="finished"?" disabled":""}>Aggiungi a MyCombo</button></li>`).join("")}</ol></div>`:"";
    const marketPanel=md2MarketEntry?publishedPanel:"";
    const selectedBlocks=[marketPanel,shootersPanel,bookedPanel?`<section class="section champions-player-predictions"><div class="prediction-players-grid">${bookedPanel}</div></section>`:"",myCombo].filter(Boolean).join("");
    const selectedForecasts=selectedBlocks?`<section class="section champions-selected-forecasts" id="champions-selected-forecasts" aria-labelledby="champions-selected-forecasts-title"><header class="section-heading"><div><p class="eyebrow">Stessa selezione della schedina</p><h2 id="champions-selected-forecasts-title">Pronostici selezionati</h2></div></header>${selectedBlocks}</section>`:"";
    const round=md2MarketEntry?2:1;
    return `<nav class="reading-back champions-reading-back"><a href="champions-league.html">← Tutte le letture</a><span>Giornata ${round}</span></nav>
      <section class="reading-match-hero champions-reading-match-hero" aria-labelledby="champions-reading-title"><div><p class="eyebrow">UEFA Champions League · Giornata ${round} · ${statusLabel}</p><h1 id="champions-reading-title">${esc(fixture.homeTeam)} - ${esc(fixture.awayTeam)}</h1><p>${esc(dayLabel(fixture.date))} · ${esc(fixture.kickoff)}</p></div><div class="reading-matchup champions-reading-matchup" aria-label="${esc(fixture.homeTeam)} contro ${esc(fixture.awayTeam)}">${teamBadge(fixture.homeTeam,branding,{showName:false})}<b>${esc(scoreLabel)}</b>${teamBadge(fixture.awayTeam,branding,{showName:false})}</div><div class="reading-summary reading-summary-prototype reading-hero-summary reading-result-summary champions-reading-summary"><div class="reading-exact-scores"><span>3 risultati esatti possibili</span><div class="reading-score-list">${scoreCards}</div></div>${surpriseFactorSignal(surpriseEntry)}<div class="reading-hero-signal"><span>Confidenza</span><strong>${confidence}</strong><small>${esc(fixture.dataQuality.label)}</small></div></div>${refereeReadingPanel(fixture.refereeAssignment,fixture.refereeProfile)}</section>
      <section class="section reading-projection-prototype prediction-volume-section champions-reading-volume" id="champions-forecast"><header class="section-heading"><div><p class="eyebrow">Pronostico e dati di gara</p><h2>Scenario principale</h2></div><p>Distribuzione dei gol, volumi e contesto della partita.</p></header><div class="champions-reading-volume-block" id="champions-volumes">${matchProjection}${teamComparison}<p class="objective-method">Tiri e corner combinano produzione per sede, valori concessi dall'avversaria e ultime otto gare; le fasce sono percentili p20–p80, non margini fissi. Ogni coppia di barre usa una scala propria della statistica indicata. La designazione arbitrale è verificata ma non viene applicata come moltiplicatore automatico dei cartellini. I dati mancanti restano N/D.</p></div>${matchReport(fixture)}${motivationEntry?`<div class="champions-reading-scenario-context" id="champions-context" aria-labelledby="champions-context-title"><header class="champions-reading-section-heading"><div><p class="eyebrow">Contesto della gara</p><h3 id="champions-context-title">Motivazione</h3></div><p>Indicatore separato dal pronostico quantitativo.</p></header>${motivationPanel(motivationEntry)}</div>`:""}</section>
      <section class="section reading-info-grid champions-reading-info" id="champions-lineups">${probableFormationCard(fixture,squads)}</section>
      ${tacticalAnalysisPanel(fixture,styleProfiles,pilot.profiles,attackByTeam,branding)}
      ${h2hPanel}
      `;
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
      return `<details class="champions-squad-card" data-squad-team="${esc(team.team)}"><summary><span><small>${team.counts.total} registrati${team.counts.listB?` · ${team.counts.listB} Lista B`:""}</small><strong>${esc(team.team)}</strong></span><span>${team.sourceNote?'Verifica fonte aperta':'Fonte ufficiale'}</span></summary><div class="champions-squad-card-body"><div class="champions-squad-meta"><p>Allenatore: <strong>${esc(coachDisplayName(team.coach))}</strong></p><span>${sources}</span></div><a class="champions-team-open" href="champions-league.html?team=${esc(team.id)}">Apri scheda squadra <b aria-hidden="true">→</b></a>${team.sourceNote?`<p class="champions-squad-alert"><strong>Discrepanza segnalata.</strong> ${esc(team.sourceNote)}</p>`:""}<div class="champions-squad-groups">${groups}</div></div></details>`;
    }).join("");
    return `<section class="champions-squads${detail?" champions-squads-detail":""}" aria-labelledby="champions-squads-title"><header><div><p class="eyebrow">${detail?"Contesto della partita":`${squads.summary.teams} squadre · fase campionato`}</p><h2 id="champions-squads-title">Rose registrate UEFA</h2><p>${esc(squads.statusNote)}</p></div><span><strong>${squads.summary.players}</strong> giocatori<br>snapshot ${esc(shortDate(squads.snapshotDate))}</span></header><div class="champions-squad-notice"><strong>Attenzione alla lettura:</strong> “registrato” non significa convocato, disponibile o titolare per la prossima gara. Questi dati non modificano ancora i pronostici.</div><div class="champions-squad-grid">${cards}</div><p class="champions-squad-footnote">La sigla Lista B compare solo quando è esplicitamente marcata dalla fonte UEFA; in assenza del marcatore il campo resta non classificato, senza dedurre automaticamente Lista A.</p></section>`;
  }

  function championsTeamDetail(team,strength,history,pilot,squads,attackProfile,data,branding){
    const teamFixtures=data.fixtures.filter(item=>item.homeTeam===team.team||item.awayTeam===team.team).sort((a,b)=>`${a.date}T${a.kickoff}`.localeCompare(`${b.date}T${b.kickoff}`));
    const lineupFixture=teamFixtures.find(item=>item.probableFormation);
    const nextCalendarFixture=teamFixtures.find(item=>item.status!=="finished")||null;
    const probableSide=lineupFixture?.probableFormation?.[lineupFixture.homeTeam===team.team?"home":"away"];
    const brand=branding.get(team.team)||{colors:["#176bcb","#7fdcff"],logo:"",shortName:team.team.slice(0,3).toUpperCase()};
    const readings=new Map(pilot.fixtures.filter(item=>item.homeTeam===team.team||item.awayTeam===team.team).map(item=>[item.fixtureId,item]));
    const completed=data.fixtures.filter(item=>item.status==="finished");
    const standings=new Map(data.teams.map(name=>[name,{team:name,played:0,points:0,gf:0,ga:0}]));
    for(const item of completed)for(const [side,other] of [["home","away"],["away","home"]]){
      const row=standings.get(item[`${side}Team`]);
      row.played+=1;row.gf+=item.score[side];row.ga+=item.score[other];row.points+=item.score[side]>item.score[other]?3:item.score[side]===item.score[other]?1:0;
    }
    const standingRows=[...standings.values()].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf||a.team.localeCompare(b.team));
    const standing=standingRows.find(item=>item.team===team.team);
    const standingPosition=standingRows.findIndex(item=>item.team===team.team)+1;
    const calendarRows=teamFixtures.map(item=>{
      const reading=readings.get(item.id);
      const opponent=item.homeTeam===team.team?item.awayTeam:item.homeTeam;
      const venue=item.homeTeam===team.team?"Casa":"Trasferta";
      const finished=item.status==="finished";
      const next=!finished&&item.id===nextCalendarFixture?.id;
      const action=finished?`<span class="champions-calendar-result"><b>${item.score.home}–${item.score.away}</b><small>Finale</small></span>`:reading?`<span class="champions-calendar-action">Apri lettura <b aria-hidden="true">→</b></span>`:`<span class="champions-calendar-action is-muted">Lettura N/D</span>`;
      const content=`<span class="champions-calendar-round">${item.matchday}ª<span>giornata</span></span><time class="champions-calendar-date" datetime="${esc(`${item.date}T${item.kickoff}`)}">${esc(shortDate(item.date))}<small>${esc(item.kickoff)}</small></time><span class="champions-calendar-opponent">${teamBadge(opponent,branding)}<small>${esc(item.homeTeam)} – ${esc(item.awayTeam)}</small></span><span class="champions-calendar-venue">${venue}</span>${action}`;
      return `<li class="${next?"is-next":""}" data-team-home="${esc(item.homeTeam)}" data-team-away="${esc(item.awayTeam)}">${reading?`<a href="champions-league.html?match=${esc(reading.fixtureId)}" aria-label="${finished?"Apri la lettura":"Apri la prossima lettura"} di ${esc(item.homeTeam)} - ${esc(item.awayTeam)}">${content}</a>`:`<div>${content}</div>`}</li>`;
    }).join("");
    const calendarPanel=`<section class="champions-team-calendar" aria-labelledby="team-calendar-title"><header><div><p class="eyebrow">UEFA Champions League 2026/27</p><h2 id="team-calendar-title">Calendario</h2><p>Fase campionato · 8 giornate · orari italiani</p></div><a href="${esc(data.source.url)}" target="_blank" rel="noreferrer">Fonte UEFA ↗</a></header><ul class="champions-calendar-list">${calendarRows}</ul></section>`;
    const roleLabel=position=>({goalkeeper:"Portiere",defender:"Difensore",midfielder:"Centrocampista",forward:"Attaccante"}[position]||"N/D");
    const nextReading=pilot.fixtures.find(item=>(item.homeTeam===team.team||item.awayTeam===team.team)&&data.fixtures.find(fixture=>fixture.id===item.fixtureId)?.status!=="finished")||pilot.fixtures.find(item=>item.homeTeam===team.team||item.awayTeam===team.team);
    const stat=value=>typeof value==="number"?value.toLocaleString("it-IT",{maximumFractionDigits:2}):"N/D";
    const playerCards=entry=>{
      const values=[entry?.yellowCards,entry?.secondYellowCards,entry?.straightRedCards];
      return values.every(value=>value==null)?null:values.reduce((sum,value)=>sum+(value??0),0);
    };
    const playerData=team.players.map((player,index)=>{
      const previous=player.previousSeason?.totals;
      return {player,index,previous,cards:playerCards(previous),competitions:[...new Set((player.previousSeason?.entries||[]).map(entry=>entry.competition))]};
    });
    const dataNumber=value=>typeof value==="number"?String(value):"";
    const playerRows=playerData.map(({player,index,previous,cards,competitions})=>`<tr data-champions-player="${esc(player.id)}" data-player-index="${index}" data-player-name="${esc(player.name.toLocaleLowerCase("it-IT"))}" data-player-role="${esc(player.position||"unknown")}" data-stat-appearances="${dataNumber(previous?.appearances)}" data-stat-minutes="${dataNumber(previous?.minutes)}" data-stat-goals="${dataNumber(previous?.goals)}" data-stat-assists="${dataNumber(previous?.assists)}" data-stat-shots="${dataNumber(previous?.shots)}" data-stat-shots-on-target="${dataNumber(previous?.shotsOnTarget)}" data-stat-cards="${dataNumber(cards)}" data-stat-fouls-committed="${dataNumber(previous?.foulsCommitted)}" data-stat-fouls-won="${dataNumber(previous?.foulsWon)}"><th scope="row"><span>${esc(player.name)}${player.registrationList==="B"?"<em>Lista B</em>":""}</span><small>${competitions.length?esc(competitions.join(" · ")):"Storico 2025/26 N/D"}</small></th><td>${esc(roleLabel(player.position))}</td><td>${stat(previous?.appearances)}</td><td>${stat(previous?.minutes)}</td><td>${stat(previous?.goals)}</td><td>${stat(previous?.per90?.goals)}</td><td>${stat(previous?.assists)}</td><td>${stat(previous?.per90?.assists)}</td><td>${stat(previous?.shots)}</td><td>${stat(previous?.per90?.shots)}</td><td>${stat(previous?.shotsOnTarget)}</td><td>${stat(previous?.per90?.shotsOnTarget)}</td><td>${stat(cards)}</td><td>${stat(previous?.per90?.cards)}</td><td>${stat(previous?.foulsCommitted)}</td><td>${stat(previous?.per90?.foulsCommitted)}</td><td>${stat(previous?.foulsWon)}</td><td>${stat(previous?.per90?.foulsWon)}</td></tr>`).join("");
    const strengthValue=strength?.europeanStrengthIndex==null?"N/D":strength.europeanStrengthIndex.toFixed(1);
    const historyValue=history?.overall?.pointsPerMatch==null?"N/D":history.overall.pointsPerMatch.toFixed(2);
    const volume=pilot.profiles.find(profile=>profile.team===team.team);
    const volumeMetrics=[
      ["Gol","Gol segnati e subiti",volume?.venues.overall.goals],
      ["Tiri","Tiri prodotti e concessi",volume?.venues.overall.totalShots],
      ["SOT","Tiri nello specchio prodotti e concessi",volume?.venues.overall.shotsOnTarget],
      ["Corner","Corner ottenuti e concessi",volume?.venues.overall.wonCorners],
      ["Falli","Falli commessi e subiti",volume?.venues.overall.foulsCommitted],
      ["Cartellini gialli","Cartellini ricevuti e provocati",volume?.venues.overall.yellowCards]
    ];
    const metricCell=value=>value?.mean==null?"N/D":value.mean.toFixed(2);
    const volumeRows=volumeMetrics.map(([label,,value])=>`<tr><th scope="row">${esc(label)}</th><td>${metricCell(value?.for)}</td><td>${metricCell(value?.against)}</td><td>${value?.for.matches??0}</td></tr>`).join("");
    const volumeBars=volumeMetrics.map(([label,description,value])=>{
      const produced=value?.for?.mean,conceded=value?.against?.mean;
      if(produced==null||conceded==null)return "";
      const scale=Math.max(produced,conceded,1);
      return `<article class="champions-volume-comparison"><header><div><strong>${esc(label)}</strong><small>${esc(description)} · media per gara</small></div><span>${value.for.matches} gare</span></header><div class="champions-volume-line"><span>Produzione</span><i aria-hidden="true"><b style="width:${Math.round(produced/scale*100)}%"></b></i><strong>${produced.toFixed(2)}</strong></div><div class="champions-volume-line is-against"><span>Concessione</span><i aria-hidden="true"><b style="width:${Math.round(conceded/scale*100)}%"></b></i><strong>${conceded.toFixed(2)}</strong></div></article>`;
    }).join("");
    const volumeSource=volume?.baselineKind==="uefa-fallback"?`${volume.league} · fallback UEFA`:(volume?.league||"N/D");
    const volumePanel=volume?.usableForDetailedVolumes
      ?`<section class="champions-team-volume" aria-labelledby="champions-team-volume-title"><header><div><p class="eyebrow">Campione 2025/26–2026/27</p><h2 id="champions-team-volume-title">Produzione e concessioni</h2></div><p>${esc(volumeSource)} · ${volume.matches} gare complete · casa/trasferta ${volume.homeMatches}/${volume.awayMatches}</p></header><div class="champions-volume-grid">${volumeBars}</div><details class="champions-volume-data"><summary>Apri tutti i valori in tabella</summary><div class="champions-strength-table-wrap"><table><thead><tr><th>Metrica</th><th>Prodotti / gara</th><th>Concessi / gara</th><th>Campione</th></tr></thead><tbody>${volumeRows}</tbody></table></div></details><p class="objective-method">Medie storiche usate per i volumi della lettura. Il fallback UEFA è dichiarato e non viene presentato come campionato domestico.</p></section>`
      :`<section class="champions-team-volume is-unavailable" aria-labelledby="champions-team-volume-title"><header><div><p class="eyebrow">Campione 2025/26–2026/27</p><h2 id="champions-team-volume-title">Produzione e concessioni · N/D</h2></div><p>${esc(volumeSource)}</p></header><div class="reading-panel-empty"><strong>N/D</strong><p>Il provider non espone un campione con tiri, corner, falli e cartellini verificabili. Nessuno zero è stato dedotto.</p></div></section>`;
    const summaryMetricCards=volume?.usableForDetailedVolumes?volumeMetrics.slice(0,4).map(([label,,value])=>`<article class="is-key-metric"><small>${esc(label)} prodotti / gara</small><strong>${metricCell(value?.for)}</strong><span>${esc(volumeSource)} · campione 2025/26–2026/27</span></article>`).join(""):"";
    const channelSource=attackProfile?.sourceUrl?`<a href="${esc(attackProfile.sourceUrl)}" target="_blank" rel="noreferrer">Fonte WhoScored ↗</a>`:"<span>Fonte non disponibile</span>";
    const attackPanel=attackProfile?.attackChannels?`<section class="champions-team-attack" aria-labelledby="champions-team-attack-title"><header><div><p class="eyebrow">Statistiche di squadra · 2025/26</p><h2 id="champions-team-attack-title">Fasce d'attacco</h2></div><p>${esc(attackProfile?.competition||"Campione N/D")}${attackProfile?.dataQuality==="uefa-fallback"?" · fallback UEFA":""}</p></header>${attackChannelsPanel(attackProfile)}<footer>${attackProfile?.totalTouches?`<span>${attackProfile.totalTouches.toLocaleString("it-IT")} tocchi classificati</span>`:"<span>Nessuno zero dedotto</span>"}${channelSource}</footer></section>`:"";
    const rankingItems=metric=>playerData.filter(item=>typeof item.previous?.[metric]==="number"&&item.previous[metric]>0).sort((a,b)=>b.previous[metric]-a.previous[metric]||a.player.name.localeCompare(b.player.name)).slice(0,5);
    const rankingMarkup=(metric,label)=>{
      const items=rankingItems(metric),maximum=items[0]?.previous?.[metric]||1;
      return items.length?items.map((item,index)=>`<li><span class="champions-player-rank">${index+1}</span><span><strong>${esc(item.player.name)}</strong><i aria-hidden="true"><b style="width:${Math.round(item.previous[metric]/maximum*100)}%"></b></i></span><b>${stat(item.previous[metric])}</b></li>`).join(""):`<li class="is-empty"><strong>N/D</strong><span>Nessun valore ${esc(label.toLocaleLowerCase("it-IT"))} disponibile.</span></li>`;
    };
    const rankingData={shots:rankingMarkup("shots","Tiri"),shotsOnTarget:rankingMarkup("shotsOnTarget","SOT"),minutes:rankingMarkup("minutes","Minuti")};
    const playersOverview=`<section class="champions-player-overview" aria-labelledby="champions-player-overview-title"><header><div><p class="eyebrow">Storico 2025/26</p><h2 id="champions-player-overview-title">Panoramica giocatori</h2></div><p>Classifica costruita soltanto sui totali disponibili. I valori N/D non sono trattati come zero.</p></header><div class="champions-player-ranking-tabs" role="group" aria-label="Metrica classifica giocatori"><button type="button" class="is-active" data-player-ranking="shots" aria-pressed="true">Tiri</button><button type="button" data-player-ranking="shotsOnTarget" aria-pressed="false">SOT</button><button type="button" data-player-ranking="minutes" aria-pressed="false">Minuti</button></div><div class="champions-player-ranking-panels"><ol class="champions-player-ranking" data-ranking-panel="shots">${rankingData.shots}</ol><ol class="champions-player-ranking" data-ranking-panel="shotsOnTarget" hidden>${rankingData.shotsOnTarget}</ol><ol class="champions-player-ranking" data-ranking-panel="minutes" hidden>${rankingData.minutes}</ol></div></section>`;
    const playerControls=`<div class="champions-player-controls"><label><span>Cerca per nome</span><input type="search" id="champions-player-search" placeholder="Es. Kane" autocomplete="off"></label><label><span>Ruolo</span><select id="champions-player-role"><option value="all">Tutti i ruoli</option><option value="goalkeeper">Portieri</option><option value="defender">Difensori</option><option value="midfielder">Centrocampisti</option><option value="forward">Attaccanti</option></select></label><label><span>Ordina per statistica</span><select id="champions-player-sort"><option value="shots">Tiri</option><option value="shots-on-target">SOT</option><option value="minutes">Minuti</option><option value="goals">Gol</option><option value="assists">Assist</option><option value="appearances">Presenze</option><option value="cards">Cartellini</option><option value="fouls-committed">Falli commessi</option><option value="fouls-won">Falli subiti</option><option value="source">Ordine fonte</option></select></label><p id="champions-player-results" aria-live="polite">${team.players.length} giocatori</p></div>`;
    const playersTable=`<section class="champions-team-players" aria-labelledby="champions-team-players-title"><header><div><p class="eyebrow">Statistiche 2025/26</p><h2 id="champions-team-players-title">Tabella completa</h2></div><p>${team.squadAsOf?`Rosa ammissibile MD3 · ${esc(shortDate(team.squadAsOf))}. Non equivale a convocati o titolari. `:""}Storico 2025/26; per i campionati ad anno solare è indicato il 2025. Dati ESPN e schede Serie A, con N/D per le statistiche non disponibili.</p></header>${playerControls}<div class="champions-strength-table-wrap champions-player-table-wrap" role="region" aria-label="Statistiche giocatori; scorri orizzontalmente" tabindex="0"><table class="champions-player-stats-table"><thead><tr><th rowspan="2">Calciatore</th><th rowspan="2">Ruolo</th><th rowspan="2">PG</th><th rowspan="2">Min</th><th colspan="2">Gol</th><th colspan="2">Assist</th><th colspan="2">Tiri totali</th><th colspan="2">Tiri nello specchio</th><th colspan="2">Cartellini</th><th colspan="2">Falli commessi</th><th colspan="2">Falli subiti</th></tr><tr><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th></tr></thead><tbody>${playerRows}</tbody></table></div><p class="champions-player-stats-note">Le statistiche Champions 2026/27 restano separate e saranno valorizzate solo dopo le gare ufficiali. Fonte storica: referti e statistiche stagionali ESPN. Per le italiane sono prioritari i profili Serie A; i dati mancanti sono integrati solo con associazioni verificate. Le competizioni ad anno solare riportano il 2025.</p></section>`;
    const summary=`<section class="champions-team-summary" aria-labelledby="champions-team-summary-title"><header><div><p class="eyebrow">Dati disponibili e provenienza</p><h2 id="champions-team-summary-title">Riepilogo</h2></div><p>UEFA Champions League 2026/27 · indicatori storici 2023/24–2026/27 specificati nelle singole card.</p></header><div class="champions-team-overview"><article><small>Posizione fase campionato</small><strong>${standingPosition}ª su 36</strong><span>Provvisoria · ${standing?.played||0} ${standing?.played===1?"gara":"gare"} conclusa/e</span></article><article><small>Indice europeo descrittivo</small><strong>${strengthValue} / 100</strong><span>Ranking e percorso UEFA · ${strength?.dataCoveragePct??"N/D"}% copertura</span></article><article><small>Punti per gara europei</small><strong>${historyValue}</strong><span>Competizioni UEFA 2023/24–2025/26 · ${history?.overall?.matches??"N/D"} gare</span></article>${summaryMetricCards}<article><small>Prossima lettura disponibile</small><strong>${nextReading?`${esc(nextReading.homeTeam)} – ${esc(nextReading.awayTeam)}`:"N/D"}</strong>${nextReading?`<a href="champions-league.html?match=${esc(nextReading.fixtureId)}">Apri lettura →</a>`:"<span>Nessuna lettura disponibile</span>"}</article></div><div class="champions-team-status" aria-label="Stato dati squadra"><article><small>Registrazione UEFA</small><strong>Integrata</strong><span>${esc(shortDate(team.registration.updatedAt))}</span></article><article><small>Disponibilità giocatori</small><strong>N/D</strong><span>Nessuna deduzione</span></article><article><small>Probabile formazione</small><strong>${esc(probableSide?.formation||"N/D")}</strong><span>${probableSide?"Editoriale · non ufficiale":"Fonte non integrata"}</span></article><article><small>Convocati gara</small><strong>N/D</strong><span>Non pubblicati nel dataset</span></article><article><small>Distinta ufficiale</small><strong>N/D</strong><span>Da aggiornare a ridosso della gara</span></article></div></section>`;
    /* Extension slot: render future insight sections only after verified content is supplied. */
    const futureInsights=[
      {id:"offensive-identity",title:"Identità offensiva",content:null},
      {id:"defensive-vulnerability",title:"Vulnerabilità difensive",content:null},
      {id:"recent-form",title:"Andamento recente",content:null}
    ].filter(item=>item.content).map(item=>`<section id="${item.id}" class="champions-team-insight"><h2>${esc(item.title)}</h2>${item.content}</section>`).join("");
    const heroStyle=`--club-accent:${brand.colors?.[0]||"#176bcb"};--club-accent-secondary:${brand.colors?.[1]||"#7fdcff"}`;
    const hero=`<section class="champions-team-hero" style="${esc(heroStyle)}"><div class="champions-team-identity"><span class="champions-team-hero-logo">${teamBadge(team.team,branding,{showName:false})}</span><div><p class="eyebrow">UEFA Champions League 2026/27</p><h1>${esc(team.team)}</h1><p>Allenatore: ${esc(coachDisplayName(team.coach))}</p></div></div><div class="champions-team-hero-facts"><article><small>${team.squadAsOf?"Rosa ammissibile · MD3":"Rosa registrata UEFA"}</small><strong>${team.counts.total}</strong><span>${team.counts.listB} giocatori in Lista B</span></article><article><small>Posizione fase campionato</small><strong>${standingPosition}ª</strong><span>Classifica provvisoria su 36 · ${standing?.points||0} punti</span></article></div></section>`;
    return `<nav class="champions-reading-back"><a href="champions-league.html">← Champions League</a><span>Scheda squadra</span></nav>${hero}${summary}${calendarPanel}${volumePanel}${attackPanel}${lineupFixture?`<section class="champions-team-lineup">${probableFormationCard(lineupFixture,squads,team.team)}</section>`:""}${futureInsights}${playersOverview}${playersTable}`;
  }

  function mountChampionsTeamControls(){
    if(typeof document.querySelectorAll!=="function")return;
    const table=document.querySelector(".champions-player-stats-table");
    if(!table)return;
    const body=table.tBodies[0],search=document.querySelector("#champions-player-search"),role=document.querySelector("#champions-player-role"),sort=document.querySelector("#champions-player-sort"),results=document.querySelector("#champions-player-results");
    const rows=[...body.rows];
    const value=(row,key)=>{const raw=row.dataset[`stat${key.split("-").map(part=>part[0].toUpperCase()+part.slice(1)).join("")}`];return raw===""||raw==null?null:Number(raw)};
    const apply=()=>{
      const query=search.value.trim().toLocaleLowerCase("it-IT"),selectedRole=role.value,selectedSort=sort.value;
      const visible=rows.filter(row=>(selectedRole==="all"||row.dataset.playerRole===selectedRole)&&(!query||row.dataset.playerName.includes(query)));
      const hidden=rows.filter(row=>!visible.includes(row));
      if(selectedSort==="source")visible.sort((a,b)=>Number(a.dataset.playerIndex)-Number(b.dataset.playerIndex));
      else visible.sort((a,b)=>{
        const left=value(a,selectedSort),right=value(b,selectedSort);
        if(left==null&&right==null)return a.dataset.playerName.localeCompare(b.dataset.playerName,"it");
        if(left==null)return 1;if(right==null)return -1;
        return right-left||a.dataset.playerName.localeCompare(b.dataset.playerName,"it");
      });
      visible.forEach(row=>{row.hidden=false;body.append(row)});
      hidden.forEach(row=>{row.hidden=true;body.append(row)});
      results.textContent=`${visible.length} ${visible.length===1?"giocatore":"giocatori"}`;
    };
    search.addEventListener("input",apply);role.addEventListener("change",apply);sort.addEventListener("change",apply);apply();
    const rankingPanels=[...document.querySelectorAll("[data-ranking-panel]")];
    document.querySelectorAll("[data-player-ranking]").forEach(button=>button.addEventListener("click",()=>{
      const metric=button.dataset.playerRanking;
      rankingPanels.forEach(panel=>{panel.hidden=panel.dataset.rankingPanel!==metric});
      document.querySelectorAll("[data-player-ranking]").forEach(item=>{const active=item===button;item.classList.toggle("is-active",active);item.setAttribute("aria-pressed",String(active))});
    }));
  }

  function historyDirectory(history){
    const rows=history.teams.map(profile=>`<tr><th scope="row">${esc(profile.team)}<small>${profile.overall.matches} gare · ${profile.seasonsPlayed} ${profile.seasonsPlayed===1?"stagione":"stagioni"}${profile.competitionsPlayed.length?` · ${esc(profile.competitionsPlayed.join("/"))}`:""}</small></th><td><strong>${ppgLabel(profile.overall.pointsPerMatch)}</strong></td><td>${ppgLabel(profile.levelAdjustedPointsPerMatch)}</td><td>${ppgLabel(profile.home.pointsPerMatch)}</td><td>${ppgLabel(profile.away.pointsPerMatch)}</td><td>${ppgLabel(profile.recent10.pointsPerMatch)}</td><td>${ppgLabel(profile.averageOpponentPointsPerMatch)}</td><td>${esc(profile.progression.label)}</td><td>${profile.coverage==="sufficient"?"Sufficiente":profile.coverage==="limited"?"Limitata":"N/D"}</td></tr>`).join("");
    const sourceLinks=["Champions League","UEFA Europa League","UEFA Conference League"].map(competition=>history.source.pages.find(item=>item.competition===competition&&item.season==="2025-26")).filter(Boolean).map(item=>`<a href="${esc(item.url)}" target="_blank" rel="noreferrer">${esc(item.competition.replace("UEFA ",""))} ↗</a>`).join("");
    return `<details class="champions-strength-panel champions-history-panel"><summary><span><small>${history.summary.historicalMatches} risultati ufficiali</small><strong>Rendimento europeo 2023/24–2025/26</strong></span><span>${history.summary.sufficient} campioni sufficienti · ${history.summary.limited} limitati · ${history.summary.unavailable} N/D</span></summary><div class="champions-strength-intro"><p>Champions, Europa e Conference sui 90 minuti. Pesi provvisori: UCL 1,00 · UEL 0,78 · UECL 0,62. Casa, trasferta, ultime dieci e avversari restano indicatori descrittivi, non probabilità.</p><span class="champions-source-links">${sourceLinks}</span></div><div class="champions-strength-table-wrap"><table class="champions-strength-table champions-history-table"><thead><tr><th>Squadra</th><th>P/G</th><th>P/G pond.</th><th>Casa</th><th>Trasf.</th><th>Ultime 10</th><th>Avversari</th><th>Progressione</th><th>Campione</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }

  async function appendSharedSchedina(matchday,fixtureId,host){
    if(!host||typeof host.insertAdjacentHTML!=="function")return;
    const [{loadChampionsWorkspaceMd3Derived},{createPage:createBettingPage}]=await Promise.all([import('./champions-workspace-catalog.mjs?v=20261021-official-v1'),import('./betting.js?v=20261021-champions-official-v1')]);
    const workspace=await loadChampionsWorkspaceMd3Derived(load,matchday);
    const controller=createBettingPage({...deps,dateOnly:deps.dateOnly||(value=>String(value||"").slice(0,10))});
    const section=host.querySelector('#lettura-pronostici .rd-section-content');
    const target=section||host;
    const markup=controller.championsWorkspaceMarkup(workspace,fixtureId);
    if(section){
      target.insertAdjacentHTML('beforeend',`<details class="rd-disclosure rd-champions-catalog"><summary>${matchday===3?'Schedina personale e dettagli dei pronostici':'Catalogo completo, MyCombo e schedina personale'}</summary>${markup}</details>`);
      target.querySelectorAll('.betting-round-page > .rd-section-heading,.betting-round-page > .betting-round-heading').forEach(n=>n.remove());
    }else target.insertAdjacentHTML('beforeend',markup);
    const store=controller.mountChampionsWorkspace(workspace);
    if(section){
      const [{createReadingView},{installForecasts},{sharedForecastsForMatch}]=await Promise.all([import('./reading-detail/view-model.mjs'),import('./reading-detail/forecasts.mjs'),import('./shared-forecast-contract.mjs')]);
      const fixture=workspace.fixtures.find(f=>f.id===fixtureId);
      const model=createReadingView({competition:'champions',fixture,home:{name:fixture.homeTeam},away:{name:fixture.awayTeam},forecasts:sharedForecastsForMatch(workspace.marketCatalog,fixtureId,fixture)});
      const table=document.createElement('div');section.prepend(table);
      installForecasts(model,table,host,store);
    }
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
    const requestedCalendarFixture=requestedMatchId?data.fixtures.find(fixture=>fixture.id===requestedMatchId):null;
    if(requestedCalendarFixture?.matchday===3&&requestedCalendarFixture.refereeAssignment?.status==='assigned'){
      const [profiles,{md3RefereeMarkup},catalog,{md3ForecastMarkup},probables,officialProbables,{md3ProbableMarkup}]=await Promise.all([load('champions-referee-profiles-md03-2026-27.json'),import('./reading-detail/champions-md3-referees.mjs?v=20261019-md3-referees-v1'),load('champions-md03-preliminary-2026-27.json'),import('./champions-md3-ui.mjs?v=20261019-md3-callups-v3'),load('../derived/champions-md03/probable-individuals-v2-2026-10-20.json'),loadDerived('champions-md03/official-individuals-two-v1-2026-10-20.json'),import('./champions-md3-probable.mjs?v=20261020-md3-official-two-v1')]);
      const profile=profiles.referees.find(p=>p.refereeId===requestedCalendarFixture.refereeAssignment.refereeId);
      const fixture=catalog.fixtures.find(f=>f.fixtureId===requestedMatchId);
      const sevenOfficial=await loadDerived('champions-md03/official-individuals-seven-v2-2026-10-20.json');
      const todayOfficial=await loadDerived('champions-md03/official-individuals-2026-10-21.json');
      const probableFixture=todayOfficial.fixtures.find(f=>f.fixtureId===requestedMatchId)||sevenOfficial.fixtures.find(f=>f.fixtureId===requestedMatchId)||officialProbables.fixtures.find(f=>f.fixtureId===requestedMatchId)||probables.fixtures.find(f=>f.fixtureId===requestedMatchId);
      const {mountChampionsReading}=await import('./reading-detail/champions-layout.mjs?v=20261020-champions-event-validation-v1');
      await mountChampionsReading({fixture:requestedCalendarFixture,prediction:fixture.forecast,profile,probableFixture,branding,analysis:{matches:data.fixtures,styles:styleProfiles,attackChannels,history:h2h.fixtures.find(f=>f.fixtureId===requestedMatchId),squads},refereeMarkup:md3RefereeMarkup(requestedCalendarFixture,profile,branding),probableMarkup:md3ProbableMarkup(probableFixture),extend:({shell})=>appendSharedSchedina(3,requestedMatchId,shell)});
      return;
    }
    const [md2Pilot,md2Integration,md2Schedina,md2RefereeHistory]=requestedCalendarFixture?.matchday===2?await Promise.all([load("champions-pilot-predictions-md02-2026-27.json"),load("champions-md02-ui-2026-27.json"),load("schedina-champions-md02.json"),load("champions-referee-history-2026-10-13.json")]):[null,null,null,null];
    const activePilot=md2Pilot||pilot;
    const requestedPilotFixture=requestedMatchId?activePilot.fixtures.find(fixture=>fixture.fixtureId===requestedMatchId):null;
    const refereeCheck=md2RefereeHistory?.officialVerification?.checks.find(item=>item.fixtureId===requestedMatchId);
    const refereeProfile=refereeCheck?md2RefereeHistory.referees.find(item=>item.refereeId===refereeCheck.refereeId):null;
    const requestedFixture=requestedPilotFixture?{...requestedPilotFixture,status:requestedCalendarFixture?.status||requestedPilotFixture.status,score:requestedCalendarFixture?.score||requestedPilotFixture.score,matchReport:requestedCalendarFixture?.matchReport||requestedPilotFixture.matchReport,refereeAssignment:requestedCalendarFixture?.refereeAssignment||null,refereeProfile,probableFormation:requestedCalendarFixture?.probableFormation||null}:null;
    if(requestedFixture){
      const surpriseByFixture=new Map(surpriseFactors.fixtures.map(item=>[item.fixtureId,item]));
      const md2MarketEntry=md2Integration?.fixtures.find(item=>item.fixtureId===requestedMatchId)||null;
      const md2SchedinaFixture=md2Schedina?.fixtures.find(item=>item.fixtureId===requestedMatchId)||null;
      // Resolve presentation dependencies before exposing any match content.
      let finishReading=null;
      if(isReadingPilot('champions',requestedMatchId,location.search)&&typeof document.createElement==='function'){
        try{
          const [{adaptChampionsReading},{mountReadingShell,prepareReadingShell}]=await Promise.all([import('./reading-detail/champions-adapter.mjs'),import('./reading-detail/shell.mjs?v=20261020-champions-event-validation-v1')]);
          const analysis={match:requestedCalendarFixture,matches:data.fixtures,lineups:md2MarketEntry?.lineups,availability:md2MarketEntry?.availability,referee:refereeProfile,styles:styleProfiles,attackChannels,history:h2h.fixtures.find(f=>f.fixtureId===requestedMatchId),squads,teamProfiles:activePilot.profiles};
          const model=adaptChampionsReading({fixture:requestedFixture,calendarFixture:requestedCalendarFixture,branding,publishedSelections:md2SchedinaFixture?.selections||[],analysis});
          const prepared=await prepareReadingShell(model);
          finishReading=store=>mountReadingShell(model,undefined,{store,prepared,extend:({shell})=>appendSharedSchedina(requestedCalendarFixture.matchday,requestedMatchId,shell)});
        }catch(error){delete document.body.dataset.readingDetailTheme;console.warn('Lettura: vista precedente mantenuta.',error)}
      }
      const release=document.querySelector('script[src*="js/app.js"]')?.src.match(/[?&]v=([^&]+)/)?.[1]||"dev";

      document.querySelector("#app").innerHTML=pilotReadingDetail(requestedFixture,activePilot,backtest,squads,branding,h2h,motivationByFixture.get(requestedMatchId),styleProfiles,attackByTeam,surpriseByFixture.get(requestedMatchId),md2MarketEntry?null:playerMarkets.fixtures.find(item=>item.fixtureId===requestedMatchId),md2MarketEntry?null:playerMarkets,md2MarketEntry,md2SchedinaFixture);
      if(finishReading){try{await finishReading(null)}catch(error){delete document.body.dataset.readingDetailTheme;console.warn('Lettura: vista precedente mantenuta.',error)}}
      if(!document.querySelector('.rd-shell'))await appendSharedSchedina(requestedCalendarFixture.matchday,requestedMatchId,document.querySelector('#app'));
      return;
    }
    if(requestedCalendarFixture&&motivationByFixture.has(requestedMatchId)){
      document.querySelector("#app").innerHTML=motivationOnlyDetail(requestedCalendarFixture,motivationByFixture.get(requestedMatchId),branding,squads);
      await appendSharedSchedina(requestedCalendarFixture.matchday,requestedMatchId,document.querySelector("#app"));
      return;
    }
    const requestedTeam=requestedTeamId?squads.teams.find(team=>team.id===requestedTeamId):null;
    if(requestedTeam){
      const md2TeamPilot=await load("champions-pilot-predictions-md02-2026-27.json");
      const teamPilot={...pilot,fixtures:[...pilot.fixtures,...md2TeamPilot.fixtures]};
      // Current team cards join the verified MD3 registry by canonical team ID.
      // Historical fixture/readings keep the original registered-squad snapshot.
      const md3Registry=await load("champions-md03-player-database-2026-27.json");
      const md3TeamId=({"bod-glimt":"bodo-glimt"})[requestedTeam.id]||requestedTeam.id;
      const md3Team=md3Registry.teams.find(team=>team.teamId===md3TeamId);
      const currentTeam=md3Team?{...requestedTeam,players:md3Team.players,squadAsOf:md3Registry.asOf,counts:{...requestedTeam.counts,total:md3Team.players.length,listB:md3Team.players.filter(p=>p.registrationList==="B").length}}:requestedTeam;
      document.querySelector("#app").innerHTML=`<div class="champions-team-detail">`+championsTeamDetail(currentTeam,profiles.get(requestedTeam.team),histories.get(requestedTeam.team),teamPilot,squads,attackByTeam.get(requestedTeam.team),data,branding)+`</div>`;
      mountChampionsTeamControls();
      return;
    }
    const md2Summary=await load("champions-pilot-predictions-md02-2026-27.json");
    // Le Letture MD3 esistono nel calendario e vengono gestite da render()
    // anche se non sono presenti negli archivi pilot MD1/MD2.
    const pilotByFixture=new Map([...pilot.fixtures,...md2Summary.fixtures].map(fixture=>[fixture.fixtureId,fixture]));
    for(const fixture of data.fixtures){
      if(fixture.matchday===3)pilotByFixture.set(fixture.id,{fixtureId:fixture.id});
    }
    const matchdays=Array.from({length:data.summary.matchdays},(_,index)=>index+1);
    const roundRows=number=>data.fixtures.filter(fixture=>fixture.matchday===number);
    const hasResult=fixture=>fixture.status==="finished"&&Number.isFinite(fixture.score?.home)&&Number.isFinite(fixture.score?.away);
    const completedMatchdays=matchdays.filter(number=>roundRows(number).length>0&&roundRows(number).every(hasResult));
    const defaultMatchday=matchdays.find(number=>!completedMatchdays.includes(number))??matchdays.at(-1);
    let selectedMatchday=defaultMatchday;
    const roundRange=number=>{const dates=roundRows(number).map(f=>f.date).filter(Boolean).sort();return dates.length?shortDate(dates[0])+(dates[0]!==dates.at(-1)?' – '+shortDate(dates.at(-1)):''):'Date da definire'};
    const roundStatus=number=>completedMatchdays.includes(number)?'Conclusa':roundRows(number).some(hasResult)?'In corso':'Da giocare';
    const dayButton=number=>`<button type="button" class="champions-day ${completedMatchdays.includes(number)?'is-completed':number===defaultMatchday?'is-current':'is-future'}" data-champions-day="${number}" aria-expanded="${number===defaultMatchday}" aria-controls="champions-fixtures" aria-label="${matchdayLabel(number)} · ${roundStatus(number)} · ${esc(roundRange(number))}"><span>Giornata</span><strong>${number}</strong><small>${roundStatus(number)}</small></button>`;
    const teamOptions=data.teams.map(team=>`<option value="${esc(team)}">${esc(team)}</option>`).join("");
    document.querySelector("#app").innerHTML=`<div class="champions-overview">
      <section class="champions-hero champions-home-banner" aria-label="UEFA Champions League 2026/27"><img src="assets/images/champions-home-2026-27.png" alt="UEFA Champions League, stadio illuminato in blu e viola" width="1920" height="1080" fetchpriority="high"><div class="champions-banner-title"><h2>CHAMPIONS LEAGUE</h2><p>Stagione 2026/27</p></div></section>
      ${teamLogoDirectory(data.teamBranding,squads)}${roundTable(data)}
      <section class="champions-calendar" aria-labelledby="champions-calendar-title">
        <header class="champions-calendar-heading"><div><p class="eyebrow">UEFA Champions League 2026/27 · Fase campionato</p><h1 id="champions-calendar-title">Calendario</h1><p>144 partite · 36 squadre · 8 giornate. Seleziona una giornata per consultare partite e risultati.</p></div></header>
        <nav class="champions-days" aria-label="Giornate della fase campionato">
          ${matchdays.map(dayButton).join('')}
        </nav>
        <div class="champions-controls">
          <label><span>Squadra</span><select id="champions-team"><option value="all">Tutte le squadre</option>${teamOptions}</select></label>
          <button id="champions-reset" type="button">Azzera filtri</button>
        </div>
        <div class="champions-results-head"><p id="champions-results-label" aria-live="polite"></p><span>Snapshot calendario del ${esc(shortDate(data.generatedAt.slice(0,10)))}</span></div>
        <div id="champions-fixtures" role="region" aria-labelledby="champions-calendar-title"></div>
      </section></div>`;

    const teamSelect=document.querySelector("#champions-team");
    const results=document.querySelector("#champions-fixtures");
    const resultsLabel=document.querySelector("#champions-results-label");
    const applyFilters=()=>{
      const team=teamSelect.value;
      const filtered=data.fixtures.filter(fixture=>fixture.matchday===selectedMatchday&&(team==="all"||fixture.homeTeam===team||fixture.awayTeam===team));
      results.innerHTML=selectedMatchday==null?'':fixtureGroups(filtered,branding,pilotByFixture);
      results.hidden=selectedMatchday==null;
      resultsLabel.textContent=selectedMatchday==null?'Seleziona una giornata.':`${filtered.length} ${filtered.length===1?'partita':'partite'} · ${roundRange(selectedMatchday)} · ${roundStatus(selectedMatchday)}`;
      document.querySelector('#champions-calendar-title').textContent=selectedMatchday==null?'Calendario':`Calendario · ${matchdayLabel(selectedMatchday)}`;
      document.querySelectorAll('[data-champions-day]').forEach(button=>button.setAttribute('aria-expanded',String(Number(button.dataset.championsDay)===selectedMatchday)));
    };
    document.querySelectorAll('[data-champions-day]').forEach(button=>button.addEventListener('click',()=>{const day=Number(button.dataset.championsDay);selectedMatchday=selectedMatchday===day?null:day;applyFilters()}));
    teamSelect.addEventListener("change",applyFilters);
    document.querySelector("#champions-reset").addEventListener("click",()=>{selectedMatchday=defaultMatchday;teamSelect.value="all";applyFilters()});
    applyFilters();
  }
  return {render};
}
