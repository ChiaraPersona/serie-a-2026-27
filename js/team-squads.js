(async () => {
  const root = document.getElementById("team-squad-app");
  if (!root) return;

  const base = document.body.dataset.depth === "team" ? "../" : "";
  await import(`${base}js/public-presentation.js`);
  const { renderLineupField } = await import(`${base}js/components/lineup-field.mjs?v=20261015-team-dashboard`);
  const {shirtNumberAt}=await import(`${base}js/pages/reading-detail/shirt-numbers.mjs`);
  let numbering,officialNumbers,probableNumbers;
  const numberFor=(team,lineup,name)=>{
    const date=lineup.status==='official'?numberingMatches.find(m=>m.id===lineup.matchId)?.date:lineup.source?.retrievedAt;
    const official=officialNumbers.fixtures.find(f=>f.matchId===lineup.matchId)?.teams?.find(t=>t.teamId===team.id);
    const probable=probableNumbers.teams.find(t=>t.teamId===team.id);
    const person=(lineup.status==='official'?official?.players:probable?.players)?.find(p=>p.sourceName===name||p.currentName===name);
    return shirtNumberAt(numbering,team.id,person?.playerId,date);
  };
  let numberingMatches=[];
  const release = "20261016-team-editorial-v2";
  const defaultPlayerPhoto = `${base}assets/images/players/player-placeholder.png`;
  const esc = value => String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const contrastInk = color => {
    const hex = String(color || "").replace("#", "");
    const value = hex.length === 3 ? hex.split("").map(char => char + char).join("") : hex;
    if (!/^[0-9a-f]{6}$/i.test(value)) return "#fff";
    const channels = [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16) / 255).map(channel => channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722 > .42 ? "#0b1320" : "#fff";
  };
  const value = (input, suffix = "") => input === null || input === undefined || input === "" ? "N/D" : `${esc(input)}${suffix}`;
  const pct = input => value(input, "%");
  root.addEventListener("error", event => {
    const image = event.target;
    if (!image?.matches?.("img[data-player-photo]") || image.getAttribute("src") === defaultPlayerPhoto) return;
    image.setAttribute("src", defaultPlayerPhoto);
    image.classList.add("is-fallback");
    if (image.getAttribute("alt")) image.setAttribute("alt", `Foto non disponibile per ${image.dataset.playerName || "il calciatore"}`);
  }, true);
  const searchKey = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it");
  const cards = stats => {
    const values = [stats?.yellowCards, stats?.secondYellowCards, stats?.straightRedCards];
    return values.some(item => item === null || item === undefined) ? null : values.reduce((total, item) => total + item, 0);
  };
  const metric = (player, key, statsByPlayer = null) => {
    if (key === "age") return player.age;
    if (key === "marketValue") return player.marketValue?.amountEur;
    const entry = statsByPlayer?.get(player.id) || player.previousSeason?.totals || {};
    if (key === "cards") return entry.cards ?? cards(entry);
    const per90Fields = { goalsPer90: "goals", assistsPer90: "assists", shotsPer90: "shots", shotsOnTargetPer90: "shotsOnTarget", cardsPer90: "cards", foulsCommittedPer90: "foulsCommitted", foulsWonPer90: "foulsWon" };
    if (per90Fields[key]) return entry.per90?.[per90Fields[key]];
    return entry[key];
  };
  const roleOrder = { Portiere: 0, Difensore: 1, Centrocampista: 2, Attaccante: 3 };
  const roleAbbreviations = {
    Portiere: "POR", Difensore: "DC", "Difensore centrale": "DC", "Difensore centrale destro": "DC", "Difensore centrale sinistro": "DC",
    "Terzino destro": "TD", "Terzino sinistro": "TS",
    Centrocampista: "CC", "Centrocampista centrale": "CC", "Centrocampista centrale destro": "CC", "Centrocampista centrale sinistro": "CC",
    Mediano: "CDC", "Mediano / regista": "CDC", "Esterno destro": "ED", "Esterno sinistro": "ES",
    Trequartista: "COC", "Trequartista destro": "COC", "Trequartista sinistro": "COC", "Trequartista / ala": "COC", Regista: "COC",
    Attaccante: "ATT", "Seconda punta": "ATT", Centravanti: "ATT", "Ala destra": "AD", "Ala sinistra": "AS"
  };
  const displayRole = player => {
    const roles = Array.isArray(player.detailedRoles) && player.detailedRoles.length ? player.detailedRoles : [player.detailedRole || player.role];
    return [...new Set(roles.map(role => roleAbbreviations[role] || role).filter(Boolean))].join(" / ") || "N/D";
  };
  const compareByRole = (left, right) =>
    (roleOrder[left.role] ?? 99) - (roleOrder[right.role] ?? 99) ||
    String(left.detailedRole || left.role).localeCompare(String(right.detailedRole || right.role), "it") ||
    left.name.localeCompare(right.name, "it");

  const signed = number => `${number > 0 ? "+" : ""}${number}`;
  const objectiveStatus = (team, dataset, standings) => {
    const profile = dataset.teams.find(item => item.teamId === team.id);
    const row = standings.map((item, index) => ({ ...item, position: index + 1 })).find(item => item.team === team.id);
    if (!profile || !row || !window.ObjectiveMetrics) return "";
    const metrics = window.ObjectiveMetrics.calculateObjectiveMetrics(profile, row, row.played || 0);
    const metricCard = (label, display, numeric = null, tone = "") =>
      `<div class="objective-metric ${tone}"><span>${label}</span><strong>${display}</strong>${numeric === null ? "" : `<i class="metric-track" aria-hidden="true"><b style="width:${Math.max(0, Math.min(100, numeric))}%"></b></i>`}</div>`;
    return `<section id="team-objective-heading" class="team-objective-compact" aria-label="Obiettivo stagionale"><div><small>Obiettivo iniziale</small><h3>${esc(profile.primaryObjective)}</h3><p>${esc(profile.secondaryObjective)} · posizione obiettivo ${profile.targetPosition}ª</p></div><div class="objective-metrics">${metricCard("Progresso obiettivo", `${metrics.objectiveProgress}%`, metrics.objectiveProgress)}${metricCard("Rendimento sulle attese", signed(metrics.seasonOverperformance))}</div></section>`;
  };

  const tacticalProfileDetails = (team, dataset) => {
    const profile = dataset?.profiles?.find(item => item.teamId === team.id);
    if (!profile) return "";
    const traits = (title, items = []) => `<article class="team-style-traits"><h3>${title}</h3>${items.length ? `<ul>${items.map(item => `<li><span>${esc(item.label)}</span>${item.level ? `<small>${esc(item.level)}</small>` : ""}</li>`).join("")}</ul>` : '<p class="muted">Dato non disponibile.</p>'}</article>`;
    return `<div class="team-tactical-analysis"><p class="team-editorial-note">Tratti ${profile.characteristicsSeason === "2026-27" ? "Serie A 2026/27" : `${esc(profile.competition)} 2025/26`} · Origini dei gol: ${esc(profile.competition)} 2025/26. <a href="${esc(profile.source?.url)}" target="_blank" rel="noreferrer">Fonte</a></p>${profile.notes?.length ? `<p class="team-editorial-note">${profile.notes.map(esc).join(" ")}</p>` : ""}<div class="team-style-trait-grid">${traits("Punti di forza", profile.strengths)}${traits("Punti di debolezza", profile.weaknesses)}${traits("Comportamenti ricorrenti", profile.playingStyle)}<article class="team-style-traits"><h3>Origini dei gol</h3>${profile.goalTypes?.length ? `<div class="team-style-goals">${profile.goalTypes.map(item => `<div><span>${esc(item.type)}</span><strong>${value(item.goals)}</strong><small>${value(item.sharePct, "%")}</small></div>`).join("")}</div>` : '<p class="muted">Dato non disponibile.</p>'}</article></div></div>`;
  };

  const editorialDisclosure = (id, label, content, className = "") => `<details id="${id}" class="team-editorial-disclosure ${className}"><summary aria-controls="${id}-content" aria-expanded="false"><span>${label}</span><span class="team-disclosure-arrow" aria-hidden="true">↗</span></summary><div id="${id}-content" class="team-disclosure-content">${content}</div></details>`;

  const tacticalProfileSection = (team, dataset) => `<section class="detail-section team-style-section team-style-essential"><h3>Analisi tattica</h3>${tacticalProfileDetails(team, dataset) || '<p class="muted">Punti di forza, punti di debolezza, comportamenti ricorrenti e origini dei gol: dati non disponibili.</p>'}</section>`;

  const probableLineupSection = (team, teamSummary) => {
    const lineup = team.probableLineup || team.projectedLineup;
    if (!lineup?.players?.length) return "";
    const [primary = "#0e2a69", secondary = "#07152f"] = teamSummary?.colors || [];
    const official = lineup.status === "official";
    const sourceLink = lineup.source?.url ? `<a href="${esc(lineup.source.url)}" target="_blank" rel="noreferrer">${esc(lineup.source.provider || "Fonte")}</a>` : esc(lineup.source?.provider || "Fonte non disponibile");
    const title = official ? "Formazione ufficiale" : "Probabile formazione";
    const substitutes = official && lineup.substitutes?.length ? `<p class="probable-lineup-substitutes"><strong>A disposizione:</strong> ${lineup.substitutes.map(esc).join(", ")}</p>` : "";
    return `<section class="detail-section team-probable-lineup" aria-labelledby="probable-lineup-heading" style="--lineup-primary:${esc(primary)};--lineup-secondary:${esc(secondary)};--lineup-head-ink:${contrastInk(secondary)}"><header class="probable-lineup-heading"><div><p class="eyebrow">Serie A 2026/27 · ${esc(lineup.context || (official ? "formazione ufficiale" : "proiezione editoriale"))}</p><h2 id="probable-lineup-heading">${title}</h2></div>${official ? "" : "<span>Visualizzazione sperimentale</span>"}</header><div class="probable-lineup-board"><header class="probable-lineup-board-head"><img src="${esc(team.logo)}" alt=""><div><small>${official ? "XI ufficiale" : "Probabile XI"}</small><h3>${esc(team.name)}</h3></div><strong>${esc(lineup.formation)}</strong></header>${renderLineupField([{team: {...teamSummary, ...team, colors: teamSummary?.colors}, lineup}], {orientation: "vertical",shirtNumberFor:name=>numberFor(team,lineup,name)})}<footer><div><p>${official ? `Formazione ufficiale ${esc(lineup.fixtureLabel||team.name)}` : "Proiezione editoriale, non distinta ufficiale"}</p>${substitutes}</div>${sourceLink}</footer></div></section>`;
  };

  const labels = {
    played: "Partite", won: "Vittorie", drawn: "Pareggi", lost: "Sconfitte", points: "Punti",
    pointsPerGame: "Punti / partita", goalsFor: "Gol fatti", goalsAgainst: "Gol subiti",
    goalDifference: "Differenza reti", cleanSheets: "Clean sheet", failedToScore: "Gare senza segnare",
    winPercentage: "Vittorie", drawPercentage: "Pareggi", lossPercentage: "Sconfitte",
    shotsPerGame: "Tiri / partita", shotsOnTargetPerGame: "Tiri nello specchio / partita",
    shotAccuracy: "Precisione tiri", shotConversion: "Conversione tiri", bigChancesMissed: "Grandi occasioni fallite",
    expectedGoals: "xG", expectedGoalsPerGame: "xG / partita", goalsVsExpectedGoals: "Gol rispetto agli xG",
    corners: "Corner", cornersPerGame: "Corner / partita", shotsConceded: "Tiri concessi",
    shotsOnTargetConceded: "Tiri nello specchio concessi", expectedGoalsAgainst: "xG concessi",
    averagePossession: "Possesso medio", passesAttempted: "Passaggi tentati", passesCompleted: "Passaggi riusciti",
    foulsCommitted: "Falli commessi", foulsCommittedPerGame: "Falli / partita", foulsWon: "Falli subiti",
    foulsWonPerGame: "Falli subiti / partita", yellowCards: "Gialli", yellowCardsPerGame: "Gialli / partita",
    secondYellowCards: "Doppi gialli", straightRedCards: "Rossi diretti", dismissals: "Espulsioni",
    penaltiesConceded: "Rigori concessi", penaltiesWon: "Rigori ottenuti", disciplineIndex: "Indice disciplinare",
    goalsAgainstPerGame: "Gol subiti / partita", appearances: "Presenze", starts: "Da titolare",
    substituteAppearances: "Da subentrato", minutes: "Minuti", minutesPerAppearance: "Minuti / presenza",
    completeMatches: "Gare complete", substitutedOff: "Sostituzioni", goals: "Gol", assists: "Assist",
    shots: "Tiri totali", shotsOnTarget: "Tiri nello specchio", penaltiesTaken: "Rigori calciati", penaltiesScored: "Rigori segnati",
    offsides: "Fuorigioco", keyPasses: "Passaggi chiave", chancesCreated: "Occasioni create",
    passAccuracy: "Precisione passaggi", crosses: "Cross", tackles: "Contrasti", interceptions: "Intercetti",
    clearances: "Respinte", duels: "Duelli", duelsWon: "Duelli vinti", goalsConceded: "Gol subiti",
    saves: "Parate", savePercentage: "% parate", penaltiesFaced: "Rigori affrontati", penaltiesSaved: "Rigori parati", cards: "Cartellini"
  };

  const statGrid = (object, keys, compact = false) => `<div class="${compact ? "player-stat-grid" : "team-stat-grid"}">${keys.map(key => `<article><span>${labels[key] || key}</span><strong>${key.endsWith("Percentage") || key === "passAccuracy" || key === "savePercentage" ? pct(object?.[key]) : value(object?.[key])}</strong></article>`).join("")}</div>`;
  const percentageKeys = new Set(["shotAccuracy", "shotConversion", "passAccuracy", "savePercentage", "averagePossession"]);
  const teamSeasonList = (object, keys) => `<div class="team-stat-table-wrap"><table class="team-season-list"><caption class="sr-only">Statistiche del gruppo</caption><tbody>${keys.map(key => `<tr><th scope="row">${labels[key] || key}</th><td>${key.endsWith("Percentage") || percentageKeys.has(key) ? pct(object?.[key]) : value(typeof object?.[key] === "number" ? Number(object[key].toFixed(2)).toLocaleString("it-IT") : object?.[key])}</td></tr>`).join("")}</tbody></table></div>`;
  const teamNavigation = (team, teams) => {
    const currentIndex = teams.findIndex(item => item.id === team.id);
    const previous = teams[(currentIndex - 1 + teams.length) % teams.length];
    const next = teams[(currentIndex + 1) % teams.length];
    return `<header class="subpage-header team-page-navigation"><a class="team-page-navigation-all" href="${base}statistiche-squadre.html">← Tutte le squadre</a><nav aria-label="Navigazione tra le squadre"><a href="${base}statistiche-squadra/${esc(previous.id)}.html" aria-label="Squadra precedente: ${esc(previous.name)}"><span>← Squadra precedente</span><strong>${esc(previous.name)}</strong></a><a href="${base}statistiche-squadra/${esc(next.id)}.html" aria-label="Squadra successiva: ${esc(next.name)}"><span>Squadra successiva →</span><strong>${esc(next.name)}</strong></a></nav></header>`;
  };

  async function load(path) {
    const response = await fetch(`${base}${path}?v=${release}`);
    if (!response.ok) throw new Error(`${path}: ${response.status}`);
    return response.json();
  }

  const filters = () => `<div class="squad-controls"><label>Ricerca<input id="player-search" type="search" placeholder="Nome calciatore"></label><label>Ruolo<select id="role-filter"><option value="">Tutti</option><option>Portiere</option><option>Difensore</option><option>Centrocampista</option><option>Attaccante</option></select></label><label>Stato<select id="status-filter"><option value="">Tutti</option><option>confermato</option><option>nuovo acquisto</option><option>prestito</option><option>rientro dal prestito</option><option>primavera</option><option>da verificare</option></select></label><label>Ordina<select id="player-sort"><option value="role">Ruolo</option><option value="marketValue">Valore di mercato</option><option value="appearances">Presenze</option><option value="minutes">Minuti</option><option value="goals">Gol totali</option><option value="goalsPer90">Gol / 90</option><option value="assists">Assist totali</option><option value="assistsPer90">Assist / 90</option><option value="shots">Tiri totali</option><option value="shotsPer90">Tiri totali / 90</option><option value="shotsOnTarget">Tiri nello specchio</option><option value="shotsOnTargetPer90">Tiri nello specchio / 90</option><option value="cards">Cartellini totali</option><option value="cardsPer90">Cartellini / 90</option><option value="foulsCommitted">Falli commessi totali</option><option value="foulsCommittedPer90">Falli commessi / 90</option><option value="foulsWon">Falli subiti totali</option><option value="foulsWonPer90">Falli subiti / 90</option><option value="age">Età</option></select></label></div>`;

  const seasonTotals = player => player.previousSeason?.totals || player.previousSeason?.entries?.[0] || {};
  const leaderboardStats = [
    { key: "appearances", label: "Presenze" }, { key: "minutes", label: "Minuti" },
    { key: "goals", label: "Gol", per90: true }, { key: "assists", label: "Assist", per90: true },
    { key: "shots", label: "Tiri totali", per90: true }, { key: "shotsOnTarget", label: "Tiri nello specchio", per90: true },
    { key: "cards", label: "Cartellini", per90: true }, { key: "foulsCommitted", label: "Falli commessi", per90: true },
    { key: "foulsWon", label: "Falli subiti", per90: true }
  ];

  const per90Rate = (total, minutes) => typeof total === "number" && typeof minutes === "number" && minutes > 0 ? Math.round((total * 90 / minutes) * 100) / 100 : null;

  function currentSquadLeaderboardRows(team, matches) {
    const squadById = new Map(team.squad.map(player => [player.id, player]));
    const rows = new Map();
    const ensure = (playerId, playerName) => {
      if (!rows.has(playerId)) {
        rows.set(playerId, {
          player: squadById.get(playerId) || { id: playerId, name: playerName },
          appearances: 0,
          minutes: 0,
          minutesCoverage: 0,
          sums: { goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, foulsCommitted: 0, foulsWon: 0 },
          coverage: { goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, foulsCommitted: 0, foulsWon: 0 },
          cards: 0
        });
      }
      return rows.get(playerId);
    };
    const finishedMatches = matches.filter(match => match.competition === "serie-a" && match.season === "2026-27" && (match.homeTeam === team.id || match.awayTeam === team.id) && match.status === "finished" && match.score);
    for (const match of finishedMatches) {
      const side = match.homeTeam === team.id ? "home" : "away";
      for (const matchPlayer of match.playerStats?.[side] || []) {
        if (!matchPlayer.playerId) continue;
        const row = ensure(matchPlayer.playerId, matchPlayer.player);
        row.appearances += 1;
        if (typeof matchPlayer.minutes === "number") {
          row.minutes += matchPlayer.minutes;
          row.minutesCoverage += 1;
        }
        for (const field of ["goals", "assists", "shots", "shotsOnTarget", "foulsCommitted", "foulsWon"]) {
          if (typeof matchPlayer[field] !== "number") continue;
          row.sums[field] += matchPlayer[field];
          row.coverage[field] += 1;
        }
      }
      for (const booking of match.bookings || []) {
        if (booking.team !== team.id || !booking.playerId) continue;
        ensure(booking.playerId, booking.player).cards += 1;
      }
    }
    return [...rows.values()].map(row => {
      const minutes = row.appearances > 0 && row.minutesCoverage === row.appearances ? row.minutes : null;
      const totals = {
        appearances: row.appearances || null,
        minutes,
        goals: row.appearances > 0 && row.coverage.goals === row.appearances ? row.sums.goals : null,
        assists: row.appearances > 0 && row.coverage.assists === row.appearances ? row.sums.assists : null,
        shots: row.appearances > 0 && row.coverage.shots === row.appearances ? row.sums.shots : null,
        shotsOnTarget: row.appearances > 0 && row.coverage.shotsOnTarget === row.appearances ? row.sums.shotsOnTarget : null,
        cards: row.cards,
        foulsCommitted: row.appearances > 0 && row.coverage.foulsCommitted === row.appearances ? row.sums.foulsCommitted : null,
        foulsWon: row.appearances > 0 && row.coverage.foulsWon === row.appearances ? row.sums.foulsWon : null
      };
      return {
        player: row.player,
        linked: squadById.has(row.player.id),
        totals,
        per90: Object.fromEntries(leaderboardStats.map(stat => [stat.key, per90Rate(totals[stat.key], minutes)]))
      };
    });
  }

  function combinedSquadStats(team, matches) {
    const currentByPlayer = new Map(currentSquadLeaderboardRows(team, matches).map(row => [row.player.id, row.totals]));
    const addCovered = (previous, current, currentPlayed) => {
      if (currentPlayed > 0 && (current === null || current === undefined)) return null;
      const values = [previous, current].filter(value => typeof value === "number");
      return values.length ? values.reduce((total, value) => total + value, 0) : null;
    };
    return new Map(team.squad.map(player => {
      const previous = seasonTotals(player);
      const current = currentByPlayer.get(player.id) || null;
      const currentPlayed = current?.appearances || 0;
      const minutes = addCovered(previous.minutes, current?.minutes, currentPlayed);
      const totals = {
        appearances: addCovered(previous.appearances, current?.appearances, 0),
        minutes,
        goals: addCovered(previous.goals, current?.goals, currentPlayed),
        assists: addCovered(previous.assists, current?.assists, currentPlayed),
        shots: addCovered(previous.shots, current?.shots, currentPlayed),
        shotsOnTarget: addCovered(previous.shotsOnTarget, current?.shotsOnTarget, currentPlayed),
        cards: addCovered(cards(previous), current?.cards, currentPlayed),
        foulsCommitted: addCovered(previous.foulsCommitted, current?.foulsCommitted, currentPlayed),
        foulsWon: addCovered(previous.foulsWon, current?.foulsWon, currentPlayed)
      };
      totals.per90 = Object.fromEntries(leaderboardStats.filter(stat => stat.per90).map(stat => [stat.key, per90Rate(totals[stat.key], minutes)]));
      return [player.id, totals];
    }));
  }

  const rankedLeaders = (rows, stat) => rows.map(row => ({ player: row.player, linked: row.linked, total: row.totals[stat.key], rate: row.per90?.[stat.key] }))
        .filter(item => item.total !== null && item.total !== undefined)
        .sort((left, right) => right.total - left.total || (right.rate ?? -1) - (left.rate ?? -1) || left.player.name.localeCompare(right.player.name, "it"))
        .slice(0, 3);

  function squadLeaderboardSection(rows, teamName, season) {
    const cardsHtml = leaderboardStats.map(stat => {
      const leaders = rankedLeaders(rows, stat);
      return `<article class="squad-leader-card"><header><h4>${esc(stat.label)}</h4><span>${stat.per90 ? "Totale · /90" : "Totale"}</span></header>${leaders.length ? `<ol>${leaders.map((item, index) => `<li><span class="leader-rank">${index + 1}</span>${item.linked ? `<button class="leader-player" type="button" data-player-id="${esc(item.player.id)}">${esc(item.player.name)}</button>` : `<span class="leader-player leader-player-unlinked">${esc(item.player.name)}<small>Scheda N/D</small></span>`}<strong>${value(item.total)}${stat.per90 ? `<small>${value(item.rate)} /90</small>` : ""}</strong></li>`).join("")}</ol>` : `<p class="muted">Dati non disponibili</p>`}</article>`;
    }).join("");
    const description = "Classifica sulle partite concluse e sui soli campi giocatore disponibili. Le metriche non coperte restano N/D.";
    const titleId = `squad-leaders-title-${season.replace("/", "-")}`;
    return `<section class="squad-leaders squad-leaders-period" aria-labelledby="${titleId}"><h3 id="${titleId}" class="sr-only">Classifiche individuali ${season}</h3><div class="squad-leaders-content"><p>${description}</p><div class="squad-leader-grid">${cardsHtml}</div></div></section>`;
  }

  function squadLeaderboards(team, currentRows) {
    return `<div id="squad-leaderboards" class="squad-leaderboards">${squadLeaderboardSection(currentRows, team.name, "2026/27")}</div>`;
  }

  function editorialSeason(team, currentStats, standings) {
    const index = standings.findIndex(row => row.team === team.id);
    const results = currentStats?.results;
    const metrics = [["Posizione", index >= 0 ? index + 1 : null], ["Punti", results?.points], ["Partite", results?.played], ["Gol fatti", results?.goalsFor], ["Gol subiti", results?.goalsAgainst]];
    return `<section class="team-season-summary" data-editorial-section="season" id="team-season-summary-title" aria-label="Panoramica Serie A 2026/27"><dl class="team-key-numbers">${metrics.map(([label, number]) => `<div><dt>${label}</dt><dd>${value(number)}</dd></div>`).join("")}</dl>${team.europeanCompetitions?.length ? `<p class="team-editorial-note">Altre competizioni: ${team.europeanCompetitions.map(item => esc(typeof item === "string" ? item : item.name || item.competition || "")).filter(Boolean).join(" · ")}</p>` : ""}</section>`;
  }

  function fullSeasonRoster(team, statsByPlayer) {
    return `<section class="team-full-roster-section" data-editorial-section="roster" aria-labelledby="team-full-roster-title"><header class="team-editorial-heading"><h2 id="team-full-roster-title">La rosa completa</h2></header><p class="team-editorial-note">Tutti i ${team.squad.length} calciatori della rosa, inclusi quelli senza presenze. I dati sommano 2025/26 e 2026/27; seleziona un nome per il dettaglio. Numeri: Lega Serie A, comunicato del 21 agosto 2026; documento parziale, N/D per le associazioni non disponibili.</p>${filters()}<div id="squad-results">${squadTable(team.squad, statsByPlayer)}</div></section>`;
  }


  function squadTable(players, statsByPlayer) {
    if (!players.length) return `<div class="data-warning"><strong>Nessun calciatore corrisponde ai filtri</strong><p>Modifica ricerca, ruolo o stato per visualizzare di nuovo la rosa.</p></div>`;
    const statColumns = Array.from({ length: 14 }, () => '<col class="squad-col-stat">').join("");
    return `<p class="squad-count" aria-live="polite">${players.length} calciator${players.length === 1 ? "e" : "i"}</p><div class="table-wrap squad-table-wrap" role="region" aria-label="Statistiche calciatori; scorri orizzontalmente e verticalmente" tabindex="0"><table class="squad-table"><colgroup><col class="squad-col-player"><col class="squad-col-number"><col class="squad-col-role"><col class="squad-col-market"><col class="squad-col-played"><col class="squad-col-minutes">${statColumns}</colgroup><thead><tr><th rowspan="2">Calciatore</th><th rowspan="2">N°</th><th rowspan="2">Ruolo</th><th rowspan="2">Valore mercato</th><th rowspan="2">PG</th><th rowspan="2">Min</th><th colspan="2">Gol</th><th colspan="2">Assist</th><th colspan="2">Tiri totali</th><th colspan="2">Tiri nello specchio</th><th colspan="2">Cartellini</th><th colspan="2">Falli commessi</th><th colspan="2">Falli subiti</th></tr><tr><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th></tr></thead><tbody>${players.map(player => {
      const entry = statsByPlayer.get(player.id) || seasonTotals(player);
      const avatar = `<img class="mini-avatar${player.photo ? "" : " is-fallback"}" src="${esc(player.photo || defaultPlayerPhoto)}" data-player-photo data-fallback="${esc(defaultPlayerPhoto)}" alt="" loading="lazy" decoding="async">`;
      return `<tr data-player-id="${esc(player.id)}"><td><button class="player-open" type="button" data-player-id="${esc(player.id)}">${avatar}<span><strong>${esc(player.name)}</strong><small>${value(player.nationality)}</small></span></button></td><td>${value(player.shirtNumber)}</td><td>${value(displayRole(player))}</td><td>${player.marketValue ? `<a class="market-value" href="${esc(player.marketValue.sourceUrl)}" target="_blank" rel="noreferrer">${value(player.marketValue.label)}</a>` : "N/D"}</td><td>${value(entry.appearances)}</td><td>${value(entry.minutes)}</td><td>${value(entry.goals)}</td><td>${value(entry.per90?.goals)}</td><td>${value(entry.assists)}</td><td>${value(entry.per90?.assists)}</td><td>${value(entry.shots)}</td><td>${value(entry.per90?.shots)}</td><td>${value(entry.shotsOnTarget)}</td><td>${value(entry.per90?.shotsOnTarget)}</td><td>${value(entry.cards ?? cards(entry))}</td><td>${value(entry.per90?.cards)}</td><td>${value(entry.foulsCommitted)}</td><td>${value(entry.per90?.foulsCommitted)}</td><td>${value(entry.foulsWon)}</td><td>${value(entry.per90?.foulsWon)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }

  function squadComparator(team, statsByPlayer) {
    const playerSearch = (index, label) => `<label>${label}<span class="player-autocomplete"><input type="search" data-team-comparator="${index}" role="combobox" aria-autocomplete="list" aria-controls="team-comparator-${index}-suggestions" aria-expanded="false" autocomplete="off" placeholder="Scrivi il nome…"><span class="player-suggestions" id="team-comparator-${index}-suggestions" role="listbox" hidden></span></span><small class="player-comparator-control-hint">Scrivi liberamente e scegli un suggerimento</small></label>`;
    return `<section class="detail-section player-comparator team-player-comparator" id="comparatore-calciatori"><header><div><p class="eyebrow">Confronto nella rosa</p><h2>Comparatore calciatori</h2></div><p>Totali 2025/26 + 2026/27 e valori per 90 minuti.</p></header><div class="player-comparator-controls">${playerSearch(0, "Calciatore A")}${playerSearch(1, "Calciatore B")}</div><div class="player-comparator-result" data-team-comparator-result aria-live="polite"></div></section>`;
  }

  function squadComparatorResult(team, statsByPlayer, ids) {
    const chosen = ids.map(id => team.squad.find(player => player.id === id)).filter(Boolean);
    if (chosen.length < 2) return `<div class="data-warning"><strong>Seleziona due calciatori</strong></div>`;
    const metrics = [["Minuti giocati","minutes",false],["Gol","goals",true],["Assist","assists",true],["Tiri totali","shots",true],["Tiri nello specchio","shotsOnTarget",true],["Cartellini","cards",true],["Falli commessi","foulsCommitted",true],["Falli subiti","foulsWon",true]];
    const entry = player => statsByPlayer.get(player.id) || seasonTotals(player);
    return `<div class="player-comparator-head">${chosen.map(player=>`<article><h3>${esc(player.name)}</h3><p>${esc(displayRole(player))}</p><strong>${value(entry(player).appearances)} PG · ${value(entry(player).minutes)} min</strong></article>`).join("")}</div><div class="table-wrap"><table><thead><tr><th>Statistica</th>${chosen.map(player=>`<th>${esc(player.name)}</th>`).join("")}</tr></thead><tbody>${metrics.map(([label,key,hasPer90])=>`<tr><th>${label}</th>${chosen.map(player=>{const stats=entry(player),total=key==="cards"?(stats.cards??cards(stats)):stats[key];return `<td><strong>${value(total)}</strong>${hasPer90?`<small>${value(stats.per90?.[key])} /90</small>`:""}</td>`}).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function entryDetail(player, entryIndex) {
    const entry = player.previousSeason?.entries?.[entryIndex] || player.previousSeason?.entries?.[0] || {};
    const attacking = ["goals", "assists", "shots", "shotsOnTarget", "penaltiesTaken", "penaltiesScored", "offsides", "keyPasses", "chancesCreated", "passAccuracy", "crosses"];
    const discipline = ["foulsCommitted", "foulsWon", "yellowCards", "secondYellowCards", "straightRedCards"];
    const defending = ["tackles", "interceptions", "clearances", "duels", "duelsWon"];
    const goalkeeping = ["goalsConceded", "cleanSheets", "saves", "savePercentage", "penaltiesFaced", "penaltiesSaved"];
    return `<div class="player-competition-heading"><div><span>Squadra e competizione 2025/26</span><strong>${value(entry.team)} · ${value(entry.competition)}</strong></div><div><span>Fonte statistica</span><strong>${value(entry.source)} · ${value(entry.lastUpdated)}</strong></div></div><section><h3>Impiego</h3>${statGrid(entry, ["appearances", "starts", "substituteAppearances", "minutes", "minutesPerAppearance", "completeMatches", "substitutedOff"], true)}</section><section><h3>Attacco e creazione</h3>${statGrid(entry, attacking, true)}</section><section><h3>Disciplina</h3>${statGrid(entry, discipline, true)}</section><section><h3>Difesa</h3>${statGrid(entry, defending, true)}</section>${player.role === "Portiere" ? `<section><h3>Portiere</h3>${statGrid(entry, goalkeeping, true)}</section>` : ""}<section><h3>Valori per 90 minuti</h3>${statGrid(entry.per90 || {}, ["goals", "assists", "shots", "shotsOnTarget", "foulsCommitted", "foulsWon", "cards"], true)}</section>`;
  }

  function playerDetail(player) {
    const entries = player.previousSeason?.entries || [];
    const portrait = `<figure class="player-portrait-wrap"><img class="player-portrait${player.photo ? "" : " is-fallback"}" src="${esc(player.photo || defaultPlayerPhoto)}" data-player-photo data-player-name="${esc(player.name)}" data-fallback="${esc(defaultPlayerPhoto)}" alt="${player.photo ? `Foto di ${esc(player.name)}` : `Foto non disponibile per ${esc(player.name)}`}" decoding="async"></figure>`;
    const sourceList = (player.sources || []).map(source => `<li><strong>${esc(source.provider)}</strong> · ${esc(source.scope)} · ${esc(source.retrievedAt)}${source.url ? ` · <a href="${esc(source.url)}" target="_blank" rel="noreferrer">fonte</a>` : ""}</li>`).join("");
    return `<button class="player-detail-close" type="button" aria-label="Chiudi dettaglio">×</button><div class="player-profile-head">${portrait}<div><span class="status-badge">${value(player.status)}</span><h2>${esc(player.name)}</h2><p>${value(displayRole(player))} · ${value(player.nationality)}</p><p class="quality-${esc(player.dataQuality?.status || "unavailable")}">Dati ${value(player.dataQuality?.status)} · ${value(player.dataQuality?.note)}</p></div></div><div class="player-bio-grid"><div><span>Nascita</span><strong>${value(player.dateOfBirth)} · ${value(player.age, " anni")}</strong></div><div><span>Luogo</span><strong>${value(player.birthplace)}</strong></div><div><span>Altezza / peso</span><strong>${value(player.heightCm, " cm")} · ${value(player.weightKg, " kg")}</strong></div><div><span>Piede</span><strong>${value(player.preferredFoot)}</strong></div><div><span>Nel club dal</span><strong>${value(player.atMilanSince)}</strong></div><div><span>Arrivo</span><strong>${value(player.arrivalDate)}</strong></div><div><span>Club attuale</span><strong>${value(player.currentTeam)}</strong></div><div><span>Club precedente</span><strong>${value(player.previousTeam)} · ${value(player.previousCompetition)}</strong></div></div>${entries.length > 1 ? `<label class="competition-selector">Squadra / competizione<select id="player-entry-select">${entries.map((entry, index) => `<option value="${index}">${esc(entry.team)} · ${esc(entry.competition)}</option>`).join("")}</select></label>` : ""}<div id="player-entry-detail">${entryDetail(player, 0)}</div><section><h3>Qualità e fonti</h3><p>${player.dataQuality?.uncertainAssociation ? "Associazione giocatore-provider da verificare." : "Associazione giocatore-provider verificata."} Metodo: ${value(player.dataQuality?.associationMethod)}.</p><ul class="source-list">${sourceList}</ul></section>`;
  }
  const marketValuePanel = player => `<div class="player-market-panel"><span>Valore di mercato</span><strong>${value(player.marketValue?.label)}</strong><small>${player.marketValue ? `${esc(player.marketValue.provider)} · aggiornato ${esc(player.marketValue.retrievedAt)}` : "Dato non disponibile"}</small></div>`;

  function teamSeasonStatsColumn(stats) {
    if (!stats) return '<p class="muted">Statistiche non disponibili.</p>';
    const groups = [["Risultati", stats.results, ["won", "drawn", "lost", "pointsPerGame"]], ["Produzione offensiva", stats.attack, ["shots", "shotsPerGame", "shotsOnTarget", "shotsOnTargetPerGame", "expectedGoals"]], ["Solidità difensiva", {...stats.defence, cleanSheets: stats.results.cleanSheets}, ["cleanSheets", "shotsConceded", "shotsOnTargetConceded", "expectedGoalsAgainst"]]];
    return `<section class="team-season-column" data-team-season="2026/27"><header class="team-season-heading"><h2 id="team-statistics-title">Statistiche 2026/27</h2></header><div class="team-season-content">${groups.map(([title, data, keys]) => `<section class="team-season-group"><h3>${title}</h3>${teamSeasonList(data, keys)}</section>`).join("")}</div></section>`;
  }

  const attackChannelLabel = channel => channel === "left" ? "Fascia sinistra" : channel === "right" ? "Fascia destra" : "Zona centrale";
  function teamAttackChannels(profile) {
    const channels = profile?.attackChannels;
    if (!channels) return '<section class="team-attack-channels"><h3 id="team-attack-channels-title">Direzioni d’attacco</h3><p class="muted">Dati non disponibili.</p></section>';
    return `<section class="team-attack-channels" aria-labelledby="team-attack-channels-title"><h3 id="team-attack-channels-title">Direzioni d'attacco</h3><div class="team-attack-channel-bars">${[["left", "Sinistra"], ["central", "Centro"], ["right", "Destra"]].map(([key, label]) => `<div><span>${label}</span><i aria-hidden="true"><b style="width:${channels[key]}%"></b></i><strong>${channels[key]}%</strong></div>`).join("")}</div><p>Distribuzione indicativa dal profilo tattico ${profile.characteristicsSeason === "2026-27" ? "2026/27" : "2025/26"} · Canale prevalente: <strong>${attackChannelLabel(channels.dominant)}</strong></p></section>`;
  }

  function teamPage(team, objectiveDataset, standings, teams, matches, teamStyleProfiles) {
    const currentStats = team.teamStats.seasons?.["2026/27"];
    const combinedPlayerStats = combinedSquadStats(team, matches);
    const tacticalProfile = teamStyleProfiles?.profiles?.find(profile => profile.teamId === team.id);

    const quality = team.squad.reduce((summary, player) => {
      const key = player.dataQuality?.status || "unavailable";
      summary[key] = (summary[key] || 0) + 1;
      return summary;
    }, {});

    const objectiveSection = objectiveStatus(team, objectiveDataset, standings);
    const lineupSection = probableLineupSection(team, teams.find(item => item.id === team.id));
    const styleSection = tacticalProfileSection(team, teamStyleProfiles);
    const currentLeaderboardRows = currentSquadLeaderboardRows(team, matches);
    const pageJumps = `<nav class="team-page-jumps" aria-label="Indice della pagina"><a href="#team-season-summary-title">Stagione</a><a href="#team-tactics-heading">Formazione e stile</a><a href="#team-statistics-title">Statistiche</a><a href="#squad-roster-heading">Protagonisti</a><a href="#team-comparator-disclosure">Comparatore</a><a class="team-calendar-link" href="${base}squadra.html?team=${esc(team.id)}">Calendario completo →</a></nav>`;
    root.classList.add("team-editorial");
    root.innerHTML = `${teamNavigation(team, teams)}<section class="team-detail-hero" data-editorial-section="identity"><img src="${team.logo}" alt="Stemma ${esc(team.name)}"><div><h1>${esc(team.officialName)}</h1><p>${esc(team.shortName)} · Città ${value(team.city)} · Stadio ${value(team.stadium)}</p><p><strong>Allenatore:</strong> ${value(team.coach)} · <strong>Modulo preferito:</strong> ${value(team.preferredFormation)}</p>${pageJumps}</div></section>
    ${editorialSeason(team, currentStats, standings)}${objectiveSection}
    <section class="team-tactics-section" data-editorial-section="tactics" aria-labelledby="team-tactics-heading"><header class="team-dashboard-heading team-editorial-heading"><h2 id="team-tactics-heading">Formazione e stile di gioco</h2></header><div class="team-analysis-grid">${lineupSection || '<p>Formazione non disponibile.</p>'}${styleSection}</div></section>
    ${fullSeasonRoster(team, combinedPlayerStats)}
    <section class="team-editorial-statistics" data-editorial-section="statistics" aria-labelledby="team-statistics-title">${teamAttackChannels(tacticalProfile)}${teamSeasonStatsColumn(currentStats)}</section>
    <section class="detail-section team-roster-section" data-editorial-section="leaders" aria-labelledby="squad-roster-heading"><header class="team-roster-heading team-editorial-heading"><h2 id="squad-roster-heading">Protagonisti · 2026/27</h2></header>${squadLeaderboards(team, currentLeaderboardRows)}</section>
    <section class="team-editorial-comparator" data-editorial-section="comparator" aria-label="Comparatore calciatori">${editorialDisclosure("team-comparator-disclosure", "Confronta i calciatori", squadComparator(team, combinedPlayerStats))}</section><dialog id="player-detail" class="player-detail"><div id="player-detail-content"></div></dialog>`;
    root.querySelectorAll("details").forEach(panel => {
      const summary = panel.querySelector(":scope > summary");
      if (!summary) return;
      const sync = () => summary.setAttribute("aria-expanded", String(panel.open));
      sync();
      panel.addEventListener("toggle", sync);
    });
    const comparatorSelectors = [...document.querySelectorAll("[data-team-comparator]")];
    const comparatorResult = document.querySelector("[data-team-comparator-result]");
    const refreshComparator = () => { comparatorResult.innerHTML = squadComparatorResult(team, combinedPlayerStats, comparatorSelectors.map(item => item.dataset.playerKey || "")); };
    const closeComparatorSuggestions = input => { const list = input.parentElement.querySelector(".player-suggestions"); list.hidden = true; list.innerHTML = ""; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); };
    const chooseComparatorPlayer = (input, player) => { input.value = player.name; input.dataset.playerKey = player.id; closeComparatorSuggestions(input); refreshComparator(); };
    const showComparatorSuggestions = input => { const query = searchKey(input.value.trim()), matches = team.squad.filter(player => !query || searchKey(player.name).includes(query)).slice(0, 8), list = input.parentElement.querySelector(".player-suggestions"), index = input.dataset.teamComparator; list.innerHTML = matches.length ? matches.map((player, position) => `<button type="button" role="option" id="team-comparator-${index}-option-${position}" data-player-key="${esc(player.id)}"><strong>${esc(player.name)}</strong><small>${esc(displayRole(player))}</small></button>`).join("") : '<span class="player-suggestions-empty">Nessun nome corrispondente</span>'; list.hidden = false; input.setAttribute("aria-expanded", "true"); };
    comparatorSelectors.forEach((input, index) => { const player = team.squad[Math.min(index, team.squad.length - 1)], list = input.parentElement.querySelector(".player-suggestions"); if (player) { input.value = player.name; input.dataset.playerKey = player.id; } input.addEventListener("focus", () => showComparatorSuggestions(input)); input.addEventListener("input", () => { const exact = team.squad.filter(item => searchKey(item.name) === searchKey(input.value.trim())); input.dataset.playerKey = exact.length === 1 ? exact[0].id : ""; showComparatorSuggestions(input); refreshComparator(); }); input.addEventListener("keydown", event => { const options = [...list.querySelectorAll('[role="option"]')]; if (event.key === "Escape") { closeComparatorSuggestions(input); return; } if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key) || !options.length) return; event.preventDefault(); let active = options.findIndex(option => option.classList.contains("active")); if (event.key === "Enter" && active >= 0) { const selected = team.squad.find(item => item.id === options[active].dataset.playerKey); if (selected) chooseComparatorPlayer(input, selected); return; } active = event.key === "ArrowUp" ? (active <= 0 ? options.length - 1 : active - 1) : (active + 1) % options.length; options.forEach((option, optionIndex) => option.classList.toggle("active", optionIndex === active)); input.setAttribute("aria-activedescendant", options[active].id); }); list.addEventListener("pointerdown", event => { const option = event.target.closest("[data-player-key]"); if (!option) return; event.preventDefault(); const selected = team.squad.find(item => item.id === option.dataset.playerKey); if (selected) chooseComparatorPlayer(input, selected); }); input.addEventListener("blur", () => setTimeout(() => closeComparatorSuggestions(input), 100)); });
    refreshComparator();
    const dialog = document.getElementById("player-detail");
    const showPlayer = playerId => {
      const player = team.squad.find(item => item.id === playerId);
      if (!player) return;
      document.getElementById("player-detail-content").innerHTML = playerDetail(player);
      document.querySelector("#player-detail-content .player-profile-head")?.insertAdjacentHTML("afterend", marketValuePanel(player));
      if (!dialog.open) dialog.showModal();
      dialog.querySelector(".player-detail-close").addEventListener("click", () => dialog.close());
      const selector = dialog.querySelector("#player-entry-select");
      if (selector) selector.addEventListener("change", () => {
        dialog.querySelector("#player-entry-detail").innerHTML = entryDetail(player, Number(selector.value));
      });
    };

    const apply = () => {
      const query = searchKey(document.getElementById("player-search").value.trim());
      const role = document.getElementById("role-filter").value;
      const status = document.getElementById("status-filter").value;
      const sort = document.getElementById("player-sort").value;
      const selected = team.squad
        .filter(player => (!query || searchKey(player.name).includes(query)) && (!role || player.role === role) && (!status || player.status === status))
        .sort((left, right) => {
          if (sort === "role") return compareByRole(left, right);
          const leftValue = metric(left, sort, combinedPlayerStats);
          const rightValue = metric(right, sort, combinedPlayerStats);
          if (leftValue === null || leftValue === undefined) return rightValue === null || rightValue === undefined ? left.name.localeCompare(right.name, "it") : 1;
          if (rightValue === null || rightValue === undefined) return -1;
          return rightValue - leftValue || left.name.localeCompare(right.name, "it");
        });
      document.getElementById("squad-results").innerHTML = squadTable(selected, combinedPlayerStats);
    };

    root.querySelectorAll(".squad-controls input, .squad-controls select").forEach(control => control.addEventListener("input", apply));
    document.getElementById("squad-results").addEventListener("click", event => {
      const button = event.target.closest(".player-open");
      if (button) showPlayer(button.dataset.playerId);
    });
    document.getElementById("squad-leaderboards").addEventListener("click", event => {
      const button = event.target.closest("button.leader-player");
      if (button) showPlayer(button.dataset.playerId);
    });
    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });
    apply();
  }

  (async () => {
    try {
      const teamId = document.body.dataset.team;
      if (!teamId) throw new Error("Squadra non specificata");
      const [team, objectiveDataset, teams, matches, teamStyleProfiles,numberData,officialData,probableData] = await Promise.all([
        load(`data/teams/${teamId}.json`),
        load("data/team-objectives.json"),
        load("data/normalized/teams.json"),
        load("data/normalized/matches.json"),
        load("data/normalized/team-style-profiles.json"),
        load("data/sources/team-pages/shirt-numbers-2026-27.json"),
        load("data/sources/official-lineups-2026-27.json"),
        load("data/sources/probable-lineups-md7-2026-27.json")
      ]);
      numbering=numberData;officialNumbers=officialData;probableNumbers=probableData;numberingMatches=matches;
      teamPage(team, objectiveDataset, calculateStandings(teams, matches), teams, matches, teamStyleProfiles);
    } catch (error) {
      root.innerHTML = `<div class="data-warning"><strong>Errore di caricamento</strong><p>${esc(error.message)}. Apri il sito tramite server locale, non con file://.</p></div>`;
    }
  })();
})();
