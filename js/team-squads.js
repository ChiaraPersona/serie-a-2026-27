(async () => {
  const root = document.getElementById("team-squad-app");
  if (!root) return;

  // Shared presentation for every single-team statistics page.
  const dashboardLayout = true;
  const base = document.body.dataset.depth === "team" ? "../" : "";
  if(!globalThis[Symbol.for('serie-a.public-presentation')])await import(`${base}js/public-presentation.js`);
  const { renderLineupField } = await import(`${base}js/components/lineup-field.mjs?v=20261022-assets-v1`);
  const {shirtNumberAt}=await import(`${base}js/pages/reading-detail/shirt-numbers.mjs?v=20261022-assets-v1`);
  const {imageSource}=await import(`${base}js/core/image-source.mjs?v=20261022-assets-v1`);
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
  const searchKey = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it");
  const cards = stats => {
    const values = [stats?.yellowCards, stats?.secondYellowCards, stats?.straightRedCards];
    return values.some(item => item === null || item === undefined) ? null : values.reduce((total, item) => total + item, 0);
  };
  const metric = (player, key, statsByPlayer = null) => {
    if (key === "age") return player.age;
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
    if (dashboardLayout) {
      const performance = metrics.seasonOverperformance;
      const verdict = performance < 0 ? "Sotto le attese" : performance > 0 ? "Sopra le attese" : "In linea con le attese";
      return `<div id="team-objective-heading" class="team-season-objective" aria-label="Obiettivo stagionale"><div class="team-season-target"><span class="team-summary-label">Obiettivo stagionale</span><h3>${esc(profile.primaryObjective)}</h3><p>Posizione obiettivo: <strong>${profile.targetPosition}ª</strong></p><p>Obiettivo alternativo: ${esc(profile.secondaryObjective)}</p></div><div class="team-season-indicators"><div><span class="team-summary-label">Indice di progresso</span><strong class="team-indicator-value">${metrics.objectiveProgress}<small> / 100</small></strong><progress max="100" value="${metrics.objectiveProgress}" aria-label="Indice di progresso verso l’obiettivo"></progress><p>Considera la fase della stagione e la posizione in classifica.</p></div><div><span class="team-summary-label">Rendimento sulle attese</span><strong class="team-indicator-value">${signed(performance)}</strong><p class="team-performance-verdict">${verdict}</p></div></div></div>`;
    }
    const metricCard = (label, display, numeric = null, tone = "") =>
      `<div class="objective-metric ${tone}"><span>${label}</span><strong>${display}</strong>${numeric === null ? "" : `<i class="metric-track" aria-hidden="true"><b style="width:${Math.max(0, Math.min(100, numeric))}%"></b></i>`}</div>`;
    return `<section id="team-objective-heading" class="team-objective-compact" aria-label="Obiettivo stagionale"><div><small>Obiettivo iniziale</small><h3>${esc(profile.primaryObjective)}</h3><p>${esc(profile.secondaryObjective)} · posizione obiettivo ${profile.targetPosition}ª</p></div><div class="objective-metrics">${metricCard("Progresso obiettivo", `${metrics.objectiveProgress}%`, metrics.objectiveProgress)}${metricCard("Rendimento sulle attese", signed(metrics.seasonOverperformance))}</div></section>`;
  };

  const tacticalProfileDetails = (team, dataset) => {
    const profile = dataset?.profiles?.find(item => item.teamId === team.id);
    if (!profile) return "";
    const traits = (title, items = []) => `<article class="team-style-traits"><h3>${title}</h3>${items.length ? `<ul>${items.map(item => `<li><span>${esc(item.label)}</span>${item.level ? `<small>${esc(item.level)}</small>` : ""}</li>`).join("")}</ul>` : '<p class="muted">Dato non disponibile.</p>'}</article>`;
    return `<div class="team-tactical-analysis">${dashboardLayout ? "" : `<p class="team-editorial-note">Tratti ${profile.characteristicsSeason === "2026-27" ? "Serie A 2026/27" : `${esc(profile.competition)} 2025/26`} · Origini dei gol: ${esc(profile.competition)} 2025/26.</p>`}${profile.notes?.length ? `<p class="team-editorial-note">${profile.notes.map(esc).join(" ")}</p>` : ""}<div class="team-style-trait-grid">${dashboardLayout ? "" : traits("Punti di forza", profile.strengths) + traits("Punti di debolezza", profile.weaknesses) + traits("Comportamenti ricorrenti", profile.playingStyle)}<article class="team-style-traits"><h3>Origini dei gol</h3>${profile.goalTypes?.length ? `<div class="team-style-goals">${profile.goalTypes.map(item => `<div><span>${esc(item.type)}</span><strong>${value(item.goals)}</strong><small>${value(item.sharePct, "%")}</small></div>`).join("")}</div>` : '<p class="muted">Dato non disponibile.</p>'}</article></div></div>`;
  };

  const editorialDisclosure = (id, label, content, className = "") => `<details id="${id}" class="team-editorial-disclosure ${className}"><summary aria-controls="${id}-content" aria-expanded="false"><span>${label}</span><span class="team-disclosure-arrow" aria-hidden="true">↗</span></summary><div id="${id}-content" class="team-disclosure-content">${content}</div></details>`;

  const tacticalProfileSection = (team, dataset) => `<section class="detail-section team-style-section team-style-essential" aria-label="Analisi tattica">${dashboardLayout ? "" : "<h3>Analisi tattica</h3>"}${tacticalProfileDetails(team, dataset) || '<p class="muted">Punti di forza, punti di debolezza, comportamenti ricorrenti e origini dei gol: dati non disponibili.</p>'}</section>`;

  const probableLineupSection = (team, teamSummary) => {
    const lineup = team.probableLineup || team.projectedLineup;
    if (!lineup?.players?.length) return "";
    const [primary = "#0e2a69", secondary = "#07152f"] = teamSummary?.colors || [];
    const official = lineup.status === "official";
    const sourceLink = lineup.source?.url ? `<a href="${esc(lineup.source.url)}" target="_blank" rel="noreferrer">${esc(lineup.source.provider || "Fonte")}</a>` : esc(lineup.source?.provider || "Fonte non disponibile");
    const title = official ? "Formazione ufficiale" : "Probabile formazione";
    const substitutes = official && lineup.substitutes?.length ? `<p class="probable-lineup-substitutes"><strong>A disposizione:</strong> ${lineup.substitutes.map(esc).join(", ")}</p>` : "";
    return `<section class="detail-section team-probable-lineup" ${dashboardLayout ? `aria-label="${title}"` : 'aria-labelledby="probable-lineup-heading"'} style="--lineup-primary:${esc(primary)};--lineup-secondary:${esc(secondary)};--lineup-head-ink:${contrastInk(secondary)}">${dashboardLayout ? "" : `<header class="probable-lineup-heading"><div><p class="eyebrow">Serie A 2026/27 · ${esc(lineup.context || (official ? "formazione ufficiale" : "proiezione editoriale"))}</p><h2 id="probable-lineup-heading">${title}</h2></div>${official ? "" : "<span>Visualizzazione sperimentale</span>"}</header>`}<div class="probable-lineup-board"><header class="probable-lineup-board-head"><img src="${imageSource(`${esc(team.logo)}`)}" alt=""><div><small>${official ? "XI ufficiale" : "Probabile XI"}</small><h3>${esc(team.name)}</h3></div><strong>${esc(lineup.formation)}</strong></header>${renderLineupField([{team: {...teamSummary, ...team, colors: teamSummary?.colors}, lineup}], {orientation: "vertical",shirtNumberFor:name=>numberFor(team,lineup,name)})}${dashboardLayout && !official ? "" : `<footer><div><p>${official ? `Formazione ufficiale ${esc(lineup.fixtureLabel||team.name)}` : "Proiezione editoriale, non distinta ufficiale"}</p>${substitutes}</div></footer>`}</div></section>`;
  };

  const labels = {
    played: "Partite", won: "Vittorie", drawn: "Pareggi", lost: "Sconfitte", points: "Punti",
    pointsPerGame: "Punti / partita", goalsFor: "Gol fatti", goalsAgainst: "Gol subiti",
    goalDifference: "Differenza reti", cleanSheets: "Clean sheet", failedToScore: "Gare senza segnare",
    winPercentage: "Vittorie", drawPercentage: "Pareggi", lossPercentage: "Sconfitte",
    shotsPerGame: "Tiri / partita", shotsOnTargetPerGame: "SOT / partita",
    shotAccuracy: "Precisione tiri", shotConversion: "Conversione tiri", bigChancesMissed: "Grandi occasioni fallite",
    expectedGoals: "xG", expectedGoalsPerGame: "xG / partita", goalsVsExpectedGoals: "Gol rispetto agli xG",
    corners: "Corner", cornersPerGame: "Corner / partita", shotsConceded: "Tiri concessi",
    shotsOnTargetConceded: "SOT concessi", expectedGoalsAgainst: "xG concessi",
    averagePossession: "Possesso medio", passesAttempted: "Passaggi tentati", passesCompleted: "Passaggi riusciti",
    foulsCommitted: "Falli commessi", foulsCommittedPerGame: "Falli / partita", foulsWon: "Falli subiti",
    foulsWonPerGame: "Falli subiti / partita", yellowCards: "Gialli", yellowCardsPerGame: "Gialli / partita",
    secondYellowCards: "Doppi gialli", straightRedCards: "Rossi diretti", dismissals: "Espulsioni",
    penaltiesConceded: "Rigori concessi", penaltiesWon: "Rigori ottenuti", disciplineIndex: "Indice disciplinare",
    goalsAgainstPerGame: "Gol subiti / partita", appearances: "Presenze", starts: "Da titolare",
    substituteAppearances: "Da subentrato", minutes: "Minuti", minutesPerAppearance: "Minuti / presenza",
    completeMatches: "Gare complete", substitutedOff: "Sostituzioni", goals: "Gol", assists: "Assist",
    shots: "Tiri totali", shotsOnTarget: "SOT", penaltiesTaken: "Rigori calciati", penaltiesScored: "Rigori segnati",
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

  const filters = (compact = false) => `<div class="squad-controls"><label>Ricerca<input id="player-search" type="search" placeholder="Nome calciatore"></label><label>Ruolo<select id="role-filter"><option value="">Tutti</option><option>Portiere</option><option>Difensore</option><option>Centrocampista</option><option>Attaccante</option></select></label>${compact ? "" : `<label>Stato<select id="status-filter"><option value="">Tutti</option><option>confermato</option><option>nuovo acquisto</option><option>prestito</option><option>rientro dal prestito</option><option>primavera</option><option>da verificare</option></select></label><label>Ordina<select id="player-sort"><option value="role">Ruolo</option><option value="appearances">Presenze</option><option value="minutes">Minuti</option><option value="goals">Gol totali</option><option value="goalsPer90">Gol / 90</option><option value="assists">Assist totali</option><option value="assistsPer90">Assist / 90</option><option value="shots">Tiri totali</option><option value="shotsPer90">Tiri totali / 90</option><option value="shotsOnTarget">SOT</option><option value="shotsOnTargetPer90">SOT / 90</option><option value="cards">Cartellini totali</option><option value="cardsPer90">Cartellini / 90</option><option value="foulsCommitted">Falli commessi totali</option><option value="foulsCommittedPer90">Falli commessi / 90</option><option value="foulsWon">Falli subiti totali</option><option value="foulsWonPer90">Falli subiti / 90</option><option value="age">Età</option></select></label>`}</div>`;

  const seasonTotals = player => player.previousSeason?.totals || player.previousSeason?.entries?.[0] || {};
  const leaderboardStats = [
    { key: "appearances", label: "Presenze" }, { key: "minutes", label: "Minuti" },
    { key: "goals", label: "Gol", per90: true }, { key: "assists", label: "Assist", per90: true },
    { key: "shots", label: "Tiri totali", per90: true }, { key: "shotsOnTarget", label: "SOT", per90: true },
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

  const periodDescription = period => period === "2026/27" ? "Serie A 2026/27 · partite concluse con questa squadra. I dati non disponibili restano N/D." : period === "2025/26" ? "Stagione 2025/26 dei calciatori della rosa attuale, anche con altri club e nelle competizioni disponibili." : "Totali 2025/26 + Serie A 2026/27. Il periodo storico può includere altri club e competizioni.";
  const periodControl = (id, period = "2026/27") => `<label class="team-period-control" for="${id}">Periodo statistico<select id="${id}" data-team-period>${["2026/27", "2025/26", "combined"].map(key => `<option value="${key}"${key === period ? " selected" : ""}>${key === "combined" ? "2025/26 + 2026/27" : key}</option>`).join("")}</select></label>`;
  function squadStatsForPeriod(team, matches, period, combined) {
    if (period === "combined") return combined;
    const current = period === "2026/27" ? new Map(currentSquadLeaderboardRows(team, matches).map(row => [row.player.id, {...row.totals, per90:row.per90}])) : null;
    return new Map(team.squad.map(player => {
      if (current) return [player.id, current.get(player.id) || {}];
      const previous = seasonTotals(player);
      return [player.id, {...previous, cards: cards(previous), per90: previous.per90 || {}}];
    }));
  }

  const rankedLeaders = (rows, stat) => rows.map(row => ({ player: row.player, linked: row.linked, total: row.totals[stat.key], rate: row.per90?.[stat.key] }))
        .filter(item => item.total !== null && item.total !== undefined)
        .sort((left, right) => right.total - left.total || (right.rate ?? -1) - (left.rate ?? -1) || left.player.name.localeCompare(right.player.name, "it"))
        .slice(0, 3);

  function squadLeaderboardSection(rows, teamName, season, stats = leaderboardStats, suffix = "") {
    const cardsHtml = stats.map(stat => {
      const leaders = rankedLeaders(rows, stat);
      return `<article class="squad-leader-card"><header><h4>${esc(stat.label)}</h4><span>${stat.per90 ? "Totale · /90" : "Totale"}</span></header>${leaders.length ? `<ol>${leaders.map((item, index) => `<li><span class="leader-rank">${index + 1}</span>${item.linked ? `<span class="leader-player">${esc(item.player.name)}</span>` : `<span class="leader-player leader-player-unlinked">${esc(item.player.name)}</span>`}<strong>${value(item.total)}${stat.per90 ? `<small>${value(item.rate)} /90</small>` : ""}</strong></li>`).join("")}</ol>` : `<p class="muted">Dati non disponibili</p>`}</article>`;
    }).join("");
    const description = "Classifica sulle partite concluse e sui soli campi giocatore disponibili. Le metriche non coperte restano N/D.";
    const titleId = `squad-leaders-title-${season.replace("/", "-")}${suffix}`;
    return `<section class="squad-leaders squad-leaders-period" aria-labelledby="${titleId}"><h3 id="${titleId}" class="sr-only">Classifiche individuali ${season}</h3><div class="squad-leaders-content"><p>${description}</p><div class="squad-leader-grid">${cardsHtml}</div></div></section>`;
  }

  function squadLeaderboards(team, currentRows) {
    if (dashboardLayout) {
      const keys = ["goals", "assists", "minutes", "shots", "shotsOnTarget", "appearances", "cards", "foulsCommitted", "foulsWon"];
      return `<div id="squad-leaderboards" class="squad-leaderboards team-leaders-compact">${squadLeaderboardSection(currentRows, team.name, "2026/27", keys.map(key => leaderboardStats.find(stat => stat.key === key)))}</div>`;
    }
    return `<div id="squad-leaderboards" class="squad-leaderboards">${squadLeaderboardSection(currentRows, team.name, "2026/27")}</div>`;
  }

  function editorialSeason(team, currentStats, standings, objectiveSection = "") {
    const index = standings.findIndex(row => row.team === team.id);
    const results = currentStats?.results;
    const metrics = [["Posizione", index >= 0 ? index + 1 : null], ["Punti", results?.points], ["Partite", results?.played], ["Gol fatti", results?.goalsFor], ["Gol subiti", results?.goalsAgainst]];
    if (dashboardLayout) return `<section class="team-season-summary team-season-summary--compact" data-editorial-section="season" id="team-season-summary-title" aria-label="Panoramica Serie A 2026/27">${objectiveSection}</section>`;
    return `<section class="team-season-summary" data-editorial-section="season" id="team-season-summary-title" aria-label="Panoramica Serie A 2026/27"><dl class="team-key-numbers">${metrics.map(([label, number]) => `<div><dt>${label}</dt><dd>${value(number)}</dd></div>`).join("")}</dl>${team.europeanCompetitions?.length ? `<p class="team-editorial-note">Altre competizioni: ${team.europeanCompetitions.map(item => esc(typeof item === "string" ? item : item.name || item.competition || "")).filter(Boolean).join(" · ")}</p>` : ""}</section>`;
  }

  function fullSeasonRoster(team, statsByPlayer) {
    return `<section class="team-full-roster-section" data-editorial-section="roster" aria-labelledby="team-full-roster-title"><header class="team-editorial-heading"><h2 id="team-full-roster-title">La rosa completa</h2></header>${dashboardLayout ? `<div class="roster-toolbar">${filters(true)}${periodControl("roster-period")}</div>` : `<p class="team-editorial-note">Tutti i ${team.squad.length} calciatori della rosa, inclusi quelli senza presenze. I dati sommano 2025/26 e 2026/27. Copertura dei numeri di maglia parziale: N/D per le associazioni non disponibili.</p>`}${dashboardLayout ? "" : filters()}<div id="squad-results">${dashboardLayout ? compactSquadTable(team.squad, statsByPlayer) : squadTable(team.squad, statsByPlayer)}</div></section>`;
  }



  function compactSquadTable(players, statsByPlayer, sorting = {}) {
    players = players.filter(player => {
      const stats = statsByPlayer.get(player.id);
      return stats && ["appearances", "minutes", "goals", "assists", "shots", "shotsOnTarget", "cards", "foulsCommitted", "foulsWon"].some(key => typeof stats[key] === "number" && Number.isFinite(stats[key]));
    });
    if (!players.length) return '<div class="data-warning"><strong>Nessun calciatore corrisponde ai filtri</strong><p>Modifica ricerca, ruolo o stato per visualizzare di nuovo la rosa.</p></div>';
    const columns = [["Gol", "goals"], ["Assist", "assists"], ["Tiri", "shots"], ["Tiri in porta", "shotsOnTarget"], ["Cartellini", "cards"], ["Falli commessi", "foulsCommitted"], ["Falli subiti", "foulsWon"]];
    const sortHeader = (label, key, description) => `<th scope="col" aria-sort="${sorting.key === key ? (sorting.direction === 1 ? "ascending" : "descending") : "none"}"><button type="button" class="roster-sort" data-roster-sort="${key}" aria-label="Ordina per ${description}">${label}<span aria-hidden="true">${sorting.key === key ? (sorting.direction === 1 ? " ↑" : " ↓") : ""}</span></button></th>`;
    return `<div class="table-wrap squad-table-wrap" role="region" aria-label="Statistiche calciatori: totali e valori per 90 minuti; scorri per vedere tutte le colonne" tabindex="0"><table class="squad-table squad-table--compact"><colgroup><col class="squad-col-player"><col class="squad-col-played"><col class="squad-col-minutes">${columns.map(() => '<col class="squad-col-stat"><col class="squad-col-stat">').join("")}</colgroup><thead><tr><th scope="col" rowspan="2">Calciatore</th><th scope="colgroup" colspan="2">Presenze</th>${columns.map(([label]) => `<th scope="colgroup" colspan="2">${label}</th>`).join("")}</tr><tr>${sortHeader("PG", "appearances", "presenze")}${sortHeader("Min", "minutes", "minuti")}${columns.map(([label, key]) => sortHeader("Tot.", key, label + " totali") + sortHeader("/90", key + "Per90", label + " per 90 minuti")).join("")}</tr></thead><tbody>${players.map(player => {
      const entry = statsByPlayer.get(player.id) || {};
      return `<tr data-player-id="${esc(player.id)}"><td><span class="player-label"><strong>${esc(player.name)}</strong><small class="roster-player-role">${value(displayRole(player))}</small></span></td><td>${value(entry.appearances)}</td><td>${value(entry.minutes)}</td>${columns.map(([, key]) => `<td>${value(key === "cards" ? entry.cards ?? cards(entry) : entry[key])}</td><td>${value(entry.per90?.[key])}</td>`).join("")}</tr>`;
    }).join("")}</tbody></table></div><p class="roster-scroll-hint">Scorri per vedere tutte le statistiche</p>`;
  }

  function squadTable(players, statsByPlayer) {
    if (!players.length) return `<div class="data-warning"><strong>Nessun calciatore corrisponde ai filtri</strong><p>Modifica ricerca, ruolo o stato per visualizzare di nuovo la rosa.</p></div>`;
    const statColumns = Array.from({ length: 14 }, () => '<col class="squad-col-stat">').join("");
    return `<p class="squad-count" aria-live="polite">${players.length} calciator${players.length === 1 ? "e" : "i"}</p><div class="table-wrap squad-table-wrap" role="region" aria-label="Statistiche calciatori; scorri orizzontalmente e verticalmente" tabindex="0"><table class="squad-table"><colgroup><col class="squad-col-player"><col class="squad-col-number"><col class="squad-col-role"><col class="squad-col-played"><col class="squad-col-minutes">${statColumns}</colgroup><thead><tr><th rowspan="2">Calciatore</th><th rowspan="2">N°</th><th rowspan="2">Ruolo</th><th rowspan="2">PG</th><th rowspan="2">Min</th><th colspan="2">Gol</th><th colspan="2">Assist</th><th colspan="2">Tiri totali</th><th colspan="2">SOT</th><th colspan="2">Cartellini</th><th colspan="2">Falli commessi</th><th colspan="2">Falli subiti</th></tr><tr><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th><th>Tot.</th><th>/90</th></tr></thead><tbody>${players.map(player => {
      const entry = statsByPlayer.get(player.id) || seasonTotals(player);
      return `<tr data-player-id="${esc(player.id)}"><td><div class="roster-player-identity"><span class="player-label"><span><strong>${esc(player.name)}</strong><small>${value(player.nationality)}</small></span></span></div></td><td>${value(player.shirtNumber)}</td><td>${value(displayRole(player))}</td><td>${value(entry.appearances)}</td><td>${value(entry.minutes)}</td><td>${value(entry.goals)}</td><td>${value(entry.per90?.goals)}</td><td>${value(entry.assists)}</td><td>${value(entry.per90?.assists)}</td><td>${value(entry.shots)}</td><td>${value(entry.per90?.shots)}</td><td>${value(entry.shotsOnTarget)}</td><td>${value(entry.per90?.shotsOnTarget)}</td><td>${value(entry.cards ?? cards(entry))}</td><td>${value(entry.per90?.cards)}</td><td>${value(entry.foulsCommitted)}</td><td>${value(entry.per90?.foulsCommitted)}</td><td>${value(entry.foulsWon)}</td><td>${value(entry.per90?.foulsWon)}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  }

  function squadComparator(team, statsByPlayer) {
    const playerSearch = (index, label) => `<label>${label}<span class="player-autocomplete"><input type="search" data-team-comparator="${index}" role="combobox" aria-autocomplete="list" aria-controls="team-comparator-${index}-suggestions" aria-expanded="false" autocomplete="off" placeholder="Scrivi il nome…"><span class="player-suggestions" id="team-comparator-${index}-suggestions" role="listbox" hidden></span></span>${dashboardLayout ? "" : '<small class="player-comparator-control-hint">Scrivi liberamente e scegli un suggerimento</small>'}</label>`;
    return `<section class="detail-section player-comparator team-player-comparator${dashboardLayout ? " comparator-editorial" : ""}" id="comparatore-calciatori">${dashboardLayout ? "" : '<header><div><p class="eyebrow">Confronto nella rosa</p><h2>Comparatore calciatori</h2></div><p>Totali 2025/26 + 2026/27 e valori per 90 minuti.</p></header>'}${dashboardLayout ? `<div class="team-comparator-toolbar"><h2 id="team-comparator-disclosure">Confronta i calciatori</h2><div class="team-comparator-options"><label class="comparison-mode"><span class="sr-only">Visualizza</span><select data-team-comparator-mode><option value="total">Valori totali</option><option value="per90">Valori per 90 minuti</option></select></label>${periodControl("comparator-period").replace("Periodo statistico<select", '<span class="sr-only">Periodo statistico</span><select')}</div></div>` : ""}<div class="player-comparator-controls">${playerSearch(0, "Calciatore A")}${playerSearch(1, "Calciatore B")}</div><div class="player-comparator-result" data-team-comparator-result aria-live="polite"></div></section>`;
  }

  function squadComparatorResult(team, statsByPlayer, ids, mode = "total") {
    const chosen = ids.map(id => team.squad.find(player => player.id === id)).filter(Boolean);
    if (dashboardLayout && chosen.length === 2 && chosen[0].id === chosen[1].id) return `<div class="data-warning"><strong>Scegli due calciatori diversi</strong></div>`;
    if (chosen.length < 2) return dashboardLayout ? "" : `<div class="data-warning"><strong>Seleziona due calciatori</strong></div>`;
    const metrics = [["Minuti giocati","minutes",false],["Gol","goals",true],["Assist","assists",true],["Tiri totali","shots",true],["SOT","shotsOnTarget",true],["Cartellini","cards",true],["Falli commessi","foulsCommitted",true],["Falli subiti","foulsWon",true]];
    const entry = player => statsByPlayer.get(player.id) || (dashboardLayout ? {} : seasonTotals(player));
    if (dashboardLayout) {
      const comparisonMetrics = [["Partite giocate", "appearances", false], ...metrics];
      const card = player => `<article><div class="player-comparison-details"><h3>${esc(player.name)}</h3><p>${esc(team.name)} · ${esc(player.role || displayRole(player))}</p></div></article>`;
      return `<div class="player-comparator-head">${chosen.map(card).join('<span class="comparison-vs">VS</span>')}</div><div class="comparison-bars">${comparisonMetrics.map(([label,key,hasPer90]) => {
        const values = chosen.map(player => { const stats = entry(player); return mode === "per90" && hasPer90 ? stats.per90?.[key] : key === "cards" ? stats.cards ?? cards(stats) : stats[key]; });
        const max = Math.max(0, ...values.filter(number => typeof number === "number" && Number.isFinite(number)));
        const width = number => typeof number === "number" && Number.isFinite(number) && max > 0 ? Math.max(0, 100 * number / max) : 0;
        return `<div class="comparison-row"><strong>${value(values[0])}</strong><span class="comparison-track left"><i style="width:${width(values[0])}%"></i></span><span class="comparison-label">${esc(label)}${mode === "per90" && hasPer90 ? " /90" : ""}</span><span class="comparison-track right"><i style="width:${width(values[1])}%"></i></span><strong>${value(values[1])}</strong></div>`;
      }).join("")}</div>`;
    }
    return `<div class="player-comparator-head">${chosen.map(player=>`<article><h3>${esc(player.name)}</h3><p>${esc(displayRole(player))}</p><strong>${value(entry(player).appearances)} PG · ${value(entry(player).minutes)} min</strong></article>`).join("")}</div><div class="table-wrap"><table><thead><tr><th>Statistica</th>${chosen.map(player=>`<th>${esc(player.name)}</th>`).join("")}</tr></thead><tbody>${metrics.map(([label,key,hasPer90])=>`<tr><th>${label}</th>${chosen.map(player=>{const stats=entry(player),total=key==="cards"?(stats.cards??cards(stats)):stats[key];return `<td><strong>${value(total)}</strong>${hasPer90?`<small>${value(stats.per90?.[key])} /90</small>`:""}</td>`}).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function teamSeasonStatsColumn(stats) {
    if (!stats) return '<p class="muted">Statistiche non disponibili.</p>';
    const groups = [["Risultati", stats.results, ["won", "drawn", "lost", "pointsPerGame"]], ["Produzione offensiva", stats.attack, ["shots", "shotsPerGame", "shotsOnTarget", "shotsOnTargetPerGame", "expectedGoals"]], ["Solidità difensiva", {...stats.defence, cleanSheets: stats.results.cleanSheets}, ["cleanSheets", "shotsConceded", "shotsOnTargetConceded", "expectedGoalsAgainst"]]];
    return `<section class="team-season-column" data-team-season="2026/27"><header class="team-season-heading"><h2 id="team-statistics-title">Statistiche 2026/27</h2></header><div class="team-season-content">${groups.map(([title, data, keys]) => `<section class="team-season-group"><h3>${title}</h3>${teamSeasonList(data, keys)}</section>`).join("")}</div></section>`;
  }

  function compactTeamStats(stats) {
    if (!stats) return '<p class="muted">Statistiche non disponibili.</p>';
    const r = stats.results || {}, a = stats.attack || {}, d = stats.defence || {};
    const perMatch = total => typeof total === "number" && Number.isFinite(total) && typeof r.played === "number" && r.played > 0 ? total / r.played : null;
    const groups = [
      ["Risultati", [["Vittorie", r.won], ["Pareggi", r.drawn], ["Sconfitte", r.lost], ["Punti / partita", r.pointsPerGame]]],
      ["Produzione offensiva", [["Gol", r.goalsFor, a.goalsPerGame], ["Tiri", a.shots, a.shotsPerGame], ["Tiri in porta", a.shotsOnTarget, a.shotsOnTargetPerGame], ["xG", a.expectedGoals, a.expectedGoalsPerGame]]],
      ["Solidità difensiva", [["Gol subiti", r.goalsAgainst, d.goalsAgainstPerGame], ["Clean sheet", r.cleanSheets, perMatch(r.cleanSheets)], ["Tiri concessi", d.shotsConceded, perMatch(d.shotsConceded)], ["Tiri in porta concessi", d.shotsOnTargetConceded, perMatch(d.shotsOnTargetConceded)], ["xG concessi", d.expectedGoalsAgainst, perMatch(d.expectedGoalsAgainst)]]]
    ];
    const formatted = n => typeof n === "number" ? n.toLocaleString("it-IT", {maximumFractionDigits:2}) : "N/D";
    return `<section class="team-season-column team-season-column--compact" data-team-season="2026/27"><header class="team-editorial-heading"><h2 id="team-statistics-title">Statistiche squadra · 2026/27</h2></header><div class="team-statistics-groups">${groups.map(([label, rows], index) => `<section><h3>${label}</h3><table><thead><tr><th scope="col">Statistica</th><th scope="col">${index === 0 ? "Valore" : "Totale"}</th>${index ? '<th scope="col">/ partita</th>' : ""}</tr></thead><tbody>${rows.map(([name, total, rate]) => `<tr><th scope="row">${name}</th><td>${formatted(total)}</td>${index ? `<td>${formatted(rate)}</td>` : ""}</tr>`).join("")}</tbody></table></section>`).join("")}</div></section>`;
  }

  const attackChannelLabel = channel => channel === "left" ? "Fascia sinistra" : channel === "right" ? "Fascia destra" : "Zona centrale";
  function teamAttackChannels(profile) {
    const channels = profile?.attackChannels;
    if (!channels) return '<section class="team-attack-channels"><h3 id="team-attack-channels-title">Direzioni d’attacco</h3><p class="muted">Dati non disponibili.</p></section>';
    return `<section class="team-attack-channels" aria-labelledby="team-attack-channels-title"><h3 id="team-attack-channels-title">Direzioni d'attacco</h3><div class="team-attack-channel-bars">${[["left", "Sinistra"], ["central", "Centro"], ["right", "Destra"]].map(([key, label]) => `<div><span>${label}</span><i aria-hidden="true"><b style="width:${channels[key]}%"></b></i><strong>${channels[key]}%</strong></div>`).join("")}</div>${dashboardLayout ? "" : `<p>Distribuzione indicativa dal profilo tattico ${profile.characteristicsSeason === "2026-27" ? "2026/27" : "2025/26"} · Canale prevalente: <strong>${attackChannelLabel(channels.dominant)}</strong></p>`}</section>`;
  }

  function teamPage(team, objectiveDataset, standings, teams, matches, teamStyleProfiles) {
    const currentStats = team.teamStats.seasons?.["2026/27"];
    const combinedStats = combinedSquadStats(team, matches);
    let selectedPeriod = dashboardLayout ? "2026/27" : "combined";
    let combinedPlayerStats = dashboardLayout ? squadStatsForPeriod(team, matches, selectedPeriod, combinedStats) : combinedStats;
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
    const identityHero = dashboardLayout ? `<section class="team-detail-hero team-detail-hero--compact" data-editorial-section="identity"><img src="${imageSource(`${team.logo}`)}" alt="Stemma ${esc(team.name)}"><div class="team-identity-copy"><h1>${esc(team.shortName || team.name)}</h1><p class="team-identity-official">${esc(team.officialName)}</p><dl class="team-identity-facts">${[["Città",team.city],["Stadio",team.stadium],["Allenatore",team.coach],["Modulo preferito",team.preferredFormation]].map(([label,content])=>`<div><dt>${label}</dt><dd>${value(content)}</dd></div>`).join("")}</dl></div></section>` : `<section class="team-detail-hero" data-editorial-section="identity"><img src="${imageSource(`${team.logo}`)}" alt="Stemma ${esc(team.name)}"><div><h1>${esc(team.officialName)}</h1><p>${esc(team.shortName)} · Città ${value(team.city)} · Stadio ${value(team.stadium)}</p><p><strong>Allenatore:</strong> ${value(team.coach)} · <strong>Modulo preferito:</strong> ${value(team.preferredFormation)}</p></div></section>`;
    root.classList.add("team-editorial");
    if (dashboardLayout) root.classList.add("team-dashboard-pilot");
    root.innerHTML = dashboardLayout ? `${teamNavigation(team, teams)}${identityHero}
    ${editorialSeason(team, currentStats, standings, objectiveSection)}${dashboardLayout ? "" : objectiveSection}
<section class="team-editorial-statistics" data-editorial-section="statistics" aria-labelledby="team-statistics-title">${compactTeamStats(currentStats)}</section>
    <section class="team-tactics-section" data-editorial-section="tactics" id="team-tactics-heading" aria-label="Formazione e analisi tattica"><div class="team-analysis-grid">${lineupSection || '<p>Formazione non disponibile.</p>'}${styleSection}${teamAttackChannels(tacticalProfile)}</div></section>
    <section class="detail-section team-roster-section" data-editorial-section="leaders" id="squad-roster-heading" aria-label="Protagonisti 2026/27">${squadLeaderboards(team, currentLeaderboardRows)}</section>
${fullSeasonRoster(team, combinedPlayerStats)}
    <section class="team-editorial-comparator" data-editorial-section="comparator" aria-label="Comparatore calciatori">${squadComparator(team, combinedPlayerStats)}</section>` : `${teamNavigation(team, teams)}${identityHero}
    ${editorialSeason(team, currentStats, standings, objectiveSection)}${dashboardLayout ? "" : objectiveSection}
    <section class="team-tactics-section" data-editorial-section="tactics" aria-labelledby="team-tactics-heading"><header class="team-dashboard-heading team-editorial-heading"><h2 id="team-tactics-heading">Formazione e stile di gioco</h2></header><div class="team-analysis-grid">${lineupSection || '<p>Formazione non disponibile.</p>'}${styleSection}</div></section>
    ${fullSeasonRoster(team, combinedPlayerStats)}
    <section class="team-editorial-statistics" data-editorial-section="statistics" aria-labelledby="team-statistics-title">${teamAttackChannels(tacticalProfile)}${teamSeasonStatsColumn(currentStats)}</section>
    <section class="detail-section team-roster-section" data-editorial-section="leaders" aria-labelledby="squad-roster-heading"><header class="team-roster-heading team-editorial-heading"><h2 id="squad-roster-heading">Protagonisti · 2026/27</h2></header>${squadLeaderboards(team, currentLeaderboardRows)}</section>
    <section class="team-editorial-comparator" data-editorial-section="comparator" aria-label="Comparatore calciatori">${editorialDisclosure("team-comparator-disclosure", "Confronta i calciatori", squadComparator(team, combinedPlayerStats))}</section>`;
    root.querySelectorAll("details").forEach(panel => {
      const summary = panel.querySelector(":scope > summary");
      if (!summary) return;
      const sync = () => summary.setAttribute("aria-expanded", String(panel.open));
      sync();
      panel.addEventListener("toggle", sync);
    });
    const comparatorSelectors = [...document.querySelectorAll("[data-team-comparator]")];
    const initialComparatorPlayers = dashboardLayout ? team.squad.filter(player => player.role === "Attaccante").sort((left,right) => (combinedPlayerStats.get(right.id)?.minutes ?? -1) - (combinedPlayerStats.get(left.id)?.minutes ?? -1) || left.name.localeCompare(right.name,"it")).slice(0,2) : team.squad.slice(0,2);
    const comparatorResult = document.querySelector("[data-team-comparator-result]");
    const refreshComparator = () => {
      const labels = comparatorSelectors.map(input => input.closest("label"));
      const controls = root.querySelector(".player-comparator-controls");
      if (dashboardLayout) labels.forEach(label => controls.append(label));
      comparatorResult.innerHTML = squadComparatorResult(team, combinedPlayerStats, comparatorSelectors.map(item => item.dataset.playerKey || ""), root.querySelector("[data-team-comparator-mode]")?.value);
      if (dashboardLayout) {
        const cards = comparatorResult.querySelectorAll(".player-comparator-head article");
        labels.forEach((label,index) => (cards[index] || controls).append(label));
      }
    };
    root.querySelector("[data-team-comparator-mode]")?.addEventListener("change", refreshComparator);
    const closeComparatorSuggestions = input => { const list = input.parentElement.querySelector(".player-suggestions"); list.hidden = true; list.innerHTML = ""; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); };
    const chooseComparatorPlayer = (input, player) => { input.value = player.name; input.dataset.playerKey = player.id; closeComparatorSuggestions(input); refreshComparator(); };
    const showComparatorSuggestions = input => { const query = searchKey(input.value.trim()), matches = team.squad.filter(player => !query || searchKey(player.name).includes(query)).slice(0, dashboardLayout ? team.squad.length : 8), list = input.parentElement.querySelector(".player-suggestions"), index = input.dataset.teamComparator; list.innerHTML = matches.length ? matches.map((player, position) => `<button type="button" role="option" id="team-comparator-${index}-option-${position}" data-player-key="${esc(player.id)}"><strong>${esc(player.name)}</strong><small>${esc(displayRole(player))}</small></button>`).join("") : '<span class="player-suggestions-empty">Nessun nome corrispondente</span>'; list.hidden = false; input.setAttribute("aria-expanded", "true"); };
    comparatorSelectors.forEach((input, index) => { const player = initialComparatorPlayers[index], list = input.parentElement.querySelector(".player-suggestions"); if (player) { input.value = player.name; input.dataset.playerKey = player.id; } input.addEventListener("focus", () => showComparatorSuggestions(input)); input.addEventListener("input", () => { const exact = team.squad.filter(item => searchKey(item.name) === searchKey(input.value.trim())); input.dataset.playerKey = exact.length === 1 ? exact[0].id : ""; showComparatorSuggestions(input); refreshComparator(); }); input.addEventListener("keydown", event => { const options = [...list.querySelectorAll('[role="option"]')]; if (event.key === "Escape") { if (dashboardLayout) event.preventDefault(); closeComparatorSuggestions(input); return; } if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key) || !options.length) return; event.preventDefault(); let active = options.findIndex(option => option.classList.contains("active")); if (event.key === "Enter" && active >= 0) { const selected = team.squad.find(item => item.id === options[active].dataset.playerKey); if (selected) chooseComparatorPlayer(input, selected); return; } active = event.key === "ArrowUp" ? (active <= 0 ? options.length - 1 : active - 1) : (active + 1) % options.length; options.forEach((option, optionIndex) => option.classList.toggle("active", optionIndex === active)); input.setAttribute("aria-activedescendant", options[active].id); }); list.addEventListener("pointerdown", event => { const option = event.target.closest("[data-player-key]"); if (!option) return; event.preventDefault(); const selected = team.squad.find(item => item.id === option.dataset.playerKey); if (selected) chooseComparatorPlayer(input, selected); }); input.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== input) closeComparatorSuggestions(input); }, 100)); });
    refreshComparator();
    const rosterSorting = {key: "role", direction: -1};
    const apply = () => {
      const query = searchKey(document.getElementById("player-search").value.trim());
      const role = document.getElementById("role-filter").value;
      const status = document.getElementById("status-filter")?.value || "";
      const sort = dashboardLayout ? rosterSorting.key : document.getElementById("player-sort")?.value || "role";
      const selected = team.squad
        .filter(player => (!query || searchKey(player.name).includes(query)) && (!role || player.role === role) && (!status || player.status === status))
        .sort((left, right) => {
          if (sort === "role") return compareByRole(left, right);
          const leftValue = metric(left, sort, combinedPlayerStats);
          const rightValue = metric(right, sort, combinedPlayerStats);
          if (leftValue === null || leftValue === undefined) return rightValue === null || rightValue === undefined ? left.name.localeCompare(right.name, "it") : 1;
          if (rightValue === null || rightValue === undefined) return -1;
          return (dashboardLayout ? rosterSorting.direction * (leftValue - rightValue) : rightValue - leftValue) || left.name.localeCompare(right.name, "it");
        });
      document.getElementById("squad-results").innerHTML = dashboardLayout ? compactSquadTable(selected, combinedPlayerStats, rosterSorting) : squadTable(selected, combinedPlayerStats);
    };

    document.getElementById("squad-results").addEventListener("click", event => {
      const button = event.target.closest("[data-roster-sort]");
      if (!button) return;
      const key = button.dataset.rosterSort;
      rosterSorting.direction = rosterSorting.key === key ? -rosterSorting.direction : -1;
      rosterSorting.key = key;
      const wrap = root.querySelector(".squad-table-wrap"), scrollLeft = wrap?.scrollLeft || 0;
      apply();
      const next = root.querySelector(".squad-table-wrap");
      if (next) next.scrollLeft = scrollLeft;
      root.querySelector(`[data-roster-sort="${key}"]`)?.focus({preventScroll:true});
    });

    root.querySelectorAll("[data-team-period]").forEach(control => control.addEventListener("change", () => {
      selectedPeriod = control.value;
      combinedPlayerStats = squadStatsForPeriod(team, matches, selectedPeriod, combinedStats);
      root.querySelectorAll("[data-team-period]").forEach(select => { select.value = selectedPeriod; });
      root.querySelectorAll("[data-team-period-note]").forEach(note => { note.textContent = periodDescription(selectedPeriod); });
      apply();
      refreshComparator();
    }));
    root.querySelectorAll(".squad-controls input, .squad-controls select, .team-roster-views select").forEach(control => control.addEventListener("input", apply));
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
